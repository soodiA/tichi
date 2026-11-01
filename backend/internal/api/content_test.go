package api

import (
	"net/http"
	"testing"
)

func TestCurriculumAndAdminContent(t *testing.T) {
	s, h := newTestServer(t)
	seedContent(t, s)

	var cur struct {
		Units     []unitRow     `json:"units"`
		Nodes     []nodeRow     `json:"nodes"`
		Questions []questionRow `json:"questions"`
	}
	if rec := call(t, h, "GET", "/api/v1/curriculum", nil, nil, &cur); rec.Code != 200 {
		t.Fatalf("curriculum: %d %s", rec.Code, rec.Body)
	}
	if len(cur.Units) != 2 || cur.Units[0].ID != "unit-a" {
		t.Fatalf("units not ordered by ord: %+v", cur.Units)
	}
	if len(cur.Nodes) != 2 || len(cur.Questions) != 3 {
		t.Fatalf("counts: %d nodes %d questions", len(cur.Nodes), len(cur.Questions))
	}

	// admin endpoints reject a missing/wrong key
	if rec := call(t, h, "GET", "/api/v1/admin/questions", nil, nil, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("no key: want 403 got %d", rec.Code)
	}
	if rec := call(t, h, "GET", "/api/v1/admin/questions", nil, map[string]string{"X-Admin-Key": "nope"}, nil); rec.Code != http.StatusForbidden {
		t.Fatalf("bad key: want 403 got %d", rec.Code)
	}

	// create: ord defaults to next in node
	var created questionRow
	rec := call(t, h, "POST", "/api/v1/admin/questions", map[string]any{
		"id": "q-new", "node_id": "node-a-1", "type": "text_choice", "question_text": "t",
		"options": []map[string]string{{"id": "a", "text": "x"}}, "correct_answer": "a",
	}, adminHdr, &created)
	if rec.Code != 201 || created.Ord != 4 {
		t.Fatalf("create: %d ord=%d %s", rec.Code, created.Ord, rec.Body)
	}
	// duplicate id -> 409, unknown node -> 422
	if rec := call(t, h, "POST", "/api/v1/admin/questions", map[string]any{"id": "q-new", "node_id": "node-a-1", "type": "x"}, adminHdr, nil); rec.Code != 409 {
		t.Fatalf("dup: %d", rec.Code)
	}
	if rec := call(t, h, "POST", "/api/v1/admin/questions", map[string]any{"id": "q-bad", "node_id": "nope", "type": "x"}, adminHdr, nil); rec.Code != 422 {
		t.Fatalf("bad node: %d", rec.Code)
	}

	// update
	var upd questionRow
	rec = call(t, h, "PUT", "/api/v1/admin/questions/q-new", map[string]any{"type": "text_choice", "question_text": "changed", "options": []any{}, "correct_answer": "b"}, adminHdr, &upd)
	if rec.Code != 200 || upd.QuestionText != "changed" || upd.Ord != 4 {
		t.Fatalf("update: %d %+v", rec.Code, upd)
	}
	if rec := call(t, h, "PUT", "/api/v1/admin/questions/missing", map[string]any{"type": "x"}, adminHdr, nil); rec.Code != 404 {
		t.Fatalf("update missing: %d", rec.Code)
	}

	// swap q1 <-> q3 (ords 1 and 3)
	if rec := call(t, h, "POST", "/api/v1/admin/questions/q1/swap/q3", nil, adminHdr, nil); rec.Code != 204 {
		t.Fatalf("swap: %d %s", rec.Code, rec.Body)
	}
	var list []questionRow
	call(t, h, "GET", "/api/v1/admin/questions?node_id=node-a-1", nil, adminHdr, &list)
	if len(list) != 4 || list[0].ID != "q3" || list[2].ID != "q1" {
		t.Fatalf("order after swap: %+v", list)
	}
	if rec := call(t, h, "POST", "/api/v1/admin/questions/q1/swap/ghost", nil, adminHdr, nil); rec.Code != 404 {
		t.Fatalf("swap ghost: %d", rec.Code)
	}

	// soft delete hides from curriculum and keeps the row
	if rec := call(t, h, "DELETE", "/api/v1/admin/questions/q-new", nil, adminHdr, nil); rec.Code != 204 {
		t.Fatalf("delete: %d", rec.Code)
	}
	if rec := call(t, h, "DELETE", "/api/v1/admin/questions/q-new", nil, adminHdr, nil); rec.Code != 404 {
		t.Fatalf("delete twice: %d", rec.Code)
	}
	var n int
	if err := s.DB.QueryRow(t.Context(), `SELECT count(*) FROM questions WHERE id='q-new' AND is_deleted AND deleted_at IS NOT NULL`).Scan(&n); err != nil || n != 1 {
		t.Fatalf("soft delete columns not both set: n=%d err=%v", n, err)
	}

	// nodes: add stage
	if rec := call(t, h, "POST", "/api/v1/admin/nodes", map[string]any{"id": "node-a-2", "unit_id": "unit-a", "ord": 2, "type": "lesson"}, adminHdr, nil); rec.Code != 201 {
		t.Fatalf("node: %d %s", rec.Code, rec.Body)
	}
	if rec := call(t, h, "POST", "/api/v1/admin/nodes", map[string]any{"id": "node-x", "unit_id": "nope", "ord": 1, "type": "lesson"}, adminHdr, nil); rec.Code != 422 {
		t.Fatalf("node bad unit: %d", rec.Code)
	}
	if rec := call(t, h, "POST", "/api/v1/admin/nodes", map[string]any{"id": "node-y", "unit_id": "unit-a", "ord": 3, "type": "weird"}, adminHdr, nil); rec.Code != 422 {
		t.Fatalf("node bad type: %d", rec.Code)
	}
}

