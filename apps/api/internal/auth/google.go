package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Google implements Provider against the Google OAuth 2.0 and OpenID Connect endpoints.
type Google struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string

	// Endpoints, replaceable in tests.
	AuthEndpoint     string
	TokenEndpoint    string
	UserInfoEndpoint string

	HTTP *http.Client
}

// NewGoogle returns a provider that talks to the real Google endpoints.
func NewGoogle(clientID, clientSecret, redirectURL string) *Google {
	return &Google{
		ClientID:         clientID,
		ClientSecret:     clientSecret,
		RedirectURL:      redirectURL,
		AuthEndpoint:     "https://accounts.google.com/o/oauth2/v2/auth",
		TokenEndpoint:    "https://oauth2.googleapis.com/token",
		UserInfoEndpoint: "https://openidconnect.googleapis.com/v1/userinfo",
		HTTP:             &http.Client{Timeout: 10 * time.Second},
	}
}

// AuthURL is where the browser is sent to choose an account and consent.
func (g *Google) AuthURL(state, codeChallenge string) string {
	query := url.Values{
		"client_id":             {g.ClientID},
		"redirect_uri":          {g.RedirectURL},
		"response_type":         {"code"},
		"scope":                 {"openid email profile"},
		"state":                 {state},
		"code_challenge":        {codeChallenge},
		"code_challenge_method": {"S256"},
		"prompt":                {"select_account"},
	}
	return g.AuthEndpoint + "?" + query.Encode()
}

// Exchange trades the authorization code for the identity of the signed-in user.
// The identity is read from the userinfo endpoint with the access token that Google
// returned over TLS, so no ID token signature has to be verified here.
func (g *Google) Exchange(ctx context.Context, code, codeVerifier string) (Identity, error) {
	form := url.Values{
		"grant_type":    {"authorization_code"},
		"code":          {code},
		"code_verifier": {codeVerifier},
		"client_id":     {g.ClientID},
		"client_secret": {g.ClientSecret},
		"redirect_uri":  {g.RedirectURL},
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.TokenEndpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return Identity{}, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err := g.do(req, &token); err != nil {
		return Identity{}, fmt.Errorf("token exchange: %w", err)
	}
	if token.AccessToken == "" {
		return Identity{}, errors.New("token exchange: no access token in the response")
	}

	req, err = http.NewRequestWithContext(ctx, http.MethodGet, g.UserInfoEndpoint, nil)
	if err != nil {
		return Identity{}, err
	}
	req.Header.Set("Authorization", "Bearer "+token.AccessToken)

	var info struct {
		Subject       string `json:"sub"`
		Email         string `json:"email"`
		EmailVerified bool   `json:"email_verified"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := g.do(req, &info); err != nil {
		return Identity{}, fmt.Errorf("userinfo: %w", err)
	}
	if info.Subject == "" {
		return Identity{}, errors.New("userinfo: no subject in the response")
	}

	return Identity{
		Subject:       info.Subject,
		Email:         strings.ToLower(strings.TrimSpace(info.Email)),
		EmailVerified: info.EmailVerified,
		Name:          info.Name,
		Picture:       info.Picture,
	}, nil
}

func (g *Google) do(req *http.Request, out any) error {
	resp, err := g.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	if resp.StatusCode != http.StatusOK {
		// The error body names the problem and carries no secrets.
		return fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return json.Unmarshal(body, out)
}
