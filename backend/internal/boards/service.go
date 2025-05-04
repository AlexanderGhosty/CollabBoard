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

func (s *Service) GetBoard(ctx context.Context, userID, boardID int32) (db.Board, error) {
	if _, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return db.Board{}, ErrForbidden
	}
	return s.repo.Get(ctx, boardID)
}

func (s *Service) ListMembers(ctx context.Context, userID, boardID int32) ([]db.ListBoardMembersRow, error) {
	if _, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return nil, ErrForbidden
	}
	return s.repo.ListMembers(ctx, boardID)
}

func (s *Service) AddMember(
	ctx context.Context, userID, boardID, newUserID int32, role string,
) (db.BoardMember, error) {
	owner, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	})
	if err != nil || owner.Role != "owner" {
		return db.BoardMember{}, ErrForbidden
	}
	if role == "" {
		role = "member"
	}
	m, err := s.repo.AddMember(ctx, db.AddBoardMemberParams{
		BoardID: boardID, UserID: newUserID, Role: role,
	})
	if err == nil {
		s.hub.Broadcast(boardID, websocket.EventMessage{
			Event: "member_added", Data: m,
		})
	}
	return m, err
}

func (s *Service) RemoveMember(
	ctx context.Context, userID, boardID, memberID int32,
) error {
	owner, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	})
	if err != nil || owner.Role != "owner" {
		return ErrForbidden
	}
	if err := s.repo.DeleteMember(ctx, db.DeleteBoardMemberParams{
		BoardID: boardID, UserID: memberID,
	}); err != nil {
		return err
	}
	s.hub.Broadcast(boardID, websocket.EventMessage{
		Event: "member_removed", Data: map[string]int32{"userId": memberID},
	})
	return nil
}
