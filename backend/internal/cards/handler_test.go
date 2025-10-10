package cards

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func TestCreateCardHandler_InvalidListID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/api/lists/abc/cards", strings.NewReader(`{"title":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r := gin.New()
	r.POST("/api/lists/:listId/cards", createCardHandler(nil))

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestListCardsHandler_InvalidListID(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/lists/abc/cards", nil)
	w := httptest.NewRecorder()

	r := gin.New()
	r.GET("/api/lists/:listId/cards", listCardsHandler(nil))

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestUpdateCardHandler_InvalidCardID(t *testing.T) {
	req := httptest.NewRequest(http.MethodPut, "/api/lists/1/cards/abc", strings.NewReader(`{"title":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	r := gin.New()
	r.PUT("/api/lists/:listId/cards/:id", updateCardHandler(nil))

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestDeleteCardHandler_InvalidCardID(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/lists/1/cards/abc", nil)
	w := httptest.NewRecorder()

	r := gin.New()
	r.DELETE("/api/lists/:listId/cards/:id", deleteCardHandler(nil))

	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}
