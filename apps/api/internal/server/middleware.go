package server

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"regexp"
	"slices"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/pisondev/church-platform/apps/api/internal/httpx"
)

const (
	requestIDHeader = "X-Request-ID"
	requestIDKey    = "request_id"
)

var validRequestID = regexp.MustCompile(`^[A-Za-z0-9._-]{1,64}$`)

// requestID reuses a well-formed incoming X-Request-ID or generates one.
func requestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(requestIDHeader)
		if !validRequestID.MatchString(id) {
			id = newRequestID()
		}
		c.Set(requestIDKey, id)
		c.Header(requestIDHeader, id)
		c.Next()
	}
}

func newRequestID() string {
	buf := make([]byte, 16)
	// crypto/rand.Read never fails on supported platforms.
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

// accessLog writes one structured line per request.
func accessLog(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		status := c.Writer.Status()
		level := slog.LevelInfo
		switch {
		case status >= http.StatusInternalServerError:
			level = slog.LevelError
		case c.Request.URL.Path == "/healthz" || c.Request.URL.Path == "/readyz":
			level = slog.LevelDebug
		}

		logger.LogAttrs(c.Request.Context(), level, "request",
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.Int("status", status),
			slog.Duration("duration", time.Since(start)),
			slog.String("request_id", c.GetString(requestIDKey)),
		)
	}
}

// recovery turns a panic into a 500 response and logs it.
func recovery(logger *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecoveryWithWriter(nil, func(c *gin.Context, recovered any) {
		logger.ErrorContext(c.Request.Context(), "panic recovered",
			slog.Any("panic", recovered),
			slog.String("request_id", c.GetString(requestIDKey)),
		)
		httpx.Error(c, http.StatusInternalServerError, "internal_error", "internal server error")
	})
}

// corsPolicy allows credentialed requests from the configured frontends only.
func corsPolicy(origins []string) gin.HandlerFunc {
	return cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete},
		AllowHeaders:     []string{"Content-Type", requestIDHeader},
		ExposeHeaders:    []string{requestIDHeader},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	})
}

// trustedOrigin makes every state-changing request name an allowed Origin. Sessions live
// in a cookie, so this keeps other sites from acting on behalf of a signed-in user.
func trustedOrigin(origins []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}
		if !slices.Contains(origins, c.GetHeader("Origin")) {
			httpx.Error(c, http.StatusForbidden, "forbidden_origin", "request origin is not allowed")
			return
		}
		c.Next()
	}
}
