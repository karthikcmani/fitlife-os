import {
  calculateBmrMifflinStJeor,
  calculateBmrKatchMcArdle,
  calculateTdee,
  calculateTargetCalories,
  calculateMacronutrients,
} from './metabolic';

describe('Metabolic Engine (BMR / TDEE / Macros)', () => {
  describe('calculateBmrMifflinStJeor', () => {
    it('calculates correct BMR for a male (Arun: 75kg, 175cm, 28y)', () => {
      // BMR = 10 * 75 + 6.25 * 175 - 5 * 28 + 5
      // BMR = 750 + 1093.75 - 140 + 5 = 1708.75 -> 1709
      const bmr = calculateBmrMifflinStJeor({
        weightKg: 75,
        heightCm: 175,
        ageYears: 28,
        gender: 'male',
      });
      expect(bmr).toBe(1709);
    });

    it('calculates correct BMR for a female (Maya: 60kg, 165cm, 26y)', () => {
      // BMR = 10 * 60 + 6.25 * 165 - 5 * 26 - 161
      // BMR = 600 + 1031.25 - 130 - 161 = 1340.25 -> 1340
      const bmr = calculateBmrMifflinStJeor({
        weightKg: 60,
        heightCm: 165,
        ageYears: 26,
        gender: 'female',
      });
      expect(bmr).toBe(1340);
    });

    it('throws on non-positive input values', () => {
      expect(() =>
        calculateBmrMifflinStJeor({ weightKg: 0, heightCm: 170, ageYears: 25, gender: 'male' })
      ).toThrow(RangeError);
      expect(() =>
        calculateBmrMifflinStJeor({ weightKg: 70, heightCm: -5, ageYears: 25, gender: 'male' })
      ).toThrow(RangeError);
    });
  });

  describe('calculateBmrKatchMcArdle', () => {
    it('calculates correct BMR from lean body mass', () => {
      // Weight 80kg, 15% bodyfat -> LBM = 80 * 0.85 = 68 kg
      // BMR = 370 + 21.6 * 68 = 370 + 1468.8 = 1838.8 -> 1839
      const bmr = calculateBmrKatchMcArdle({
        weightKg: 80,
        bodyFatPercentage: 15,
      });
      expect(bmr).toBe(1839);
    });

    it('throws when body fat is outside physiological range', () => {
      expect(() =>
        calculateBmrKatchMcArdle({ weightKg: 70, bodyFatPercentage: 1 })
      ).toThrow(RangeError);
      expect(() =>
        calculateBmrKatchMcArdle({ weightKg: 70, bodyFatPercentage: 65 })
      ).toThrow(RangeError);
    });
  });

  describe('calculateTdee', () => {
    it('applies correct activity multipliers', () => {
      const bmr = 1700;
      expect(calculateTdee(bmr, 'sedentary')).toBe(2040); // 1700 * 1.2
      expect(calculateTdee(bmr, 'light')).toBe(2338); // 1700 * 1.375
      expect(calculateTdee(bmr, 'moderate')).toBe(2635); // 1700 * 1.55
      expect(calculateTdee(bmr, 'very_active')).toBe(2933); // 1700 * 1.725
      expect(calculateTdee(bmr, 'extreme')).toBe(3230); // 1700 * 1.9
    });
  });

  describe('calculateTargetCalories', () => {
    it('applies default -20% deficit for fat loss', () => {
      const tdee = 2500;
      const result = calculateTargetCalories({ tdee, goal: 'fat_loss' });
      expect(result.targetCalories).toBe(2000);
      expect(result.adjustmentPercentage).toBe(-20);
      expect(result.isCappedForSafety).toBe(false);
    });

    it('caps aggressive fat loss deficit at maximum safe limit of -25%', () => {
      const tdee = 2500;
      const result = calculateTargetCalories({
        tdee,
        goal: 'fat_loss',
        deficitSurplusPercent: 0.35, // Requested 35% deficit
      });
      expect(result.targetCalories).toBe(1875); // Capped at -25%
      expect(result.adjustmentPercentage).toBe(-25);
    });

    it('enforces physiological minimum floor for females (1200 kcal)', () => {
      const result = calculateTargetCalories({
        tdee: 1300,
        goal: 'fat_loss',
        deficitSurplusPercent: 0.25,
        gender: 'female',
      });
      // 1300 * 0.75 = 975 -> Clamped to 1200
      expect(result.targetCalories).toBe(1200);
      expect(result.isCappedForSafety).toBe(true);
      expect(result.safetyWarning).toBeDefined();
    });

    it('enforces physiological minimum floor for males (1500 kcal)', () => {
      const result = calculateTargetCalories({
        tdee: 1600,
        goal: 'fat_loss',
        deficitSurplusPercent: 0.2,
        gender: 'male',
      });
      // 1600 * 0.8 = 1280 -> Clamped to 1500
      expect(result.targetCalories).toBe(1500);
      expect(result.isCappedForSafety).toBe(true);
    });

    it('applies +10% surplus for muscle gain', () => {
      const result = calculateTargetCalories({ tdee: 2500, goal: 'muscle_gain' });
      expect(result.targetCalories).toBe(2750);
      expect(result.adjustmentPercentage).toBe(10);
    });
  });

  describe('calculateMacronutrients', () => {
    it('partitions calories accurately for fat loss (high protein 2.0g/kg)', () => {
      // 2000 kcal, 75kg
      // Protein: 75 * 2.0 = 150g -> 600 kcal
      // Fat: 25% of 2000 = 500 kcal -> 500 / 9 = 56g
      // Carbs: 2000 - (600 + 500) = 900 kcal -> 900 / 4 = 225g
      // Fiber: (2000 / 1000) * 14 = 28g
      const result = calculateMacronutrients({
        targetCalories: 2000,
        weightKg: 75,
        goal: 'fat_loss',
      });

      expect(result.proteinG).toBe(150);
      expect(result.proteinCalories).toBe(600);
      expect(result.fatG).toBe(56);
      expect(result.carbsG).toBe(225);
      expect(result.fiberG).toBe(28);
      // Macro calories sum should approximately equal target calories
      const sum = result.proteinCalories + result.fatCalories + result.carbsCalories;
      expect(Math.abs(sum - 2000)).toBeLessThanOrEqual(5);
    });
  });
});
