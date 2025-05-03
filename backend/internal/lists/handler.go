package lists

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.RouterGroup, svc *Service) {
	g := r.Group("/boards/:boardId/lists")
	g.POST("", createListHandler(svc))
	g.GET("", listHandler(svc))
	g.PUT("/:id", updateListHandler(svc))
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

// listHandler, updateListHandler, deleteListHandler omitted for brevity
