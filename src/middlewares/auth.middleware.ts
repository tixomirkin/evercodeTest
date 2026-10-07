import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/app-error';
import { config } from '../config';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new UnauthorizedError('Authorization header is missing. Expected Bearer token.'));
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return next(new UnauthorizedError("Invalid Authorization header format. Expected 'Bearer <token>'."));
  }

  const token = parts[1];

  if (token !== config.API_BEARER_TOKEN) {
    return next(new UnauthorizedError('Invalid or expired Bearer token.'));
  }

  next();
}
