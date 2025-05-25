package websocket

import (
	"backend/internal/logger"
	"net/http"
	"strconv"

	db "backend/internal/db/sqlc"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true }, // allow any origin; adjust in prod
}

// ServeBoardWS upgrades the HTTP request to WebSocket and registers the client to the hub.
// Auth via JWT in `token` query param.
func ServeBoardWS(c *gin.Context, hub *Hub, q *db.Queries, jwtSecret string) {
	boardID64, err := strconv.ParseInt(c.Param("id"), 10, 32)
	if err != nil {
		logger.Warn("WebSocket connection failed: invalid board ID",
			"board_id_param", c.Param("id"),
			"remote_addr", c.ClientIP(),
			"error", err,
		)
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}
	boardID := int32(boardID64)

	tokenStr := c.Query("token")
	if tokenStr == "" {
		// fallback to header if provided
		tokenStr = c.GetHeader("Authorization")
		if len(tokenStr) > 7 && tokenStr[:7] == "Bearer " {
			tokenStr = tokenStr[7:]
		}
	}
	if tokenStr == "" {
		logger.Warn("WebSocket connection failed: missing token",
			"board_id", boardID,
			"remote_addr", c.ClientIP(),
		)
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenUnverifiable
		}
		return []byte(jwtSecret), nil
	})
	if err != nil || !token.Valid {
		logger.Warn("WebSocket connection failed: invalid token",
			"board_id", boardID,
			"remote_addr", c.ClientIP(),
			"error", err,
		)
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		logger.Warn("WebSocket connection failed: invalid claims",
			"board_id", boardID,
			"remote_addr", c.ClientIP(),
		)
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	sub, ok := claims["sub"].(string)
	if !ok {
		logger.Warn("WebSocket connection failed: invalid subject",
			"board_id", boardID,
			"remote_addr", c.ClientIP(),
		)
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	uid64, err := strconv.ParseInt(sub, 10, 32)
	if err != nil {
		logger.Warn("WebSocket connection failed: invalid subject format",
			"board_id", boardID,
			"remote_addr", c.ClientIP(),
			"error", err,
		)
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	userID := int32(uid64)

	// ensure user is member of board
	if _, err := q.GetBoardMember(c.Request.Context(), db.GetBoardMemberParams{BoardID: boardID, UserID: userID}); err != nil {
		logger.Warn("WebSocket connection failed: user not member of board",
			"board_id", boardID,
			"user_id", userID,
			"remote_addr", c.ClientIP(),
			"error", err,
		)
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("WebSocket upgrade failed",
			"board_id", boardID,
			"user_id", userID,
			"remote_addr", c.ClientIP(),
			"error", err,
		)
		return
	}

	logger.Info("WebSocket connection established",
		"board_id", boardID,
		"user_id", userID,
		"remote_addr", c.ClientIP(),
	)

	client := &Client{hub: hub, conn: ws, send: make(chan []byte, 256), boardID: boardID, userID: userID}
	hub.register <- client

	go client.writePump()
	go client.readPump()
}
