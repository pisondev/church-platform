package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresStore implements Store on the identity tables.
type PostgresStore struct {
	pool *pgxpool.Pool
}

// NewPostgresStore returns a Store backed by pool.
func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

const userColumns = `u.id::text, u.email, u.name, u.avatar_url, coalesce(u.google_subject, ''), u.is_super_admin, u.status`

func scanUser(row pgx.Row) (User, error) {
	var user User
	err := row.Scan(&user.ID, &user.Email, &user.Name, &user.AvatarURL, &user.GoogleSubject, &user.IsSuperAdmin, &user.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return User{}, ErrNotFound
	}
	return user, err
}

// UserByEmail finds a live user. Emails are stored lowercase.
func (s *PostgresStore) UserByEmail(ctx context.Context, email string) (User, error) {
	return scanUser(s.pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users u WHERE u.email = lower($1) AND u.deleted_at IS NULL`, email))
}

// RecordLogin binds the Google account on first sign-in and refreshes the profile.
func (s *PostgresStore) RecordLogin(ctx context.Context, userID string, identity Identity) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE users
		SET google_subject = $2,
		    name = CASE WHEN $3 <> '' THEN $3 ELSE name END,
		    avatar_url = $4,
		    last_login_at = now(),
		    updated_at = now()
		WHERE id = $1`,
		userID, identity.Subject, identity.Name, identity.Picture)
	if err != nil {
		return fmt.Errorf("record login: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// CreateSession stores a new session for the user.
func (s *PostgresStore) CreateSession(ctx context.Context, userID string, tokenHash []byte, userAgent string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO sessions (user_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, $4)`,
		userID, tokenHash, userAgent, expiresAt)
	if err != nil {
		return fmt.Errorf("create session: %w", err)
	}
	return nil
}

// UserBySession returns the owner of an unexpired session, unless the user was deleted.
func (s *PostgresStore) UserBySession(ctx context.Context, tokenHash []byte, now time.Time) (User, error) {
	return scanUser(s.pool.QueryRow(ctx, `
		SELECT `+userColumns+`
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > $2 AND u.deleted_at IS NULL`,
		tokenHash, now))
}

// DeleteSession removes a session. Deleting one that is already gone is not an error.
func (s *PostgresStore) DeleteSession(ctx context.Context, tokenHash []byte) error {
	if _, err := s.pool.Exec(ctx, `DELETE FROM sessions WHERE token_hash = $1`, tokenHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// ChurchesFor lists the live churches a user may manage: all of them for a Super Admin,
// the assigned ones for a Church Admin.
func (s *PostgresStore) ChurchesFor(ctx context.Context, user User) ([]Church, error) {
	query := `
		SELECT c.id::text, c.name, c.slug
		FROM churches c
		JOIN church_admins a ON a.church_id = c.id
		WHERE a.user_id = $1 AND c.deleted_at IS NULL
		ORDER BY c.name`
	args := []any{user.ID}
	if user.IsSuperAdmin {
		query = `SELECT c.id::text, c.name, c.slug FROM churches c WHERE c.deleted_at IS NULL ORDER BY c.name`
		args = nil
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list churches: %w", err)
	}
	return pgx.CollectRows(rows, func(row pgx.CollectableRow) (Church, error) {
		var church Church
		err := row.Scan(&church.ID, &church.Name, &church.Slug)
		return church, err
	})
}
