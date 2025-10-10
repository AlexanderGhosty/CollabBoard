SHELL         := /bin/bash
.SHELLFLAGS   := -eu -o pipefail -c  # Fail fast on errors across recipes

APP_NAME      := collabboard
BACKEND_DIR   := backend
SERVER_PKG    := ./cmd/server
BIN_DIR       := $(BACKEND_DIR)/bin
MIGRATION_DIR := $(BACKEND_DIR)/internal/db/migrations
GO            := go

.PHONY: backend docker-up docker-down migrate-up migrate-down lint test format

backend:
	@echo "→ Building $(APP_NAME)…"
	@mkdir -p $(BIN_DIR)
	cd $(BACKEND_DIR) && $(GO) build -o bin/$(APP_NAME) $(SERVER_PKG)

# lint:
# 	@echo "→ Running go vet…"
# 	$(GO) vet ./...

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

migrate-up:
	@if [ -z "$(DB_URL)" ]; then \
		echo "DB_URL is not set"; exit 1; \
	fi
	migrate -source "file://$(MIGRATION_DIR)" -database "$(DB_URL)" -verbose up

migrate-down:
	@if [ -z "$(DB_URL)" ]; then \
		echo "DB_URL is not set"; exit 1; \
	fi
	migrate -source "file://$(MIGRATION_DIR)" -database "$(DB_URL)" -verbose down

test:
	@echo "→ Running backend tests…"
	cd backend && $(GO) test ./... -cover

lint:
	@echo "→ Running golangci-lint…"
	cd $(BACKEND_DIR) && golangci-lint run ./...

format:
	@echo "→ Formatting backend code…"
	cd $(BACKEND_DIR) && $(GO) fmt ./...
	cd $(BACKEND_DIR) && $(GO) vet ./...
