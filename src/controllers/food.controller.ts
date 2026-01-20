import { Response } from 'express';
import { FoodService } from '../services/food.service';
import { scrapeFoodItems } from '../services/scraper/foodScraper.service';
import { prisma } from '../config/database';
import { sendSuccess, sendError, sendCreated } from '../utils/response.helper';
import { AuthRequest } from '../auth/middleware';

const foodService = new FoodService(prisma);

export async function searchFoodItems(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { search, category, page, limit } = req.query;

    // First, search in database
    let result = await foodService.searchFoodItems({
      search: search as string | undefined,
      category: category as string | undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    // If no results found and search query exists, scrape from web
    if (result.items.length === 0 && search && typeof search === 'string' && search.trim().length > 0) {
      console.log(`[FoodController] No results in DB for "${search}", scraping from web...`);
      
      try {
        // Scrape Indian food items
        const scrapedItems = await scrapeFoodItems(search, limit ? parseInt(limit as string) : 20);
        
        if (scrapedItems.length > 0) {
          // Import scraped items to database
          const importResult = await foodService.bulkImportFoodItems(scrapedItems);
          console.log(`[FoodController] Scraped and imported ${importResult.successful} items for "${search}"`);
          
          // Search again after importing
          result = await foodService.searchFoodItems({
            search: search as string | undefined,
            category: category as string | undefined,
            page: page ? parseInt(page as string) : undefined,
            limit: limit ? parseInt(limit as string) : undefined,
          });
        }
      } catch (scrapeError: any) {
        console.error('[FoodController] Error scraping food items:', scrapeError);
        // Continue with empty results if scraping fails
      }
    }

    return sendSuccess(res, result);
  } catch (error: any) {
    console.error('[FoodController] Search food items error:', error);
    return sendError(res, error.message || 'Failed to search food items', 500);
  }
}

export async function getFoodItem(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const item = await foodService.getFoodItemById(id);

    if (!item) {
      return sendError(res, 'Food item not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, item);
  } catch (error: any) {
    console.error('[FoodController] Get food item error:', error);
    return sendError(res, error.message || 'Failed to get food item', 500);
  }
}

export async function getFoodCategories(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const categories = await foodService.getCategories();
    return sendSuccess(res, categories);
  } catch (error: any) {
    console.error('[FoodController] Get categories error:', error);
    return sendError(res, error.message || 'Failed to get categories', 500);
  }
}

export async function createFoodItem(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { name, description, imageUrl, calories, carbs, protein, fat, servingSize, servingUnit, category, source, sourceUrl } = req.body;

    if (!name || calories === undefined) {
      return sendError(res, 'Name and calories are required', 400, 'VALIDATION_ERROR');
    }

    const item = await foodService.createFoodItem({
      name,
      description,
      imageUrl,
      calories: parseFloat(calories),
      carbs: parseFloat(carbs || 0),
      protein: parseFloat(protein || 0),
      fat: parseFloat(fat || 0),
      servingSize: servingSize ? parseFloat(servingSize) : undefined,
      servingUnit,
      category,
      source: source || 'user-added',
      sourceUrl,
    });

    return sendCreated(res, item, 'Food item created successfully');
  } catch (error: any) {
    console.error('[FoodController] Create food item error:', error);
    return sendError(res, error.message || 'Failed to create food item', 500);
  }
}

export async function scrapeFood(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { query, limit } = req.body;

    if (!query) {
      return sendError(res, 'Query is required', 400, 'VALIDATION_ERROR');
    }

    console.log(`[FoodController] Scraping food items for query: ${query}`);
    
    const scrapedItems = await scrapeFoodItems(query, limit || 20);
    
    // Import scraped items to database
    const result = await foodService.bulkImportFoodItems(scrapedItems);
    
    console.log(`[FoodController] Scraped and imported ${result.successful} items`);
    
    return sendSuccess(res, result, `Successfully scraped and imported ${result.successful} items`);
  } catch (error: any) {
    console.error('[FoodController] Scrape food error:', error);
    return sendError(res, error.message || 'Failed to scrape food items', 500);
  }
}

// Basket operations
export async function getBasket(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const basket = await foodService.getBasket(req.user.userId);
    return sendSuccess(res, basket);
  } catch (error: any) {
    console.error('[FoodController] Get basket error:', error);
    return sendError(res, error.message || 'Failed to get basket', 500);
  }
}

export async function addToBasket(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { foodItemId, quantity, servingSize } = req.body;

    if (!foodItemId) {
      return sendError(res, 'foodItemId is required', 400, 'VALIDATION_ERROR');
    }

    const item = await foodService.addToBasket(
      req.user.userId,
      foodItemId,
      quantity || 1,
      servingSize || 100
    );

    return sendCreated(res, item, 'Item added to basket successfully');
  } catch (error: any) {
    console.error('[FoodController] Add to basket error:', error);
    return sendError(res, error.message || 'Failed to add to basket', 500);
  }
}

export async function updateBasketItem(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const { quantity, servingSize } = req.body;

    if (quantity === undefined) {
      return sendError(res, 'quantity is required', 400, 'VALIDATION_ERROR');
    }

    const item = await foodService.updateBasketItem(req.user.userId, id, quantity, servingSize);
    return sendSuccess(res, item, 'Basket item updated successfully');
  } catch (error: any) {
    console.error('[FoodController] Update basket item error:', error);
    return sendError(res, error.message || 'Failed to update basket item', 500);
  }
}

