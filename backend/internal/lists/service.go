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
	_ = s.repo.ShiftRight(ctx, boardID, position)
	lst, err := s.repo.Create(ctx, db.CreateListParams{BoardID: boardID, Title: title, Position: position})
	if err == nil {
		s.hub.Broadcast(boardID, websocket.EventMessage{Event: "list_created", Data: lst})
	}
	return lst, err
}

func (s *Service) ListByBoard(ctx context.Context, userID, boardID int32) ([]db.List, error) {
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return nil, errors.New("not a member")
	}
	return s.repo.ListByBoard(ctx, boardID)
}

func (s *Service) Update(ctx context.Context, userID int32, arg db.UpdateListParams) (db.List, error) {
	lst, err := s.q.GetListByID(ctx, arg.ID)
	if err != nil {
		return db.List{}, err
	}
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return db.List{}, errors.New("not a member")
	}
	updated, err := s.repo.Update(ctx, arg)
	if err == nil {
		s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "list_updated", Data: updated})
	}
	return updated, err
}

func (s *Service) Delete(ctx context.Context, userID, listID int32) error {
	lst, err := s.q.GetListByID(ctx, listID)
	if err != nil {
		return err
	}
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return errors.New("not a member")
	}
	if err := s.repo.Delete(ctx, listID); err != nil {
		return err
	}
	s.hub.Broadcast(lst.BoardID, websocket.EventMessage{
		Event: "list_deleted", Data: map[string]int32{"id": listID},
	})
	return nil
}

func (s *Service) Move(ctx context.Context, userID, listID, newPos int32) (db.List, error) {
	lst, _ := s.q.GetListByID(ctx, listID)
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: lst.BoardID, UserID: userID}); err != nil {
		return db.List{}, errors.New("not a member")
	}

	_ = s.repo.ShiftLeft(ctx, lst.BoardID, lst.Position)

	_ = s.repo.ShiftRight(ctx, lst.BoardID, newPos)

	updated, err := s.repo.Update(ctx, db.UpdateListParams{ID: listID, Position: newPos})
	if err == nil {
		s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "list_moved", Data: updated})
	}
	return updated, err
}
