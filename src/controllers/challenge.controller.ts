import { Response } from 'express';
import { prisma } from '../config/database';
import { sendError, sendSuccess } from '../utils/response.helper';
import { AuthRequest } from '../auth/middleware';
import { ChallengeService } from '../services/challenge.service';

const challengeService = new ChallengeService(prisma);

export async function getChallenges(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const challenges = await challengeService.listChallenges(req.user.userId);
    return sendSuccess(res, challenges);
  } catch (error: any) {
    console.error('Get challenges error:', error);
    return sendError(res, error.message || 'Failed to load challenges', 500);
  }
}

export async function enrollChallenge(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { slug } = req.params;
    await challengeService.enroll(req.user.userId, slug);
    return sendSuccess(res, { success: true }, 'Enrolled successfully');
  } catch (error: any) {
    console.error('Enroll challenge error:', error);
    if (error.message === 'Challenge not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to enroll', 500);
  }
}

export async function updateChallengeProgress(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { slug } = req.params;
    const { score } = req.body;
    if (score === undefined || Number.isNaN(Number(score))) {
      return sendError(res, 'Score is required', 400, 'VALIDATION_ERROR');
    }

    await challengeService.updateProgress(req.user.userId, slug, Number(score));
    return sendSuccess(res, { success: true }, 'Progress updated');
  } catch (error: any) {
    console.error('Update challenge progress error:', error);
    if (error.message === 'Challenge not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to update progress', 500);
  }
}
