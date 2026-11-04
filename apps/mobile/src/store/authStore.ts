import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthUser, UserProfile } from '../types';
import { getLocalDatabase } from '../db/sqlite';

const ACCESS_TOKEN_KEY = 'fitlife_access_token';
const REFRESH_TOKEN_KEY = 'fitlife_refresh_token';

interface AuthState {
  user: AuthUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isLoading: boolean;
  backendUrl: string;

  // Actions
  initialize: () => Promise<void>;
  setSession: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>;
  setProfile: (profile: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  setBackendUrl: (url: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isAuthenticated: false,
  isOnboarded: false,
  isLoading: true,
  backendUrl: 'http://localhost:4000',

  initialize: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const db = await getLocalDatabase();

      // Check if a local profile exists
      const localProfile = await db.getFirstAsync<any>(
        `SELECT * FROM user_profiles LIMIT 1;`
      );

      if (localProfile) {
        set({
          profile: {
            userId: localProfile.user_id,
            displayName: localProfile.display_name,
            dateOfBirth: localProfile.date_of_birth,
            gender: localProfile.gender,
            heightCm: localProfile.height_cm,
            currentWeightKg: localProfile.current_weight_kg,
            fitnessLevel: localProfile.fitness_level,
            activityLevel: localProfile.activity_level,
            primaryGoal: localProfile.primary_goal,
            trainingEnvironment: localProfile.training_environment,
            availableTrainingDays: localProfile.available_training_days ?? 3,
            sessionDurationMinutes: localProfile.session_duration_minutes ?? 30,
            equipmentInventory: localProfile.equipment_inventory
              ? JSON.parse(localProfile.equipment_inventory)
              : ['none'],
            dietaryPreference: localProfile.dietary_preference ?? 'vegetarian',
            injuriesOrLimitations: localProfile.injuries_or_limitations
              ? JSON.parse(localProfile.injuries_or_limitations)
              : ['none'],
            bodyMeasurements: localProfile.body_measurements
              ? JSON.parse(localProfile.body_measurements)
              : {},
            preferredUnitSystem: localProfile.preferred_unit_system,
            dailyWaterTargetMl: localProfile.daily_water_target_ml,
            createdAt: localProfile.created_at,
            updatedAt: localProfile.updated_at,
          },
          isOnboarded: true,
          isAuthenticated: Boolean(accessToken),
          isLoading: false,
        });
      } else {
        set({
          isAuthenticated: Boolean(accessToken),
          isOnboarded: false,
          isLoading: false,
        });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setSession: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    set({ user, isAuthenticated: true });
  },

  setProfile: async (profile) => {
    const db = await getLocalDatabase();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_profiles
      (user_id, display_name, date_of_birth, gender, height_cm, current_weight_kg, fitness_level, activity_level, primary_goal, training_environment, available_training_days, session_duration_minutes, equipment_inventory, dietary_preference, injuries_or_limitations, body_measurements, preferred_unit_system, daily_water_target_ml, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        profile.userId,
        profile.displayName,
        profile.dateOfBirth ?? null,
        profile.gender ?? null,
        profile.heightCm,
        profile.currentWeightKg,
        profile.fitnessLevel,
        profile.activityLevel,
        profile.primaryGoal,
        profile.trainingEnvironment,
        profile.availableTrainingDays ?? 3,
        profile.sessionDurationMinutes ?? 30,
        JSON.stringify(profile.equipmentInventory ?? ['none']),
        profile.dietaryPreference ?? 'vegetarian',
        JSON.stringify(profile.injuriesOrLimitations ?? ['none']),
        JSON.stringify(profile.bodyMeasurements ?? {}),
        profile.preferredUnitSystem,
        profile.dailyWaterTargetMl,
        profile.createdAt,
        profile.updatedAt,
      ]
    );

    set({ profile, isOnboarded: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ user: null, profile: null, isAuthenticated: false, isOnboarded: false });
  },

  setBackendUrl: (url) => set({ backendUrl: url }),
}));

export async function getStoredAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}
