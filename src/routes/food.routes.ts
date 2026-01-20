import { Router } from 'express';
import {
  searchFoodItems,
  getFoodItem,
  getFoodCategories,
  createFoodItem,
  scrapeFood,
  getBasket,
  addToBasket,
  updateBasketItem,
  removeFromBasket,
  createMealFromBasket,
  deleteAllFoodItems,
  reseedIndianFood,
} from '../controllers/food.controller';
import { requireAuth } from '../auth/middleware';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Food items
router.get('/items', searchFoodItems);
router.get('/items/:id', getFoodItem);
router.get('/categories', getFoodCategories);
router.post('/items', createFoodItem);
router.post('/scrape', scrapeFood);
router.delete('/items', deleteAllFoodItems); // Delete all food items
router.post('/reseed', reseedIndianFood); // Clear and reseed with Indian food

// Basket operations
router.get('/basket', getBasket);
router.post('/basket', addToBasket);
router.put('/basket/:id', updateBasketItem);
router.delete('/basket/:id', removeFromBasket);
router.post('/basket/create-meal', createMealFromBasket);

export default router;
