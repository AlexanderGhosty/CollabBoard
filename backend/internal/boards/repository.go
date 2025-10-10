package boards

import (
	"context"
	"errors"

	db "backend/internal/db/sqlc"
	"github.com/jackc/pgx/v5"
)

type Repository struct {
	queries *db.Queries
	tx      TxBeginner
}

var ErrTransactionUnsupported = errors.New("boards repository: transactions unsupported")

type TxBeginner interface {
	BeginTx(context.Context, pgx.TxOptions) (pgx.Tx, error)
}

func NewRepository(q *db.Queries, tx TxBeginner) *Repository {
	return &Repository{queries: q, tx: tx}
}

func (r *Repository) RunInTransaction(ctx context.Context, fn func(*Repository) error) error {
	if r.tx == nil {
		return ErrTransactionUnsupported
	}

	tx, err := r.tx.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}

	txRepo := &Repository{queries: r.queries.WithTx(tx)}

	if err := fn(txRepo); err != nil {
		if rbErr := tx.Rollback(ctx); rbErr != nil {
			return errors.Join(err, rbErr)
		}
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return nil
}

func (r *Repository) GetBoardMember(ctx context.Context, arg db.GetBoardMemberParams) (db.BoardMember, error) {
	return r.queries.GetBoardMember(ctx, arg)
}

func (r *Repository) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	return r.queries.GetUserByEmail(ctx, email)
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
