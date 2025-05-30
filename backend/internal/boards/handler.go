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
	g.GET("/by-role/:role", listBoardsByRoleHandler(svc))

	g.GET("/:boardId", getBoardHandler(svc))
	g.PUT("/:boardId", updateBoardHandler(svc))
	g.DELETE("/:boardId", deleteBoardHandler(svc))

	g.GET("/:boardId/members", listMembersHandler(svc))
	g.POST("/:boardId/members", addMemberHandler(svc))
	g.DELETE("/:boardId/members/:userId", deleteMemberHandler(svc))
	g.POST("/:boardId/members/invite", inviteMemberByEmailHandler(svc))
	g.POST("/:boardId/members/leave", leaveBoardHandler(svc))
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

		// Return board with role information for the creator
		response := gin.H{
			"ID":        board.ID,
			"Name":      board.Name,
			"OwnerID":   board.OwnerID,
			"CreatedAt": board.CreatedAt,
			"role":      "owner", // Creator is always the owner
		}
		c.JSON(http.StatusCreated, response)
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

func listBoardsByRoleHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.Param("role")
		// Validate role parameter
		if role != "owner" && role != "member" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role parameter, must be 'owner' or 'member'"})
			return
		}

		userID := int32(c.GetInt("userID"))
		boards, err := svc.ListBoardsByRole(c.Request.Context(), userID, role)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, boards)
	}
}

func inviteMemberByEmailHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))

		var req struct {
			Email string `json:"email" binding:"required,email"`
			Role  string `json:"role"`
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Default role to "member" if not specified
		if req.Role == "" {
			req.Role = "member"
		}

		// Validate role
		if req.Role != "owner" && req.Role != "member" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid role, must be 'owner' or 'member'"})
			return
		}

		member, err := svc.AddMemberByEmail(c.Request.Context(), userID, int32(boardID), req.Email, req.Role)
		if err != nil {
			status := http.StatusInternalServerError
			if errors.Is(err, ErrForbidden) {
				status = http.StatusForbidden
			} else if errors.Is(err, ErrUserNotFound) {
				status = http.StatusNotFound
				c.JSON(status, gin.H{"error": "user with this email not found"})
				return
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, member)
	}
}

// Handler for a user to leave a board
func leaveBoardHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))

		err := svc.LeaveBoard(c.Request.Context(), userID, int32(boardID))
		if err != nil {
			status := http.StatusInternalServerError
			if errors.Is(err, ErrForbidden) {
				status = http.StatusForbidden
			}
			c.JSON(status, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Successfully left the board"})
	}
}
