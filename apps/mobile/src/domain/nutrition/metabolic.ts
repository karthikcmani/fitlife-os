import { ActivityLevel, PrimaryGoal } from '../../types';

export interface BmrMifflinParams {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: 'male' | 'female';
}

export interface BmrKatchParams {
  weightKg: number;
  bodyFatPercentage: number;
}

export interface TargetCalorieParams {
  tdee: number;
  goal: PrimaryGoal;
  deficitSurplusPercent?: number; // e.g. 0.20 for 20%
  gender?: 'male' | 'female';
}

export interface TargetCalorieResult {
  targetCalories: number;
  baselineTdee: number;
  adjustmentCalories: number;
  adjustmentPercentage: number;
  isCappedForSafety: boolean;
  safetyWarning?: string;
}

export interface MacroPartitionParams {
  targetCalories: number;
  weightKg: number;
  goal: PrimaryGoal;
  customProteinGPerKg?: number;
  customFatPercentOfCalories?: number;
}

export interface MacroPartitionResult {
  targetCalories: number;
  proteinG: number;
  proteinCalories: number;
  proteinPercent: number;
  carbsG: number;
  carbsCalories: number;
  carbsPercent: number;
  fatG: number;
  fatCalories: number;
  fatPercent: number;
  fiberG: number;
}

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extreme: 1.9,
};

export const MINIMUM_SAFE_CALORIES = {
  male: 1500,
  female: 1200,
  default: 1200,
};

/**
 * Calculates Basal Metabolic Rate using the Mifflin-St Jeor equation.
 * Validated clinical standard for general populations.
 * Male: BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) + 5
 * Female: BMR = 10 * weight (kg) + 6.25 * height (cm) - 5 * age (y) - 161
 */
export function calculateBmrMifflinStJeor(params: BmrMifflinParams): number {
  const { weightKg, heightCm, ageYears, gender } = params;

  if (weightKg <= 0 || heightCm <= 0 || ageYears <= 0) {
    throw new RangeError('Weight, height, and age must be strictly positive numbers');
  }

  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  const bmr = gender === 'male' ? base + 5 : base - 161;

  return Math.round(bmr);
}

/**
 * Calculates Basal Metabolic Rate using the Katch-McArdle formula.
 * Requires measured body fat percentage. Calculates LBM directly.
 * BMR = 370 + (21.6 * LBM)
 */
export function calculateBmrKatchMcArdle(params: BmrKatchParams): number {
  const { weightKg, bodyFatPercentage } = params;

  if (weightKg <= 0) {
    throw new RangeError('Weight must be positive');
  }
  if (bodyFatPercentage < 3 || bodyFatPercentage > 60) {
    throw new RangeError('Body fat percentage must be within physiological range (3% - 60%)');
  }

  const leanBodyMassKg = weightKg * (1 - bodyFatPercentage / 100);
  const bmr = 370 + 21.6 * leanBodyMassKg;

  return Math.round(bmr);
}

/**
 * Calculates Total Daily Energy Expenditure based on BMR and activity multiplier.
 */
export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  if (bmr <= 0) {
    throw new RangeError('BMR must be strictly positive');
  }
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

/**
 * Calculates goal-based target calories with evidence-based boundaries.
 * Fat loss: Default -20% deficit.
 * Muscle gain: Default +10% surplus.
 * Recomposition / Maintenance: 0% adjustment.
 */
export function calculateTargetCalories(params: TargetCalorieParams): TargetCalorieResult {
  const { tdee, goal, deficitSurplusPercent, gender } = params;

  if (tdee <= 0) {
    throw new RangeError('TDEE must be strictly positive');
  }

  let adjustmentPercent = 0;

  switch (goal) {
    case 'fat_loss':
      adjustmentPercent = deficitSurplusPercent !== undefined ? -Math.abs(deficitSurplusPercent) : -0.2;
      // Cap deficit at maximum safe boundary of -25%
      if (adjustmentPercent < -0.25) {
        adjustmentPercent = -0.25;
      }
      break;
    case 'muscle_gain':
      adjustmentPercent = deficitSurplusPercent !== undefined ? Math.abs(deficitSurplusPercent) : 0.1;
      // Cap surplus at maximum lean boundary of +15%
      if (adjustmentPercent > 0.15) {
        adjustmentPercent = 0.15;
      }
      break;
    case 'recomposition':
    case 'strength':
    case 'maintenance':
    default:
      adjustmentPercent = 0;
      break;
  }

  let targetCalories = Math.round(tdee * (1 + adjustmentPercent));
  const minSafeFloor = gender ? MINIMUM_SAFE_CALORIES[gender] : MINIMUM_SAFE_CALORIES.default;

  let isCappedForSafety = false;
  let safetyWarning: string | undefined;

  if (targetCalories < minSafeFloor) {
    targetCalories = minSafeFloor;
    isCappedForSafety = true;
    safetyWarning = `Calorie target clamped to physiological minimum floor (${minSafeFloor} kcal) to prevent metabolic suppression.`;
  }

  return {
    targetCalories,
    baselineTdee: tdee,
    adjustmentCalories: targetCalories - tdee,
    adjustmentPercentage: Math.round(adjustmentPercent * 100),
    isCappedForSafety,
    safetyWarning,
  };
}

/**
 * Partitions daily target calories into protein, carbohydrates, fats, and dietary fiber.
 * Protein: 1.6 - 2.2 g/kg (4 kcal/g)
 * Fat: 20% - 30% total calories (9 kcal/g)
 * Carbohydrates: Remainder of total calories (4 kcal/g)
 * Fiber: 14g per 1000 kcal
 */
export function calculateMacronutrients(params: MacroPartitionParams): MacroPartitionResult {
  const { targetCalories, weightKg, goal, customProteinGPerKg, customFatPercentOfCalories } = params;

  if (targetCalories <= 0 || weightKg <= 0) {
    throw new RangeError('Target calories and weight must be strictly positive numbers');
  }

  // 1. Determine Protein g/kg based on goal or custom override
  let proteinGPerKg = customProteinGPerKg;
  if (!proteinGPerKg) {
    switch (goal) {
      case 'fat_loss':
      case 'recomposition':
        proteinGPerKg = 2.0; // Higher protein to spare lean mass during deficit
        break;
      case 'muscle_gain':
      case 'strength':
        proteinGPerKg = 1.8;
        break;
      case 'maintenance':
      default:
        proteinGPerKg = 1.6;
        break;
    }
  }

  const rawProteinG = weightKg * proteinGPerKg;
  const proteinCalories = Math.round(rawProteinG * 4);
  const proteinG = Math.round(rawProteinG);

  // 2. Determine Fat intake (typically 25% of calories or custom)
  const fatPercent = customFatPercentOfCalories ?? 0.25;
  const fatCalories = Math.round(targetCalories * fatPercent);
  const fatG = Math.round(fatCalories / 9);

  // 3. Carbohydrates fill the remainder of calories
  const remainingCalories = targetCalories - (proteinCalories + fatCalories);
  const carbsCalories = Math.max(0, remainingCalories);
  const carbsG = Math.round(carbsCalories / 4);

  // 4. Dietary Fiber: 14g per 1000 kcal
  const fiberG = Math.round((targetCalories / 1000) * 14);

  return {
    targetCalories,
    proteinG,
    proteinCalories,
    proteinPercent: Math.round((proteinCalories / targetCalories) * 100),
    carbsG,
    carbsCalories,
    carbsPercent: Math.round((carbsCalories / targetCalories) * 100),
    fatG,
    fatCalories,
    fatPercent: Math.round((fatCalories / targetCalories) * 100),
    fiberG,
  };
}
