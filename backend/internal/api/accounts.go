package api

import (
	"errors"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/soodia/tichi/backend/internal/httpx"
)

// bcryptCost 12 per the project convention; it wraps the browser-side sha256 hex (64 chars < 72 bytes).
const bcryptCost = 12

var (
	hashRe     = regexp.MustCompile(`^([A-Za-z0-9+/=_-]{1,128}):([0-9a-f]{64})$`)
	usernameRe = regexp.MustCompile(`^[\p{L}\p{N}_.]{2,32}$`)
)

type profileDTO struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Username       string     `json:"username"`
	DOB            *string    `json:"dob"`
	AvatarURL      *string    `json:"avatar_url"`
	JoinedAt       time.Time  `json:"joined_at"`
	Diamonds       int        `json:"diamonds"`
	StreakDays     int        `json:"streak_days"`
	LastActiveDate *string    `json:"last_active_date"`
	TotalScore     int        `json:"total_score"`
}

// profileColsP is profileCols qualified with the table name, for UPDATE ... FROM queries.
const profileColsP = `profiles.id::text, profiles.name, profiles.username, profiles.dob, profiles.avatar_url, profiles.joined_at, profiles.diamonds, profiles.streak_days, profiles.last_active_date, profiles.total_score`

const profileCols = `id::text, name, username, dob, avatar_url, joined_at, diamonds, streak_days, last_active_date, total_score`

func scanProfile(row pgx.Row) (profileDTO, error) {
	var p profileDTO
	err := row.Scan(&p.ID, &p.Name, &p.Username, &p.DOB, &p.AvatarURL, &p.JoinedAt, &p.Diamonds, &p.StreakDays, &p.LastActiveDate, &p.TotalScore)
	return p, err
}

type progressDTO struct {
	NodeID       string     `json:"node_id"`
	Stars        int        `json:"stars"`
	Completed    bool       `json:"completed"`
	BestAccuracy int        `json:"best_accuracy"`
	Attempts     int        `json:"attempts"`
	LastPlayedAt *time.Time `json:"last_played_at"`
}

func unauthorized(w http.ResponseWriter) {
	httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "login required")
}

// --- login throttling: 8 failures per username per 10 minutes. In-memory, per process.
// Does NOT protect against a distributed attack across many usernames, nor survive a restart.
type throttle struct {
	mu   sync.Mutex
	fail map[string][]time.Time
}

func (t *throttle) blocked(key string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	cut := time.Now().Add(-10 * time.Minute)
	kept := t.fail[key][:0]
	for _, ts := range t.fail[key] {
		if ts.After(cut) {
			kept = append(kept, ts)
		}
	}
	t.fail[key] = kept
	return len(kept) >= 8
}

func (t *throttle) record(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.fail[key] = append(t.fail[key], time.Now())
}

var loginThrottle = &throttle{fail: map[string][]time.Time{}}

// verifyHash checks a browser-computed "salt:hex" against the stored bcrypt value.
func verifyHash(stored *string, clientHash string) bool {
	m := hashRe.FindStringSubmatch(clientHash)
	if m == nil || stored == nil {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(*stored), []byte(m[2])) == nil
}

// resolveProfile finds the profile for (id-or-local_id, clientHash). found=false means no such
// profile (the client should register it); pid=="" with found=true means the hash did not match.
func (s *Server) resolveProfile(r *http.Request, id, clientHash string) (pid string, found bool, err error) {
	var stored *string
	err = s.DB.QueryRow(r.Context(),
		`SELECT id::text, password_hash FROM profiles WHERE (id::text=$1 OR local_id::text=$1) AND NOT is_deleted ORDER BY (id::text=$1) DESC LIMIT 1`, id).Scan(&pid, &stored)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if !verifyHash(stored, clientHash) {
		return "", true, nil
	}
	return pid, true, nil
}

type registerReq struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Username     string  `json:"username"`
	DOB          *string `json:"dob"`
	AvatarURL    *string `json:"avatar_url"`
	JoinedAt     *string `json:"joined_at"`
	PasswordHash string  `json:"password_hash"`
}

