package lists

import (
	"context"
	"errors"
	"testing"

	db "backend/internal/db/sqlc"
)

type stubListRepository struct {
	shiftRightErr    error
	shiftRightCalled bool
	shiftRightFrom   int32

	createCalled bool
	createArg    db.CreateListParams
	createErr    error
	createResult *db.List

	lists []db.List
}

func (s *stubListRepository) Create(ctx context.Context, arg db.CreateListParams) (db.List, error) {
	s.createCalled = true
	s.createArg = arg
	if s.createErr != nil {
		return db.List{}, s.createErr
	}
	if s.createResult != nil {
		return *s.createResult, nil
	}
	return db.List{ID: 123, BoardID: arg.BoardID, Title: arg.Title, Position: arg.Position}, nil
}

func (s *stubListRepository) Update(context.Context, db.UpdateListParams) (db.List, error) {
	panic("unexpected call to Update")
}

func (s *stubListRepository) Delete(context.Context, int32) error {
	panic("unexpected call to Delete")
}

func (s *stubListRepository) ListByBoard(context.Context, int32) ([]db.List, error) {
	return s.lists, nil
}

func (s *stubListRepository) ShiftRight(ctx context.Context, boardID, from int32) error {
	s.shiftRightCalled = true
	s.shiftRightFrom = from
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
	listRepo := &stubListRepository{shiftRightErr: expectedErr, lists: []db.List{{ID: 1}}}
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

func TestServiceCreateClampsLowPosition(t *testing.T) {
	createErr := errors.New("stop before broadcast")
	listRepo := &stubListRepository{
		lists:     []db.List{{ID: 1, Position: 1}},
		createErr: createErr,
	}
	memberRepo := &stubListMemberRepository{}

	svc := NewService(listRepo, memberRepo, nil)

	_, err := svc.Create(context.Background(), 1, 2, "title", 0)
	if !errors.Is(err, createErr) {
		t.Fatalf("expected error %v, got %v", createErr, err)
	}

	if !listRepo.shiftRightCalled {
		t.Fatal("expected shiftRight to be called")
	}
	if listRepo.shiftRightFrom != 1 {
		t.Fatalf("expected shiftRight to start from 1, got %d", listRepo.shiftRightFrom)
	}
	if !listRepo.createCalled {
		t.Fatal("expected create to be called")
	}
	if listRepo.createArg.Position != 1 {
		t.Fatalf("expected create to use position 1, got %d", listRepo.createArg.Position)
	}
}

func TestServiceCreateClampsHighPosition(t *testing.T) {
	createErr := errors.New("stop before broadcast")
	listRepo := &stubListRepository{
		lists: []db.List{
			{ID: 1, Position: 1},
			{ID: 2, Position: 2},
		},
		createErr: createErr,
	}
	memberRepo := &stubListMemberRepository{}

	svc := NewService(listRepo, memberRepo, nil)

	_, err := svc.Create(context.Background(), 1, 2, "title", 99)
	if !errors.Is(err, createErr) {
		t.Fatalf("expected error %v, got %v", createErr, err)
	}

	if !listRepo.shiftRightCalled {
		t.Fatal("expected shiftRight to be called")
	}
	if listRepo.shiftRightFrom != 3 {
		t.Fatalf("expected shiftRight to start from 3, got %d", listRepo.shiftRightFrom)
	}
	if !listRepo.createCalled {
		t.Fatal("expected create to be called")
	}
	if listRepo.createArg.Position != 3 {
		t.Fatalf("expected create to use position 3, got %d", listRepo.createArg.Position)
	}
}
