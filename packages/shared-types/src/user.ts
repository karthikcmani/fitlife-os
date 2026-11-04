export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extreme';

export type PrimaryGoal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'recomposition'
  | 'strength'
  | 'maintenance'
  | 'general_fitness'
  | 'stamina'
  | 'health_consistency';

export type TrainingEnvironment = 'gym' | 'home' | 'calisthenics';

export type EquipmentItem =
  | 'none'
  | 'dumbbells'
  | 'resistance_bands'
  | 'barbell'
  | 'bench'
  | 'kettlebell'
  | 'pull_up_bar'
  | 'exercise_mat';

export type SessionDurationMinutes = 20 | 30 | 45 | 60;

export type DietaryPreference =
  | 'vegetarian'
  | 'non_vegetarian'
  | 'vegan'
  | 'eggetarian'
  | 'other';

export type PhysicalLimitation =
  | 'none'
  | 'knee_pain'
  | 'lower_back'
  | 'shoulder_pain'
  | 'wrist_pain';

export interface BodyMeasurements {
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
}

export type UnitSystem = 'metric' | 'imperial';

export interface PlanExerciseItem {
  exerciseId: string;
  name: string;
  category?: string;
  whyIncluded: string;
  targetedMusclesSimple: string;
  equipmentRequired: string;
  startingPosition: string;
  instructions: string[];
  recommendedSets: number;
  recommendedReps: string;
  recommendedRestSec: number;
  breathingGuidance: string;
  commonMistakes: string[];
  easierAlternative?: string;
  harderAlternative?: string;
}

export interface PlanWorkoutRoutine {
  dayIndex: number; // 1 to 7
  dayName: string; // e.g. "Day 1 (Full Body)"
  title: string;
  isRestDay: boolean;
  estimatedMinutes: number;
  exercises: PlanExerciseItem[];
}

export interface PlanMealSuggestion {
  mealType: 'breakfast' | 'lunch' | 'snack' | 'dinner';
  title: string;
  description: string;
  portionGuide: string; // e.g. "2 Rotis + 1 Bowl Dal + Salad"
  approxCalories: number;
  approxProteinG: number;
  isVegetarian: boolean;
  alternatives?: string[];
}

export interface PersonalCoachingPlan {
  id: string;
  userId: string;
  createdAt: string;
  primaryGoal: PrimaryGoal;
  goalTitle: string;
  baselineSummary: string;
  weeklyWorkouts: PlanWorkoutRoutine[];
  dailyMeals: PlanMealSuggestion[];
  dailyWaterTargetMl: number;
  progressionMilestones: string[];
  whyThisPlanGenerated: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  dateOfBirth?: string; // YYYY-MM-DD
  gender?: Gender;
  heightCm: number;
  currentWeightKg: number;
  fitnessLevel: FitnessLevel;
  activityLevel: ActivityLevel;
  primaryGoal: PrimaryGoal;
  trainingEnvironment: TrainingEnvironment;
  availableTrainingDays?: number; // 2 to 6 days per week
  sessionDurationMinutes?: SessionDurationMinutes;
  equipmentInventory?: EquipmentItem[];
  dietaryPreference?: DietaryPreference;
  injuriesOrLimitations?: PhysicalLimitation[];
  bodyMeasurements?: BodyMeasurements;
  preferredUnitSystem: UnitSystem;
  dailyWaterTargetMl: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileSetupInput {
  displayName: string;
  dateOfBirth?: string;
  gender?: Gender;
  heightCm: number;
  currentWeightKg: number;
  fitnessLevel: FitnessLevel;
  activityLevel: ActivityLevel;
  primaryGoal: PrimaryGoal;
  trainingEnvironment: TrainingEnvironment;
  availableTrainingDays?: number;
  sessionDurationMinutes?: SessionDurationMinutes;
  equipmentInventory?: EquipmentItem[];
  dietaryPreference?: DietaryPreference;
  injuriesOrLimitations?: PhysicalLimitation[];
  bodyMeasurements?: BodyMeasurements;
  preferredUnitSystem?: UnitSystem;
  dailyWaterTargetMl?: number;
}
