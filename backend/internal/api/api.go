// Package api wires the HTTP routes of the Tichi backend.
package api

import (
	"crypto/subtle"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/soodia/tichi/backend/internal/config"
	"github.com/soodia/tichi/backend/internal/httpx"
)

type Server struct {
	DB  *pgxpool.Pool
	Cfg config.Config
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.health)

	// public, read-only content
	mux.HandleFunc("GET /api/v1/curriculum", s.getCurriculum)

	// audio files
	mux.HandleFunc("GET /audio/{path...}", s.serveAudio)
	mux.HandleFunc("POST /api/v1/audio/latest", s.latestAudio)

	// accounts
	mux.HandleFunc("POST /api/v1/auth/register", s.register)
	mux.HandleFunc("GET /api/v1/auth/salt", s.getSalt)
	mux.HandleFunc("GET /api/v1/auth/lookup", s.lookupUsername)
	mux.HandleFunc("POST /api/v1/auth/login", s.login)
	mux.HandleFunc("POST /api/v1/auth/token", s.tokenFromHash)
	mux.HandleFunc("GET /api/v1/me", s.authed(s.getMe))
	mux.HandleFunc("PATCH /api/v1/me", s.authed(s.updateMe))
	mux.HandleFunc("PUT /api/v1/me/progress", s.authed(s.saveProgress))
	mux.HandleFunc("POST /api/v1/me/question-stats", s.authed(s.recordQuestionStat))
	mux.HandleFunc("GET /api/v1/me/friends", s.authed(s.myFriendIDs))
	mux.HandleFunc("POST /api/v1/me/friends", s.authed(s.addFriend))
	mux.HandleFunc("GET /api/v1/me/friends-of-friends", s.authed(s.friendsOfFriends))
	mux.HandleFunc("GET /api/v1/profiles", s.listPublicProfiles)
	mux.HandleFunc("POST /api/v1/reports", s.submitReport)

	// admin content editing (X-Admin-Key)
	a := s.admin
	mux.HandleFunc("GET /api/v1/admin/units", a(s.adminListUnits))
	mux.HandleFunc("GET /api/v1/admin/nodes", a(s.adminListNodes))
	mux.HandleFunc("POST /api/v1/admin/nodes", a(s.adminCreateNode))
	mux.HandleFunc("GET /api/v1/admin/questions", a(s.adminListQuestions))
	mux.HandleFunc("POST /api/v1/admin/questions", a(s.adminCreateQuestion))
	mux.HandleFunc("PUT /api/v1/admin/questions/{id}", a(s.adminUpdateQuestion))
	mux.HandleFunc("DELETE /api/v1/admin/questions/{id}", a(s.adminDeleteQuestion))
	mux.HandleFunc("PATCH /api/v1/admin/questions/{id}", a(s.adminPatchQuestion))
	mux.HandleFunc("GET /api/v1/admin/media-labels", a(s.adminMediaLabels))
	mux.HandleFunc("POST /api/v1/admin/media-labels/audio", a(s.adminSetLabelAudio))
	mux.HandleFunc("POST /api/v1/admin/questions/{id}/swap/{other}", a(s.adminSwapQuestions))
	mux.HandleFunc("POST /api/v1/admin/audio", a(s.adminUploadAudio))
	mux.HandleFunc("GET /api/v1/admin/audio", a(s.adminListAudio))
	mux.HandleFunc("GET /api/v1/admin/reports", a(s.adminListReports))
	mux.HandleFunc("PUT /api/v1/admin/reports/{id}/status", a(s.adminSetReportStatus))
	mux.HandleFunc("GET /api/v1/admin/audio-slots/{slot}", a(s.adminGetAudioSlot))
	mux.HandleFunc("PUT /api/v1/admin/audio-slots/{slot}", a(s.adminSetAudioSlot))

	return s.cors(s.logging(mux))
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.DB.Ping(r.Context()); err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, "UNAVAILABLE", "db unavailable")
		return
	}
	w.Write([]byte("ok"))
}

// admin guards a handler with the shared admin key (constant-time compare).
func (s *Server) admin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		got := r.Header.Get("X-Admin-Key")
		if subtle.ConstantTimeCompare([]byte(got), []byte(s.Cfg.AdminKey)) != 1 {
			httpx.Error(w, http.StatusForbidden, "FORBIDDEN", "bad admin key")
			return
		}
		next(w, r)
	}
}

func (s *Server) cors(next http.Handler) http.Handler {
	origins := map[string]bool{}
	for _, o := range strings.Split(s.Cfg.CORSOrigins, ",") {
		if o = strings.TrimSpace(o); o != "" {
			origins[o] = true
		}
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if o := r.Header.Get("Origin"); o != "" && (origins["*"] || origins[o]) {
			w.Header().Set("Access-Control-Allow-Origin", o)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key")
			w.Header().Set("Access-Control-Expose-Headers", "X-Total-Count")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (w *statusWriter) WriteHeader(c int) { w.status = c; w.ResponseWriter.WriteHeader(c) }

func (s *Server) logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sw := &statusWriter{ResponseWriter: w, status: 200}
		next.ServeHTTP(sw, r)
		log.Printf("%s %s %d", r.Method, r.URL.Path, sw.status)
	})
}
