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
  originalError?: any;
  statusCode?: number;
}

/**
 * Process an error from an API call and return a standardized error object
 */
export function handleApiError(error: any): ApiError {
  console.error('API Error:', error);

  // Default error
  const defaultError: ApiError = {
    type: ApiErrorType.UNKNOWN,
    message: 'An unknown error occurred',
    originalError: error,
  };

  // If not an Axios error, return default
  if (!error.isAxiosError) {
    return {
      ...defaultError,
      message: error.message || defaultError.message,
    };
  }

  const axiosError = error as AxiosError;
  const statusCode = axiosError.response?.status;

  // Network errors
  if (axiosError.message.includes('Network Error')) {
    return {
      type: ApiErrorType.NETWORK,
      message: 'Failed to connect to the server. Please check your internet connection.',
      originalError: error,
    };
  }

  // Timeout errors
  if (axiosError.message.includes('timeout')) {
    return {
      type: ApiErrorType.TIMEOUT,
      message: 'Request timed out. The server might be busy, please try again.',
      originalError: error,
    };
  }

  // Handle different status codes
  switch (statusCode) {
    case 401:
      return {
        type: ApiErrorType.UNAUTHORIZED,
        message: 'You are not authorized to perform this action. Please log in again.',
        originalError: error,
        statusCode,
      };
    case 403:
      return {
        type: ApiErrorType.FORBIDDEN,
        message: 'You do not have permission to perform this action.',
        originalError: error,
        statusCode,
      };
    case 404:
      return {
        type: ApiErrorType.NOT_FOUND,
        message: 'The requested resource was not found.',
        originalError: error,
        statusCode,
      };
    case 409:
      return {
        type: ApiErrorType.CONFLICT,
        message: 'This operation caused a conflict with the current state of the resource.',
        originalError: error,
        statusCode,
      };
    case 422:
      return {
        type: ApiErrorType.VALIDATION,
        message: 'The data provided is invalid.',
        originalError: error,
        statusCode,
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        type: ApiErrorType.SERVER,
        message: 'A server error occurred. Please try again later.',
        originalError: error,
        statusCode,
      };
    default:
      // Try to extract error message from response
      const errorMessage = axiosError.response?.data?.error || axiosError.message;
      return {
        type: ApiErrorType.UNKNOWN,
        message: errorMessage || 'An unknown error occurred',
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
