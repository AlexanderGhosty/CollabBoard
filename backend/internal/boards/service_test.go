package boards

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"testing"

	db "backend/internal/db/sqlc"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
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

	repo := NewRepository(db.New(stub), nil)
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

	repo := NewRepository(db.New(stub), nil)
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

func TestService_CreateBoard_AddMemberFailureRollsBack(t *testing.T) {
	t.Parallel()

	stub := newTransactionalStubDB(t)
	stub.addMemberErr = errors.New("add member failed")

	repo := NewRepository(db.New(stub), stub)
	svc := NewService(repo, nil)

	_, err := svc.CreateBoard(context.Background(), 99, "Project Phoenix")
	require.Error(t, err)
	require.ErrorIs(t, err, stub.addMemberErr)

	require.Empty(t, stub.boards)
	require.Equal(t, 1, stub.beginCalls)
	require.Zero(t, stub.commitCalls)
	require.Equal(t, 1, stub.rollbackCalls)
}

type transactionalStubDB struct {
	t *testing.T

	nextBoardID int32
	boards      map[int32]db.Board
	members     map[memberKey]db.BoardMember

	addMemberErr error

	beginCalls    int
	commitCalls   int
	rollbackCalls int
}

func newTransactionalStubDB(t *testing.T) *transactionalStubDB {
	t.Helper()

	return &transactionalStubDB{
		t:           t,
		nextBoardID: 1,
		boards:      make(map[int32]db.Board),
		members:     make(map[memberKey]db.BoardMember),
	}
}

func (s *transactionalStubDB) Exec(ctx context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	if strings.Contains(query, "DELETE FROM boards") {
		if len(args) != 1 {
			s.t.Fatalf("unexpected args for delete: %v", args)
		}
		boardID, ok := toInt32(args[0])
		if !ok {
			s.t.Fatalf("unexpected board id type %T", args[0])
		}
		delete(s.boards, boardID)
		return pgconn.CommandTag{}, nil
	}

	s.t.Fatalf("unexpected Exec query: %s", query)
	return pgconn.CommandTag{}, nil
}

func (s *transactionalStubDB) Query(context.Context, string, ...any) (pgx.Rows, error) {
	s.t.Fatalf("unexpected Query call")
	return nil, fmt.Errorf("unexpected Query call")
}

func (s *transactionalStubDB) QueryRow(ctx context.Context, query string, args ...any) pgx.Row {
	switch {
	case strings.Contains(query, "INSERT INTO boards"):
		if len(args) != 2 {
			s.t.Fatalf("unexpected create board args: %v", args)
		}
		name, _ := args[0].(string)
		ownerID, ok := toInt32(args[1])
		if !ok {
			s.t.Fatalf("unexpected owner id type %T", args[1])
		}
		board := s.newBoard(name, ownerID)
		s.boards[board.ID] = board
		return &createBoardRow{board: board}
	case strings.Contains(query, "INSERT INTO board_members"):
		if s.addMemberErr != nil {
			return &createBoardRow{err: s.addMemberErr}
		}
		if len(args) != 3 {
			s.t.Fatalf("unexpected add member args: %v", args)
		}
		boardID, ok := toInt32(args[0])
		if !ok {
			s.t.Fatalf("unexpected board id type %T", args[0])
		}
		userID, ok := toInt32(args[1])
		if !ok {
			s.t.Fatalf("unexpected user id type %T", args[1])
		}
		role, _ := args[2].(string)
		member := db.BoardMember{BoardID: boardID, UserID: userID, Role: role}
		s.members[memberKey{boardID: boardID, userID: userID}] = member
		return &createBoardRow{member: member}
	default:
		s.t.Fatalf("unexpected QueryRow query: %s", query)
	}
	return &createBoardRow{err: fmt.Errorf("unexpected query")}
}

func (s *transactionalStubDB) BeginTx(context.Context, pgx.TxOptions) (pgx.Tx, error) {
	s.beginCalls++
	return &transactionalStubTx{
		db:             s,
		pendingBoards:  make(map[int32]db.Board),
		pendingMembers: make(map[memberKey]db.BoardMember),
	}, nil
}

func (s *transactionalStubDB) newBoard(name string, ownerID int32) db.Board {
	id := s.nextBoardID
	s.nextBoardID++
	return db.Board{ID: id, Name: name, OwnerID: ownerID, CreatedAt: pgtype.Timestamp{Valid: true}}
}

type transactionalStubTx struct {
	db *transactionalStubDB

	pendingBoards  map[int32]db.Board
	pendingMembers map[memberKey]db.BoardMember

	closed bool
}

func (tx *transactionalStubTx) Begin(context.Context) (pgx.Tx, error) {
	return nil, fmt.Errorf("nested transactions not supported")
}

func (tx *transactionalStubTx) Commit(context.Context) error {
	if tx.closed {
		return fmt.Errorf("transaction already closed")
	}
	tx.closed = true
	tx.db.commitCalls++

	for id, board := range tx.pendingBoards {
		tx.db.boards[id] = board
	}
	for key, member := range tx.pendingMembers {
		tx.db.members[key] = member
	}
	return nil
}

