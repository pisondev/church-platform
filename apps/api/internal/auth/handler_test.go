package auth

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	adminURL = "http://admin.test"
	webURL   = "http://web.test"
)

var testNow = time.Date(2026, 10, 8, 12, 0, 0, 0, time.UTC)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

// fakeProvider returns a fixed identity, or an error.
type fakeProvider struct {
	identity Identity
	err      error

	gotCode     string
	gotVerifier string
}

func (p *fakeProvider) AuthURL(state, challenge string) string {
	return "https://idp.test/auth?state=" + url.QueryEscape(state) + "&challenge=" + url.QueryEscape(challenge)
}

func (p *fakeProvider) Exchange(_ context.Context, code, verifier string) (Identity, error) {
	p.gotCode, p.gotVerifier = code, verifier
	return p.identity, p.err
}

type fakeSession struct {
	userID  string
	expires time.Time
}

// fakeStore keeps users and sessions in memory.
type fakeStore struct {
	users    map[string]User // by email
	sessions map[string]fakeSession
	churches []Church
	logins   []Identity
}

func newFakeStore(users ...User) *fakeStore {
	store := &fakeStore{users: map[string]User{}, sessions: map[string]fakeSession{}}
	for _, user := range users {
		store.users[user.Email] = user
	}
	return store
}

func (s *fakeStore) UserByEmail(_ context.Context, email string) (User, error) {
	user, ok := s.users[email]
	if !ok {
		return User{}, ErrNotFound
	}
	return user, nil
}

func (s *fakeStore) RecordLogin(_ context.Context, userID string, identity Identity) error {
	s.logins = append(s.logins, identity)
	return nil
}

func (s *fakeStore) CreateSession(_ context.Context, userID string, hash []byte, _ string, expires time.Time) error {
	s.sessions[string(hash)] = fakeSession{userID: userID, expires: expires}
	return nil
}

func (s *fakeStore) UserBySession(_ context.Context, hash []byte, now time.Time) (User, error) {
	session, ok := s.sessions[string(hash)]
	if !ok || !session.expires.After(now) {
		return User{}, ErrNotFound
	}
	for _, user := range s.users {
		if user.ID == session.userID {
			return user, nil
		}
	}
	return User{}, ErrNotFound
}

func (s *fakeStore) DeleteSession(_ context.Context, hash []byte) error {
	delete(s.sessions, string(hash))
	return nil
}

func (s *fakeStore) ChurchesFor(context.Context, User) ([]Church, error) {
	return s.churches, nil
}

var activeUser = User{ID: "user-1", Email: "admin@example.com", Name: "Admin", Status: "active", IsSuperAdmin: true}

var verifiedIdentity = Identity{
	Subject:       "sub-1",
	Email:         "admin@example.com",
	EmailVerified: true,
	Name:          "Admin Person",
	Picture:       "https://example.com/a.png",
}

func newTestRouter(provider Provider, store Store) *gin.Engine {
	handler := NewHandler(Options{
		Provider: provider,
		Store:    store,
		Logger:   slog.New(slog.NewTextHandler(io.Discard, nil)),
		AdminURL: adminURL,
		WebURL:   webURL,
		Now:      func() time.Time { return testNow },
	})
	router := gin.New()
	handler.Register(router.Group("/api/v1"))
	return router
}

func request(router http.Handler, method, target string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, target, nil)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func cookieNamed(rec *httptest.ResponseRecorder, name string) *http.Cookie {
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == name {
			return cookie
		}
	}
	return nil
}

// begin runs the start step and returns the state cookie and the state value sent to the provider.
func begin(t *testing.T, router http.Handler, query string) (*http.Cookie, string) {
	t.Helper()
	rec := request(router, http.MethodGet, "/api/v1/auth/google/start"+query)
	if rec.Code != http.StatusFound {
		t.Fatalf("start: status = %d, want 302", rec.Code)
	}
	location, err := url.Parse(rec.Header().Get("Location"))
	if err != nil {
		t.Fatalf("start: parse location: %v", err)
	}
	cookie := cookieNamed(rec, stateCookie)
	if cookie == nil {
		t.Fatal("start: no state cookie")
	}
	return cookie, location.Query().Get("state")
}

// signIn completes the whole flow and returns the session cookie.
func signIn(t *testing.T, router http.Handler) *http.Cookie {
	t.Helper()
	pending, state := begin(t, router, "")
	rec := request(router, http.MethodGet, "/api/v1/auth/google/callback?code=abc&state="+url.QueryEscape(state), pending)
	session := cookieNamed(rec, SessionCookie)
	if session == nil || session.Value == "" {
		t.Fatalf("sign-in did not set a session cookie (redirected to %s)", rec.Header().Get("Location"))
	}
	return session
}

func TestStartRedirectsToTheProvider(t *testing.T) {
	router := newTestRouter(&fakeProvider{}, newFakeStore())

	rec := request(router, http.MethodGet, "/api/v1/auth/google/start")

	location := rec.Header().Get("Location")
	if rec.Code != http.StatusFound || !strings.HasPrefix(location, "https://idp.test/auth?state=") {
		t.Fatalf("status = %d, location = %s", rec.Code, location)
	}
	cookie := cookieNamed(rec, stateCookie)
	if cookie == nil || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode || cookie.Path != statePath {
		t.Errorf("state cookie = %+v", cookie)
	}
}

