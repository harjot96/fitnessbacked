import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function detailedCheck() {
  console.log('🔍 Detailed duplicate check (including similar names)...\n');

  const allItems = await prisma.foodItem.findMany({
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Total food items: ${allItems.length}\n`);

  // Check 1: Exact duplicates (case-insensitive, trimmed)
  const exactDuplicates = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const key = item.name.toLowerCase().trim();
    if (!exactDuplicates.has(key)) {
      exactDuplicates.set(key, []);
    }
    exactDuplicates.get(key)!.push(item);
  }

  const exactDupCount = Array.from(exactDuplicates.values())
    .filter(items => items.length > 1)
    .reduce((sum, items) => sum + items.length - 1, 0);

  console.log(`1️⃣  Exact duplicates (same name): ${exactDupCount > 0 ? exactDupCount : 'None ✅'}`);

  // Check 2: Similar names (Levenshtein distance < 3)
  function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j - 1] + 1
          );
        }
      }
    }

    return matrix[len1][len2];
  }

  const similarPairs: Array<{ item1: typeof allItems[0]; item2: typeof allItems[0]; distance: number }> = [];
  
  for (let i = 0; i < allItems.length; i++) {
    for (let j = i + 1; j < allItems.length; j++) {
      const name1 = allItems[i].name.toLowerCase().trim();
      const name2 = allItems[j].name.toLowerCase().trim();
      
      // Skip if already exact match
      if (name1 === name2) continue;
      
      const distance = levenshteinDistance(name1, name2);
      if (distance <= 3 && Math.abs(name1.length - name2.length) <= 3) {
        similarPairs.push({
          item1: allItems[i],
          item2: allItems[j],
          distance,
        });
      }
    }
  }

  console.log(`2️⃣  Similar names (distance ≤ 3): ${similarPairs.length > 0 ? similarPairs.length : 'None ✅'}`);
  
  if (similarPairs.length > 0) {
    console.log('\n   Similar pairs found:');
    for (const { item1, item2, distance } of similarPairs.slice(0, 10)) {
      console.log(`   - "${item1.name}" ↔ "${item2.name}" (distance: ${distance})`);
    }
    if (similarPairs.length > 10) {
      console.log(`   ... and ${similarPairs.length - 10} more`);
    }
  }

  // Check 3: Same nutritional values (might be duplicates with different names)
  const nutritionGroups = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const key = `${item.calories}-${item.carbs}-${item.protein}-${item.fat}`;
    if (!nutritionGroups.has(key)) {
      nutritionGroups.set(key, []);
    }
    nutritionGroups.get(key)!.push(item);
  }

  const sameNutrition = Array.from(nutritionGroups.values())
    .filter(items => items.length > 1)
    .filter(items => {
      // Only consider if names are somewhat similar (not completely different foods)
      const names = items.map(i => i.name.toLowerCase());
      const allSimilar = names.every(name => 
        names.some(other => name === other || levenshteinDistance(name, other) <= 5)
      );
      return allSimilar;
    });

  console.log(`\n3️⃣  Same nutrition + similar names: ${sameNutrition.length > 0 ? sameNutrition.length : 'None ✅'}`);

  if (sameNutrition.length > 0) {
    console.log('\n   Potential duplicates with same nutrition:');
    for (const group of sameNutrition.slice(0, 5)) {
      console.log(`   - ${group.map(i => i.name).join(', ')}`);
      console.log(`     (Cal: ${group[0].calories}, C: ${group[0].carbs}, P: ${group[0].protein}, F: ${group[0].fat})`);
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total items: ${allItems.length}`);
  console.log(`   Unique names: ${exactDuplicates.size}`);
  console.log(`   Exact duplicates: ${exactDupCount}`);
  console.log(`   Similar name pairs: ${similarPairs.length}`);
  console.log(`   Same nutrition groups: ${sameNutrition.length}`);

  if (exactDupCount === 0 && similarPairs.length === 0 && sameNutrition.length === 0) {
    console.log('\n✅ Database is clean! No duplicates found.\n');
  } else {
    console.log('\n⚠️  Potential duplicates found. Review the list above.\n');
  }
}

async function main() {
  try {
    await detailedCheck();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
