package cards

import (
	"context"

	db "backend/internal/db/sqlc"
)

type CardRepository interface {
	Create(ctx context.Context, arg db.CreateCardParams) (db.Card, error)
	Update(ctx context.Context, arg db.UpdateCardParams) (db.Card, error)
	Delete(ctx context.Context, id int32) error
	ListByList(ctx context.Context, listID int32) ([]db.Card, error)
	ShiftRight(ctx context.Context, listID, from int32) error
	ShiftLeft(ctx context.Context, listID, from int32) error
	GetCardByID(ctx context.Context, id int32) (db.Card, error)
}

type ListRepository interface {
	GetListByID(ctx context.Context, id int32) (db.List, error)
}

type BoardMemberRepository interface {
	GetBoardMember(ctx context.Context, arg db.GetBoardMemberParams) (db.BoardMember, error)
}

type Repository struct{ q *db.Queries }

func NewRepository(q *db.Queries) *Repository { return &Repository{q: q} }

func (r *Repository) Create(ctx context.Context, arg db.CreateCardParams) (db.Card, error) {
	return r.q.CreateCard(ctx, arg)
}
func (r *Repository) Update(ctx context.Context, arg db.UpdateCardParams) (db.Card, error) {
	return r.q.UpdateCard(ctx, arg)
}
func (r *Repository) Delete(ctx context.Context, id int32) error { return r.q.DeleteCard(ctx, id) }
func (r *Repository) ListByList(ctx context.Context, listID int32) ([]db.Card, error) {
	return r.q.ListCardsByList(ctx, listID)
}
func (r *Repository) ShiftRight(ctx context.Context, listID, from int32) error {
	return r.q.IncCardPosAfter(ctx, db.IncCardPosAfterParams{ListID: listID, Position: from})
}
func (r *Repository) ShiftLeft(ctx context.Context, listID, from int32) error {
	return r.q.DecCardPosAfter(ctx, db.DecCardPosAfterParams{ListID: listID, Position: from})
}
func (r *Repository) GetCardByID(ctx context.Context, id int32) (db.Card, error) {
	return r.q.GetCardByID(ctx, id)
}
func (r *Repository) GetListByID(ctx context.Context, id int32) (db.List, error) {
	return r.q.GetListByID(ctx, id)
}
func (r *Repository) GetBoardMember(ctx context.Context, arg db.GetBoardMemberParams) (db.BoardMember, error) {
	return r.q.GetBoardMember(ctx, arg)
}

var _ CardRepository = (*Repository)(nil)
var _ ListRepository = (*Repository)(nil)
var _ BoardMemberRepository = (*Repository)(nil)
