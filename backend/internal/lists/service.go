package lists

import (
	"context"
	"errors"
	"log"
	"sort"
	"time"

	db "backend/internal/db/sqlc"
	"backend/internal/logger"
	"backend/internal/websocket"
)

var ErrNotMember = errors.New("not a member")

type Service struct {
	repo    ListRepository
	members BoardMemberRepository
	hub     *websocket.Hub
}

func NewService(repo ListRepository, members BoardMemberRepository, hub *websocket.Hub) *Service {
	return &Service{repo: repo, members: members, hub: hub}
}

func (s *Service) Create(ctx context.Context, userID, boardID int32, title string, position int32) (db.List, error) {
	// check membership
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: boardID, UserID: userID}); err != nil {
		logger.WithContext(ctx).Warn("List creation failed: user not a member",
			"user_id", userID,
			"board_id", boardID,
			"error", err,
		)
		return db.List{}, ErrNotMember
	}

	logger.WithContext(ctx).Info("Creating list",
		"user_id", userID,
		"board_id", boardID,
		"title", title,
		"position", position,
	)

	_ = s.repo.ShiftRight(ctx, boardID, position)
	lst, err := s.repo.Create(ctx, db.CreateListParams{BoardID: boardID, Title: title, Position: position})
	if err == nil {
		logger.WithContext(ctx).Info("List created successfully",
			"list_id", lst.ID,
			"board_id", boardID,
			"title", title,
		)
		s.hub.Broadcast(boardID, websocket.EventMessage{Event: "list_created", Data: lst})
	} else {
		logger.WithContext(ctx).Error("Failed to create list",
			"user_id", userID,
			"board_id", boardID,
			"error", err,
		)
	}
	return lst, err
}

func (s *Service) ListByBoard(ctx context.Context, userID, boardID int32) ([]db.List, error) {
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: boardID, UserID: userID,
	}); err != nil {
		return nil, ErrNotMember
	}
	return s.repo.ListByBoard(ctx, boardID)
}

// GetListByID retrieves a list by its ID
func (s *Service) GetListByID(ctx context.Context, listID int32) (db.List, error) {
	return s.repo.GetByID(ctx, listID)
}

func (s *Service) Update(ctx context.Context, userID, listID int32, req UpdateListRequest) (db.List, error) {
	lst, err := s.repo.GetByID(ctx, listID)
	if err != nil {
		return db.List{}, err
	}
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: lst.BoardID, UserID: userID}); err != nil {
		return db.List{}, ErrNotMember
	}

	title := lst.Title
	if req.Title != "" {
		title = req.Title
	}

	newPosition := lst.Position
	if req.Position != nil {
		newPosition = *req.Position
		if newPosition < 1 {
			newPosition = 1
		}

		lists, err := s.repo.ListByBoard(ctx, lst.BoardID)
		if err != nil {
			return db.List{}, err
		}
		maxPos := len(lists)
		if maxPos == 0 {
			maxPos = 1
		}
		if newPosition > int32(maxPos) {
			newPosition = int32(maxPos)
		}

		if newPosition != lst.Position {
			if err := s.repo.ShiftLeft(ctx, lst.BoardID, lst.Position); err != nil {
				return db.List{}, err
			}
			if err := s.repo.ShiftRight(ctx, lst.BoardID, newPosition); err != nil {
				return db.List{}, err
			}
		}
	}

	updated, err := s.repo.Update(ctx, db.UpdateListParams{ID: listID, Title: title, Position: newPosition})
	if err != nil {
		return db.List{}, err
	}

	s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "list_updated", Data: updated})
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, userID, listID int32) error {
	lst, err := s.repo.GetByID(ctx, listID)
	if err != nil {
		return err
	}
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return ErrNotMember
	}
	if err := s.repo.Delete(ctx, listID); err != nil {
		return err
	}
	s.hub.Broadcast(lst.BoardID, websocket.EventMessage{
		Event: "list_deleted", Data: map[string]int32{"id": listID},
	})
	return nil
}

