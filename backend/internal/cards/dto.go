package cards

import "time"

// CreateCardRequest represents the request body for creating a card
type CreateCardRequest struct {
	Title       string `json:"title" binding:"required" example:"Fix login bug"`
	Description string `json:"description" example:"The login form is not validating email properly"`
	Position    int32  `json:"position" binding:"required" example:"1"`
}

// UpdateCardRequest represents the request body for updating a card
type UpdateCardRequest struct {
	Title       string `json:"title" example:"Fix login validation bug"`
	Description string `json:"description" example:"Updated description of the bug"`
	Position    *int32 `json:"position" example:"2"`
	ListID      *int32 `json:"listId" example:"3"`
}

// MoveCardRequest represents the request body for moving a card
type MoveCardRequest struct {
	ListID   *int32 `json:"listId" example:"2"`
	Position int32  `json:"position" binding:"required" example:"1"`
}

// CardResponse represents a card in API responses
type CardResponse struct {
	ID          int32     `json:"id" example:"1"`
	ListID      int32     `json:"listId" example:"1"`
	Title       string    `json:"title" example:"Fix login bug"`
	Description string    `json:"description" example:"The login form is not validating email properly"`
	Position    int32     `json:"position" example:"1"`
	CreatedAt   time.Time `json:"createdAt" example:"2023-01-01T00:00:00Z"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error" example:"Card not found"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message" example:"card deleted"`
}
