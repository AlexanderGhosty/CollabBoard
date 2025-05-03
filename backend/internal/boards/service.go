package boards

import (
	"context"
	"errors"
	"github.com/gin-gonic/gin"

	db "backend/internal/db/sqlc"
	"backend/internal/websocket"
)

type Service struct {
	repo *Repository
	hub  *websocket.Hub
}

func NewService(repo *Repository, hub *websocket.Hub) *Service {
	return &Service{repo: repo, hub: hub}
}

var (
	ErrForbidden = errors.New("forbidden")
)

func (s *Service) CreateBoard(ctx context.Context, ownerID int32, name string) (db.Board, error) {
	b, err := s.repo.Create(ctx, db.CreateBoardParams{Name: name, OwnerID: ownerID})
	if err != nil {
		return db.Board{}, err
	}
	// owner automatically added as board_member inside migration trigger or here
	_, _ = s.repo.AddMember(ctx, db.AddBoardMemberParams{BoardID: b.ID, UserID: ownerID, Role: "owner"})

	s.hub.Broadcast(b.ID, websocket.EventMessage{Event: "board_created", Data: b})
	return b, nil
}

func (s *Service) ListBoards(ctx context.Context, userID int32) ([]db.ListBoardsByUserRow, error) {
	return s.repo.ListByUser(ctx, userID)
}

func (s *Service) UpdateBoard(ctx context.Context, userID int32, arg db.UpdateBoardParams) (db.Board, error) {
	member, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: arg.ID, UserID: userID})
	if err != nil || member.Role != "owner" {
		return db.Board{}, ErrForbidden
	}
	b, err := s.repo.Update(ctx, arg)
	if err == nil {
		s.hub.Broadcast(b.ID, websocket.EventMessage{Event: "board_updated", Data: b})
	}
	return b, err
}

func (s *Service) DeleteBoard(ctx context.Context, userID, boardID int32) error {
	member, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: boardID, UserID: userID})
	if err != nil || member.Role != "owner" {
		return ErrForbidden
	}
	if err := s.repo.Delete(ctx, boardID); err != nil {
		return err
	}
	s.hub.Broadcast(boardID, websocket.EventMessage{Event: "board_deleted", Data: gin.H{"id": boardID}})
	return nil
}

// !!! other member‑related methods omitted for brevity
// !!!
