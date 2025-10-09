package cards

import (
	"context"
	"errors"
	"testing"

	db "backend/internal/db/sqlc"
)

type stubCardRepository struct {
	shiftRightErr error
	createCalled  bool
}

func (s *stubCardRepository) Create(ctx context.Context, arg db.CreateCardParams) (db.Card, error) {
	s.createCalled = true
	return db.Card{}, errors.New("create should not be called")
}

func (s *stubCardRepository) Update(context.Context, db.UpdateCardParams) (db.Card, error) {
	panic("unexpected call to Update")
}

func (s *stubCardRepository) Delete(context.Context, int32) error {
	panic("unexpected call to Delete")
}

func (s *stubCardRepository) ListByList(context.Context, int32) ([]db.Card, error) {
	panic("unexpected call to ListByList")
}

func (s *stubCardRepository) ShiftRight(ctx context.Context, listID, from int32) error {
	return s.shiftRightErr
}

func (s *stubCardRepository) ShiftLeft(context.Context, int32, int32) error {
	panic("unexpected call to ShiftLeft")
}

func (s *stubCardRepository) GetCardByID(context.Context, int32) (db.Card, error) {
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
	cardRepo := &stubCardRepository{shiftRightErr: expectedErr}
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
