import { AxiosError } from 'axios';

/**
 * Standard error types for API operations
 */
export enum ApiErrorType {
  NETWORK = 'network',
  TIMEOUT = 'timeout',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  VALIDATION = 'validation',
  SERVER = 'server',
  UNKNOWN = 'unknown',
}

/**
 * Structured API error
 */
export interface ApiError {
  type: ApiErrorType;
  message: string;
  originalError?: Error | AxiosError | unknown;
  statusCode?: number;
}

/**
 * Process an error from an API call and return a standardized error object
 */
export function handleApiError(error: Error | AxiosError | unknown): ApiError {
  console.error('API Error:', error);

  // Default error
  const defaultError: ApiError = {
    type: ApiErrorType.UNKNOWN,
    message: 'Произошла неизвестная ошибка',
    originalError: error,
  };

  // Type guard for AxiosError
  const isAxiosError = (err: unknown): err is AxiosError => {
    return typeof err === 'object' && err !== null && 'isAxiosError' in err;
  };

  // Type guard for Error
  const isError = (err: unknown): err is Error => {
    return err instanceof Error;
  };

  // If not an Axios error, return default
  if (!isAxiosError(error)) {
    return {
      ...defaultError,
      message: isError(error) ? error.message : defaultError.message,
    };
  }

  const axiosError = error as AxiosError;
  const statusCode = axiosError.response?.status;

  // Network errors
  if (axiosError.message.includes('Network Error')) {
    return {
      type: ApiErrorType.NETWORK,
      message: 'Не удалось подключиться к серверу. Проверьте подключение к интернету.',
      originalError: error,
    };
  }

  // Timeout errors
  if (axiosError.message.includes('timeout')) {
    return {
      type: ApiErrorType.TIMEOUT,
      message: 'Время ожидания истекло. Сервер может быть занят, попробуйте снова.',
      originalError: error,
    };
  }

  // Handle different status codes
  switch (statusCode) {
    case 401:
      return {
        type: ApiErrorType.UNAUTHORIZED,
        message: 'Вы не авторизованы для выполнения этого действия. Пожалуйста, войдите снова.',
        originalError: error,
        statusCode,
      };
    case 403:
      return {
        type: ApiErrorType.FORBIDDEN,
        message: 'У вас нет прав для выполнения этого действия.',
        originalError: error,
        statusCode,
      };
    case 404:
      return {
        type: ApiErrorType.NOT_FOUND,
        message: 'Запрашиваемый ресурс не найден.',
        originalError: error,
        statusCode,
      };
    case 409:
      return {
        type: ApiErrorType.CONFLICT,
        message: 'Эта операция вызвала конфликт с текущим состоянием ресурса.',
        originalError: error,
        statusCode,
      };
    case 422:
      return {
        type: ApiErrorType.VALIDATION,
        message: 'Предоставленные данные недействительны.',
        originalError: error,
        statusCode,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: ApiErrorType.SERVER,
        message: 'Произошла ошибка сервера. Пожалуйста, попробуйте позже.',
        originalError: error,
        statusCode,
      };
    default:
      // Try to extract error message from response
      const errorMessage = axiosError.response?.data?.error || axiosError.message;
      return {
        type: ApiErrorType.UNKNOWN,
        message: errorMessage || 'Произошла неизвестная ошибка',
        originalError: error,
        statusCode,
      };
  }
}

/**
 * Get a user-friendly error message for a specific entity operation
 */
export function getEntityErrorMessage(
  entity: 'board' | 'list' | 'card' | 'member',
  operation: 'create' | 'update' | 'delete' | 'fetch' | 'move' | 'invite',
  error: ApiError
): string {
  // Default entity-specific messages
  const defaultMessages = {
    board: {
      create: 'Не удалось создать доску',
      update: 'Не удалось обновить доску',
      delete: 'Не удалось удалить доску',
      fetch: 'Не удалось загрузить доску',
    },
    list: {
      create: 'Не удалось создать список',
      update: 'Не удалось обновить список',
      delete: 'Не удалось удалить список',
      fetch: 'Не удалось загрузить списки',
      move: 'Не удалось переместить список',
    },
    card: {
      create: 'Не удалось создать карточку',
      update: 'Не удалось обновить карточку',
      delete: 'Не удалось удалить карточку',
      fetch: 'Не удалось загрузить карточки',
      move: 'Не удалось переместить карточку',
    },
    member: {
      invite: 'Не удалось пригласить участника',
      delete: 'Не удалось удалить участника',
      fetch: 'Не удалось загрузить участников',
    },
  };

  // Get the default message for this entity and operation
  const defaultMessage = defaultMessages[entity][operation as keyof typeof defaultMessages[typeof entity]];

  // For specific error types, provide more detailed messages
  switch (error.type) {
    case ApiErrorType.FORBIDDEN:
      return `У вас нет прав для этого действия`;
    case ApiErrorType.NOT_FOUND:
      return `Запрашиваемый ресурс не найден`;
    case ApiErrorType.NETWORK:
      return `Проверьте подключение к интернету`;
    case ApiErrorType.CONFLICT:
      if (entity === 'member' && operation === 'invite') {
        return 'Этот пользователь уже является участником доски';
      }
      return error.message;
    default:
      // If the error has a specific message, use it, otherwise use the default
      return error.message || defaultMessage;
  }
}
