package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"backend/internal/config"
	db "backend/internal/db/sqlc"
	"backend/internal/jobs"
	"backend/internal/lists"
	"backend/internal/websocket"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type stubDB struct{}

func (stubDB) Exec(context.Context, string, ...interface{}) (pgconn.CommandTag, error) {
	return pgconn.CommandTag{}, nil
}

func (stubDB) Query(context.Context, string, ...interface{}) (pgx.Rows, error) {
	return nil, nil
}

func (stubDB) QueryRow(context.Context, string, ...interface{}) pgx.Row {
	return nil
}

type fakeNormalizer struct {
	started bool
	stopped bool
}

func (f *fakeNormalizer) Start() {
	f.started = true
}

func (f *fakeNormalizer) Stop() {
	f.stopped = true
}

func TestBuildServerHealth(t *testing.T) {
	cfg := &config.Config{
		Port:      "8080",
		JWTSecret: "secret",
		Log: config.LogConfig{
			Level: "INFO",
		},
	}

	hub := websocket.NewHub()
	normalizer := &fakeNormalizer{}
	hubStarted := false

	srv, engine, cleanup := buildServer(cfg, ServerDeps{
		DB:  stubDB{},
		Hub: hub,
		HubRunner: func(h *websocket.Hub) {
			if h != hub {
				t.Fatalf("expected hub pointer to be passed to runner")
			}
			hubStarted = true
		},
		NormalizerFactory: func(listsSvc *lists.Service, queries *db.Queries) jobs.Normalizer {
			return normalizer
		},
	})

	if srv == nil {
		t.Fatalf("expected server to be constructed")
	}
	if engine == nil {
		t.Fatalf("expected gin engine to be constructed")
	}
	if !hubStarted {
		t.Fatalf("expected hub runner to be invoked")
	}
	if !normalizer.started {
		t.Fatalf("expected normalizer Start to be called")
	}

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	engine.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rec.Code)
	}

	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}

	if body["status"] != "ok" {
		t.Fatalf("expected status 'ok', got %q", body["status"])
	}

	cleanup()

	if !normalizer.stopped {
		t.Fatalf("expected normalizer Stop to be called during cleanup")
	}
}
