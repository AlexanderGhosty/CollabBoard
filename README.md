# CollabBoard

<div align="center">
  <h3>Instant collaboration in a single space</h3>
  <p>A real-time collaborative Kanban board application for teams to organize tasks and projects</p>
</div>

## 🚀 Features

- **Real-time collaboration** - See changes instantly as team members update the board
- **Drag-and-drop interface** - Intuitive card and list management with smooth animations
- **User authentication** - Secure login and registration system
- **Role-based permissions** - Control who can view and edit boards
- **Responsive design** - Works on desktop and mobile devices
- **Position normalization** - Automatic background job ensures consistent card ordering

## 🛠️ Technology Stack

### Frontend
- **React 19** with TypeScript
- **Zustand** for state management
- **React Router v6** for routing
- **Tailwind CSS** for styling
- **DND Kit** for drag-and-drop functionality
- **Zod** for form validation
- **Vite** for development and building

### Backend
- **Go 1.23** with Gin web framework
- **PostgreSQL 16** for data storage
- **WebSockets** for real-time updates
- **JWT** for authentication
- **sqlc** for type-safe SQL

## 📋 Project Structure

The project follows the **Atomic Design** methodology for organizing components:

```
frontend/
├── src/
│   ├── components/
│   │   ├── atoms/       # Basic building blocks (Button, Input, etc.)
│   │   ├── molecules/   # Groups of atoms (AuthForm, CardItem, etc.)
│   │   ├── organisms/   # Groups of molecules (BoardHeader, CardList, etc.)
│   │   ├── templates/   # Page layouts (BoardTemplate, etc.)
│   │   └── pages/       # Full pages (BoardPage, LoginPage, etc.)
│   ├── services/        # API and WebSocket services
│   ├── store/           # Zustand stores
│   └── utils/           # Utility functions
│
backend/
├── cmd/
│   └── server/          # Application entry point
├── internal/
│   ├── auth/            # Authentication
│   ├── boards/          # Board management
│   ├── cards/           # Card management
│   ├── config/          # Configuration
│   ├── db/              # Database
│   │   ├── migrations/  # SQL migrations
│   │   └── sqlc/        # Generated Go code
│   ├── jobs/            # Background jobs
│   ├── lists/           # List management
│   ├── middleware/      # HTTP middleware
│   └── websocket/       # WebSocket implementation
```

## 🔄 Real-time Updates

CollabBoard uses WebSockets to provide real-time updates to all connected clients. When a user makes a change (like moving a card), the following happens:

1. The frontend sends an API request to update the database
2. After successful update, the backend broadcasts a WebSocket event to all connected clients
3. All clients receive the event and update their local state accordingly

This ensures all users see the same board state in real-time without needing to refresh the page.

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication:

- Users register or login through the `/auth/register` or `/auth/login` endpoints
- Upon successful authentication, a JWT token is returned
- This token must be included in the `Authorization: Bearer <token>` header for all API requests
- WebSocket connections also require authentication via a token query parameter

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Go 1.23+
- PostgreSQL 16+
- Docker and Docker Compose (optional)

### Environment Setup

Create a `.env` file in the root directory with the following variables:

```
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=collabboard
POSTGRES_HOST=db
API_PORT=8080
JWT_SECRET=your_secret_key
```

### Development Setup

#### Without Docker

1. **Backend:**

```bash
# Install Go dependencies
cd backend
go mod download

# Run migrations
migrate -source file://internal/db/migrations -database "postgres://user:password@localhost/collabboard?sslmode=disable" up

# Start the server
go run cmd/server/main.go
```

2. **Frontend:**

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

#### With Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

### Production Deployment

```bash
# Build and start production containers
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📝 API Documentation

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token
- `GET /auth/me` - Get current user info

### Boards

- `GET /api/boards` - List all boards for current user
- `POST /api/boards` - Create a new board
- `GET /api/boards/:id` - Get a specific board with lists and cards
- `PUT /api/boards/:id` - Update a board
- `DELETE /api/boards/:id` - Delete a board

### Lists

- `POST /api/boards/:boardId/lists` - Create a new list
- `PUT /api/lists/:id` - Update a list
- `DELETE /api/lists/:id` - Delete a list
- `PUT /api/lists/:id/position` - Update list position

### Cards

- `POST /api/lists/:listId/cards` - Create a new card
- `PUT /api/cards/:id` - Update a card
- `DELETE /api/cards/:id` - Delete a card
- `PUT /api/cards/:id/position` - Update card position

### WebSocket

- `GET /ws/board/:id?token=<jwt>` - Connect to WebSocket for real-time updates

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code follows the project's coding style and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
