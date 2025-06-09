package auth

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Name     string `json:"name" binding:"required" example:"John Doe"`
	Email    string `json:"email" binding:"required,email" example:"john@example.com"`
	Password string `json:"password" binding:"required,min=6" example:"password123"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email" example:"john@example.com"`
	Password string `json:"password" binding:"required" example:"password123"`
}

// ChangePasswordRequest represents the request body for changing password
type ChangePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required" example:"oldpassword"`
	NewPassword     string `json:"newPassword" binding:"required,min=6" example:"newpassword123"`
}

// AuthResponse represents the response body for authentication endpoints
type AuthResponse struct {
	Token string     `json:"token" example:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."`
	User  UserPublic `json:"user"`
}

// UserPublic represents public user information
type UserPublic struct {
	ID    int32  `json:"id" example:"1"`
	Name  string `json:"name" example:"John Doe"`
	Email string `json:"email" example:"john@example.com"`
}

// ErrorResponse represents an error response
type ErrorResponse struct {
	Error string `json:"error" example:"Invalid credentials"`
}

// MessageResponse represents a simple message response
type MessageResponse struct {
	Message string `json:"message" example:"Password changed successfully"`
}
