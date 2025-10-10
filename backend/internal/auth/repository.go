package auth

import (
	"context"

	db "backend/internal/db/sqlc"
)

type Repository interface {
	GetUserByEmail(ctx context.Context, email string) (db.User, error)
	CreateUser(ctx context.Context, arg db.CreateUserParams) (db.User, error)
	GetUserByID(ctx context.Context, id int32) (db.User, error)
	UpdatePasswordHash(ctx context.Context, arg db.UpdatePasswordHashParams) (db.User, error)
}

type repository struct {
	queries *db.Queries
}

func NewRepository(q *db.Queries) Repository {
	return &repository{queries: q}
}

func (r *repository) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	return r.queries.GetUserByEmail(ctx, email)
}

func (r *repository) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
	return r.queries.CreateUser(ctx, arg)
}

func (r *repository) GetUserByID(ctx context.Context, id int32) (db.User, error) {
	return r.queries.GetUserByID(ctx, id)
}

func (r *repository) UpdatePasswordHash(ctx context.Context, arg db.UpdatePasswordHashParams) (db.User, error) {
	return r.queries.UpdatePasswordHash(ctx, arg)
}
