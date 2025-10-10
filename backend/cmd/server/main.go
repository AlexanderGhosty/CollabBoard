// Package main CollabBoard API
//
//	@title                  CollabBoard API
//	@version                1.0
//	@description    Collaborative Kanban board application with real-time updates
//	@termsOfService http://swagger.io/terms/
//
//	@contact.name   API Support
//	@contact.url    http://www.swagger.io/support
//	@contact.email  support@swagger.io
//
//	@license.name   Apache 2.0
//	@license.url    http://www.apache.org/licenses/LICENSE-2.0.html
//
//	@host           localhost:8080
//	@BasePath       /
//
//	@securityDefinitions.apikey     BearerAuth
//	@in                                                     header
//	@name                                           Authorization
//	@description                            Type "Bearer" followed by a space and JWT token.
package main

import (
	"backend/docs"
	"backend/internal/auth"
	"backend/internal/boards"
	"backend/internal/cards"
	"backend/internal/config"
	db "backend/internal/db/sqlc"
	"backend/internal/jobs"
	"backend/internal/lists"
	"backend/internal/logger"
	"backend/internal/middleware"
	"backend/internal/websocket"
	"context"
	"errors"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// ServerDeps captures the runtime dependencies required to construct the HTTP
// server and router. Tests can supply fakes for each dependency to exercise the
// wiring without touching external systems.
type ServerDeps struct {
	DB                       db.DBTX
	CloseDB                  func()
	Hub                      *websocket.Hub
	HubRunner                websocket.HubRunner
	NormalizerFactory        func(*lists.Service, *db.Queries) jobs.Normalizer
	NormalizerStartLogFields []any
}

func buildServer(cfg *config.Config, deps ServerDeps) (*http.Server, *gin.Engine, func()) {
	if cfg == nil {
		log.Fatal("config must not be nil")
	}
	if deps.DB == nil {
		log.Fatal("database dependency must not be nil")
	}
	if deps.Hub == nil {
		log.Fatal("websocket hub must not be nil")
	}
	if deps.HubRunner == nil {
		log.Fatal("hub runner must not be nil")
	}

	if strings.EqualFold(cfg.Log.Level, "DEBUG") {
		gin.SetMode(gin.DebugMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global middleware
	r.Use(logger.RequestLogging())
	r.Use(logger.Recovery())
	r.Use(middleware.CORS())

	// Health‑check
	// healthCheck checks if the server is running
	//
	//	@Summary		Health check
	//	@Description	Check if the server is running and healthy
	//	@Tags			Health
	//	@Produce		json
	//	@Success		200	{object}	map[string]string	"Server is healthy"
	//	@Router			/health [get]
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Swagger documentation
	docs.SwaggerInfo.Title = "CollabBoard API"
	docs.SwaggerInfo.Description = "Collaborative Kanban board application with real-time updates"
	docs.SwaggerInfo.Version = "1.0"
	docs.SwaggerInfo.Host = "localhost:8080"
	docs.SwaggerInfo.BasePath = "/"
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	queries := db.New(deps.DB)

	// Auth routes (public + /auth/me)
	authRepo := auth.NewRepository(queries)
	authSvc := auth.NewService(authRepo, cfg.JWTSecret)
	auth.RegisterRoutes(r, authSvc, cfg.JWTSecret)

	// Protected API routes
	api := r.Group("/api")
	api.Use(middleware.Auth(cfg.JWTSecret))

	deps.HubRunner(deps.Hub)

	var txBeginner boards.TxBeginner
	if candidate, ok := deps.DB.(boards.TxBeginner); ok {
		txBeginner = candidate
	}

	boardsRepo := boards.NewRepository(queries, txBeginner)
	boardsSvc := boards.NewService(boardsRepo, deps.Hub)
	boards.RegisterRoutes(api, boardsSvc)

	listsRepo := lists.NewRepository(queries)
	listsSvc := lists.NewService(listsRepo, listsRepo, deps.Hub)
	lists.RegisterRoutes(api, listsSvc)

	cardsRepo := cards.NewRepository(queries)
	cardsSvc := cards.NewService(cardsRepo, listsRepo, boardsRepo, deps.Hub)
	cards.RegisterRoutes(api, cardsSvc)

	r.GET("/ws/board/:id", func(c *gin.Context) {
		websocket.ServeBoardWS(c, deps.Hub, queries, cfg.JWTSecret)
	})

	var cleanupFuncs []func()

	if deps.NormalizerFactory != nil {
		if normalizer := deps.NormalizerFactory(listsSvc, queries); normalizer != nil {
			normalizer.Start()
			cleanupFuncs = append(cleanupFuncs, normalizer.Stop)
			if len(deps.NormalizerStartLogFields) > 0 {
				logger.Info("Position normalizer background job started", deps.NormalizerStartLogFields...)
			} else {
				logger.Info("Position normalizer background job started")
			}
		}
	}

	if deps.CloseDB != nil {
		cleanupFuncs = append(cleanupFuncs, deps.CloseDB)
	}

	cleanup := func() {
		for i := len(cleanupFuncs) - 1; i >= 0; i-- {
			cleanupFuncs[i]()
		}
	}

	srv := &http.Server{
		Addr:    net.JoinHostPort("", cfg.Port),
		Handler: r,
	}

	return srv, r, cleanup
}

func main() {
	cfg := config.Load()

	// Initialize structured logging
	if err := logger.Initialize(cfg.Log); err != nil {
		log.Fatalf("failed to initialize logger: %v", err)
	}
	logger.Info("Starting CollabBoard server", "version", "1.0.0", "log_level", cfg.Log.Level)

	dbCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	pool, err := pgxpool.New(dbCtx, cfg.DBUrl)
	cancel()
	if err != nil {
		logger.Fatal("cannot connect to DB", "error", err)
	}
	logger.Info("Database connection established")

	hub := websocket.NewHub()

	srv, _, cleanup := buildServer(cfg, ServerDeps{
		DB:      pool,
		CloseDB: pool.Close,
		Hub:     hub,
		HubRunner: func(h *websocket.Hub) {
			go h.Run()
		},
		NormalizerFactory: func(listsSvc *lists.Service, queries *db.Queries) jobs.Normalizer {
			return jobs.NewPositionNormalizer(listsSvc, queries, 30*time.Minute)
		},
		NormalizerStartLogFields: []any{"interval", "30m"},
	})
	defer cleanup()

	// Start server in background so we can listen for shutdown signals
	serverErrCh := make(chan error, 1)
	go func() {
		logger.Info("Starting HTTP server", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErrCh <- err
		}
		close(serverErrCh)
	}()

	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	select {
	case <-shutdownCtx.Done():
		logger.Info("Shutdown signal received, stopping server")
	case err := <-serverErrCh:
		if err != nil {
			logger.Fatal("server failed", "error", err)
		}
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Error("server shutdown error", "error", err)
	} else {
		logger.Info("Server gracefully stopped")
	}
}
