package templates

import (
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"

	"github.com/pisondev/church-platform/apps/api/internal/auth"
	"github.com/pisondev/church-platform/apps/api/internal/httpx"
)

// maxNameLength is the longest template name, in characters.
const maxNameLength = 120

var uuidPattern = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// Handler serves the church and template endpoints.
type Handler struct {
	store       Store
	requireUser gin.HandlerFunc
	logger      *slog.Logger
}

// NewHandler returns a Handler. requireUser must reject requests without a session.
func NewHandler(store Store, requireUser gin.HandlerFunc, logger *slog.Logger) *Handler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Handler{store: store, requireUser: requireUser, logger: logger}
}

// Register mounts the routes under <api>/churches/:slug.
func (h *Handler) Register(api gin.IRouter) {
	church := api.Group("/churches/:slug", h.requireUser)
	church.GET("", h.church)
	church.GET("/templates", h.list)
	church.GET("/templates/:id", h.get)
	church.PATCH("/templates/:id", h.rename)
}

// resolveChurch loads the church in the path, or answers 404 when the user may not see it.
func (h *Handler) resolveChurch(c *gin.Context) (Church, bool) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		httpx.Error(c, http.StatusUnauthorized, "unauthenticated", "sign in to continue")
		return Church{}, false
	}

	church, err := h.store.ChurchForUser(c.Request.Context(), c.Param("slug"), user)
	if errors.Is(err, ErrNotFound) {
		httpx.Error(c, http.StatusNotFound, "not_found", "church not found")
		return Church{}, false
	}
	if err != nil {
		h.fail(c, "load church", err)
		return Church{}, false
	}
	return church, true
}

func (h *Handler) church(c *gin.Context) {
	church, ok := h.resolveChurch(c)
	if !ok {
		return
	}
	c.JSON(http.StatusOK, gin.H{"church": church})
}

func (h *Handler) list(c *gin.Context) {
	church, ok := h.resolveChurch(c)
	if !ok {
		return
	}

	templates, err := h.store.List(c.Request.Context(), church.ID)
	if err != nil {
		h.fail(c, "list templates", err)
		return
	}
	if templates == nil {
		templates = []Summary{}
	}
	c.JSON(http.StatusOK, gin.H{"church": church, "templates": templates})
}

func (h *Handler) get(c *gin.Context) {
	church, ok := h.resolveChurch(c)
	if !ok {
		return
	}

	id := c.Param("id")
	if !uuidPattern.MatchString(id) {
		httpx.Error(c, http.StatusNotFound, "not_found", "template not found")
		return
	}
	template, err := h.store.Get(c.Request.Context(), church.ID, id)
	if errors.Is(err, ErrNotFound) {
		httpx.Error(c, http.StatusNotFound, "not_found", "template not found")
		return
	}
	if err != nil {
		h.fail(c, "load template", err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"church": church, "template": template})
}

// rename changes the name of a template. Body: {"name": "..."}.
func (h *Handler) rename(c *gin.Context) {
	church, ok := h.resolveChurch(c)
	if !ok {
		return
	}
	id := c.Param("id")
	if !uuidPattern.MatchString(id) {
		httpx.Error(c, http.StatusNotFound, "not_found", "template not found")
		return
	}

	var body struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		httpx.Error(c, http.StatusBadRequest, "invalid_body", "the request body must be JSON with a name")
		return
	}
	name := strings.TrimSpace(body.Name)
	if name == "" || utf8.RuneCountInString(name) > maxNameLength {
		httpx.Error(c, http.StatusBadRequest, "invalid_name", "the name must have 1 to 120 characters")
		return
	}

	summary, err := h.store.Rename(c.Request.Context(), church.ID, id, name)
	switch {
	case errors.Is(err, ErrNotFound):
		httpx.Error(c, http.StatusNotFound, "not_found", "template not found")
	case errors.Is(err, ErrNameTaken):
		httpx.Error(c, http.StatusConflict, "name_taken", "another template already has this name")
	case err != nil:
		h.fail(c, "rename template", err)
	default:
		c.JSON(http.StatusOK, gin.H{"template": summary})
	}
}

func (h *Handler) fail(c *gin.Context, what string, err error) {
	h.logger.ErrorContext(c.Request.Context(), what, "error", err)
	httpx.Error(c, http.StatusInternalServerError, "internal_error", "internal server error")
}
