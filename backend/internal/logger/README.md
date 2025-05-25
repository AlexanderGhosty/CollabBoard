# Structured Logging System

Система структурированного логирования для CollabBoard backend, основанная на Go slog.

## Возможности

- **Структурированные логи** в JSON или текстовом формате
- **Контекстно-зависимое логирование** с автоматическим добавлением request_id, user_id, board_id
- **Настраиваемые уровни логирования** (DEBUG, INFO, WARN, ERROR)
- **Совместимость с Docker** - логи выводятся в stdout
- **Производительность** - минимальное влияние на производительность приложения

## Конфигурация

Настройка через переменные окружения:

```bash
LOG_LEVEL=INFO          # DEBUG, INFO, WARN, ERROR (по умолчанию: INFO)
LOG_FORMAT=json         # json, text (по умолчанию: json)
LOG_OUTPUT=stdout       # stdout, file (по умолчанию: stdout)
```

## Использование

### Базовое логирование

```go
import "backend/internal/logger"

// Простые сообщения
logger.Info("Server started", "port", 8080)
logger.Error("Database connection failed", "error", err)
logger.Debug("Processing request", "path", "/api/boards")
```

### Контекстно-зависимое логирование

```go
// В HTTP middleware автоматически добавляется request_id
// В auth middleware автоматически добавляется user_id
logger.WithContext(ctx).Info("User action", "action", "create_board")
```

### Специализированные функции

```go
// HTTP запросы
logger.LogHTTPRequest(ctx, "POST", "/api/boards", 201, 150)
logger.LogHTTPError(ctx, "GET", "/api/boards/123", 404, err)

// WebSocket события
logger.LogWebSocketConnection(userID, boardID, "connected")
logger.LogWebSocketMessage(userID, boardID, "card_created", cardData)

// Операции базы данных
logger.LogDBOperation(ctx, "INSERT", "boards", 25)
logger.LogDBError(ctx, "SELECT", "users", err)

// Бизнес-логика сервисов
logger.LogServiceOperation(ctx, "boards", "create", "name", "My Board")
logger.LogServiceError(ctx, "boards", "create", err, "name", "My Board")
```

## Интеграция

Система интегрирована в:

- **HTTP middleware** - автоматическое логирование запросов и ответов
- **Authentication middleware** - логирование попыток аутентификации
- **WebSocket handlers** - логирование подключений и событий
- **Service layer** - логирование бизнес-операций
- **Background jobs** - логирование фоновых задач

## Формат логов

### JSON (production)
```json
{
  "time": "2025-05-25T15:28:14.495Z",
  "level": "INFO",
  "msg": "HTTP request completed",
  "request_id": "req-abc123",
  "user_id": 42,
  "board_id": 1,
  "method": "POST",
  "path": "/api/boards",
  "status_code": 201,
  "duration_ms": 150
}
```

### Text (development)
```
time=2025-05-25T15:28:14.495+03:00 level=INFO msg="HTTP request completed" request_id=req-abc123 user_id=42 board_id=1 method=POST path=/api/boards status_code=201 duration_ms=150
```

## Docker

Логи автоматически выводятся в stdout и доступны через:

```bash
# Просмотр логов контейнера
docker logs collabboard-api

# Следование за логами в реальном времени
docker logs -f collabboard-api

# Логи с временными метками
docker logs -t collabboard-api
```
