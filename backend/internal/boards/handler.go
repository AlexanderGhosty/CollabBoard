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

// createBoardHandler creates a new board
//
//	@Summary		Create a new board
//	@Description	Create a new Kanban board with the authenticated user as owner
//	@Tags			Boards
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			request	body		CreateBoardRequest	true	"Board creation details"
//	@Success		201		{object}	BoardResponse		"Board created successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request"
//	@Failure		401		{object}	ErrorResponse		"Unauthorized"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/api/boards [post]
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

// listBoardsHandler lists all boards for the authenticated user
//
//	@Summary		List user's boards
//	@Description	Get all boards where the authenticated user is a member or owner
//	@Tags			Boards
//	@Produce		json
//	@Security		BearerAuth
//	@Success		200	{array}		BoardResponse	"List of boards"
//	@Failure		401	{object}	ErrorResponse	"Unauthorized"
//	@Failure		500	{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards [get]
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

// updateBoardHandler updates a board
//
//	@Summary		Update board
//	@Description	Update board information (only board owners can update)
//	@Tags			Boards
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int					true	"Board ID"
//	@Param			request	body		UpdateBoardRequest	true	"Board update details"
//	@Success		200		{object}	BoardResponse		"Board updated successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request"
//	@Failure		401		{object}	ErrorResponse		"Unauthorized"
//	@Failure		403		{object}	ErrorResponse		"Forbidden - only owners can update"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/api/boards/{boardId} [put]
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

// deleteBoardHandler deletes a board
//
//	@Summary		Delete board
//	@Description	Delete a board (only board owners can delete)
//	@Tags			Boards
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int				true	"Board ID"
//	@Success		200		{object}	MessageResponse	"Board deleted successfully"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		403		{object}	ErrorResponse	"Forbidden - only owners can delete"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/{boardId} [delete]
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

// getBoardHandler gets a specific board by ID
//
//	@Summary		Get board by ID
//	@Description	Get detailed information about a specific board
//	@Tags			Boards
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int				true	"Board ID"
//	@Success		200		{object}	BoardResponse	"Board information"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		403		{object}	ErrorResponse	"Forbidden - not a board member"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/{boardId} [get]
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

// listMembersHandler lists all members of a board
//
//	@Summary		List board members
//	@Description	Get all members of a specific board
//	@Tags			Board Members
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int						true	"Board ID"
//	@Success		200		{array}		BoardMemberResponse		"List of board members"
//	@Failure		401		{object}	ErrorResponse			"Unauthorized"
//	@Failure		403		{object}	ErrorResponse			"Forbidden - not a board member"
//	@Failure		500		{object}	ErrorResponse			"Internal server error"
//	@Router			/api/boards/{boardId}/members [get]
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

// addMemberHandler adds a member to a board
//
//	@Summary		Add board member
//	@Description	Add a user as a member to a board (only board owners can add members)
//	@Tags			Board Members
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int					true	"Board ID"
//	@Param			request	body		AddMemberRequest	true	"Member details"
//	@Success		201		{object}	BoardMemberResponse	"Member added successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request"
//	@Failure		401		{object}	ErrorResponse		"Unauthorized"
//	@Failure		403		{object}	ErrorResponse		"Forbidden - only owners can add members"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/api/boards/{boardId}/members [post]
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

// deleteMemberHandler removes a member from a board
//
//	@Summary		Remove board member
//	@Description	Remove a user from a board (only board owners can remove members)
//	@Tags			Board Members
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int				true	"Board ID"
//	@Param			userId	path		int				true	"User ID to remove"
//	@Success		200		{object}	MessageResponse	"Member removed successfully"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		403		{object}	ErrorResponse	"Forbidden - only owners can remove members"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/{boardId}/members/{userId} [delete]
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

// listBoardsByRoleHandler lists boards by user role
//
//	@Summary		List boards by role
//	@Description	Get boards where the user has a specific role (owner or member)
//	@Tags			Boards
//	@Produce		json
//	@Security		BearerAuth
//	@Param			role	path		string			true	"Role filter (owner or member)"
//	@Success		200		{array}		BoardResponse	"List of boards"
//	@Failure		400		{object}	ErrorResponse	"Invalid role parameter"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/by-role/{role} [get]
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

// inviteMemberByEmailHandler invites a user to a board by email
//
//	@Summary		Invite member by email
//	@Description	Invite a user to join a board using their email address
//	@Tags			Board Members
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int						true	"Board ID"
//	@Param			request	body		InviteMemberRequest		true	"Invitation details"
//	@Success		201		{object}	BoardMemberResponse		"Member invited successfully"
//	@Failure		400		{object}	ErrorResponse			"Invalid request or role"
//	@Failure		401		{object}	ErrorResponse			"Unauthorized"
//	@Failure		403		{object}	ErrorResponse			"Forbidden - only owners can invite"
//	@Failure		404		{object}	ErrorResponse			"User not found"
//	@Failure		500		{object}	ErrorResponse			"Internal server error"
//	@Router			/api/boards/{boardId}/members/invite [post]
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

// leaveBoardHandler allows a user to leave a board
//
//	@Summary		Leave board
//	@Description	Allow a user to leave a board they are a member of
//	@Tags			Board Members
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int				true	"Board ID"
//	@Success		200		{object}	MessageResponse	"Successfully left the board"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		403		{object}	ErrorResponse	"Forbidden - cannot leave board"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/{boardId}/members/leave [post]
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
