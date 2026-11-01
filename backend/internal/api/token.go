package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
)

const tokenTTL = 30 * 24 * time.Hour

type tokenClaims struct {
	PID string `json:"pid"`
	Exp int64  `json:"exp"`
}

var b64 = base64.RawURLEncoding

func (s *Server) signToken(pid string) string {
	payload, _ := json.Marshal(tokenClaims{PID: pid, Exp: time.Now().Add(tokenTTL).Unix()})
	p := b64.EncodeToString(payload)
	return p + "." + b64.EncodeToString(s.mac(p))
}

func (s *Server) mac(p string) []byte {
	m := hmac.New(sha256.New, []byte(s.Cfg.TokenSecret))
	m.Write([]byte(p))
	return m.Sum(nil)
}

func (s *Server) parseToken(tok string) (string, error) {
	p, sig, ok := strings.Cut(tok, ".")
	if !ok {
		return "", errors.New("malformed token")
	}
	want, err := b64.DecodeString(sig)
	if err != nil || !hmac.Equal(want, s.mac(p)) {
		return "", errors.New("bad signature")
	}
	raw, err := b64.DecodeString(p)
	if err != nil {
		return "", errors.New("bad payload")
	}
	var c tokenClaims
	if err := json.Unmarshal(raw, &c); err != nil || c.PID == "" {
		return "", errors.New("bad claims")
	}
	if time.Now().Unix() > c.Exp {
		return "", errors.New("expired")
	}
	return c.PID, nil
}

type ctxKey struct{}

// authed resolves the Bearer token to a profile id and passes it to the handler.
func (s *Server) authed(next func(w http.ResponseWriter, r *http.Request, pid string)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		tok, ok := strings.CutPrefix(h, "Bearer ")
		if !ok {
			unauthorized(w)
			return
		}
		pid, err := s.parseToken(tok)
		if err != nil {
			unauthorized(w)
			return
		}
		next(w, r, pid)
	}
}
