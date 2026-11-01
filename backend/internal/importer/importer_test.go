package importer

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"golang.org/x/crypto/bcrypt"

	"github.com/soodia/tichi/backend/migrations"
)

func destPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	sdb, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	defer sdb.Close()
	goose.SetBaseFS(migrations.FS)
	_ = goose.SetDialect("postgres")
	if err := goose.DownTo(sdb, ".", 0); err != nil {
		t.Fatal(err)
	}
	if err := goose.Up(sdb, "."); err != nil {
		t.Fatal(err)
	}
	p, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(p.Close)
	return p
}

// fakeSupabase serves the REST + public-storage endpoints the importer uses.
func fakeSupabase(t *testing.T, files map[string]string) *httptest.Server {
	t.Helper()
	var srv *httptest.Server
	rows := map[string]string{
		"units": `[{"id":"unit-a","letter":"ا","ord":1,"color":"#fff"}]`,
		"nodes": `[{"id":"node-a-1","unit_id":"unit-a","ord":1,"type":"lesson"}]`,
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/rest/v1/", func(w http.ResponseWriter, r *http.Request) {
		table := strings.TrimPrefix(r.URL.Path, "/rest/v1/")
		if r.Header.Get("apikey") != "anon" {
			http.Error(w, "no key", 401)
			return
		}
		if table == "questions" {
			base := srv.URL + "/storage/v1/object/public/audio/"
			fmt.Fprintf(w, `[
			 {"id":"q1","node_id":"node-a-1","type":"audio_picture","question_text":"t","question_audio_url":"%swords/aaa--v1.a","media_label":null,"options":[{"id":"o1","text":"x","audioUrl":"%swords/bbb--v1.a","imageUrl":"%slibrary/images/pic.png"}],"correct_answer":"o1","ord":1,"syllable_count":null},
			 {"id":"q2","node_id":"node-a-1","type":"phoneme","question_text":"u","question_audio_url":"%swords/missing--v1.a","media_label":"m","options":null,"correct_answer":"[\"a\"]","ord":2,"syllable_count":3}]`, base, base, base, base)
			return
		}
		w.Write([]byte(rows[table]))
	})
	mux.HandleFunc("/storage/v1/object/public/audio/", func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(r.URL.Path, "/storage/v1/object/public/audio/")
		body, ok := files[name]
		if !ok {
			http.NotFound(w, r)
			return
		}
		ct := "audio/webm"
		if strings.HasSuffix(name, ".png") {
			ct = "image/png"
		}
		w.Header().Set("Content-Type", ct)
		w.Write([]byte(body))
	})
	srv = httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func TestImportContent(t *testing.T) {
	dest := destPool(t)
	srv := fakeSupabase(t, map[string]string{"words/aaa--v1.a": "AAA", "words/bbb--v1.a": "BB", "library/images/pic.png": "PNG"})
	dir := t.TempDir()
	im := &Importer{Dest: dest, AudioDir: dir, PublicURL: "https://new.example", SupabaseURL: srv.URL, AnonKey: "anon"}
	ctx := context.Background()

	st, err := im.ImportContent(ctx)
	if err != nil {
		t.Fatalf("import: %v (%v)", err, st)
	}
	if st["units"] != 1 || st["nodes"] != 1 || st["questions"] != 2 || st["audio_downloaded"] != 3 || st["audio_failed"] != 1 {
		t.Fatalf("stats: %v", st)
	}
	var url, opts string
	dest.QueryRow(ctx, `SELECT question_audio_url, options::text FROM questions WHERE id='q1'`).Scan(&url, &opts)
	if url != "https://new.example/audio/words/aaa--v1.a" || !strings.Contains(opts, "https://new.example/audio/words/bbb--v1.a") || !strings.Contains(opts, "https://new.example/audio/library/images/pic.png") {
		t.Fatalf("urls not rewritten: %s | %s", url, opts)
	}
	if strings.Contains(opts, srv.URL) {
		t.Fatalf("old host still present: %s", opts)
	}
	var o2 string
	var syl int
	dest.QueryRow(ctx, `SELECT options::text, syllable_count FROM questions WHERE id='q2'`).Scan(&o2, &syl)
	if o2 != "[]" || syl != 3 {
		t.Fatalf("null options/ syllables: %q %d", o2, syl)
	}
	if b, _ := os.ReadFile(dir + "/words/aaa--v1.a"); string(b) != "AAA" {
		t.Fatalf("file content: %q", b)
	}
	var ct string
	var size int
	dest.QueryRow(ctx, `SELECT content_type, size_bytes FROM audio_objects WHERE path='library/images/pic.png'`).Scan(&ct, &size)
	if ct != "image/png" || size != 3 {
		t.Fatalf("audio_objects: %s %d", ct, size)
	}

	// idempotent: second run changes no counts and downloads nothing new
	st2, err := im.ImportContent(ctx)
	if err != nil || st2["audio_downloaded"] != 0 {
		t.Fatalf("second run: %v %v", st2, err)
	}
	var nq int
	dest.QueryRow(ctx, `SELECT count(*) FROM questions`).Scan(&nq)
	if nq != 2 {
		t.Fatalf("duplicate rows after rerun: %d", nq)
	}
}