func TestSignInRoutesAnswer503WithoutAProvider(t *testing.T) {
	router := newTestRouter(nil, newFakeStore())

	for _, path := range []string{"/api/v1/auth/google/start", "/api/v1/auth/google/callback?code=a&state=b"} {
		if rec := request(router, http.MethodGet, path); rec.Code != http.StatusServiceUnavailable {
			t.Errorf("%s: status = %d, want 503", path, rec.Code)
		}
	}
}

func TestCallbackSignsARegisteredUserIn(t *testing.T) {
	provider := &fakeProvider{identity: verifiedIdentity}
	store := newFakeStore(activeUser)
	router := newTestRouter(provider, store)

	pending, state := begin(t, router, "?redirect=/songs")
	rec := request(router, http.MethodGet, "/api/v1/auth/google/callback?code=abc&state="+url.QueryEscape(state), pending)

	if rec.Code != http.StatusFound || rec.Header().Get("Location") != adminURL+"/songs" {
		t.Fatalf("status = %d, location = %s", rec.Code, rec.Header().Get("Location"))
	}
	session := cookieNamed(rec, SessionCookie)
	if session == nil || session.Value == "" || !session.HttpOnly || session.SameSite != http.SameSiteLaxMode || session.Path != "/" {
		t.Fatalf("session cookie = %+v", session)
	}
	if got := store.sessions[string(hashToken(session.Value))]; got.userID != activeUser.ID || !got.expires.Equal(testNow.Add(7*24*time.Hour)) {
		t.Errorf("stored session = %+v", got)
	}
	if _, rawStored := store.sessions[session.Value]; rawStored {
		t.Error("the raw session token was stored")
	}
	if len(store.logins) != 1 || store.logins[0] != verifiedIdentity {
		t.Errorf("recorded logins = %+v", store.logins)
	}
	if provider.gotCode != "abc" || provider.gotVerifier == "" {
		t.Errorf("provider got code %q, verifier %q", provider.gotCode, provider.gotVerifier)
	}
	if cleared := cookieNamed(rec, stateCookie); cleared == nil || cleared.MaxAge >= 0 {
		t.Errorf("state cookie not cleared: %+v", cleared)
	}
}

func TestCallbackRejections(t *testing.T) {
	suspended := activeUser
	suspended.Status = "suspended"
	otherAccount := activeUser
	otherAccount.GoogleSubject = "someone-else"
	unverified := verifiedIdentity
	unverified.EmailVerified = false

	tests := []struct {
		name     string
		provider *fakeProvider
		users    []User
		query    string // appended to the callback, "{state}" is replaced
		noCookie bool
		want     string
	}{
		{name: "user cancelled", provider: &fakeProvider{}, query: "?error=access_denied&state={state}", want: "access_denied"},
		{name: "state does not match", provider: &fakeProvider{identity: verifiedIdentity}, users: []User{activeUser}, query: "?code=abc&state=forged", want: "invalid_state"},
		{name: "state cookie missing", provider: &fakeProvider{identity: verifiedIdentity}, users: []User{activeUser}, query: "?code=abc&state={state}", noCookie: true, want: "invalid_state"},
		{name: "code missing", provider: &fakeProvider{identity: verifiedIdentity}, users: []User{activeUser}, query: "?state={state}", want: "invalid_state"},
		{name: "provider fails", provider: &fakeProvider{err: errors.New("boom")}, users: []User{activeUser}, query: "?code=abc&state={state}", want: "exchange_failed"},
		{name: "email not verified", provider: &fakeProvider{identity: unverified}, users: []User{activeUser}, query: "?code=abc&state={state}", want: "unverified_email"},
		{name: "email not registered", provider: &fakeProvider{identity: verifiedIdentity}, query: "?code=abc&state={state}", want: "not_registered"},
		{name: "account suspended", provider: &fakeProvider{identity: verifiedIdentity}, users: []User{suspended}, query: "?code=abc&state={state}", want: "suspended"},
		{name: "different Google account", provider: &fakeProvider{identity: verifiedIdentity}, users: []User{otherAccount}, query: "?code=abc&state={state}", want: "account_mismatch"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newFakeStore(tt.users...)
			router := newTestRouter(tt.provider, store)

			pending, state := begin(t, router, "")
			target := "/api/v1/auth/google/callback" + strings.ReplaceAll(tt.query, "{state}", url.QueryEscape(state))
			var cookies []*http.Cookie
			if !tt.noCookie {
				cookies = append(cookies, pending)
			}
			rec := request(router, http.MethodGet, target, cookies...)

			if want := webURL + "/login?error=" + tt.want; rec.Code != http.StatusFound || rec.Header().Get("Location") != want {
				t.Errorf("status = %d, location = %s, want %s", rec.Code, rec.Header().Get("Location"), want)
			}
			if session := cookieNamed(rec, SessionCookie); session != nil && session.Value != "" {
				t.Error("a session cookie was set")
			}
			if len(store.sessions) != 0 {
				t.Error("a session was stored")
			}
		})
	}
}

