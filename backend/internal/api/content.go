package api

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5"

	"github.com/soodia/tichi/backend/internal/httpx"
)

type unitRow struct {
	ID     string `json:"id"`
	Letter string `json:"letter"`
	Ord    int    `json:"ord"`
	Color  string `json:"color"`
}

type nodeRow struct {
	ID     string `json:"id"`
	UnitID string `json:"unit_id"`
	Ord    int    `json:"ord"`
	Type   string `json:"type"`
}

// questionRow keeps the snake_case shape the frontend used with PostgREST.
type questionRow struct {
	ID               string          `json:"id"`
	NodeID           string          `json:"node_id"`
	Type             string          `json:"type"`
	QuestionText     string          `json:"question_text"`
	QuestionAudioURL *string         `json:"question_audio_url"`
	MediaLabel       *string         `json:"media_label"`
	Options          json.RawMessage `json:"options"`
	CorrectAnswer    string          `json:"correct_answer"`
	Ord              int             `json:"ord"`
	SyllableCount    *int            `json:"syllable_count"`
}

const questionCols = `id, node_id, type, question_text, question_audio_url, media_label, options, correct_answer, ord, syllable_count`

func scanQuestion(row pgx.Row) (questionRow, error) {
	var q questionRow
	err := row.Scan(&q.ID, &q.NodeID, &q.Type, &q.QuestionText, &q.QuestionAudioURL, &q.MediaLabel,
		&q.Options, &q.CorrectAnswer, &q.Ord, &q.SyllableCount)
	return q, err
}

func (s *Server) listUnits(ctx context.Context) ([]unitRow, error) {
	rows, err := s.DB.Query(ctx, `SELECT id, letter, ord, color FROM units WHERE NOT is_deleted ORDER BY ord, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []unitRow{}
	for rows.Next() {
		var u unitRow
		if err := rows.Scan(&u.ID, &u.Letter, &u.Ord, &u.Color); err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

func (s *Server) listNodes(ctx context.Context) ([]nodeRow, error) {
	rows, err := s.DB.Query(ctx, `SELECT id, unit_id, ord, type FROM nodes WHERE NOT is_deleted ORDER BY ord, id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []nodeRow{}
	for rows.Next() {
		var n nodeRow
		if err := rows.Scan(&n.ID, &n.UnitID, &n.Ord, &n.Type); err != nil {
			return nil, err
		}
		out = append(out, n)
	}
	return out, rows.Err()
}

func collectQuestions(rows pgx.Rows) ([]questionRow, error) {
	defer rows.Close()
	out := []questionRow{}
	for rows.Next() {
		q, err := scanQuestion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

// getCurriculum returns everything the lesson path needs in one response (no 1000-row paging).
func (s *Server) getCurriculum(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	units, err := s.listUnits(ctx)
	if err != nil {
		serverError(w, err)
		return
	}
	nodes, err := s.listNodes(ctx)
	if err != nil {
		serverError(w, err)
		return
	}
	rows, err := s.DB.Query(ctx, `SELECT `+questionCols+` FROM questions WHERE NOT is_deleted ORDER BY ord, id`)
	if err != nil {
		serverError(w, err)
		return
	}
	qs, err := collectQuestions(rows)
	if err != nil {
		serverError(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"units": units, "nodes": nodes, "questions": qs})
}
