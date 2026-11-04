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

export type UnitSystem = 'metric' | 'imperial';

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
  preferredUnitSystem?: UnitSystem;
  dailyWaterTargetMl?: number;
}