func TestMe(t *testing.T) {
	store := newFakeStore(activeUser)
	store.churches = []Church{{ID: "church-1", Name: "GKJ Sentolo", Slug: "gkj-sentolo"}}
	router := newTestRouter(&fakeProvider{identity: verifiedIdentity}, store)

	if rec := request(router, http.MethodGet, "/api/v1/auth/me"); rec.Code != http.StatusUnauthorized {
		t.Fatalf("without a session: status = %d, want 401", rec.Code)
	}
	if rec := request(router, http.MethodGet, "/api/v1/auth/me", &http.Cookie{Name: SessionCookie, Value: "forged"}); rec.Code != http.StatusUnauthorized {
		t.Fatalf("forged session: status = %d, want 401", rec.Code)
	}

	session := signIn(t, router)
	rec := request(router, http.MethodGet, "/api/v1/auth/me", session)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}

	var body struct {
		User struct {
			ID           string `json:"id"`
			Email        string `json:"email"`
			Name         string `json:"name"`
			AvatarURL    string `json:"avatarUrl"`
			IsSuperAdmin bool   `json:"isSuperAdmin"`
		} `json:"user"`
		Churches []Church `json:"churches"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.User.ID != activeUser.ID || body.User.Email != activeUser.Email || !body.User.IsSuperAdmin {
		t.Errorf("user = %+v", body.User)
	}
	if len(body.Churches) != 1 || body.Churches[0].Slug != "gkj-sentolo" {
		t.Errorf("churches = %+v", body.Churches)
	}
}

func TestMeReturnsAnEmptyChurchList(t *testing.T) {
	router := newTestRouter(&fakeProvider{identity: verifiedIdentity}, newFakeStore(activeUser))

	rec := request(router, http.MethodGet, "/api/v1/auth/me", signIn(t, router))

	if !strings.Contains(rec.Body.String(), `"churches":[]`) {
		t.Errorf("body = %s, want an empty array for churches", rec.Body.String())
	}
}

func TestSessionStopsWorkingWhenExpiredOrSuspended(t *testing.T) {
	t.Run("expired", func(t *testing.T) {
		store := newFakeStore(activeUser)
		router := newTestRouter(&fakeProvider{identity: verifiedIdentity}, store)
		session := signIn(t, router)

		for hash, stored := range store.sessions {
			stored.expires = testNow.Add(-time.Minute)
			store.sessions[hash] = stored
		}
		rec := request(router, http.MethodGet, "/api/v1/auth/me", session)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", rec.Code)
		}
		if cleared := cookieNamed(rec, SessionCookie); cleared == nil || cleared.MaxAge >= 0 {
			t.Errorf("stale session cookie not cleared: %+v", cleared)
		}
	})

	t.Run("suspended after sign-in", func(t *testing.T) {
		store := newFakeStore(activeUser)
		router := newTestRouter(&fakeProvider{identity: verifiedIdentity}, store)
		session := signIn(t, router)

		suspended := activeUser
		suspended.Status = "suspended"
		store.users[suspended.Email] = suspended

		if rec := request(router, http.MethodGet, "/api/v1/auth/me", session); rec.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", rec.Code)
		}
	})
}

func TestLogout(t *testing.T) {
	store := newFakeStore(activeUser)
	router := newTestRouter(&fakeProvider{identity: verifiedIdentity}, store)
	session := signIn(t, router)

	rec := request(router, http.MethodPost, "/api/v1/auth/logout", session)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
	if len(store.sessions) != 0 {
		t.Error("the session was not deleted")
	}
	if cleared := cookieNamed(rec, SessionCookie); cleared == nil || cleared.MaxAge >= 0 {
		t.Errorf("session cookie not cleared: %+v", cleared)
	}
	if rec := request(router, http.MethodGet, "/api/v1/auth/me", session); rec.Code != http.StatusUnauthorized {
		t.Errorf("after logout: status = %d, want 401", rec.Code)
	}
	if rec := request(router, http.MethodPost, "/api/v1/auth/logout"); rec.Code != http.StatusNoContent {
		t.Errorf("logout without a session: status = %d, want 204", rec.Code)
	}
}

func TestSafeRedirect(t *testing.T) {
	tests := map[string]string{
		"/songs":             "/songs",
		"/songs/kj-40?v=1":   "/songs/kj-40?v=1",
		"":                   "/",
		"songs":              "/",
		"//evil.example":     "/",
		"https://evil.test/": "/",
		"/\\evil.example":    "/",
		"/a\r\nSet-Cookie:x": "/",
	}
	for input, want := range tests {
		if got := safeRedirect(input); got != want {
			t.Errorf("safeRedirect(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestCodeChallengeMatchesRFC7636(t *testing.T) {
	// Appendix B of RFC 7636.
	const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
	const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

	if got := codeChallenge(verifier); got != challenge {
		t.Errorf("codeChallenge = %s, want %s", got, challenge)
	}
}
