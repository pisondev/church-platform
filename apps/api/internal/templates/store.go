// Package templates serves churches and their presentation templates.
package templates

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/pisondev/church-platform/apps/api/internal/auth"
)

// ErrNotFound covers both "does not exist" and "not yours": callers must not tell them apart.
var ErrNotFound = errors.New("templates: not found")

// ErrNameTaken is returned when another live template of the church has the name.
var ErrNameTaken = errors.New("templates: name already used")

// Church is a tenant as shown to someone who manages it.
type Church struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Slug   string `json:"slug"`
	Status string `json:"status"`
}

// Summary is a template as listed.
type Summary struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	AspectRatio string    `json:"aspectRatio"`
	SlideCount  int       `json:"slideCount"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// Slide is one page of a template. Content depends on Kind.
type Slide struct {
	ID       string          `json:"id"`
	Position int             `json:"position"`
	Kind     string          `json:"kind"`
	Content  json.RawMessage `json:"content"`
}

// Template is a template with its slides in order.
type Template struct {
	Summary
	Slides []Slide `json:"slides"`
}

// Store is the persistence the handlers need.
type Store interface {
	ChurchForUser(ctx context.Context, slug string, user auth.User) (Church, error)
	List(ctx context.Context, churchID string) ([]Summary, error)
	Get(ctx context.Context, churchID, templateID string) (Template, error)
	Rename(ctx context.Context, churchID, templateID, name string) (Summary, error)
}

// PostgresStore implements Store.
type PostgresStore struct {
	pool *pgxpool.Pool
}

// NewPostgresStore returns a Store backed by pool.
func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

// ChurchForUser returns a live church the user may manage: any for a Super Admin, the
// assigned ones for a Church Admin.
func (s *PostgresStore) ChurchForUser(ctx context.Context, slug string, user auth.User) (Church, error) {
	var church Church
	err := s.pool.QueryRow(ctx, `
		SELECT c.id::text, c.name, c.slug, c.status
		FROM churches c
		WHERE c.slug = $1 AND c.deleted_at IS NULL
		  AND ($2 OR EXISTS (
		        SELECT 1 FROM church_admins a WHERE a.church_id = c.id AND a.user_id = $3))`,
		slug, user.IsSuperAdmin, user.ID).Scan(&church.ID, &church.Name, &church.Slug, &church.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return Church{}, ErrNotFound
	}
	if err != nil {
		return Church{}, fmt.Errorf("load church: %w", err)
	}
	return church, nil
}

const summaryColumns = `t.id::text, t.name, t.aspect_ratio,
	(SELECT count(*) FROM template_slides s WHERE s.template_id = t.id), t.updated_at`

// List returns the live templates of a church, by name.
func (s *PostgresStore) List(ctx context.Context, churchID string) ([]Summary, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT `+summaryColumns+`
		FROM templates t
		WHERE t.church_id = $1 AND t.deleted_at IS NULL
		ORDER BY t.name`, churchID)
	if err != nil {
		return nil, fmt.Errorf("list templates: %w", err)
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Summary, error) {
		var summary Summary
		err := row.Scan(&summary.ID, &summary.Name, &summary.AspectRatio, &summary.SlideCount, &summary.UpdatedAt)
		return summary, err
	})
}

// Get returns one template of the church with its slides in order.
func (s *PostgresStore) Get(ctx context.Context, churchID, templateID string) (Template, error) {
	var template Template
	err := s.pool.QueryRow(ctx, `
		SELECT `+summaryColumns+`
		FROM templates t
		WHERE t.id = $1 AND t.church_id = $2 AND t.deleted_at IS NULL`, templateID, churchID).
		Scan(&template.ID, &template.Name, &template.AspectRatio, &template.SlideCount, &template.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Template{}, ErrNotFound
	}
	if err != nil {
		return Template{}, fmt.Errorf("load template: %w", err)
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id::text, position, kind, content
		FROM template_slides
		WHERE template_id = $1
		ORDER BY position`, templateID)
	if err != nil {
		return Template{}, fmt.Errorf("load slides: %w", err)
	}
	template.Slides, err = pgx.CollectRows(rows, func(row pgx.CollectableRow) (Slide, error) {
		var slide Slide
		err := row.Scan(&slide.ID, &slide.Position, &slide.Kind, &slide.Content)
		return slide, err
	})
	if err != nil {
		return Template{}, fmt.Errorf("read slides: %w", err)
	}
	if template.Slides == nil {
		template.Slides = []Slide{}
	}
	return template, nil
}

const uniqueViolation = "23505"

// Rename changes the name of a template of the church.
func (s *PostgresStore) Rename(ctx context.Context, churchID, templateID, name string) (Summary, error) {
	var summary Summary
	err := s.pool.QueryRow(ctx, `
		UPDATE templates t
		SET name = $3, updated_at = now()
		WHERE t.id = $1 AND t.church_id = $2 AND t.deleted_at IS NULL
		RETURNING `+summaryColumns, templateID, churchID, name).
		Scan(&summary.ID, &summary.Name, &summary.AspectRatio, &summary.SlideCount, &summary.UpdatedAt)

	var pgErr *pgconn.PgError
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return Summary{}, ErrNotFound
	case errors.As(err, &pgErr) && pgErr.Code == uniqueViolation:
		return Summary{}, ErrNameTaken
	case err != nil:
		return Summary{}, fmt.Errorf("rename template: %w", err)
	}
	return summary, nil
}