// NormalizeListPositions ensures all lists have sequential positions starting from 1
// This is exported so it can be called by background jobs and API endpoints
func (s *Service) NormalizeListPositions(ctx context.Context, boardID int32) error {
	logger.WithContext(ctx).Debug("Normalizing list positions for board", "board_id", boardID)

	// Get all lists for this board
	lists, err := s.repo.ListByBoard(ctx, boardID)
	if err != nil {
		logger.WithContext(ctx).Error("Error getting lists for board",
			"board_id", boardID,
			"error", err,
		)
		return err
	}

	// Sort lists by position
	sort.Slice(lists, func(i, j int) bool {
		return lists[i].Position < lists[j].Position
	})

	log.Printf("Lists before normalization: %+v", lists)

	// Update positions to be sequential starting from 1
	for i, list := range lists {
		newPosition := int32(i + 1)
		if list.Position != newPosition {
			log.Printf("Updating list %d position from %d to %d", list.ID, list.Position, newPosition)
			_, err := s.repo.Update(ctx, db.UpdateListParams{
				ID:       list.ID,
				Title:    list.Title,
				Position: newPosition,
			})
			if err != nil {
				logger.WithContext(ctx).Error("Error updating list position during normalization",
					"list_id", list.ID,
					"new_position", newPosition,
					"error", err,
				)
				return err
			}
		}
	}

	logger.WithContext(ctx).Debug("List positions normalized for board", "board_id", boardID)
	return nil
}

