package auth

import (
	"context"
	"errors"
	"strconv"
	"testing"
	"time"

	db "backend/internal/db/sqlc"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

type stubRepository struct {
	t *testing.T

	getUserByEmailFunc     func(ctx context.Context, email string) (db.User, error)
	createUserFunc         func(ctx context.Context, arg db.CreateUserParams) (db.User, error)
	getUserByIDFunc        func(ctx context.Context, id int32) (db.User, error)
	updatePasswordHashFunc func(ctx context.Context, arg db.UpdatePasswordHashParams) (db.User, error)

	getUserByEmailArgs     []string
	createUserArgs         []db.CreateUserParams
	getUserByIDArgs        []int32
	updatePasswordHashArgs []db.UpdatePasswordHashParams
}

func newStubRepository(t *testing.T) *stubRepository {
	t.Helper()
	return &stubRepository{t: t}
}

func (s *stubRepository) GetUserByEmail(ctx context.Context, email string) (db.User, error) {
	s.getUserByEmailArgs = append(s.getUserByEmailArgs, email)
	if s.getUserByEmailFunc == nil {
		s.t.Fatalf("unexpected call to GetUserByEmail with email %s", email)
	}
	return s.getUserByEmailFunc(ctx, email)
}

func (s *stubRepository) CreateUser(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
	s.createUserArgs = append(s.createUserArgs, arg)
	if s.createUserFunc == nil {
		s.t.Fatalf("unexpected call to CreateUser with arg %+v", arg)
	}
	return s.createUserFunc(ctx, arg)
}

func (s *stubRepository) GetUserByID(ctx context.Context, id int32) (db.User, error) {
	s.getUserByIDArgs = append(s.getUserByIDArgs, id)
	if s.getUserByIDFunc == nil {
		s.t.Fatalf("unexpected call to GetUserByID with id %d", id)
	}
	return s.getUserByIDFunc(ctx, id)
}

func (s *stubRepository) UpdatePasswordHash(ctx context.Context, arg db.UpdatePasswordHashParams) (db.User, error) {
	s.updatePasswordHashArgs = append(s.updatePasswordHashArgs, arg)
	if s.updatePasswordHashFunc == nil {
		s.t.Fatalf("unexpected call to UpdatePasswordHash with arg %+v", arg)
	}
	return s.updatePasswordHashFunc(ctx, arg)
}

func TestService_Register_Succeeds(t *testing.T) {
	t.Parallel()

	const (
		name     = "Jane Doe"
		email    = "jane@example.com"
		password = "super-secret"
		secret   = "test-secret"
		userID   = int32(42)
	)

	stub := newStubRepository(t)
	stub.getUserByEmailFunc = func(ctx context.Context, gotEmail string) (db.User, error) {
		require.Equal(t, email, gotEmail)
		return db.User{}, errors.New("not found")
	}
	stub.createUserFunc = func(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
		require.Equal(t, name, arg.Name)
		require.Equal(t, email, arg.Email)
		require.NotEmpty(t, arg.PasswordHash)
		require.NotEqual(t, password, arg.PasswordHash)
		require.NoError(t, bcrypt.CompareHashAndPassword([]byte(arg.PasswordHash), []byte(password)))
		return db.User{ID: userID, Name: arg.Name, Email: arg.Email, PasswordHash: arg.PasswordHash}, nil
	}

	svc := NewService(stub, secret)

	token, user, err := svc.Register(context.Background(), name, email, password)
	require.NoError(t, err)
	require.Equal(t, UserPublic{ID: userID, Name: name, Email: email}, user)
	require.NotEmpty(t, token)

	claims := &jwt.RegisteredClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	require.NoError(t, err)
	require.True(t, parsed.Valid)
	require.Equal(t, userID, func() int32 {
		id, err := strconv.Atoi(claims.Subject)
		require.NoError(t, err)
		return int32(id)
	}())
	require.WithinDuration(t, time.Now().Add(24*time.Hour), claims.ExpiresAt.Time, time.Second*5)
}

func TestService_Register_EmailAlreadyExists(t *testing.T) {
	t.Parallel()

	stub := newStubRepository(t)
	stub.getUserByEmailFunc = func(ctx context.Context, email string) (db.User, error) {
		return db.User{ID: 1}, nil
	}

	svc := NewService(stub, "secret")

	token, user, err := svc.Register(context.Background(), "name", "email@example.com", "password")
	require.Error(t, err)
	require.EqualError(t, err, "email already registered")
	require.Empty(t, token)
	require.Equal(t, UserPublic{}, user)
	require.Empty(t, stub.createUserArgs)
}

func TestService_Register_CreateUserError(t *testing.T) {
	t.Parallel()

	expectedErr := errors.New("create failed")

	stub := newStubRepository(t)
	stub.getUserByEmailFunc = func(ctx context.Context, email string) (db.User, error) {
		return db.User{}, errors.New("not found")
	}
	stub.createUserFunc = func(ctx context.Context, arg db.CreateUserParams) (db.User, error) {
		return db.User{}, expectedErr
	}

	svc := NewService(stub, "secret")

	token, user, err := svc.Register(context.Background(), "name", "email@example.com", "password")
	require.Error(t, err)
	require.ErrorIs(t, err, expectedErr)
	require.Empty(t, token)
	require.Equal(t, UserPublic{}, user)
}

func TestService_Login_Succeeds(t *testing.T) {
	t.Parallel()

	const (
		email    = "login@example.com"
		password = "password123"
		secret   = "login-secret"
		name     = "Log In"
		userID   = int32(77)
	)

	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	require.NoError(t, err)

	stub := newStubRepository(t)
	stub.getUserByEmailFunc = func(ctx context.Context, gotEmail string) (db.User, error) {
		require.Equal(t, email, gotEmail)
		return db.User{ID: userID, Name: name, Email: email, PasswordHash: string(hashed)}, nil
	}

	svc := NewService(stub, secret)

	token, user, err := svc.Login(context.Background(), email, password)
	require.NoError(t, err)
	require.Equal(t, UserPublic{ID: userID, Name: name, Email: email}, user)
	require.NotEmpty(t, token)
}

func TestService_Login_InvalidPassword(t *testing.T) {
	t.Parallel()

	hashed, err := bcrypt.GenerateFromPassword([]byte("correct"), bcrypt.DefaultCost)
	require.NoError(t, err)

	stub := newStubRepository(t)
	stub.getUserByEmailFunc = func(ctx context.Context, email string) (db.User, error) {
		return db.User{PasswordHash: string(hashed)}, nil
	}

	svc := NewService(stub, "secret")

	token, user, err := svc.Login(context.Background(), "email@example.com", "wrong")
	require.Error(t, err)
	require.ErrorIs(t, err, ErrInvalidCredentials)
	require.Empty(t, token)
	require.Equal(t, UserPublic{}, user)
}

func TestService_Login_UserNotFound(t *testing.T) {
	t.Parallel()

	stub := newStubRepository(t)
	stub.getUserByEmailFunc = func(ctx context.Context, email string) (db.User, error) {
		return db.User{}, errors.New("not found")
	}

	svc := NewService(stub, "secret")

	token, user, err := svc.Login(context.Background(), "email@example.com", "password")
	require.Error(t, err)
	require.ErrorIs(t, err, ErrInvalidCredentials)
	require.Empty(t, token)
	require.Equal(t, UserPublic{}, user)
}

func TestService_GetUserByID(t *testing.T) {
	t.Parallel()

	const (
		userID = int32(11)
		name   = "Test User"
		email  = "user@example.com"
	)

	stub := newStubRepository(t)
	stub.getUserByIDFunc = func(ctx context.Context, id int32) (db.User, error) {
		require.Equal(t, userID, id)
		return db.User{ID: userID, Name: name, Email: email}, nil
	}

	svc := NewService(stub, "secret")

	user, err := svc.GetUserByID(context.Background(), userID)
	require.NoError(t, err)
	require.Equal(t, UserPublic{ID: userID, Name: name, Email: email}, user)
}

func TestService_ChangePassword_Succeeds(t *testing.T) {
	t.Parallel()

	const (
		userID          = int32(55)
		currentPassword = "old-password"
		newPassword     = "new-password"
	)

	oldHash, err := bcrypt.GenerateFromPassword([]byte(currentPassword), bcrypt.DefaultCost)
	require.NoError(t, err)

	stub := newStubRepository(t)
	stub.getUserByIDFunc = func(ctx context.Context, id int32) (db.User, error) {
		require.Equal(t, userID, id)
		return db.User{ID: userID, PasswordHash: string(oldHash)}, nil
	}
	stub.updatePasswordHashFunc = func(ctx context.Context, arg db.UpdatePasswordHashParams) (db.User, error) {
		require.Equal(t, userID, arg.ID)
		require.NotEmpty(t, arg.PasswordHash)
		require.NoError(t, bcrypt.CompareHashAndPassword([]byte(arg.PasswordHash), []byte(newPassword)))
		require.NotEqual(t, string(oldHash), arg.PasswordHash)
		return db.User{ID: userID, PasswordHash: arg.PasswordHash}, nil
	}

	svc := NewService(stub, "secret")

	err = svc.ChangePassword(context.Background(), userID, currentPassword, newPassword)
	require.NoError(t, err)
	require.Len(t, stub.updatePasswordHashArgs, 1)
}

func TestService_ChangePassword_InvalidCurrent(t *testing.T) {
	t.Parallel()

	oldHash, err := bcrypt.GenerateFromPassword([]byte("correct"), bcrypt.DefaultCost)
	require.NoError(t, err)

	stub := newStubRepository(t)
	stub.getUserByIDFunc = func(ctx context.Context, id int32) (db.User, error) {
		return db.User{PasswordHash: string(oldHash)}, nil
	}
	stub.updatePasswordHashFunc = func(ctx context.Context, arg db.UpdatePasswordHashParams) (db.User, error) {
		t.Fatalf("UpdatePasswordHash should not be called")
		return db.User{}, nil
	}

	svc := NewService(stub, "secret")

	err = svc.ChangePassword(context.Background(), 1, "wrong", "new")
	require.Error(t, err)
	require.ErrorIs(t, err, ErrInvalidPassword)
	require.Empty(t, stub.updatePasswordHashArgs)
}

func TestService_ChangePassword_UpdateFails(t *testing.T) {
	t.Parallel()

	const userID = int32(99)
	expectedErr := errors.New("update failed")

	oldHash, err := bcrypt.GenerateFromPassword([]byte("old"), bcrypt.DefaultCost)
	require.NoError(t, err)

	stub := newStubRepository(t)
	stub.getUserByIDFunc = func(ctx context.Context, id int32) (db.User, error) {
		return db.User{ID: userID, PasswordHash: string(oldHash)}, nil
	}
	stub.updatePasswordHashFunc = func(ctx context.Context, arg db.UpdatePasswordHashParams) (db.User, error) {
		return db.User{}, expectedErr
	}

	svc := NewService(stub, "secret")

	err = svc.ChangePassword(context.Background(), userID, "old", "new")
	require.Error(t, err)
	require.ErrorIs(t, err, expectedErr)
}

func TestService_GetUserByID_Error(t *testing.T) {
	t.Parallel()

	expectedErr := errors.New("not found")

	stub := newStubRepository(t)
	stub.getUserByIDFunc = func(ctx context.Context, id int32) (db.User, error) {
		return db.User{}, expectedErr
	}

	svc := NewService(stub, "secret")

	user, err := svc.GetUserByID(context.Background(), 1)
	require.Error(t, err)
	require.ErrorIs(t, err, expectedErr)
	require.Equal(t, UserPublic{}, user)
}

func TestService_ChangePassword_GetUserError(t *testing.T) {
	t.Parallel()

	expectedErr := errors.New("db error")

	stub := newStubRepository(t)
	stub.getUserByIDFunc = func(ctx context.Context, id int32) (db.User, error) {
		return db.User{}, expectedErr
	}

	svc := NewService(stub, "secret")

	err := svc.ChangePassword(context.Background(), 1, "old", "new")
	require.Error(t, err)
	require.ErrorIs(t, err, expectedErr)
}
