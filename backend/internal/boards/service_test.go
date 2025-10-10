package boards

import (
	"context"
	"fmt"
	"testing"

	db "backend/internal/db/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/stretchr/testify/require"
)

type memberKey struct {
	boardID int32
	userID  int32
}

type stubDB struct {
	t *testing.T

	members map[memberKey]db.BoardMember

	getBoardMemberCalls []db.GetBoardMemberParams
	deleteMemberCalls   []db.DeleteBoardMemberParams
}

func newStubDB(t *testing.T) *stubDB {
	t.Helper()

	return &stubDB{
		t:       t,
		members: make(map[memberKey]db.BoardMember),
	}
}

func (s *stubDB) Exec(ctx context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	if len(args) != 2 {
		s.t.Fatalf("unexpected Exec args: %v", args)
	}

	boardID, ok := toInt32(args[0])
	if !ok {
		s.t.Fatalf("unexpected boardID arg type %T", args[0])
	}
	userID, ok := toInt32(args[1])
	if !ok {
		s.t.Fatalf("unexpected userID arg type %T", args[1])
	}

	params := db.DeleteBoardMemberParams{BoardID: boardID, UserID: userID}
	s.deleteMemberCalls = append(s.deleteMemberCalls, params)

	var tag pgconn.CommandTag
	return tag, nil
}

func (s *stubDB) Query(ctx context.Context, query string, args ...any) (pgx.Rows, error) {
	s.t.Fatalf("unexpected Query call: %s", query)
	return nil, fmt.Errorf("unexpected Query call")
}

func (s *stubDB) QueryRow(ctx context.Context, query string, args ...any) pgx.Row {
	if len(args) != 2 {
		s.t.Fatalf("unexpected QueryRow args: %v", args)
	}

	boardID, ok := toInt32(args[0])
	if !ok {
		s.t.Fatalf("unexpected boardID arg type %T", args[0])
	}
	userID, ok := toInt32(args[1])
	if !ok {
		s.t.Fatalf("unexpected userID arg type %T", args[1])
	}

	params := db.GetBoardMemberParams{BoardID: boardID, UserID: userID}
	s.getBoardMemberCalls = append(s.getBoardMemberCalls, params)

	member, ok := s.members[memberKey{boardID: boardID, userID: userID}]
	if !ok {
		return &stubRow{err: pgx.ErrNoRows}
	}

	return &stubRow{member: member}
}

type stubRow struct {
	member db.BoardMember
	err    error
}

func (r *stubRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}

	if len(dest) != 3 {
		return fmt.Errorf("unexpected dest length: %d", len(dest))
	}

	boardID, ok := dest[0].(*int32)
	if !ok {
		return fmt.Errorf("unexpected dest[0] type %T", dest[0])
	}
	userID, ok := dest[1].(*int32)
	if !ok {
		return fmt.Errorf("unexpected dest[1] type %T", dest[1])
	}
	role, ok := dest[2].(*string)
	if !ok {
		return fmt.Errorf("unexpected dest[2] type %T", dest[2])
	}

	*boardID = r.member.BoardID
	*userID = r.member.UserID
	*role = r.member.Role

	return nil
}

func toInt32(v any) (int32, bool) {
	switch value := v.(type) {
	case int32:
		return value, true
	case int64:
		return int32(value), true
	case int:
		return int32(value), true
	default:
		return 0, false
	}
}

func TestService_RemoveMember_RemovesRegularMember(t *testing.T) {
	t.Parallel()

	const (
		boardID  int32 = 1
		ownerID  int32 = 2
		memberID int32 = 3
	)

	stub := newStubDB(t)
	stub.members[memberKey{boardID: boardID, userID: ownerID}] = db.BoardMember{BoardID: boardID, UserID: ownerID, Role: "owner"}
	stub.members[memberKey{boardID: boardID, userID: memberID}] = db.BoardMember{BoardID: boardID, UserID: memberID, Role: "member"}

	repo := NewRepository(db.New(stub))
	svc := NewService(repo, nil)

	err := svc.RemoveMember(context.Background(), ownerID, boardID, memberID)
	require.NoError(t, err)

	require.Equal(t, []db.GetBoardMemberParams{
		{BoardID: boardID, UserID: ownerID},
		{BoardID: boardID, UserID: memberID},
	}, stub.getBoardMemberCalls)

	require.Equal(t, []db.DeleteBoardMemberParams{{BoardID: boardID, UserID: memberID}}, stub.deleteMemberCalls)
}

func TestService_RemoveMember_PreventsRemovingOwner(t *testing.T) {
	t.Parallel()

	const (
		boardID  int32 = 5
		ownerID  int32 = 6
		memberID int32 = 7
	)

	stub := newStubDB(t)
	stub.members[memberKey{boardID: boardID, userID: ownerID}] = db.BoardMember{BoardID: boardID, UserID: ownerID, Role: "owner"}
	stub.members[memberKey{boardID: boardID, userID: memberID}] = db.BoardMember{BoardID: boardID, UserID: memberID, Role: "owner"}

	repo := NewRepository(db.New(stub))
	svc := NewService(repo, nil)

	err := svc.RemoveMember(context.Background(), ownerID, boardID, memberID)
	require.Error(t, err)
	require.ErrorIs(t, err, ErrOwnerCannotLeave)

	require.Equal(t, []db.GetBoardMemberParams{
		{BoardID: boardID, UserID: ownerID},
		{BoardID: boardID, UserID: memberID},
	}, stub.getBoardMemberCalls)

	require.Empty(t, stub.deleteMemberCalls)
}
