export interface HydrationLog {
  id: string;
  userId: string;
  loggedAt: string;
  amountMl: number;
  clientCreatedAt: string;
  isDeleted: boolean;
}

export type HabitFrequency = 'daily' | 'weekdays' | 'specific_days';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  icon: string;
  targetFrequency: HabitFrequency;
  daysOfWeek: number[]; // 1 = Monday, 7 = Sunday
  isArchived: boolean;
  createdAt: string;
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  completedDate: string; // YYYY-MM-DD
  completedAt: string;
}

export interface SleepLog {
  id: string;
  userId: string;
  sleepDate: string; // YYYY-MM-DD morning wake date
  bedtime: string; // ISO
  wakeTime: string; // ISO
  durationMinutes: number;
  subjectiveQuality: 1 | 2 | 3 | 4 | 5;
  notes?: string;
  clientCreatedAt: string;
  isDeleted: boolean;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  measuredDate: string; // YYYY-MM-DD
  weightKg: number;
  waistCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighsCm?: number;
  hipsCm?: number;
  neckCm?: number;
  notes?: string;
  createdAt: string;
}
