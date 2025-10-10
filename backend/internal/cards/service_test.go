package cards

import (
	"context"
	"errors"
	"testing"

	db "backend/internal/db/sqlc"
)

type failingShiftCardRepository struct {
	shiftRightErr error
	createCalled  bool
	cards         []db.Card
}

func (s *failingShiftCardRepository) Create(ctx context.Context, arg db.CreateCardParams) (db.Card, error) {
	s.createCalled = true
	return db.Card{}, errors.New("create should not be called")
}

func (s *failingShiftCardRepository) Update(context.Context, db.UpdateCardParams) (db.Card, error) {
	panic("unexpected call to Update")
}

func (s *failingShiftCardRepository) Delete(context.Context, int32) error {
	panic("unexpected call to Delete")
}

func (s *failingShiftCardRepository) ListByList(context.Context, int32) ([]db.Card, error) {
	return s.cards, nil
}

func (s *failingShiftCardRepository) ShiftRight(ctx context.Context, listID, from int32) error {
	return s.shiftRightErr
}

func (s *failingShiftCardRepository) ShiftLeft(context.Context, int32, int32) error {
	panic("unexpected call to ShiftLeft")
}

func (s *failingShiftCardRepository) GetCardByID(context.Context, int32) (db.Card, error) {
	panic("unexpected call to GetCardByID")
}

type recordingCardRepository struct {
	cards          []db.Card
	shiftRightFrom []int32
	createParams   []db.CreateCardParams
}

func (s *recordingCardRepository) Create(ctx context.Context, arg db.CreateCardParams) (db.Card, error) {
	s.createParams = append(s.createParams, arg)
	return db.Card{ID: 123, ListID: arg.ListID, Title: arg.Title, Description: arg.Description, Position: arg.Position}, nil
}

func (s *recordingCardRepository) Update(context.Context, db.UpdateCardParams) (db.Card, error) {
	panic("unexpected call to Update")
}

func (s *recordingCardRepository) Delete(context.Context, int32) error {
	panic("unexpected call to Delete")
}

func (s *recordingCardRepository) ListByList(context.Context, int32) ([]db.Card, error) {
	return s.cards, nil
}

func (s *recordingCardRepository) ShiftRight(ctx context.Context, listID, from int32) error {
	s.shiftRightFrom = append(s.shiftRightFrom, from)
	return nil
}

func (s *recordingCardRepository) ShiftLeft(context.Context, int32, int32) error {
	panic("unexpected call to ShiftLeft")
}

func (s *recordingCardRepository) GetCardByID(context.Context, int32) (db.Card, error) {
	panic("unexpected call to GetCardByID")
}

type stubCardListRepository struct {
	list db.List
	err  error
}

func (s *stubCardListRepository) GetListByID(context.Context, int32) (db.List, error) {
	return s.list, s.err
}

type stubCardMemberRepository struct {
	err error
}

func (s *stubCardMemberRepository) GetBoardMember(context.Context, db.GetBoardMemberParams) (db.BoardMember, error) {
	return db.BoardMember{}, s.err
}

func TestServiceCreateReturnsEarlyOnShiftError(t *testing.T) {
	expectedErr := errors.New("shift failed")
	cardRepo := &failingShiftCardRepository{shiftRightErr: expectedErr}
	listRepo := &stubCardListRepository{list: db.List{ID: 1, BoardID: 10}}
	memberRepo := &stubCardMemberRepository{}

	svc := NewService(cardRepo, listRepo, memberRepo, nil)

	card, err := svc.Create(context.Background(), 42, 1, "title", "desc", 1)
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected error %v, got %v", expectedErr, err)
	}
	if (card != db.Card{}) {
		t.Fatalf("expected zero card, got %+v", card)
	}
	if cardRepo.createCalled {
		t.Fatal("expected create not to be called")
	}
}

func TestServiceCreateClampsPosition(t *testing.T) {
	tests := []struct {
		name          string
		existingCards int
		requestedPos  int32
		wantPos       int32
	}{
		{
			name:          "clamps below range",
			existingCards: 2,
			requestedPos:  0,
			wantPos:       1,
		},
		{
			name:          "clamps above range",
			existingCards: 2,
			requestedPos:  10,
			wantPos:       3,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			cards := make([]db.Card, tc.existingCards)
			for i := range cards {
				cards[i] = db.Card{ID: int32(i + 1), ListID: 1, Position: int32(i + 1)}
			}

			cardRepo := &recordingCardRepository{cards: cards}
			listRepo := &stubCardListRepository{list: db.List{ID: 1, BoardID: 10}}
			memberRepo := &stubCardMemberRepository{}

			svc := NewService(cardRepo, listRepo, memberRepo, nil)

			card, err := svc.Create(context.Background(), 42, 1, "title", "", tc.requestedPos)
			if err != nil {
				t.Fatalf("Create returned unexpected error: %v", err)
			}

			if len(cardRepo.shiftRightFrom) != 1 {
				t.Fatalf("expected ShiftRight to be called once, got %d", len(cardRepo.shiftRightFrom))
			}
			if got := cardRepo.shiftRightFrom[0]; got != tc.wantPos {
				t.Fatalf("expected ShiftRight to be called with %d, got %d", tc.wantPos, got)
			}

			if len(cardRepo.createParams) != 1 {
				t.Fatalf("expected Create to be called once, got %d", len(cardRepo.createParams))
			}
			if got := cardRepo.createParams[0].Position; got != tc.wantPos {
				t.Fatalf("expected Create to use position %d, got %d", tc.wantPos, got)
			}

			if card.Position != tc.wantPos {
				t.Fatalf("expected returned card position %d, got %d", tc.wantPos, card.Position)
			}
		})
	}
}
