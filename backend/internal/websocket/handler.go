package websocket

import (
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
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	claims, _ := token.Claims.(jwt.MapClaims)
	sub, _ := claims["sub"].(string)
	uid64, _ := strconv.ParseInt(sub, 10, 32)
	userID := int32(uid64)

	// ensure user is member of board
	if _, err := q.GetBoardMember(c.Request.Context(), db.GetBoardMemberParams{BoardID: boardID, UserID: userID}); err != nil {
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	client := &Client{hub: hub, conn: ws, send: make(chan []byte, 256), boardID: boardID}
	hub.register <- client

	go client.writePump()
	go client.readPump()
}
