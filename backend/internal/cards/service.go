package cards

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgtype"

	db "backend/internal/db/sqlc"
	"backend/internal/websocket"
)

type Service struct {
	cards   CardRepository
	lists   ListRepository
	members BoardMemberRepository
	hub     *websocket.Hub
}

func NewService(cards CardRepository, lists ListRepository, members BoardMemberRepository, hub *websocket.Hub) *Service {
	return &Service{cards: cards, lists: lists, members: members, hub: hub}
}

func (s *Service) Create(ctx context.Context, userID, listID int32, title string, description string, position int32) (db.Card, error) {
	lst, err := s.lists.GetListByID(ctx, listID)
	if err != nil {
		return db.Card{}, err
	}
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: lst.BoardID, UserID: userID}); err != nil {
		return db.Card{}, errors.New("not a member")
	}
	cards, err := s.cards.ListByList(ctx, listID)
	if err != nil {
		return db.Card{}, err
	}

	sanitizedPosition := position
	if sanitizedPosition < 1 {
		sanitizedPosition = 1
	}

	maxPosition := len(cards) + 1
	if sanitizedPosition > int32(maxPosition) {
		sanitizedPosition = int32(maxPosition)
	}

	if err := s.cards.ShiftRight(ctx, listID, sanitizedPosition); err != nil {
		return db.Card{}, err
	}
	card, err := s.cards.Create(ctx, db.CreateCardParams{ListID: listID, Title: title, Description: pgtype.Text{String: description, Valid: description != ""}, Position: sanitizedPosition})
	if err == nil && s.hub != nil {
		s.hub.Broadcast(lst.BoardID, websocket.EventMessage{Event: "card_created", Data: card})
	}
	return card, err
}

func (s *Service) ListByList(ctx context.Context, userID, listID int32) ([]db.Card, error) {
	lst, err := s.lists.GetListByID(ctx, listID)
	if err != nil {
		return nil, err
	}
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return nil, errors.New("not a member")
	}
	return s.cards.ListByList(ctx, listID)
}

func (s *Service) Update(ctx context.Context, userID, cardID int32, req UpdateCardRequest) (db.Card, error) {
	currentCard, err := s.cards.GetCardByID(ctx, cardID)
	if err != nil {
		return db.Card{}, err
	}

	srcList, err := s.lists.GetListByID(ctx, currentCard.ListID)
	if err != nil {
		return db.Card{}, err
	}

	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: srcList.BoardID, UserID: userID}); err != nil {
		return db.Card{}, errors.New("not a member")
	}

	dstList := srcList
	if req.ListID != nil && *req.ListID != srcList.ID {
		dstList, err = s.lists.GetListByID(ctx, *req.ListID)
		if err != nil {
			return db.Card{}, err
		}
		if dstList.BoardID != srcList.BoardID {
			return db.Card{}, errors.New("cannot move across boards")
		}
	}

	var maxPos int
	includesCurrent := dstList.ID == currentCard.ListID
	if req.Position != nil || !includesCurrent {
		cards, err := s.cards.ListByList(ctx, dstList.ID)
		if err != nil {
			return db.Card{}, err
		}
		maxPos = len(cards)
		if !includesCurrent {
			maxPos++
		}
	} else {
		maxPos = int(currentCard.Position)
	}

	targetPos := currentCard.Position
	if req.Position != nil {
		targetPos = *req.Position
	} else if !includesCurrent {
		targetPos = int32(maxPos)
	}

	if targetPos < 1 {
		targetPos = 1
	}
	if maxPos > 0 && targetPos > int32(maxPos) {
		targetPos = int32(maxPos)
	}

	needsRelocation := dstList.ID != currentCard.ListID || targetPos != currentCard.Position
	if needsRelocation {
		if err := s.cards.ShiftLeft(ctx, currentCard.ListID, currentCard.Position); err != nil {
			return db.Card{}, err
		}
		if err := s.cards.ShiftRight(ctx, dstList.ID, targetPos); err != nil {
			return db.Card{}, err
		}
	}

	title := currentCard.Title
	if req.Title != nil {
		title = *req.Title
	}

	description := currentCard.Description
	if req.Description != nil {
		description = pgtype.Text{String: *req.Description, Valid: true}
	}

	updated, err := s.cards.Update(ctx, db.UpdateCardParams{
		ID:          currentCard.ID,
		Title:       title,
		Description: description,
		Position:    targetPos,
		ListID:      dstList.ID,
	})
	if err != nil {
		return db.Card{}, err
	}

	s.hub.Broadcast(srcList.BoardID, websocket.EventMessage{Event: "card_updated", Data: updated})
	return updated, nil
}

