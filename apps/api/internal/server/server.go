// Package server wires the HTTP router, its middleware and the health endpoints.
package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const readinessTimeout = 2 * time.Second

// Pinger reports whether a dependency is reachable.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Options configures NewRouter.
type Options struct {
	Logger         *slog.Logger
	AllowedOrigins []string
	DB             Pinger
}

// NewRouter returns the API router with middleware and base routes attached.
func NewRouter(opts Options) *gin.Engine {
	logger := opts.Logger
	if logger == nil {
		logger = slog.Default()
	}

	router := gin.New()
	router.HandleMethodNotAllowed = true
	router.Use(requestID(), accessLog(logger), recovery(logger), corsPolicy(opts.AllowedOrigins))

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/readyz", readiness(opts.DB))

	router.NoRoute(func(c *gin.Context) {
		writeError(c, http.StatusNotFound, "not_found", "resource not found")
	})
	router.NoMethod(func(c *gin.Context) {
		writeError(c, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
	})

	return router
}

// readiness reports 200 only when the database answers a ping.
func readiness(db Pinger) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), readinessTimeout)
		defer cancel()

		if db == nil || db.Ping(ctx) != nil {
			writeError(c, http.StatusServiceUnavailable, "database_unavailable", "database is not reachable")
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	}
}

// writeError sends the error envelope shared by every endpoint.
func writeError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, gin.H{
		"error": gin.H{"code": code, "message": message},
	})
}
