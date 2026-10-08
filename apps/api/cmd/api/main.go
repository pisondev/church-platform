// Command api runs the church platform HTTP API.
package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	"github.com/pisondev/church-platform/apps/api/internal/config"
	"github.com/pisondev/church-platform/apps/api/internal/database"
	"github.com/pisondev/church-platform/apps/api/internal/server"
)

const shutdownTimeout = 10 * time.Second

func main() {
	if err := run(os.Args[1:]); err != nil {
		slog.Error("api exited", "error", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	// Development convenience: real environments inject variables directly.
	_ = godotenv.Load(".env")
	_ = godotenv.Load("../../.env")

	cfg, err := config.Load(os.Getenv)
	if err != nil {
		return err
	}
	logger := newLogger(cfg.Env)
	slog.SetDefault(logger)

	command := "serve"
	if len(args) > 0 {
		command = args[0]
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	switch command {
	case "serve":
		return serve(ctx, cfg, pool, logger)
	default:
		return fmt.Errorf("unknown command %q (want serve)", command)
	}
}

func serve(ctx context.Context, cfg config.Config, pool *pgxpool.Pool, logger *slog.Logger) error {
	if cfg.Env == config.EnvProduction {
		gin.SetMode(gin.ReleaseMode)
	}

	srv := &http.Server{
		Addr: cfg.HTTPAddr,
		Handler: server.NewRouter(server.Options{
			Logger:         logger,
			AllowedOrigins: cfg.AllowedOrigins,
			DB:             pool,
		}),
		ReadHeaderTimeout: 10 * time.Second,
	}

	failed := make(chan error, 1)
	go func() {
		logger.Info("api listening", "addr", cfg.HTTPAddr, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			failed <- err
		}
	}()

	select {
	case err := <-failed:
		return fmt.Errorf("listen: %w", err)
	case <-ctx.Done():
	}

	logger.Info("api shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	return srv.Shutdown(shutdownCtx)
}

func newLogger(env string) *slog.Logger {
	if env == config.EnvProduction {
		return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	}
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
}
