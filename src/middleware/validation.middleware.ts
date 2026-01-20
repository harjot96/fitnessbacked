import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export function checkValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array(),
    });
  }
  next();
}
