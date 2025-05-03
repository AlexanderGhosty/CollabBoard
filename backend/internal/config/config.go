package config

import "os"

type Config struct {
	DBUrl     string
	JWTSecret string
	Port      string
}

func Load() *Config {
	host := getenv("POSTGRES_HOST", "localhost")
	user := getenv("POSTGRES_USER", "postgres")
	pwd := getenv("POSTGRES_PASSWORD", "postgres")
	dbName := getenv("POSTGRES_DB", "postgres")
	port := getenv("API_PORT", "8080")
	secret := getenv("JWT_SECRET", "secret")

	dbURL := "postgres://" + user + ":" + pwd + "@" + host + "/" + dbName + "?sslmode=disable"
	return &Config{DBUrl: dbURL, JWTSecret: secret, Port: port}
}

func getenv(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
