package cards

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.RouterGroup, svc *Service) {
	g := r.Group("/lists/:listId/cards")
	g.POST("", createCardHandler(svc))
	g.GET("", listCardsHandler(svc))
	g.PUT("/:id", updateCardHandler(svc))
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

// listCardsHandler, updateCardHandler, deleteCardHandler omitted for brevity
