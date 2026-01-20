import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapedFoodItem {
  name: string;
  description?: string;
  imageUrl?: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  category?: string;
  source: string;
  sourceUrl?: string;
}

/**
 * Check if a food item is Indian food
 */
function isIndianFood(name: string, description?: string, category?: string): boolean {
  const indianFoodKeywords = [
    'dal', 'curry', 'roti', 'naan', 'paratha', 'chapati', 'puri', 'bhature',
    'biryani', 'pulao', 'khichdi', 'dosa', 'idli', 'vada', 'sambar', 'rasam',
    'paneer', 'tikka', 'masala', 'tandoori', 'kebab', 'samosa', 'pakora',
    'gulab jamun', 'jalebi', 'laddu', 'barfi', 'halwa', 'kheer', 'payasam',
    'poha', 'upma', 'dhokla', 'khandvi', 'thepla', 'dhokla', 'fafda',
    'pav bhaji', 'vada pav', 'dahi vada', 'pani puri', 'bhel puri', 'sev puri',
    'rajma', 'chole', 'aloo gobi', 'baingan bharta', 'palak paneer', 'mutter paneer',
    'butter chicken', 'chicken tikka', 'tandoori chicken', 'fish curry', 'prawn curry',
    'biryani', 'hyderabadi', 'lucknowi', 'awadhi', 'punjabi', 'gujarati', 'south indian',
    'north indian', 'indian', 'india', 'desi', 'tadka', 'tadka', 'tadka'
  ];

  const text = `${name} ${description || ''} ${category || ''}`.toLowerCase();
  
  return indianFoodKeywords.some(keyword => text.includes(keyword));
}

/**
 * Check if a food item is healthy based on nutritional values and name
 * Excludes deep-fried, high-sugar desserts, and excessive butter/cream dishes
 */
function isHealthyFood(
  name: string,
  calories: number,
  carbs: number,
  protein: number,
  fat: number,
  description?: string
): boolean {
  const text = `${name} ${description || ''}`.toLowerCase();

  // Exclude unhealthy keywords
  const unhealthyKeywords = [
    'deep fried', 'deep-fried', 'fried', 'fry',
    'gulab jamun', 'jalebi', 'laddu', 'barfi', 'halwa', 'kheer', 'payasam', 'dessert', 'sweet',
    'butter', 'ghee', 'cream', 'heavy cream', 'malai',
    'pakora', 'samosa', 'bhature', 'puri', 'vada', 'fafda', // Deep-fried items
    'pav bhaji', 'vada pav', // Street food (often high in fat)
    'butter chicken', 'butter masala', 'paneer butter masala', // High butter dishes
    'biryani', // Often high in calories and fat
  ];

  // Check if it's an unhealthy item
  if (unhealthyKeywords.some(keyword => text.includes(keyword))) {
    return false;
  }

  // Health criteria per 100g:
  // - Calories: reasonable (not too high, max ~400 kcal per 100g for cooked dishes)
  // - Fat: not excessive (max ~20g per 100g, prefer <15g)
  // - Protein: prefer protein-rich foods (at least 5g per 100g)
  // - Carbs: reasonable (not excessive, max ~60g per 100g)

  // Exclude items with excessive calories (likely high in fat/sugar)
  if (calories > 400) {
    return false;
  }

  // Exclude items with excessive fat (likely deep-fried or high butter)
  if (fat > 20) {
    return false;
  }

  // Prefer items with some protein (nutrient-dense)
  // But allow some flexibility for vegetable dishes
  if (protein === 0 && calories > 100) {
    // If it has calories but no protein, it's likely just carbs/fat
    return false;
  }

  // Exclude items with excessive carbs and low protein (likely just refined carbs)
  if (carbs > 60 && protein < 5) {
    return false;
  }

  // Include healthy Indian foods
  const healthyKeywords = [
    'dal', 'lentil', 'rajma', 'chole', 'chana', 'moong', 'toor', 'masoor',
    'sambar', 'rasam', 'curry', 'vegetable curry', 'sabzi', 'subzi',
    'dosa', 'idli', 'uttapam', // Fermented foods
    'poha', 'upma', 'khichdi', 'vegetable pulao', // Light meals
    'dhokla', 'khandvi', 'thepla', // Steamed/light items
    'tandoori', 'grilled', 'tikka', // Grilled items
    'paneer', 'tofu', 'chicken', 'fish', 'prawn', // Protein sources
    'palak', 'spinach', 'aloo gobi', 'baingan', 'brinjal', 'mutter', 'peas',
    'vegetable', 'salad', 'raita', 'dahi', 'yogurt',
  ];

  // Breads that can be healthy if low in fat
  const breadKeywords = ['roti', 'chapati', 'whole wheat'];
  
  // Check if it's a bread item
  const isBread = breadKeywords.some(keyword => text.includes(keyword));
  
  // For breads, be stricter - they should be low in fat (not butter-laden)
  if (isBread) {
    // Breads should have low fat (not butter naan, butter paratha, etc.)
    if (fat > 8) {
      return false; // Too much fat for a healthy bread
    }
    // And reasonable calories
    if (calories > 300) {
      return false; // Too many calories for a healthy bread
    }
  }

  // If it matches healthy keywords, it's more likely to be healthy
  const hasHealthyKeyword = healthyKeywords.some(keyword => text.includes(keyword));

  // Final check: if it has healthy keywords and meets nutritional criteria, it's healthy
  if (hasHealthyKeyword && calories <= 400 && fat <= 20) {
    // Additional check: if it's a bread, ensure it's not too high in fat
    if (isBread && fat > 8) {
      return false;
    }
    return true;
  }

  // For items without clear healthy keywords, be very strict
  if (!hasHealthyKeyword) {
    // Must have good protein content and be low calorie with low fat
    return (protein >= 8 || calories <= 200) && fat <= 12 && calories <= 300;
  }

  return false;
}

