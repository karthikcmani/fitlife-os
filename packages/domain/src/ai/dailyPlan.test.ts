import { generateDailyPlan } from './dailyPlan';
import { UserProfile } from '@fitlife/shared-types';

describe('FITLIFE OS — Daily Fitness Guide Engine Tests', () => {
  const mockProfile: UserProfile = {
    userId: 'user-test-1',
    displayName: 'Rahul',
    dateOfBirth: '1998-05-15',
    gender: 'male',
    heightCm: 175,
    currentWeightKg: 72,
    fitnessLevel: 'beginner',
    activityLevel: 'moderate',
    primaryGoal: 'fat_loss',
    trainingEnvironment: 'gym',
    availableTrainingDays: 3,
    preferredUnitSystem: 'metric',
    dailyWaterTargetMl: 2500,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  it('generates an encouraging, beginner-friendly workout plan for a training day', () => {
    const plan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 0,
        targetCalories: 2000,
        proteinConsumedG: 0,
        targetProteinG: 140,
        carbsConsumedG: 0,
        fatConsumedG: 0,
      },
      todayWaterMl: 0,
      hasWorkoutLoggedToday: false,
      consecutiveTrainingDays: 0,
      completedHabitsCount: 0,
      totalHabitsCount: 2,
    });

    expect(plan.greeting).toContain('Rahul');
    expect(plan.workout.isRestDay).toBe(false);
    expect(plan.workout.headline).toContain('Today is a Training Day');
    expect(plan.workout.whyThisIsSuggested).toBeDefined();
    expect(plan.workout.warmupTip).toBeDefined();
    expect(plan.workout.cooldownTip).toBeDefined();
  });

  it('suggests active recovery if user has already trained consecutive days or slept poorly', () => {
    const plan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 500,
        targetCalories: 2000,
        proteinConsumedG: 30,
        targetProteinG: 140,
        carbsConsumedG: 60,
        fatConsumedG: 15,
      },
      todayWaterMl: 500,
      hasWorkoutLoggedToday: false,
      consecutiveTrainingDays: 2, // Trained 2 days in a row!
      recentSleepDurationMinutes: 280, // Poor sleep (<5 hours)
      completedHabitsCount: 1,
      totalHabitsCount: 2,
    });

    expect(plan.workout.isRestDay).toBe(true);
    expect(plan.workout.headline).toContain('Active Recovery');
    expect(plan.workout.whyThisIsSuggested).toContain('burnout');
  });

  it('generates clear, conversational nutrition advice with Indian food ideas', () => {
    const plan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 600,
        targetCalories: 2100,
        proteinConsumedG: 35,
        targetProteinG: 140,
        carbsConsumedG: 70,
        fatConsumedG: 20,
      },
      todayWaterMl: 750,
      hasWorkoutLoggedToday: true,
      consecutiveTrainingDays: 1,
      completedHabitsCount: 1,
      totalHabitsCount: 2,
    });

    expect(plan.nutrition.conversationalSummary).toContain('600 kcal so far');
    expect(plan.nutrition.mealSuggestion).toMatch(/dal|curd|eggs|paneer|chicken|fish/i);
    expect(plan.nutrition.whyThisIsSuggested).toBeDefined();
  });

  it('generates practical hydration drinking schedule and reminders', () => {
    const plan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 1200,
        targetCalories: 2000,
        proteinConsumedG: 80,
        targetProteinG: 140,
        carbsConsumedG: 120,
        fatConsumedG: 40,
      },
      todayWaterMl: 500,
      hasWorkoutLoggedToday: false,
      consecutiveTrainingDays: 0,
      completedHabitsCount: 0,
      totalHabitsCount: 1,
    });

    expect(plan.hydration.conversationalStatus).toContain('0.5L');
    expect(plan.hydration.whyThisIsSuggested).toBeDefined();
  });

  it('adjusts hydration and habit guidance based on the time of day', () => {
    // 1. Morning (8 AM)
    const morningPlan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 0,
        targetCalories: 2000,
        proteinConsumedG: 0,
        targetProteinG: 140,
        carbsConsumedG: 0,
        fatConsumedG: 0,
      },
      todayWaterMl: 0,
      hasWorkoutLoggedToday: false,
      consecutiveTrainingDays: 0,
      completedHabitsCount: 0,
      totalHabitsCount: 1,
      currentHour: 8,
    });
    expect(morningPlan.hydration.headline).toContain('Morning Hydration');
    expect(morningPlan.habitFocus.title).toContain('Morning Habit');

    // 2. Evening (7:31 PM = 19)
    const eveningPlan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 1400,
        targetCalories: 2000,
        proteinConsumedG: 90,
        targetProteinG: 140,
        carbsConsumedG: 150,
        fatConsumedG: 45,
      },
      todayWaterMl: 1200,
      hasWorkoutLoggedToday: false,
      consecutiveTrainingDays: 0,
      completedHabitsCount: 0,
      totalHabitsCount: 1,
      currentHour: 19,
    });
    expect(eveningPlan.hydration.headline).toContain('Evening Hydration');
    expect(eveningPlan.hydration.suggestedSchedule).toContain('taper off');
    expect(eveningPlan.habitFocus.title).toContain('Evening Habit');

    // 3. Night (10:30 PM = 22)
    const nightPlan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 1900,
        targetCalories: 2000,
        proteinConsumedG: 130,
        targetProteinG: 140,
        carbsConsumedG: 200,
        fatConsumedG: 50,
      },
      todayWaterMl: 1500,
      hasWorkoutLoggedToday: true,
      consecutiveTrainingDays: 1,
      completedHabitsCount: 0,
      totalHabitsCount: 1,
      currentHour: 22,
    });
    expect(nightPlan.hydration.headline).toContain('Nighttime Hydration');
    expect(nightPlan.hydration.conversationalStatus).toContain('Avoid forcing large amounts of water near bedtime');
    expect(nightPlan.habitFocus.title).toContain('Night Habit');
  });

  it('correctly distinguishes workout in progress from completed workout', () => {
    const inProgressPlan = generateDailyPlan({
      profile: mockProfile,
      nutrition: {
        caloriesConsumed: 0,
        targetCalories: 2000,
        proteinConsumedG: 0,
        targetProteinG: 140,
        carbsConsumedG: 0,
        fatConsumedG: 0,
      },
      todayWaterMl: 500,
      hasWorkoutLoggedToday: false,
      isWorkoutInProgress: true,
      consecutiveTrainingDays: 0,
      completedHabitsCount: 0,
      totalHabitsCount: 1,
    });
    expect(inProgressPlan.workout.headline).toContain('Workout In Progress');
    expect(inProgressPlan.workout.actionText).toContain('Resume Active Workout');
    expect(inProgressPlan.nextBestAction.title).toContain('Resume Active Workout');
  });
});
