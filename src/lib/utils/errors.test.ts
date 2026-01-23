/**
 * Tests for error utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  getErrorMessage,
  createErrorResponse,
  createSuccessResponse,
  isAppError,
  hasErrorCode,
  AppError,
  DocumentError,
  AuthError,
  ApiError,
  ValidationError,
  UsageLimitError,
} from './errors';

describe('getErrorMessage', () => {
  it('extracts message from Error instance', () => {
    const error = new Error('Test error message');
    expect(getErrorMessage(error)).toBe('Test error message');
  });

  it('converts string to message', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('converts number to string', () => {
    expect(getErrorMessage(404)).toBe('404');
  });

  it('converts null to string', () => {
    expect(getErrorMessage(null)).toBe('null');
  });

  it('converts undefined to string', () => {
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('converts object to string', () => {
    expect(getErrorMessage({ foo: 'bar' })).toBe('[object Object]');
  });
});

describe('createErrorResponse', () => {
  it('creates JSON error response', () => {
    const response = createErrorResponse('Test error');
    const parsed = JSON.parse(response);
    expect(parsed).toEqual({ error: 'Test error' });
  });

  it('handles special characters', () => {
    const response = createErrorResponse('Error with "quotes" and \\backslashes');
    const parsed = JSON.parse(response);
    expect(parsed.error).toBe('Error with "quotes" and \\backslashes');
  });
});

describe('createSuccessResponse', () => {
  it('creates JSON success response with data', () => {
    const response = createSuccessResponse({ count: 5, name: 'test' });
    const parsed = JSON.parse(response);
    expect(parsed).toEqual({ success: true, count: 5, name: 'test' });
  });

  it('creates JSON success response with empty data', () => {
    const response = createSuccessResponse({});
    const parsed = JSON.parse(response);
    expect(parsed).toEqual({ success: true });
  });
});

describe('AppError', () => {
  it('creates error with message and code', () => {
    const error = new AppError('Something went wrong', 'APP_ERROR');
    expect(error.message).toBe('Something went wrong');
    expect(error.code).toBe('APP_ERROR');
    expect(error.name).toBe('AppError');
  });

  it('is instance of Error', () => {
    const error = new AppError('Test', 'TEST_ERROR');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof AppError).toBe(true);
  });
});

describe('DocumentError', () => {
  it('creates error with default code', () => {
    const error = new DocumentError('File not found');
    expect(error.message).toBe('File not found');
    expect(error.code).toBe('DOCUMENT_ERROR');
    expect(error.name).toBe('DocumentError');
  });

  it('creates error with custom code', () => {
    const error = new DocumentError('File not found', 'NOT_FOUND');
    expect(error.code).toBe('NOT_FOUND');
  });

  it('has static factory methods', () => {
    const notFound = DocumentError.notFound('/path/to/file');
    expect(notFound.code).toBe('DOCUMENT_NOT_FOUND');
    expect(notFound.message).toContain('/path/to/file');

    const saveFailed = DocumentError.saveFailed('/path/to/file');
    expect(saveFailed.code).toBe('DOCUMENT_SAVE_FAILED');

    const loadFailed = DocumentError.loadFailed('/path/to/file');
    expect(loadFailed.code).toBe('DOCUMENT_LOAD_FAILED');
  });
});

describe('AuthError', () => {
  it('creates error with default code', () => {
    const error = new AuthError('Token expired');
    expect(error.message).toBe('Token expired');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.name).toBe('AuthError');
  });

  it('creates error with custom code', () => {
    const error = new AuthError('Token expired', 'INVALID_TOKEN');
    expect(error.code).toBe('INVALID_TOKEN');
  });

  it('has static factory methods', () => {
    const unauthorized = AuthError.unauthorized();
    expect(unauthorized.code).toBe('UNAUTHORIZED');

    const sessionExpired = AuthError.sessionExpired();
    expect(sessionExpired.code).toBe('SESSION_EXPIRED');

    const invalidCreds = AuthError.invalidCredentials();
    expect(invalidCreds.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('ApiError', () => {
  it('creates error with default code', () => {
    const error = new ApiError('Request failed');
    expect(error.message).toBe('Request failed');
    expect(error.code).toBe('API_ERROR');
    expect(error.name).toBe('ApiError');
    expect(error.statusCode).toBeUndefined();
  });

  it('creates error with status code', () => {
    const error = new ApiError('Not Found', 'NOT_FOUND', 404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  it('has static factory methods', () => {
    const networkError = ApiError.networkError();
    expect(networkError.code).toBe('NETWORK_ERROR');

    const timeout = ApiError.timeout();
    expect(timeout.code).toBe('TIMEOUT');

    const serverError = ApiError.serverError(500);
    expect(serverError.code).toBe('SERVER_ERROR');
    expect(serverError.statusCode).toBe(500);
  });
});

describe('ValidationError', () => {
  it('creates error with message and field', () => {
    const error = new ValidationError('Field is required', 'email');
    expect(error.message).toBe('Field is required');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.field).toBe('email');
    expect(error.name).toBe('ValidationError');
  });

  it('creates error without field', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.field).toBeUndefined();
  });

  it('has static factory methods', () => {
    const required = ValidationError.required('email');
    expect(required.field).toBe('email');
    expect(required.message).toContain('required');

    const invalid = ValidationError.invalid('email', 'must be valid');
    expect(invalid.field).toBe('email');
    expect(invalid.message).toContain('invalid');
  });
});

describe('UsageLimitError', () => {
  it('creates error with limit info', () => {
    const error = new UsageLimitError('Monthly limit exceeded', 100, 150);
    expect(error.message).toBe('Monthly limit exceeded');
    expect(error.code).toBe('USAGE_LIMIT_EXCEEDED');
    expect(error.limit).toBe(100);
    expect(error.used).toBe(150);
    expect(error.name).toBe('UsageLimitError');
  });

  it('has static factory method', () => {
    const exceeded = UsageLimitError.messagesExceeded(100, 150);
    expect(exceeded.limit).toBe(100);
    expect(exceeded.used).toBe(150);
    expect(exceeded.message).toContain('150/100');
  });
});

describe('isAppError', () => {
  it('returns true for AppError', () => {
    expect(isAppError(new AppError('message', 'CODE'))).toBe(true);
  });

  it('returns true for DocumentError', () => {
    expect(isAppError(new DocumentError('message'))).toBe(true);
  });

  it('returns true for AuthError', () => {
    expect(isAppError(new AuthError('message'))).toBe(true);
  });

  it('returns true for ApiError', () => {
    expect(isAppError(new ApiError('message'))).toBe(true);
  });

  it('returns true for ValidationError', () => {
    expect(isAppError(new ValidationError('message'))).toBe(true);
  });

  it('returns true for UsageLimitError', () => {
    expect(isAppError(new UsageLimitError('message', 100, 150))).toBe(true);
  });

  it('returns false for regular Error', () => {
    expect(isAppError(new Error('message'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError('string')).toBe(false);
    expect(isAppError(123)).toBe(false);
    expect(isAppError({ code: 'CODE' })).toBe(false);
  });
});

describe('hasErrorCode', () => {
  it('returns true when error has matching code', () => {
    const error = new AppError('message', 'MY_ERROR');
    expect(hasErrorCode(error, 'MY_ERROR')).toBe(true);
  });

  it('returns false when error has different code', () => {
    const error = new AppError('message', 'OTHER_ERROR');
    expect(hasErrorCode(error, 'MY_ERROR')).toBe(false);
  });

  it('returns false for non-AppError', () => {
    expect(hasErrorCode(new Error('message'), 'ERROR')).toBe(false);
    expect(hasErrorCode(null, 'ERROR')).toBe(false);
    expect(hasErrorCode('string', 'ERROR')).toBe(false);
  });
});
