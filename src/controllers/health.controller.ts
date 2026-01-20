import { Response } from 'express';
import { HealthService } from '../services/health.service';
import { GeminiService } from '../services/gemini.service';
import { UserService } from '../services/user.service';
import { prisma } from '../config/database';
import { sendSuccess, sendError, sendCreated } from '../utils/response.helper';
import { AuthRequest } from '../auth/middleware';
import { format } from 'date-fns';

const healthService = new HealthService(prisma);
const geminiService = new GeminiService();
const userService = new UserService(prisma);

export async function getDailyHealthData(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { date } = req.params;
    console.log(`[HealthController] Getting daily health data for user=${req.user.userId}, date=${date}`);
    
    const data = await healthService.getDailyHealthData(req.user.userId, date);

    if (!data) {
      console.log(`[HealthController] No data found for user=${req.user.userId}, date=${date}`);
      return sendError(res, 'Daily health data not found', 404, 'NOT_FOUND');
    }

    console.log(`[HealthController] Returning data: hasFastingSession=${!!data.fastingSession}, date=${data.date}`);
    return sendSuccess(res, data);
  } catch (error: any) {
    console.error('[HealthController] Get daily health data error:', error);
    return sendError(res, error.message || 'Failed to get daily health data', 500);
  }
}

export async function getWeeklyHealthData(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const startDate = req.query.startDate as string;
    if (!startDate) {
      return sendError(res, 'startDate query parameter is required', 400, 'VALIDATION_ERROR');
    }

    const data = await healthService.getWeeklyHealthData(req.user.userId, startDate);
    return sendSuccess(res, data);
  } catch (error: any) {
    console.error('Get weekly health data error:', error);
    return sendError(res, error.message || 'Failed to get weekly health data', 500);
  }
}

export async function saveDailyHealthData(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const data = await healthService.saveDailyHealthData(req.user.userId, req.body);
    return sendSuccess(res, data, 'Daily health data saved successfully');
  } catch (error: any) {
    console.error('Save daily health data error:', error);
    return sendError(res, error.message || 'Failed to save daily health data', 500);
  }
}

export async function addMeal(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { date, meal } = req.body;
    if (!date) {
      return sendError(res, 'Date is required', 400, 'VALIDATION_ERROR');
    }

    const mealData = await healthService.addMeal(req.user.userId, date, meal);
    return sendCreated(res, mealData, 'Meal added successfully');
  } catch (error: any) {
    console.error('Add meal error:', error);
    return sendError(res, error.message || 'Failed to add meal', 500);
  }
}

export async function updateMeal(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const mealData = await healthService.updateMeal(id, req.body);
    return sendSuccess(res, mealData, 'Meal updated successfully');
  } catch (error: any) {
    console.error('Update meal error:', error);
    if (error.message === 'Meal not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to update meal', 500);
  }
}

export async function deleteMeal(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    await healthService.deleteMeal(id);
    return sendSuccess(res, { success: true }, 'Meal deleted successfully');
  } catch (error: any) {
    console.error('Delete meal error:', error);
    if (error.message === 'Meal not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to delete meal', 500);
  }
}

export async function addWaterEntry(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { date, entry } = req.body;
    if (!date) {
      return sendError(res, 'Date is required', 400, 'VALIDATION_ERROR');
    }

    const waterEntry = await healthService.addWaterEntry(req.user.userId, date, entry);
    return sendCreated(res, waterEntry, 'Water entry added successfully');
  } catch (error: any) {
    console.error('Add water entry error:', error);
    return sendError(res, error.message || 'Failed to add water entry', 500);
  }
}

export async function addWorkout(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { date, workout } = req.body;
    if (!date) {
      return sendError(res, 'Date is required', 400, 'VALIDATION_ERROR');
    }

    const workoutData = await healthService.addWorkout(req.user.userId, date, workout);
    return sendCreated(res, workoutData, 'Workout added successfully');
  } catch (error: any) {
    console.error('Add workout error:', error);
    return sendError(res, error.message || 'Failed to add workout', 500);
  }
}

export async function updateWorkout(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const workoutData = await healthService.updateWorkout(id, req.body);
    return sendSuccess(res, workoutData, 'Workout updated successfully');
  } catch (error: any) {
    console.error('Update workout error:', error);
    if (error.message === 'Workout not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to update workout', 500);
  }
}

export async function deleteWorkout(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    await healthService.deleteWorkout(id);
    return sendSuccess(res, { success: true }, 'Workout deleted successfully');
  } catch (error: any) {
    console.error('Delete workout error:', error);
    if (error.message === 'Workout not found') {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to delete workout', 500);
  }
}

export async function saveFastingSession(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { date, session } = req.body;
    if (!date) {
      return sendError(res, 'Date is required', 400, 'VALIDATION_ERROR');
    }

    if (!session) {
      return sendError(res, 'Session data is required', 400, 'VALIDATION_ERROR');
    }

    console.log(`[HealthController] Saving fasting session for user=${req.user.userId}, date=${date}, type=${session.type}`);
    
    const fastingSession = await healthService.saveFastingSession(req.user.userId, date, session);
    
    console.log(`[HealthController] Fasting session saved: id=${fastingSession.id}`);
    return sendSuccess(res, fastingSession, 'Fasting session saved successfully');
  } catch (error: any) {
    console.error('[HealthController] Save fasting session error:', error);
    return sendError(res, error.message || 'Failed to save fasting session', 500);
  }
}

export async function getMealRecommendations(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { mealType, calorieLimit, preferences } = req.query;
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get user profile
    const user = await userService.findById(req.user.userId);
    const profile = user?.profile;

    // Get today's meals
    const todayData = await healthService.getDailyHealthData(req.user.userId, today);
    const currentMeals = todayData?.meals.map(meal => ({
      name: meal.name,
      calories: meal.calories,
      type: meal.type,
    })) || [];

    // Get current calories
    const currentCalories = todayData?.caloriesConsumed || 0;

    // Build context for Gemini
    const context = {
      age: profile?.age || undefined,
      weight: profile?.weight || undefined,
      height: profile?.height || undefined,
      activityLevel: profile?.activityLevel || undefined,
      gender: profile?.gender || undefined,
      waterGoal: profile?.waterGoal || 8,
      currentCalories,
      currentMeals,
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack' | undefined,
      calorieLimit: calorieLimit ? parseInt(calorieLimit as string) : undefined,
      preferences: preferences as string | undefined,
    };

    console.log(`[HealthController] Getting meal recommendations for user=${req.user.userId}, mealType=${mealType}`);
    
    const recommendations = await geminiService.generateMealRecommendations(context);
    
    console.log(`[HealthController] Generated ${recommendations.length} meal recommendations`);
    return sendSuccess(res, recommendations, 'Meal recommendations generated successfully');
  } catch (error: any) {
    console.error('[HealthController] Get meal recommendations error:', error);
    return sendError(res, error.message || 'Failed to get meal recommendations', 500);
  }
}
