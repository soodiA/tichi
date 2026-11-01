// Package httpx holds small JSON request/response helpers shared by handlers.
package httpx

import (
	"encoding/json"
	"errors"
	"net/http"
)

type ErrorBody struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func Error(w http.ResponseWriter, status int, code, msg string) {
	var b ErrorBody
	b.Error.Code, b.Error.Message = code, msg
	JSON(w, status, b)
}

// Decode reads a JSON body (max 1 MiB) and rejects unknown-shaped garbage with a 400.
func Decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		msg := "invalid JSON body"
		var mbe *http.MaxBytesError
		if errors.As(err, &mbe) {
			msg = "body too large"
		}
		Error(w, http.StatusBadRequest, "VALIDATION_ERROR", msg)
		return false
	}
	return true
}
