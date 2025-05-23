# CollabBoard Frontend

Клиентская часть приложения CollabBoard — современный интерфейс для совместной работы с Kanban-досками в реальном времени.

## 🏗️ Архитектура

**Технологический стек:**
- **React 19** — современная библиотека для создания пользовательских интерфейсов
- **TypeScript** — типизированный JavaScript для надежности кода
- **Tailwind CSS** — utility-first CSS фреймворк для быстрой стилизации
- **Vite** — быстрый инструмент сборки и разработки
- **Zustand** — легковесное управление состоянием
- **React Router v7** — маршрутизация в SPA
- **@dnd-kit** — современная библиотека drag-and-drop
- **Axios** — HTTP клиент для API запросов

**Принципы архитектуры:**
- **Atomic Design** — организация компонентов по уровням (atoms → molecules → organisms → templates → pages)
- **Feature-based** — группировка по функциональности
- **Separation of Concerns** — разделение логики, состояния и представления
- **Real-time First** — приоритет синхронизации в реальном времени

## 📁 Структура проекта

```
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

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js 18+** — [Установка Node.js](https://nodejs.org/)
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
VITE_API_URL=http://localhost:8080

# URL WebSocket сервера
VITE_WS_URL=ws://localhost:8080/ws/board
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

## 🐳 Docker

### Многоэтапная сборка

```dockerfile
# Этап сборки
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Продакшн образ
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

### Nginx конфигурация

Для SPA необходима настройка fallback на index.html:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

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

## 🚀 Продакшн

### Переменные окружения

```env
# Продакшн конфигурация
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com/ws/board

# Опционально
VITE_SENTRY_DSN=your_sentry_dsn
VITE_ANALYTICS_ID=your_analytics_id
```

### Оптимизация сборки

```bash
# Анализ размера сборки
npm run build -- --analyze

# Сборка с оптимизацией
npm run build

# Проверка сборки локально
npm run preview
```

### Рекомендации

1. **HTTPS** — обязательно для WebSocket соединений
2. **CDN** — для статических ресурсов
3. **Gzip/Brotli** — сжатие на сервере
4. **Caching** — настройка кеширования
5. **Error Monitoring** — интеграция с Sentry

## 🧪 Тестирование

### Рекомендуемые инструменты

```bash
# Установка тестовых зависимостей
npm install --save-dev @testing-library/react @testing-library/jest-dom vitest

# Запуск тестов
npm run test

# Тесты с покрытием
npm run test:coverage
```

### Структура тестов

```
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

## 📝 Лицензия

Этот проект распространяется под лицензией MIT. См. файл [LICENSE](../LICENSE) для подробностей.
