import { PrismaClient } from '@prisma/client';

export class FoodService {
  constructor(private prisma: PrismaClient) {}

  async createFoodItem(data: {
    name: string;
    description?: string;
    imageUrl?: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    servingSize?: number;
    servingUnit?: string;
    category?: string;
    source?: string;
    sourceUrl?: string;
  }) {
    return this.prisma.foodItem.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        calories: data.calories,
        carbs: data.carbs,
        protein: data.protein,
        fat: data.fat,
        servingSize: data.servingSize || 100,
        servingUnit: data.servingUnit || 'g',
        category: data.category,
        source: data.source || 'user-added',
        sourceUrl: data.sourceUrl,
      },
    });
  }

  async searchFoodItems(params: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (params.search) {
      where.name = {
        contains: params.search,
        mode: 'insensitive' as const,
      };
    }

    if (params.category) {
      where.category = params.category;
    }

    const [items, total] = await Promise.all([
      this.prisma.foodItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.foodItem.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFoodItemById(id: string) {
    return this.prisma.foodItem.findUnique({
      where: { id },
    });
  }

  async getFoodItemsByCategory(category: string, limit: number = 50) {
    return this.prisma.foodItem.findMany({
      where: { category },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async getCategories() {
    const categories = await this.prisma.foodItem.findMany({
      select: { category: true },
      distinct: ['category'],
      where: {
        category: {
          not: null,
        },
      },
    });

    return categories
      .map(c => c.category)
      .filter((c): c is string => c !== null)
      .sort();
  }

  async bulkImportFoodItems(items: Array<{
    name: string;
    description?: string;
    imageUrl?: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    servingSize?: number;
    servingUnit?: string;
    category?: string;
    source?: string;
    sourceUrl?: string;
  }>) {
    // Use createMany with skipDuplicates - but since we don't have a unique constraint on name,
    // we'll use createMany and handle duplicates by checking first
    const results = await Promise.allSettled(
      items.map(async item => {
        // Check if item with same name and source already exists
        const existing = await this.prisma.foodItem.findFirst({
          where: {
            name: item.name,
            source: item.source || 'scraped',
          },
        });

        if (existing) {
          // Update existing item
          return this.prisma.foodItem.update({
            where: { id: existing.id },
            data: {
              calories: item.calories,
              carbs: item.carbs,
              protein: item.protein,
              fat: item.fat,
              description: item.description || existing.description,
              imageUrl: item.imageUrl || existing.imageUrl,
              category: item.category || existing.category,
              sourceUrl: item.sourceUrl || existing.sourceUrl,
              updatedAt: new Date(),
            },
          });
        } else {
          // Create new item
          return this.prisma.foodItem.create({
            data: {
              name: item.name,
              description: item.description,
              imageUrl: item.imageUrl,
              calories: item.calories,
              carbs: item.carbs,
              protein: item.protein,
              fat: item.fat,
              servingSize: item.servingSize || 100,
              servingUnit: item.servingUnit || 'g',
              category: item.category,
              source: item.source || 'scraped',
              sourceUrl: item.sourceUrl,
            },
          });
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return { successful, failed, total: items.length };
  }

  // Basket operations
  async getBasket(userId: string) {
    return this.prisma.basketItem.findMany({
      where: { userId },
      include: {
        foodItem: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addToBasket(userId: string, foodItemId: string, quantity: number = 1, servingSize: number = 100) {
    // Check if item already exists in basket
    const existing = await this.prisma.basketItem.findUnique({
      where: {
        userId_foodItemId: {
          userId,
          foodItemId,
        },
      },
    });

    if (existing) {
      return this.prisma.basketItem.update({
        where: { id: existing.id },
        data: { quantity, servingSize },
        include: { foodItem: true },
      });
    }

    return this.prisma.basketItem.create({
      data: {
        userId,
        foodItemId,
        quantity,
        servingSize,
      },
      include: {
        foodItem: true,
      },
    });
  }

  async updateBasketItem(userId: string, basketItemId: string, quantity: number, servingSize?: number) {
    const updateData: any = { quantity };
    if (servingSize !== undefined) {
      updateData.servingSize = servingSize;
    }

    return this.prisma.basketItem.update({
      where: { id: basketItemId },
      data: updateData,
      include: {
        foodItem: true,
      },
    });
  }

  async removeFromBasket(userId: string, basketItemId: string) {
    // Verify ownership
    const item = await this.prisma.basketItem.findUnique({
      where: { id: basketItemId },
    });

    if (!item || item.userId !== userId) {
      throw new Error('Basket item not found or access denied');
    }

    return this.prisma.basketItem.delete({
      where: { id: basketItemId },
    });
  }

  async clearBasket(userId: string) {
    return this.prisma.basketItem.deleteMany({
      where: { userId },
    });
  }

  async deleteAllFoodItems() {
    // First delete all basket items that reference food items
    await this.prisma.basketItem.deleteMany({});
    
    // Then delete all food items
    return this.prisma.foodItem.deleteMany({});
  }

  async getFoodItemCount() {
    return this.prisma.foodItem.count();
  }
}
