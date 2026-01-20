import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, refreshToken, getMe, updateProfile, updatePrivacy } from '../controllers/auth.controller';
import { requireAuth } from '../auth/middleware';
import { checkValidationErrors } from '../middleware/validation.middleware';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('displayName').optional().isString(),
    body('username').optional().isString(),
    checkValidationErrors,
  ],
  register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    checkValidationErrors,
  ],
  login
);

// Refresh token
router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    checkValidationErrors,
  ],
  refreshToken
);

// Get current user (requires auth)
router.get('/me', requireAuth, getMe);

// Update profile (requires auth)
router.put(
  '/profile',
  requireAuth,
  updateProfile
);

// Update privacy (requires auth)
router.put(
  '/privacy',
  requireAuth,
  updatePrivacy
);

export default router;
