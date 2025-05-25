package websocket

import (
	"backend/internal/logger"
	"encoding/json"
	"sync"
)

// Hub maintains active connections grouped by boardID.
// Use Broadcast(boardID, msg) to push an event to all subscribers of the board.
// Register clients via hub.register channel (called from ServeBoardWS).
type Hub struct {
	mu         sync.RWMutex
	rooms      map[int32]map[*Client]bool // boardID → set of clients
	register   chan *Client
	unregister chan *Client
	broadcast  chan broadcastRequest
}

type broadcastRequest struct {
	boardID int32
	message []byte
}

func NewHub() *Hub {
	return &Hub{
		rooms:      make(map[int32]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan broadcastRequest),
	}
}

// Run launches the hub’s event loop (call in goroutine).
func (h *Hub) Run() {
	logger.Info("WebSocket hub started")
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			if h.rooms[c.boardID] == nil {
				h.rooms[c.boardID] = make(map[*Client]bool)
			}
			h.rooms[c.boardID][c] = true
			clientCount := len(h.rooms[c.boardID])
			h.mu.Unlock()

			logger.Debug("WebSocket client registered",
				"board_id", c.boardID,
				"user_id", c.userID,
				"clients_in_board", clientCount,
			)

		case c := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[c.boardID]; ok {
				if _, ok := clients[c]; ok {
					delete(clients, c)
					close(c.send)
					clientCount := len(clients)
					if clientCount == 0 {
						delete(h.rooms, c.boardID)
					}
					h.mu.Unlock()

					logger.Debug("WebSocket client unregistered",
						"board_id", c.boardID,
						"user_id", c.userID,
						"clients_in_board", clientCount,
					)
				} else {
					h.mu.Unlock()
				}
			} else {
				h.mu.Unlock()
			}

		case b := <-h.broadcast:
			h.mu.RLock()
			if clients, ok := h.rooms[b.boardID]; ok {
				clientCount := len(clients)
				successCount := 0
				for c := range clients {
					select {
					case c.send <- b.message:
						successCount++
					default:
						// client buffer full; disconnect
						close(c.send)
						delete(clients, c)
						logger.Warn("WebSocket client disconnected due to full buffer",
							"board_id", c.boardID,
							"user_id", c.userID,
						)
					}
				}
				logger.Debug("WebSocket message broadcasted",
					"board_id", b.boardID,
					"total_clients", clientCount,
					"successful_sends", successCount,
				)
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast encodes msg to JSON and sends to all clients of boardID.
func (h *Hub) Broadcast(boardID int32, msg EventMessage) {
	if data, err := json.Marshal(msg); err == nil {
		h.broadcast <- broadcastRequest{boardID: boardID, message: data}
		logger.Debug("WebSocket broadcast queued",
			"board_id", boardID,
			"event", msg.Event,
		)
	} else {
		logger.Error("Failed to marshal WebSocket message",
			"board_id", boardID,
			"event", msg.Event,
			"error", err,
		)
	}
}
