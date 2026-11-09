package api

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
)

func hashFor(salt, c string) string { return salt + ":" + strings.Repeat(c, 64) }

type session struct {
	Token    string      `json:"token"`
	Profile  profileDTO  `json:"profile"`
	Progress []progressDTO `json:"progress"`
}

func bearer(tok string) map[string]string { return map[string]string{"Authorization": "Bearer " + tok} }

func register(t *testing.T, h http.Handler, id, username, hash string) session {
	t.Helper()
	var s session
	rec := call(t, h, "POST", "/api/v1/auth/register", map[string]any{
		"id": id, "name": "Kid " + username, "username": username, "password_hash": hash,
	}, nil, &s)
	if rec.Code != 201 {
		t.Fatalf("register %s: %d %s", username, rec.Code, rec.Body)
	}
	return s
}

const (
	idA = "11111111-1111-4111-8111-111111111111"
	idB = "22222222-2222-4222-8222-222222222222"
)

func TestAccountsLoginProgressFriends(t *testing.T) {
	s, h := newTestServer(t)
	hA, hB := hashFor("saltA", "a"), hashFor("saltB", "b")
	a := register(t, h, idA, "Soodi", hA)
	b := register(t, h, idB, "bahar", hB)
	if a.Profile.ID != idA || a.Profile.Username != "soodi" {
		t.Fatalf("register should keep client id and lowercase username: %+v", a.Profile)
	}

	// the DB must hold bcrypt(hex), never the browser's hash
	var stored, salt string
	s.DB.QueryRow(t.Context(), `SELECT password_hash, password_salt FROM profiles WHERE id=$1`, idA).Scan(&stored, &salt)
	if !strings.HasPrefix(stored, "$2") || strings.Contains(stored, "aaaa") || salt != "saltA" {
		t.Fatalf("stored credential not bcrypt-wrapped: %q salt=%q", stored, salt)
	}

	// validation + duplicates (case-insensitive)
	if rec := call(t, h, "POST", "/api/v1/auth/register", map[string]any{"name": "x", "username": "SOODI", "password_hash": hashFor("s", "c")}, nil, nil); rec.Code != 409 {
		t.Fatalf("duplicate username: %d", rec.Code)
	}
	if rec := call(t, h, "POST", "/api/v1/auth/register", map[string]any{"name": "x", "username": "ok_name", "password_hash": "plain"}, nil, nil); rec.Code != 422 {
		t.Fatalf("bad hash format: %d", rec.Code)
	}

	// salt + login
	var sl map[string]string
	call(t, h, "GET", "/api/v1/auth/salt?username=SOODI", nil, nil, &sl)
	if sl["salt"] != "saltA" {
		t.Fatalf("salt: %v", sl)
	}
	if rec := call(t, h, "GET", "/api/v1/auth/salt?username=ghost", nil, nil, nil); rec.Code != 404 {
		t.Fatalf("salt ghost: %d", rec.Code)
	}
	var ls session
	if rec := call(t, h, "POST", "/api/v1/auth/login", map[string]any{"username": "soodi", "password_hash": hA}, nil, &ls); rec.Code != 200 || ls.Token == "" {
		t.Fatalf("login: %d %s", rec.Code, rec.Body)
	}
	if rec := call(t, h, "POST", "/api/v1/auth/login", map[string]any{"username": "soodi", "password_hash": hashFor("saltA", "f")}, nil, nil); rec.Code != 401 {
		t.Fatalf("wrong password: %d", rec.Code)
	}
	if rec := call(t, h, "POST", "/api/v1/auth/login", map[string]any{"username": "soodi", "password_hash": hB}, nil, nil); rec.Code != 401 {
		t.Fatalf("other account's hash: %d", rec.Code)
	}

	// token from id+hash (device that already holds credentials); wrong hash rejected
	var ts session
	if rec := call(t, h, "POST", "/api/v1/auth/token", map[string]any{"profile_id": idA, "password_hash": hA}, nil, &ts); rec.Code != 200 {
		t.Fatalf("token: %d %s", rec.Code, rec.Body)
	}
	if rec := call(t, h, "POST", "/api/v1/auth/token", map[string]any{"profile_id": idA, "password_hash": hB}, nil, nil); rec.Code != 401 {
		t.Fatalf("token wrong hash: %d", rec.Code)
	}

	if rec := call(t, h, "POST", "/api/v1/auth/token", map[string]any{"profile_id": "99999999-9999-4999-8999-999999999999", "password_hash": hA}, nil, nil); rec.Code != 404 {
		t.Fatalf("token unknown profile should be 404 (client then registers): %d", rec.Code)
	}

	// auth required / tampered tokens
	if rec := call(t, h, "GET", "/api/v1/me", nil, nil, nil); rec.Code != 401 {
		t.Fatalf("me without token: %d", rec.Code)
	}
	if rec := call(t, h, "GET", "/api/v1/me", nil, bearer(a.Token+"x"), nil); rec.Code != 401 {
		t.Fatalf("tampered token: %d", rec.Code)
	}

	// partial profile update only touches provided keys
	var up profileDTO
	rec := call(t, h, "PATCH", "/api/v1/me", map[string]any{"diamonds": 42, "total_score": 7}, bearer(a.Token), &up)
	if rec.Code != 200 || up.Diamonds != 42 || up.TotalScore != 7 || up.Name != "Kid Soodi" {
		t.Fatalf("patch: %d %+v", rec.Code, up)
	}
	if rec := call(t, h, "PATCH", "/api/v1/me", map[string]any{"name": " "}, bearer(a.Token), nil); rec.Code != 422 {
		t.Fatalf("empty name: %d", rec.Code)
	}

	// progress upsert is idempotent and scoped to the caller
	prog := map[string]any{"node_id": "node-a-1", "stars": 3, "completed": true, "best_accuracy": 100, "attempts": 1, "last_played_at": "2026-11-01T10:00:00Z"}
	for i := 0; i < 2; i++ {
		if rec := call(t, h, "PUT", "/api/v1/me/progress", prog, bearer(a.Token), nil); rec.Code != 204 {
			t.Fatalf("progress #%d: %d %s", i, rec.Code, rec.Body)
		}
	}
	var me session
	call(t, h, "GET", "/api/v1/me", nil, bearer(a.Token), &me)
	if len(me.Progress) != 1 || me.Progress[0].Stars != 3 {
		t.Fatalf("progress rows: %+v", me.Progress)
	}
	var meB session
	call(t, h, "GET", "/api/v1/me", nil, bearer(b.Token), &meB)
	if len(meB.Progress) != 0 {
		t.Fatalf("progress leaked to another account: %+v", meB.Progress)
	}

	// friends: add, idempotent, self + unknown rejected, friends-of-friends
	if rec := call(t, h, "POST", "/api/v1/me/friends", map[string]any{"friend_id": idB}, bearer(a.Token), nil); rec.Code != 204 {
		t.Fatalf("add friend: %d %s", rec.Code, rec.Body)
	}
	call(t, h, "POST", "/api/v1/me/friends", map[string]any{"friend_id": idB}, bearer(a.Token), nil)
	for _, bad := range []string{idA, "33333333-3333-4333-8333-333333333333", "not-a-uuid"} {
		if rec := call(t, h, "POST", "/api/v1/me/friends", map[string]any{"friend_id": bad}, bearer(a.Token), nil); rec.Code != 422 {
			t.Fatalf("bad friend %q: %d", bad, rec.Code)
		}
	}
	var ids map[string][]string
	call(t, h, "GET", "/api/v1/me/friends", nil, bearer(a.Token), &ids)
	if len(ids["ids"]) != 1 || ids["ids"][0] != idB {
		t.Fatalf("friend ids: %v", ids)
	}
	// B befriends C; A should see C as friend-of-friend
	c := register(t, h, "44444444-4444-4444-8444-444444444444", "chloe", hashFor("saltC", "c"))
	call(t, h, "POST", "/api/v1/me/friends", map[string]any{"friend_id": c.Profile.ID}, bearer(b.Token), nil)
	call(t, h, "GET", "/api/v1/me/friends-of-friends", nil, bearer(a.Token), &ids)
	if len(ids["ids"]) != 1 || ids["ids"][0] != c.Profile.ID {
		t.Fatalf("friends of friends: %v", ids)
	}

	// public profile cards never include credentials
	var cards []publicProfile
	rec = call(t, h, "GET", "/api/v1/profiles?q=so", nil, nil, &cards)
	if len(cards) != 1 || cards[0].Username != "soodi" || cards[0].Diamonds != 42 {
		t.Fatalf("search: %s", rec.Body)
	}
	if strings.Contains(rec.Body.String(), "hash") || strings.Contains(rec.Body.String(), "salt") {
		t.Fatalf("credentials leaked in public profiles: %s", rec.Body)
	}
	call(t, h, "GET", "/api/v1/profiles?ids="+idA+","+idB, nil, nil, &cards)
	if len(cards) != 2 {
		t.Fatalf("by ids: %+v", cards)
	}
	call(t, h, "GET", "/api/v1/profiles?q=%25", nil, nil, &cards) // literal % must not act as a wildcard
	if len(cards) != 0 {
		t.Fatalf("LIKE wildcard not escaped: %+v", cards)
	}

	// question stats accumulate
	for _, ok := range []bool{true, false, true} {
		if rec := call(t, h, "POST", "/api/v1/me/question-stats", map[string]any{"question_type": 3, "correct": ok}, bearer(a.Token), nil); rec.Code != 204 {
			t.Fatalf("stat: %d", rec.Code)
		}
	}
	var att, cor int
	s.DB.QueryRow(t.Context(), `SELECT attempts, correct FROM question_stats WHERE user_id=$1 AND question_type=3`, idA).Scan(&att, &cor)
	if att != 3 || cor != 2 {
		t.Fatalf("stats: %d/%d", cor, att)
	}
}

