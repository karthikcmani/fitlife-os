export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'full_body'
  | 'cardio';

export type ExerciseCategory =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'band'
  | 'cardio';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Exercise {
  id: string; // slug e.g. 'barbell-bench-press'
  name: string;
  primaryMuscleGroup: MuscleGroup;
  secondaryMuscleGroups: MuscleGroup[];
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  instructions: string;
  equipmentRequired: string;
  isCustom: boolean;
  createdByUserId?: string;
  createdAt: string;
}

export type SetType = 'warmup' | 'standard' | 'drop' | 'failure';

export interface WorkoutSet {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  setIndex: number;
  setType: SetType;
  weightKg: number;
  reps: number;
  rpe?: number; // 1.0 to 10.0
  isCompleted: boolean;
  createdAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  title: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
  clientCreatedAt: string;
  clientUpdatedAt: string;
  isDeleted: boolean;
  sets?: WorkoutSet[];
}

export interface PersonalRecord {
  exerciseId: string;
  estimatedOneRepMaxKg: number;
  maxWeightKg: number;
  maxVolumeKg: number;
  achievedDate: string;
  workoutSessionId: string;
}
