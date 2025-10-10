# CollabBoard Backend

Серверная часть приложения CollabBoard — современная система для совместной работы с Kanban-досками в реальном времени.

## 🏗️ Архитектура

**Технологический стек:**

- **Go 1.24** — современный язык программирования с высокой производительностью
- **Gin Framework** — быстрый HTTP веб-фреймворк для Go
- **PostgreSQL 16** — надежная реляционная база данных
- **WebSockets** — двунаправленная связь в реальном времени
- **JWT** — безопасная аутентификация с токенами
- **sqlc** — генерация типобезопасного Go-кода из SQL
- **golang-migrate** — инструмент для миграций базы данных
- **Structured Logging** — JSON логирование с настраиваемыми уровнями

**Принципы архитектуры:**

- Clean Architecture с разделением на слои
- Dependency Injection для тестируемости
- Repository Pattern для работы с данными
- Service Layer для бизнес-логики
- Middleware для сквозной функциональности

## 📁 Структура проекта

```
backend/
├── cmd/
│   └── server/              # Точка входа приложения
│       └── main.go          # Основной файл сервера
├── internal/                # Внутренние пакеты приложения
│   ├── auth/               # Аутентификация и авторизация
│   │   ├── handler.go      # HTTP обработчики
│   │   ├── service.go      # Бизнес-логика
│   │   └── repository.go   # Работа с БД
│   ├── boards/             # Управление досками
│   │   ├── handler.go      # REST API эндпоинты
│   │   ├── service.go      # Логика досок
│   │   └── repository.go   # Репозиторий досок
│   ├── cards/              # CRUD операции с карточками
│   ├── lists/              # Управление списками (колонками)
│   ├── config/             # Конфигурация приложения
│   │   └── config.go       # Загрузка переменных окружения
│   ├── db/                 # Слой базы данных
│   │   ├── migrations/     # SQL миграции схемы
│   │   └── sqlc/           # Сгенерированный Go код
│   ├── middleware/         # HTTP middleware
│   │   ├── auth.go         # JWT аутентификация
│   │   └── cors.go         # CORS настройки
│   ├── websocket/          # WebSocket реализация
│   │   ├── hub.go          # Центральный хаб соединений
│   │   ├── client.go       # Клиентские соединения
│   │   └── handler.go      # WebSocket обработчики
│   └── jobs/               # Фоновые задачи
│       └── position_normalizer.go  # Нормализация позиций
├── go.mod                  # Go модули
├── go.sum                  # Контрольные суммы зависимостей
├── sqlc.yaml              # Конфигурация sqlc
└── Dockerfile             # Контейнеризация
```

## 🚀 Быстрый старт

### Docker Compose (рекомендуется)

Самый простой способ запустить приложение:

```bash
# Клонирование репозитория
git clone <repository-url>
cd collabboard

# Создание файла окружения
cp .env.example .env

# Редактирование переменных окружения (см. раздел "Переменные окружения")
nano .env

# Запуск всех сервисов (PostgreSQL + API + Frontend)
docker-compose up -d

# Просмотр логов
docker-compose logs -f api
docker-compose logs -f db

# Остановка сервисов
docker-compose down
```

### Ручная установка

#### Предварительные требования

