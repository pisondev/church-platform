package server

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
)

const allowedOrigin = "http://localhost:3101"

type fakeDB struct{ err error }

func (f fakeDB) Ping(context.Context) error { return f.err }

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

func newTestRouter(db Pinger) *gin.Engine {
	return NewRouter(Options{
		Logger:         slog.New(slog.NewTextHandler(io.Discard, nil)),
		AllowedOrigins: []string{allowedOrigin},
		DB:             db,
	})
}

func do(router http.Handler, method, path string, headers map[string]string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	for key, value := range headers {
		req.Header.Set(key, value)
	}
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	return rec
}

func errorCode(t *testing.T, rec *httptest.ResponseRecorder) string {
	t.Helper()
	var body struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode body %q: %v", rec.Body.String(), err)
	}
	if body.Error.Message == "" {
		t.Errorf("error message is empty in %q", rec.Body.String())
	}
	return body.Error.Code
}

func TestHealthz(t *testing.T) {
	rec := do(newTestRouter(fakeDB{}), http.MethodGet, "/healthz", nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := rec.Body.String(); got != `{"status":"ok"}` {
		t.Errorf("body = %s", got)
	}
}

func TestReadyz(t *testing.T) {
	tests := []struct {
		name     string
		db       Pinger
		wantCode int
	}{
		{"database up", fakeDB{}, http.StatusOK},
		{"database down", fakeDB{err: errors.New("connection refused")}, http.StatusServiceUnavailable},
		{"database missing", nil, http.StatusServiceUnavailable},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(newTestRouter(tt.db), http.MethodGet, "/readyz", nil)

			if rec.Code != tt.wantCode {
				t.Fatalf("status = %d, want %d", rec.Code, tt.wantCode)
			}
			if tt.wantCode != http.StatusOK {
				if code := errorCode(t, rec); code != "database_unavailable" {
					t.Errorf("error code = %q", code)
				}
			}
		})
	}
}

func TestUnknownRouteAndMethod(t *testing.T) {
	router := newTestRouter(fakeDB{})

	rec := do(router, http.MethodGet, "/nope", nil)
	if rec.Code != http.StatusNotFound || errorCode(t, rec) != "not_found" {
		t.Errorf("unknown route: status = %d, body = %s", rec.Code, rec.Body.String())
	}

	rec = do(router, http.MethodPost, "/healthz", nil)
	if rec.Code != http.StatusMethodNotAllowed || errorCode(t, rec) != "method_not_allowed" {
		t.Errorf("wrong method: status = %d, body = %s", rec.Code, rec.Body.String())
	}
}

func TestRequestID(t *testing.T) {
	router := newTestRouter(fakeDB{})

	rec := do(router, http.MethodGet, "/healthz", map[string]string{requestIDHeader: "trace-123"})
	if got := rec.Header().Get(requestIDHeader); got != "trace-123" {
		t.Errorf("well-formed id not reused: %q", got)
	}

	rec = do(router, http.MethodGet, "/healthz", map[string]string{requestIDHeader: "bad id\twith spaces"})
	if got := rec.Header().Get(requestIDHeader); len(got) != 32 {
		t.Errorf("malformed id not replaced: %q", got)
	}

	first := do(router, http.MethodGet, "/healthz", nil).Header().Get(requestIDHeader)
	second := do(router, http.MethodGet, "/healthz", nil).Header().Get(requestIDHeader)
	if first == "" || first == second {
		t.Errorf("generated ids are not unique: %q, %q", first, second)
	}
}

func TestCORS(t *testing.T) {
	router := newTestRouter(fakeDB{})
	preflight := func(origin string) *httptest.ResponseRecorder {
		return do(router, http.MethodOptions, "/healthz", map[string]string{
			"Origin":                        origin,
			"Access-Control-Request-Method": http.MethodGet,
		})
	}

	rec := preflight(allowedOrigin)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != allowedOrigin {
		t.Errorf("allowed origin: Access-Control-Allow-Origin = %q", got)
	}
	if got := rec.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Errorf("allowed origin: Access-Control-Allow-Credentials = %q", got)
	}

	rec = preflight("https://evil.example")
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Errorf("foreign origin was allowed: %q", got)
	}
	if rec.Code != http.StatusForbidden {
		t.Errorf("foreign origin: status = %d, want 403", rec.Code)
	}
}

func TestPanicBecomesInternalError(t *testing.T) {
	router := newTestRouter(fakeDB{})
	router.GET("/boom", func(*gin.Context) { panic("boom") })

	rec := do(router, http.MethodGet, "/boom", nil)
	if rec.Code != http.StatusInternalServerError || errorCode(t, rec) != "internal_error" {
		t.Errorf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}
