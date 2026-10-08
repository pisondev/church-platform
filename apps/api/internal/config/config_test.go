package config

import (
	"reflect"
	"strings"
	"testing"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func TestLoadAppliesDefaults(t *testing.T) {
	cfg, err := Load(env(map[string]string{"DATABASE_URL": "postgres://localhost/db"}))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	want := Config{
		Env:            EnvDevelopment,
		HTTPAddr:       ":4000",
		DatabaseURL:    "postgres://localhost/db",
		WebURL:         "http://localhost:3100",
		AdminURL:       "http://localhost:3101",
		AllowedOrigins: []string{"http://localhost:3100", "http://localhost:3101"},
	}
	if !reflect.DeepEqual(cfg, want) {
		t.Errorf("config = %+v, want %+v", cfg, want)
	}
	if cfg.Google.Configured() {
		t.Error("Google sign-in reported as configured without any value")
	}
}

func TestLoadReadsOverrides(t *testing.T) {
	cfg, err := Load(env(map[string]string{
		"APP_ENV":                    "production",
		"API_ADDR":                   ":9000",
		"DATABASE_URL":               " postgres://db/prod ",
		"WEB_URL":                    "https://example.org/",
		"ADMIN_URL":                  "https://admin.example.org",
		"COOKIE_DOMAIN":              ".example.org",
		"SUPER_ADMIN_EMAILS":         "Owner@Example.com, second@example.com",
		"GOOGLE_OAUTH_CLIENT_ID":     "id",
		"GOOGLE_OAUTH_CLIENT_SECRET": "secret",
		"GOOGLE_OAUTH_REDIRECT_URL":  "https://api.example.org/api/v1/auth/google/callback",
	}))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	want := Config{
		Env:              EnvProduction,
		HTTPAddr:         ":9000",
		DatabaseURL:      "postgres://db/prod",
		WebURL:           "https://example.org",
		AdminURL:         "https://admin.example.org",
		AllowedOrigins:   []string{"https://example.org", "https://admin.example.org"},
		CookieDomain:     ".example.org",
		SuperAdminEmails: []string{"owner@example.com", "second@example.com"},
		Google: GoogleOAuth{
			ClientID:     "id",
			ClientSecret: "secret",
			RedirectURL:  "https://api.example.org/api/v1/auth/google/callback",
		},
	}
	if !reflect.DeepEqual(cfg, want) {
		t.Errorf("config = %+v, want %+v", cfg, want)
	}
	if !cfg.Google.Configured() {
		t.Error("Google sign-in not reported as configured")
	}
}

func TestLoadReadsExplicitOrigins(t *testing.T) {
	cfg, err := Load(env(map[string]string{
		"DATABASE_URL":         "postgres://localhost/db",
		"CORS_ALLOWED_ORIGINS": "https://a.example, https://b.example,,",
	}))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if want := []string{"https://a.example", "https://b.example"}; !reflect.DeepEqual(cfg.AllowedOrigins, want) {
		t.Errorf("AllowedOrigins = %v, want %v", cfg.AllowedOrigins, want)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	tests := []struct {
		name      string
		values    map[string]string
		fragments []string
	}{
		{
			name:      "unknown environment and no database",
			values:    map[string]string{"APP_ENV": "staging"},
			fragments: []string{"APP_ENV", "DATABASE_URL is required"},
		},
		{
			name: "half-configured sign-in",
			values: map[string]string{
				"DATABASE_URL":           "postgres://localhost/db",
				"GOOGLE_OAUTH_CLIENT_ID": "id",
			},
			fragments: []string{"must be set together"},
		},
		{
			name:      "production without sign-in",
			values:    map[string]string{"APP_ENV": "production", "DATABASE_URL": "postgres://localhost/db"},
			fragments: []string{"must be configured in production"},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Load(env(tt.values))
			if err == nil {
				t.Fatal("Load succeeded, want an error")
			}
			for _, fragment := range tt.fragments {
				if !strings.Contains(err.Error(), fragment) {
					t.Errorf("error %q does not mention %q", err, fragment)
				}
			}
		})
	}
}
