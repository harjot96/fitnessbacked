import { Response } from 'express';
import { prisma } from '../config/database';
import { sendCreated, sendError, sendSuccess } from '../utils/response.helper';
import { AuthRequest } from '../auth/middleware';
import { FeedService } from '../services/feed.service';

const feedService = new FeedService(prisma);

export async function getFeedPosts(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
    const cursor = req.query.cursor as string | undefined;

    const posts = await feedService.listPosts(req.user.userId, limit, cursor);
    const nextCursor = posts.length > 0 ? posts[posts.length - 1].id : null;

    return sendSuccess(res, { posts, nextCursor });
  } catch (error: any) {
    console.error('Get feed posts error:', error);
    return sendError(res, error.message || 'Failed to get feed posts', 500);
  }
}

export async function createFeedPost(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { content, tags, mood, visibility, stats } = req.body;
    if (!content || typeof content !== 'string') {
      return sendError(res, 'Content is required', 400, 'VALIDATION_ERROR');
    }

    const normalizedTags = Array.isArray(tags)
      ? tags.filter((tag) => typeof tag === 'string').slice(0, 6)
      : [];

    const post = await feedService.createPost(req.user.userId, {
      content: content.trim(),
      tags: normalizedTags,
      mood: typeof mood === 'string' ? mood : undefined,
      visibility: visibility === 'friends' ? 'friends' : 'public',
      stats: stats && typeof stats === 'object' ? stats : undefined,
    });

    return sendCreated(res, post, 'Feed post created');
  } catch (error: any) {
    console.error('Create feed post error:', error);
    return sendError(res, error.message || 'Failed to create feed post', 500);
  }
}

export async function toggleFeedLike(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const liked = await feedService.toggleLike(id, req.user.userId);

    return sendSuccess(res, { liked });
  } catch (error: any) {
    console.error('Toggle feed like error:', error);
    if (error.message === 'Post not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to update like', 500);
  }
}

export async function addFeedComment(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return sendError(res, 'Text is required', 400, 'VALIDATION_ERROR');
    }

    const comment = await feedService.addComment(id, req.user.userId, text.trim());
    return sendCreated(res, comment, 'Comment added');
  } catch (error: any) {
    console.error('Add feed comment error:', error);
    if (error.message === 'Post not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to add comment', 500);
  }
}

export async function getFeedComments(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 10, 50);
    const cursor = req.query.cursor as string | undefined;

    const comments = await feedService.listComments(req.user.userId, id, limit, cursor);
    const nextCursor = comments.length > 0 ? comments[comments.length - 1].id : null;

    return sendSuccess(res, { comments, nextCursor });
  } catch (error: any) {
    console.error('Get feed comments error:', error);
    if (error.message === 'Post not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to get comments', 500);
  }
}
