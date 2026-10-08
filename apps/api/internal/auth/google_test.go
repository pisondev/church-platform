package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

// fakeGoogle serves the token and userinfo endpoints.
func fakeGoogle(t *testing.T, tokenStatus int, userinfo map[string]any) (*Google, *url.Values) {
	t.Helper()
	received := &url.Values{}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /token", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseForm(); err != nil {
			t.Errorf("parse token form: %v", err)
		}
		*received = r.PostForm
		if tokenStatus != http.StatusOK {
			http.Error(w, `{"error":"invalid_grant"}`, tokenStatus)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"access_token": "access-123"})
	})
	mux.HandleFunc("GET /userinfo", func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer access-123" {
			http.Error(w, "bad token", http.StatusUnauthorized)
			return
		}
		_ = json.NewEncoder(w).Encode(userinfo)
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)

	google := NewGoogle("client-id", "client-secret", "http://localhost:4000/api/v1/auth/google/callback")
	google.TokenEndpoint = server.URL + "/token"
	google.UserInfoEndpoint = server.URL + "/userinfo"
	google.HTTP = server.Client()
	return google, received
}

func TestGoogleAuthURL(t *testing.T) {
	google := NewGoogle("client-id", "client-secret", "http://localhost:4000/callback")

	parsed, err := url.Parse(google.AuthURL("state-1", "challenge-1"))
	if err != nil {
		t.Fatalf("parse auth url: %v", err)
	}
	if got := parsed.Scheme + "://" + parsed.Host + parsed.Path; got != "https://accounts.google.com/o/oauth2/v2/auth" {
		t.Errorf("endpoint = %s", got)
	}

	want := map[string]string{
		"client_id":             "client-id",
		"redirect_uri":          "http://localhost:4000/callback",
		"response_type":         "code",
		"scope":                 "openid email profile",
		"state":                 "state-1",
		"code_challenge":        "challenge-1",
		"code_challenge_method": "S256",
	}
	for key, value := range want {
		if got := parsed.Query().Get(key); got != value {
			t.Errorf("%s = %q, want %q", key, got, value)
		}
	}
	if strings.Contains(parsed.RawQuery, "client-secret") {
		t.Error("the client secret leaked into the browser URL")
	}
}

func TestGoogleExchange(t *testing.T) {
	google, received := fakeGoogle(t, http.StatusOK, map[string]any{
		"sub":            "google-sub-1",
		"email":          " Admin@Example.com ",
		"email_verified": true,
		"name":           "Admin Person",
		"picture":        "https://example.com/a.png",
	})

	identity, err := google.Exchange(context.Background(), "code-1", "verifier-1")
	if err != nil {
		t.Fatalf("Exchange: %v", err)
	}

	want := Identity{
		Subject:       "google-sub-1",
		Email:         "admin@example.com",
		EmailVerified: true,
		Name:          "Admin Person",
		Picture:       "https://example.com/a.png",
	}
	if identity != want {
		t.Errorf("identity = %+v, want %+v", identity, want)
	}

	sent := map[string]string{
		"grant_type":    "authorization_code",
		"code":          "code-1",
		"code_verifier": "verifier-1",
		"client_id":     "client-id",
		"client_secret": "client-secret",
		"redirect_uri":  "http://localhost:4000/api/v1/auth/google/callback",
	}
	for key, value := range sent {
		if got := received.Get(key); got != value {
			t.Errorf("token request %s = %q, want %q", key, got, value)
		}
	}
}

func TestGoogleExchangeFailures(t *testing.T) {
	t.Run("token endpoint rejects the code", func(t *testing.T) {
		google, _ := fakeGoogle(t, http.StatusBadRequest, nil)

		_, err := google.Exchange(context.Background(), "bad", "verifier")
		if err == nil || !strings.Contains(err.Error(), "token exchange") {
			t.Errorf("err = %v, want a token exchange error", err)
		}
	})

	t.Run("userinfo has no subject", func(t *testing.T) {
		google, _ := fakeGoogle(t, http.StatusOK, map[string]any{"email": "a@example.com"})

		_, err := google.Exchange(context.Background(), "code", "verifier")
		if err == nil || !strings.Contains(err.Error(), "no subject") {
			t.Errorf("err = %v, want a missing subject error", err)
		}
	})
}
