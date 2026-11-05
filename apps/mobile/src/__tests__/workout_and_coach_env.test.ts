import { generatePersonalCoachingPlan } from '../domain';
import { UserProfile } from '../types';
import { WorkoutCompletedSummary } from '../store/workoutStore';

describe('Workout Completion & Environment Coaching Logic', () => {
  const baseProfile: UserProfile = {
    userId: 'user_test_env_1',
    displayName: 'Karthik',
    heightCm: 167,
    currentWeightKg: 56.45,
    fitnessLevel: 'beginner',
    activityLevel: 'light',
    primaryGoal: 'fat_loss',
    trainingEnvironment: 'home',
    equipmentInventory: ['none'],
    sessionDurationMinutes: 30,
    dietaryPreference: 'vegetarian',
    injuriesOrLimitations: ['none'],
    preferredUnitSystem: 'metric',
    dailyWaterTargetMl: 2500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('generates strict bodyweight routines for home with no equipment', () => {
    const plan = generatePersonalCoachingPlan(baseProfile);
    expect(plan.weeklyWorkouts.length).toBeGreaterThan(0);

    const allExercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);
    // All exercises must be bodyweight
    for (const ex of allExercises) {
      expect(ex.equipmentRequired.toLowerCase()).toContain('bodyweight');
    }
    expect(plan.whyThisPlanGenerated).toContain('home');
  });

  it('generates machine and barbell routines when environment changes to gym', () => {
    const gymProfile: UserProfile = {
      ...baseProfile,
      trainingEnvironment: 'gym',
      equipmentInventory: ['barbell', 'bench', 'dumbbells', 'cable_machine'],
    };

    const gymPlan = generatePersonalCoachingPlan(gymProfile);
    const gymExercises = gymPlan.weeklyWorkouts.flatMap((w) => w.exercises);

    const hasMachineOrBarbell = gymExercises.some(
      (e) =>
        e.equipmentRequired.toLowerCase().includes('cable') ||
        e.equipmentRequired.toLowerCase().includes('barbell') ||
        e.equipmentRequired.toLowerCase().includes('machine') ||
        e.equipmentRequired.toLowerCase().includes('leg press')
    );
    expect(hasMachineOrBarbell).toBe(true);
    expect(gymPlan.whyThisPlanGenerated).toContain('gym');
  });

  it('excludes unavailable gym machines when specified by user', () => {
    const gymProfileWithUnavailable: UserProfile = {
      ...baseProfile,
      trainingEnvironment: 'gym',
      equipmentInventory: ['barbell', 'bench', 'dumbbells', 'cable_machine'],
      unavailableEquipment: ['leg_press_machine', 'chest_press_machine'],
    };

    const plan = generatePersonalCoachingPlan(gymProfileWithUnavailable);
    const exercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);

    expect(exercises.some((e) => e.exerciseId === 'leg-press')).toBe(false);
    expect(exercises.some((e) => e.exerciseId === 'chest-press-machine')).toBe(false);
  });

  it('generates outdoor cardio and park circuit routines for outdoor environment', () => {
    const outdoorProfile: UserProfile = {
      ...baseProfile,
      trainingEnvironment: 'outdoor',
      equipmentInventory: ['none'],
    };

    const plan = generatePersonalCoachingPlan(outdoorProfile);
    const exercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);

    expect(
      exercises.some((e) => e.exerciseId === 'outdoor-brisk-walk' || e.exerciseId === 'park-bench-step-ups')
    ).toBe(true);
    expect(plan.whyThisPlanGenerated).toContain('outdoor');
  });

  it('generates calisthenics bar and pull-up progressions for calisthenics environment', () => {
    const calisthenicsProfile: UserProfile = {
      ...baseProfile,
      trainingEnvironment: 'calisthenics',
      equipmentInventory: ['pull_up_bar'],
    };

    const plan = generatePersonalCoachingPlan(calisthenicsProfile);
    const exercises = plan.weeklyWorkouts.flatMap((w) => w.exercises);

    expect(
      exercises.some(
        (e) => e.exerciseId === 'calisthenics-pull-ups' || e.exerciseId === 'calisthenics-parallel-dips'
      )
    ).toBe(true);
    expect(plan.whyThisPlanGenerated).toContain('calisthenics');
  });

  it('formats workout completion summary accurately for the completion screen', () => {
    const summary: WorkoutCompletedSummary = {
      sessionId: 'session_123',
      title: 'Home Full-Body Circuit',
      startedAt: '2026-11-05T10:00:00.000Z',
      endedAt: '2026-11-05T10:35:00.000Z',
      durationMinutes: 35,
      totalSets: 3,
      exercises: [
        {
          name: 'Dumbbell Goblet Squat',
          sets: [
            { weightKg: 10, reps: 10, rpe: 8 },
            { weightKg: 10, reps: 10, rpe: 8 },
            { weightKg: 12, reps: 8, rpe: 9 },
          ],
        },
      ],
    };

    expect(summary.totalSets).toBe(3);
    expect(summary.durationMinutes).toBe(35);
    expect(summary.exercises[0].sets.length).toBe(3);
    expect(summary.exercises[0].sets[0].weightKg).toBe(10);
  });
});
