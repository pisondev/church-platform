// Package config reads runtime configuration from environment variables.
package config

import (
	"errors"
	"fmt"
	"strings"
)

// Supported values for APP_ENV.
const (
	EnvDevelopment = "development"
	EnvTest        = "test"
	EnvProduction  = "production"
)

const defaultOrigins = "http://localhost:3100,http://localhost:3101"

// Config holds every setting the API needs at startup.
type Config struct {
	Env              string
	HTTPAddr         string
	DatabaseURL      string
	AllowedOrigins   []string
	SuperAdminEmails []string
}

// Load builds a Config from getenv, applies defaults and validates the result.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		Env:              valueOr(getenv("APP_ENV"), EnvDevelopment),
		HTTPAddr:         valueOr(getenv("API_ADDR"), ":4000"),
		DatabaseURL:      strings.TrimSpace(getenv("DATABASE_URL")),
		AllowedOrigins:   splitList(valueOr(getenv("CORS_ALLOWED_ORIGINS"), defaultOrigins)),
		SuperAdminEmails: splitList(strings.ToLower(getenv("SUPER_ADMIN_EMAILS"))),
	}

	var problems []string
	switch cfg.Env {
	case EnvDevelopment, EnvTest, EnvProduction:
	default:
		problems = append(problems, fmt.Sprintf("APP_ENV %q must be development, test or production", cfg.Env))
	}
	if cfg.DatabaseURL == "" {
		problems = append(problems, "DATABASE_URL is required")
	}
	if len(problems) > 0 {
		return Config{}, errors.New("invalid configuration: " + strings.Join(problems, "; "))
	}
	return cfg, nil
}

func valueOr(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return strings.TrimSpace(value)
}

// splitList parses a comma-separated value, dropping blanks.
func splitList(value string) []string {
	var items []string
	for _, item := range strings.Split(value, ",") {
		if item = strings.TrimSpace(item); item != "" {
			items = append(items, item)
		}
	}
	return items
}
