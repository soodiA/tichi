package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/soodia/tichi/backend/internal/httpx"
)

func (s *Server) adminListUnits(w http.ResponseWriter, r *http.Request) {
	u, err := s.listUnits(r.Context())
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, u)
}

func (s *Server) adminListNodes(w http.ResponseWriter, r *http.Request) {
	n, err := s.listNodes(r.Context())
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, n)
}

func (s *Server) adminCreateNode(w http.ResponseWriter, r *http.Request) {
	var n nodeRow
	if !httpx.Decode(w, r, &n) {
		return
	}
	if n.ID == "" || n.UnitID == "" || n.Type == "" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "id, unit_id and type are required")
		return
	}
	_, err := s.DB.Exec(r.Context(), `INSERT INTO nodes (id, unit_id, ord, type) VALUES ($1,$2,$3,$4)`, n.ID, n.UnitID, n.Ord, n.Type)
	if err != nil {
		writeDBError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, n)
}

// adminListQuestions supports ?node_id=, ?type=, ?with_audio=1 and ?limit=.
// Default order is (node_id, ord), which is what the flat editor view needs.
func (s *Server) adminListQuestions(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	where := []string{"NOT is_deleted"}
	args := []any{}
	add := func(cond string, v any) {
		args = append(args, v)
		where = append(where, strings.Replace(cond, "?", "$"+strconv.Itoa(len(args)), 1))
	}
	if v := q.Get("node_id"); v != "" {
		add("node_id = ?", v)
	}
	if v := q.Get("type"); v != "" {
		add("type = ?", v)
	}
	if q.Get("with_audio") == "1" {
		where = append(where, "question_audio_url IS NOT NULL")
	}
	if q.Get("missing_audio") == "1" {
		where = append(where, "(question_audio_url IS NULL OR question_audio_url = '')")
	}
	if v := strings.TrimSpace(q.Get("q")); v != "" {
		add("question_text ILIKE ? ESCAPE '\\'", "%"+escapeLike(v)+"%")
	}
	cond := strings.Join(where, " AND ")
	var total int
	if err := s.DB.QueryRow(r.Context(), `SELECT count(*) FROM questions WHERE `+cond, args...).Scan(&total); err != nil {
		serverError(w, err)
		return
	}
	w.Header().Set("X-Total-Count", strconv.Itoa(total))
	order := ` ORDER BY node_id, ord, id`
	if q.Get("order") == "ord" {
		order = ` ORDER BY ord, id`
	}
	sql := `SELECT ` + questionCols + ` FROM questions WHERE ` + cond + order
	if l, err := strconv.Atoi(q.Get("limit")); err == nil && l > 0 && l <= 10000 {
		sql += ` LIMIT ` + strconv.Itoa(l)
		if o, err := strconv.Atoi(q.Get("offset")); err == nil && o > 0 {
			sql += ` OFFSET ` + strconv.Itoa(o)
		}
	}
	rows, err := s.DB.Query(r.Context(), sql, args...)
	if err != nil {
		serverError(w, err)
		return
	}
	out, err := collectQuestions(rows)
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

type questionInput struct {
	ID               string          `json:"id"`
	NodeID           string          `json:"node_id"`
	Type             string          `json:"type"`
	QuestionText     string          `json:"question_text"`
	QuestionAudioURL *string         `json:"question_audio_url"`
	MediaLabel       *string         `json:"media_label"`
	Options          json.RawMessage `json:"options"`
	CorrectAnswer    string          `json:"correct_answer"`
	Ord              *int            `json:"ord"`
	SyllableCount    *int            `json:"syllable_count"`
}

func (in *questionInput) normalize() {
	if len(in.Options) == 0 || string(in.Options) == "null" {
		in.Options = json.RawMessage(`[]`)
	}
}

func (s *Server) adminCreateQuestion(w http.ResponseWriter, r *http.Request) {
	var in questionInput
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	if in.ID == "" || in.NodeID == "" || in.Type == "" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "id, node_id and type are required")
		return
	}
	ord := 0
	if in.Ord != nil {
		ord = *in.Ord
	}
	row := s.DB.QueryRow(r.Context(), `
		INSERT INTO questions (id, node_id, type, question_text, question_audio_url, media_label, options, correct_answer, ord, syllable_count)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
		        CASE WHEN $9::int > 0 THEN $9::int ELSE COALESCE((SELECT max(ord) FROM questions WHERE node_id=$2 AND NOT is_deleted),0)+1 END,
		        $10)
		RETURNING `+questionCols,
		in.ID, in.NodeID, in.Type, in.QuestionText, in.QuestionAudioURL, in.MediaLabel, in.Options, in.CorrectAnswer, ord, in.SyllableCount)
	q, err := scanQuestion(row)
	if err != nil {
		writeDBError(w, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, q)
}

// adminUpdateQuestion replaces the editable columns (full-replace, like the editor's save).
func (s *Server) adminUpdateQuestion(w http.ResponseWriter, r *http.Request) {
	var in questionInput
	if !httpx.Decode(w, r, &in) {
		return
	}
	in.normalize()
	if in.Type == "" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "type is required")
		return
	}
	row := s.DB.QueryRow(r.Context(), `
		UPDATE questions SET type=$2, question_text=$3, question_audio_url=$4, media_label=$5, options=$6,
		       correct_answer=$7, syllable_count=$8, ord=COALESCE($9, ord), updated_at=now()
		WHERE id=$1 AND NOT is_deleted RETURNING `+questionCols,
		r.PathValue("id"), in.Type, in.QuestionText, in.QuestionAudioURL, in.MediaLabel, in.Options, in.CorrectAnswer, in.SyllableCount, in.Ord)
	q, err := scanQuestion(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "question not found")
		return
	}
	if err != nil {
		writeDBError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, q)
}

