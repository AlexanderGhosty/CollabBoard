package lists

import (
	"context"
	"errors"
	"testing"

	db "backend/internal/db/sqlc"
)

type stubListRepository struct {
	shiftRightErr error
	createCalled  bool
}

func (s *stubListRepository) Create(ctx context.Context, arg db.CreateListParams) (db.List, error) {
	s.createCalled = true
	return db.List{}, errors.New("create should not be called")
}

func (s *stubListRepository) Update(context.Context, db.UpdateListParams) (db.List, error) {
	panic("unexpected call to Update")
}

func (s *stubListRepository) Delete(context.Context, int32) error {
	panic("unexpected call to Delete")
}

func (s *stubListRepository) ListByBoard(context.Context, int32) ([]db.List, error) {
	panic("unexpected call to ListByBoard")
}

func (s *stubListRepository) ShiftRight(ctx context.Context, boardID, from int32) error {
	return s.shiftRightErr
}

func (s *stubListRepository) ShiftLeft(context.Context, int32, int32) error {
	panic("unexpected call to ShiftLeft")
}

func (s *stubListRepository) GetByID(context.Context, int32) (db.List, error) {
	panic("unexpected call to GetByID")
}

type stubListMemberRepository struct {
	err error
}

func (s *stubListMemberRepository) GetBoardMember(context.Context, db.GetBoardMemberParams) (db.BoardMember, error) {
	return db.BoardMember{}, s.err
}

func TestServiceCreateReturnsErrorWhenShiftFails(t *testing.T) {
	expectedErr := errors.New("shift failed")
	listRepo := &stubListRepository{shiftRightErr: expectedErr}
	memberRepo := &stubListMemberRepository{}

	svc := NewService(listRepo, memberRepo, nil)

	lst, err := svc.Create(context.Background(), 42, 77, "title", 1)
	if !errors.Is(err, expectedErr) {
		t.Fatalf("expected error %v, got %v", expectedErr, err)
	}
	if (lst != db.List{}) {
		t.Fatalf("expected zero list, got %+v", lst)
	}
	if listRepo.createCalled {
		t.Fatal("expected create not to be called")
	}
}
