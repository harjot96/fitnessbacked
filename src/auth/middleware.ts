import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from './jwt';

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * Express middleware to verify JWT token
 */
export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = undefined;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    req.user = undefined;
    next();
  }
}

/**
 * Middleware to require authentication
 */
export function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ 
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
    return;
  }
  next();
}

