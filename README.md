# CollabBoard

<div align="center">
  <h3>🚀 Instant collaboration in a single space</h3>
  <p>A real-time collaborative Kanban board application for teams to organize tasks and projects efficiently</p>
  
  ![TypeScript](https://img.shields.io/badge/TypeScript-74.8%25-blue)
  ![Go](https://img.shields.io/badge/Go-21.4%25-00ADD8)
  ![CSS](https://img.shields.io/badge/CSS-2.3%25-1572B6)
  ![License](https://img.shields.io/badge/License-MIT-green)
</div>

---

## 🌟 Overview

CollabBoard is a modern, real-time collaborative Kanban board application that enables teams to organize tasks and projects in a shared digital workspace. Built with a focus on instant collaboration, intuitive design, and seamless real-time updates, CollabBoard provides everything teams need to stay organized and productive.

## ✨ Key Features

### 🔄 Real-time Collaboration
- **Instant updates** - See changes as they happen across all connected clients
- **WebSocket integration** - Live synchronization without page refreshes
- **Multi-user support** - Multiple team members can work simultaneously

### 🎯 Intuitive Interface
- **Drag-and-drop functionality** - Smooth card and list management with animations
- **Responsive design** - Optimized for desktop and mobile devices
- **Clean UI/UX** - Built following Atomic Design principles

### 🔐 Secure & Scalable
- **JWT authentication** - Secure user login and registration
- **Role-based permissions** - Board owners and members with different access levels
- **PostgreSQL backend** - Reliable and scalable data storage

### 🎨 Advanced Features
- **Position normalization** - Background jobs ensure consistent card ordering
- **Board sharing** - Invite team members via email
- **Member management** - Add/remove board participants
- **Real-time notifications** - Stay updated on board changes

## 🛠️ Technology Stack

### Frontend (React/TypeScript)
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Zustand** - Lightweight state management
- **React Router v7** - Modern routing solution
- **Tailwind CSS** - Utility-first CSS framework
- **DND Kit** - Accessible drag-and-drop library
- **Zod** - Runtime type validation
- **Vite** - Fast development and build tool
- **Axios** - HTTP client for API calls

### Backend (Go)
- **Go 1.23** - Modern Go with latest features
- **Gin** - High-performance HTTP web framework
- **PostgreSQL 16** - Advanced relational database
- **WebSockets** - Real-time bidirectional communication
- **JWT** - Secure authentication tokens
- **sqlc** - Generate type-safe Go from SQL
- **golang-migrate** - Database migration tool

### Infrastructure
- **Docker** - Containerized deployment
- **Docker Compose** - Multi-container orchestration
- **Distroless images** - Secure, minimal production containers

## 📁 Project Architecture

The project follows clean architecture principles and Atomic Design methodology:

```
CollabBoard/
├── frontend/                    # React TypeScript application
│   ├── src/
│   │   ├── components/
│   │   │   ├── atoms/          # Basic UI components (Button, Input, etc.)
│   │   │   ├── molecules/      # Component groups (AuthForm, CardItem, etc.)
│   │   │   ├── organisms/      # Complex components (BoardHeader, CardList, etc.)
│   │   │   ├── templates/      # Page layouts (BoardTemplate, etc.)
│   │   │   └── pages/          # Complete pages (BoardPage, LoginPage, etc.)
│   │   ├── services/           # API and WebSocket services
│   │   ├── store/              # Zustand state management
│   │   ├── utils/              # Helper functions and utilities
│   │   └── types/              # TypeScript type definitions
│   ├── public/                 # Static assets
│   └── Dockerfile              # Frontend container configuration
│
├── backend/                     # Go REST API server
│   ├── cmd/
│   │   └── server/             # Application entry point
│   ├── internal/
│   │   ├── auth/               # Authentication & authorization
│   │   ├── boards/             # Board management logic
│   │   ├── cards/              # Card CRUD operations
│   │   ├── lists/              # List management
│   │   ├── config/             # Application configuration
│   │   ├── db/                 # Database layer
│   │   │   ├── migrations/     # SQL schema migrations
│   │   │   └── sqlc/           # Generated Go code from SQL
│   │   ├── jobs/               # Background job processing
│   │   ├── middleware/         # HTTP middleware functions
│   │   └── websocket/          # Real-time WebSocket handlers
│   ├── bin/                    # Compiled binaries
│   └── Dockerfile              # Backend container configuration
│
├── Makefile                    # Build and development commands
├── docker-compose.yml          # Development environment
├── docker-compose.prod.yml     # Production configuration
└── README.md                   # This file
```

## 🔄 Real-time Architecture

CollabBoard implements a sophisticated real-time update system:

1. **Client Action** - User performs an action (move card, create list, etc.)
2. **API Call** - Frontend sends HTTP request to backend
3. **Database Update** - Backend validates and persists changes
4. **WebSocket Broadcast** - Backend broadcasts event to all connected clients
5. **State Synchronization** - All clients update their local state
6. **UI Update** - Changes reflect instantly across all connected sessions

### WebSocket Events
- `card_created`, `card_updated`, `card_moved`, `card_deleted`
- `list_created`, `list_updated`, `list_moved`, `list_deleted`
- `board_created`, `board_updated`, `board_deleted`
- `member_added`, `member_removed`

## 🔐 Authentication & Security

### JWT-based Authentication
- **Registration/Login** - Secure user account management
- **Token-based Auth** - Stateless authentication using JWT
- **Password Security** - Bcrypt hashing for password storage
- **Session Management** - Automatic token refresh and validation

### Security Features
- **CORS Protection** - Configurable cross-origin requests
- **Input Validation** - Comprehensive request validation
- **SQL Injection Prevention** - Parameterized queries with sqlc
- **Rate Limiting** - API endpoint protection (configurable)

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:
- **Node.js** 20.x or higher
- **Go** 1.23 or higher
- **PostgreSQL** 16 or higher
- **Docker & Docker Compose** (recommended for easy setup)
- **golang-migrate** (for database migrations)

### Quick Start with Docker

The fastest way to get CollabBoard running:

```bash
# Clone the repository
git clone https://github.com/AlexanderGhosty/CollabBoard.git
cd CollabBoard

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8080
```

### Environment Configuration

Create a `.env` file in the root directory:

```env
# Database Configuration
POSTGRES_USER=collabboard_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=collabboard
POSTGRES_HOST=localhost  # Use 'db' for Docker
POSTGRES_PORT=5432

# Application Configuration
API_PORT=8080
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Frontend Configuration (optional)
VITE_API_URL=http://localhost:8080
```

### Manual Development Setup

If you prefer to run services individually:

#### 1. Database Setup
```bash
# Start PostgreSQL (if not using Docker)
createdb collabboard

# Run migrations
cd backend
migrate -source file://internal/db/migrations \
        -database "postgres://user:password@localhost/collabboard?sslmode=disable" \
        up
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
go mod download

# Build the application
make backend

# Run the server
./bin/collabboard
# OR for development with hot reload
go run cmd/server/main.go
```

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Production Deployment

For production deployment with optimized containers:

```bash
# Build and start production services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Monitor services
docker-compose ps
docker-compose logs -f
```

## 📚 API Documentation

### Authentication Endpoints
```
POST /auth/register          # Create new user account
POST /auth/login             # Authenticate user
GET  /auth/me                # Get current user profile
```

### Board Management
```
GET    /api/boards           # List user's boards
POST   /api/boards           # Create new board
GET    /api/boards/:id       # Get board details with lists/cards
PUT    /api/boards/:id       # Update board information
DELETE /api/boards/:id       # Delete board
GET    /api/boards/:id/members    # Get board members
POST   /api/boards/:id/members    # Invite member via email
DELETE /api/boards/:id/members/:userId  # Remove member
```

### List Operations
```
POST   /api/boards/:boardId/lists    # Create new list
PUT    /api/lists/:id                # Update list
DELETE /api/lists/:id                # Delete list
PUT    /api/lists/:id/position       # Reorder list
```

### Card Operations
```
POST   /api/lists/:listId/cards      # Create new card
GET    /api/cards/:id                # Get card details
PUT    /api/cards/:id                # Update card
DELETE /api/cards/:id                # Delete card
PUT    /api/cards/:id/position       # Move card between lists
```

### WebSocket Connection
```
GET /ws/board/:id?token=<jwt_token>  # Real-time board updates
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
make test

# With coverage
go test ./... -cover -v
```

### Frontend Tests
```bash
cd frontend
npm run test

# With coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run full test suite
make test-all
```

## 🔧 Development Tools

### Available Make Commands
```bash
make backend         # Build backend binary
make docker-up       # Start development environment
make docker-down     # Stop all services
make test           # Run backend tests
make lint           # Run linting
make format         # Format code
make migrate-up     # Apply database migrations
make migrate-down   # Rollback migrations
```

### Code Quality
- **ESLint** - JavaScript/TypeScript linting
- **Prettier** - Code formatting
- **golangci-lint** - Go code analysis
- **TypeScript** - Static type checking

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Use semantic commit messages

### Code Style
- **Frontend**: Follow React best practices and TypeScript conventions
- **Backend**: Adhere to Go idioms and patterns
- **Database**: Use descriptive migration names and comments

## 📋 Roadmap

### Current Features ✅
- [x] Real-time collaborative Kanban boards
- [x] User authentication and authorization
- [x] Drag-and-drop interface
- [x] Board sharing and member management
- [x] Responsive design
- [x] Docker containerization

### Planned Features 🚧
- [ ] Email notifications for board activities
- [ ] Card comments and attachments
- [ ] Time tracking and due dates
- [ ] Integration with external tools (Slack, GitHub, etc.)
- [ ] Advanced analytics and reporting

## 🐛 Troubleshooting

### Common Issues

**Database Connection Issues**
```bash
# Check PostgreSQL status
docker-compose ps db

# View database logs
docker-compose logs db
```

**WebSocket Connection Problems**
```bash
# Check backend logs
docker-compose logs backend

# Verify JWT token in browser console
```

**Frontend Build Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - Frontend framework
- [Go](https://golang.org/) - Backend language
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [DND Kit](https://dndkit.com/) - Drag and drop library
- [Zustand](https://github.com/pmndrs/zustand) - State management

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/AlexanderGhosty">AlexanderGhosty</a></p>
  <p>⭐ Star this repository if you find it helpful!</p>
</div>
