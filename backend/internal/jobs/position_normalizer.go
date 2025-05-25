package jobs

import (
	"context"
	"sync"
	"time"

	db "backend/internal/db/sqlc"
	"backend/internal/lists"
	"backend/internal/logger"
)

// PositionNormalizer is a background job that periodically checks for and fixes position conflicts
type PositionNormalizer struct {
	listsSvc    *lists.Service
	queries     *db.Queries
	interval    time.Duration
	stopChan    chan struct{}
	wg          sync.WaitGroup
	isRunning   bool
	runningLock sync.Mutex
}

// NewPositionNormalizer creates a new position normalizer job
func NewPositionNormalizer(listsSvc *lists.Service, queries *db.Queries, interval time.Duration) *PositionNormalizer {
	if interval < time.Minute {
		// Set a reasonable minimum interval to avoid excessive DB load
		interval = time.Minute
	}
	return &PositionNormalizer{
		listsSvc: listsSvc,
		queries:  queries,
		interval: interval,
		stopChan: make(chan struct{}),
	}
}

// Start begins the background job
func (p *PositionNormalizer) Start() {
	p.runningLock.Lock()
	defer p.runningLock.Unlock()

	if p.isRunning {
		logger.Warn("Position normalizer is already running")
		return
	}

	p.isRunning = true
	p.wg.Add(1)
	go p.run()
	logger.Info("Position normalizer started", "interval", p.interval)
}

// Stop halts the background job
func (p *PositionNormalizer) Stop() {
	p.runningLock.Lock()
	defer p.runningLock.Unlock()

	if !p.isRunning {
		logger.Warn("Position normalizer is not running")
		return
	}

	close(p.stopChan)
	p.wg.Wait()
	p.isRunning = false
	logger.Info("Position normalizer stopped")
}

// run is the main loop of the background job
func (p *PositionNormalizer) run() {
	defer p.wg.Done()

	ticker := time.NewTicker(p.interval)
	defer ticker.Stop()

	// Run once immediately at startup
	p.normalizeAllBoards()

	for {
		select {
		case <-ticker.C:
			p.normalizeAllBoards()
		case <-p.stopChan:
			logger.Info("Position normalizer received stop signal")
			return
		}
	}
}

// normalizeAllBoards checks and fixes position conflicts for all boards
func (p *PositionNormalizer) normalizeAllBoards() {
	logger.Info("Starting position normalization for all boards")

	// Get all boards
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	boards, err := p.queries.ListBoards(ctx)
	if err != nil {
		logger.Error("Error fetching boards for position normalization", "error", err)
		return
	}

	logger.Info("Found boards to check for position conflicts", "board_count", len(boards))

	// Process each board
	for _, board := range boards {
		// Create a new context for each board to ensure we don't exceed the timeout
		boardCtx, boardCancel := context.WithTimeout(context.Background(), 10*time.Second)

		// Use the public NormalizeListPositions method to normalize this board
		if err := p.listsSvc.NormalizeListPositions(boardCtx, board.ID); err != nil {
			logger.Error("Error normalizing positions for board",
				"board_id", board.ID,
				"error", err,
			)
		} else {
			logger.Debug("Successfully normalized positions for board", "board_id", board.ID)
		}

		boardCancel()
	}

	logger.Info("Completed position normalization for all boards")
}
