// Package auth signs users in with Google and keeps their sessions.
//
// Only emails that already exist in the users table can sign in. The browser holds an
// opaque session token in an httpOnly cookie; the database stores its SHA-256.
package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"strings"
	"time"
)

// ErrNotFound is returned by a Store when a user or session does not exist.
var ErrNotFound = errors.New("auth: not found")

// SessionCookie is the name of the cookie that carries the session token.
const SessionCookie = "eccle_session"

const (
	stateCookie = "eccle_oauth"
	statePath   = "/api/v1/auth"
	stateTTL    = 10 * time.Minute

	statusActive = "active"
)

// Identity is what the identity provider says about the person signing in.
type Identity struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
	Picture       string
}

// Provider runs the OAuth authorization code flow with PKCE.
type Provider interface {
	AuthURL(state, codeChallenge string) string
	Exchange(ctx context.Context, code, codeVerifier string) (Identity, error)
}

// User is an account allowed to sign in.
type User struct {
	ID            string
	Email         string
	Name          string
	AvatarURL     string
	GoogleSubject string
	IsSuperAdmin  bool
	Status        string
}

// Church is a tenant the user may manage.
type Church struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// Store is the persistence the handlers need.
type Store interface {
	UserByEmail(ctx context.Context, email string) (User, error)
	RecordLogin(ctx context.Context, userID string, identity Identity) error
	CreateSession(ctx context.Context, userID string, tokenHash []byte, userAgent string, expiresAt time.Time) error
	UserBySession(ctx context.Context, tokenHash []byte, now time.Time) (User, error)
	DeleteSession(ctx context.Context, tokenHash []byte) error
	ChurchesFor(ctx context.Context, user User) ([]Church, error)
}

// randomToken returns 256 bits of randomness, safe to put in a URL or a cookie.
func randomToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) []byte {
	sum := sha256.Sum256([]byte(token))
	return sum[:]
}

// codeChallenge derives the PKCE S256 challenge from a verifier.
func codeChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

// safeRedirect keeps a post-login path inside the admin app.
func safeRedirect(path string) string {
	if !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") || strings.ContainsAny(path, "\\\r\n") {
		return "/"
	}
	return path
}
