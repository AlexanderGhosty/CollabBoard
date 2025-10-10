# CollabBoard

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white)
![Go](https://img.shields.io/badge/Go-1.24-00ADD8?style=flat&logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker&logoColor=white)

Современная система для совместной работы с Kanban-досками в реальном времени. Полнофункциональное веб-приложение с интуитивным интерфейсом, поддержкой множественных пользователей и мгновенной синхронизацией изменений.

## 🌟 Обзор проекта

CollabBoard — это полнофункциональная платформа для управления проектами в стиле Kanban, созданная для команд, которым необходима эффективная совместная работа в реальном времени. Приложение объединяет современные веб-технологии для создания быстрого, надежного и интуитивно понятного инструмента управления задачами.

### Ключевые преимущества

- **🚀 Real-time синхронизация** — все изменения мгновенно отображаются у всех участников
- **🎯 Интуитивный интерфейс** — drag-and-drop управление карточками и списками
- **👥 Командная работа** — система ролей и приглашений участников
- **🌙 Современный дизайн** — поддержка темной/светлой темы и адаптивный интерфейс
- **🔒 Безопасность** — JWT аутентификация и контроль доступа

## 🏗️ Архитектура системы

### Высокоуровневая схема

```text
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     Frontend        │    │      Backend        │    │     Database        │
│   (React 19 + TS)   │◄──►│   (Go 1.24 + Gin)  │◄──►│  (PostgreSQL 16)    │
│                     │    │                     │    │                     │
│ • Zustand Store     │    │ • WebSocket Hub     │    │ • Users & Boards    │
│ • React Router      │    │ • JWT Middleware    │    │ • Lists & Cards     │
│ • Tailwind CSS      │    │ • sqlc Queries      │    │ • Real-time Sync    │
│ • DND Kit           │    │ • Structured Logs   │    │ • ACID Transactions │
│ • WebSocket Client  │    │ • Clean Architecture│    │ • Migrations        │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
            │                         │                         │
            └─────────────────────────┼─────────────────────────┘
                                      │
                              ┌───────▼───────┐
                              │   Docker      │
                              │  Compose      │
                              │ Orchestration │
                              └───────────────┘
```

### Технологический стек

| Компонент | Технология | Версия | Назначение |
|-----------|------------|--------|------------|
| **Frontend** | React | 19 | Пользовательский интерфейс |
| | TypeScript | 5.7+ | Типизация и безопасность кода |
| | Zustand | 5.x | Управление состоянием |
| | Tailwind CSS | 3.x | Стилизация и дизайн-система |
| | Vite | 6.x | Сборка и разработка |
| **Backend** | Go | 1.24 | Серверная логика |
| | Gin | 1.x | HTTP веб-фреймворк |
| | sqlc | 1.x | Генерация типобезопасного SQL |
| | JWT-Go | 5.x | Аутентификация |
| **Database** | PostgreSQL | 16 | Хранение данных |
| | golang-migrate | 4.x | Миграции схемы |
| **Infrastructure** | Docker | 24.x | Контейнеризация |
| | Docker Compose | 2.x | Оркестрация сервисов |

## ✨ Ключевые функции

### 📋 Управление досок

- **Создание и настройка** — быстрое создание новых Kanban досок
- **Система ролей** — владельцы (owner) и участники (member) с разными правами
- **Приглашения по email** — добавление новых участников в команду
- **Переименование в реальном времени** — мгновенное обновление названий

### 🎯 Kanban интерфейс

- **Списки задач** — создание, редактирование и удаление колонок
- **Карточки** — полный CRUD функционал с описаниями и метаданными
- **Drag & Drop** — интуитивное перемещение между списками
- **Автоматическое позиционирование** — умное управление порядком элементов

### ⚡ Real-time синхронизация

- **WebSocket соединения** — мгновенные обновления для всех участников
- **Автоматическое переподключение** — восстановление связи при сбоях
- **Конфликт-резолюция** — корректная обработка одновременных изменений
- **Оптимистичные обновления** — отзывчивый интерфейс без задержек

### 🎨 Пользовательский опыт

- **Адаптивный дизайн** — оптимизация для всех размеров экранов
- **Темная/светлая тема** — автоматическое определение и ручное переключение
- **Плавные анимации** — современные переходы и эффекты
- **Toast уведомления** — информативная обратная связь

## 📁 Структура проекта

```text
collabboard/
├── 📁 backend/                    # Go backend приложение
│   ├── 📁 cmd/server/            # Точка входа приложения
│   ├── 📁 internal/              # Внутренняя логика
│   │   ├── 📁 auth/             # Аутентификация и авторизация
│   │   ├── 📁 boards/           # Управление досками
│   │   ├── 📁 cards/            # Операции с карточками
│   │   ├── 📁 lists/            # Управление списками
│   │   ├── 📁 websocket/        # Real-time коммуникация
│   │   ├── 📁 db/               # Слой базы данных
│   │   ├── 📁 middleware/       # HTTP middleware
│   │   └── 📁 logger/           # Структурированное логирование
│   ├── 🐳 Dockerfile            # Контейнер backend
│   └── 📖 README.md             # Документация backend
├── 📁 frontend/                   # React frontend приложение
│   ├── 📁 src/
│   │   ├── 📁 components/       # React компоненты (Atomic Design)
│   │   │   ├── 📁 atoms/        # Базовые элементы
│   │   │   ├── 📁 molecules/    # Составные компоненты
│   │   │   ├── 📁 organisms/    # Сложные блоки
│   │   │   └── 📁 pages/        # Страницы приложения
│   │   ├── 📁 store/            # Zustand состояние
│   │   ├── 📁 services/         # API и WebSocket сервисы
│   │   ├── 📁 utils/            # Вспомогательные функции
│   │   └── 📁 types/            # TypeScript типы
│   ├── 🐳 Dockerfile            # Контейнер frontend
│   └── 📖 README.md             # Документация frontend
├── 🐳 docker-compose.yml         # Оркестрация сервисов
├── ⚙️ .env.example              # Шаблон переменных окружения
├── 📄 Makefile                   # Команды для разработки
└── 📖 README.md                  # Этот файл
```

## 🔧 Требования к системе

### Для разработки

| Компонент | Минимум | Рекомендуется |
|-----------|---------|---------------|
| **RAM** | 4GB | 8GB+ |
| **CPU** | 2 ядра | 4+ ядра |
| **Диск** | 10GB | 20GB+ SSD |
| **ОС** | Windows 10, macOS 10.15, Ubuntu 18.04 | Последние версии |

### Программное обеспечение

#### Обязательно

- **Docker** 20.10+ с Docker Compose 2.0+
- **Git** 2.30+

#### Для ручной разработки (опционально)

- **Go** 1.24+
- **Node.js** 20+ с npm/yarn
- **PostgreSQL** 16+

## 🚀 Быстрый старт

### Предварительные требования

- **Docker** 20.10+ и **Docker Compose** 2.0+
- **Git** для клонирования репозитория
- **4GB RAM** минимум для комфортной работы

### Запуск одной командой

```bash
# Клонирование проекта
git clone <repository-url>
cd collabboard

# Настройка окружения
cp .env.example .env

# Запуск всех сервисов
docker-compose up -d

# Просмотр логов (опционально)
docker-compose logs -f
```

### Доступ к приложению

После запуска сервисы будут доступны по адресам:

- **🌐 Веб-приложение**: <http://localhost:5173>
- **🔌 API Backend**: <http://localhost:8080>
- **📊 База данных**: localhost:5432

### Проверка работоспособности

```bash
# Статус всех сервисов
docker-compose ps

# Проверка API
curl http://localhost:8080/health

# Остановка сервисов
docker-compose down
```

## 🚀 Инструкции по развертыванию

### Локальная разработка

#### Docker Compose (рекомендуется)

```bash
# Полная настройка окружения
git clone <repository-url>
cd collabboard
cp .env.example .env

# Запуск в режиме разработки
docker-compose up -d

# Просмотр логов в реальном времени
docker-compose logs -f api web
```

#### Ручная настройка

```bash
# 1. База данных
createdb collabboard
cd backend && migrate -source file://internal/db/migrations -database "$DB_URL" up

# 2. Backend
cd backend && go run cmd/server/main.go

# 3. Frontend
cd frontend && npm install && npm run dev
```

### Продакшн развертывание

#### Переменные окружения

```env
# Безопасность
JWT_SECRET=very_long_random_string_for_production_min_32_chars

# База данных
POSTGRES_HOST=your_production_db_host
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=strong_production_password
POSTGRES_DB=collabboard
POSTGRES_PORT=5432

# Приложение
API_PORT=8080
LOG_LEVEL=INFO
LOG_FORMAT=json
```

#### Docker Compose продакшн

```bash
# Сборка и запуск продакшн контейнеров
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Мониторинг
docker-compose logs -f
docker-compose ps
```

## 📚 Ссылки на документацию

### Детальная документация

- **[📖 Backend Documentation](./backend/README.md)**
  - API эндпоинты и примеры запросов
  - Схема базы данных и миграции
  - WebSocket события и протокол
  - Структурированное логирование
  - Аутентификация и авторизация

- **[📖 Frontend Documentation](./frontend/README.md)**
  - Архитектура компонентов (Atomic Design)
  - Управление состоянием (Zustand)
  - Система тем и дизайн-система
  - WebSocket интеграция
  - Соглашения по коду

### API документация

#### Основные эндпоинты

```bash
# Аутентификация
POST /auth/register    # Регистрация
POST /auth/login       # Вход в систему
GET  /auth/me          # Информация о пользователе

# Доски
GET    /api/boards     # Список досок
POST   /api/boards     # Создание доски
PUT    /api/boards/:id # Обновление доски
DELETE /api/boards/:id # Удаление доски

# WebSocket
ws://localhost:8080/ws/board/:boardId?token=JWT_TOKEN
```

#### События WebSocket

- **Доски**: `board_updated`, `board_deleted`
- **Списки**: `list_created`, `list_updated`, `list_moved`, `list_deleted`
- **Карточки**: `card_created`, `card_updated`, `card_moved`, `card_deleted`
- **Участники**: `member_added`, `member_removed`

## 🧪 Тестирование

```bash
# Backend тесты
cd backend
go test ./...
go test -cover ./...

# Frontend тесты (при наличии)
cd frontend
npm test
npm run test:coverage

# Интеграционные тесты
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 🤝 Участие в разработке

### Процесс разработки

1. **Fork** репозитория
2. Создайте ветку функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте **Pull Request**

### Соглашения

- **Коммиты**: используйте [Conventional Commits](https://www.conventionalcommits.org/)
- **Код**: следуйте существующему стилю и линтерам
- **Тесты**: добавляйте тесты для новой функциональности
- **Документация**: обновляйте README при необходимости

## 📄 Лицензия

Этот проект распространяется под лицензией MIT. Подробности в файле [LICENSE](LICENSE).

## 🆘 Поддержка

При возникновении вопросов или проблем:

1. 📖 Изучите документацию в `backend/` и `frontend/` директориях
2. 🔍 Проверьте [Issues](../../issues) на наличие похожих проблем
3. 🆕 Создайте новый issue с детальным описанием проблемы
4. 💬 Укажите версии ПО и шаги для воспроизведения

---

## Создано с ❤️ для эффективной командной работы

CollabBoard — ваш инструмент для организации проектов в стиле Kanban с поддержкой real-time совместной работы.