func (s *Service) Move(ctx context.Context, userID, listID, newPos int32) (db.List, error) {
	// Log the input parameters
	logger.WithContext(ctx).Info("List move operation started",
		"user_id", userID,
		"list_id", listID,
		"new_position", newPos,
	)

	// Get the list to move
	lst, err := s.repo.GetByID(ctx, listID)
	if err != nil {
		logger.WithContext(ctx).Error("Error getting list to move",
			"list_id", listID,
			"error", err,
		)
		return db.List{}, err
	}

	logger.WithContext(ctx).Debug("Found list to move",
		"list_id", lst.ID,
		"board_id", lst.BoardID,
		"current_position", lst.Position,
	)

	// Check if user is a member of the board
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: lst.BoardID, UserID: userID}); err != nil {
		logger.WithContext(ctx).Warn("List move failed: user not a member",
			"user_id", userID,
			"board_id", lst.BoardID,
			"error", err,
		)
		return db.List{}, ErrNotMember
	}

	// Validate the new position
	if newPos <= 0 {
		logger.WithContext(ctx).Warn("Invalid position provided, setting to 1",
			"requested_position", newPos,
			"list_id", listID,
		)
		newPos = 1
	}

	// Get all lists for this board to check position constraints
	lists, err := s.repo.ListByBoard(ctx, lst.BoardID)
	if err != nil {
		logger.WithContext(ctx).Error("Error getting lists for board",
			"board_id", lst.BoardID,
			"error", err,
		)
		return db.List{}, err
	}

	// Check if there are any position conflicts (multiple lists with the same position)
	positionCounts := make(map[int32]int)
	for _, l := range lists {
		positionCounts[l.Position]++
	}

	hasConflicts := false
	for pos, count := range positionCounts {
		if count > 1 {
			logger.WithContext(ctx).Warn("Position conflict detected",
				"position", pos,
				"list_count", count,
				"board_id", lst.BoardID,
			)
			hasConflicts = true
			break
		}
	}

	// If there are position conflicts, normalize all positions first
	if hasConflicts {
		logger.WithContext(ctx).Info("Position conflicts detected, normalizing positions",
			"board_id", lst.BoardID,
		)
		if err := s.NormalizeListPositions(ctx, lst.BoardID); err != nil {
			logger.WithContext(ctx).Error("Error normalizing list positions",
				"board_id", lst.BoardID,
				"error", err,
			)
			return db.List{}, err
		}

		// Refresh the list after normalization
		lst, err = s.repo.GetByID(ctx, listID)
		if err != nil {
			logger.WithContext(ctx).Error("Error getting list after normalization",
				"list_id", listID,
				"error", err,
			)
			return db.List{}, err
		}

		// Refresh the lists after normalization
		lists, err = s.repo.ListByBoard(ctx, lst.BoardID)
		if err != nil {
			logger.WithContext(ctx).Error("Error getting lists after normalization",
				"board_id", lst.BoardID,
				"error", err,
			)
			return db.List{}, err
		}
	}

	logger.WithContext(ctx).Debug("Current lists on board",
		"board_id", lst.BoardID,
		"list_count", len(lists),
	)

	// Calculate the maximum position
	maxPosition := int32(0)
	for _, l := range lists {
		if l.Position > maxPosition {
			maxPosition = l.Position
		}
	}

	// Ensure newPos is within valid range
	if newPos > maxPosition+1 {
		logger.WithContext(ctx).Info("Adjusting position to maximum allowed",
			"requested_position", newPos,
			"adjusted_position", maxPosition+1,
			"list_id", listID,
		)
		newPos = maxPosition + 1
	}

	// If we're not changing the position, just return the list
	if lst.Position == newPos {
		logger.WithContext(ctx).Debug("List position unchanged",
			"list_id", listID,
			"position", newPos,
		)
		return lst, nil
	}

	// Shift positions to make room
	logger.WithContext(ctx).Debug("Shifting lists to make room",
		"list_id", listID,
		"current_position", lst.Position,
		"new_position", newPos,
	)

	// First remove the list from its current position
	if err := s.repo.ShiftLeft(ctx, lst.BoardID, lst.Position); err != nil {
		logger.WithContext(ctx).Error("Error shifting lists left",
			"board_id", lst.BoardID,
			"position", lst.Position,
			"error", err,
		)
		return db.List{}, err
	}

	// Then make room at the new position
	if err := s.repo.ShiftRight(ctx, lst.BoardID, newPos); err != nil {
		logger.WithContext(ctx).Error("Error shifting lists right",
			"board_id", lst.BoardID,
			"position", newPos,
			"error", err,
		)
		return db.List{}, err
	}

	// Update the list with the new position, keeping the original title
	updated, err := s.repo.Update(ctx, db.UpdateListParams{
		ID:       listID,
		Title:    lst.Title, // Keep the original title
		Position: newPos,
	})

	if err != nil {
		logger.WithContext(ctx).Error("Error updating list position",
			"list_id", listID,
			"error", err,
		)
		return db.List{}, err
	}

	logger.WithContext(ctx).Info("List moved successfully",
		"list_id", listID,
		"new_position", newPos,
		"board_id", lst.BoardID,
	)

	// Broadcast the change to all connected clients
	s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "list_moved", Data: updated})

	// Normalize list positions after every move operation to ensure consistency
	if err := s.NormalizeListPositions(ctx, lst.BoardID); err != nil {
		logger.WithContext(ctx).Warn("Failed to normalize list positions after move",
			"board_id", lst.BoardID,
			"error", err,
		)
		// We don't return the error here as the move operation itself was successful
	}

	return updated, nil
}

func (s *Service) NormalizeAndList(ctx context.Context, userID, boardID int32) (NormalizePositionsResponse, error) {
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: boardID, UserID: userID}); err != nil {
		return NormalizePositionsResponse{}, ErrNotMember
	}

	if err := s.NormalizeListPositions(ctx, boardID); err != nil {
		return NormalizePositionsResponse{}, err
	}

	lists, err := s.ListByBoard(ctx, userID, boardID)
	if err != nil {
		return NormalizePositionsResponse{}, err
	}

	resp := NormalizePositionsResponse{
		Message: "positions normalized",
		Lists:   make([]ListResponse, 0, len(lists)),
	}

	for _, lst := range lists {
		var createdAt time.Time
		if lst.CreatedAt.Valid {
			createdAt = lst.CreatedAt.Time
		}

		resp.Lists = append(resp.Lists, ListResponse{
			ID:        lst.ID,
			BoardID:   lst.BoardID,
			Title:     lst.Title,
			Position:  lst.Position,
			CreatedAt: createdAt,
		})
	}

	return resp, nil
}
