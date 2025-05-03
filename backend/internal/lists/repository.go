package lists

import (
	"context"

	db "backend/internal/db/sqlc"
)

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
