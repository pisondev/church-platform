package auth

import (
	"crypto/subtle"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pisondev/church-platform/apps/api/internal/httpx"
)

const (
	userKey         = "auth_user"
	maxUserAgentLen = 255
)

// Options configures a Handler.
type Options struct {
	// Provider is nil when sign-in is not configured; the sign-in routes then answer 503.
	Provider Provider
	Store    Store
	Logger   *slog.Logger

	// AdminURL receives the browser after a successful sign-in, WebURL after a failed one.
	AdminURL string
	WebURL   string

	SessionTTL    time.Duration
	SecureCookies bool
	CookieDomain  string

	Now func() time.Time
}

// Handler serves the sign-in, session and sign-out endpoints.
type Handler struct {
	opts Options
}

// NewHandler fills in defaults and returns a Handler.
func NewHandler(opts Options) *Handler {
	if opts.Logger == nil {
		opts.Logger = slog.Default()
	}
	if opts.SessionTTL <= 0 {
		opts.SessionTTL = 7 * 24 * time.Hour
	}
	if opts.Now == nil {
		opts.Now = time.Now
	}
	opts.AdminURL = strings.TrimRight(opts.AdminURL, "/")
	opts.WebURL = strings.TrimRight(opts.WebURL, "/")
	return &Handler{opts: opts}
}

// Register mounts the routes under <api>/auth.
func (h *Handler) Register(api gin.IRouter) {
	group := api.Group("/auth")
	group.GET("/google/start", h.start)
	group.GET("/google/callback", h.callback)
	group.GET("/me", h.RequireUser(), h.me)
	group.POST("/logout", h.logout)
}

// oauthState travels in a short-lived cookie between start and callback.
type oauthState struct {
	State    string `json:"s"`
	Verifier string `json:"v"`
	Redirect string `json:"r"`
}

func (h *Handler) start(c *gin.Context) {
	if h.opts.Provider == nil {
		httpx.Error(c, http.StatusServiceUnavailable, "sign_in_unavailable", "sign-in is not configured")
		return
	}

	state, stateErr := randomToken()
	verifier, verifierErr := randomToken()
	if stateErr != nil || verifierErr != nil {
		httpx.Error(c, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}

	payload, _ := json.Marshal(oauthState{
		State:    state,
		Verifier: verifier,
		Redirect: safeRedirect(c.Query("redirect")),
	})
	h.setCookie(c, &http.Cookie{
		Name:   stateCookie,
		Value:  base64.RawURLEncoding.EncodeToString(payload),
		Path:   statePath,
		MaxAge: int(stateTTL.Seconds()),
	})
	c.Redirect(http.StatusFound, h.opts.Provider.AuthURL(state, codeChallenge(verifier)))
}

func (h *Handler) callback(c *gin.Context) {
	if h.opts.Provider == nil {
		httpx.Error(c, http.StatusServiceUnavailable, "sign_in_unavailable", "sign-in is not configured")
		return
	}

	saved, hasState := h.readState(c)
	h.setCookie(c, &http.Cookie{Name: stateCookie, Path: statePath, MaxAge: -1})

	// Every failure sends the browser back to the public login page with a reason code.
	fail := func(reason string, err error) {
		if err != nil {
			h.opts.Logger.WarnContext(c.Request.Context(), "sign-in failed", "reason", reason, "error", err)
		}
		c.Redirect(http.StatusFound, h.opts.WebURL+"/login?error="+url.QueryEscape(reason))
	}

	if c.Query("error") != "" {
		fail("access_denied", nil)
		return
	}
	code, state := c.Query("code"), c.Query("state")
	if !hasState || code == "" || subtle.ConstantTimeCompare([]byte(saved.State), []byte(state)) != 1 {
		fail("invalid_state", nil)
		return
	}

	ctx := c.Request.Context()
	identity, err := h.opts.Provider.Exchange(ctx, code, saved.Verifier)
	if err != nil {
		fail("exchange_failed", err)
		return
	}
	if identity.Email == "" || !identity.EmailVerified {
		fail("unverified_email", nil)
		return
	}

	user, err := h.opts.Store.UserByEmail(ctx, identity.Email)
	switch {
	case errors.Is(err, ErrNotFound):
		fail("not_registered", nil)
		return
	case err != nil:
		fail("server_error", err)
		return
	case user.Status != statusActive:
		fail("suspended", nil)
		return
	case user.GoogleSubject != "" && user.GoogleSubject != identity.Subject:
		// The email now belongs to a different Google account than the one first used.
		fail("account_mismatch", nil)
		return
	}

	if err := h.opts.Store.RecordLogin(ctx, user.ID, identity); err != nil {
		fail("server_error", err)
		return
	}
	token, err := randomToken()
	if err != nil {
		fail("server_error", err)
		return
	}
	expires := h.opts.Now().Add(h.opts.SessionTTL)
	userAgent := c.Request.UserAgent()
	if len(userAgent) > maxUserAgentLen {
		userAgent = userAgent[:maxUserAgentLen]
	}
	if err := h.opts.Store.CreateSession(ctx, user.ID, hashToken(token), userAgent, expires); err != nil {
		fail("server_error", err)
		return
	}

	h.setCookie(c, &http.Cookie{
		Name:   SessionCookie,
		Value:  token,
		Path:   "/",
		Domain: h.opts.CookieDomain,
		MaxAge: int(h.opts.SessionTTL.Seconds()),
	})
	h.opts.Logger.InfoContext(ctx, "user signed in", "user_id", user.ID)
	c.Redirect(http.StatusFound, h.opts.AdminURL+saved.Redirect)
}

// RequireUser rejects requests without a live session and stores the user for handlers.
func (h *Handler) RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		token, err := c.Cookie(SessionCookie)
		if err != nil || token == "" {
			httpx.Error(c, http.StatusUnauthorized, "unauthenticated", "sign in to continue")
			return
		}

		user, err := h.opts.Store.UserBySession(c.Request.Context(), hashToken(token), h.opts.Now())
		switch {
		case errors.Is(err, ErrNotFound):
			h.clearSession(c)
			httpx.Error(c, http.StatusUnauthorized, "unauthenticated", "sign in to continue")
			return
		case err != nil:
			h.opts.Logger.ErrorContext(c.Request.Context(), "load session", "error", err)
			httpx.Error(c, http.StatusInternalServerError, "internal_error", "internal server error")
			return
		case user.Status != statusActive:
			httpx.Error(c, http.StatusForbidden, "account_suspended", "this account is suspended")
			return
		}

		SetCurrentUser(c, user)
		c.Next()
	}
}

