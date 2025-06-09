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
	g.POST("/normalize", normalizePositionsHandler(svc))
}

// createListHandler creates a new list in a board
//
//	@Summary		Create a new list
//	@Description	Create a new list (column) in a Kanban board
//	@Tags			Lists
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int					true	"Board ID"
//	@Param			request	body		CreateListRequest	true	"List creation details"
//	@Success		201		{object}	ListResponse		"List created successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request"
//	@Failure		401		{object}	ErrorResponse		"Unauthorized"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/api/boards/{boardId}/lists [post]
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

// listHandler gets all lists for a board
//
//	@Summary		Get board lists
//	@Description	Get all lists (columns) for a specific board
//	@Tags			Lists
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int				true	"Board ID"
//	@Success		200		{array}		ListResponse	"List of board lists"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/{boardId}/lists [get]
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

// updateListHandler updates a list
//
//	@Summary		Update list
//	@Description	Update list title and/or position
//	@Tags			Lists
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int					true	"Board ID"
//	@Param			id		path		int					true	"List ID"
//	@Param			request	body		UpdateListRequest	true	"List update details"
//	@Success		200		{object}	ListResponse		"List updated successfully"
//	@Failure		400		{object}	ErrorResponse		"Invalid request"
//	@Failure		401		{object}	ErrorResponse		"Unauthorized"
//	@Failure		500		{object}	ErrorResponse		"Internal server error"
//	@Router			/api/boards/{boardId}/lists/{id} [put]
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

		// Get the current list to preserve its position if not explicitly provided
		currentList, err := svc.GetListByID(c.Request.Context(), int32(id))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get current list: " + err.Error()})
			return
		}

		// Create update params with the current position by default
		p := db.UpdateListParams{
			ID:       int32(id),
			Title:    req.Title,
			Position: currentList.Position, // Preserve the current position
		}

		// Only update position if explicitly provided
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

// moveListHandler moves a list to a new position
//
//	@Summary		Move list
//	@Description	Move a list to a new position within the board
//	@Tags			Lists
//	@Accept			json
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int				true	"Board ID"
//	@Param			id		path		int				true	"List ID"
//	@Param			request	body		MoveListRequest	true	"New position"
//	@Success		200		{object}	ListResponse	"List moved successfully"
//	@Failure		400		{object}	ErrorResponse	"Invalid request"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/{boardId}/lists/{id}/move [put]
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

// deleteListHandler deletes a list
//
//	@Summary		Delete list
//	@Description	Delete a list and all its cards from the board
//	@Tags			Lists
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int				true	"Board ID"
//	@Param			id		path		int				true	"List ID"
//	@Success		200		{object}	MessageResponse	"List deleted successfully"
//	@Failure		401		{object}	ErrorResponse	"Unauthorized"
//	@Failure		500		{object}	ErrorResponse	"Internal server error"
//	@Router			/api/boards/{boardId}/lists/{id} [delete]
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

// normalizePositionsHandler normalizes list positions
//
//	@Summary		Normalize list positions
//	@Description	Manually trigger position normalization for all lists in a board
//	@Tags			Lists
//	@Produce		json
//	@Security		BearerAuth
//	@Param			boardId	path		int							true	"Board ID"
//	@Success		200		{object}	NormalizePositionsResponse	"Positions normalized successfully"
//	@Failure		401		{object}	ErrorResponse				"Unauthorized"
//	@Failure		403		{object}	ErrorResponse				"Forbidden - not a board member"
//	@Failure		500		{object}	ErrorResponse				"Internal server error"
//	@Router			/api/boards/{boardId}/lists/normalize [post]
func normalizePositionsHandler(svc *Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		boardID, _ := strconv.Atoi(c.Param("boardId"))
		userID := int32(c.GetInt("userID"))

		// Log the request
		log.Printf("Normalize positions request: boardID=%d, userID=%d", boardID, userID)

		// Check if user is a member of the board
		if _, err := svc.q.GetBoardMember(c.Request.Context(), db.GetBoardMemberParams{
			BoardID: int32(boardID), UserID: userID,
		}); err != nil {
			log.Printf("User %d is not a member of board %d", userID, boardID)
			c.JSON(http.StatusForbidden, gin.H{"error": "not a member"})
			return
		}

		// Call the normalization function
		if err := svc.NormalizeListPositions(c.Request.Context(), int32(boardID)); err != nil {
			log.Printf("Error normalizing positions: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Get the updated lists to return in the response
		lists, err := svc.ListByBoard(c.Request.Context(), userID, int32(boardID))
		if err != nil {
			log.Printf("Error getting lists after normalization: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		log.Printf("Successfully normalized positions for board %d", boardID)
		c.JSON(http.StatusOK, gin.H{
			"message": "positions normalized",
			"lists":   lists,
		})
	}
}