func TestLoginThrottle(t *testing.T) {
	_, h := newTestServer(t)
	register(t, h, "55555555-5555-4555-8555-555555555555", "throttled", hashFor("s", "a"))
	bad := map[string]any{"username": "throttled", "password_hash": hashFor("s", "f")}
	for i := 0; i < 8; i++ {
		if rec := call(t, h, "POST", "/api/v1/auth/login", bad, nil, nil); rec.Code != 401 {
			t.Fatalf("attempt %d: %d", i, rec.Code)
		}
	}
	if rec := call(t, h, "POST", "/api/v1/auth/login", bad, nil, nil); rec.Code != 429 {
		t.Fatalf("expected 429 after 8 failures, got %d", rec.Code)
	}
	// even the right password is refused while blocked
	if rec := call(t, h, "POST", "/api/v1/auth/login", map[string]any{"username": "throttled", "password_hash": hashFor("s", "a")}, nil, nil); rec.Code != 429 {
		t.Fatalf("blocked login with correct hash: %d", rec.Code)
	}
}

func TestReports(t *testing.T) {
	_, h := newTestServer(t)
	long := strings.Repeat("خ", 3000)
	rec := call(t, h, "POST", "/api/v1/reports", map[string]any{
		"question_id": "q1", "node_id": "n1", "question_type": "phoneme",
		"snapshot": map[string]any{"questionText": "سوال"}, "description": long, "reporter_username": "soodi",
	}, nil, nil)
	if rec.Code != 204 {
		t.Fatalf("submit: %d %s", rec.Code, rec.Body)
	}
	if rec := call(t, h, "POST", "/api/v1/reports", map[string]any{"description": "no id"}, nil, nil); rec.Code != 422 {
		t.Fatalf("missing question_id: %d", rec.Code)
	}
	if rec := call(t, h, "GET", "/api/v1/admin/reports", nil, nil, nil); rec.Code != 403 {
		t.Fatalf("list without key: %d", rec.Code)
	}
	var list []reportRow
	call(t, h, "GET", "/api/v1/admin/reports", nil, adminHdr, &list)
	if len(list) != 1 || len([]rune(*list[0].Description)) != 1000 || list[0].Status != "open" {
		t.Fatalf("list: %+v", list)
	}
	if !strings.Contains(string(list[0].QuestionSnapshot), "سوال") {
		t.Fatalf("snapshot lost: %s", list[0].QuestionSnapshot)
	}
	path := fmt.Sprintf("/api/v1/admin/reports/%s/status", list[0].ID)
	if rec := call(t, h, "PUT", path, map[string]any{"status": "resolved"}, adminHdr, nil); rec.Code != 204 {
		t.Fatalf("resolve: %d", rec.Code)
	}
	if rec := call(t, h, "PUT", path, map[string]any{"status": "bogus"}, adminHdr, nil); rec.Code != 422 {
		t.Fatalf("bad status: %d", rec.Code)
	}
	if rec := call(t, h, "PUT", "/api/v1/admin/reports/not-there/status", map[string]any{"status": "open"}, adminHdr, nil); rec.Code != 404 {
		t.Fatalf("missing report: %d", rec.Code)
	}
	call(t, h, "GET", "/api/v1/admin/reports", nil, adminHdr, &list)
	if list[0].Status != "resolved" {
		t.Fatalf("status not saved: %+v", list[0])
	}
}

