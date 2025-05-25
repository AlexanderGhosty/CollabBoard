package websocket

import (
	"backend/internal/logger"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 512
)

type Client struct {
	hub     *Hub
	conn    *websocket.Conn
	send    chan []byte
	boardID int32
	userID  int32
}

func (c *Client) readPump() {
	defer func() {
		logger.Debug("WebSocket client disconnecting",
			"board_id", c.boardID,
			"user_id", c.userID,
		)
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Warn("WebSocket unexpected close error",
					"board_id", c.boardID,
					"user_id", c.userID,
					"error", err,
				)
			}
			break // ignore incoming payload for now
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				logger.Debug("WebSocket write error",
					"board_id", c.boardID,
					"user_id", c.userID,
					"error", err,
				)
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				logger.Debug("WebSocket ping error",
					"board_id", c.boardID,
					"user_id", c.userID,
					"error", err,
				)
				return
			}
		}
	}
}
