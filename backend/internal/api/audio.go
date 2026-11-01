package api

import (
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/soodia/tichi/backend/internal/httpx"
)

const maxUploadBytes = 20 << 20

var (
	segRe       = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$`)
	folderSegRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,47}$`)
	extRe       = regexp.MustCompile(`^[a-z0-9]{1,5}$`)
	versionRe   = regexp.MustCompile(`--v([0-9]+)\.a$`)
)

// Only media types a browser can play/show. nosniff is set on responses so an uploaded file can
// never be interpreted as HTML/JS.
func allowedContentType(ct string) bool {
	ct = strings.ToLower(strings.TrimSpace(strings.SplitN(ct, ";", 2)[0]))
	return strings.HasPrefix(ct, "audio/") || strings.HasPrefix(ct, "image/") || ct == "video/webm"
}

// encodeKey mirrors the frontend's encodeKey: base64url (no padding) of the UTF-8 bytes.
func encodeKey(key string) string { return base64.RawURLEncoding.EncodeToString([]byte(key)) }

func validFolder(folder string) bool {
	parts := strings.Split(folder, "/")
	if len(parts) == 0 || len(parts) > 3 {
		return false
	}
	for _, p := range parts {
		if !folderSegRe.MatchString(p) {
			return false
		}
	}
	return true
}

// safePath returns the cleaned relative path if every segment is allowed, else "".
func safePath(p string) string {
	parts := strings.Split(p, "/")
	if len(parts) < 2 || len(parts) > 4 {
		return ""
	}
	for _, s := range parts {
		if !segRe.MatchString(s) || strings.Contains(s, "..") {
			return ""
		}
	}
	return strings.Join(parts, "/")
}

func (s *Server) audioURL(path string) string {
	return strings.TrimRight(s.Cfg.PublicURL, "/") + "/audio/" + path
}

// adminUploadAudio stores a file. ?folder=intro&key=<raw key> allocates the next "<key>--vN.a"
// version (never overwrites); ?folder=library/audio&ext=webm creates a unique name instead.
func (s *Server) adminUploadAudio(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	folder, key, ext := q.Get("folder"), q.Get("key"), strings.ToLower(q.Get("ext"))
	if !validFolder(folder) || (key == "") == (ext == "") || (ext != "" && !extRe.MatchString(ext)) || len(key) > 300 {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "need a valid folder and exactly one of key or ext")
		return
	}
	ct := r.Header.Get("Content-Type")
	if !allowedContentType(ct) {
		httpx.Error(w, http.StatusUnsupportedMediaType, "UNSUPPORTED_TYPE", "only audio/image types are accepted")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	data, err := io.ReadAll(r.Body)
	if err != nil {
		httpx.Error(w, http.StatusRequestEntityTooLarge, "TOO_LARGE", "file too large (max 20 MB)")
		return
	}
	if len(data) == 0 {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "empty file")
		return
	}

	ctx := r.Context()
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		serverError(w, err)
		return
	}
	defer tx.Rollback(ctx)

	var rel string
	if key != "" {
		enc := encodeKey(key)
		// serialise concurrent uploads of the same key so two recorders can't take the same N
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, folder+"/"+enc); err != nil {
			serverError(w, err)
			return
		}
		var n int
		err := tx.QueryRow(ctx, `
			SELECT COALESCE(max(substring(path from '--v([0-9]+)\.a$')::int), 0)
			FROM audio_objects WHERE path LIKE $1 ESCAPE '\'`, escapeLike(folder+"/"+enc)+`--v%.a`).Scan(&n)
		if err != nil {
			serverError(w, err)
			return
		}
		rel = fmt.Sprintf("%s/%s--v%d.a", folder, enc, n+1)
	} else {
		rel = fmt.Sprintf("%s/%d-%s.%s", folder, time.Now().UnixMilli(), randSuffix(), ext)
	}

	full := filepath.Join(s.Cfg.AudioDir, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		serverError(w, err)
		return
	}
	f, err := os.OpenFile(full, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		serverError(w, err)
		return
	}
	_, werr := f.Write(data)
	cerr := f.Close()
	if werr != nil || cerr != nil {
		os.Remove(full)
		serverError(w, errors.Join(werr, cerr))
		return
	}
	if _, err := tx.Exec(ctx, `INSERT INTO audio_objects (path, content_type, size_bytes) VALUES ($1,$2,$3)`, rel, ct, len(data)); err != nil {
		os.Remove(full)
		writeDBError(w, err)
		return
	}
	if err := tx.Commit(ctx); err != nil {
		os.Remove(full)
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"path": rel, "url": s.audioURL(rel), "size": len(data)})
}

