import { Request, Response } from 'express';
import { hashPassword, verifyPassword } from '../auth/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../auth/jwt';
import { UserService } from '../services/user.service';
import { prisma } from '../config/database';
import { sendSuccess, sendError, sendCreated } from '../utils/response.helper';
import { AuthRequest } from '../auth/middleware';
import { AppError } from '../middleware/error.middleware';

const userService = new UserService(prisma);

export async function register(req: Request, res: Response): Promise<Response> {
  try {
    const { email, password, displayName, username } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
    }

    if (password.length < 6) {
      return sendError(res, 'Password must be at least 6 characters', 400, 'VALIDATION_ERROR');
    }

    // Check if user already exists
    const existingUser = await userService.findByEmail(email);
    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400, 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const displayNameValue = displayName || email.split('@')[0];
    const usernameLower = username?.toLowerCase().trim() || email.split('@')[0].toLowerCase();

    const user = await userService.create({
      email,
      displayName: displayNameValue,
      passwordHash,
      usernameLower,
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return sendCreated(res, {
      token,
      refreshToken,
      user,
    }, 'User registered successfully');
  } catch (error: any) {
    console.error('Register error:', error);
    return sendError(res, error.message || 'Registration failed', 500);
  }
}

export async function login(req: Request, res: Response): Promise<Response> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 'Email and password are required', 400, 'VALIDATION_ERROR');
    }

    // Find user
    const user = await userService.findByEmail(email);
    if (!user) {
      return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return sendError(res, 'Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    // Generate tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
    };

    const token = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return sendSuccess(res, {
      token,
      refreshToken,
      user,
    }, 'Login successful');
  } catch (error: any) {
    console.error('Login error:', error);
    return sendError(res, error.message || 'Login failed', 500);
  }
}

export async function refreshToken(req: Request, res: Response): Promise<Response> {
  try {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      return sendError(res, 'Refresh token is required', 400, 'VALIDATION_ERROR');
    }

    try {
      const payload = verifyRefreshToken(refreshTokenValue);
      const user = await userService.findById(payload.userId);

      if (!user) {
        return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate new tokens
      const tokenPayload: TokenPayload = {
        userId: user.id,
        email: user.email,
      };

      const newToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);

      return sendSuccess(res, {
        token: newToken,
        refreshToken: newRefreshToken,
        user,
      });
    } catch (error) {
      return sendError(res, 'Invalid refresh token', 401, 'INVALID_TOKEN');
    }
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return sendError(res, error.message || 'Token refresh failed', 500);
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const user = await userService.findById(req.user.userId);

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    return sendSuccess(res, user);
  } catch (error: any) {
    console.error('Get me error:', error);
    return sendError(res, error.message || 'Failed to get user', 500);
  }
}

export async function updateProfile(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const profile = await userService.updateProfile(req.user.userId, req.body);
    return sendSuccess(res, profile, 'Profile updated successfully');
  } catch (error: any) {
    console.error('Update profile error:', error);
    return sendError(res, error.message || 'Failed to update profile', 500);
  }
}

export async function updatePrivacy(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const privacy = await userService.updatePrivacy(req.user.userId, req.body);
    return sendSuccess(res, privacy, 'Privacy settings updated successfully');
  } catch (error: any) {
    console.error('Update privacy error:', error);
    return sendError(res, error.message || 'Failed to update privacy', 500);
  }
}
