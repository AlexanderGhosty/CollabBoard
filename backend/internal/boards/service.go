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
	ErrForbidden    = errors.New("forbidden: insufficient permissions")
	ErrUserNotFound = errors.New("user not found")
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

func (s *Service) ListBoardsByRole(ctx context.Context, userID int32, role string) ([]db.ListBoardsByUserAndRoleRow, error) {
	return s.repo.ListByUserAndRole(ctx, db.ListBoardsByUserAndRoleParams{
		UserID: userID,
		Role:   role,
	})
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

// LeaveBoard allows a user to leave a board they are a member of
func (s *Service) LeaveBoard(
	ctx context.Context, userID, boardID int32,
) error {
	// Get the member to check if they exist and are not an owner
	member, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	})
	if err != nil {
		return err
	}

	// Owners cannot leave their own board
	if member.Role == "owner" {
		return errors.New("owners cannot leave their own board")
	}

	// Delete the member
	if err := s.repo.DeleteMember(ctx, db.DeleteBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return err
	}

	// Broadcast the event
	s.hub.Broadcast(boardID, websocket.EventMessage{
		Event: "member_left", Data: map[string]int32{"userId": userID},
	})
	return nil
}

func (s *Service) AddMemberByEmail(
	ctx context.Context, userID, boardID int32, email, role string,
) (db.BoardMember, error) {
	// Check if the current user is the owner of the board
	owner, err := s.repo.queries.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	})
	if err != nil || owner.Role != "owner" {
		return db.BoardMember{}, ErrForbidden
	}

	// Find the user by email
	user, err := s.repo.queries.GetUserByEmail(ctx, email)
	if err != nil {
		return db.BoardMember{}, ErrUserNotFound
	}

	// Default role to "member" if not specified
	if role == "" {
		role = "member"
	}

	// Add the user as a member
	m, err := s.repo.AddMember(ctx, db.AddBoardMemberParams{
		BoardID: boardID, UserID: user.ID, Role: role,
	})
	if err == nil {
		s.hub.Broadcast(boardID, websocket.EventMessage{
			Event: "member_added", Data: m,
		})
	}
	return m, err
}
