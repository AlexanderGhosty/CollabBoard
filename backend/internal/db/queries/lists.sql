-- name: CreateList :one
INSERT INTO lists (board_id, title, position)
VALUES ($1, $2, $3)
    RETURNING id, board_id, title, position, created_at;

-- name: GetListByID :one
SELECT id, board_id, title, position, created_at
FROM lists
WHERE id = $1;

-- name: ListListsByBoard :many
SELECT id, board_id, title, position, created_at
FROM lists
WHERE board_id = $1
ORDER BY position;

-- name: UpdateList :one
UPDATE lists
SET title = $2, position = $3
WHERE id = $1
    RETURNING id, board_id, title, position, created_at;

-- name: IncListPosAfter :exec
UPDATE lists SET position = position + 1
WHERE board_id = $1 AND position >= $2;

-- name: DecListPosAfter :exec
UPDATE lists SET position = position - 1
WHERE board_id = $1 AND position >  $2;

-- name: DeleteList :exec
DELETE FROM lists
WHERE id = $1;