func (s *Server) register(w http.ResponseWriter, r *http.Request) {
	var in registerReq
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.Username = strings.ToLower(strings.TrimSpace(in.Username))
	m := hashRe.FindStringSubmatch(in.PasswordHash)
	if strings.TrimSpace(in.Name) == "" || !usernameRe.MatchString(in.Username) || m == nil {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "name, username and password_hash are required")
		return
	}
	id := in.ID
	if _, err := uuid.Parse(id); err != nil {
		id = uuid.NewString()
	}
	bc, err := bcrypt.GenerateFromPassword([]byte(m[2]), bcryptCost)
	if err != nil {
		serverError(w, err)
		return
	}
	row := s.DB.QueryRow(r.Context(), `
		INSERT INTO profiles (id, local_id, name, username, dob, avatar_url, joined_at, password_salt, password_hash)
		VALUES ($1, $1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7, $8)
		RETURNING `+profileCols, id, strings.TrimSpace(in.Name), in.Username, in.DOB, in.AvatarURL, in.JoinedAt, m[1], string(bc))
	p, err := scanProfile(row)
	if err != nil {
		writeDBError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, map[string]any{"token": s.signToken(p.ID), "profile": p})
}

// getSalt returns the public salt for a username (empty 404 when unknown).
func (s *Server) getSalt(w http.ResponseWriter, r *http.Request) {
	u := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("username")))
	var salt *string
	err := s.DB.QueryRow(r.Context(),
		`SELECT password_salt FROM profiles WHERE lower(username)=$1 AND NOT is_deleted AND password_salt IS NOT NULL LIMIT 1`, u).Scan(&salt)
	if errors.Is(err, pgx.ErrNoRows) || (err == nil && salt == nil) {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "unknown username")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]string{"salt": *salt})
}

// lookup tells the signup/login screens whether a username exists (id only; no secrets).
func (s *Server) lookupUsername(w http.ResponseWriter, r *http.Request) {
	u := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("username")))
	var id string
	var hasPw bool
	err := s.DB.QueryRow(r.Context(),
		`SELECT id::text, password_hash IS NOT NULL FROM profiles WHERE lower(username)=$1 AND NOT is_deleted LIMIT 1`, u).Scan(&id, &hasPw)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "unknown username")
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"id": id, "has_password": hasPw})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Username     string `json:"username"`
		PasswordHash string `json:"password_hash"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	u := strings.ToLower(strings.TrimSpace(in.Username))
	if loginThrottle.blocked(u) {
		httpx.Error(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many attempts, try later")
		return
	}
	var pid string
	var stored *string
	err := s.DB.QueryRow(r.Context(),
		`SELECT id::text, password_hash FROM profiles WHERE lower(username)=$1 AND NOT is_deleted LIMIT 1`, u).Scan(&pid, &stored)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		serverError(w, err)
		return
	}
	if err != nil || !verifyHash(stored, in.PasswordHash) {
		loginThrottle.record(u)
		httpx.Error(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "wrong username or password")
		return
	}
	s.sendSession(w, r, pid)
}

// tokenFromHash lets an already-logged-in device (which holds id + hash locally) mint a token.
func (s *Server) tokenFromHash(w http.ResponseWriter, r *http.Request) {
	var in struct {
		ProfileID    string `json:"profile_id"`
		PasswordHash string `json:"password_hash"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if loginThrottle.blocked(in.ProfileID) {
		httpx.Error(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many attempts, try later")
		return
	}
	pid, found, err := s.resolveProfile(r, in.ProfileID, in.PasswordHash)
	if err != nil {
		serverError(w, err)
		return
	}
	if !found {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "no such profile")
		return
	}
	if pid == "" {
		loginThrottle.record(in.ProfileID)
		httpx.Error(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "unknown profile or wrong hash")
		return
	}
	s.sendSession(w, r, pid)
}

func (s *Server) sendSession(w http.ResponseWriter, r *http.Request, pid string) {
	p, err := scanProfile(s.DB.QueryRow(r.Context(), `SELECT `+profileCols+` FROM profiles WHERE id=$1`, pid))
	if err != nil {
		serverError(w, err)
		return
	}
	prog, err := s.progressFor(r, pid)
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"token": s.signToken(pid), "profile": p, "progress": prog})
}