func randSuffix() string {
	const a = "abcdefghijklmnopqrstuvwxyz0123456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = a[rand.IntN(len(a))]
	}
	return string(b)
}

func escapeLike(s string) string { return likeEscaper.Replace(s) }

// serveAudio serves stored files. Names are immutable (versioned or unique), so cache hard.
func (s *Server) serveAudio(w http.ResponseWriter, r *http.Request) {
	rel := safePath(r.PathValue("path"))
	if rel == "" {
		http.NotFound(w, r)
		return
	}
	var ct string
	err := s.DB.QueryRow(r.Context(), `SELECT content_type FROM audio_objects WHERE path=$1`, rel).Scan(&ct)
	if errors.Is(err, pgx.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	f, err := os.Open(filepath.Join(s.Cfg.AudioDir, filepath.FromSlash(rel)))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		serverError(w, err)
		return
	}
	h := w.Header()
	h.Set("Content-Type", ct)
	h.Set("X-Content-Type-Options", "nosniff")
	h.Set("Cache-Control", "public, max-age=31536000, immutable")
	h.Set("Access-Control-Allow-Origin", "*")
	http.ServeContent(w, r, "", st.ModTime(), f) // handles Range (needed for audio seeking on iOS)
}

// latestAudio maps raw keys to the URL of their highest version (replaces client-side probing).
func (s *Server) latestAudio(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Folder string   `json:"folder"`
		Keys   []string `json:"keys"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if !validFolder(in.Folder) || len(in.Keys) > 2000 {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "bad folder or too many keys")
		return
	}
	out := map[string]string{}
	for _, k := range in.Keys {
		prefix := in.Folder + "/" + encodeKey(k)
		var path string
		err := s.DB.QueryRow(r.Context(), `
			SELECT path FROM audio_objects WHERE path LIKE $1 ESCAPE '\'
			ORDER BY substring(path from '--v([0-9]+)\.a$')::int DESC LIMIT 1`, escapeLike(prefix)+`--v%.a`).Scan(&path)
		if errors.Is(err, pgx.ErrNoRows) {
			continue
		}
		if err != nil {
			serverError(w, err)
			return
		}
		if m := versionRe.FindStringSubmatch(path); m != nil {
			if _, err := strconv.Atoi(m[1]); err == nil {
				out[k] = s.audioURL(path)
			}
		}
	}
	httpx.JSON(w, http.StatusOK, out)
}

// adminListAudio lists the files directly inside a folder (newest first, max 200) so the editor
// can offer "reuse an existing file".
func (s *Server) adminListAudio(w http.ResponseWriter, r *http.Request) {
	folder := r.URL.Query().Get("folder")
	if !validFolder(folder) {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "bad folder")
		return
	}
	rows, err := s.DB.Query(r.Context(), `
		SELECT path, size_bytes FROM audio_objects
		WHERE path LIKE $1 ESCAPE '\' AND position('/' in substr(path, $2)) = 0
		ORDER BY created_at DESC, path DESC LIMIT 200`, escapeLike(folder)+"/%", len(folder)+2)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()
	type item struct {
		Name string `json:"name"`
		URL  string `json:"url"`
		Size int64  `json:"size"`
	}
	out := []item{}
	for rows.Next() {
		var p string
		var n int64
		if err := rows.Scan(&p, &n); err != nil {
			serverError(w, err)
			return
		}
		out = append(out, item{Name: p[len(folder)+1:], URL: s.audioURL(p), Size: n})
	}
	httpx.JSON(w, http.StatusOK, out)
}
