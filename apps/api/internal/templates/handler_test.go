package templates

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/pisondev/church-platform/apps/api/internal/auth"
)

const templateID = "11111111-2222-3333-4444-555555555555"

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

// fakeStore serves one church with one template, or a forced error.
type fakeStore struct {
	err error
}

var testChurch = Church{ID: "church-1", Name: "GKJ Sentolo", Slug: "gkj-sentolo", Status: "active"}

func (s fakeStore) ChurchForUser(_ context.Context, slug string, _ auth.User) (Church, error) {
	if s.err != nil {
		return Church{}, s.err
	}
	if slug != testChurch.Slug {
		return Church{}, ErrNotFound
	}
	return testChurch, nil
}

func (s fakeStore) List(_ context.Context, churchID string) ([]Summary, error) {
	return []Summary{{ID: templateID, Name: "Liturgi Umum", AspectRatio: "16:9", SlideCount: 2}}, nil
}

func (s fakeStore) Get(_ context.Context, churchID, id string) (Template, error) {
	if id != templateID {
		return Template{}, ErrNotFound
	}
	return Template{
		Summary: Summary{ID: templateID, Name: "Liturgi Umum", AspectRatio: "16:9", SlideCount: 2},
		Slides: []Slide{
			{ID: "s1", Position: 1, Kind: "cover", Content: json.RawMessage(`{"title":"Selamat Datang"}`)},
			{ID: "s2", Position: 2, Kind: "song", Content: json.RawMessage(`{}`)},
		},
	}, nil
}

// signedIn stands in for the session middleware.
func signedIn(c *gin.Context) {
	auth.SetCurrentUser(c, auth.User{ID: "user-1", Email: "admin@example.com", Status: "active"})
	c.Next()
}

func rejectAll(c *gin.Context) {
	c.AbortWithStatus(http.StatusUnauthorized)
}

func newRouter(store Store, requireUser gin.HandlerFunc) *gin.Engine {
	router := gin.New()
	NewHandler(store, requireUser, slog.New(slog.NewTextHandler(io.Discard, nil))).Register(router.Group("/api/v1"))
	return router
}

func get(router http.Handler, path string) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestEveryRouteNeedsASession(t *testing.T) {
	router := newRouter(fakeStore{}, rejectAll)

	for _, path := range []string{
		"/api/v1/churches/gkj-sentolo",
		"/api/v1/churches/gkj-sentolo/templates",
		"/api/v1/churches/gkj-sentolo/templates/" + templateID,
	} {
		if rec := get(router, path); rec.Code != http.StatusUnauthorized {
			t.Errorf("%s: status = %d, want 401", path, rec.Code)
		}
	}
}

func TestChurch(t *testing.T) {
	router := newRouter(fakeStore{}, signedIn)

	rec := get(router, "/api/v1/churches/gkj-sentolo")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Church Church `json:"church"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body.Church != testChurch {
		t.Errorf("church = %+v (err = %v)", body.Church, err)
	}
}

func TestListTemplates(t *testing.T) {
	router := newRouter(fakeStore{}, signedIn)

	rec := get(router, "/api/v1/churches/gkj-sentolo/templates")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Church    Church    `json:"church"`
		Templates []Summary `json:"templates"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Church.Slug != "gkj-sentolo" || len(body.Templates) != 1 || body.Templates[0].SlideCount != 2 {
		t.Errorf("body = %+v", body)
	}
}

func TestGetTemplate(t *testing.T) {
	router := newRouter(fakeStore{}, signedIn)

	rec := get(router, "/api/v1/churches/gkj-sentolo/templates/"+templateID)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var body struct {
		Template struct {
			Name        string  `json:"name"`
			AspectRatio string  `json:"aspectRatio"`
			Slides      []Slide `json:"slides"`
		} `json:"template"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if body.Template.Name != "Liturgi Umum" || body.Template.AspectRatio != "16:9" || len(body.Template.Slides) != 2 {
		t.Fatalf("template = %+v", body.Template)
	}
	if first := body.Template.Slides[0]; first.Kind != "cover" || string(first.Content) != `{"title":"Selamat Datang"}` {
		t.Errorf("first slide = %+v", first)
	}
}

func TestNotFound(t *testing.T) {
	router := newRouter(fakeStore{}, signedIn)

	for name, path := range map[string]string{
		"church the user cannot see": "/api/v1/churches/other-church",
		"its templates":              "/api/v1/churches/other-church/templates",
		"unknown template":           "/api/v1/churches/gkj-sentolo/templates/99999999-2222-3333-4444-555555555555",
		"malformed template id":      "/api/v1/churches/gkj-sentolo/templates/not-a-uuid",
	} {
		rec := get(router, path)
		if rec.Code != http.StatusNotFound {
			t.Errorf("%s: status = %d, want 404", name, rec.Code)
		}
	}
}

func TestStoreFailureIsAnInternalError(t *testing.T) {
	router := newRouter(fakeStore{err: errors.New("database down")}, signedIn)

	if rec := get(router, "/api/v1/churches/gkj-sentolo"); rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", rec.Code)
	}
}
