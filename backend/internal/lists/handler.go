package lists

import (
	db "backend/internal/db/sqlc"
	"bytes"
	"io"
	"log"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.RouterGroup, svc *Service) {
	g := r.Group("/boards/:boardId/lists")
	g.POST("", createListHandler(svc))
	g.GET("", listHandler(svc))
	g.PUT("/:id", updateListHandler(svc))
	g.PUT("/:id/move", moveListHandler(svc))
	g.DELETE("/:id", deleteListHandler(svc))
}

func createListHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		var req struct {
			Title    string `json:"title" binding:"required"`
			Position int32  `json:"position" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		userID := int32(c.GetInt("userID"))
		lst, err := svc.Create(c.Request.Context(), userID, int32(boardID), req.Title, req.Position)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, lst)
	}
}

func listHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))

		lsts, err := svc.ListByBoard(c.Request.Context(), userID, int32(boardID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, lsts)
	}
}

func updateListHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		userID := int32(c.GetInt("userID"))

		var req struct {
			Title    string `json:"title"`
			Position *int32 `json:"position"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		p := db.UpdateListParams{ID: int32(id), Title: req.Title}
		if req.Position != nil {
			p.Position = *req.Position
		}
		lst, err := svc.Update(c.Request.Context(), userID, p)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, lst)
	}
}

func moveListHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		boardID, _ := strconv.Atoi(c.Param("boardId"))

		// Log the request details
		log.Printf("Move list request: listID=%d, boardID=%d", id, boardID)

		// Read the raw request body for logging
		bodyBytes, _ := io.ReadAll(c.Request.Body)
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes)) // Reset the body

		log.Printf("Move list request body: %s", string(bodyBytes))

		var req struct {
			Position float64 `json:"position"` // Changed to float64 to handle decimal positions
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			log.Printf("Move list binding error: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		log.Printf("Move list parsed position: %f", req.Position)

		// Convert float64 to int32 for the database
		position := int32(math.Round(req.Position))
		log.Printf("Move list rounded position: %d", position)

		userID := int32(c.GetInt("userID"))
		lst, err := svc.Move(c.Request.Context(), userID, int32(id), position)
		if err != nil {
			log.Printf("Move list service error: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		log.Printf("Move list success: list=%+v", lst)
		c.JSON(http.StatusOK, lst)
	}
}

func deleteListHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		userID := int32(c.GetInt("userID"))

		if err := svc.Delete(c.Request.Context(), userID, int32(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "list deleted"})
	}
}