export async function removeFromBasket(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    await foodService.removeFromBasket(req.user.userId, id);
    return sendSuccess(res, { success: true }, 'Item removed from basket successfully');
  } catch (error: any) {
    console.error('[FoodController] Remove from basket error:', error);
    if (error.message?.includes('not found')) {
      return sendError(res, error.message, 404, 'NOT_FOUND');
    }
    return sendError(res, error.message || 'Failed to remove from basket', 500);
  }
}

export async function createMealFromBasket(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    const { mealType, date } = req.body;

    if (!mealType) {
      return sendError(res, 'mealType is required', 400, 'VALIDATION_ERROR');
    }

    const basket = await foodService.getBasket(req.user.userId);

    if (basket.length === 0) {
      return sendError(res, 'Basket is empty', 400, 'VALIDATION_ERROR');
    }

    // Calculate totals from basket items
    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    const itemNames: string[] = [];

    for (const basketItem of basket) {
      const foodItem = basketItem.foodItem;
      const multiplier = (basketItem.quantity * basketItem.servingSize) / foodItem.servingSize;
      
      totalCalories += foodItem.calories * multiplier;
      totalCarbs += foodItem.carbs * multiplier;
      totalProtein += foodItem.protein * multiplier;
      totalFat += foodItem.fat * multiplier;
      
      itemNames.push(foodItem.name);
    }

    const mealName = itemNames.length === 1 
      ? itemNames[0] 
      : `${itemNames.slice(0, 2).join(', ')}${itemNames.length > 2 ? ` + ${itemNames.length - 2} more` : ''}`;

    // Clear basket after creating meal
    await foodService.clearBasket(req.user.userId);

    // Return meal data (frontend will handle creating the meal via existing meal API)
    return sendSuccess(res, {
      name: mealName,
      type: mealType,
      calories: Math.round(totalCalories),
      carbs: Math.round(totalCarbs * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      items: basket.map(bi => ({
        name: bi.foodItem.name,
        quantity: bi.quantity,
        servingSize: bi.servingSize,
      })),
    }, 'Meal created from basket successfully');
  } catch (error: any) {
    console.error('[FoodController] Create meal from basket error:', error);
    return sendError(res, error.message || 'Failed to create meal from basket', 500);
  }
}

export async function deleteAllFoodItems(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    // Optional: Add admin check here if needed
    // if (req.user.role !== 'admin') {
    //   return sendError(res, 'Admin access required', 403, 'FORBIDDEN');
    // }

    const count = await foodService.getFoodItemCount();
    await foodService.deleteAllFoodItems();

    return sendSuccess(res, { deletedCount: count }, `Successfully deleted ${count} food items`);
  } catch (error: any) {
    console.error('[FoodController] Delete all food items error:', error);
    return sendError(res, error.message || 'Failed to delete food items', 500);
  }
}

export async function reseedIndianFood(req: AuthRequest, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'AUTH_REQUIRED');
    }

    // List of healthy Indian food items to scrape (excludes fried, high-sugar, high-fat items)
    const healthyIndianFoodQueries = [
      // Lentils and legumes (high protein, healthy)
      'dal', 'dal tadka', 'rajma', 'chole', 'chana', 'moong dal', 'toor dal', 'masoor dal',
      'lentil curry', 'lentil soup',
      
      // Healthy curries and vegetables
      'vegetable curry', 'sabzi', 'subzi', 'aloo gobi', 'baingan bharta', 'brinjal curry',
      'palak', 'spinach curry', 'mutter', 'peas curry', 'okra curry', 'bhindi',
      
      // Healthy protein sources
      'tandoori chicken', 'grilled chicken', 'chicken tikka', 'fish curry', 'prawn curry',
      'paneer', 'paneer curry', 'tofu curry',
      
      // Healthy breads (in moderation)
      'roti', 'chapati', 'whole wheat roti',
      
      // Fermented and steamed foods
      'dosa', 'idli', 'uttapam', 'sambar', 'rasam',
      
      // Light meals
      'poha', 'upma', 'khichdi', 'vegetable pulao',
      
      // Steamed snacks
      'dhokla', 'khandvi', 'thepla',
      
      // Healthy sides
      'raita', 'dahi', 'yogurt', 'cucumber salad', 'vegetable salad'
    ];

    // Delete all existing food items
    const count = await foodService.getFoodItemCount();
    await foodService.deleteAllFoodItems();
    console.log(`[FoodController] Deleted ${count} existing food items`);

    // Scrape and import healthy Indian food items only
    let totalScraped = 0;
    let totalFailed = 0;

    for (const query of healthyIndianFoodQueries) {
      try {
        console.log(`[FoodController] Scraping healthy Indian food: ${query}`);
        const scrapedItems = await scrapeFoodItems(query, 10);
        
        if (scrapedItems.length > 0) {
          const result = await foodService.bulkImportFoodItems(scrapedItems);
          totalScraped += result.successful;
          totalFailed += result.failed;
          console.log(`[FoodController] Imported ${result.successful} healthy items for "${query}"`);
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        console.error(`[FoodController] Error scraping "${query}":`, error);
        totalFailed += 10; // Estimate
      }
    }

    return sendSuccess(res, {
      deletedCount: count,
      scrapedCount: totalScraped,
      failedCount: totalFailed,
    }, `Successfully reseeded database with ${totalScraped} healthy Indian food items`);
  } catch (error: any) {
    console.error('[FoodController] Reseed Indian food error:', error);
    return sendError(res, error.message || 'Failed to reseed Indian food', 500);
  }
}
