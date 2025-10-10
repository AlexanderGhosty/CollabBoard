# CollabBoard Frontend

Клиентская часть приложения CollabBoard — современный интерфейс для совместной работы с Kanban-досками в реальном времени.

## 📚 Содержание

- [🏗️ Архитектура](#architecture)
- [📁 Структура проекта](#structure)
- [🚀 Быстрый старт](#quick-start)
- [✨ Основные функции](#features)
- [🎨 Дизайн-система](#design-system)
- [🔄 Управление состоянием](#state-management)
- [🔌 WebSocket интеграция](#websocket)
- [🎯 Ключевые функции](#key-capabilities)
- [🛡️ Аутентификация](#auth)
- [🔧 Разработка](#development)
- [🐳 Docker](#docker)
- [📊 Производительность](#performance)
- [🚀 Продакшн](#production)
- [🧪 Тестирование](#testing)
- [📝 Лицензия](#license)

<a id="architecture"></a>

## 🏗️ Архитектура

**Технологический стек:**

- **React 19** — современная библиотека для создания пользовательских интерфейсов
- **TypeScript 5.7** — типизированный JavaScript для надежности кода
- **Tailwind CSS** — utility-first CSS фреймворк для быстрой стилизации
- **Vite** — быстрый инструмент сборки и разработки
- **Zustand** — легковесное управление состоянием
- **React Router v7** — маршрутизация в SPA
- **@dnd-kit** — современная библиотека drag-and-drop
- **Axios** — HTTP клиент для API запросов
- **Zod** — валидация схем данных

**Принципы архитектуры:**

- **Atomic Design** — организация компонентов по уровням (atoms → molecules → organisms → templates → pages)
- **Feature-based** — группировка по функциональности
- **Separation of Concerns** — разделение логики, состояния и представления
- **Real-time First** — приоритет синхронизации в реальном времени

<a id="structure"></a>

## 📁 Структура проекта

```text
frontend/
├── public/                  # Статические ресурсы
│   ├── logo.svg            # Логотип приложения
│   ├── logo-dark.svg       # Логотип для темной темы
│   └── vite.svg            # Иконка Vite
├── src/                    # Исходный код
│   ├── components/         # React компоненты (Atomic Design)
│   │   ├── atoms/          # Базовые элементы
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Logo.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── molecules/      # Составные компоненты
│   │   │   ├── AuthForm.tsx
│   │   │   ├── CardItem.tsx
│   │   │   ├── CardDetailModal.tsx
│   │   │   ├── EditableText.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ParticipantsModal.tsx
│   │   ├── organisms/      # Сложные блоки
│   │   │   ├── Header.tsx
│   │   │   ├── BoardHeader.tsx
│   │   │   └── ListColumn.tsx
│   │   ├── templates/      # Шаблоны страниц
│   │   │   ├── AuthTemplate.tsx
│   │   │   ├── BoardTemplate.tsx
│   │   │   └── WelcomeTemplate.tsx
│   │   └── pages/          # Страницы приложения
│   │       ├── WelcomePage.tsx
│   │       ├── LoginPage.tsx
│   │       ├── RegisterPage.tsx
│   │       ├── BoardsPage.tsx
│   │       ├── BoardPage.tsx
│   │       └── AccountSettingsPage.tsx
│   ├── services/           # API и внешние сервисы
│   │   ├── api.ts          # Базовая конфигурация API
│   │   ├── authService.ts  # Аутентификация
│   │   ├── boardService.ts # Работа с досками
│   │   ├── listService.ts  # Управление списками
│   │   ├── cardService.ts  # Операции с карточками
│   │   ├── memberService.ts # Управление участниками
│   │   └── websocket.ts    # WebSocket клиент
│   ├── store/              # Управление состоянием (Zustand)
│   │   ├── useAuthStore.ts # Состояние аутентификации
│   │   ├── useThemeStore.ts # Управление темой
│   │   ├── useToastStore.ts # Уведомления
│   │   └── board/          # Состояние досок
│   │       ├── index.ts
│   │       ├── types.ts
│   │       ├── useBoardStore.ts
│   │       ├── useListsStore.ts
│   │       ├── useCardsStore.ts
│   │       ├── useMembersStore.ts
│   │       └── useWebSocketStore.ts
│   ├── utils/              # Утилиты и хелперы
│   │   ├── api/            # API утилиты
│   │   ├── board/          # Логика досок
│   │   ├── websocket/      # WebSocket события
│   │   └── validate.ts     # Валидация
│   ├── hooks/              # Пользовательские хуки
│   ├── types/              # TypeScript типы
│   ├── styles/             # Глобальные стили
│   ├── App.tsx             # Главный компонент
│   ├── main.tsx            # Точка входа
│   └── index.css           # Глобальные стили
├── package.json            # Зависимости и скрипты
├── vite.config.ts          # Конфигурация Vite
├── tailwind.config.js      # Конфигурация Tailwind
├── tsconfig.json           # Конфигурация TypeScript
└── Dockerfile              # Контейнеризация
```

<a id="quick-start"></a>

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js 20+** — [Установка Node.js](https://nodejs.org/)
- **npm** или **yarn** — менеджер пакетов
- **Backend API** — запущенный сервер CollabBoard

### Установка зависимостей

```bash
cd frontend
npm install
# или
yarn install
```

### Настройка окружения

Создайте файл `.env.local` в папке frontend:

```env
# URL API сервера
VITE_API_URL=http://localhost:8080/api

# URL WebSocket сервера
VITE_WS_URL=ws://localhost:8080/ws/board

# Опционально для продакшн
VITE_SENTRY_DSN=your_sentry_dsn
VITE_ANALYTICS_ID=your_analytics_id
```

### Запуск в режиме разработки

```bash
# Запуск dev сервера
npm run dev

# Приложение будет доступно по адресу http://localhost:5173
```

### Сборка для продакшн

```bash
# Сборка приложения
npm run build

# Предварительный просмотр сборки
npm run preview
```

### Линтинг

```bash
# Проверка кода
npm run lint

# Автоматическое исправление
npm run lint -- --fix
```

<a id="features"></a>

## ✨ Основные функции

### Управление досками

- **Создание досок**: быстрое создание новых Kanban досок
- **Система ролей**: владелец (owner) и участник (member) с разными правами
- **Приглашение пользователей**: добавление участников по email адресу
- **Управление участниками**: просмотр, добавление и удаление участников
- **Переименование досок**: редактирование названий в реальном времени

### Kanban интерфейс

- **Списки (колонки)**: создание, редактирование, перемещение и удаление
- **Карточки задач**: полный CRUD функционал с описаниями
- **Drag-and-drop**: интуитивное перемещение карточек между списками
- **Позиционирование**: автоматическое управление порядком элементов
- **Детальные модальные окна**: редактирование карточек с полной информацией

### Real-time синхронизация

- **WebSocket соединения**: мгновенные обновления для всех участников
- **Автоматическое переподключение**: восстановление связи при потере соединения
- **Синхронизация состояния**: все изменения отображаются в реальном времени
- **Обработка конфликтов**: корректная работа при одновременном редактировании

### Пользовательский интерфейс

- **Адаптивный дизайн**: оптимизация для мобильных устройств и десктопа
- **Система тем**: переключение между светлой и темной темами
- **Современный дизайн**: синий градиент и плавные переходы
- **Анимации**: smooth drag-and-drop и переходы между состояниями
- **Уведомления**: toast сообщения для обратной связи с пользователем

### Аутентификация и безопасность

- **JWT токены**: безопасная аутентификация
- **Регистрация и вход**: полный цикл управления аккаунтом
- **Смена пароля**: возможность обновления учетных данных
- **Защищенные маршруты**: доступ только для авторизованных пользователей

<a id="design-system"></a>

## 🎨 Дизайн-система

### Цветовая схема

Приложение использует кастомную цветовую палитру с поддержкой темной темы:

```javascript
// Основные цвета (Tailwind config)
colors: {
  'board-blue': {
    50: '#eff6ff',   // Очень светлый синий
    100: '#dbeafe',  // Светлый синий
    600: '#2563eb',  // Основной синий
    900: '#1e3a8a',  // Темный синий
  },
  'dark-blue': {
    50: '#1e293b',   // Темная тема - светлый
    600: '#020617',  // Темная тема - темный
  }
}
```

### Компонентная архитектура (Atomic Design)

#### Atoms (Атомы)

Базовые неделимые элементы интерфейса:

- `Button` — кнопки с различными вариантами стилизации
- `Input` — поля ввода с валидацией
- `Logo` — логотип с поддержкой темной темы
- `Spinner` — индикатор загрузки
- `ThemeToggle` — переключатель темы

#### Molecules (Молекулы)

Составные компоненты из атомов:

- `AuthForm` — формы аутентификации
- `CardItem` — карточка задачи с drag-and-drop
- `CardDetailModal` — модальное окно деталей карточки
- `EditableText` — редактируемый текст
- `Toast` — уведомления
- `ParticipantsModal` — управление участниками

#### Organisms (Организмы)

Сложные блоки интерфейса:

- `Header` — шапка приложения с навигацией
- `BoardHeader` — заголовок доски с действиями
- `ListColumn` — колонка списка с карточками

#### Templates (Шаблоны)

Макеты страниц:

- `AuthTemplate` — шаблон страниц аутентификации
- `BoardTemplate` — шаблон страницы доски
- `WelcomeTemplate` — шаблон приветственной страницы

#### Pages (Страницы)

Готовые страницы приложения:

- `WelcomePage` — приветственная страница
- `LoginPage` / `RegisterPage` — аутентификация
- `BoardsPage` — список досок
- `BoardPage` — рабочая область доски
- `AccountSettingsPage` — настройки аккаунта

<a id="state-management"></a>

## 🔄 Управление состоянием

### Zustand Stores

Приложение использует модульную архитектуру состояния:

#### Глобальные stores

- `useAuthStore` — аутентификация пользователя
- `useThemeStore` — управление темой (светлая/темная)
- `useToastStore` — система уведомлений

#### Board-специфичные stores

- `useBoardStore` — информация о доске
- `useListsStore` — управление списками (колонками)
- `useCardsStore` — управление карточками
- `useMembersStore` — участники доски
- `useWebSocketStore` — WebSocket соединения

### Пример использования

```typescript
// Получение состояния
const { user, token, login, logout } = useAuthStore();
const { boards, fetchBoards, createBoard } = useBoardStore();

// Обновление состояния
await login(email, password);
await createBoard({ name: 'Новая доска' });
```

<a id="websocket"></a>

## 🔌 WebSocket интеграция

### Real-time синхронизация

Приложение поддерживает синхронизацию в реальном времени через WebSocket:

```typescript
// Подключение к доске
wsClient.connect(boardId);

// Подписка на события
subscribeWS('card_created', (data) => {
  // Обновление состояния при создании карточки
  useCardsStore.getState().addCard(data);
});

// Отправка событий
sendCardEvent(WebSocketEventType.CARD_UPDATED, updatedCard);
```

### Поддерживаемые события

- **Доски**: `board_updated`, `board_deleted`
- **Списки**: `list_created`, `list_updated`, `list_moved`, `list_deleted`
- **Карточки**: `card_created`, `card_updated`, `card_moved`, `card_deleted`
- **Участники**: `member_added`, `member_removed`

<a id="key-capabilities"></a>

## 🎯 Ключевые функции

### Drag & Drop

Реализовано с помощью `@dnd-kit`:

- Перетаскивание карточек между списками
- Изменение порядка списков
- Плавные анимации
- Поддержка touch-устройств
- Автоматическое отключение при открытых модальных окнах

### Адаптивный дизайн

- Мобильная оптимизация (responsive design)
- Гибкая сетка для досок (5 колонок → адаптивно)
- Touch-friendly интерфейс
- Оптимизация для различных размеров экранов

### Темная тема

- Автоматическое определение системных настроек
- Переключатель в интерфейсе
- Сохранение предпочтений в localStorage
- Адаптация всех компонентов
- Специальные цвета и тени для темной темы

<a id="auth"></a>

## 🛡️ Аутентификация

### Защищенные маршруты

Приложение использует систему защищенных маршрутов:

```typescript
// Проверка аутентификации
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

### JWT токены

- Автоматическое добавление токена в заголовки запросов
- Обновление состояния при истечении токена
- Безопасное хранение в памяти (не в localStorage)
- Автоматический редирект на страницу входа

### Обработка ошибок

- Русскоязычные сообщения об ошибках
- Toast-уведомления для пользователя
- Graceful handling при потере соединения
- Автоматическая повторная попытка подключения

<a id="development"></a>

## 🔧 Разработка

### Доступные скрипты

```json
{
  "scripts": {
    "dev": "vite",                    // Запуск dev сервера
    "build": "vite build",            // Сборка для продакшн
    "preview": "vite preview",        // Предпросмотр сборки
    "lint": "eslint . --ext .ts,.tsx" // Проверка кода
  }
}
```

### TypeScript конфигурация

Проект использует строгую TypeScript конфигурацию:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true
  }
}
```

### Алиасы путей

Настроен алиас `@` для удобного импорта:

```typescript
// Вместо относительных путей
import { Button } from '../../../components/atoms/Button';

// Используйте абсолютные
import { Button } from '@/components/atoms/Button';
```

### Утилиты и хелперы

#### API утилиты

- `normalizeEntities` — нормализация данных для состояния
- `errorHandling` — обработка ошибок API
- `apiEndpoints` — централизованные эндпоинты

#### Board утилиты

- `permissions` — проверка прав доступа
- `sorting` — сортировка списков и карточек
- `idNormalization` — нормализация ID

#### Валидация

- Zod схемы для валидации форм
- Клиентская валидация перед отправкой
- Типобезопасная валидация

### Соглашения по коду

#### Именование файлов и компонентов

- **Компоненты**: PascalCase (`Button.tsx`, `CardItem.tsx`)
- **Хуки**: camelCase с префиксом `use` (`useAuthStore.ts`)
- **Утилиты**: camelCase (`normalizeEntities.ts`)
- **Константы**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

#### Структура импортов

```typescript
// 1. React и библиотеки
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 2. Внутренние компоненты и утилиты
import { Button } from '@/components/atoms/Button';
import { useAuthStore } from '@/store/useAuthStore';

// 3. Типы
import type { Board, Card } from '@/types';
```

#### Комментарии

- Все комментарии в коде на английском языке
- Пользовательские сообщения (toast, ошибки) на русском языке
- JSDoc для публичных функций и компонентов

<a id="docker"></a>

## 🐳 Docker

### Контейнер разработки

Репозиторий содержит Dockerfile, запускающий Vite dev server внутри контейнера Node.js 20:

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
```

### Запуск через Docker Compose

```bash
# Запуск только фронтенда
docker compose up web

# Полный стек (БД + API + фронтенд)
docker compose up --build

# Просмотр логов dev-сервера
docker compose logs -f web
```

Контейнер ориентирован на разработку: код монтируется внутрь, работает HMR.
Итоговая сборка создаётся командой `npm run build` вне контейнера.

<a id="performance"></a>

## 📊 Производительность

### Оптимизации

- **Code Splitting** — автоматическое разделение кода по маршрутам
- **Tree Shaking** — удаление неиспользуемого кода
- **Bundle Analysis** — анализ размера сборки
- **Lazy Loading** — ленивая загрузка компонентов
- **Memoization** — оптимизация ре-рендеров

### Мониторинг

- React DevTools для отладки
- Vite HMR для быстрой разработки
- ESLint для качества кода
- TypeScript для типобезопасности

<a id="production"></a>

## 🚀 Продакшн

### Переменные окружения

```env
# Продакшн конфигурация
VITE_API_URL=https://api.yourdomain.com/api
VITE_WS_URL=wss://api.yourdomain.com/ws/board

# Мониторинг и аналитика (опционально)
VITE_SENTRY_DSN=your_sentry_dsn
VITE_ANALYTICS_ID=your_analytics_id

# Режим сборки
NODE_ENV=production
```

### Оптимизация сборки

```bash
# Сборка оптимизированной версии
npm run build

# Проверка готовой сборки локально
npm run preview

# Анализ размера бандла (пример с vite-bundle-visualizer)
npx vite-bundle-visualizer dist/stats.html
```

### Рекомендации

1. **HTTPS** — обязательно для WebSocket соединений
2. **CDN** — для статических ресурсов
3. **Gzip/Brotli** — сжатие на сервере
4. **Caching** — настройка кеширования
5. **Error Monitoring** — интеграция с Sentry

<a id="testing"></a>

## 🧪 Тестирование

### Рекомендуемые инструменты

```bash
# Запуск всех тестов в CI-режиме
npm run test

# Наблюдение за тестами в ходе разработки
npm run test:watch

# Подсчёт покрытия
npm run test -- --coverage
```

### Структура тестов

```text
src/
├── components/
│   ├── atoms/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx
│   └── molecules/
│       ├── CardItem.tsx
│       └── CardItem.test.tsx
└── __tests__/
    ├── utils/
    └── services/
```

<a id="license"></a>

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. См. файл [LICENSE](../LICENSE) для подробностей.
