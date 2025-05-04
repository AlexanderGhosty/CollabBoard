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

func (s *Service) ListByList(ctx context.Context, userID, listID int32) ([]db.Card, error) {
	lst, err := s.q.GetListByID(ctx, listID)
	if err != nil {
		return nil, err
	}
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return nil, errors.New("not a member")
	}
	return s.repo.ListByList(ctx, listID)
}

func (s *Service) Update(ctx context.Context, userID int32, arg db.UpdateCardParams) (db.Card, error) {
	card0, err := s.q.GetCardByID(ctx, arg.ID)
	if err != nil {
		return db.Card{}, err
	}
	lst, err := s.q.GetListByID(ctx, card0.ListID)
	if err != nil {
		return db.Card{}, err
	}
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return db.Card{}, errors.New("not a member")
	}
	card, err := s.repo.Update(ctx, arg)
	if err == nil {
		s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "card_updated", Data: card})
	}
	return card, err
}

func (s *Service) Delete(ctx context.Context, userID, cardID int32) error {
	card0, err := s.q.GetCardByID(ctx, cardID)
	if err != nil {
		return err
	}
	lst, err := s.q.GetListByID(ctx, card0.ListID)
	if err != nil {
		return err
	}
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return errors.New("not a member")
	}
	if err := s.repo.Delete(ctx, cardID); err != nil {
		return err
	}
	s.hub.Broadcast(lst.BoardID, websocket.EventMessage{
		Event: "card_deleted", Data: map[string]int32{"id": cardID},
	})
	return nil
}
