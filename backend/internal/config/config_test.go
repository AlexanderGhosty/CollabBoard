package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_Defaults(t *testing.T) {
	clearEnv := func() {
		os.Unsetenv("POSTGRES_HOST")
		os.Unsetenv("POSTGRES_USER")
		os.Unsetenv("POSTGRES_PASSWORD")
		os.Unsetenv("POSTGRES_DB")
		os.Unsetenv("API_PORT")
		os.Unsetenv("JWT_SECRET")
	}
	clearEnv()
	cfg := Load()

	assert.Equal(t, "postgres://postgres:postgres@localhost/postgres?sslmode=disable", cfg.DBUrl)
	assert.Equal(t, "secret", cfg.JWTSecret)
	assert.Equal(t, "8080", cfg.Port)
}

func TestLoad_Overrides(t *testing.T) {
	envs := map[string]string{
		"POSTGRES_HOST":     "db",
		"POSTGRES_USER":     "user",
		"POSTGRES_PASSWORD": "pass",
		"POSTGRES_DB":       "appdb",
		"API_PORT":          "9000",
		"JWT_SECRET":        "supersecret",
	}
	for k, v := range envs {
		os.Setenv(k, v)
		defer os.Unsetenv(k)
	}

	cfg := Load()
	assert.Equal(t, "postgres://user:pass@db/appdb?sslmode=disable", cfg.DBUrl)
	assert.Equal(t, "supersecret", cfg.JWTSecret)
	assert.Equal(t, "9000", cfg.Port)
}
