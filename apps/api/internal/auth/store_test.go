package auth_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/pisondev/church-platform/apps/api/internal/auth"
	"github.com/pisondev/church-platform/apps/api/internal/database"
	"github.com/pisondev/church-platform/apps/api/internal/testdb"
)

func newStore(t *testing.T) (*auth.PostgresStore, *pgxpool.Pool) {
	t.Helper()
	pool := testdb.New(t)
	if _, err := database.Migrate(context.Background(), pool); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	return auth.NewPostgresStore(pool), pool
}

func exec(t *testing.T, pool *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func TestUserByEmail(t *testing.T) {
	store, pool := newStore(t)
	ctx := context.Background()
	exec(t, pool, "INSERT INTO users (email, is_super_admin) VALUES ('owner@example.com', true)")
	exec(t, pool, "INSERT INTO users (email, deleted_at) VALUES ('gone@example.com', now())")

	user, err := store.UserByEmail(ctx, "Owner@Example.com")
	if err != nil {
		t.Fatalf("UserByEmail: %v", err)
	}
	if user.Email != "owner@example.com" || !user.IsSuperAdmin || user.Status != "active" || user.GoogleSubject != "" || user.ID == "" {
		t.Errorf("user = %+v", user)
	}

	for _, email := range []string{"nobody@example.com", "gone@example.com"} {
		if _, err := store.UserByEmail(ctx, email); !errors.Is(err, auth.ErrNotFound) {
			t.Errorf("UserByEmail(%s) err = %v, want ErrNotFound", email, err)
		}
	}
}

func TestRecordLogin(t *testing.T) {
	store, pool := newStore(t)
	ctx := context.Background()
	exec(t, pool, "INSERT INTO users (email, name) VALUES ('admin@example.com', 'Old Name')")
	user, _ := store.UserByEmail(ctx, "admin@example.com")

	identity := auth.Identity{Subject: "sub-1", Name: "New Name", Picture: "https://example.com/a.png"}
	if err := store.RecordLogin(ctx, user.ID, identity); err != nil {
		t.Fatalf("RecordLogin: %v", err)
	}
	// A provider that sends no name must not erase the stored one.
	if err := store.RecordLogin(ctx, user.ID, auth.Identity{Subject: "sub-1"}); err != nil {
		t.Fatalf("RecordLogin without a name: %v", err)
	}

	updated, _ := store.UserByEmail(ctx, "admin@example.com")
	if updated.GoogleSubject != "sub-1" || updated.Name != "New Name" {
		t.Errorf("user = %+v", updated)
	}
	var loggedIn bool
	if err := pool.QueryRow(ctx, "SELECT last_login_at IS NOT NULL FROM users WHERE id = $1", user.ID).Scan(&loggedIn); err != nil || !loggedIn {
		t.Errorf("last_login_at not set (err = %v)", err)
	}

	missing := "00000000-0000-0000-0000-000000000000"
	if err := store.RecordLogin(ctx, missing, identity); !errors.Is(err, auth.ErrNotFound) {
		t.Errorf("RecordLogin for a missing user: err = %v, want ErrNotFound", err)
	}
}

func TestSessions(t *testing.T) {
	store, pool := newStore(t)
	ctx := context.Background()
	now := time.Now()
	exec(t, pool, "INSERT INTO users (email) VALUES ('admin@example.com')")
	user, _ := store.UserByEmail(ctx, "admin@example.com")

	live, expired := []byte("live-hash"), []byte("expired-hash")
	if err := store.CreateSession(ctx, user.ID, live, "test-agent", now.Add(time.Hour)); err != nil {
		t.Fatalf("CreateSession: %v", err)
	}
	if err := store.CreateSession(ctx, user.ID, expired, "", now.Add(-time.Hour)); err != nil {
		t.Fatalf("CreateSession expired: %v", err)
	}

	got, err := store.UserBySession(ctx, live, now)
	if err != nil || got.ID != user.ID {
		t.Fatalf("UserBySession = %+v, %v", got, err)
	}
	for name, hash := range map[string][]byte{"expired": expired, "unknown": []byte("nope")} {
		if _, err := store.UserBySession(ctx, hash, now); !errors.Is(err, auth.ErrNotFound) {
			t.Errorf("%s session: err = %v, want ErrNotFound", name, err)
		}
	}

	if err := store.DeleteSession(ctx, live); err != nil {
		t.Fatalf("DeleteSession: %v", err)
	}
	if err := store.DeleteSession(ctx, live); err != nil {
		t.Errorf("DeleteSession twice: %v", err)
	}
	if _, err := store.UserBySession(ctx, live, now); !errors.Is(err, auth.ErrNotFound) {
		t.Errorf("deleted session: err = %v, want ErrNotFound", err)
	}
}

func TestSessionOfADeletedUserIsGone(t *testing.T) {
	store, pool := newStore(t)
	ctx := context.Background()
	now := time.Now()
	exec(t, pool, "INSERT INTO users (email) VALUES ('admin@example.com')")
	user, _ := store.UserByEmail(ctx, "admin@example.com")
	hash := []byte("hash")
	if err := store.CreateSession(ctx, user.ID, hash, "", now.Add(time.Hour)); err != nil {
		t.Fatalf("CreateSession: %v", err)
	}

	exec(t, pool, "UPDATE users SET deleted_at = now() WHERE id = $1", user.ID)

	if _, err := store.UserBySession(ctx, hash, now); !errors.Is(err, auth.ErrNotFound) {
		t.Errorf("err = %v, want ErrNotFound", err)
	}
}

func TestChurchesFor(t *testing.T) {
	store, pool := newStore(t)
	ctx := context.Background()
	exec(t, pool, `INSERT INTO churches (name, slug) VALUES ('Beta Church', 'beta'), ('Alpha Church', 'alpha')`)
	exec(t, pool, `INSERT INTO churches (name, slug, deleted_at) VALUES ('Closed Church', 'closed', now())`)
	exec(t, pool, `INSERT INTO users (email, is_super_admin) VALUES ('owner@example.com', true), ('admin@example.com', false), ('idle@example.com', false)`)
	exec(t, pool, `INSERT INTO church_admins (church_id, user_id)
		SELECT c.id, u.id FROM churches c, users u
		WHERE u.email = 'admin@example.com' AND c.slug IN ('beta', 'closed')`)

	slugs := func(email string) []string {
		t.Helper()
		user, err := store.UserByEmail(ctx, email)
		if err != nil {
			t.Fatalf("UserByEmail(%s): %v", email, err)
		}
		churches, err := store.ChurchesFor(ctx, user)
		if err != nil {
			t.Fatalf("ChurchesFor(%s): %v", email, err)
		}
		var out []string
		for _, church := range churches {
			out = append(out, church.Slug)
		}
		return out
	}

	tests := map[string][]string{
		"owner@example.com": {"alpha", "beta"}, // every live church, by name
		"admin@example.com": {"beta"},          // assigned ones, minus the deleted church
		"idle@example.com":  nil,
	}
	for email, want := range tests {
		got := slugs(email)
		if len(got) != len(want) {
			t.Errorf("%s: churches = %v, want %v", email, got, want)
			continue
		}
		for i := range want {
			if got[i] != want[i] {
				t.Errorf("%s: churches = %v, want %v", email, got, want)
				break
			}
		}
	}
}
