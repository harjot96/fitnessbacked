import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.helper';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const code = err.code;

  sendError(res, message, statusCode, code);
}

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  sendError(res, `Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
}

export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
