// Package importer copies the live Supabase project into the Tichi database + audio folder.
// Every step is idempotent (upserts / skip-if-present), so a run can be repeated safely
// right before the switch-over to pick up changes made since the last run.
package importer

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Importer struct {
	Dest        *pgxpool.Pool
	AudioDir    string
	PublicURL   string // new public base, e.g. https://tichikids.ir
	SupabaseURL string // https://<ref>.supabase.co
	AnonKey     string
	HTTP        *http.Client
	Concurrency int
}

type Stats map[string]int

var (
	hashRe = regexp.MustCompile(`^([^:]{1,128}):([0-9a-f]{64})$`)
	segRe  = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)
)

func (im *Importer) client() *http.Client {
	if im.HTTP != nil {
		return im.HTTP
	}
	return &http.Client{Timeout: 60 * time.Second}
}

func (im *Importer) storagePrefix() string {
	return strings.TrimRight(im.SupabaseURL, "/") + "/storage/v1/object/public/audio/"
}

func (im *Importer) newPrefix() string { return strings.TrimRight(im.PublicURL, "/") + "/audio/" }

// RewriteURLs points Supabase Storage URLs at the new host. Applied to serialised JSON/text.
func (im *Importer) RewriteURLs(s string) string {
	return strings.ReplaceAll(s, im.storagePrefix(), im.newPrefix())
}

// audioPathsIn returns the storage-relative paths referenced in a blob of text.
func (im *Importer) audioPathsIn(s string) []string {
	re := regexp.MustCompile(regexp.QuoteMeta(im.storagePrefix()) + `[^"\s\\?]+`)
	var out []string
	for _, m := range re.FindAllString(s, -1) {
		out = append(out, strings.TrimPrefix(m, im.storagePrefix()))
	}
	return out
}

