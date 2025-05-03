package auth

import (
	"net/http"

	"backend/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, svc *Service, jwtSecret string) {
	g := r.Group("/auth")
	g.POST("/register", registerHandler(svc))
	g.POST("/login", loginHandler(svc))
	g.GET("/me", middleware.Auth(jwtSecret), meHandler(svc))
}

func registerHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		token, user, err := svc.Register(c.Request.Context(), req.Name, req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, AuthResponse{Token: token, User: user})
	}
}

func loginHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		token, user, err := svc.Login(c.Request.Context(), req.Email, req.Password)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, AuthResponse{Token: token, User: user})
	}
}

func meHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := svc.GetUserByID(c.Request.Context(), int32(c.GetInt("userID")))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusOK, user)
	}
}
