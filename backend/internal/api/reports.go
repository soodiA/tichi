package api

import (
	"encoding/json"
	"net/http"
	"time"


	"github.com/soodia/tichi/backend/internal/httpx"
)

func clip(s *string, n int) *string {
	if s == nil {
		return nil
	}
	r := []rune(*s)
	if len(r) > n {
		v := string(r[:n])
		return &v
	}
	return s
}

// submitReport is public (kids report broken questions). Fields are length-capped; there is no
// rate limit, so it does NOT stop someone from flooding the table.
func (s *Server) submitReport(w http.ResponseWriter, r *http.Request) {
	var in struct {
		QuestionID       string          `json:"question_id"`
		NodeID           *string         `json:"node_id"`
		QuestionType     *string         `json:"question_type"`
		Snapshot         json.RawMessage `json:"snapshot"`
		Description      *string         `json:"description"`
		ReporterUsername *string         `json:"reporter_username"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.QuestionID == "" || len(in.QuestionID) > 200 {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "question_id is required")
		return
	}
	if len(in.Snapshot) > 20000 || (len(in.Snapshot) > 0 && !json.Valid(in.Snapshot)) {
		in.Snapshot = nil
	}
	var snap any
	if len(in.Snapshot) > 0 && string(in.Snapshot) != "null" {
		snap = []byte(in.Snapshot)
	}
	_, err := s.DB.Exec(r.Context(), `
		INSERT INTO question_reports (question_id, node_id, question_type, question_snapshot, description, reporter_username)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		in.QuestionID, clip(in.NodeID, 200), clip(in.QuestionType, 100), snap, clip(in.Description, 1000), clip(in.ReporterUsername, 100))
	if err != nil {
		serverError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type reportRow struct {
	ID               string          `json:"id"`
	QuestionID       string          `json:"question_id"`
	NodeID           *string         `json:"node_id"`
	QuestionType     *string         `json:"question_type"`
	QuestionSnapshot json.RawMessage `json:"question_snapshot"`
	Description      *string         `json:"description"`
	ReporterUsername *string         `json:"reporter_username"`
	Status           string          `json:"status"`
	CreatedAt        time.Time       `json:"created_at"`
}

func (s *Server) adminListReports(w http.ResponseWriter, r *http.Request) {
	rows, err := s.DB.Query(r.Context(), `
		SELECT id::text, question_id, node_id, question_type, question_snapshot, description, reporter_username, status, created_at
		FROM question_reports WHERE NOT is_deleted ORDER BY created_at DESC LIMIT 500`)
	if err != nil {
		serverError(w, err)
		return
	}
	defer rows.Close()
	out := []reportRow{}
	for rows.Next() {
		var x reportRow
		if err := rows.Scan(&x.ID, &x.QuestionID, &x.NodeID, &x.QuestionType, &x.QuestionSnapshot, &x.Description, &x.ReporterUsername, &x.Status, &x.CreatedAt); err != nil {
			serverError(w, err)
			return
		}
		out = append(out, x)
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (s *Server) adminSetReportStatus(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Status string `json:"status"`
	}
	if !httpx.Decode(w, r, &in) {
		return
	}
	if in.Status != "open" && in.Status != "resolved" {
		httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "status must be open or resolved")
		return
	}
	tag, err := s.DB.Exec(r.Context(), `UPDATE question_reports SET status=$2, updated_at=now() WHERE id::text=$1 AND NOT is_deleted`, r.PathValue("id"), in.Status)
	if err != nil {
		serverError(w, err)
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "report not found")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

