import { z } from 'zod';

export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack']);

export const foodDataSourceSchema = z.enum([
  'OFF_VERIFIED',
  'USDA_CC0',
  'COMMUNITY_RECIPE',
  'USER_CUSTOM',
]);

export const foodSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  brand: z.string().max(128).optional(),
  region: z.enum(['indian_south', 'indian_north', 'global']).default('global'),
  servingSizeG: z.number().positive(),
  servingUnitName: z.string().min(1).max(32).default('g'),
  calories: z.number().min(0).max(5000),
  proteinG: z.number().min(0).max(500),
  carbsG: z.number().min(0).max(1000),
  fatG: z.number().min(0).max(500),
  fiberG: z.number().min(0).max(200).default(0),
  dataSource: foodDataSourceSchema.default('USER_CUSTOM'),
  isVerified: z.boolean().default(false),
});

export const mealItemSchema = z.object({
  id: z.string().uuid(),
  mealId: z.string().uuid(),
  foodId: z.string().uuid(),
  servings: z.number().positive().default(1.0),
  gramsConsumed: z.number().positive(),
  calculatedCalories: z.number().min(0),
  calculatedProteinG: z.number().min(0),
  calculatedCarbsG: z.number().min(0),
  calculatedFatG: z.number().min(0),
});

export const mealSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  mealType: mealTypeSchema,
  loggedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  clientCreatedAt: z.string().datetime(),
  isDeleted: z.boolean().default(false),
});
