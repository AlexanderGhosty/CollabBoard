package boards

import "time"

// CreateBoardRequest represents the request body for creating a board
type CreateBoardRequest struct {
	Name string `json:"name" binding:"required" example:"My Project Board"`
}

// UpdateBoardRequest represents the request body for updating a board
type UpdateBoardRequest struct {
	Name string `json:"name" binding:"required" example:"Updated Board Name"`
}

// AddMemberRequest represents the request body for adding a member to a board
type AddMemberRequest struct {
	UserID int32  `json:"userId" binding:"required" example:"2"`
	Role   string `json:"role" example:"member"`
}

// InviteMemberRequest represents the request body for inviting a member by email
type InviteMemberRequest struct {
	Email string `json:"email" binding:"required,email" example:"user@example.com"`
	Role  string `json:"role" example:"member"`
}

// BoardResponse represents a board in API responses
type BoardResponse struct {
	ID        int32     `json:"id" example:"1"`
	Name      string    `json:"name" example:"My Project Board"`
	OwnerID   int32     `json:"ownerId" example:"1"`
	Role      string    `json:"role" example:"owner"`
	CreatedAt time.Time `json:"createdAt" example:"2023-01-01T00:00:00Z"`
}

// BoardMemberResponse represents a board member in API responses
type BoardMemberResponse struct {
	BoardID int32  `json:"boardId" example:"1"`
	UserID  int32  `json:"userId" example:"2"`
	Role    string `json:"role" example:"member"`
	Name    string `json:"name" example:"John Doe"`
	Email   string `json:"email" example:"john@example.com"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error" example:"Board not found"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message" example:"Board deleted"`
}