- **Go 1.24+** — [Установка Go](https://golang.org/doc/install)
- **PostgreSQL 16+** — [Установка PostgreSQL](https://www.postgresql.org/download/)
- **golang-migrate** — [Установка migrate](https://github.com/golang-migrate/migrate)
- **Docker** (опционально) — [Установка Docker](https://docs.docker.com/get-docker/)

#### Установка зависимостей

```bash
cd backend
go mod download
go mod verify
```

### Настройка окружения

Создайте файл `.env` в корне проекта:

```env
# Конфигурация базы данных
POSTGRES_HOST=localhost
POSTGRES_USER=collabboard_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=collabboard
POSTGRES_PORT=5432

# Конфигурация приложения
API_PORT=8080
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# Конфигурация логирования
LOG_LEVEL=INFO          # DEBUG, INFO, WARN, ERROR, FATAL
LOG_FORMAT=json         # json, text
LOG_OUTPUT=stdout       # stdout, file
```

### Настройка базы данных

#### 1. Создание базы данных

```bash
# Создание пользователя и базы данных
sudo -u postgres psql
CREATE USER collabboard_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE collabboard OWNER collabboard_user;
GRANT ALL PRIVILEGES ON DATABASE collabboard TO collabboard_user;
\q
```

#### 2. Запуск миграций

```bash
# Установка golang-migrate (если не установлен)
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Применение миграций
export DB_URL="postgres://collabboard_user:your_secure_password@localhost/collabboard?sslmode=disable"
migrate -source file://internal/db/migrations -database "$DB_URL" up
```

### Запуск сервера

#### Режим разработки

```bash
# Запуск с автоперезагрузкой
go run cmd/server/main.go

# Или с использованием air для hot reload
air
```

#### Сборка и запуск

```bash
# Сборка приложения
make backend

# Запуск собранного бинарника
./bin/collabboard
```

#### Docker

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f api
```

## 📚 API Документация

### Аутентификация

Все защищенные эндпоинты требуют JWT токен в заголовке:
```
Authorization: Bearer <your_jwt_token>
```

#### Публичные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| `POST` | `/auth/register` | Регистрация нового пользователя |
| `POST` | `/auth/login` | Вход в систему |
| `GET` | `/health` | Проверка состояния сервера |

#### Защищенные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| `GET` | `/auth/me` | Получение информации о текущем пользователе |
| `POST` | `/auth/change-password` | Изменение пароля |

### Доски (Boards)

| Метод | Путь | Описание | Права доступа |
|-------|------|----------|---------------|
| `POST` | `/api/boards` | Создание новой доски | Аутентифицированный пользователь |
| `GET` | `/api/boards` | Получение всех досок пользователя | Участник доски |
| `GET` | `/api/boards/by-role/:role` | Получение досок по роли (owner/member) | Участник доски |
| `GET` | `/api/boards/:boardId` | Получение конкретной доски | Участник доски |
| `PUT` | `/api/boards/:boardId` | Обновление доски | Владелец доски |
| `DELETE` | `/api/boards/:boardId` | Удаление доски | Владелец доски |

### Участники досок

| Метод | Путь | Описание | Права доступа |
|-------|------|----------|---------------|
| `GET` | `/api/boards/:boardId/members` | Список участников доски | Участник доски |
| `POST` | `/api/boards/:boardId/members` | Добавление участника | Владелец доски |
| `POST` | `/api/boards/:boardId/members/invite` | Приглашение по email | Владелец доски |
| `DELETE` | `/api/boards/:boardId/members/:userId` | Удаление участника | Владелец доски |
| `POST` | `/api/boards/:boardId/members/leave` | Покинуть доску | Участник доски |

### Списки (Lists)

| Метод | Путь | Описание | Права доступа |
|-------|------|----------|---------------|
| `POST` | `/api/lists` | Создание нового списка | Участник доски |
| `GET` | `/api/lists/board/:boardId` | Получение списков доски | Участник доски |
| `PUT` | `/api/lists/:listId` | Обновление списка | Участник доски |
| `PUT` | `/api/lists/:listId/move` | Перемещение списка | Участник доски |
| `DELETE` | `/api/lists/:listId` | Удаление списка | Участник доски |

### Карточки (Cards)

| Метод | Путь | Описание | Права доступа |
|-------|------|----------|---------------|
| `POST` | `/api/cards` | Создание новой карточки | Участник доски |
| `GET` | `/api/cards/list/:listId` | Получение карточек списка | Участник доски |
| `GET` | `/api/cards/:cardId` | Получение конкретной карточки | Участник доски |
| `PUT` | `/api/cards/:cardId` | Обновление карточки | Участник доски |
| `PUT` | `/api/cards/:cardId/move` | Перемещение карточки | Участник доски |
| `DELETE` | `/api/cards/:cardId` | Удаление карточки | Участник доски |

### Примеры запросов

#### Регистрация пользователя

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Иванов",
    "email": "ivan@example.com",
    "password": "securepassword123"
  }'
```

#### Создание доски

```bash
curl -X POST http://localhost:8080/api/boards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Моя первая доска"
  }'
```

#### Создание списка

```bash
curl -X POST http://localhost:8080/api/lists \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "boardId": 1,
    "title": "В работе",
    "position": 1
  }'
```

## 🔌 WebSocket API

### Подключение

WebSocket соединения устанавливаются по адресу:
```
ws://localhost:8080/ws/board/:boardId?token=YOUR_JWT_TOKEN
```

### Схема событий

Все WebSocket сообщения следуют единой схеме:
```json
{
  "event": "event_type",
  "data": { /* данные события */ }
}
```

### События досок

| Событие | Описание | Данные |
|---------|----------|--------|
| `board_updated` | Доска обновлена | `{ "id": 1, "name": "Новое название", ... }` |
| `board_deleted` | Доска удалена | `{ "id": 1 }` |

### События списков

| Событие | Описание | Данные |
|---------|----------|--------|
| `list_created` | Создан новый список | `{ "id": 1, "title": "Новый список", "boardId": 1, "position": 1 }` |
| `list_updated` | Список обновлен | `{ "id": 1, "title": "Обновленный список", ... }` |
| `list_moved` | Список перемещен | `{ "id": 1, "position": 2, ... }` |
| `list_deleted` | Список удален | `{ "id": 1, "boardId": 1 }` |

### События карточек

| Событие | Описание | Данные |
|---------|----------|--------|
| `card_created` | Создана новая карточка | `{ "id": 1, "title": "Новая карточка", "listId": 1, "position": 1 }` |
| `card_updated` | Карточка обновлена | `{ "id": 1, "title": "Обновленная карточка", ... }` |
| `card_moved` | Карточка перемещена | `{ "id": 1, "listId": 2, "position": 3, ... }` |
| `card_deleted` | Карточка удалена | `{ "cardId": 1 }` |

### События участников

| Событие | Описание | Данные |
|---------|----------|--------|
| `member_added` | Добавлен участник | `{ "boardId": 1, "userId": 2, "role": "member", ... }` |
| `member_removed` | Удален участник | `{ "boardId": 1, "userId": 2 }` |

### Системные события

| Событие | Описание | Данные |
|---------|----------|--------|
| `ping` | Проверка соединения | `timestamp` |

## 🗄️ База данных

### Схема базы данных

```sql
-- Пользователи
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Доски
CREATE TABLE boards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    owner_id INT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Участники досок
CREATE TABLE board_members (
    board_id INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner','member')),
    PRIMARY KEY (board_id, user_id)
);

-- Списки (колонки)
CREATE TABLE lists (
    id SERIAL PRIMARY KEY,
    board_id INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Карточки
CREATE TABLE cards (
    id SERIAL PRIMARY KEY,
    list_id INT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### Миграции

Миграции находятся в `internal/db/migrations/` и применяются с помощью golang-migrate:

```bash
# Применить все миграции
migrate -source file://internal/db/migrations -database "$DB_URL" up

# Откатить последнюю миграцию
migrate -source file://internal/db/migrations -database "$DB_URL" down 1

# Проверить статус миграций
migrate -source file://internal/db/migrations -database "$DB_URL" version
```

## 🔐 Аутентификация и авторизация

### JWT Токены

Приложение использует JWT токены для аутентификации:

```go
// Структура claims
type Claims struct {
    UserID int32 `json:"sub"`
    jwt.RegisteredClaims
}

// Время жизни токена: 24 часа
ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour))
```

### Middleware аутентификации

Middleware `Auth()` проверяет JWT токен и добавляет `userID` в контекст:

```go
// Использование в маршрутах
api := r.Group("/api")
api.Use(middleware.Auth(cfg.JWTSecret))
```

### Система ролей

| Роль | Описание | Права |
|------|----------|-------|
| `owner` | Владелец доски | Полный доступ: создание, редактирование, удаление доски и управление участниками |
| `member` | Участник доски | Работа с карточками и списками, просмотр доски |

## 🔧 Разработка

### Структура кода

Проект следует принципам Clean Architecture:

```
internal/
├── auth/           # Домен аутентификации
│   ├── handler.go  # HTTP слой (контроллеры)
│   ├── service.go  # Бизнес-логика
│   └── repository.go # Слой данных
├── boards/         # Домен досок
├── cards/          # Домен карточек
└── lists/          # Домен списков
```

### Генерация кода

Проект использует `sqlc` для генерации типобезопасного Go кода из SQL:

```bash
# Установка sqlc
go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest

# Генерация кода
sqlc generate
```

### Тестирование

```bash
# Запуск всех тестов
go test ./...

# Запуск тестов с покрытием
go test -cover ./...

# Запуск тестов конкретного пакета
go test ./internal/auth
```

### Линтинг

```bash
# Установка golangci-lint
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Запуск линтера
golangci-lint run

# Автоматическое исправление
golangci-lint run --fix
```

## 🐳 Docker

### Многоэтапная сборка

Dockerfile использует многоэтапную сборку для оптимизации размера образа:

```dockerfile
# Этап сборки
FROM golang:1.24-alpine AS builder
# ... сборка приложения

# Продакшн образ
FROM gcr.io/distroless/static-debian12 AS runtime
# ... минимальный образ без shell
```

### Docker Compose

```bash
# Запуск в режиме разработки
docker-compose up -d

# Запуск в продакшн режиме
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Просмотр логов
docker-compose logs -f api

# Остановка сервисов
docker-compose down
```

## 📊 Мониторинг и логирование

### Health Check

Эндпоинт для проверки состояния сервера:
```
GET /health
```

### Структурированное логирование

Приложение использует структурированное логирование в JSON формате с настраиваемыми уровнями:

#### Конфигурация логирования

```env
LOG_LEVEL=INFO          # DEBUG, INFO, WARN, ERROR, FATAL
LOG_FORMAT=json         # json, text
LOG_OUTPUT=stdout       # stdout, file
```

#### Уровни логирования

- **DEBUG** — детальная отладочная информация
- **INFO** — общая информация о работе приложения
- **WARN** — предупреждения о потенциальных проблемах
- **ERROR** — ошибки, которые не прерывают работу
- **FATAL** — критические ошибки, приводящие к остановке

#### Логируемые события

- **Аутентификация**: попытки входа, регистрации, смены пароля
- **API запросы**: HTTP методы, пути, статус коды, время выполнения
- **WebSocket**: подключения, отключения, отправка сообщений
- **База данных**: операции CRUD, ошибки подключения
- **Бизнес-логика**: создание/изменение/удаление ресурсов

#### Пример лога

```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "INFO",
  "message": "User authenticated successfully",
  "request_id": "req-123456",
  "user_id": 42,
  "email": "user@example.com",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

### Метрики

В Docker Compose настроена проверка состояния PostgreSQL:
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
  interval: 10s
  retries: 5
```

## 🚀 Продакшн

### Переменные окружения

Обязательные переменные для продакшн развертывания:

```env
# Безопасность
JWT_SECRET=very_long_random_string_for_production_min_32_chars

# База данных
POSTGRES_HOST=your_db_host
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=strong_password
POSTGRES_DB=collabboard
POSTGRES_PORT=5432

# Сервер
API_PORT=8080

# Логирование
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_OUTPUT=stdout
```

### Рекомендации по безопасности

1. **JWT Secret**: Используйте длинный случайный ключ (минимум 32 символа)
2. **HTTPS**: Всегда используйте HTTPS в продакшн
3. **CORS**: Настройте CORS для разрешенных доменов
4. **Rate Limiting**: Добавьте ограничения на количество запросов
5. **Database**: Используйте SSL соединения с базой данных

### Масштабирование

- Приложение stateless и может быть легко масштабировано горизонтально
- WebSocket соединения привязаны к конкретным инстансам
- Для масштабирования WebSocket рекомендуется использовать Redis для синхронизации между инстансами

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. См. файл [LICENSE](../LICENSE) для подробностей.
