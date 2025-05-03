package config

import (
	"fmt"
	"os"
)

// Config groups all runtime configuration values that the
// application needs.  Extend the struct when new settings
// are required.
type Config struct {
	DBUrl     string
	JWTSecret string
	Port      string
}

// Load reads mandatory environment variables and returns a
// fully‑populated Config instance.  It validates every value
// and returns an error if something is missing.
func Load() (*Config, error) {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("environment variable JWT_SECRET is required but not set")
	}

	apiPort := os.Getenv("API_PORT")
	if apiPort == "" {
		return nil, fmt.Errorf("environment variable API_PORT is required but not set")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		host := mustEnv("POSTGRES_HOST")
		user := mustEnv("POSTGRES_USER")
		password := mustEnv("POSTGRES_PASSWORD")
		name := mustEnv("POSTGRES_DB")
		port := os.Getenv("POSTGRES_PORT")
		if port == "" {
			port = "5432"
		}

		dbURL = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=disable",
			user,
			password,
			host,
			port,
			name,
		)
	}

	return &Config{
		DBUrl:     dbURL,
		JWTSecret: jwtSecret,
		Port:      apiPort,
	}, nil
}

// MustLoad is a convenience wrapper around Load.  It panics
// on error and therefore should only be used in application
// entry points where an invalid configuration is fatal.
func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(fmt.Errorf("config: %w", err))
	}
	return cfg
}

// mustEnv is an internal helper that short‑circuits Load()
// with a descriptive error when a mandatory environment
// variable is missing.
func mustEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		panic(fmt.Errorf("environment variable %s is required but not set", key))
	}
	return val
}
