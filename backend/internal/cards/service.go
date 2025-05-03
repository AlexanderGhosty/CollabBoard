package cards

import (
	"context"
	"errors"
	"github.com/jackc/pgx/v5/pgtype"

	db "backend/internal/db/sqlc"
	"backend/internal/websocket"
)

type Service struct {
	repo *Repository
	q    *db.Queries
	hub  *websocket.Hub
}

func NewService(repo *Repository, q *db.Queries, hub *websocket.Hub) *Service {
	return &Service{repo: repo, q: q, hub: hub}
}

func (s *Service) Create(ctx context.Context, userID, listID int32, title string, description string, position int32) (db.Card, error) {
	lst, err := s.q.GetListByID(ctx, listID)
	if err != nil {
		return db.Card{}, err
	}
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: lst.BoardID, UserID: userID}); err != nil {
		return db.Card{}, errors.New("not a member")
	}
	card, err := s.repo.Create(ctx, db.CreateCardParams{ListID: listID, Title: title, Description: pgtype.Text{String: description, Valid: description != ""}, Position: position})
	if err == nil {
		s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "card_created", Data: card})
	}
	return card, err
}

// Update, Delete, Move etc. similar with broadcasts
