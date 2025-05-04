-- name: CreateCard :one
INSERT INTO cards (list_id, title, description, position)
VALUES ($1, $2, $3, $4)
    RETURNING id, list_id, title, description, position, created_at;

-- name: GetCardByID :one
SELECT id, list_id, title, description, position, created_at
FROM cards
WHERE id = $1;

-- name: ListCardsByList :many
SELECT id, list_id, title, description, position, created_at
FROM cards
WHERE list_id = $1
ORDER BY position;

-- name: UpdateCard :one
UPDATE cards
SET title = $2,
    description = $3,
    position = $4,
    list_id = $5
WHERE id = $1
    RETURNING id, list_id, title, description, position, created_at;

-- name: IncCardPosAfter :exec
UPDATE cards SET position = position + 1
WHERE list_id = $1 AND position >= $2;

-- name: DecCardPosAfter :exec
UPDATE cards SET position = position - 1
WHERE list_id = $1 AND position >  $2;

-- name: DeleteCard :exec
DELETE FROM cards
WHERE id = $1;
