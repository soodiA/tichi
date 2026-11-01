package api

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/soodia/tichi/backend/internal/config"
	"github.com/soodia/tichi/backend/migrations"
)

const testAdminKey = "test-admin-key"

// newTestServer needs TEST_DATABASE_URL (a throwaway database). It resets the schema
// through goose down/up so every test starts from the real migrations.
func newTestServer(t *testing.T) (*Server, http.Handler) {
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
	if err := goose.SetDialect("postgres"); err != nil {
		t.Fatal(err)
	}
	if err := goose.DownTo(sdb, ".", 0); err != nil {
		t.Fatalf("down: %v", err)
	}
	if err := goose.Up(sdb, "."); err != nil {
		t.Fatalf("up: %v", err)
	}
	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	srv := &Server{DB: pool, Cfg: config.Config{
		AdminKey:    testAdminKey,
		TokenSecret: "0123456789abcdef0123456789abcdef",
		AudioDir:    t.TempDir(),
		PublicURL:   "http://test",
		CORSOrigins: "*",
	}}
	return srv, srv.Handler()
}

// call performs a request against the handler and decodes the JSON response into out (if non-nil).
func call(t *testing.T, h http.Handler, method, path string, body any, hdr map[string]string, out any) *httptest.ResponseRecorder {
	t.Helper()
	var rd *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	} else {
		rd = bytes.NewReader(nil)
	}
	req := httptest.NewRequest(method, path, rd)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if out != nil && rec.Body.Len() > 0 {
		if err := json.Unmarshal(rec.Body.Bytes(), out); err != nil {
			t.Fatalf("%s %s: bad JSON %q: %v", method, path, rec.Body.String(), err)
		}
	}
	return rec
}

var adminHdr = map[string]string{"X-Admin-Key": testAdminKey}

func seedContent(t *testing.T, s *Server) {
	t.Helper()
	_, err := s.DB.Exec(context.Background(), `
		INSERT INTO units (id, letter, ord, color) VALUES ('unit-b','ب',2,'#f00'), ('unit-a','ا',1,'#0f0');
		INSERT INTO nodes (id, unit_id, ord, type) VALUES ('node-a-1','unit-a',1,'lesson'), ('node-b-1','unit-b',1,'lesson');
		INSERT INTO questions (id, node_id, type, question_text, options, correct_answer, ord) VALUES
		 ('q1','node-a-1','audio_picture','کدام یکی با ا شروع میشه؟','[{"id":"o1","text":"آب"}]','o1',1),
		 ('q2','node-a-1','audio_picture','کدام یکی آخرش ا داره؟','[]','o1',2),
		 ('q3','node-a-1','phoneme','x','[]','["a","b"]',3);
	`)
	if err != nil {
		t.Fatal(err)
	}
}
