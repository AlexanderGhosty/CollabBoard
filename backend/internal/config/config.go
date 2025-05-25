package config

import "os"

type Config struct {
	DBUrl     string
	JWTSecret string
	Port      string
	Log       LogConfig
}

type LogConfig struct {
	Level  string // DEBUG, INFO, WARN, ERROR, FATAL
	Format string // json, text
	Output string // stdout, file
}

func Load() *Config {
	host := getenv("POSTGRES_HOST", "localhost")
	user := getenv("POSTGRES_USER", "postgres")
	pwd := getenv("POSTGRES_PASSWORD", "postgres")
	dbName := getenv("POSTGRES_DB", "postgres")
	port := getenv("API_PORT", "8080")
	secret := getenv("JWT_SECRET", "secret")

	dbURL := "postgres://" + user + ":" + pwd + "@" + host + "/" + dbName + "?sslmode=disable"

	logConfig := LogConfig{
		Level:  getenv("LOG_LEVEL", "INFO"),
		Format: getenv("LOG_FORMAT", "json"),
		Output: getenv("LOG_OUTPUT", "stdout"),
	}

	return &Config{
		DBUrl:     dbURL,
		JWTSecret: secret,
		Port:      port,
		Log:       logConfig,
	}
}

func getenv(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
