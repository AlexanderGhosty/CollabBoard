package middleware

import (
	"backend/internal/logger"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// Auth verifies JWT and stores userID in context (key: "userID").
func Auth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := logger.GetRequestID(c.Request.Context())

		header := c.GetHeader("Authorization")
		if header == "" {
			logger.WithRequestID(requestID).Warn("Authentication failed: missing auth header",
				"path", c.Request.URL.Path,
				"remote_addr", c.ClientIP(),
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing auth header"})
			return
		}
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			logger.WithRequestID(requestID).Warn("Authentication failed: invalid auth header format",
				"path", c.Request.URL.Path,
				"remote_addr", c.ClientIP(),
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid auth header"})
			return
		}
		tokenStr := parts[1]
		token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrTokenUnverifiable
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			logger.WithRequestID(requestID).Warn("Authentication failed: invalid token",
				"path", c.Request.URL.Path,
				"remote_addr", c.ClientIP(),
				"error", err,
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			logger.WithRequestID(requestID).Warn("Authentication failed: invalid claims",
				"path", c.Request.URL.Path,
				"remote_addr", c.ClientIP(),
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid claims"})
			return
		}
		sub, ok := claims["sub"].(string)
		if !ok {
			logger.WithRequestID(requestID).Warn("Authentication failed: invalid subject",
				"path", c.Request.URL.Path,
				"remote_addr", c.ClientIP(),
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid subject"})
			return
		}
		uid, err := strconv.Atoi(sub)
		if err != nil {
			logger.WithRequestID(requestID).Warn("Authentication failed: invalid subject format",
				"path", c.Request.URL.Path,
				"remote_addr", c.ClientIP(),
				"error", err,
			)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid subject"})
			return
		}

		// Store user ID in Gin context
		c.Set("userID", uid)

		// Add user ID to request context for logging
		ctx := logger.WithUserIDContext(c.Request.Context(), int32(uid))
		c.Request = c.Request.WithContext(ctx)

		logger.WithRequestID(requestID).Debug("Authentication successful",
			"user_id", uid,
			"path", c.Request.URL.Path,
		)

		c.Next()
	}
}