func (im *Importer) rest(ctx context.Context, table, query string, out any) error {
	var all []json.RawMessage
	for off := 0; ; off += 1000 {
		req, _ := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/rest/v1/%s?%s", strings.TrimRight(im.SupabaseURL, "/"), table, query), nil)
		req.Header.Set("apikey", im.AnonKey)
		req.Header.Set("Authorization", "Bearer "+im.AnonKey)
		req.Header.Set("Range", fmt.Sprintf("%d-%d", off, off+999))
		resp, err := im.client().Do(req)
		if err != nil {
			return err
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if resp.StatusCode >= 300 {
			return fmt.Errorf("%s: HTTP %d: %.200s", table, resp.StatusCode, body)
		}
		var page []json.RawMessage
		if err := json.Unmarshal(body, &page); err != nil {
			return err
		}
		all = append(all, page...)
		if len(page) < 1000 {
			break
		}
	}
	b, _ := json.Marshal(all)
	return json.Unmarshal(b, out)
}

// ImportContent copies units, nodes and questions through Supabase's public REST API (readable
// with the anon key) and downloads every audio/image file the questions reference.
func (im *Importer) ImportContent(ctx context.Context) (Stats, error) {
	st := Stats{}
	var units []struct {
		ID, Letter, Color string
		Ord               int
	}
	var nodes []struct {
		ID     string
		UnitID string `json:"unit_id"`
		Ord    int
		Type   string
	}
	var qs []map[string]json.RawMessage
	if err := im.rest(ctx, "units", "select=*&order=ord,id", &units); err != nil {
		return st, err
	}
	if err := im.rest(ctx, "nodes", "select=*&order=ord,id", &nodes); err != nil {
		return st, err
	}
	if err := im.rest(ctx, "questions", "select=*&order=ord,id", &qs); err != nil {
		return st, err
	}

	// download media first so rewritten URLs never point at missing files
	blob, _ := json.Marshal(qs)
	paths := dedupe(im.audioPathsIn(string(blob)))
	n, failed := im.downloadAll(ctx, paths)
	st["audio_downloaded"], st["audio_failed"] = n, len(failed)
	for _, f := range failed {
		log.Printf("WARN audio not imported: %s", f)
	}
	failedSet := map[string]bool{}
	for _, f := range failed {
		failedSet[f] = true
	}

	tx, err := im.Dest.Begin(ctx)
	if err != nil {
		return st, err
	}
	defer tx.Rollback(ctx)
	for _, u := range units {
		if _, err := tx.Exec(ctx, `INSERT INTO units (id, letter, ord, color) VALUES ($1,$2,$3,$4)
			ON CONFLICT (id) DO UPDATE SET letter=EXCLUDED.letter, ord=EXCLUDED.ord, color=EXCLUDED.color, updated_at=now()`,
			u.ID, u.Letter, u.Ord, u.Color); err != nil {
			return st, fmt.Errorf("unit %s: %w", u.ID, err)
		}
		st["units"]++
	}
	for _, nd := range nodes {
		if _, err := tx.Exec(ctx, `INSERT INTO nodes (id, unit_id, ord, type) VALUES ($1,$2,$3,$4)
			ON CONFLICT (id) DO UPDATE SET unit_id=EXCLUDED.unit_id, ord=EXCLUDED.ord, type=EXCLUDED.type, updated_at=now()`,
			nd.ID, nd.UnitID, nd.Ord, nd.Type); err != nil {
			return st, fmt.Errorf("node %s: %w", nd.ID, err)
		}
		st["nodes"]++
	}
	for _, q := range qs {
		raw, _ := json.Marshal(q)
		var r struct {
			ID, NodeID, Type, QuestionText, CorrectAnswer string
			QuestionAudioURL, MediaLabel               *string
			Options                                    json.RawMessage
			Ord                                        int
			SyllableCount                              *int
		}
		// field names differ from Go names, so decode explicitly
		var m map[string]json.RawMessage
		_ = json.Unmarshal(raw, &m)
		get := func(k string, dst any) { _ = json.Unmarshal(m[k], dst) }
		get("id", &r.ID)
		get("node_id", &r.NodeID)
		get("type", &r.Type)
		get("question_text", &r.QuestionText)
		get("correct_answer", &r.CorrectAnswer)
		get("question_audio_url", &r.QuestionAudioURL)
		get("media_label", &r.MediaLabel)
		get("ord", &r.Ord)
		get("syllable_count", &r.SyllableCount)
		r.Options = m["options"]
		if len(r.Options) == 0 || string(r.Options) == "null" {
			r.Options = json.RawMessage(`[]`)
		}
		opts := im.RewriteURLs(string(r.Options))
		var audio *string
		if r.QuestionAudioURL != nil {
			a := im.RewriteURLs(*r.QuestionAudioURL)
			audio = &a
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO questions (id, node_id, type, question_text, question_audio_url, media_label, options, correct_answer, ord, syllable_count)
			VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)
			ON CONFLICT (id) DO UPDATE SET node_id=EXCLUDED.node_id, type=EXCLUDED.type, question_text=EXCLUDED.question_text,
			  question_audio_url=EXCLUDED.question_audio_url, media_label=EXCLUDED.media_label, options=EXCLUDED.options,
			  correct_answer=EXCLUDED.correct_answer, ord=EXCLUDED.ord, syllable_count=EXCLUDED.syllable_count, updated_at=now()`,
			r.ID, r.NodeID, r.Type, r.QuestionText, audio, r.MediaLabel, opts, r.CorrectAnswer, r.Ord, r.SyllableCount); err != nil {
			return st, fmt.Errorf("question %s: %w", r.ID, err)
		}
		st["questions"]++
	}
	_ = failedSet
	return st, tx.Commit(ctx)
}

func dedupe(in []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range in {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

func validRel(p string) bool {
	parts := strings.Split(p, "/")
	if len(parts) < 2 || len(parts) > 4 {
		return false
	}
	for _, s := range parts {
		if !segRe.MatchString(s) || strings.Contains(s, "..") {
			return false
		}
	}
	return true
}

// downloadAll fetches each storage path (skipping ones already stored) with limited concurrency.
// Returns how many files were newly stored and the paths that failed.
func (im *Importer) downloadAll(ctx context.Context, paths []string) (int, []string) {
	conc := im.Concurrency
	if conc <= 0 {
		conc = 8
	}
	var mu sync.Mutex
	var failed []string
	stored := 0
	ch := make(chan string)
	var wg sync.WaitGroup
	for i := 0; i < conc; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for p := range ch {
				ok, err := im.downloadOne(ctx, p)
				mu.Lock()
				if err != nil {
					failed = append(failed, p+" ("+err.Error()+")")
				} else if ok {
					stored++
				}
				mu.Unlock()
			}
		}()
	}
	for _, p := range paths {
		ch <- p
	}
	close(ch)
	wg.Wait()
	return stored, failed
}

// downloadOne returns (true, nil) when it stored a new file, (false, nil) when already present.
func (im *Importer) downloadOne(ctx context.Context, rel string) (bool, error) {
	if !validRel(rel) {
		return false, errors.New("unsupported path")
	}
	var exists bool
	if err := im.Dest.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM audio_objects WHERE path=$1)`, rel).Scan(&exists); err != nil {
		return false, err
	}
	full := filepath.Join(im.AudioDir, filepath.FromSlash(rel))
	if exists {
		if _, err := os.Stat(full); err == nil {
			return false, nil
		}
	}
	req, _ := http.NewRequestWithContext(ctx, "GET", im.storagePrefix()+rel, nil)
	resp, err := im.client().Do(req)
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return false, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	ct := resp.Header.Get("Content-Type")
	if i := strings.Index(ct, ";"); i >= 0 && !strings.HasPrefix(ct, "audio/") {
		ct = ct[:i]
	}
	if !(strings.HasPrefix(ct, "audio/") || strings.HasPrefix(ct, "image/") || ct == "video/webm") {
		return false, fmt.Errorf("content-type %q not allowed", ct)
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return false, err
	}
	tmp := full + ".part"
	f, err := os.Create(tmp)
	if err != nil {
		return false, err
	}
	n, cerr := io.Copy(f, resp.Body)
	if e := f.Close(); cerr == nil {
		cerr = e
	}
	if cerr != nil {
		os.Remove(tmp)
		return false, cerr
	}
	if resp.ContentLength >= 0 && n != resp.ContentLength {
		os.Remove(tmp)
		return false, fmt.Errorf("short download %d/%d", n, resp.ContentLength)
	}
	if err := os.Rename(tmp, full); err != nil {
		return false, err
	}
	if err := os.Chmod(full, 0o644); err != nil {
		return false, err
	}
	_, err = im.Dest.Exec(ctx, `INSERT INTO audio_objects (path, content_type, size_bytes) VALUES ($1,$2,$3)
		ON CONFLICT (path) DO UPDATE SET content_type=EXCLUDED.content_type, size_bytes=EXCLUDED.size_bytes`, rel, ct, n)
	return true, err
}

// ImportAccounts copies profiles, progress, friendships, question reports and (if present) stats
// from the Supabase Postgres database, then downloads every file listed in storage.objects.
// Passwords: Supabase kept "salt:sha256hex"; here the salt is kept and bcrypt(hex) is stored.
func (im *Importer) ImportAccounts(ctx context.Context, src *pgxpool.Pool) (Stats, error) {
	st := Stats{}
	tx, err := im.Dest.Begin(ctx)
	if err != nil {
		return st, err
	}
	defer tx.Rollback(ctx)

	rows, err := src.Query(ctx, `
		SELECT id::text, local_id::text, name, username, dob::text, avatar_url, COALESCE(diamonds,0), COALESCE(streak_days,0),
		       last_active_date::text, COALESCE(total_score,0), joined_at, password_hash
		FROM profiles`)
	if err != nil {
		return st, fmt.Errorf("read profiles: %w", err)
	}
	type prof struct {
		id, localID                  *string
		name, username               string
		dob, avatar, lastActive      *string
		diamonds, streak, totalScore int
		joined                       *time.Time
		hash                         *string
	}
	var profs []prof
	for rows.Next() {
		var p prof
		if err := rows.Scan(&p.id, &p.localID, &p.name, &p.username, &p.dob, &p.avatar, &p.diamonds, &p.streak, &p.lastActive, &p.totalScore, &p.joined, &p.hash); err != nil {
			rows.Close()
			return st, err
		}
		profs = append(profs, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return st, err
	}
	known := map[string]bool{}
	for _, p := range profs {
		var salt, bc *string
		if p.hash != nil {
			if m := hashRe.FindStringSubmatch(*p.hash); m != nil {
				h, err := bcrypt.GenerateFromPassword([]byte(m[2]), 12)
				if err != nil {
					return st, err
				}
				s, b := m[1], string(h)
				salt, bc = &s, &b
			} else {
				st["profiles_unparseable_hash"]++
			}
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO profiles (id, local_id, name, username, dob, avatar_url, diamonds, streak_days, last_active_date, total_score, joined_at, password_salt, password_hash)
			VALUES ($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, now()),$12,$13)
			ON CONFLICT (id) DO UPDATE SET local_id=EXCLUDED.local_id, name=EXCLUDED.name, username=EXCLUDED.username, dob=EXCLUDED.dob,
			  avatar_url=EXCLUDED.avatar_url, diamonds=EXCLUDED.diamonds, streak_days=EXCLUDED.streak_days,
			  last_active_date=EXCLUDED.last_active_date, total_score=EXCLUDED.total_score, joined_at=EXCLUDED.joined_at,
			  password_salt=COALESCE(EXCLUDED.password_salt, profiles.password_salt),
			  password_hash=COALESCE(EXCLUDED.password_hash, profiles.password_hash), updated_at=now()`,
			p.id, p.localID, p.name, strings.ToLower(p.username), p.dob, p.avatar, p.diamonds, p.streak, p.lastActive, p.totalScore, p.joined, salt, bc); err != nil {
			return st, fmt.Errorf("profile %s: %w", deref(p.id), err)
		}
		known[*p.id] = true
		st["profiles"]++
	}

	// node_progress
	prows, err := src.Query(ctx, `SELECT user_id::text, node_id, COALESCE(stars,0), COALESCE(completed,false), COALESCE(best_accuracy,0), COALESCE(attempts,0), last_played_at FROM node_progress`)
	if err != nil {
		return st, fmt.Errorf("read node_progress: %w", err)
	}
	type prog struct {
		uid, node       string
		stars, acc, att int
		done            bool
		last            *time.Time
	}
	var progs []prog
	for prows.Next() {
		var p prog
		if err := prows.Scan(&p.uid, &p.node, &p.stars, &p.done, &p.acc, &p.att, &p.last); err != nil {
			prows.Close()
			return st, err
		}
		progs = append(progs, p)
	}
	prows.Close()
	for _, p := range progs {
		if !known[p.uid] {
			st["progress_skipped_no_profile"]++
			continue
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO node_progress (user_id, node_id, stars, completed, best_accuracy, attempts, last_played_at)
			VALUES ($1::uuid,$2,$3,$4,$5,$6,$7)
			ON CONFLICT (user_id, node_id) DO UPDATE SET stars=EXCLUDED.stars, completed=EXCLUDED.completed,
			  best_accuracy=EXCLUDED.best_accuracy, attempts=EXCLUDED.attempts, last_played_at=EXCLUDED.last_played_at, updated_at=now()`,
			p.uid, p.node, p.stars, p.done, p.acc, p.att, p.last); err != nil {
			return st, fmt.Errorf("progress %s/%s: %w", p.uid, p.node, err)
		}
		st["progress"]++
	}

	// friendships
	frows, err := src.Query(ctx, `SELECT user_id::text, friend_id::text, created_at FROM friendships`)
	if err != nil {
		return st, fmt.Errorf("read friendships: %w", err)
	}
	type fr struct {
		u, f string
		at   *time.Time
	}
	var frs []fr
	for frows.Next() {
		var x fr
		if err := frows.Scan(&x.u, &x.f, &x.at); err != nil {
			frows.Close()
			return st, err
		}
		frs = append(frs, x)
	}
	frows.Close()
	for _, x := range frs {
		if !known[x.u] || !known[x.f] || x.u == x.f {
			st["friendships_skipped"]++
			continue
		}
		if _, err := tx.Exec(ctx, `INSERT INTO friendships (user_id, friend_id, created_at) VALUES ($1::uuid,$2::uuid,COALESCE($3, now()))
			ON CONFLICT (user_id, friend_id) DO NOTHING`, x.u, x.f, x.at); err != nil {
			return st, err
		}
		st["friendships"]++
	}

	// question_reports (only exists if the phase-4 SQL was run); absence is fine
	if n, err := im.copyReports(ctx, tx, src); err == nil {
		st["reports"] = n
	} else if !isUndefinedTable(err) {
		return st, err
	}
	if err := tx.Commit(ctx); err != nil {
		return st, err
	}

	// every object in the bucket, referenced by a question or not (intro, words, combos, ...)
	orows, err := src.Query(ctx, `SELECT name FROM storage.objects WHERE bucket_id='audio'`)
	if err != nil {
		return st, fmt.Errorf("list storage.objects: %w", err)
	}
	var names []string
	for orows.Next() {
		var n string
		if err := orows.Scan(&n); err != nil {
			orows.Close()
			return st, err
		}
		names = append(names, n)
	}
	orows.Close()
	n, failed := im.downloadAll(ctx, names)
	st["storage_objects"], st["storage_downloaded"], st["storage_failed"] = len(names), n, len(failed)
	for _, f := range failed {
		log.Printf("WARN storage object not imported: %s", f)
	}
	return st, nil
}

func (im *Importer) copyReports(ctx context.Context, tx pgx.Tx, src *pgxpool.Pool) (int, error) {
	rows, err := src.Query(ctx, `SELECT id::text, question_id, node_id, question_type, question_snapshot::text, description, reporter_username, status, created_at FROM question_reports`)
	if err != nil {
		return 0, err
	}
	type rp struct {
		id, qid, status                 string
		node, qtype, snap, desc, who    *string
		at                              time.Time
	}
	var rs []rp
	for rows.Next() {
		var r rp
		if err := rows.Scan(&r.id, &r.qid, &r.node, &r.qtype, &r.snap, &r.desc, &r.who, &r.status, &r.at); err != nil {
			rows.Close()
			return 0, err
		}
		rs = append(rs, r)
	}
	rows.Close()
	for _, r := range rs {
		if _, err := tx.Exec(ctx, `INSERT INTO question_reports (id, question_id, node_id, question_type, question_snapshot, description, reporter_username, status, created_at)
			VALUES ($1::uuid,$2,$3,$4,$5::jsonb,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
			r.id, r.qid, r.node, r.qtype, r.snap, r.desc, r.who, r.status, r.at); err != nil {
			return 0, err
		}
	}
	return len(rs), nil
}

func isUndefinedTable(err error) bool {
	return err != nil && strings.Contains(err.Error(), "42P01")
}

func deref(s *string) string {
	if s == nil {
		return "<nil>"
	}
	return *s
}
