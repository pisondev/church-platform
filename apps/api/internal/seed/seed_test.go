package seed_test

import (
	"context"
	"testing"

	"github.com/pisondev/church-platform/apps/api/internal/database"
	"github.com/pisondev/church-platform/apps/api/internal/seed"
	"github.com/pisondev/church-platform/apps/api/internal/testdb"
)

func TestRunIsIdempotent(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	if _, err := database.Migrate(ctx, pool); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	// An existing regular user listed as super admin must be promoted, not duplicated.
	if _, err := pool.Exec(ctx, "INSERT INTO users (email) VALUES ('existing@example.com')"); err != nil {
		t.Fatalf("insert existing user: %v", err)
	}

	opts := seed.Options{SuperAdminEmails: []string{" Owner@Example.com ", "existing@example.com", ""}}
	for run := 1; run <= 2; run++ {
		if err := seed.Run(ctx, pool, opts); err != nil {
			t.Fatalf("Run #%d: %v", run, err)
		}
	}

	var name, status string
	err := pool.QueryRow(ctx, "SELECT name, status FROM churches WHERE slug = $1", seed.FirstChurchSlug).Scan(&name, &status)
	if err != nil {
		t.Fatalf("load seeded church: %v", err)
	}
	if name != seed.FirstChurchName || status != "active" {
		t.Errorf("church = %q (%s)", name, status)
	}

	counts := map[string]int{
		"SELECT count(*) FROM churches":                                                   1,
		"SELECT count(*) FROM users":                                                      2,
		"SELECT count(*) FROM users WHERE is_super_admin":                                 2,
		"SELECT count(*) FROM users WHERE email = 'owner@example.com' AND is_super_admin": 1,
	}
	for query, want := range counts {
		var got int
		if err := pool.QueryRow(ctx, query).Scan(&got); err != nil {
			t.Fatalf("%s: %v", query, err)
		}
		if got != want {
			t.Errorf("%s = %d, want %d", query, got, want)
		}
	}
}
