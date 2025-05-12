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
	_ = s.repo.ShiftRight(ctx, listID, position)
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

func (s *Service) Move(ctx context.Context, userID, cardID, dstListID, newPos int32) (db.Card, error) {
	card, err := s.q.GetCardByID(ctx, cardID)
	if err != nil {
		return db.Card{}, err
	}
	srcList, err := s.q.GetListByID(ctx, card.ListID)
	if err != nil {
		return db.Card{}, err
	}
	dstList, err := s.q.GetListByID(ctx, dstListID)
	if err != nil {
		return db.Card{}, err
	}

	if srcList.BoardID != dstList.BoardID {
		return db.Card{}, errors.New("cannot move across boards")
	}
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: srcList.BoardID, UserID: userID,
	}); err != nil {
		return db.Card{}, errors.New("not a member")
	}

	if err := s.repo.ShiftLeft(ctx, srcList.ID, card.Position); err != nil {
		return db.Card{}, err
	}
	if err := s.repo.ShiftRight(ctx, dstList.ID, newPos); err != nil {
		return db.Card{}, err
	}

	updated, err := s.repo.Update(ctx, db.UpdateCardParams{
		ID:          cardID,
		ListID:      dstListID,
		Position:    newPos,
		Title:       card.Title,
		Description: card.Description,
	})
	if err != nil {
		return db.Card{}, err
	}
	s.hub.Broadcast(srcList.BoardID, websocket.EventMessage{
		Event: "card_moved",
		Data:  updated,
	})
	return updated, nil
}

func (s *Service) Duplicate(ctx context.Context, userID, cardID int32) (db.Card, error) {
	// Get the original card
	origCard, err := s.q.GetCardByID(ctx, cardID)
	if err != nil {
		return db.Card{}, err
	}

	// Get the list to check permissions and calculate position
	list, err := s.q.GetListByID(ctx, origCard.ListID)
	if err != nil {
		return db.Card{}, err
	}

	// Check if user is a member of the board
	if _, err := s.q.GetBoardMember(ctx, db.GetBoardMemberParams{
		BoardID: list.BoardID, UserID: userID,
	}); err != nil {
		return db.Card{}, errors.New("not a member")
	}

	// Get the highest position in the list
	cards, err := s.repo.ListByList(ctx, list.ID)
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
	newCard, err := s.repo.Create(ctx, db.CreateCardParams{
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
