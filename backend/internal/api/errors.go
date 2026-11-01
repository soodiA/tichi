package api

import (
	"errors"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"

	"github.com/soodia/tichi/backend/internal/httpx"
)

func serverError(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	httpx.Error(w, http.StatusInternalServerError, "INTERNAL", "internal error")
}

// writeDBError maps well-known Postgres errors to API errors, else 500.
func writeDBError(w http.ResponseWriter, err error) {
	var pe *pgconn.PgError
	if errors.As(err, &pe) {
		switch pe.Code {
		case "23505":
			httpx.Error(w, http.StatusConflict, "DUPLICATE", "already exists")
			return
		case "23503":
			httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "referenced row does not exist")
			return
		case "23514":
			httpx.Error(w, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "invalid value")
			return
		}
	}
	serverError(w, err)
}