func (s *Service) Delete(ctx context.Context, userID, cardID int32) error {
	card0, err := s.cards.GetCardByID(ctx, cardID)
	if err != nil {
		return err
	}
	lst, err := s.lists.GetListByID(ctx, card0.ListID)
	if err != nil {
		return err
	}
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: lst.BoardID, UserID: userID,
	}); err != nil {
		return errors.New("not a member")
	}
	if err := s.cards.Delete(ctx, cardID); err != nil {
		return err
	}
	s.hub.Broadcast(lst.BoardID, websocket.EventMessage{
		Event: "card_deleted", Data: map[string]int32{"id": cardID},
	})
	return nil
}

func (s *Service) Move(ctx context.Context, userID, cardID int32, req MoveCardRequest) (db.Card, error) {
	card, err := s.cards.GetCardByID(ctx, cardID)
	if err != nil {
		return db.Card{}, err
	}

	srcList, err := s.lists.GetListByID(ctx, card.ListID)
	if err != nil {
		return db.Card{}, err
	}

	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{BoardID: srcList.BoardID, UserID: userID}); err != nil {
		return db.Card{}, errors.New("not a member")
	}

	dstList := srcList
	if req.ListID != nil && *req.ListID != srcList.ID {
		dstList, err = s.lists.GetListByID(ctx, *req.ListID)
		if err != nil {
			return db.Card{}, err
		}
		if dstList.BoardID != srcList.BoardID {
			return db.Card{}, errors.New("cannot move across boards")
		}
	}

	cards, err := s.cards.ListByList(ctx, dstList.ID)
	if err != nil {
		return db.Card{}, err
	}
	maxPos := len(cards)
	if dstList.ID != card.ListID {
		maxPos++
	}

	targetPos := req.Position
	if targetPos < 1 {
		targetPos = 1
	}
	if targetPos > int32(maxPos) {
		targetPos = int32(maxPos)
	}

	if dstList.ID == card.ListID && targetPos == card.Position {
		return card, nil
	}

	if err := s.cards.ShiftLeft(ctx, card.ListID, card.Position); err != nil {
		return db.Card{}, err
	}
	if err := s.cards.ShiftRight(ctx, dstList.ID, targetPos); err != nil {
		return db.Card{}, err
	}

	updated, err := s.cards.Update(ctx, db.UpdateCardParams{
		ID:          cardID,
		ListID:      dstList.ID,
		Position:    targetPos,
		Title:       card.Title,
		Description: card.Description,
	})
	if err != nil {
		return db.Card{}, err
	}

	s.hub.Broadcast(srcList.BoardID, websocket.EventMessage{
		Event: "card_moved",
		Data: map[string]any{
			"cardId":   updated.ID,
			"toListId": updated.ListID,
			"toPos":    updated.Position,
		},
	})
	return updated, nil
}

func (s *Service) Duplicate(ctx context.Context, userID, cardID int32) (db.Card, error) {
	// Get the original card
	origCard, err := s.cards.GetCardByID(ctx, cardID)
	if err != nil {
		return db.Card{}, err
	}

	// Get the list to check permissions and calculate position
	list, err := s.lists.GetListByID(ctx, origCard.ListID)
	if err != nil {
		return db.Card{}, err
	}

	// Check if user is a member of the board
	if _, err := s.members.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: list.BoardID, UserID: userID,
	}); err != nil {
		return db.Card{}, errors.New("not a member")
	}

	// Get the highest position in the list
	cards, err := s.cards.ListByList(ctx, list.ID)
	if err != nil {
		return db.Card{}, err
	}

	// Calculate new position (at the end of the list)
	var newPosition int32 = 1
	if len(cards) > 0 {
		for _, c := range cards {
			if c.Position > newPosition {
				newPosition = c.Position
			}
		}
		newPosition++ // Place after the last card
	}

	// Create a duplicate card with the same content but new position
	newCard, err := s.cards.Create(ctx, db.CreateCardParams{
		ListID:      origCard.ListID,
		Title:       origCard.Title + " (copy)",
		Description: origCard.Description,
		Position:    newPosition,
	})

	if err != nil {
		return db.Card{}, err
	}

	// Broadcast the event
	s.hub.Broadcast(list.BoardID, websocket.EventMessage{
		Event: "card_created",
		Data:  newCard,
	})

	return newCard, nil
}
