export type FoodDataSource =
  | 'OFF_VERIFIED'
  | 'USDA_CC0'
  | 'COMMUNITY_RECIPE'
  | 'USER_CUSTOM';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Food {
  id: string;
  name: string;
  brand?: string;
  region: 'indian_south' | 'indian_north' | 'global';
  servingSizeG: number;
  servingUnitName: string; // 'g', 'katori', 'roti', 'cup', 'piece'
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  dataSource: FoodDataSource;
  isVerified: boolean;
  createdByUserId?: string;
  createdAt: string;
}

export interface MealItem {
  id: string;
  mealId: string;
  foodId: string;
  foodName?: string;
  servings: number;
  gramsConsumed: number;
  calculatedCalories: number;
  calculatedProteinG: number;
  calculatedCarbsG: number;
  calculatedFatG: number;
}

export interface Meal {
  id: string;
  userId: string;
  mealType: MealType;
  loggedDate: string; // YYYY-MM-DD
  clientCreatedAt: string;
  isDeleted: boolean;
  items: MealItem[];
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  targetFiberG: number;
}