// SetCurrentUser stores the signed-in user on the request. RequireUser calls it.
func SetCurrentUser(c *gin.Context, user User) {
	c.Set(userKey, user)
}

// CurrentUser returns the user stored by RequireUser.
func CurrentUser(c *gin.Context) (User, bool) {
	value, ok := c.Get(userKey)
	if !ok {
		return User{}, false
	}
	user, ok := value.(User)
	return user, ok
}

func (h *Handler) me(c *gin.Context) {
	user, _ := CurrentUser(c)

	churches, err := h.opts.Store.ChurchesFor(c.Request.Context(), user)
	if err != nil {
		h.opts.Logger.ErrorContext(c.Request.Context(), "load churches", "error", err)
		httpx.Error(c, http.StatusInternalServerError, "internal_error", "internal server error")
		return
	}
	if churches == nil {
		churches = []Church{}
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"name":         user.Name,
			"avatarUrl":    user.AvatarURL,
			"isSuperAdmin": user.IsSuperAdmin,
		},
		"churches": churches,
	})
}

func (h *Handler) logout(c *gin.Context) {
	if token, err := c.Cookie(SessionCookie); err == nil && token != "" {
		if err := h.opts.Store.DeleteSession(c.Request.Context(), hashToken(token)); err != nil {
			h.opts.Logger.ErrorContext(c.Request.Context(), "delete session", "error", err)
			httpx.Error(c, http.StatusInternalServerError, "internal_error", "internal server error")
			return
		}
	}
	h.clearSession(c)
	c.Status(http.StatusNoContent)
}

func (h *Handler) clearSession(c *gin.Context) {
	h.setCookie(c, &http.Cookie{Name: SessionCookie, Path: "/", Domain: h.opts.CookieDomain, MaxAge: -1})
}

// setCookie applies the attributes every auth cookie shares.
func (h *Handler) setCookie(c *gin.Context, cookie *http.Cookie) {
	cookie.HttpOnly = true
	cookie.Secure = h.opts.SecureCookies
	cookie.SameSite = http.SameSiteLaxMode
	http.SetCookie(c.Writer, cookie)
}

func (h *Handler) readState(c *gin.Context) (oauthState, bool) {
	raw, err := c.Cookie(stateCookie)
	if err != nil {
		return oauthState{}, false
	}
	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		return oauthState{}, false
	}
	var state oauthState
	if json.Unmarshal(decoded, &state) != nil || state.State == "" || state.Verifier == "" {
		return oauthState{}, false
	}
	state.Redirect = safeRedirect(state.Redirect)
	return state, true
}