func (tx *transactionalStubTx) Rollback(context.Context) error {
	if tx.closed {
		return nil
	}
	tx.closed = true
	tx.db.rollbackCalls++
	return nil
}

func (tx *transactionalStubTx) CopyFrom(context.Context, pgx.Identifier, []string, pgx.CopyFromSource) (int64, error) {
	tx.db.t.Fatalf("unexpected CopyFrom call")
	return 0, fmt.Errorf("unexpected CopyFrom call")
}

func (tx *transactionalStubTx) SendBatch(context.Context, *pgx.Batch) pgx.BatchResults {
	tx.db.t.Fatalf("unexpected SendBatch call")
	return nil
}

func (tx *transactionalStubTx) LargeObjects() pgx.LargeObjects {
	return pgx.LargeObjects{}
}

func (tx *transactionalStubTx) Prepare(context.Context, string, string) (*pgconn.StatementDescription, error) {
	tx.db.t.Fatalf("unexpected Prepare call")
	return nil, fmt.Errorf("unexpected Prepare call")
}

func (tx *transactionalStubTx) Exec(context.Context, string, ...any) (pgconn.CommandTag, error) {
	tx.db.t.Fatalf("unexpected Exec call on tx")
	return pgconn.CommandTag{}, fmt.Errorf("unexpected Exec call")
}

func (tx *transactionalStubTx) Query(context.Context, string, ...any) (pgx.Rows, error) {
	tx.db.t.Fatalf("unexpected Query call on tx")
	return nil, fmt.Errorf("unexpected Query call")
}

func (tx *transactionalStubTx) QueryRow(ctx context.Context, query string, args ...any) pgx.Row {
	switch {
	case strings.Contains(query, "INSERT INTO boards"):
		if len(args) != 2 {
			tx.db.t.Fatalf("unexpected create board args: %v", args)
		}
		name, _ := args[0].(string)
		ownerID, ok := toInt32(args[1])
		if !ok {
			tx.db.t.Fatalf("unexpected owner id type %T", args[1])
		}
		board := tx.db.newBoard(name, ownerID)
		tx.pendingBoards[board.ID] = board
		return &createBoardRow{board: board}
	case strings.Contains(query, "INSERT INTO board_members"):
		if tx.db.addMemberErr != nil {
			return &createBoardRow{err: tx.db.addMemberErr}
		}
		if len(args) != 3 {
			tx.db.t.Fatalf("unexpected add member args: %v", args)
		}
		boardID, ok := toInt32(args[0])
		if !ok {
			tx.db.t.Fatalf("unexpected board id type %T", args[0])
		}
		userID, ok := toInt32(args[1])
		if !ok {
			tx.db.t.Fatalf("unexpected user id type %T", args[1])
		}
		role, _ := args[2].(string)
		member := db.BoardMember{BoardID: boardID, UserID: userID, Role: role}
		tx.pendingMembers[memberKey{boardID: boardID, userID: userID}] = member
		return &createBoardRow{member: member}
	default:
		tx.db.t.Fatalf("unexpected QueryRow query: %s", query)
	}
	return &createBoardRow{err: fmt.Errorf("unexpected query")}
}

func (tx *transactionalStubTx) Conn() *pgx.Conn {
	return nil
}

type createBoardRow struct {
	board  db.Board
	member db.BoardMember
	err    error
}

func (r *createBoardRow) Scan(dest ...any) error {
	if r.err != nil {
		return r.err
	}

	switch len(dest) {
	case 4:
		idPtr, ok := dest[0].(*int32)
		if !ok {
			return fmt.Errorf("unexpected dest[0] type %T", dest[0])
		}
		namePtr, ok := dest[1].(*string)
		if !ok {
			return fmt.Errorf("unexpected dest[1] type %T", dest[1])
		}
		ownerPtr, ok := dest[2].(*int32)
		if !ok {
			return fmt.Errorf("unexpected dest[2] type %T", dest[2])
		}
		createdPtr, ok := dest[3].(*pgtype.Timestamp)
		if !ok {
			return fmt.Errorf("unexpected dest[3] type %T", dest[3])
		}

		*idPtr = r.board.ID
		*namePtr = r.board.Name
		*ownerPtr = r.board.OwnerID
		*createdPtr = r.board.CreatedAt
		return nil
	case 3:
		boardPtr, ok := dest[0].(*int32)
		if !ok {
			return fmt.Errorf("unexpected dest[0] type %T", dest[0])
		}
		userPtr, ok := dest[1].(*int32)
		if !ok {
			return fmt.Errorf("unexpected dest[1] type %T", dest[1])
		}
		rolePtr, ok := dest[2].(*string)
		if !ok {
			return fmt.Errorf("unexpected dest[2] type %T", dest[2])
		}

		*boardPtr = r.member.BoardID
		*userPtr = r.member.UserID
		*rolePtr = r.member.Role
		return nil
	default:
		return fmt.Errorf("unexpected dest length: %d", len(dest))
	}
}
