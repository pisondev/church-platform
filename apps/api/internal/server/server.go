// Package server wires the HTTP router, its middleware and the health endpoints.
package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/pisondev/church-platform/apps/api/internal/httpx"
)

const readinessTimeout = 2 * time.Second

// Pinger reports whether a dependency is reachable.
type Pinger interface {
	Ping(ctx context.Context) error
}

// Routes is a feature that mounts its endpoints under /api/v1.
type Routes interface {
	Register(api gin.IRouter)
}

// Options configures NewRouter.
type Options struct {
	Logger         *slog.Logger
	AllowedOrigins []string
	DB             Pinger
	Features       []Routes
}

// NewRouter returns the API router with middleware and routes attached.
func NewRouter(opts Options) *gin.Engine {
	logger := opts.Logger
	if logger == nil {
		logger = slog.Default()
	}

	router := gin.New()
	router.HandleMethodNotAllowed = true
	router.Use(
		requestID(),
		accessLog(logger),
		recovery(logger),
		corsPolicy(opts.AllowedOrigins),
		trustedOrigin(opts.AllowedOrigins),
	)

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.GET("/readyz", readiness(opts.DB))

	api := router.Group("/api/v1")
	for _, feature := range opts.Features {
		feature.Register(api)
	}

	router.NoRoute(func(c *gin.Context) {
		httpx.Error(c, http.StatusNotFound, "not_found", "resource not found")
	})
	router.NoMethod(func(c *gin.Context) {
		httpx.Error(c, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
	})

	return router
}

// readiness reports 200 only when the database answers a ping.
func readiness(db Pinger) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), readinessTimeout)
		defer cancel()

		if db == nil || db.Ping(ctx) != nil {
			httpx.Error(c, http.StatusServiceUnavailable, "database_unavailable", "database is not reachable")
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	}
}
