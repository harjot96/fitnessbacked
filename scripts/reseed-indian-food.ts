import { PrismaClient } from '@prisma/client';
import { FoodService } from '../src/services/food.service';
import { scrapeFoodItems } from '../src/services/scraper/foodScraper.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const foodService = new FoodService(prisma);

// Healthy Indian food items to scrape (excludes fried, high-sugar, high-fat items)
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
  'roti', 'chapati', 'whole wheat roti', 'whole grain naan',
  
  // Fermented and steamed foods
  'dosa', 'idli', 'uttapam', 'sambar', 'rasam',
  
  // Light meals
  'poha', 'upma', 'khichdi', 'vegetable pulao',
  
  // Steamed snacks
  'dhokla', 'khandvi', 'thepla',
  
  // Healthy sides
  'raita', 'dahi', 'yogurt', 'cucumber salad', 'vegetable salad',
  
  // Regional healthy dishes
  'south indian healthy food', 'gujarati healthy food', 'healthy indian food'
];

async function reseedIndianFood() {
  console.log('🌱 Starting healthy Indian food reseeding...\n');

  // Step 1: Delete all existing food items
  console.log('🗑️  Deleting all existing food items...');
  const countBefore = await foodService.getFoodItemCount();
  await foodService.deleteAllFoodItems();
  console.log(`   ✅ Deleted ${countBefore} existing food items\n`);

  // Step 2: Scrape and import healthy Indian food items only
  let totalScraped = 0;
  let totalImported = 0;
  let totalFailed = 0;

  for (const query of healthyIndianFoodQueries) {
    try {
      console.log(`📦 Scraping healthy Indian food: ${query}...`);
      
      // Scrape items for this query (already filtered for healthy Indian food)
      const scrapedItems = await scrapeFoodItems(query, 10);
      
      if (scrapedItems.length === 0) {
        console.log(`   ⚠️  No healthy items found for: ${query}\n`);
        continue;
      }

      console.log(`   ✅ Found ${scrapedItems.length} healthy Indian food items`);

      // Import items to database
      const result = await foodService.bulkImportFoodItems(scrapedItems);
      
      totalScraped += scrapedItems.length;
      totalImported += result.successful;
      totalFailed += result.failed;

      console.log(`   ✅ Imported ${result.successful} items, ${result.failed} failed\n`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`   ❌ Error processing ${query}:`, error.message);
      totalFailed += 10; // Estimate
    }
  }

  console.log('\n📊 Reseeding Summary:');
  console.log(`   Total scraped: ${totalScraped}`);
  console.log(`   Total imported: ${totalImported}`);
  console.log(`   Total failed: ${totalFailed}`);

  // Get final count
  const finalCount = await foodService.getFoodItemCount();
  console.log(`\n✅ Database now contains ${finalCount} healthy Indian food items\n`);
}

async function main() {
  try {
    await reseedIndianFood();
  } catch (error) {
    console.error('❌ Reseeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