func (s *Server) progressFor(r *http.Request, pid string) ([]progressDTO, error) {
	rows, err := s.DB.Query(r.Context(),
		`SELECT node_id, stars, completed, best_accuracy, attempts, last_played_at FROM node_progress WHERE user_id=$1 AND NOT is_deleted ORDER BY node_id`, pid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []progressDTO{}
	for rows.Next() {
		var p progressDTO
		if err := rows.Scan(&p.NodeID, &p.Stars, &p.Completed, &p.BestAccuracy, &p.Attempts, &p.LastPlayedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Server) getMe(w http.ResponseWriter, r *http.Request, pid string) {
	s.sendSession(w, r, pid)
}

// updateMe changes only the keys present in the body.
func (s *Server) updateMe(w http.ResponseWriter, r *http.Request, pid string) {
	var in struct {
		Name           *string `json:"name"`
		AvatarURL      *string `json:"avatar_url"`
		Diamonds       *int    `json:"diamonds"`
		StreakDays     *int    `json:"streak_days"`
		LastActiveDate *string `json:"last_active_date"`
		TotalScore     *int    `json:"total_score"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.Name != nil && strings.TrimSpace(*in.Name) == "" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "name cannot be empty")
		return
	}
	// A device that was offline for days pushes its old copy of the profile on startup. Without a guard
	// that copy overwrites what another device has earned since (streak reset, lost diamonds). So the
	// game-state fields only move forward: total_score never decreases, and the streak/last_active/diamonds
	// group is applied only when the sender is not behind the server (its last_active_date and total_score
	// are not older). Name and avatar always apply. The response carries the server's current values so
	// the client can adopt them.
	row := s.DB.QueryRow(r.Context(), `
		UPDATE profiles SET
		  name=COALESCE($2,name), avatar_url=COALESCE($3,avatar_url),
		  diamonds   = CASE WHEN fresh.ok THEN COALESCE($4::int,diamonds) ELSE diamonds END,
		  streak_days= CASE WHEN fresh.ok THEN COALESCE($5::int,streak_days) ELSE streak_days END,
		  last_active_date = CASE WHEN fresh.ok THEN COALESCE($6::text,last_active_date) ELSE last_active_date END,
		  total_score = GREATEST(total_score, COALESCE($7::int,total_score)),
		  updated_at=now()
		FROM (SELECT id,
		        (($7::int IS NULL OR $7::int >= total_score)
		         AND ($6::text IS NULL OR last_active_date IS NULL OR $6::text >= last_active_date)) AS ok
		      FROM profiles WHERE id=$1) AS fresh
		WHERE profiles.id=$1 AND fresh.id=profiles.id AND NOT is_deleted RETURNING `+profileColsP,
		pid, in.Name, in.AvatarURL, in.Diamonds, in.StreakDays, in.LastActiveDate, in.TotalScore)
	p, err := scanProfile(row)
	if errors.Is(err, pgx.ErrNoRows) {
		unauthorized(w)
		return
	}
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, p)
}

func (s *Server) saveProgress(w http.ResponseWriter, r *http.Request, pid string) {
	var in progressDTO
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.NodeID == "" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "node_id is required")
		return
	}
	_, err := s.DB.Exec(r.Context(), `
		INSERT INTO node_progress (user_id, node_id, stars, completed, best_accuracy, attempts, last_played_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7)
		ON CONFLICT (user_id, node_id) DO UPDATE SET stars=EXCLUDED.stars, completed=EXCLUDED.completed,
		  best_accuracy=EXCLUDED.best_accuracy, attempts=EXCLUDED.attempts, last_played_at=EXCLUDED.last_played_at,
		  updated_at=now(), is_deleted=FALSE, deleted_at=NULL`,
		pid, in.NodeID, in.Stars, in.Completed, in.BestAccuracy, in.Attempts, in.LastPlayedAt)
	if err != nil {
		writeDBError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) recordQuestionStat(w http.ResponseWriter, r *http.Request, pid string) {
	var in struct {
		QuestionType int  `json:"question_type"`
		Correct      bool `json:"correct"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	c := 0
	if in.Correct {
		c = 1
	}
	_, err := s.DB.Exec(r.Context(), `
		INSERT INTO question_stats (user_id, question_type, attempts, correct) VALUES ($1,$2,1,$3)
		ON CONFLICT (user_id, question_type) DO UPDATE SET attempts=question_stats.attempts+1,
		  correct=question_stats.correct+$3, updated_at=now()`, pid, in.QuestionType, c)
	if err != nil {
		writeDBError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
