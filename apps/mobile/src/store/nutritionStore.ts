import { create } from 'zustand';
import { Food, Meal, MealType } from '../types';
import { getLocalDatabase } from '../db/sqlite';
import { SyncManager } from '../services/syncManager';

interface NutritionState {
  searchResults: Food[];
  todayMeals: Meal[];
  dailyTotals: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  isLoading: boolean;

  // Actions
  searchFoods: (query: string) => Promise<void>;
  loadTodayNutrition: (userId: string, dateStr: string) => Promise<void>;
  logMealItem: (params: {
    userId: string;
    mealType: MealType;
    food: Food;
    servings: number;
    dateStr: string;
  }) => Promise<void>;
  logQuickMeal: (params: {
    userId: string;
    mealType: MealType;
    title: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    dateStr: string;
  }) => Promise<void>;
}

export const useNutritionStore = create<NutritionState>((set, get) => ({
  searchResults: [],
  todayMeals: [],
  dailyTotals: {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
  },
  isLoading: false,

  searchFoods: async (query) => {
    if (!query || query.trim().length === 0) {
      set({ searchResults: [] });
      return;
    }

    set({ isLoading: true });
    const db = await getLocalDatabase();

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM foods WHERE name LIKE ? OR brand LIKE ? ORDER BY is_verified DESC, name ASC LIMIT 30;`,
      [`%${query.trim()}%`, `%${query.trim()}%`]
    );

    set({
      searchResults: rows.map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        region: r.region,
        servingSizeG: r.serving_size_g,
        servingUnitName: r.serving_unit_name,
        calories: r.calories,
        proteinG: r.protein_g,
        carbsG: r.carbs_g,
        fatG: r.fat_g,
        fiberG: r.fiber_g,
        dataSource: r.data_source,
        isVerified: Boolean(r.is_verified),
        createdAt: r.created_at,
      })),
      isLoading: false,
    });
  },

  loadTodayNutrition: async (userId, dateStr) => {
    const db = await getLocalDatabase();

    const mealsRows = await db.getAllAsync<any>(
      `SELECT * FROM meals WHERE user_id = ? AND logged_date = ? AND is_deleted = 0;`,
      [userId, dateStr]
    );

    const meals: Meal[] = [];
    let totCal = 0;
    let totP = 0;
    let totC = 0;
    let totF = 0;
    let totFib = 0;

    for (const m of mealsRows) {
      const items = await db.getAllAsync<any>(
        `SELECT mi.*, f.name as food_name, f.fiber_g as food_fiber FROM meal_items mi 
         JOIN foods f ON mi.food_id = f.id WHERE mi.meal_id = ?;`,
        [m.id]
      );

      for (const it of items) {
        totCal += it.calculated_calories;
        totP += it.calculated_protein_g;
        totC += it.calculated_carbs_g;
        totF += it.calculated_fat_g;
        totFib += (it.food_fiber ?? 0) * it.servings;
      }

      meals.push({
        id: m.id,
        userId: m.user_id,
        mealType: m.meal_type,
        loggedDate: m.logged_date,
        clientCreatedAt: m.client_created_at,
        isDeleted: Boolean(m.is_deleted),
        items: items.map((it) => ({
          id: it.id,
          mealId: it.meal_id,
          foodId: it.food_id,
          foodName: it.food_name,
          servings: it.servings,
          gramsConsumed: it.grams_consumed,
          calculatedCalories: it.calculated_calories,
          calculatedProteinG: it.calculated_protein_g,
          calculatedCarbsG: it.calculated_carbs_g,
          calculatedFatG: it.calculated_fat_g,
        })),
      });
    }

    set({
      todayMeals: meals,
      dailyTotals: {
        calories: Math.round(totCal),
        proteinG: Math.round(totP * 10) / 10,
        carbsG: Math.round(totC * 10) / 10,
        fatG: Math.round(totF * 10) / 10,
        fiberG: Math.round(totFib * 10) / 10,
      },
    });
  },

  logMealItem: async ({ userId, mealType, food, servings, dateStr }) => {
    const db = await getLocalDatabase();

    // Check if meal already exists for this type & date
    let meal = await db.getFirstAsync<any>(
      `SELECT id FROM meals WHERE user_id = ? AND logged_date = ? AND meal_type = ? AND is_deleted = 0;`,
      [userId, dateStr, mealType]
    );

    const now = new Date().toISOString();
    let mealId = meal?.id;

    if (!mealId) {
      mealId = `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.runAsync(
        `INSERT INTO meals (id, user_id, meal_type, logged_date, client_created_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, 0);`,
        [mealId, userId, mealType, dateStr, now]
      );

      await SyncManager.enqueueMutation('meals', mealId, 'INSERT', {
        mealType,
        loggedDate: dateStr,
        clientCreatedAt: now,
      });
    }

    const itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const gramsConsumed = Math.round(food.servingSizeG * servings * 10) / 10;
    const calcCalories = Math.round(food.calories * servings * 10) / 10;
    const calcProtein = Math.round(food.proteinG * servings * 10) / 10;
    const calcCarbs = Math.round(food.carbsG * servings * 10) / 10;
    const calcFat = Math.round(food.fatG * servings * 10) / 10;

    await db.runAsync(
      `INSERT INTO meal_items (id, meal_id, food_id, servings, grams_consumed, calculated_calories, calculated_protein_g, calculated_carbs_g, calculated_fat_g)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [itemId, mealId, food.id, servings, gramsConsumed, calcCalories, calcProtein, calcCarbs, calcFat]
    );

    await SyncManager.enqueueMutation('meal_items', itemId, 'INSERT', {
      mealId,
      foodId: food.id,
      servings,
      gramsConsumed,
      calculatedCalories: calcCalories,
      calculatedProteinG: calcProtein,
      calculatedCarbsG: calcCarbs,
      calculatedFatG: calcFat,
    });

    await get().loadTodayNutrition(userId, dateStr);
  },

  logQuickMeal: async ({ userId, mealType, title, calories, proteinG, carbsG, fatG, dateStr }) => {
    const db = await getLocalDatabase();
    const now = new Date().toISOString();

    let meal = await db.getFirstAsync<any>(
      `SELECT id FROM meals WHERE user_id = ? AND logged_date = ? AND meal_type = ? AND is_deleted = 0;`,
      [userId, dateStr, mealType]
    );

    let mealId = meal?.id;
    if (!mealId) {
      mealId = `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.runAsync(
        `INSERT INTO meals (id, user_id, meal_type, logged_date, client_created_at, is_deleted)
         VALUES (?, ?, ?, ?, ?, 0);`,
        [mealId, userId, mealType, dateStr, now]
      );
    }

    // Check if food exists, or insert placeholder
    const foodId = `food-quick-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    await db.runAsync(
      `INSERT OR IGNORE INTO foods (id, name, serving_size_g, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, is_verified, created_at, updated_at)
       VALUES (?, ?, 100, 'portion', ?, ?, ?, ?, 2, 1, ?, ?);`,
      [foodId, title, calories, proteinG, carbsG, fatG, now, now]
    );

    const itemId = `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.runAsync(
      `INSERT INTO meal_items (id, meal_id, food_id, servings, grams_consumed, calculated_calories, calculated_protein_g, calculated_carbs_g, calculated_fat_g)
       VALUES (?, ?, ?, 1, 100, ?, ?, ?, ?);`,
      [itemId, mealId, foodId, calories, proteinG, carbsG, fatG]
    );

    await get().loadTodayNutrition(userId, dateStr);
  },
}));
