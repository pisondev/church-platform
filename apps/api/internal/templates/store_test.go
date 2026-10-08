package templates_test

import (
	"context"
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/pisondev/church-platform/apps/api/internal/auth"
	"github.com/pisondev/church-platform/apps/api/internal/database"
	"github.com/pisondev/church-platform/apps/api/internal/templates"
	"github.com/pisondev/church-platform/apps/api/internal/testdb"
)

type fixture struct {
	store *templates.PostgresStore
	pool  *pgxpool.Pool
	owner auth.User // Super Admin
	admin auth.User // Church Admin of "alpha"
	idle  auth.User // signed-in user without a church
	alpha string    // church id
}

func setup(t *testing.T) fixture {
	t.Helper()
	pool := testdb.New(t)
	ctx := context.Background()
	if _, err := database.Migrate(ctx, pool); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	exec := func(sql string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, sql, args...); err != nil {
			t.Fatalf("%s: %v", sql, err)
		}
	}
	id := func(sql string, args ...any) string {
		t.Helper()
		var value string
		if err := pool.QueryRow(ctx, sql, args...).Scan(&value); err != nil {
			t.Fatalf("%s: %v", sql, err)
		}
		return value
	}

	exec(`INSERT INTO churches (name, slug) VALUES ('Alpha Church', 'alpha'), ('Beta Church', 'beta')`)
	exec(`INSERT INTO churches (name, slug, deleted_at) VALUES ('Closed Church', 'closed', now())`)
	exec(`INSERT INTO users (email, is_super_admin) VALUES ('owner@example.com', true), ('admin@example.com', false), ('idle@example.com', false)`)
	exec(`INSERT INTO church_admins (church_id, user_id)
		SELECT c.id, u.id FROM churches c, users u WHERE c.slug = 'alpha' AND u.email = 'admin@example.com'`)

	f := fixture{store: templates.NewPostgresStore(pool), pool: pool}
	f.alpha = id(`SELECT id::text FROM churches WHERE slug = 'alpha'`)
	f.owner = auth.User{ID: id(`SELECT id::text FROM users WHERE email = 'owner@example.com'`), IsSuperAdmin: true}
	f.admin = auth.User{ID: id(`SELECT id::text FROM users WHERE email = 'admin@example.com'`)}
	f.idle = auth.User{ID: id(`SELECT id::text FROM users WHERE email = 'idle@example.com'`)}

	exec(`INSERT INTO templates (church_id, name) VALUES ($1, 'Liturgi Umum'), ($1, 'Liturgi Paskah')`, f.alpha)
	exec(`INSERT INTO templates (church_id, name, deleted_at) VALUES ($1, 'Removed', now())`, f.alpha)
	exec(`INSERT INTO template_slides (template_id, position, kind, content)
		SELECT id, 2, 'song', '{}'::jsonb FROM templates WHERE name = 'Liturgi Umum'`)
	exec(`INSERT INTO template_slides (template_id, position, kind, content)
		SELECT id, 1, 'cover', '{"title": "Selamat Datang"}'::jsonb FROM templates WHERE name = 'Liturgi Umum'`)
	return f
}

func TestChurchForUser(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	tests := []struct {
		name    string
		slug    string
		user    auth.User
		allowed bool
	}{
		{"super admin sees any church", "beta", f.owner, true},
		{"church admin sees their church", "alpha", f.admin, true},
		{"church admin cannot see another church", "beta", f.admin, false},
		{"a user without a church sees none", "alpha", f.idle, false},
		{"a deleted church is gone, even for a super admin", "closed", f.owner, false},
		{"an unknown slug", "nowhere", f.owner, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			church, err := f.store.ChurchForUser(ctx, tt.slug, tt.user)
			if tt.allowed {
				if err != nil || church.Slug != tt.slug || church.Status != "active" {
					t.Errorf("church = %+v, err = %v", church, err)
				}
				return
			}
			if !errors.Is(err, templates.ErrNotFound) {
				t.Errorf("err = %v, want ErrNotFound", err)
			}
		})
	}
}

func TestListAndGet(t *testing.T) {
	f := setup(t)
	ctx := context.Background()

	list, err := f.store.List(ctx, f.alpha)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(list) != 2 || list[0].Name != "Liturgi Paskah" || list[1].Name != "Liturgi Umum" {
		t.Fatalf("list = %+v, want the two live templates by name", list)
	}
	if list[1].SlideCount != 2 || list[1].AspectRatio != "16:9" || list[0].SlideCount != 0 {
		t.Errorf("summaries = %+v", list)
	}

	template, err := f.store.Get(ctx, f.alpha, list[1].ID)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if len(template.Slides) != 2 || template.Slides[0].Kind != "cover" || template.Slides[1].Kind != "song" {
		t.Fatalf("slides = %+v, want cover then song", template.Slides)
	}
	if got := string(template.Slides[0].Content); got != `{"title": "Selamat Datang"}` {
		t.Errorf("cover content = %s", got)
	}

	empty, err := f.store.Get(ctx, f.alpha, list[0].ID)
	if err != nil || empty.Slides == nil || len(empty.Slides) != 0 {
		t.Errorf("empty template slides = %v (err = %v), want an empty list", empty.Slides, err)
	}
}

func TestGetStaysInsideTheChurch(t *testing.T) {
	f := setup(t)
	ctx := context.Background()
	list, _ := f.store.List(ctx, f.alpha)

	var beta, removed string
	if err := f.pool.QueryRow(ctx, `SELECT id::text FROM churches WHERE slug = 'beta'`).Scan(&beta); err != nil {
		t.Fatalf("beta id: %v", err)
	}
	if err := f.pool.QueryRow(ctx, `SELECT id::text FROM templates WHERE name = 'Removed'`).Scan(&removed); err != nil {
		t.Fatalf("removed id: %v", err)
	}

	if _, err := f.store.Get(ctx, beta, list[0].ID); !errors.Is(err, templates.ErrNotFound) {
		t.Errorf("template of another church: err = %v, want ErrNotFound", err)
	}
	if _, err := f.store.Get(ctx, f.alpha, removed); !errors.Is(err, templates.ErrNotFound) {
		t.Errorf("deleted template: err = %v, want ErrNotFound", err)
	}
}
