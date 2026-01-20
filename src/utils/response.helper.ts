import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };
  if (message) {
    response.message = message;
  }
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string
): Response {
  const response: ApiResponse = {
    success: false,
    error,
  };
  if (code) {
    response.code = code;
  }
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string
): Response {
  return sendSuccess(res, data, message, 201);
}
