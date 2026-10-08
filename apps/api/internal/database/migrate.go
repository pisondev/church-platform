package database

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

// Migrate applies every pending migration and returns how many ran.
func Migrate(ctx context.Context, pool *pgxpool.Pool) (int, error) {
	files, err := fs.Sub(migrationFiles, "migrations")
	if err != nil {
		return 0, fmt.Errorf("open migrations: %w", err)
	}

	// Closing this handle leaves the pool open.
	db := stdlib.OpenDBFromPool(pool)
	defer db.Close()

	provider, err := goose.NewProvider(goose.DialectPostgres, db, files)
	if err != nil {
		return 0, fmt.Errorf("load migrations: %w", err)
	}

	results, err := provider.Up(ctx)
	for _, result := range results {
		if result.Error == nil {
			slog.InfoContext(ctx, "migration applied", "file", result.Source.Path, "duration", result.Duration)
		}
	}
	if err != nil {
		return len(results), fmt.Errorf("apply migrations: %w", err)
	}
	return len(results), nil
}
