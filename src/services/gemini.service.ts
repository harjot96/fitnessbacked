import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('[GeminiService] GEMINI_API_KEY is not configured. Meal recommendations will not work.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface MealRecommendation {
  name: string;
  calories: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  description?: string;
  reasoning?: string;
}

export interface UserContext {
  age?: number;
  weight?: number;
  height?: number;
  activityLevel?: string;
  gender?: string;
  currentCalories?: number;
  currentMeals?: Array<{
    name: string;
    calories: number;
    type: string;
  }>;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calorieLimit?: number;
  preferences?: string;
}

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 */
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (gender?.toLowerCase() === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return 10 * weight + 6.25 * height - 5 * age + 5;
}

/**
 * Estimate TDEE (Total Daily Energy Expenditure) based on activity level
 */
function estimateTDEE(bmr: number, activityLevel?: string): number {
  const multipliers: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const multiplier = activityLevel ? multipliers[activityLevel.toLowerCase()] || 1.2 : 1.2;
  return bmr * multiplier;
}

export class GeminiService {
  async generateMealRecommendations(context: UserContext): Promise<MealRecommendation[]> {
    if (!genAI) {
      throw new Error('Gemini API is not configured. Please set GEMINI_API_KEY environment variable.');
    }

    try {
      // Using gemini-2.5-flash-lite (FREE tier model from Google AI Studio)
      // This is the most cost-efficient free model in the Gemini 2.5 series
      // Free tier limits apply (check Google AI Studio for current limits)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

      // Calculate nutritional targets
      let bmr = 2000; // Default
      let tdee = 2000;
      if (context.weight && context.height && context.age && context.gender) {
        bmr = calculateBMR(context.weight, context.height, context.age, context.gender);
        tdee = estimateTDEE(bmr, context.activityLevel);
      }

      const targetCalories = context.calorieLimit || Math.round(tdee * 0.3); // ~30% per meal
      const mealType = context.mealType || 'lunch';

      // Build prompt
      const currentMealsText = context.currentMeals && context.currentMeals.length > 0
        ? `\nCurrent meals today:\n${context.currentMeals.map(m => `- ${m.type}: ${m.name} (${m.calories} cal)`).join('\n')}`
        : '';

      const userInfoText = context.age || context.weight || context.height
        ? `\nUser Profile:\n${context.age ? `- Age: ${context.age}` : ''}${context.gender ? `\n- Gender: ${context.gender}` : ''}${context.weight ? `\n- Weight: ${context.weight} kg` : ''}${context.height ? `\n- Height: ${context.height} cm` : ''}${context.activityLevel ? `\n- Activity Level: ${context.activityLevel}` : ''}${currentMealsText}\n- Estimated Daily Calorie Needs: ~${Math.round(tdee)} kcal`
        : '';

      const preferencesText = context.preferences ? `\nDietary Preferences: ${context.preferences}` : '';

      const prompt = `You are a nutritionist providing personalized meal recommendations.

${userInfoText}${preferencesText}

Provide ${mealType} meal recommendations that:
1. Are around ${targetCalories} calories (can vary ±200 calories)
2. Are balanced in macronutrients (carbs, protein, fat)
3. Are healthy and nutritious
4. Are different from current meals if provided
5. Are appropriate for the meal type (${mealType})

Return ONLY a valid JSON array with exactly 3 meal recommendations. Each recommendation must have this exact structure:
{
  "name": "meal name",
  "calories": number (estimated calories),
  "macros": {
    "carbs": number (grams),
    "protein": number (grams),
    "fat": number (grams)
  },
  "description": "brief description of the meal",
  "reasoning": "why this meal fits the user's needs"
}

Return ONLY the JSON array, no additional text or markdown formatting. Example format:
[{"name":"...","calories":...,"macros":{"carbs":...,"protein":...,"fat":...},"description":"...","reasoning":"..."},...]`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse JSON response - handle markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').replace(/```\n?$/g, '');
      }

      const recommendations = JSON.parse(jsonText) as MealRecommendation[];

      // Validate and return
      if (!Array.isArray(recommendations)) {
        throw new Error('Invalid response format: expected an array');
      }

      return recommendations.slice(0, 3).map(rec => ({
        name: rec.name || 'Unknown Meal',
        calories: Math.round(rec.calories || 0),
        macros: {
          carbs: Math.round(rec.macros?.carbs || 0),
          protein: Math.round(rec.macros?.protein || 0),
          fat: Math.round(rec.macros?.fat || 0),
        },
        description: rec.description || '',
        reasoning: rec.reasoning || '',
      }));
    } catch (error: any) {
      console.error('[GeminiService] Error generating meal recommendations:', error);
      if (error.message?.includes('JSON')) {
        throw new Error('Failed to parse AI response. Please try again.');
      }
      throw new Error(error.message || 'Failed to generate meal recommendations');
    }
  }
}