func (s *Server) adminDeleteQuestion(w http.ResponseWriter, r *http.Request) {
	tag, err := s.DB.Exec(r.Context(),
		`UPDATE questions SET is_deleted=TRUE, deleted_at=now(), updated_at=now() WHERE id=$1 AND NOT is_deleted`, r.PathValue("id"))
	if err != nil {
		serverError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "question not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// adminSwapQuestions atomically swaps the ord of two questions.
func (s *Server) adminSwapQuestions(w http.ResponseWriter, r *http.Request) {
	a, b := r.PathValue("id"), r.PathValue("other")
	tag, err := s.DB.Exec(r.Context(), `
		WITH p AS (SELECT id, ord FROM questions WHERE id IN ($1,$2) AND NOT is_deleted)
		UPDATE questions q SET ord = (SELECT ord FROM p WHERE p.id <> q.id), updated_at=now()
		WHERE q.id IN (SELECT id FROM p) AND (SELECT count(*) FROM p) = 2`, a, b)
	if err != nil {
		serverError(w, err)
		return
	}
	if tag.RowsAffected() != 2 {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "both questions must exist")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// A "slot" is a question type, plus audio_picture_end (audio_picture rows whose text says
// "end"). Keep in sync with isAudioPictureEnd in the frontend (آخر / ختم).
func slotFilter(slot string) (string, []any) {
	const endLike = `(question_text ILIKE '%آخر%' OR question_text ILIKE '%ختم%')`
	switch slot {
	case "audio_picture_end":
		return `type='audio_picture' AND ` + endLike, nil
	case "audio_picture":
		return `type='audio_picture' AND NOT ` + endLike, nil
	default:
		return `type=$1`, []any{slot}
	}
}

func (s *Server) adminGetAudioSlot(w http.ResponseWriter, r *http.Request) {
	cond, args := slotFilter(r.PathValue("slot"))
	row := s.DB.QueryRow(r.Context(),
		`SELECT type, question_text, node_id, question_audio_url FROM questions WHERE NOT is_deleted AND `+cond+` ORDER BY id LIMIT 1`, args...)
	var out struct {
		Type             string  `json:"type"`
		QuestionText     string  `json:"question_text"`
		NodeID           string  `json:"node_id"`
		QuestionAudioURL *string `json:"question_audio_url"`
	}
	if err := row.Scan(&out.Type, &out.QuestionText, &out.NodeID, &out.QuestionAudioURL); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			httpx.JSON(w, http.StatusOK, nil)
			return
		}
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

// adminSetAudioSlot points every question of a slot at one shared prompt recording.
func (s *Server) adminSetAudioSlot(w http.ResponseWriter, r *http.Request) {
	var in struct {
		URL string `json:"url"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.URL == "" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "url is required")
		return
	}
	cond, args := slotFilter(r.PathValue("slot"))
	// $1 is the URL, so the slot's own arg (if any) is renumbered to $2.
	cond = strings.Replace(cond, "$1", "$2", 1)
	tag, err := s.DB.Exec(r.Context(),
		`UPDATE questions SET question_audio_url=$1, updated_at=now() WHERE NOT is_deleted AND `+cond, append([]any{in.URL}, args...)...)
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]int64{"updated": tag.RowsAffected()})
}

// adminPatchQuestion changes only the audio url and/or options (used by the per-question recorder).
func (s *Server) adminPatchQuestion(w http.ResponseWriter, r *http.Request) {
	var in struct {
		QuestionAudioURL *string         `json:"question_audio_url"`
		Options          json.RawMessage `json:"options"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	var opts any
	if len(in.Options) > 0 && string(in.Options) != "null" {
		opts = []byte(in.Options)
	}
	row := s.DB.QueryRow(r.Context(), `
		UPDATE questions SET question_audio_url=COALESCE($2, question_audio_url), options=COALESCE($3::jsonb, options), updated_at=now()
		WHERE id=$1 AND NOT is_deleted RETURNING `+questionCols, r.PathValue("id"), in.QuestionAudioURL, opts)
	q, err := scanQuestion(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "question not found")
		return
	}
	if err != nil {
		writeDBError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, q)
}

// adminMediaLabels lists the distinct single-word media labels (for the word recorder).
func (s *Server) adminMediaLabels(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `SELECT DISTINCT media_label FROM questions WHERE NOT is_deleted AND media_label IS NOT NULL AND media_label <> '' ORDER BY 1`)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var l string
		if err := rows.Scan(&l); err != nil {
			serverError(w, err)
			return
		}
		out = append(out, l)
	}
	httpx.JSON(w, http.StatusOK, out)
}

// adminSetLabelAudio points every question with this media_label at a recorded word clip.
func (s *Server) adminSetLabelAudio(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Label string `json:"label"`
		URL   string `json:"url"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.Label == "" || in.URL == "" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "label and url are required")
		return
	}
	tag, err := s.DB.Exec(r.Context(), `UPDATE questions SET question_audio_url=$2, updated_at=now() WHERE media_label=$1 AND NOT is_deleted`, in.Label, in.URL)
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]int64{"updated": tag.RowsAffected()})
}
