package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func upload(t *testing.T, h http.Handler, query, ct string, body []byte, hdr map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest("POST", "/api/v1/admin/audio?"+query, bytes.NewReader(body))
	req.Header.Set("Content-Type", ct)
	for k, v := range hdr {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestAudioUploadServeVersions(t *testing.T) {
	s, h := newTestServer(t)
	clip := []byte("OggS-fake-audio-bytes")

	if rec := upload(t, h, "folder=words&key=سیب", "audio/webm", clip, nil); rec.Code != 403 {
		t.Fatalf("upload without admin key: %d", rec.Code)
	}

	var r1, r2 struct{ Path, URL string }
	rec := upload(t, h, "folder=words&key=%D8%B3%DB%8C%D8%A8", "audio/webm;codecs=opus", clip, adminHdr)
	if rec.Code != 201 {
		t.Fatalf("upload 1: %d %s", rec.Code, rec.Body)
	}
	json.Unmarshal(rec.Body.Bytes(), &r1)
	rec = upload(t, h, "folder=words&key=%D8%B3%DB%8C%D8%A8", "audio/webm", []byte("second"), adminHdr)
	json.Unmarshal(rec.Body.Bytes(), &r2)
	if !strings.HasSuffix(r1.Path, "--v1.a") || !strings.HasSuffix(r2.Path, "--v2.a") {
		t.Fatalf("versions not allocated: %q %q", r1.Path, r2.Path)
	}
	if r1.URL != "http://test/audio/"+r1.Path {
		t.Fatalf("url: %q", r1.URL)
	}
	// 11 versions: make sure v10 > v9 (numeric, not lexical)
	for i := 0; i < 7; i++ { // v3..v9
		upload(t, h, "folder=words&key=%D8%B3%DB%8C%D8%A8", "audio/webm", []byte("x"), adminHdr)
	}
	rec = upload(t, h, "folder=words&key=%D8%B3%DB%8C%D8%A8", "audio/webm", []byte("v10"), adminHdr)
	var r10 struct{ Path string }
	json.Unmarshal(rec.Body.Bytes(), &r10)
	if !strings.HasSuffix(r10.Path, "--v10.a") {
		t.Fatalf("expected v10 got %s", r10.Path)
	}

	// serve: bytes, content-type, cache headers, HEAD, Range
	get := httptest.NewRecorder()
	h.ServeHTTP(get, httptest.NewRequest("GET", "/audio/"+r1.Path, nil))
	if get.Code != 200 || !bytes.Equal(get.Body.Bytes(), clip) || !strings.HasPrefix(get.Header().Get("Content-Type"), "audio/webm") {
		t.Fatalf("serve: %d ct=%q body=%q", get.Code, get.Header().Get("Content-Type"), get.Body)
	}
	if get.Header().Get("X-Content-Type-Options") != "nosniff" || !strings.Contains(get.Header().Get("Cache-Control"), "immutable") {
		t.Fatalf("headers: %v", get.Header())
	}
	head := httptest.NewRecorder()
	h.ServeHTTP(head, httptest.NewRequest("HEAD", "/audio/"+r1.Path, nil))
	if head.Code != 200 {
		t.Fatalf("HEAD: %d", head.Code)
	}
	rng := httptest.NewRequest("GET", "/audio/"+r1.Path, nil)
	rng.Header.Set("Range", "bytes=0-3")
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, rng)
	if rr.Code != 206 || rr.Body.String() != "OggS" {
		t.Fatalf("range: %d %q", rr.Code, rr.Body)
	}

	// latest picks numeric max and ignores unknown keys
	var latest map[string]string
	call(t, h, "POST", "/api/v1/audio/latest", map[string]any{"folder": "words", "keys": []string{"سیب", "ناشناس"}}, nil, &latest)
	if len(latest) != 1 || latest["سیب"] != "http://test/audio/"+r10.Path {
		t.Fatalf("latest: %v", latest)
	}

	// unique-name library upload
	rec = upload(t, h, "folder=library/images&ext=png", "image/png", []byte("\x89PNG"), adminHdr)
	if rec.Code != 201 || !strings.Contains(rec.Body.String(), "library/images/") {
		t.Fatalf("library upload: %d %s", rec.Code, rec.Body)
	}

	// rejections
	cases := map[string]struct {
		q, ct string
		code  int
	}{
		"html upload":        {"folder=words&key=a", "text/html", 415},
		"svg-as-script":      {"folder=words&key=a", "application/javascript", 415},
		"traversal folder":   {"folder=../etc&key=a", "audio/webm", 422},
		"absolute folder":    {"folder=/tmp&key=a", "audio/webm", 422},
		"key and ext":        {"folder=words&key=a&ext=png", "audio/webm", 422},
		"neither key nor ext": {"folder=words", "audio/webm", 422},
		"bad ext":            {"folder=words&ext=p/g", "image/png", 422},
		"upper folder":       {"folder=Words&key=a", "audio/webm", 422},
	}
	for name, c := range cases {
		if rec := upload(t, h, c.q, c.ct, []byte("x"), adminHdr); rec.Code != c.code {
			t.Errorf("%s: want %d got %d", name, c.code, rec.Code)
		}
	}
	if rec := upload(t, h, "folder=words&key=a", "audio/webm", nil, adminHdr); rec.Code != 422 {
		t.Errorf("empty body: %d", rec.Code)
	}
	if rec := upload(t, h, "folder=words&key=big", "audio/webm", make([]byte, maxUploadBytes+1), adminHdr); rec.Code != 413 {
		t.Errorf("oversize: %d", rec.Code)
	}

	// path traversal on serve + unknown file
	for _, p := range []string{"/audio/words/..%2f..%2fetc%2fpasswd", "/audio/../etc/passwd", "/audio/words/nope--v1.a", "/audio/words", "/audio/a/b/c/d/e"} {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest("GET", p, nil))
		if rec.Code != 404 && rec.Code != 301 && rec.Code != 307 { // mux redirects unclean paths; nothing is served
			t.Errorf("GET %s: want 404 got %d", p, rec.Code)
		}
	}

	// a DB row whose file vanished from disk -> 404, not 500
	os.Remove(filepath.Join(s.Cfg.AudioDir, filepath.FromSlash(r1.Path)))
	rec2 := httptest.NewRecorder()
	h.ServeHTTP(rec2, httptest.NewRequest("GET", "/audio/"+r1.Path, nil))
	if rec2.Code != 404 {
		t.Errorf("missing file on disk: %d", rec2.Code)
	}
}

func TestAudioConcurrentUploadsGetDistinctVersions(t *testing.T) {
	_, h := newTestServer(t)
	var wg sync.WaitGroup
	var mu sync.Mutex
	seen := map[string]int{}
	for i := 0; i < 12; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rec := upload(t, h, "folder=combos&key=race", "audio/webm", []byte("x"), adminHdr)
			var r struct{ Path string }
			json.Unmarshal(rec.Body.Bytes(), &r)
			mu.Lock()
			seen[r.Path]++
			mu.Unlock()
		}()
	}
	wg.Wait()
	if len(seen) != 12 {
		t.Fatalf("expected 12 distinct versions, got %d: %v", len(seen), seen)
	}
}