func TestAudioSlots(t *testing.T) {
	s, h := newTestServer(t)
	seedContent(t, s)

	var ex struct {
		QuestionText string `json:"question_text"`
	}
	call(t, h, "GET", "/api/v1/admin/audio-slots/audio_picture", nil, adminHdr, &ex)
	if ex.QuestionText != "کدام یکی با ا شروع میشه؟" {
		t.Fatalf("start slot example: %q", ex.QuestionText)
	}
	call(t, h, "GET", "/api/v1/admin/audio-slots/audio_picture_end", nil, adminHdr, &ex)
	if ex.QuestionText != "کدام یکی آخرش ا داره؟" {
		t.Fatalf("end slot example: %q", ex.QuestionText)
	}

	var res map[string]int64
	call(t, h, "PUT", "/api/v1/admin/audio-slots/audio_picture_end", map[string]string{"url": "http://x/end.a"}, adminHdr, &res)
	if res["updated"] != 1 {
		t.Fatalf("end slot updated %v rows, want 1", res)
	}
	call(t, h, "PUT", "/api/v1/admin/audio-slots/phoneme", map[string]string{"url": "http://x/ph.a"}, adminHdr, &res)
	if res["updated"] != 1 {
		t.Fatalf("phoneme slot updated %v rows, want 1", res)
	}
	var urls []string
	rows, _ := s.DB.Query(t.Context(), `SELECT coalesce(question_audio_url,'-') FROM questions ORDER BY id`)
	for rows.Next() {
		var u string
		rows.Scan(&u)
		urls = append(urls, u)
	}
	if len(urls) != 3 || urls[0] != "-" || urls[1] != "http://x/end.a" || urls[2] != "http://x/ph.a" {
		t.Fatalf("slot isolation broken: %v", urls)
	}
	if rec := call(t, h, "PUT", "/api/v1/admin/audio-slots/phoneme", map[string]string{}, adminHdr, nil); rec.Code != 422 {
		t.Fatalf("empty url: %d", rec.Code)
	}
}
