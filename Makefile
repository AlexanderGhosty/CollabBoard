SHELL         := /bin/bash
.SHELLFLAGS   := -eu -o pipefail -c  # Fail fast on errors across recipes

APP_NAME          := collabboard
BACKEND_DIR       := backend
SERVER_PKG        := ./cmd/server
BIN_DIR           := $(BACKEND_DIR)/bin
MIGRATION_DIR     := $(BACKEND_DIR)/internal/db/migrations
GO                := go
K6_SCRIPT         := backend/perf/k6/board-workflow.js
MINIKUBE_PROFILE ?= collabboard
K8S_NAMESPACE   ?= collabboard
KUSTOMIZE_OVERLAY?= k8s/overlays/dev-minikube
BACKEND_IMAGE   ?= collabboard-backend:local
FRONTEND_IMAGE  ?= collabboard-frontend:local
LOG_TARGET      ?= deployment/collabboard-backend

.PHONY: backend docker-up docker-down migrate-up migrate-down lint test format k6-load-test \
        k8s-start k8s-build k8s-load k8s-apply k8s-delete k8s-status k8s-logs

backend:
	@echo "Building $(APP_NAME)…"
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
	@echo "Running backend tests…"
	cd backend && $(GO) test ./... -cover

lint:
	@echo "Running golangci-lint…"
	cd $(BACKEND_DIR) && golangci-lint run ./...

format:
		@echo "Formatting backend code…"
		cd $(BACKEND_DIR) && $(GO) fmt ./...
		cd $(BACKEND_DIR) && $(GO) vet ./...

k6-load-test:
	@command -v k6 >/dev/null 2>&1 || { \
			echo "k6 binary not found. Install k6: https://k6.io/docs/getting-started/installation/"; \
			exit 1; \
	}
	k6 run $(K6_SCRIPT)

k8s-start:
	@echo "Starting Minikube profile '$(MINIKUBE_PROFILE)' and enabling ingress"
	minikube start -p $(MINIKUBE_PROFILE)
	minikube addons enable ingress -p $(MINIKUBE_PROFILE)

k8s-build:
	@echo "Building Docker images inside Minikube daemon"
	eval $$(minikube -p $(MINIKUBE_PROFILE) docker-env) && docker build -t $(BACKEND_IMAGE) backend
	eval $$(minikube -p $(MINIKUBE_PROFILE) docker-env) && docker build -t $(FRONTEND_IMAGE) frontend

k8s-load:
	@echo "Loading locally built images into Minikube"
	minikube image load -p $(MINIKUBE_PROFILE) $(BACKEND_IMAGE)
	minikube image load -p $(MINIKUBE_PROFILE) $(FRONTEND_IMAGE)

k8s-apply:
	@echo "Applying Kubernetes manifests"
	kubectl apply -k $(KUSTOMIZE_OVERLAY)

k8s-delete:
	@echo "Deleting Kubernetes resources"
	kubectl delete -k $(KUSTOMIZE_OVERLAY)

k8s-status:
	@echo "Kubernetes object status"
	kubectl get pods,svc,ingress -n $(K8S_NAMESPACE)

k8s-logs:
	@echo "Streaming logs for $(LOG_TARGET)"
	kubectl logs -n $(K8S_NAMESPACE) -f $(LOG_TARGET)
