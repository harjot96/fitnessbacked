import { Router } from 'express';
import {
  getDailyHealthData,
  getWeeklyHealthData,
  saveDailyHealthData,
  addMeal,
  updateMeal,
  deleteMeal,
  addWaterEntry,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  saveFastingSession,
  getMealRecommendations,
} from '../controllers/health.controller';
import { requireAuth } from '../auth/middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Daily health data
router.get('/daily/:date', getDailyHealthData);
router.post('/daily', saveDailyHealthData);

// Weekly health data
router.get('/weekly', getWeeklyHealthData);

// Meals
router.post('/meals', addMeal);
router.put('/meals/:id', updateMeal);
router.delete('/meals/:id', deleteMeal);
router.get('/meals/recommendations', getMealRecommendations);

// Water entries
router.post('/water', addWaterEntry);

// Workouts
router.post('/workouts', addWorkout);
router.put('/workouts/:id', updateWorkout);
router.delete('/workouts/:id', deleteWorkout);

// Fasting sessions
router.post('/fasting', saveFastingSession);

export default router;