/**
 * Scrape food items from Open Food Facts (open database) - Indian food only
 * This is a legal, open-source food database
 */
export async function scrapeOpenFoodFacts(query: string, limit: number = 20): Promise<ScrapedFoodItem[]> {
  try {
    // Add "Indian" to query to filter for Indian food
    const indianQuery = `Indian ${query}`;
    
    const response = await axios.get('https://world.openfoodfacts.org/cgi/search.pl', {
      params: {
        action: 'process',
        tagtype_0: 'categories',
        tag_contains_0: 'contains',
        tag_0: indianQuery,
        countries_tags_en: 'india', // Filter by India
        page_size: limit * 2, // Get more to filter
        json: true,
      },
      timeout: 10000,
    });

    const products = response.data?.products || [];
    const items: ScrapedFoodItem[] = [];

    for (const product of products) {
      if (!product.product_name || !product.nutriments) continue;

      // Extract nutrition data (per 100g)
      const calories = product.nutriments['energy-kcal_100g'] || 
                      (product.nutriments['energy-kcal'] || 0);
      const carbs = product.nutriments['carbohydrates_100g'] || 0;
      const protein = product.nutriments['proteins_100g'] || 0;
      const fat = product.nutriments['fat_100g'] || 0;

      if (calories === 0 && carbs === 0 && protein === 0 && fat === 0) continue;

      // Filter for Indian food only
      if (!isIndianFood(product.product_name, product.generic_name, product.categories)) {
        continue;
      }

      // Filter for healthy Indian food only
      if (!isHealthyFood(product.product_name, calories, carbs, protein, fat, product.generic_name)) {
        continue;
      }

      items.push({
        name: product.product_name,
        description: product.generic_name || undefined,
        imageUrl: product.image_url || product.image_small_url || undefined,
        calories: Math.round(calories),
        carbs: Math.round(carbs * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        servingSize: 100,
        servingUnit: 'g',
        category: product.categories?.split(',')[0]?.trim() || 'Healthy Indian Food',
        source: 'open-food-facts-indian-healthy',
        sourceUrl: `https://world.openfoodfacts.org/product/${product.code}`,
      });

      // Stop when we have enough items
      if (items.length >= limit) break;
    }

    return items;
  } catch (error: any) {
    console.error('[FoodScraper] Error scraping Open Food Facts:', error.message);
    return [];
  }
}

/**
 * Scrape Indian food items using Gemini AI for nutrition data
 * This uses AI to get accurate nutrition information for Indian dishes
 */
export async function scrapeIndianFoodWithAI(query: string, limit: number = 20): Promise<ScrapedFoodItem[]> {
  try {
    // For now, we'll skip AI-based scraping as it requires API keys
    // This can be implemented later if needed
    return [];
  } catch (error: any) {
    console.error('[FoodScraper] Error scraping with AI:', error.message);
    return [];
  }
}

/**
 * Main scraping function that tries multiple sources - HEALTHY INDIAN FOOD ONLY
 */
export async function scrapeFoodItems(query: string, limit: number = 20): Promise<ScrapedFoodItem[]> {
  const allItems: ScrapedFoodItem[] = [];
  
  try {
    // Try Open Food Facts with Indian food and healthy food filters
    const openFoodFactsItems = await scrapeOpenFoodFacts(query, limit);
    allItems.push(...openFoodFactsItems);
  } catch (error) {
    console.error('[FoodScraper] Open Food Facts scraping failed:', error);
  }

  // Filter all items to ensure they are Indian food AND healthy
  const healthyIndianItems = allItems.filter(item => {
    // Double-check Indian food filter
    if (!isIndianFood(item.name, item.description, item.category)) {
      return false;
    }
    
    // Double-check healthy food filter
    if (!isHealthyFood(item.name, item.calories, item.carbs, item.protein, item.fat, item.description)) {
      return false;
    }
    
    return true;
  });

  // Remove duplicates based on name (case-insensitive)
  const uniqueItems = healthyIndianItems.reduce((acc, item) => {
    const existing = acc.find(i => i.name.toLowerCase() === item.name.toLowerCase());
    if (!existing) {
      acc.push(item);
    }
    return acc;
  }, [] as ScrapedFoodItem[]);

  return uniqueItems.slice(0, limit);
}
