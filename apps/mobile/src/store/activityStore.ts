import { create } from 'zustand';
import { getLocalDatabase } from '../db/sqlite';

export interface ActivitySession {
  id: string;
  userId: string;
  activityType: 'walking' | 'running' | 'cycling';
  startedAt: string;
  endedAt?: string;
  durationSeconds: number;
  stepCount: number;
  distanceMeters: number;
  caloriesBurned: number;
  averagePaceSecKm?: number;
}

export interface DailyActivitySummary {
  date: string;
  stepCount: number;
  distanceMeters: number;
  activeMinutes: number;
  caloriesBurned: number;
}

interface ActivityState {
  todaySummary: DailyActivitySummary;
  dailyStepGoal: number;
  activeSession: ActivitySession | null;
  recentSessions: ActivitySession[];
  isLoading: boolean;

  // Actions
  loadTodayActivity: (userId: string, date: string) => Promise<void>;
  startActivity: (type: 'walking' | 'running' | 'cycling', userId: string) => void;
  updateActiveSessionMetrics: (seconds: number, steps: number, distanceMeters: number) => void;
  finishActivity: () => Promise<ActivitySession | null>;
  cancelActivity: () => void;
  setDailyStepGoal: (goal: number) => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  todaySummary: {
    date: new Date().toISOString().substring(0, 10),
    stepCount: 0,
    distanceMeters: 0,
    activeMinutes: 0,
    caloriesBurned: 0,
  },
  dailyStepGoal: 8000,
  activeSession: null,
  recentSessions: [],
  isLoading: false,

  loadTodayActivity: async (userId: string, date: string) => {
    try {
      const db = await getLocalDatabase();
      const row = await db.getFirstAsync<any>(
        `SELECT * FROM daily_activity_summaries WHERE user_id = ? AND date = ?;`,
        [userId, date]
      );

      const recent = await db.getAllAsync<any>(
        `SELECT * FROM activity_sessions WHERE user_id = ? AND is_deleted = 0 ORDER BY started_at DESC LIMIT 5;`,
        [userId]
      );

      if (row) {
        set({
          todaySummary: {
            date: row.date,
            stepCount: row.step_count,
            distanceMeters: row.distance_meters,
            activeMinutes: row.active_minutes,
            caloriesBurned: row.calories_burned,
          },
          recentSessions: recent.map((r) => ({
            id: r.id,
            userId: r.user_id,
            activityType: r.activity_type,
            startedAt: r.started_at,
            endedAt: r.ended_at,
            durationSeconds: r.duration_seconds,
            stepCount: r.step_count,
            distanceMeters: r.distance_meters,
            caloriesBurned: r.calories_burned,
            averagePaceSecKm: r.average_pace_sec_km,
          })),
        });
      } else {
        set({
          todaySummary: {
            date,
            stepCount: 0,
            distanceMeters: 0,
            activeMinutes: 0,
            caloriesBurned: 0,
          },
          recentSessions: recent.map((r) => ({
            id: r.id,
            userId: r.user_id,
            activityType: r.activity_type,
            startedAt: r.started_at,
            endedAt: r.ended_at,
            durationSeconds: r.duration_seconds,
            stepCount: r.step_count,
            distanceMeters: r.distance_meters,
            caloriesBurned: r.calories_burned,
            averagePaceSecKm: r.average_pace_sec_km,
          })),
        });
      }
    } catch {
      // Fallback
    }
  },

  startActivity: (type, userId) => {
    const session: ActivitySession = {
      id: `act_${Date.now()}`,
      userId,
      activityType: type,
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      stepCount: 0,
      distanceMeters: 0,
      caloriesBurned: 0,
    };
    set({ activeSession: session });
  },

  updateActiveSessionMetrics: (seconds: number, steps: number, distanceMeters: number) => {
    const active = get().activeSession;
    if (!active) return;

    // Approximate calories: ~0.04 kcal per step or ~60 kcal per km walking/running
    const caloriesBurned = Math.round((distanceMeters / 1000) * (active.activityType === 'running' ? 70 : 50));
    const averagePaceSecKm = distanceMeters > 50 ? Math.round((seconds / distanceMeters) * 1000) : 0;

    set({
      activeSession: {
        ...active,
        durationSeconds: seconds,
        stepCount: steps,
        distanceMeters,
        caloriesBurned,
        averagePaceSecKm,
      },
    });
  },

  finishActivity: async () => {
    const active = get().activeSession;
    if (!active) return null;

    const endedAt = new Date().toISOString();
    const today = endedAt.substring(0, 10);
    const db = await getLocalDatabase();

    const completedSession: ActivitySession = {
      ...active,
      endedAt,
    };

    try {
      await db.runAsync(
        `INSERT INTO activity_sessions 
        (id, user_id, activity_type, started_at, ended_at, duration_seconds, step_count, distance_meters, calories_burned, average_pace_sec_km, source, is_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fitlife_sensor', 0, ?, ?);`,
        [
          completedSession.id,
          completedSession.userId,
          completedSession.activityType,
          completedSession.startedAt,
          endedAt,
          completedSession.durationSeconds,
          completedSession.stepCount,
          completedSession.distanceMeters,
          completedSession.caloriesBurned,
          completedSession.averagePaceSecKm ?? null,
          endedAt,
          endedAt,
        ]
      );

      // Update today's summary
      const current = get().todaySummary;
      const newSteps = current.stepCount + completedSession.stepCount;
      const newDistance = current.distanceMeters + completedSession.distanceMeters;
      const newMinutes = current.activeMinutes + Math.round(completedSession.durationSeconds / 60);
      const newCals = current.caloriesBurned + completedSession.caloriesBurned;

      await db.runAsync(
        `INSERT INTO daily_activity_summaries (id, user_id, date, step_count, active_minutes, distance_meters, calories_burned, source, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'fitlife_sensor', ?)
         ON CONFLICT(date) DO UPDATE SET 
           step_count = step_count + excluded.step_count, 
           distance_meters = distance_meters + excluded.distance_meters, 
           active_minutes = active_minutes + excluded.active_minutes,
           calories_burned = calories_burned + excluded.calories_burned,
           updated_at = excluded.updated_at;`,
        [`act_sum_${Date.now()}`, completedSession.userId, today, completedSession.stepCount, Math.round(completedSession.durationSeconds / 60), completedSession.distanceMeters, completedSession.caloriesBurned, endedAt]
      );

      set((state) => ({
        activeSession: null,
        todaySummary: {
          ...state.todaySummary,
          stepCount: newSteps,
          distanceMeters: newDistance,
          activeMinutes: newMinutes,
          caloriesBurned: newCals,
        },
        recentSessions: [completedSession, ...state.recentSessions],
      }));

      return completedSession;
    } catch {
      set({ activeSession: null });
      return null;
    }
  },

  cancelActivity: () => {
    set({ activeSession: null });
  },

  setDailyStepGoal: (goal: number) => {
    set({ dailyStepGoal: Math.max(1000, Math.min(50000, goal)) });
  },
}));
