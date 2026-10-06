export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public details?: any;

  constructor(message: string, statusCode = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, details);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details?: any) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access', details?: any) {
    super(message, 401, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', details?: any) {
    super(message, 409, details);
  }
}

export class ExternalApiError extends AppError {
  constructor(message = 'External API service unavailable or failed', statusCode = 502, details?: any) {
    super(message, statusCode, details);
  }
}
