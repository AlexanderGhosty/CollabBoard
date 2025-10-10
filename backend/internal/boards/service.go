package boards

import (
	"context"
	"errors"

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

func (s *Service) broadcast(boardID int32, msg websocket.EventMessage) {
	if s.hub != nil {
		s.hub.Broadcast(boardID, msg)
	}
}

var (
	ErrForbidden        = errors.New("forbidden: insufficient permissions")
	ErrUserNotFound     = errors.New("user not found")
	ErrOwnerCannotLeave = errors.New("owners cannot leave their own board")
)

func (s *Service) CreateBoard(ctx context.Context, ownerID int32, name string) (db.Board, error) {
	var board db.Board
	err := s.repo.RunInTransaction(ctx, func(r *Repository) error {
		var err error
		board, err = r.Create(ctx, db.CreateBoardParams{Name: name, OwnerID: ownerID})
		if err != nil {
			return err
		}

		_, err = r.AddMember(ctx, db.AddBoardMemberParams{BoardID: board.ID, UserID: ownerID, Role: "owner"})
		return err
	})

	switch {
	case err == nil:
		// transaction succeeded, board is ready for broadcasting
	case errors.Is(err, ErrTransactionUnsupported):
		var memberErr error

		board, err = s.repo.Create(ctx, db.CreateBoardParams{Name: name, OwnerID: ownerID})
		if err != nil {
			return db.Board{}, err
		}

		_, memberErr = s.repo.AddMember(ctx, db.AddBoardMemberParams{BoardID: board.ID, UserID: ownerID, Role: "owner"})
		if memberErr != nil {
			if delErr := s.repo.Delete(ctx, board.ID); delErr != nil {
				return db.Board{}, errors.Join(memberErr, delErr)
			}
			return db.Board{}, memberErr
		}
	default:
		return db.Board{}, err
	}

	boardData := newBoardEventPayload(board)
	boardData.Role = "owner" // Creator is always the owner
	s.broadcast(board.ID, websocket.EventMessage{Event: "board_created", Data: boardData})
	return board, nil
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
	member, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: arg.ID, UserID: userID})
	if err != nil || member.Role != "owner" {
		return db.Board{}, ErrForbidden
	}
	b, err := s.repo.Update(ctx, arg)
	if err == nil {
		payload := newBoardEventPayload(b)
		s.broadcast(b.ID, websocket.EventMessage{Event: "board_updated", Data: payload})
	}
	return b, err
}

func (s *Service) DeleteBoard(ctx context.Context, userID, boardID int32) error {
	member, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: boardID, UserID: userID})
	if err != nil || member.Role != "owner" {
		return ErrForbidden
	}
	if err := s.repo.Delete(ctx, boardID); err != nil {
		return err
	}
	s.broadcast(boardID, websocket.EventMessage{Event: "board_deleted", Data: BoardEventPayload{ID: boardID}})
	return nil
}

func (s *Service) GetBoard(ctx context.Context, userID, boardID int32) (db.Board, error) {
	if _, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return db.Board{}, ErrForbidden
	}
	return s.repo.Get(ctx, boardID)
}

func (s *Service) ListMembers(ctx context.Context, userID, boardID int32) ([]db.ListBoardMembersRow, error) {
	if _, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return nil, ErrForbidden
	}
	return s.repo.ListMembers(ctx, boardID)
}

func (s *Service) AddMember(
	ctx context.Context, userID, boardID, newUserID int32, role string,
) (db.BoardMember, error) {
	owner, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{
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
		s.broadcast(boardID, websocket.EventMessage{
			Event: "member_added", Data: m,
		})
	}
	return m, err
}

func (s *Service) RemoveMember(
	ctx context.Context, userID, boardID, memberID int32,
) error {
	owner, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	})
	if err != nil || owner.Role != "owner" {
		return ErrForbidden
	}
	target, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: memberID,
	})
	if err != nil {
		return err
	}
	if target.Role == "owner" {
		return ErrOwnerCannotLeave
	}
	if err := s.repo.DeleteMember(ctx, db.DeleteBoardMemberParams{
		BoardID: boardID, UserID: memberID,
	}); err != nil {
		return err
	}
	s.broadcast(boardID, websocket.EventMessage{
		Event: "member_removed", Data: map[string]int32{"userId": memberID},
	})
	return nil
}

// LeaveBoard allows a user to leave a board they are a member of
func (s *Service) LeaveBoard(
	ctx context.Context, userID, boardID int32,
) error {
	// Get the member to check if they exist and are not an owner
	member, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	})
	if err != nil {
		return err
	}

	// Owners cannot leave their own board
	if member.Role == "owner" {
		return ErrOwnerCannotLeave
	}

	// Delete the member
	if err := s.repo.DeleteMember(ctx, db.DeleteBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return err
	}

	// Broadcast the event
	s.broadcast(boardID, websocket.EventMessage{
		Event: "member_left", Data: map[string]int32{"userId": userID},
	})
	return nil
}

func (s *Service) AddMemberByEmail(
	ctx context.Context, userID, boardID int32, email, role string,
) (db.BoardMember, error) {
	// Check if the current user is the owner of the board
	owner, err := s.repo.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	})
	if err != nil || owner.Role != "owner" {
		return db.BoardMember{}, ErrForbidden
	}

	// Find the user by email
	user, err := s.repo.GetUserByEmail(ctx, email)
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
		s.broadcast(boardID, websocket.EventMessage{
			Event: "member_added", Data: m,
		})
	}
	return m, err
}
