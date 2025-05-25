package auth

import (
	"net/http"

	"backend/internal/logger"
	"backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, svc *Service, jwtSecret string) {
	g := r.Group("/auth")
	g.POST("/register", registerHandler(svc))
	g.POST("/login", loginHandler(svc))
	g.GET("/me", middleware.Auth(jwtSecret), meHandler(svc))
	g.POST("/change-password", middleware.Auth(jwtSecret), changePasswordHandler(svc))
}

func registerHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req RegisterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			logger.WithContext(c.Request.Context()).Warn("Registration failed: invalid request format",
				"error", err.Error(),
				"remote_addr", c.ClientIP(),
			)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		logger.WithContext(c.Request.Context()).Info("Registration attempt",
			"name", req.Name,
			"email", req.Email,
			"remote_addr", c.ClientIP(),
		)
		token, user, err := svc.Register(c.Request.Context(), req.Name, req.Email, req.Password)
		if err != nil {
			logger.WithContext(c.Request.Context()).Warn("Registration failed",
				"email", req.Email,
				"error", err.Error(),
				"remote_addr", c.ClientIP(),
			)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		logger.WithContext(c.Request.Context()).Info("Registration successful",
			"user_id", user.ID,
			"email", user.Email,
			"remote_addr", c.ClientIP(),
		)
		c.JSON(http.StatusOK, AuthResponse{Token: token, User: user})
	}
}

func loginHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			logger.WithContext(c.Request.Context()).Warn("Login failed: invalid request format",
				"error", err.Error(),
				"remote_addr", c.ClientIP(),
			)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		logger.WithContext(c.Request.Context()).Info("Login attempt",
			"email", req.Email,
			"remote_addr", c.ClientIP(),
		)
		token, user, err := svc.Login(c.Request.Context(), req.Email, req.Password)
		if err != nil {
			logger.WithContext(c.Request.Context()).Warn("Login failed",
				"email", req.Email,
				"error", err.Error(),
				"remote_addr", c.ClientIP(),
			)
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		logger.WithContext(c.Request.Context()).Info("Login successful",
			"user_id", user.ID,
			"email", user.Email,
			"remote_addr", c.ClientIP(),
		)
		c.JSON(http.StatusOK, AuthResponse{Token: token, User: user})
	}
}

func meHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := int32(c.GetInt("userID"))
		user, err := svc.GetUserByID(c.Request.Context(), userID)
		if err != nil {
			logger.WithContext(c.Request.Context()).Error("Failed to get user profile",
				"user_id", userID,
				"error", err.Error(),
			)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "user not found"})
			return
		}
		logger.WithContext(c.Request.Context()).Debug("User profile retrieved",
			"user_id", userID,
		)
		c.JSON(http.StatusOK, user)
	}
}

func changePasswordHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req ChangePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			logger.WithContext(c.Request.Context()).Warn("Password change failed: invalid request format",
				"error", err.Error(),
				"remote_addr", c.ClientIP(),
			)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID := int32(c.GetInt("userID"))
		logger.WithContext(c.Request.Context()).Info("Password change attempt",
			"user_id", userID,
			"remote_addr", c.ClientIP(),
		)

		err := svc.ChangePassword(c.Request.Context(), userID, req.CurrentPassword, req.NewPassword)
		if err != nil {
			status := http.StatusInternalServerError
			if err == ErrInvalidPassword {
				status = http.StatusBadRequest
			}
			logger.WithContext(c.Request.Context()).Warn("Password change failed",
				"user_id", userID,
				"error", err.Error(),
				"remote_addr", c.ClientIP(),
			)
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}

		logger.WithContext(c.Request.Context()).Info("Password change successful",
			"user_id", userID,
			"remote_addr", c.ClientIP(),
		)
		c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
	}
}
