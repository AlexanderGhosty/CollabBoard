package logger

import (
	"time"

	"github.com/gin-gonic/gin"
)

// RequestLogging returns a Gin middleware that logs HTTP requests with structured logging
func RequestLogging() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate request ID
		requestID := GenerateRequestID()
		
		// Add request ID to context
		ctx := WithRequestIDContext(c.Request.Context(), requestID)
		c.Request = c.Request.WithContext(ctx)
		
		// Add request ID to response headers for tracing
		c.Header("X-Request-ID", requestID)
		
		// Record start time
		start := time.Now()
		
		// Log request start
		WithRequestID(requestID).Info("HTTP request started",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"query", c.Request.URL.RawQuery,
			"user_agent", c.Request.UserAgent(),
			"remote_addr", c.ClientIP(),
		)
		
		// Process request
		c.Next()
		
		// Calculate duration
		duration := time.Since(start)
		
		// Get status code
		statusCode := c.Writer.Status()
		
		// Log request completion
		logger := WithRequestID(requestID)
		
		// Add user ID if available from auth middleware
		if userID, exists := c.Get("userID"); exists {
			if uid, ok := userID.(int); ok {
				logger = logger.With("user_id", int32(uid))
			}
		}
		
		if statusCode >= 400 {
			// Log errors with more detail
			logger.Error("HTTP request completed with error",
				"method", c.Request.Method,
				"path", c.Request.URL.Path,
				"status_code", statusCode,
				"duration_ms", duration.Milliseconds(),
				"response_size", c.Writer.Size(),
			)
		} else {
			// Log successful requests
			logger.Info("HTTP request completed",
				"method", c.Request.Method,
				"path", c.Request.URL.Path,
				"status_code", statusCode,
				"duration_ms", duration.Milliseconds(),
				"response_size", c.Writer.Size(),
			)
		}
	}
}

// Recovery returns a Gin middleware that recovers from panics and logs them
func Recovery() gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		requestID := GetRequestID(c.Request.Context())
		
		WithRequestID(requestID).Error("HTTP request panic recovered",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"panic", recovered,
		)
		
		c.AbortWithStatus(500)
	})
}
