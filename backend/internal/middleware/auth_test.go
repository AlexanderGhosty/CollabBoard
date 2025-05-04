// internal/middleware/auth_test.go
package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func token(t *testing.T, secret string, sub string) string {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": sub})
	s, err := tok.SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("sign token: %v", err)
	}
	return s
}

func TestAuth_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	secret := "topsecret"
	tests := []struct {
		name           string
		header         string
		expectedStatus int
		expectNext     bool
	}{
		{"NoHeader", "", http.StatusUnauthorized, false},
		{"BadHeader", "Bad token", http.StatusUnauthorized, false},
		{"InvalidToken", "Bearer notajwt", http.StatusUnauthorized, false},
		{"ValidToken", "Bearer " + token(t, secret, "123"), http.StatusOK, true},
	}

	for _, tc := range tests {
		w := httptest.NewRecorder()
		r, _ := http.NewRequest(http.MethodGet, "/protected", nil)
		if tc.header != "" {
			r.Header.Set("Authorization", tc.header)
		}

		router := gin.New()
		router.Use(Auth(secret))
		router.GET("/protected", func(c *gin.Context) {
			uid, _ := c.Get("userID")
			c.JSON(http.StatusOK, gin.H{"userID": uid})
		})

		router.ServeHTTP(w, r)
		assert.Equal(t, tc.expectedStatus, w.Code, tc.name)

		if tc.expectNext {
			assert.Contains(t, w.Body.String(), `"userID":123`, tc.name)
		}
	}
}
