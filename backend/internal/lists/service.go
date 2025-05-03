package lists

import (
	"context"
	"errors"

	db "backend/internal/db/sqlc"
	"backend/internal/websocket"
)

type Service struct {
	repo *Repository
	q    *db.Queries // for cross‑repo checks
	hub  *websocket.Hub
}

func NewService(repo *Repository, q *db.Queries, hub *websocket.Hub) *Service {
	return &Service{repo: repo, q: q, hub: hub}
}

func (s *Service) Create(ctx context.Context, userID, boardID int32, title string, position int32) (db.List, error) {
	// check membership
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: boardID, UserID: userID}); err != nil {
		return db.List{}, errors.New("not a member")
	}
	lst, err := s.repo.Create(ctx, db.CreateListParams{BoardID: boardID, Title: title, Position: position})
	if err == nil {
		s.hub.Broadcast(boardID, websocket.EventMessage{Event: "list_created", Data: lst})
	}
	return lst, err
}

// Update, Delete, ListByBoard similar – broadcast on success
