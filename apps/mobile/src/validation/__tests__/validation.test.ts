import {
  registerSchema,
  loginSchema,
  profileSetupSchema,
  workoutSessionSchema,
  workoutSetSchema,
  foodSchema,
  syncPushBatchRequestSchema,
  hydrationLogSchema,
} from '../index';

describe('Validation Schemas Unit Tests', () => {
  describe('Auth Schemas', () => {
    it('validates a valid registration payload', () => {
      const valid = {
        username: 'johndoe',
        email: 'user@example.com',
        password: 'Password123!',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid email and short password', () => {
      const invalid = {
        username: 'jd',
        email: 'not-an-email',
        password: '123',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates login payload', () => {
      const valid = {
        emailOrUsername: 'test@fitlife.org',
        password: 'ValidPassword123!',
      };
      expect(loginSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('User Profile Setup Schema', () => {
    it('validates a complete user profile setup', () => {
      const profile = {
        displayName: 'John Doe',
        gender: 'male',
        heightCm: 178,
        currentWeightKg: 75.5,
        fitnessLevel: 'intermediate',
        activityLevel: 'moderate',
        primaryGoal: 'fat_loss',
        trainingEnvironment: 'gym',
        preferredUnitSystem: 'metric',
        dailyWaterTargetMl: 3000,
      };
      const result = profileSetupSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    it('rejects invalid physiological boundaries', () => {
      const invalid = {
        displayName: 'J',
        heightCm: 350,
        currentWeightKg: 10,
        fitnessLevel: 'unknown',
        activityLevel: 'unknown',
        primaryGoal: 'unknown',
      };
      const result = profileSetupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Workout Schemas', () => {
    it('validates a workout session payload', () => {
      const session = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Upper Body Hypertrophy',
        startedAt: new Date().toISOString(),
        clientCreatedAt: new Date().toISOString(),
        clientUpdatedAt: new Date().toISOString(),
      };
      const result = workoutSessionSchema.safeParse(session);
      expect(result.success).toBe(true);
    });

    it('validates workout set with RPE and weight', () => {
      const set = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        workoutSessionId: '123e4567-e89b-12d3-a456-426614174000',
        exerciseId: 'ex_bench_press',
        setIndex: 0,
        setType: 'standard',
        weightKg: 80,
        reps: 8,
        rpe: 8.5,
        isCompleted: true,
      };
      const result = workoutSetSchema.safeParse(set);
      expect(result.success).toBe(true);
    });
  });

  describe('Nutrition and Vitals Schemas', () => {
    it('validates food items', () => {
      const food = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        name: 'Rolled Oats',
        region: 'global',
        servingUnitName: 'g',
        servingSizeG: 100,
        calories: 389,
        proteinG: 16.9,
        carbsG: 66.3,
        fatG: 6.9,
        fiberG: 10.6,
        dataSource: 'USDA_CC0',
        isVerified: true,
      };
      const result = foodSchema.safeParse(food);
      expect(result.success).toBe(true);
    });

    it('validates hydration logs', () => {
      const hydration = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        userId: '123e4567-e89b-12d3-a456-426614174001',
        amountMl: 500,
        loggedAt: new Date().toISOString(),
        clientCreatedAt: new Date().toISOString(),
      };
      const result = hydrationLogSchema.safeParse(hydration);
      expect(result.success).toBe(true);
    });
  });

  describe('Sync Schemas', () => {
    it('validates sync push request payload', () => {
      const pushReq = {
        batchId: '123e4567-e89b-12d3-a456-426614174006',
        clientHlc: {
          physicalTimeMs: 1741000000000,
          logicalCounter: 1,
        },
        mutations: [
          {
            clientQueueId: 1,
            entityType: 'workout_sessions',
            entityId: '123e4567-e89b-12d3-a456-426614174008',
            operation: 'INSERT',
            payload: { title: 'Morning Run' },
            hlc: {
              physicalTimeMs: 1741000000000,
              logicalCounter: 1,
            },
          },
        ],
      };
      const result = syncPushBatchRequestSchema.safeParse(pushReq);
      expect(result.success).toBe(true);
    });
  });
});
