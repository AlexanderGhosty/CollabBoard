package websocket

import (
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
	for {
		select {
		case c := <-h.register:
			h.mu.Lock()
			if h.rooms[c.boardID] == nil {
				h.rooms[c.boardID] = make(map[*Client]bool)
			}
			h.rooms[c.boardID][c] = true
			h.mu.Unlock()
		case c := <-h.unregister:
			h.mu.Lock()
			if clients, ok := h.rooms[c.boardID]; ok {
				if _, ok := clients[c]; ok {
					delete(clients, c)
					close(c.send)
					if len(clients) == 0 {
						delete(h.rooms, c.boardID)
					}
				}
			}
			h.mu.Unlock()
		case b := <-h.broadcast:
			h.mu.RLock()
			if clients, ok := h.rooms[b.boardID]; ok {
				for c := range clients {
					select {
					case c.send <- b.message:
					default:
						// client buffer full; disconnect
						close(c.send)
						delete(clients, c)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Broadcast encodes msg to JSON and sends to all clients of boardID.
func (h *Hub) Broadcast(boardID int32, msg EventMessage) {
	if data, err := json.Marshal(msg); err == nil {
		h.broadcast <- broadcastRequest{boardID: boardID, message: data}
	}
}
