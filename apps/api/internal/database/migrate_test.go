package database_test

import (
	"context"
	"testing"

	"github.com/pisondev/church-platform/apps/api/internal/database"
	"github.com/pisondev/church-platform/apps/api/internal/testdb"
)

func TestMigrateIsIdempotent(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()

	applied, err := database.Migrate(ctx, pool)
	if err != nil {
		t.Fatalf("first Migrate: %v", err)
	}
	if applied == 0 {
		t.Fatal("first Migrate applied nothing")
	}

	applied, err = database.Migrate(ctx, pool)
	if err != nil {
		t.Fatalf("second Migrate: %v", err)
	}
	if applied != 0 {
		t.Errorf("second Migrate applied %d migrations, want 0", applied)
	}

	for _, table := range []string{"churches", "users", "church_admins"} {
		var exists bool
		err := pool.QueryRow(ctx, "SELECT to_regclass($1) IS NOT NULL", table).Scan(&exists)
		if err != nil || !exists {
			t.Errorf("table %s missing (err = %v)", table, err)
		}
	}
}

func TestIdentityConstraints(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	if _, err := database.Migrate(ctx, pool); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	mustExec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("%s: %v", sql, err)
		}
	}
	mustFail := func(why, sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err == nil {
			t.Errorf("%s: statement succeeded, want a constraint error", why)
		}
	}

	const insertChurch = "INSERT INTO churches (name, slug) VALUES ($1, $2)"
	mustExec(insertChurch, "First Church", "first-church")
	mustFail("duplicate live slug", insertChurch, "Other Church", "first-church")
	mustFail("malformed slug", insertChurch, "Bad Slug", "Not A Slug")
	mustFail("unknown status", "INSERT INTO churches (name, slug, status) VALUES ('X', 'x', 'archived')")

	mustExec("UPDATE churches SET deleted_at = now() WHERE slug = 'first-church'")
	mustExec(insertChurch, "Reborn Church", "first-church")

	const insertUser = "INSERT INTO users (email) VALUES ($1)"
	mustExec(insertUser, "admin@example.com")
	mustFail("duplicate email", insertUser, "admin@example.com")
	mustFail("mixed-case email", insertUser, "Admin@Example.com")

	mustExec(`INSERT INTO church_admins (church_id, user_id)
		SELECT c.id, u.id FROM churches c, users u WHERE c.deleted_at IS NULL`)
	mustExec("DELETE FROM users WHERE email = 'admin@example.com'")

	var remaining int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM church_admins").Scan(&remaining); err != nil {
		t.Fatalf("count church_admins: %v", err)
	}
	if remaining != 0 {
		t.Errorf("church_admins rows after deleting the user = %d, want 0", remaining)
	}
}
