package logger

import (
	"backend/internal/config"
	"context"
	"io"
	"log/slog"
	"os"
	"strings"
)

var (
	// Global logger instance
	defaultLogger *slog.Logger
)

// Initialize sets up the global logger based on configuration
func Initialize(cfg config.LogConfig) error {
	// Parse log level
	level := parseLogLevel(cfg.Level)
	
	// Setup output writer
	var writer io.Writer
	switch strings.ToLower(cfg.Output) {
	case "file":
		// For Docker compatibility, we'll still use stdout even if file is specified
		// In production, Docker can redirect stdout to files
		writer = os.Stdout
	default:
		writer = os.Stdout
	}

	// Setup handler based on format
	var handler slog.Handler
	opts := &slog.HandlerOptions{
		Level: level,
		AddSource: level == slog.LevelDebug, // Add source info for debug level
	}

	switch strings.ToLower(cfg.Format) {
	case "text":
		handler = slog.NewTextHandler(writer, opts)
	default:
		handler = slog.NewJSONHandler(writer, opts)
	}

	defaultLogger = slog.New(handler)
	slog.SetDefault(defaultLogger)

	return nil
}

// parseLogLevel converts string log level to slog.Level
func parseLogLevel(level string) slog.Level {
	switch strings.ToUpper(level) {
	case "DEBUG":
		return slog.LevelDebug
	case "INFO":
		return slog.LevelInfo
	case "WARN", "WARNING":
		return slog.LevelWarn
	case "ERROR":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Get returns the global logger instance
func Get() *slog.Logger {
	if defaultLogger == nil {
		// Fallback to default logger if not initialized
		return slog.Default()
	}
	return defaultLogger
}

// WithContext returns a logger with context values
func WithContext(ctx context.Context) *slog.Logger {
	logger := Get()
	
	// Add request ID if available
	if reqID := GetRequestID(ctx); reqID != "" {
		logger = logger.With("request_id", reqID)
	}
	
	// Add user ID if available
	if userID := GetUserID(ctx); userID != 0 {
		logger = logger.With("user_id", userID)
	}
	
	// Add board ID if available
	if boardID := GetBoardID(ctx); boardID != 0 {
		logger = logger.With("board_id", boardID)
	}
	
	return logger
}

// WithRequestID returns a logger with request ID
func WithRequestID(requestID string) *slog.Logger {
	return Get().With("request_id", requestID)
}

// WithUserID returns a logger with user ID
func WithUserID(userID int32) *slog.Logger {
	return Get().With("user_id", userID)
}

// WithBoardID returns a logger with board ID
func WithBoardID(boardID int32) *slog.Logger {
	return Get().With("board_id", boardID)
}

// WithError returns a logger with error details
func WithError(err error) *slog.Logger {
	return Get().With("error", err.Error())
}

// Convenience methods for common logging patterns

// Info logs an info message
func Info(msg string, args ...any) {
	Get().Info(msg, args...)
}

// Debug logs a debug message
func Debug(msg string, args ...any) {
	Get().Debug(msg, args...)
}

// Warn logs a warning message
func Warn(msg string, args ...any) {
	Get().Warn(msg, args...)
}

// Error logs an error message
func Error(msg string, args ...any) {
	Get().Error(msg, args...)
}

// Fatal logs a fatal message and exits
func Fatal(msg string, args ...any) {
	Get().Error(msg, args...)
	os.Exit(1)
}

// HTTP request logging helpers

// LogHTTPRequest logs an HTTP request with structured fields
func LogHTTPRequest(ctx context.Context, method, path string, statusCode int, duration int64) {
	WithContext(ctx).Info("HTTP request completed",
		"method", method,
		"path", path,
		"status_code", statusCode,
		"duration_ms", duration,
	)
}

// LogHTTPError logs an HTTP error with structured fields
func LogHTTPError(ctx context.Context, method, path string, statusCode int, err error) {
	WithContext(ctx).Error("HTTP request failed",
		"method", method,
		"path", path,
		"status_code", statusCode,
		"error", err.Error(),
	)
}

// WebSocket logging helpers

// LogWebSocketConnection logs WebSocket connection events
func LogWebSocketConnection(userID, boardID int32, event string) {
	Get().Info("WebSocket connection event",
		"event", event,
		"user_id", userID,
		"board_id", boardID,
	)
}

// LogWebSocketMessage logs WebSocket message events
func LogWebSocketMessage(userID, boardID int32, event string, data any) {
	Get().Debug("WebSocket message",
		"event", event,
		"user_id", userID,
		"board_id", boardID,
		"data", data,
	)
}

// Database operation logging helpers

// LogDBOperation logs database operations
func LogDBOperation(ctx context.Context, operation, table string, duration int64) {
	WithContext(ctx).Debug("Database operation",
		"operation", operation,
		"table", table,
		"duration_ms", duration,
	)
}

// LogDBError logs database errors
func LogDBError(ctx context.Context, operation, table string, err error) {
	WithContext(ctx).Error("Database operation failed",
		"operation", operation,
		"table", table,
		"error", err.Error(),
	)
}

// Business logic logging helpers

// LogServiceOperation logs service layer operations
func LogServiceOperation(ctx context.Context, service, operation string, args ...any) {
	logger := WithContext(ctx).With("service", service, "operation", operation)
	logger.Info("Service operation", args...)
}

// LogServiceError logs service layer errors
func LogServiceError(ctx context.Context, service, operation string, err error, args ...any) {
	logger := WithContext(ctx).With("service", service, "operation", operation, "error", err.Error())
	logger.Error("Service operation failed", args...)
}
