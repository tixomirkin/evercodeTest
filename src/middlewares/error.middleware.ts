import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        name: err.name,
        message: err.message,
        details: err.details || null,
      },
    });
    return;
  }

  // Handle express JSON syntax error
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    res.status(400).json({
      success: false,
      error: {
        name: 'BadRequestError',
        message: 'Malformed JSON payload in request body',
        details: null,
      },
    });
    return;
  }

  console.error('Unhandled Server Error:', err);

  res.status(500).json({
    success: false,
    error: {
      name: 'InternalServerError',
      message: 'An unexpected internal server error occurred',
      details: isDevelopment ? err.stack : null,
    },
  });
}
