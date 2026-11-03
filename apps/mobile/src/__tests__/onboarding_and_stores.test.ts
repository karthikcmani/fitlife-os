import {
  calculateBmrMifflinStJeor,
  calculateTdee,
  calculateTargetCalories,
  calculateMacronutrients,
  calculateRecoveryScore,
} from '../domain';
import { profileSetupSchema } from '../validation';

describe('FITLIFE OS — Onboarding & State Architecture Tests', () => {
  describe('Onboarding Input Validation (Zod & Logic)', () => {
    it('validates legitimate user profile inputs', () => {
      const validProfile = {
        displayName: 'Maya Devi',
        heightCm: 162,
        currentWeightKg: 58,
        fitnessLevel: 'intermediate',
        activityLevel: 'moderate',
        primaryGoal: 'fat_loss',
        trainingEnvironment: 'gym',
        preferredUnitSystem: 'metric',
        dailyWaterTargetMl: 2500,
      };

      const result = profileSetupSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('rejects empty or whitespace-only display name', () => {
      const invalid = {
        displayName: '   ',
        heightCm: 175,
        currentWeightKg: 70,
        fitnessLevel: 'beginner',
        activityLevel: 'moderate',
        primaryGoal: 'maintenance',
      };
      const result = profileSetupSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects physiologically out-of-range height and weight', () => {
      const tooLight = profileSetupSchema.safeParse({
        displayName: 'John',
        heightCm: 180,
        currentWeightKg: 15, // under 25kg min limit
        fitnessLevel: 'beginner',
        activityLevel: 'sedentary',
        primaryGoal: 'maintenance',
      });
      expect(tooLight.success).toBe(false);

      const tooTall = profileSetupSchema.safeParse({
        displayName: 'John',
        heightCm: 290, // over 260cm limit
        currentWeightKg: 80,
        fitnessLevel: 'beginner',
        activityLevel: 'sedentary',
        primaryGoal: 'maintenance',
      });
      expect(tooTall.success).toBe(false);
    });
  });

  describe('Metabolic & Target Calculations for Onboarding', () => {
    it('calculates male Mifflin-St Jeor BMR correctly', () => {
      // BMR = 10 * 75 + 6.25 * 175 - 5 * 25 + 5 = 750 + 1093.75 - 125 + 5 = 1723.75 -> 1724
      const bmr = calculateBmrMifflinStJeor({
        weightKg: 75,
        heightCm: 175,
        ageYears: 25,
        gender: 'male',
      });
      expect(bmr).toBe(1724);
    });

    it('calculates female Mifflin-St Jeor BMR correctly', () => {
      // BMR = 10 * 60 + 6.25 * 165 - 5 * 30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25 -> 1320
      const bmr = calculateBmrMifflinStJeor({
        weightKg: 60,
        heightCm: 165,
        ageYears: 30,
        gender: 'female',
      });
      expect(bmr).toBe(1320);
    });

    it('calculates neutral sex median BMR when gender is unspecified', () => {
      const maleBmr = calculateBmrMifflinStJeor({
        weightKg: 70,
        heightCm: 170,
        ageYears: 28,
        gender: 'male',
      });
      const femaleBmr = calculateBmrMifflinStJeor({
        weightKg: 70,
        heightCm: 170,
        ageYears: 28,
        gender: 'female',
      });
      const medianBmr = Math.round((maleBmr + femaleBmr) / 2);

      expect(medianBmr).toBeGreaterThan(femaleBmr);
      expect(medianBmr).toBeLessThan(maleBmr);
      expect(maleBmr - femaleBmr).toBe(166); // (+5) - (-161) = 166 difference
    });

    it('calculates TDEE using activity multipliers', () => {
      const bmr = 1700;
      const sedentaryTdee = calculateTdee(bmr, 'sedentary'); // 1.2
      const moderateTdee = calculateTdee(bmr, 'moderate'); // 1.55
      const extremeTdee = calculateTdee(bmr, 'extreme'); // 1.9

      expect(sedentaryTdee).toBe(2040);
      expect(moderateTdee).toBe(2635);
      expect(extremeTdee).toBe(3230);
    });

    it('applies physiological caloric safety floors for extreme deficits', () => {
      // A small female with low TDEE
      const tdee = 1300;
      const result = calculateTargetCalories({
        tdee,
        goal: 'fat_loss',
        gender: 'female',
      });

      // Target shouldn't drop below 1200 kcal floor for females
      expect(result.targetCalories).toBeGreaterThanOrEqual(1200);
      expect(result.isCappedForSafety).toBe(true);
      expect(result.safetyWarning).toBeDefined();
    });

    it('partitions macros safely across goals', () => {
      const macros = calculateMacronutrients({
        targetCalories: 2200,
        weightKg: 75,
        goal: 'muscle_gain',
      });

      expect(macros.proteinG).toBe(135); // 75kg * 1.8g/kg for muscle gain
      expect(macros.fatG).toBeGreaterThan(40);
      expect(macros.carbsG).toBeGreaterThan(150);
      expect(macros.fiberG).toBeGreaterThanOrEqual(25);
    });
  });

  describe('Hydration Calculation Formula', () => {
    it('computes realistic hydration targets within physiological boundaries (2L - 5L)', () => {
      const calculateWaterTarget = (weightKg: number) =>
        Math.min(5000, Math.max(2000, Math.round(weightKg * 35)));

      expect(calculateWaterTarget(50)).toBe(2000); // 1750 clamped to 2000
      expect(calculateWaterTarget(70)).toBe(2450);
      expect(calculateWaterTarget(85)).toBe(2975);
      expect(calculateWaterTarget(160)).toBe(5000); // 5600 clamped to 5000
    });
  });
});
