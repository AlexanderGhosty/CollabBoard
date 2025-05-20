package lists

import (
	"context"
	"errors"
	"log"
	"sort"

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

// NormalizeListPositions ensures all lists have sequential positions starting from 1
// This is exported so it can be called by background jobs and API endpoints
func (s *Service) NormalizeListPositions(ctx context.Context, boardID int32) error {
	log.Printf("Normalizing list positions for board %d", boardID)

	// Get all lists for this board
	lists, err := s.repo.ListByBoard(ctx, boardID)
	if err != nil {
		log.Printf("Error getting lists for board %d: %v", boardID, err)
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
				log.Printf("Error updating list %d position: %v", list.ID, err)
				return err
			}
		}
	}

	log.Printf("List positions normalized for board %d", boardID)
	return nil
}

func (s *Service) Move(ctx context.Context, userID, listID, newPos int32) (db.List, error) {
	// Log the input parameters
	log.Printf("Move service called: userID=%d, listID=%d, newPos=%d", userID, listID, newPos)

	// Get the list to move
	lst, err := s.q.GetListByID(ctx, listID)
	if err != nil {
		log.Printf("Error getting list %d: %v", listID, err)
		return db.List{}, err
	}

	log.Printf("Found list to move: %+v", lst)

	// Check if user is a member of the board
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: lst.BoardID, UserID: userID}); err != nil {
		log.Printf("User %d is not a member of board %d", userID, lst.BoardID)
		return db.List{}, errors.New("not a member")
	}

	// Validate the new position
	if newPos <= 0 {
		log.Printf("Invalid position %d, setting to 1", newPos)
		newPos = 1
	}

	// Get all lists for this board to check position constraints
	lists, err := s.repo.ListByBoard(ctx, lst.BoardID)
	if err != nil {
		log.Printf("Error getting lists for board %d: %v", lst.BoardID, err)
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
			log.Printf("Position conflict detected: %d lists have position %d", count, pos)
			hasConflicts = true
			break
		}
	}

	// If there are position conflicts, normalize all positions first
	if hasConflicts {
		log.Printf("Position conflicts detected, normalizing positions")
		if err := s.NormalizeListPositions(ctx, lst.BoardID); err != nil {
			log.Printf("Error normalizing list positions: %v", err)
			return db.List{}, err
		}

		// Refresh the list after normalization
		lst, err = s.q.GetListByID(ctx, listID)
		if err != nil {
			log.Printf("Error getting list %d after normalization: %v", listID, err)
			return db.List{}, err
		}

		// Refresh the lists after normalization
		lists, err = s.repo.ListByBoard(ctx, lst.BoardID)
		if err != nil {
			log.Printf("Error getting lists after normalization: %v", err)
			return db.List{}, err
		}
	}

	log.Printf("Current lists on board %d: %+v", lst.BoardID, lists)

	// Calculate the maximum position
	maxPosition := int32(0)
	for _, l := range lists {
		if l.Position > maxPosition {
			maxPosition = l.Position
		}
	}

	// Ensure newPos is within valid range
	if newPos > maxPosition+1 {
		log.Printf("Adjusting position %d to max+1: %d", newPos, maxPosition+1)
		newPos = maxPosition + 1
	}

	// If we're not changing the position, just return the list
	if lst.Position == newPos {
		log.Printf("List %d position unchanged (%d)", listID, newPos)
		return lst, nil
	}

	// Shift positions to make room
	log.Printf("Shifting lists: current position=%d, new position=%d", lst.Position, newPos)

	// First remove the list from its current position
	if err := s.repo.ShiftLeft(ctx, lst.BoardID, lst.Position); err != nil {
		log.Printf("Error shifting lists left: %v", err)
		return db.List{}, err
	}

	// Then make room at the new position
	if err := s.repo.ShiftRight(ctx, lst.BoardID, newPos); err != nil {
		log.Printf("Error shifting lists right: %v", err)
		return db.List{}, err
	}

	// Update the list with the new position, keeping the original title
	updated, err := s.repo.Update(ctx, db.UpdateListParams{
		ID:       listID,
		Title:    lst.Title, // Keep the original title
		Position: newPos,
	})

	if err != nil {
		log.Printf("Error updating list %d: %v", listID, err)
		return db.List{}, err
	}

	log.Printf("List %d moved successfully to position %d", listID, newPos)
	log.Printf("List %d moved successfully: %+v", listID, updated)

	// Broadcast the change to all connected clients
	s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "list_moved", Data: updated})

	// Normalize list positions after every move operation to ensure consistency
	if err := s.NormalizeListPositions(ctx, lst.BoardID); err != nil {
		log.Printf("Warning: Failed to normalize list positions after move: %v", err)
		// We don't return the error here as the move operation itself was successful
	}

	return updated, nil
}
