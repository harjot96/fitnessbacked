import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate food items...\n');

  // Get all food items
  const allItems = await prisma.foodItem.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Total food items in database: ${allItems.length}\n`);

  // Check for duplicates by name (case-insensitive)
  const nameMap = new Map<string, typeof allItems>();
  
  for (const item of allItems) {
    const normalizedName = item.name.toLowerCase().trim();
    if (!nameMap.has(normalizedName)) {
      nameMap.set(normalizedName, []);
    }
    nameMap.get(normalizedName)!.push(item);
  }

  // Find duplicates
  const duplicates: Array<{ name: string; items: typeof allItems }> = [];
  
  for (const [name, items] of nameMap.entries()) {
    if (items.length > 1) {
      duplicates.push({ name, items });
    }
  }

  if (duplicates.length === 0) {
    console.log('✅ No duplicates found! All food items are unique.\n');
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} duplicate groups:\n`);

  let totalDuplicates = 0;
  
  for (const { name, items } of duplicates) {
    totalDuplicates += items.length - 1; // -1 because we keep one
    console.log(`📦 "${name}" (${items.length} duplicates):`);
    
    for (const item of items) {
      console.log(`   - ID: ${item.id}`);
      console.log(`     Name: ${item.name}`);
      console.log(`     Source: ${item.source}`);
      console.log(`     Calories: ${item.calories}, Carbs: ${item.carbs}, Protein: ${item.protein}, Fat: ${item.fat}`);
      console.log(`     Created: ${item.createdAt.toISOString()}`);
      console.log('');
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total items: ${allItems.length}`);
  console.log(`   Unique names: ${nameMap.size}`);
  console.log(`   Duplicate groups: ${duplicates.length}`);
  console.log(`   Total duplicate items: ${totalDuplicates}`);
  console.log(`   Items to keep: ${allItems.length - totalDuplicates}`);
}

async function removeDuplicates() {
  console.log('🧹 Removing duplicate food items...\n');

  // Get all food items
  const allItems = await prisma.foodItem.findMany({
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
  });

  const nameMap = new Map<string, typeof allItems>();
  
  for (const item of allItems) {
    const normalizedName = item.name.toLowerCase().trim();
    if (!nameMap.has(normalizedName)) {
      nameMap.set(normalizedName, []);
    }
    nameMap.get(normalizedName)!.push(item);
  }

  const duplicatesToRemove: string[] = [];
  let keptCount = 0;
  let removedCount = 0;

  for (const [name, items] of nameMap.entries()) {
    if (items.length > 1) {
      // Keep the first one (oldest by createdAt), remove the rest
      const toKeep = items[0];
      const toRemove = items.slice(1);
      
      keptCount++;
      removedCount += toRemove.length;
      
      console.log(`📦 "${name}": Keeping 1, removing ${toRemove.length} duplicates`);
      
      for (const item of toRemove) {
        duplicatesToRemove.push(item.id);
      }
    } else {
      keptCount++;
    }
  }

  if (duplicatesToRemove.length === 0) {
    console.log('\n✅ No duplicates to remove!\n');
    return;
  }

  // Check if any duplicates are in baskets
  const basketItems = await prisma.basketItem.findMany({
    where: {
      foodItemId: { in: duplicatesToRemove },
    },
  });

  if (basketItems.length > 0) {
    console.log(`\n⚠️  Warning: ${basketItems.length} basket items reference duplicates.`);
    console.log('   These will be deleted when we remove the food items.\n');
    
    // Delete basket items first
    await prisma.basketItem.deleteMany({
      where: {
        foodItemId: { in: duplicatesToRemove },
      },
    });
    console.log(`   ✅ Removed ${basketItems.length} basket items\n`);
  }

  // Remove duplicate food items
  const result = await prisma.foodItem.deleteMany({
    where: {
      id: { in: duplicatesToRemove },
    },
  });

  console.log(`\n✅ Removed ${result.count} duplicate food items`);
  console.log(`   Kept: ${keptCount} unique items`);
  console.log(`   Removed: ${removedCount} duplicates\n`);

  // Get final count
  const finalCount = await prisma.foodItem.count();
  console.log(`📊 Database now contains ${finalCount} unique food items\n`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldRemove = args.includes('--remove');

  try {
    if (shouldRemove) {
      await removeDuplicates();
    } else {
      await checkDuplicates();
      console.log('\n💡 To remove duplicates, run: npm run check:duplicates -- --remove\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
