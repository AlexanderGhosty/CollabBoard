package main

import (
	"backend/internal/auth"
	"backend/internal/boards"
	"backend/internal/cards"
	"backend/internal/config"
	db "backend/internal/db/sqlc"
	"backend/internal/jobs"
	"backend/internal/lists"
	"backend/internal/middleware"
	"backend/internal/websocket"
	"context"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, cfg.DBUrl)
	if err != nil {
		log.Fatalf("cannot connect to DB: %v", err)
	}
	defer pool.Close()

	queries := db.New(pool)

	r := gin.Default()

	// Global middleware
	r.Use(middleware.CORS())

	// Health‑check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// Auth routes (public + /auth/me)
	authSvc := auth.NewService(queries, cfg.JWTSecret)
	auth.RegisterRoutes(r, authSvc, cfg.JWTSecret)

	// Protected API routes
	api := r.Group("/api")
	api.Use(middleware.Auth(cfg.JWTSecret))

	hub := websocket.NewHub()
	go hub.Run()

	boardsRepo := boards.NewRepository(queries)
	boardsSvc := boards.NewService(boardsRepo, hub)
	boards.RegisterRoutes(api, boardsSvc)

	listsRepo := lists.NewRepository(queries)
	listsSvc := lists.NewService(listsRepo, queries, hub)
	lists.RegisterRoutes(api, listsSvc)

	cardsRepo := cards.NewRepository(queries)
	cardsSvc := cards.NewService(cardsRepo, queries, hub)
	cards.RegisterRoutes(api, cardsSvc)

	// User profile endpoint
	api.GET("/me", func(c *gin.Context) {
		user, err := authSvc.GetUserByID(c.Request.Context(), int32(c.GetInt("userID")))
		if err != nil {
			c.JSON(500, gin.H{"error": "failed to get user profile"})
			return
		}
		c.JSON(200, user)
	})

	// WS route (no auth middleware – inside handler)
	r.GET("/ws/board/:id", func(c *gin.Context) {
		websocket.ServeBoardWS(c, hub, queries, cfg.JWTSecret)
	})

	// Start the position normalizer background job
	// Run every 30 minutes to check and fix any position conflicts
	positionNormalizer := jobs.NewPositionNormalizer(listsSvc, queries, 30*time.Minute)
	positionNormalizer.Start()
	defer positionNormalizer.Stop()

	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
