package cards

import (
	db "backend/internal/db/sqlc"
	"github.com/jackc/pgx/v5/pgtype"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.RouterGroup, svc *Service) {
	g := r.Group("/lists/:listId/cards")
	g.POST("", createCardHandler(svc))
	g.GET("", listCardsHandler(svc))
	g.PUT("/:id", updateCardHandler(svc))
	g.PUT("/:id/move", moveCardHandler(svc))
	g.DELETE("/:id", deleteCardHandler(svc))
}

func createCardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		listID, _ := strconv.Atoi(c.Param("listId"))
		var req struct {
			Title       string `json:"title" binding:"required"`
			Description string `json:"description"`
			Position    int32  `json:"position" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		userID := int32(c.GetInt("userID"))
		card, err := svc.Create(c.Request.Context(), userID, int32(listID), req.Title, req.Description, req.Position)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, card)
	}
}

func listCardsHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		listID, _ := strconv.Atoi(c.Param("listId"))
		userID := int32(c.GetInt("userID"))

		cs, err := svc.ListByList(c.Request.Context(), userID, int32(listID))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, cs)
	}
}

func updateCardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		userID := int32(c.GetInt("userID"))

		var req struct {
			Title       string `json:"title"`
			Description string `json:"description"`
			Position    *int32 `json:"position"`
			ListID      *int32 `json:"listId"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		p := db.UpdateCardParams{
			ID:    int32(id),
			Title: req.Title,
			Description: pgtype.Text{
				String: req.Description,
				Valid:  true,
			},
		}
		if req.Position != nil {
			p.Position = *req.Position
		}
		if req.ListID != nil {
			p.ListID = *req.ListID
		}

		card, err := svc.Update(c.Request.Context(), userID, p)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, card)
	}
}

func moveCardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid card id"})
			return
		}

		var req struct {
			ListID   *int32 `json:"listId"`
			Position int32  `json:"position" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		userID := int32(c.GetInt("userID"))

		var dstListID int32
		if req.ListID != nil {
			dstListID = *req.ListID
		}
		card, err := svc.Move(c.Request.Context(), userID, int32(id), dstListID, req.Position)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, card)
	}
}

func deleteCardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		userID := int32(c.GetInt("userID"))

		if err := svc.Delete(c.Request.Context(), userID, int32(id)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "card deleted"})
	}
}
