-- name: CreateBoard :one
INSERT INTO boards (name, owner_id)
VALUES ($1, $2)
    RETURNING id, name, owner_id, created_at;

-- name: GetBoardByID :one
SELECT id, name, owner_id, created_at
FROM boards
WHERE id = $1;

-- name: ListBoards :many
SELECT id, name, owner_id, created_at
FROM boards
ORDER BY created_at;

-- name: ListBoardsByMember :many
SELECT b.id, b.name, b.owner_id, b.created_at
FROM boards b
         JOIN board_members bm ON bm.board_id = b.id
WHERE bm.user_id = $1
ORDER BY b.created_at;

-- name: UpdateBoard :one
UPDATE boards
SET name = $2
WHERE id = $1
    RETURNING id, name, owner_id, created_at;

-- name: DeleteBoard :exec
DELETE FROM boards
WHERE id = $1;