package lists

import "time"

// CreateListRequest represents the request body for creating a list
type CreateListRequest struct {
	Title    string `json:"title" binding:"required" example:"To Do"`
	Position int32  `json:"position" binding:"required" example:"1"`
}

// UpdateListRequest represents the request body for updating a list
type UpdateListRequest struct {
	Title    string `json:"title" example:"In Progress"`
	Position *int32 `json:"position" example:"2"`
}

// MoveListRequest represents the request body for moving a list
type MoveListRequest struct {
	Position float64 `json:"position" binding:"required" example:"1.5"`
}

// ListResponse represents a list in API responses
type ListResponse struct {
	ID        int32     `json:"id" example:"1"`
	BoardID   int32     `json:"boardId" example:"1"`
	Title     string    `json:"title" example:"To Do"`
	Position  int32     `json:"position" example:"1"`
	CreatedAt time.Time `json:"createdAt" example:"2023-01-01T00:00:00Z"`
}

// NormalizePositionsResponse represents the response for position normalization
type NormalizePositionsResponse struct {
	Message string         `json:"message" example:"positions normalized"`
	Lists   []ListResponse `json:"lists"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error" example:"List not found"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message" example:"list deleted"`
}
