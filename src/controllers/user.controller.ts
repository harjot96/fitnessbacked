import { Response } from 'express';
import { UserService } from '../services/user.service';
import { prisma } from '../config/database';
import { sendSuccess, sendError } from '../utils/response.helper';
import { AuthRequest } from '../auth/middleware';

const userService = new UserService(prisma);

export async function getUserById(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const user = await userService.findById(id);

    if (!user) {
      return sendError(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    return sendSuccess(res, user);
  } catch (error: any) {
    console.error('Get user error:', error);
    return sendError(res, error.message || 'Failed to get user', 500);
  }
}

export async function searchUsers(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const search = (req.query.search as string) || '';
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = await userService.searchUsers(search, limit, offset);
    return sendSuccess(res, users);
  } catch (error: any) {
    console.error('Search users error:', error);
    return sendError(res, error.message || 'Failed to search users', 500);
  }
}
