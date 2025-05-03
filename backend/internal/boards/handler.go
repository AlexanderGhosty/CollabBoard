package boards

import (
	db "backend/internal/db/sqlc"
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.RouterGroup, svc *Service) {
	g := r.Group("/boards")
	g.POST("", createBoardHandler(svc))
	g.GET("", listBoardsHandler(svc))
	g.GET("/:id", getBoardHandler(svc))
	g.PUT("/:id", updateBoardHandler(svc))
	g.DELETE("/:id", deleteBoardHandler(svc))

	g.GET("/:id/members", listMembersHandler(svc))
	g.POST("/:id/members", addMemberHandler(svc))
	g.DELETE("/:id/members/:userId", deleteMemberHandler(svc))
}

func createBoardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req struct {
			Name string `json:"name" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		userID := int32(c.GetInt("userID"))
		board, err := svc.CreateBoard(c.Request.Context(), userID, req.Name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, board)
	}
}

func listBoardsHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := int32(c.GetInt("userID"))
		boards, err := svc.ListBoards(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, boards)
	}
}

func updateBoardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		var req struct {
			Name string `json:"name" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		userID := int32(c.GetInt("userID"))
		board, err := svc.UpdateBoard(c.Request.Context(), userID, db.UpdateBoardParams{ID: int32(id), Name: req.Name})
		if err != nil {
			if errors.Is(err, ErrForbidden) {
				c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, board)
	}
}

func deleteBoardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		id, _ := strconv.Atoi(c.Param("id"))
		userID := int32(c.GetInt("userID"))
		if err := svc.DeleteBoard(c.Request.Context(), userID, int32(id)); err != nil {
			if errors.Is(err, ErrForbidden) {
				c.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			}
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "Board deleted"})
	}
}

// listMembersHandler, addMemberHandler, deleteMemberHandler omitted for brevity
