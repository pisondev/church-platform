// Package seed inserts the baseline data every environment starts with.
package seed

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
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

	if err := seedFirstTemplate(ctx, tx); err != nil {
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// seedFirstTemplate creates the first template once. Later runs leave it alone, so edits
// made in the app survive a re-seed.
func seedFirstTemplate(ctx context.Context, tx pgx.Tx) error {
	var churchID string
	err := tx.QueryRow(ctx,
		`SELECT id::text FROM churches WHERE slug = $1 AND deleted_at IS NULL`, FirstChurchSlug).Scan(&churchID)
	if err != nil {
		return fmt.Errorf("find first church: %w", err)
	}

	var exists bool
	err = tx.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM templates WHERE church_id = $1 AND name = $2 AND deleted_at IS NULL)`,
		churchID, FirstTemplateName).Scan(&exists)
	if err != nil {
		return fmt.Errorf("check first template: %w", err)
	}
	if exists {
		return nil
	}

	var templateID string
	err = tx.QueryRow(ctx,
		`INSERT INTO templates (church_id, name) VALUES ($1, $2) RETURNING id::text`,
		churchID, FirstTemplateName).Scan(&templateID)
	if err != nil {
		return fmt.Errorf("seed template: %w", err)
	}

	for index, slide := range liturgiUmum() {
		content, err := json.Marshal(slide.Content)
		if err != nil {
			return fmt.Errorf("encode slide %d: %w", index+1, err)
		}
		_, err = tx.Exec(ctx, `
			INSERT INTO template_slides (template_id, position, kind, content)
			VALUES ($1, $2, $3, $4::jsonb)`,
			templateID, index+1, slide.Kind, string(content))
		if err != nil {
			return fmt.Errorf("seed slide %d: %w", index+1, err)
		}
	}
	return nil
}
