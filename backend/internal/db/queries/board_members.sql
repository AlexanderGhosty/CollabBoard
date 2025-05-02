-- name: AddBoardMember :one
INSERT INTO board_members (board_id, user_id, role)
VALUES ($1, $2, $3)
    RETURNING board_id, user_id, role;

-- name: GetBoardMember :one
SELECT board_id, user_id, role
FROM board_members
WHERE board_id = $1 AND user_id = $2;

-- name: ListBoardMembers :many
SELECT u.id AS user_id, u.name, u.email, bm.role
FROM board_members bm
         JOIN users u ON u.id = bm.user_id
WHERE bm.board_id = $1
ORDER BY u.name;

-- name: ListBoardsByUser :many
SELECT b.id AS board_id, b.name, b.owner_id, b.created_at
FROM board_members bm
         JOIN boards b ON b.id = bm.board_id
WHERE bm.user_id = $1
ORDER BY b.created_at;

-- name: UpdateBoardMemberRole :one
UPDATE board_members
SET role = $3
WHERE board_id = $1 AND user_id = $2
    RETURNING board_id, user_id, role;

-- name: DeleteBoardMember :exec
DELETE FROM board_members
WHERE board_id = $1 AND user_id = $2;
