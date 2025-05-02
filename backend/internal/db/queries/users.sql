-- name: CreateUser :one
INSERT INTO users (name, email, password_hash)
VALUES ($1, $2, $3)
    RETURNING id, name, email, password_hash, created_at;

-- name: GetUserByID :one
SELECT id, name, email, password_hash, created_at
FROM users
WHERE id = $1;

-- name: GetUserByEmail :one
SELECT id, name, email, password_hash, created_at
FROM users
WHERE email = $1;

-- name: UpdateUser :one
UPDATE users
SET name = $2, email = $3
WHERE id = $1
    RETURNING id, name, email, password_hash, created_at;

-- name: UpdatePasswordHash :one
UPDATE users
SET password_hash = $2
WHERE id = $1
    RETURNING id, name, email, password_hash, created_at;

-- name: DeleteUser :exec
DELETE FROM users
WHERE id = $1;