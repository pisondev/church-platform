// Package seed inserts the baseline data every environment starts with.
package seed

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// The first church on the platform.
const (
	FirstChurchName = "GKJ Sentolo"
	FirstChurchSlug = "gkj-sentolo"
)

// Options configures Run.
type Options struct {
	// SuperAdminEmails are created if missing and granted the Super Admin role.
	SuperAdminEmails []string
}

// Run inserts the baseline data. It is idempotent.
func Run(ctx context.Context, pool *pgxpool.Pool, opts Options) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck // no-op after Commit

	_, err = tx.Exec(ctx, `
		INSERT INTO churches (name, slug) VALUES ($1, $2)
		ON CONFLICT (slug) WHERE deleted_at IS NULL DO NOTHING`,
		FirstChurchName, FirstChurchSlug)
	if err != nil {
		return fmt.Errorf("seed church: %w", err)
	}

	for _, email := range opts.SuperAdminEmails {
		email = strings.ToLower(strings.TrimSpace(email))
		if email == "" {
			continue
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO users (email, is_super_admin) VALUES ($1, true)
			ON CONFLICT (email) WHERE deleted_at IS NULL
			DO UPDATE SET is_super_admin = true, updated_at = now()
			WHERE NOT users.is_super_admin`,
			email)
		if err != nil {
			return fmt.Errorf("seed super admin %s: %w", email, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}
