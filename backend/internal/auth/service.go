package auth

import (
	"context"
	"errors"
	"strconv"
	"time"

	db "backend/internal/db/sqlc"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo      Repository
	jwtSecret string
}

func NewService(repo Repository, secret string) *Service {
	return &Service{repo: repo, jwtSecret: secret}
}

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidPassword    = errors.New("current password is incorrect")
)

func (s *Service) Register(ctx context.Context, name, email, password string) (string, UserPublic, error) {
	if _, err := s.repo.GetUserByEmail(ctx, email); err == nil {
		return "", UserPublic{}, errors.New("email already registered")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", UserPublic{}, errors.New("failed to hash password")
	}
	u, err := s.repo.CreateUser(ctx, db.CreateUserParams{
		Name:         name,
		Email:        email,
		PasswordHash: string(hash),
	})
	if err != nil {
		return "", UserPublic{}, err
	}
	token, err := s.generateToken(u.ID)
	if err != nil {
		return "", UserPublic{}, errors.New("failed to generate token")
	}
	return token, UserPublic{ID: u.ID, Name: u.Name, Email: u.Email}, nil
}

func (s *Service) Login(ctx context.Context, email, password string) (string, UserPublic, error) {
	u, err := s.repo.GetUserByEmail(ctx, email)
	if err != nil {
		return "", UserPublic{}, ErrInvalidCredentials
	}
	if bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password)) != nil {
		return "", UserPublic{}, ErrInvalidCredentials
	}
	token, err := s.generateToken(u.ID)
	if err != nil {
		return "", UserPublic{}, errors.New("failed to generate token")
	}
	return token, UserPublic{ID: u.ID, Name: u.Name, Email: u.Email}, nil
}

func (s *Service) GetUserByID(ctx context.Context, id int32) (UserPublic, error) {
	u, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return UserPublic{}, err
	}
	return UserPublic{ID: u.ID, Name: u.Name, Email: u.Email}, nil
}

func (s *Service) ChangePassword(ctx context.Context, userID int32, currentPassword, newPassword string) error {
	// Get the user to verify the current password
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	// Verify the current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidPassword
	}

	// Hash the new password
	newHash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// Update the password hash
	_, err = s.repo.UpdatePasswordHash(ctx, db.UpdatePasswordHashParams{
		ID:           userID,
		PasswordHash: string(newHash),
	})
	return err
}

func (s *Service) generateToken(userID int32) (string, error) {
	claims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
		Subject:   strconv.Itoa(int(userID)),
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(s.jwtSecret))
}
