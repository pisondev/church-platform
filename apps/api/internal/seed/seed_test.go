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
		"SELECT count(*) FROM templates":                                                  1,
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

func TestRunSeedsTheFirstTemplate(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	if _, err := database.Migrate(ctx, pool); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if err := seed.Run(ctx, pool, seed.Options{}); err != nil {
		t.Fatalf("Run: %v", err)
	}

	var templateID, ratio string
	err := pool.QueryRow(ctx, `
		SELECT t.id::text, t.aspect_ratio
		FROM templates t JOIN churches c ON c.id = t.church_id
		WHERE c.slug = $1 AND t.name = $2`, seed.FirstChurchSlug, seed.FirstTemplateName).Scan(&templateID, &ratio)
	if err != nil {
		t.Fatalf("load seeded template: %v", err)
	}
	if ratio != "16:9" {
		t.Errorf("aspect ratio = %s, want 16:9", ratio)
	}

	var slides, first, last, gaps int
	err = pool.QueryRow(ctx, `
		SELECT count(*), min(position), max(position), max(position) - count(*)
		FROM template_slides WHERE template_id = $1`, templateID).Scan(&slides, &first, &last, &gaps)
	if err != nil {
		t.Fatalf("count slides: %v", err)
	}
	if slides < 40 || first != 1 || gaps != 0 {
		t.Errorf("slides = %d, positions %d..%d with %d gaps", slides, first, last, gaps)
	}

	var firstKind, coverTitle string
	err = pool.QueryRow(ctx, `
		SELECT kind, content->>'title' FROM template_slides WHERE template_id = $1 AND position = 1`,
		templateID).Scan(&firstKind, &coverTitle)
	if err != nil || firstKind != "cover" || coverTitle == "" {
		t.Errorf("first slide = %s %q (err = %v), want a cover with a title", firstKind, coverTitle, err)
	}

	kinds := map[string]int{}
	rows, err := pool.Query(ctx, `SELECT kind, count(*) FROM template_slides WHERE template_id = $1 GROUP BY kind`, templateID)
	if err != nil {
		t.Fatalf("group slides: %v", err)
	}
	defer rows.Close()
	for rows.Next() {
		var kind string
		var count int
		if err := rows.Scan(&kind, &count); err != nil {
			t.Fatalf("scan: %v", err)
		}
		kinds[kind] = count
	}
	for _, kind := range []string{"cover", "section", "song", "scripture", "responsive_reading"} {
		if kinds[kind] == 0 {
			t.Errorf("no %s slide in the first template", kind)
		}
	}
	if kinds["cover"] != 1 {
		t.Errorf("cover slides = %d, want 1", kinds["cover"])
	}
}

func TestRunKeepsAnEditedTemplate(t *testing.T) {
	pool := testdb.New(t)
	ctx := context.Background()
	if _, err := database.Migrate(ctx, pool); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if err := seed.Run(ctx, pool, seed.Options{}); err != nil {
		t.Fatalf("Run: %v", err)
	}

	// Someone trims the template in the app; a re-seed must not restore the slides.
	if _, err := pool.Exec(ctx, "DELETE FROM template_slides WHERE position > 3"); err != nil {
		t.Fatalf("trim template: %v", err)
	}
	if err := seed.Run(ctx, pool, seed.Options{}); err != nil {
		t.Fatalf("second Run: %v", err)
	}

	var slides int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM template_slides").Scan(&slides); err != nil {
		t.Fatalf("count: %v", err)
	}
	if slides != 3 {
		t.Errorf("slides after re-seed = %d, want 3", slides)
	}
}
