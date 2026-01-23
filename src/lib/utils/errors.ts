/**
 * Error utility functions and custom error classes
 */

/**
 * Extract an error message from an unknown error value
 * @param error - The error value (could be Error, string, or unknown)
 * @returns A string error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * Create a JSON error response for tool results
 * @param message - The error message
 * @returns A JSON string with the error
 */
export function createErrorResponse(message: string): string {
  return JSON.stringify({ error: message });
}

/**
 * Create a JSON success response for tool results
 * @param data - The data to include in the response
 * @returns A JSON string with the success response
 */
export function createSuccessResponse(data: Record<string, unknown>): string {
  return JSON.stringify({ success: true, ...data });
}

/**
 * Base error class for application-specific errors
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error class for document-related errors
 */
export class DocumentError extends AppError {
  constructor(message: string, code = 'DOCUMENT_ERROR') {
    super(message, code);
    this.name = 'DocumentError';
  }

  static notFound(path: string): DocumentError {
    return new DocumentError(`Document not found: ${path}`, 'DOCUMENT_NOT_FOUND');
  }

  static saveFailed(path: string): DocumentError {
    return new DocumentError(`Failed to save document: ${path}`, 'DOCUMENT_SAVE_FAILED');
  }

  static loadFailed(path: string): DocumentError {
    return new DocumentError(`Failed to load document: ${path}`, 'DOCUMENT_LOAD_FAILED');
  }
}

/**
 * Error class for authentication-related errors
 */
export class AuthError extends AppError {
  constructor(message: string, code = 'AUTH_ERROR') {
    super(message, code);
    this.name = 'AuthError';
  }

  static unauthorized(): AuthError {
    return new AuthError('Unauthorized', 'UNAUTHORIZED');
  }

  static sessionExpired(): AuthError {
    return new AuthError('Session expired', 'SESSION_EXPIRED');
  }

  static invalidCredentials(): AuthError {
    return new AuthError('Invalid credentials', 'INVALID_CREDENTIALS');
  }
}

/**
 * Error class for API-related errors
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    code = 'API_ERROR',
    public readonly statusCode?: number
  ) {
    super(message, code);
    this.name = 'ApiError';
  }

  static networkError(): ApiError {
    return new ApiError('Network error', 'NETWORK_ERROR');
  }

  static timeout(): ApiError {
    return new ApiError('Request timeout', 'TIMEOUT');
  }

  static serverError(statusCode: number): ApiError {
    return new ApiError(`Server error: ${statusCode}`, 'SERVER_ERROR', statusCode);
  }
}

/**
 * Error class for validation errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }

  static required(field: string): ValidationError {
    return new ValidationError(`${field} is required`, field);
  }

  static invalid(field: string, reason?: string): ValidationError {
    const message = reason ? `${field} is invalid: ${reason}` : `${field} is invalid`;
    return new ValidationError(message, field);
  }
}

/**
 * Error class for usage limit errors
 */
export class UsageLimitError extends AppError {
  constructor(
    message: string,
    public readonly limit: number,
    public readonly used: number
  ) {
    super(message, 'USAGE_LIMIT_EXCEEDED');
    this.name = 'UsageLimitError';
  }

  static messagesExceeded(limit: number, used: number): UsageLimitError {
    return new UsageLimitError(`Message limit exceeded (${used}/${limit})`, limit, used);
  }
}

/**
 * Check if an error is a specific type of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Check if an error has a specific error code
 */
export function hasErrorCode(error: unknown, code: string): boolean {
  return isAppError(error) && error.code === code;
}
