import { PrismaClient } from '@prisma/client';
import { FoodService } from '../src/services/food.service';
import { scrapeFoodItems } from '../src/services/scraper/foodScraper.service';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();
const foodService = new FoodService(prisma);

// Common food categories to scrape
const foodCategories = [
  'apple',
  'banana',
  'chicken',
  'rice',
  'bread',
  'eggs',
  'milk',
  'yogurt',
  'salmon',
  'broccoli',
  'spinach',
  'tomato',
  'potato',
  'pasta',
  'cheese',
  'avocado',
  'orange',
  'strawberry',
  'oatmeal',
  'almonds',
  'peanut butter',
  'quinoa',
  'sweet potato',
  'carrot',
  'cucumber',
  'lettuce',
  'beef',
  'pork',
  'turkey',
  'tuna',
  'shrimp',
  'tofu',
  'lentils',
  'black beans',
  'chickpeas',
  'brown rice',
  'whole wheat bread',
  'greek yogurt',
  'cottage cheese',
  'olive oil',
];

async function seedFoodItems() {
  console.log('🌱 Starting food items seeding...\n');

  let totalScraped = 0;
  let totalImported = 0;
  let totalFailed = 0;

  for (const category of foodCategories) {
    try {
      console.log(`📦 Scraping food items for: ${category}...`);
      
      // Scrape items for this category
      const scrapedItems = await scrapeFoodItems(category, 10);
      
      if (scrapedItems.length === 0) {
        console.log(`   ⚠️  No items found for: ${category}\n`);
        continue;
      }

      console.log(`   ✅ Found ${scrapedItems.length} items`);
      totalScraped += scrapedItems.length;

      // Import items to database
      const result = await foodService.bulkImportFoodItems(scrapedItems);
      
      totalImported += result.successful;
      totalFailed += result.failed;

      console.log(`   ✅ Imported ${result.successful} items, ${result.failed} failed\n`);

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`   ❌ Error processing ${category}:`, error.message);
      totalFailed++;
    }
  }

  console.log('\n📊 Seeding Summary:');
  console.log(`   Total scraped: ${totalScraped}`);
  console.log(`   Total imported: ${totalImported}`);
  console.log(`   Total failed: ${totalFailed}`);

  // Get final count
  const finalCount = await prisma.foodItem.count();
  console.log(`\n✅ Database now contains ${finalCount} food items\n`);
}

async function main() {
  try {
    await seedFoodItems();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
