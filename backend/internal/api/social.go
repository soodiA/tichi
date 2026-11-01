package api

import (
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/soodia/tichi/backend/internal/httpx"
)

type publicProfile struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	Username   string  `json:"username"`
	AvatarURL  *string `json:"avatar_url"`
	Diamonds   int     `json:"diamonds"`
	StreakDays int     `json:"streak_days"`
	TotalScore int     `json:"total_score"`
}

var likeEscaper = strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)

// listPublicProfiles: ?ids=a,b,c returns those cards; ?q= is a username substring search;
// no params returns everyone (capped), which the leaderboard and suggestions use.
func (s *Server) listPublicProfiles(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var rows pgx.Rows
	var err error
	const cols = `SELECT id::text, name, username, avatar_url, diamonds, streak_days, total_score FROM profiles WHERE NOT is_deleted`
	if ids := q.Get("ids"); ids != "" {
		list := strings.Split(ids, ",")
		if len(list) > 500 {
			httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "too many ids")
			return
		}
		rows, err = s.DB.Query(r.Context(), cols+` AND id::text = ANY($1) ORDER BY username`, list)
	} else {
		term := likeEscaper.Replace(strings.ToLower(strings.TrimSpace(q.Get("q"))))
		rows, err = s.DB.Query(r.Context(), cols+` AND lower(username) LIKE $1 ESCAPE '\' ORDER BY username LIMIT 1000`, "%"+term+"%")
	}
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()
	out := []publicProfile{}
	for rows.Next() {
		var p publicProfile
		if err := rows.Scan(&p.ID, &p.Name, &p.Username, &p.AvatarURL, &p.Diamonds, &p.StreakDays, &p.TotalScore); err != nil {
			serverError(w, err)
			return
		}
		out = append(out, p)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (s *Server) myFriendIDs(w http.ResponseWriter, r *http.Request, pid string) {
	s.idList(w, r, `SELECT friend_id::text FROM friendships WHERE user_id=$1 AND NOT is_deleted ORDER BY created_at`, pid)
}

// friendsOfFriends: ids my friends are friends with (may include me or my friends; client filters).
func (s *Server) friendsOfFriends(w http.ResponseWriter, r *http.Request, pid string) {
	s.idList(w, r, `
		SELECT DISTINCT f2.friend_id::text FROM friendships f1
		JOIN friendships f2 ON f2.user_id = f1.friend_id AND NOT f2.is_deleted
		WHERE f1.user_id=$1 AND NOT f1.is_deleted AND f2.friend_id <> $1`, pid)
}

func (s *Server) idList(w http.ResponseWriter, r *http.Request, sql string, args ...any) {
	rows, err := s.DB.Query(r.Context(), sql, args...)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			serverError(w, err)
			return
		}
		ids = append(ids, id)
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"ids": ids})
}

func (s *Server) addFriend(w http.ResponseWriter, r *http.Request, pid string) {
	var in struct {
		FriendID string `json:"friend_id"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.FriendID == pid {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "cannot friend yourself")
		return
	}
	// the friend must be a live profile; a bad uuid string is a 422, not a 500
	var exists bool
	if err := s.DB.QueryRow(r.Context(), `SELECT EXISTS(SELECT 1 FROM profiles WHERE id::text=$1 AND NOT is_deleted)`, in.FriendID).Scan(&exists); err != nil {
		serverError(w, err)
		return
	}
	if !exists {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "friend not found")
		return
	}
	_, err := s.DB.Exec(r.Context(), `
		INSERT INTO friendships (user_id, friend_id) VALUES ($1,$2)
		ON CONFLICT (user_id, friend_id) DO UPDATE SET is_deleted=FALSE, deleted_at=NULL`, pid, in.FriendID)
	if err != nil {
		writeDBError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
