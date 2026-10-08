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
		AllowedOrigins: []string{"http://localhost:3100", "http://localhost:3101"},
	}
	if !reflect.DeepEqual(cfg, want) {
		t.Errorf("config = %+v, want %+v", cfg, want)
	}
}

func TestLoadReadsOverrides(t *testing.T) {
	cfg, err := Load(env(map[string]string{
		"APP_ENV":              "production",
		"API_ADDR":             ":9000",
		"DATABASE_URL":         " postgres://db/prod ",
		"CORS_ALLOWED_ORIGINS": "https://a.example, https://b.example,,",
		"SUPER_ADMIN_EMAILS":   "Owner@Example.com, second@example.com",
	}))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}

	want := Config{
		Env:              EnvProduction,
		HTTPAddr:         ":9000",
		DatabaseURL:      "postgres://db/prod",
		AllowedOrigins:   []string{"https://a.example", "https://b.example"},
		SuperAdminEmails: []string{"owner@example.com", "second@example.com"},
	}
	if !reflect.DeepEqual(cfg, want) {
		t.Errorf("config = %+v, want %+v", cfg, want)
	}
}

func TestLoadRejectsInvalidValues(t *testing.T) {
	_, err := Load(env(map[string]string{"APP_ENV": "staging"}))
	if err == nil {
		t.Fatal("Load succeeded, want an error")
	}
	for _, fragment := range []string{"APP_ENV", "DATABASE_URL is required"} {
		if !strings.Contains(err.Error(), fragment) {
			t.Errorf("error %q does not mention %q", err, fragment)
		}
	}
}
