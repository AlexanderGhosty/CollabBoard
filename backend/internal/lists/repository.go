package lists

import (
	"context"

	db "backend/internal/db/sqlc"
)

type ListRepository interface {
	Create(ctx context.Context, arg db.CreateListParams) (db.List, error)
	Update(ctx context.Context, arg db.UpdateListParams) (db.List, error)
	Delete(ctx context.Context, id int32) error
	ListByBoard(ctx context.Context, boardID int32) ([]db.List, error)
	ShiftRight(ctx context.Context, boardID, from int32) error
	ShiftLeft(ctx context.Context, boardID, from int32) error
	GetByID(ctx context.Context, id int32) (db.List, error)
}

type BoardMemberRepository interface {
	GetBoardMember(ctx context.Context, arg db.GetBoardMemberParams) (db.BoardMember, error)
}

type Repository struct{ q *db.Queries }

func NewRepository(q *db.Queries) *Repository { return &Repository{q: q} }

func (r *Repository) Create(ctx context.Context, arg db.CreateListParams) (db.List, error) {
	return r.q.CreateList(ctx, arg)
}
func (r *Repository) Update(ctx context.Context, arg db.UpdateListParams) (db.List, error) {
	return r.q.UpdateList(ctx, arg)
}
func (r *Repository) Delete(ctx context.Context, id int32) error { return r.q.DeleteList(ctx, id) }
func (r *Repository) ListByBoard(ctx context.Context, boardID int32) ([]db.List, error) {
	return r.q.ListListsByBoard(ctx, boardID)
}
func (r *Repository) ShiftRight(ctx context.Context, boardID, from int32) error {
	return r.q.IncListPosAfter(ctx, db.IncListPosAfterParams{BoardID: boardID, Position: from})
}
func (r *Repository) ShiftLeft(ctx context.Context, boardID, from int32) error {
	return r.q.DecListPosAfter(ctx, db.DecListPosAfterParams{BoardID: boardID, Position: from})
}
func (r *Repository) GetByID(ctx context.Context, id int32) (db.List, error) {
	return r.q.GetListByID(ctx, id)
}

// GetListByID provides a named alias for fetching a list by ID to satisfy
// external interfaces that expect this method signature.
func (r *Repository) GetListByID(ctx context.Context, id int32) (db.List, error) {
	return r.q.GetListByID(ctx, id)
}
func (r *Repository) GetBoardMember(ctx context.Context, arg db.GetBoardMemberParams) (db.BoardMember, error) {
	return r.q.GetBoardMember(ctx, arg)
}
