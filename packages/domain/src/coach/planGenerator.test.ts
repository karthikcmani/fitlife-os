import { generatePersonalCoachingPlan } from './planGenerator';
import { UserProfile } from '@fitlife/shared-types';

describe('FITLIFE OS — Personal Coaching Plan Generator', () => {
  const baseProfile: UserProfile = {
    userId: 'user_coach_1',
    displayName: 'Aarav',
    dateOfBirth: '1996-08-20',
    gender: 'male',
    heightCm: 175,
    currentWeightKg: 75,
    fitnessLevel: 'beginner',
    activityLevel: 'moderate',
    primaryGoal: 'fat_loss',
    trainingEnvironment: 'home',
    availableTrainingDays: 3,
    sessionDurationMinutes: 30,
    equipmentInventory: ['none'],
    dietaryPreference: 'vegetarian',
    injuriesOrLimitations: ['none'],
    preferredUnitSystem: 'metric',
    dailyWaterTargetMl: 3000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('generates a strict bodyweight-only plan for home with no equipment', () => {
    const plan = generatePersonalCoachingPlan(baseProfile);

    expect(plan.weeklyWorkouts.length).toBe(3);
    for (const routine of plan.weeklyWorkouts) {
      expect(routine.exercises.length).toBeGreaterThanOrEqual(3);
      for (const ex of routine.exercises) {
        expect(ex.equipmentRequired.toLowerCase()).toContain('bodyweight');
        expect(ex.breathingGuidance).toBeDefined();
        expect(ex.instructions.length).toBeGreaterThan(0);
        expect(ex.commonMistakes.length).toBeGreaterThan(0);
      }
    }
  });

  it('includes dumbbell exercises when dumbbells are in equipment inventory', () => {
    const dumbbellProfile: UserProfile = {
      ...baseProfile,
      equipmentInventory: ['dumbbells'],
      primaryGoal: 'muscle_gain',
    };

    const plan = generatePersonalCoachingPlan(dumbbellProfile);
    const allExercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);
    const hasDumbbellEx = allExercises.some((ex: any) =>
      ex.name.toLowerCase().includes('dumbbell')
    );
    expect(hasDumbbellEx).toBe(true);
  });

  it('excludes contraindicated exercises when physical limitations are present', () => {
    const kneePainProfile: UserProfile = {
      ...baseProfile,
      equipmentInventory: ['none'],
      injuriesOrLimitations: ['knee_pain'],
    };

    const plan = generatePersonalCoachingPlan(kneePainProfile);
    const allExercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);
    const hasLunge = allExercises.some((ex: any) =>
      ex.name.toLowerCase().includes('lunge')
    );
    expect(hasLunge).toBe(false);
  });

  it('generates tailored daily meals with familiar Indian portions', () => {
    const plan = generatePersonalCoachingPlan(baseProfile);

    expect(plan.dailyMeals.length).toBe(4); // Breakfast, Lunch, Snack, Dinner
    const breakfast = plan.dailyMeals.find((m: any) => m.mealType === 'breakfast');
    const lunch = plan.dailyMeals.find((m: any) => m.mealType === 'lunch');

    expect(breakfast).toBeDefined();
    expect(breakfast?.isVegetarian).toBe(true);
    expect(lunch).toBeDefined();
    expect(lunch?.portionGuide).toBeDefined();
  });

  it('provides non-vegetarian Kerala meals when user selects non_vegetarian', () => {
    const nonVegProfile: UserProfile = {
      ...baseProfile,
      dietaryPreference: 'non_vegetarian',
    };

    const plan = generatePersonalCoachingPlan(nonVegProfile);
    const lunch = plan.dailyMeals.find((m: any) => m.mealType === 'lunch');
    expect(lunch?.portionGuide.toLowerCase()).toMatch(/fish|chicken/);
  });
});
