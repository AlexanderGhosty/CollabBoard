package boards

import (
	"context"

	db "backend/internal/db/sqlc"
)

type Repository struct {
	queries *db.Queries
}

func NewRepository(q *db.Queries) *Repository {
	return &Repository{queries: q}
}

func (r *Repository) Create(ctx context.Context, arg db.CreateBoardParams) (db.Board, error) {
	return r.queries.CreateBoard(ctx, arg)
}

func (r *Repository) Get(ctx context.Context, id int32) (db.Board, error) {
	return r.queries.GetBoardByID(ctx, id)
}

func (r *Repository) ListByUser(ctx context.Context, userID int32) ([]db.ListBoardsByUserRow, error) {
	return r.queries.ListBoardsByUser(ctx, userID)
}

func (r *Repository) ListByUserAndRole(ctx context.Context, arg db.ListBoardsByUserAndRoleParams) ([]db.ListBoardsByUserAndRoleRow, error) {
	return r.queries.ListBoardsByUserAndRole(ctx, arg)
}

func (r *Repository) Update(ctx context.Context, arg db.UpdateBoardParams) (db.Board, error) {
	return r.queries.UpdateBoard(ctx, arg)
}

func (r *Repository) Delete(ctx context.Context, id int32) error {
	return r.queries.DeleteBoard(ctx, id)
}

func (r *Repository) AddMember(ctx context.Context, arg db.AddBoardMemberParams) (db.BoardMember, error) {
	return r.queries.AddBoardMember(ctx, arg)
}

func (r *Repository) DeleteMember(ctx context.Context, arg db.DeleteBoardMemberParams) error {
	return r.queries.DeleteBoardMember(ctx, arg)
}

func (r *Repository) ListMembers(ctx context.Context, boardID int32) ([]db.ListBoardMembersRow, error) {
	return r.queries.ListBoardMembers(ctx, boardID)
}
