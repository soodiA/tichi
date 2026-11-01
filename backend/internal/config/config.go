// Package config reads runtime settings from the environment.
package config

import (
	"errors"
	"os"
)

type Config struct {
	DatabaseURL string
	ListenAddr  string
	AudioDir    string
	TokenSecret string
	AdminKey    string
	PublicURL   string
	CORSOrigins string
}

func Load() (Config, error) {
	c := Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		ListenAddr:  getenv("LISTEN_ADDR", "127.0.0.1:8080"),
		AudioDir:    getenv("AUDIO_DIR", "/data/audio"),
		TokenSecret: os.Getenv("TOKEN_SECRET"),
		AdminKey:    os.Getenv("ADMIN_KEY"),
		PublicURL:   getenv("PUBLIC_URL", "http://localhost:8080"),
		CORSOrigins: getenv("CORS_ORIGINS", ""),
	}
	switch {
	case c.DatabaseURL == "":
		return c, errors.New("DATABASE_URL is required")
	case len(c.TokenSecret) < 32:
		return c, errors.New("TOKEN_SECRET must be at least 32 characters")
	case len(c.AdminKey) < 8:
		return c, errors.New("ADMIN_KEY must be at least 8 characters")
	}
	return c, nil
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