func TestImportAccounts(t *testing.T) {
	dest := destPool(t)
	url := os.Getenv("TEST_DATABASE_URL")
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	// a stand-in for the Supabase database: same table/column names, in their own schemas
	for _, q := range []string{
		`DROP SCHEMA IF EXISTS src CASCADE`, `DROP SCHEMA IF EXISTS storage CASCADE`,
		`CREATE SCHEMA src`, `CREATE SCHEMA storage`,
		`CREATE TABLE storage.objects (bucket_id text, name text)`,
		`CREATE TABLE src.profiles (id uuid, local_id uuid, name text, username text, dob date, avatar_url text, diamonds int, streak_days int, last_active_date date, total_score int, joined_at timestamptz, password_hash text)`,
		`CREATE TABLE src.node_progress (user_id uuid, node_id text, stars int, completed bool, best_accuracy int, attempts int, last_played_at timestamptz)`,
		`CREATE TABLE src.friendships (id uuid default gen_random_uuid(), user_id uuid, friend_id uuid, created_at timestamptz)`,
		`CREATE TABLE src.question_reports (id uuid, question_id text, node_id text, question_type text, question_snapshot jsonb, description text, reporter_username text, status text, created_at timestamptz)`,
		`INSERT INTO src.profiles VALUES
		  ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Soodi','Soodi','2018-05-01','http://a',5,2,'2026-10-30',99,'2026-01-01T00:00:00Z','salt1:` + strings.Repeat("a", 64) + `'),
		  ('22222222-2222-4222-8222-222222222222',NULL,'Old','OldUser',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL),
		  ('33333333-3333-4333-8333-333333333333',NULL,'Weird','weird',NULL,NULL,0,0,NULL,0,NULL,'not-a-salted-hash')`,
		`INSERT INTO src.node_progress VALUES ('11111111-1111-4111-8111-111111111111','n1',3,true,100,2,'2026-10-30T00:00:00Z'), ('99999999-9999-4999-8999-999999999999','n1',1,false,10,1,NULL)`,
		`INSERT INTO src.friendships (user_id, friend_id, created_at) VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',now()), ('11111111-1111-4111-8111-111111111111','99999999-9999-4999-8999-999999999999',now())`,
		`INSERT INTO storage.objects VALUES ('audio','intro/x--v1.a'), ('audio','intro/gone--v1.a'), ('other','nope/y.a')`,
	} {
		if _, err := admin.Exec(ctx, q); err != nil {
			t.Fatalf("fixture %.60s: %v", q, err)
		}
	}
	t.Cleanup(func() {
		admin.Exec(ctx, `DROP SCHEMA IF EXISTS src CASCADE`)
		admin.Exec(ctx, `DROP SCHEMA IF EXISTS storage CASCADE`)
	})
	src, err := pgxpool.New(ctx, url+"&search_path=src,public")
	if err != nil {
		t.Fatal(err)
	}
	defer src.Close()

	srv := fakeSupabase(t, map[string]string{"intro/x--v1.a": "INTRO"})
	dir := t.TempDir()
	im := &Importer{Dest: dest, AudioDir: dir, PublicURL: "https://new.example", SupabaseURL: srv.URL, AnonKey: "anon"}
	st, err := im.ImportAccounts(ctx, src)
	if err != nil {
		t.Fatalf("accounts: %v (%v)", err, st)
	}
	want := map[string]int{"profiles": 3, "progress": 1, "progress_skipped_no_profile": 1, "friendships": 1, "friendships_skipped": 1,
		"profiles_unparseable_hash": 1, "storage_objects": 2, "storage_downloaded": 1, "storage_failed": 1}
	for k, v := range want {
		if st[k] != v {
			t.Errorf("stat %s = %d, want %d (all: %v)", k, st[k], v, st)
		}
	}

	// credentials re-wrapped; usernames lowercased; ids preserved
	var salt, hash, uname string
	dest.QueryRow(ctx, `SELECT password_salt, password_hash, username FROM profiles WHERE id='11111111-1111-4111-8111-111111111111'`).Scan(&salt, &hash, &uname)
	if salt != "salt1" || uname != "soodi" || bcrypt.CompareHashAndPassword([]byte(hash), []byte(strings.Repeat("a", 64))) != nil {
		t.Fatalf("credential: salt=%q user=%q hashprefix=%.4s", salt, uname, hash)
	}
	var nilHash, localID *string
	dest.QueryRow(ctx, `SELECT password_hash, local_id::text FROM profiles WHERE id='22222222-2222-4222-8222-222222222222'`).Scan(&nilHash, &localID)
	if nilHash != nil || localID != nil {
		t.Fatalf("passwordless legacy profile should stay passwordless")
	}
	var dob, last string
	var diamonds int
	dest.QueryRow(ctx, `SELECT dob, last_active_date, diamonds FROM profiles WHERE id='11111111-1111-4111-8111-111111111111'`).Scan(&dob, &last, &diamonds)
	if dob != "2018-05-01" || last != "2026-10-30" || diamonds != 5 {
		t.Fatalf("fields: %s %s %d", dob, last, diamonds)
	}
	var nq int
	dest.QueryRow(ctx, `SELECT count(*) FROM question_reports`).Scan(&nq) // no source table rows -> fine
	if b, _ := os.ReadFile(dir + "/intro/x--v1.a"); string(b) != "INTRO" {
		t.Fatalf("storage file: %q", b)
	}

	// rerun is idempotent
	if _, err := im.ImportAccounts(ctx, src); err != nil {
		t.Fatalf("rerun: %v", err)
	}
	var np, nf int
	dest.QueryRow(ctx, `SELECT count(*) FROM profiles`).Scan(&np)
	dest.QueryRow(ctx, `SELECT count(*) FROM friendships`).Scan(&nf)
	if np != 3 || nf != 1 {
		t.Fatalf("duplicates after rerun: profiles=%d friendships=%d", np, nf)
	}
}

func TestRewriteAndPaths(t *testing.T) {
	im := &Importer{SupabaseURL: "https://x.supabase.co", PublicURL: "https://new.example/"}
	in := `{"a":"https://x.supabase.co/storage/v1/object/public/audio/types/a.webm?t=1","b":"https://x.supabase.co/storage/v1/object/public/audio/words/b--v2.a"}`
	if got := im.RewriteURLs(in); strings.Contains(got, "supabase") || !strings.Contains(got, "https://new.example/audio/types/a.webm?t=1") {
		t.Fatalf("rewrite: %s", got)
	}
	paths := im.audioPathsIn(in)
	b, _ := json.Marshal(paths)
	if string(b) != `["types/a.webm","words/b--v2.a"]` {
		t.Fatalf("paths: %s", b)
	}
	for p, ok := range map[string]bool{"words/a.a": true, "../x/y": false, "a": false, "a/b/c/d/e": false, "a/b c": false} {
		if validRel(p) != ok {
			t.Errorf("validRel(%q) != %v", p, ok)
		}
	}
}
