import { generatePersonalCoachingPlan, getEligibleExercises } from './planGenerator';
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
        // Ensure no machines or barbells
        expect(ex.category).not.toBe('machine');
        expect(ex.category).not.toBe('barbell');
      }
    }
  });

  it('includes dumbbell exercises when dumbbells are in equipment inventory at home', () => {
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

  it('generates a genuinely different plan for Gym vs Home', () => {
    const homePlan = generatePersonalCoachingPlan(baseProfile);
    const gymPlan = generatePersonalCoachingPlan({
      ...baseProfile,
      trainingEnvironment: 'gym',
      equipmentInventory: ['barbell', 'dumbbells', 'bench'],
    });

    const homeExercises = homePlan.weeklyWorkouts.flatMap((w) => w.exercises).map((e) => e.exerciseId);
    const gymExercises = gymPlan.weeklyWorkouts.flatMap((w) => w.exercises).map((e) => e.exerciseId);

    // Gym plan must contain machine or barbell exercises
    const gymCategories = gymPlan.weeklyWorkouts.flatMap((w) => w.exercises).map((e) => e.category);
    expect(gymCategories.some((cat) => cat === 'machine' || cat === 'barbell')).toBe(true);

    // Home plan must NOT contain any machine or barbell
    const homeCategories = homePlan.weeklyWorkouts.flatMap((w) => w.exercises).map((e) => e.category);
    expect(homeCategories.every((cat) => cat === 'bodyweight')).toBe(true);

    // The exercise ID lists must be genuinely different
    expect(homeExercises).not.toEqual(gymExercises);
    expect(gymPlan.whyThisPlanGenerated.toLowerCase()).toContain('gym');
  });

  it('switching Gym -> Home removes all machine and barbell exercises', () => {
    const gymProfile: UserProfile = {
      ...baseProfile,
      trainingEnvironment: 'gym',
    };
    const gymPlan = generatePersonalCoachingPlan(gymProfile);
    expect(gymPlan.weeklyWorkouts.flatMap((w) => w.exercises).some((e) => e.category === 'machine')).toBe(true);

    // Switch to Home
    const switchedHomeProfile: UserProfile = {
      ...gymProfile,
      trainingEnvironment: 'home',
      equipmentInventory: ['none'],
    };
    const homePlan = generatePersonalCoachingPlan(switchedHomeProfile);
    const homeExercises = homePlan.weeklyWorkouts.flatMap((w) => w.exercises);

    // Absolutely zero machine or barbell exercises
    expect(homeExercises.some((e) => e.category === 'machine')).toBe(false);
    expect(homeExercises.some((e) => e.category === 'barbell')).toBe(false);
    expect(homePlan.whyThisPlanGenerated.toLowerCase()).toContain('bodyweight movements only');
  });

  it('avoids explicitly unavailable gym machines when specified', () => {
    const eligibleWithAll = getEligibleExercises('gym', ['barbell'], [], []);
    expect(eligibleWithAll.some((e) => e.id === 'leg-press')).toBe(true);

    // Mark leg_press_machine as unavailable
    const eligibleWithoutLegPress = getEligibleExercises('gym', ['barbell'], [], ['leg_press_machine']);
    expect(eligibleWithoutLegPress.some((e) => e.id === 'leg-press')).toBe(false);
  });

  it('generates outdoor cardio and park circuit exercises for Outdoor environment', () => {
    const outdoorProfile: UserProfile = {
      ...baseProfile,
      trainingEnvironment: 'outdoor',
    };

    const plan = generatePersonalCoachingPlan(outdoorProfile);
    const allExercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);
    const hasOutdoor = allExercises.some((e) => e.category === 'outdoor');
    expect(hasOutdoor).toBe(true);
    expect(plan.whyThisPlanGenerated.toLowerCase()).toContain('outdoor');
  });

  it('generates pull-up bar and bodyweight progressions for Calisthenics environment', () => {
    const calisthenicsProfile: UserProfile = {
      ...baseProfile,
      trainingEnvironment: 'calisthenics',
      equipmentInventory: ['pull_up_bar'],
    };

    const plan = generatePersonalCoachingPlan(calisthenicsProfile);
    const allExercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);
    const hasCalisthenics = allExercises.some((e) => e.category === 'calisthenics');
    expect(hasCalisthenics).toBe(true);
    expect(plan.whyThisPlanGenerated.toLowerCase()).toContain('calisthenics');
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

    expect(plan.dailyMeals.length).toBe(4);
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
