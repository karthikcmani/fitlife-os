import { create } from 'zustand';
import { PersonalCoachingPlan, UserProfile, EquipmentItem, PlanMealSuggestion } from '../types/user';
import { getLocalDatabase } from '../db/sqlite';
import { generatePersonalCoachingPlan } from '../domain';
import { useAuthStore } from './authStore';
import { useNutritionStore } from './nutritionStore';

interface CoachState {
  activePlan: PersonalCoachingPlan | null;
  isLoading: boolean;
  activeExerciseIndex: number;
  isRestTimerActive: boolean;
  restTimerSecondsLeft: number;

  // Actions
  loadActivePlan: (userId: string) => Promise<void>;
  generateAndSetPlan: (profile: UserProfile) => Promise<PersonalCoachingPlan>;
  saveAndActivatePlan: (plan: PersonalCoachingPlan) => Promise<void>;
  updateEquipmentAndRegenerate: (equipment: EquipmentItem[]) => Promise<void>;
  logPlanMealAsEaten: (meal: PlanMealSuggestion, userId: string) => Promise<void>;
  setActiveExerciseIndex: (idx: number) => void;
  startRestTimer: (seconds: number) => void;
  stopRestTimer: () => void;
  decrementRestTimer: () => void;
}

export const useCoachStore = create<CoachState>((set, get) => ({
  activePlan: null,
  isLoading: false,
  activeExerciseIndex: 0,
  isRestTimerActive: false,
  restTimerSecondsLeft: 0,

  loadActivePlan: async (userId: string) => {
    set({ isLoading: true });
    try {
      const db = await getLocalDatabase();
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM coaching_plans WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1;`,
        [userId]
      );

      if (row) {
        const plan: PersonalCoachingPlan = {
          id: row.id,
          userId: row.user_id,
          createdAt: row.created_at,
          primaryGoal: row.primary_goal as any,
          goalTitle: row.goal_title,
          baselineSummary: row.baseline_summary,
          weeklyWorkouts: JSON.parse(row.weekly_workouts),
          dailyMeals: JSON.parse(row.daily_meals),
          dailyWaterTargetMl: row.daily_water_target_ml,
          progressionMilestones: JSON.parse(row.progression_milestones),
          whyThisPlanGenerated: row.why_plan,
        };
        set({ activePlan: plan, isLoading: false });
      } else {
        // Fallback: If profile exists, generate an initial plan
        const profile = useAuthStore.getState().profile;
        if (profile) {
          const generated = generatePersonalCoachingPlan(profile);
          await get().saveAndActivatePlan(generated);
        } else {
          set({ activePlan: null, isLoading: false });
        }
      }
    } catch {
      set({ isLoading: false });
    }
  },

  generateAndSetPlan: async (profile: UserProfile) => {
    set({ isLoading: true });
    const plan = generatePersonalCoachingPlan(profile);
    set({ activePlan: plan, isLoading: false });
    return plan;
  },

  saveAndActivatePlan: async (plan: PersonalCoachingPlan) => {
    set({ isLoading: true });
    const db = await getLocalDatabase();
    // 1. Deactivate older plans for this user
    await db.runAsync(
      `UPDATE coaching_plans SET is_active = 0 WHERE user_id = ?;`,
      [plan.userId]
    );

    // 2. Insert new active plan
    await db.runAsync(
      `INSERT INTO coaching_plans
      (id, user_id, primary_goal, goal_title, baseline_summary, weekly_workouts, daily_meals, daily_water_target_ml, progression_milestones, why_plan, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      [
        plan.id,
        plan.userId,
        plan.primaryGoal,
        plan.goalTitle,
        plan.baselineSummary,
        JSON.stringify(plan.weeklyWorkouts),
        JSON.stringify(plan.dailyMeals),
        plan.dailyWaterTargetMl,
        JSON.stringify(plan.progressionMilestones),
        plan.whyThisPlanGenerated,
        plan.createdAt,
        new Date().toISOString(),
      ]
    );

    set({ activePlan: plan, isLoading: false });
  },

  updateEquipmentAndRegenerate: async (equipment: EquipmentItem[]) => {
    const { profile, setProfile } = useAuthStore.getState();
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      equipmentInventory: equipment,
      updatedAt: new Date().toISOString(),
    };

    await setProfile(updatedProfile);
    const newPlan = generatePersonalCoachingPlan(updatedProfile);
    await get().saveAndActivatePlan(newPlan);
  },

  logPlanMealAsEaten: async (meal: PlanMealSuggestion, userId: string) => {
    const { logQuickMeal } = useNutritionStore.getState();
    const today = new Date().toISOString().substring(0, 10);
    const approxCarbs = Math.round(((meal.approxCalories - meal.approxProteinG * 4) * 0.6) / 4);
    const approxFat = Math.round(((meal.approxCalories - meal.approxProteinG * 4) * 0.4) / 9);

    await logQuickMeal({
      userId,
      mealType: meal.mealType,
      title: meal.title,
      calories: meal.approxCalories,
      proteinG: meal.approxProteinG,
      carbsG: approxCarbs,
      fatG: approxFat,
      dateStr: today,
    });
  },

  setActiveExerciseIndex: (idx: number) => set({ activeExerciseIndex: idx }),

  startRestTimer: (seconds: number) => {
    set({ isRestTimerActive: true, restTimerSecondsLeft: seconds });
  },

  stopRestTimer: () => {
    set({ isRestTimerActive: false, restTimerSecondsLeft: 0 });
  },

  decrementRestTimer: () => {
    const current = get().restTimerSecondsLeft;
    if (current <= 1) {
      set({ isRestTimerActive: false, restTimerSecondsLeft: 0 });
    } else {
      set({ restTimerSecondsLeft: current - 1 });
    }
  },
}));
