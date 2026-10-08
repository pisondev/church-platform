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

const (
	defaultWebURL   = "http://localhost:3100"
	defaultAdminURL = "http://localhost:3101"
)

// GoogleOAuth holds the OAuth client used for sign-in.
type GoogleOAuth struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

// Configured reports whether every value needed for sign-in is present.
func (g GoogleOAuth) Configured() bool {
	return g.ClientID != "" && g.ClientSecret != "" && g.RedirectURL != ""
}

func (g GoogleOAuth) partial() bool {
	return !g.Configured() && (g.ClientID != "" || g.ClientSecret != "")
}

// Config holds every setting the API needs at startup.
type Config struct {
	Env              string
	HTTPAddr         string
	DatabaseURL      string
	WebURL           string
	AdminURL         string
	AllowedOrigins   []string
	CookieDomain     string
	SuperAdminEmails []string
	Google           GoogleOAuth
}

// Load builds a Config from getenv, applies defaults and validates the result.
func Load(getenv func(string) string) (Config, error) {
	get := func(key string) string { return strings.TrimSpace(getenv(key)) }

	cfg := Config{
		Env:              valueOr(get("APP_ENV"), EnvDevelopment),
		HTTPAddr:         valueOr(get("API_ADDR"), ":4000"),
		DatabaseURL:      get("DATABASE_URL"),
		WebURL:           strings.TrimRight(valueOr(get("WEB_URL"), defaultWebURL), "/"),
		AdminURL:         strings.TrimRight(valueOr(get("ADMIN_URL"), defaultAdminURL), "/"),
		CookieDomain:     get("COOKIE_DOMAIN"),
		SuperAdminEmails: splitList(strings.ToLower(get("SUPER_ADMIN_EMAILS"))),
		Google: GoogleOAuth{
			ClientID:     get("GOOGLE_OAUTH_CLIENT_ID"),
			ClientSecret: get("GOOGLE_OAUTH_CLIENT_SECRET"),
			RedirectURL:  get("GOOGLE_OAUTH_REDIRECT_URL"),
		},
	}
	// The frontends are the only origins unless told otherwise.
	cfg.AllowedOrigins = splitList(valueOr(get("CORS_ALLOWED_ORIGINS"), cfg.WebURL+","+cfg.AdminURL))

	var problems []string
	switch cfg.Env {
	case EnvDevelopment, EnvTest, EnvProduction:
	default:
		problems = append(problems, fmt.Sprintf("APP_ENV %q must be development, test or production", cfg.Env))
	}
	if cfg.DatabaseURL == "" {
		problems = append(problems, "DATABASE_URL is required")
	}
	if cfg.Google.partial() {
		problems = append(problems, "GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET and GOOGLE_OAUTH_REDIRECT_URL must be set together")
	}
	if cfg.Env == EnvProduction && !cfg.Google.Configured() {
		problems = append(problems, "Google sign-in must be configured in production")
	}
	if len(problems) > 0 {
		return Config{}, errors.New("invalid configuration: " + strings.Join(problems, "; "))
	}
	return cfg, nil
}

func valueOr(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
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
