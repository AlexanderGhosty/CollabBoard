package boards

import (
	"time"

	db "backend/internal/db/sqlc"
)

// BoardEventPayload describes the payload sent via WebSocket events related to boards.
type BoardEventPayload struct {
	ID        int32      `json:"id"`
	Name      string     `json:"name,omitempty"`
	OwnerID   int32      `json:"ownerId,omitempty"`
	CreatedAt *time.Time `json:"createdAt,omitempty"`
	Role      string     `json:"role,omitempty"`
}

// newBoardEventPayload converts a database board record to a WebSocket payload.
func newBoardEventPayload(board db.Board) BoardEventPayload {
	payload := BoardEventPayload{
		ID:      board.ID,
		Name:    board.Name,
		OwnerID: board.OwnerID,
	}

	if board.CreatedAt.Valid {
		t := board.CreatedAt.Time
		payload.CreatedAt = &t
	}

	return payload
}
