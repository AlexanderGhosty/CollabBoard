package logger

import (
	"context"
	"crypto/rand"
	"encoding/hex"
)

// Context keys for storing values
type contextKey string

const (
	requestIDKey contextKey = "request_id"
	userIDKey    contextKey = "user_id"
	boardIDKey   contextKey = "board_id"
)

// GenerateRequestID generates a unique request ID
func GenerateRequestID() string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		// Fallback to a simple counter if random fails
		return "req-unknown"
	}
	return "req-" + hex.EncodeToString(bytes)
}

// WithRequestID adds request ID to context
func WithRequestIDContext(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, requestIDKey, requestID)
}

// WithUserIDContext adds user ID to context
func WithUserIDContext(ctx context.Context, userID int32) context.Context {
	return context.WithValue(ctx, userIDKey, userID)
}

// WithBoardIDContext adds board ID to context
func WithBoardIDContext(ctx context.Context, boardID int32) context.Context {
	return context.WithValue(ctx, boardIDKey, boardID)
}

// GetRequestID retrieves request ID from context
func GetRequestID(ctx context.Context) string {
	if reqID, ok := ctx.Value(requestIDKey).(string); ok {
		return reqID
	}
	return ""
}

// GetUserID retrieves user ID from context
func GetUserID(ctx context.Context) int32 {
	if userID, ok := ctx.Value(userIDKey).(int32); ok {
		return userID
	}
	return 0
}

// GetBoardID retrieves board ID from context
func GetBoardID(ctx context.Context) int32 {
	if boardID, ok := ctx.Value(boardIDKey).(int32); ok {
		return boardID
	}
	return 0
}
