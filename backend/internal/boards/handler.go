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

	g.GET("/:boardId", getBoardHandler(svc))
	g.PUT("/:boardId", updateBoardHandler(svc))
	g.DELETE("/:boardId", deleteBoardHandler(svc))

	g.GET("/:boardId/members", listMembersHandler(svc))
	g.POST("/:boardId/members", addMemberHandler(svc))
	g.DELETE("/:boardId/members/:userId", deleteMemberHandler(svc))
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
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		var req struct {
			Name string `json:"name" binding:"required"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		userID := int32(c.GetInt("userID"))
		board, err := svc.UpdateBoard(c.Request.Context(), userID, db.UpdateBoardParams{ID: int32(boardID), Name: req.Name})
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
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))
		if err := svc.DeleteBoard(c.Request.Context(), userID, int32(boardID)); err != nil {
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

func getBoardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))

		b, err := svc.GetBoard(c.Request.Context(), userID, int32(boardID))
		if err != nil {
			status := http.StatusInternalServerError
			if errors.Is(err, ErrForbidden) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, b)
	}
}

func listMembersHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))

		mems, err := svc.ListMembers(c.Request.Context(), userID, int32(boardID))
		if err != nil {
			status := http.StatusInternalServerError
			if errors.Is(err, ErrForbidden) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, mems)
	}
}

func addMemberHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))

		var req struct {
			UserID int32  `json:"userId" binding:"required"`
			Role   string `json:"role"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		mb, err := svc.AddMember(c.Request.Context(), userID, int32(boardID), req.UserID, req.Role)
		if err != nil {
			status := http.StatusInternalServerError
			if errors.Is(err, ErrForbidden) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, mb)
	}
}

func deleteMemberHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		memberID, _ := strconv.Atoi(c.Param("userId"))
		userID := int32(c.GetInt("userID"))

		if err := svc.RemoveMember(c.Request.Context(), userID, int32(boardID), int32(memberID)); err != nil {
			status := http.StatusInternalServerError
			if errors.Is(err, ErrForbidden) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "member removed"})
	}
}