// A device that was offline pushes its old profile on startup; it must not undo what another device earned.
func TestStaleProfilePushDoesNotRegress(t *testing.T) {
	_, h := newTestServer(t)
	a := register(t, h, idA, "stale", hashFor("saltS", "c"))
	tok := bearer(a.Token)
	patch := func(body map[string]any) profileDTO {
		t.Helper()
		var p profileDTO
		if rec := call(t, h, "PATCH", "/api/v1/me", body, tok, &p); rec.Code != 200 {
			t.Fatalf("patch: %d %s", rec.Code, rec.Body)
		}
		return p
	}
	// laptop: two lessons on Nov 6, a gap, then Nov 8
	patch(map[string]any{"diamonds": 35, "total_score": 35, "streak_days": 1, "last_active_date": "2026-11-06"})
	p := patch(map[string]any{"diamonds": 50, "total_score": 50, "streak_days": 1, "last_active_date": "2026-11-08"})
	if p.StreakDays != 1 || p.TotalScore != 50 {
		t.Fatalf("setup: %+v", p)
	}
	// phone, last used Nov 6, opens on Nov 9 and pushes its stale copy together with a rename
	nm := "Renamed"
	p = patch(map[string]any{"name": nm, "diamonds": 35, "total_score": 35, "streak_days": 1, "last_active_date": "2026-11-06"})
	if p.Diamonds != 50 || p.TotalScore != 50 || p.StreakDays != 1 || p.LastActiveDate == nil || *p.LastActiveDate != "2026-11-08" {
		t.Fatalf("stale push regressed the game state: diamonds=%d score=%d streak=%d last=%v", p.Diamonds, p.TotalScore, p.StreakDays, p.LastActiveDate)
	}
	if p.Name != nm {
		t.Fatalf("name should still apply from a stale device, got %q", p.Name)
	}
	// legitimate moves still work: earning, spending coins (score unchanged), and resetting the streak the same day
	p = patch(map[string]any{"diamonds": 65, "total_score": 65, "streak_days": 2, "last_active_date": "2026-11-09"})
	if p.Diamonds != 65 || p.StreakDays != 2 {
		t.Fatalf("earning should apply: %+v", p)
	}
	p = patch(map[string]any{"diamonds": 25, "total_score": 65, "streak_days": 2, "last_active_date": "2026-11-09"})
	if p.Diamonds != 25 {
		t.Fatalf("spending coins must apply: %+v", p)
	}
	p = patch(map[string]any{"streak_days": 0, "last_active_date": "2026-11-09"})
	if p.StreakDays != 0 {
		t.Fatalf("same-day streak reset must apply: %+v", p)
	}
}
