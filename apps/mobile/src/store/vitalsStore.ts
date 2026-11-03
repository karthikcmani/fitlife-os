import { create } from 'zustand';
import { Habit, SleepLog } from '../types';
import { getLocalDatabase } from '../db/sqlite';
import { SyncManager } from '../services/syncManager';

interface VitalsState {
  todayWaterMl: number;
  habits: Habit[];
  completedHabitIds: string[];
  recentSleep: SleepLog | null;
  isLoading: boolean;

  // Actions
  loadVitals: (userId: string, dateStr: string) => Promise<void>;
  addWater: (userId: string, amountMl: number) => Promise<void>;
  toggleHabit: (userId: string, habitId: string, dateStr: string) => Promise<void>;
  createHabit: (userId: string, title: string, icon?: string) => Promise<void>;
  logSleep: (userId: string, params: {
    sleepDate: string;
    bedtime: string;
    wakeTime: string;
    durationMinutes: number;
    subjectiveQuality: 1 | 2 | 3 | 4 | 5;
    notes?: string;
  }) => Promise<void>;
}

export const useVitalsStore = create<VitalsState>((set, get) => ({
  todayWaterMl: 0,
  habits: [],
  completedHabitIds: [],
  recentSleep: null,
  isLoading: false,

  loadVitals: async (userId, dateStr) => {
    const db = await getLocalDatabase();

    // 1. Water
    const waterRows = await db.getAllAsync<{ amount_ml: number }>(
      `SELECT amount_ml FROM hydration_logs WHERE user_id = ? AND logged_at LIKE ? AND is_deleted = 0;`,
      [userId, `${dateStr}%`]
    );
    const totalWater = waterRows.reduce((sum, r) => sum + r.amount_ml, 0);

    // 2. Habits & Completions
    const habitRows = await db.getAllAsync<any>(
      `SELECT * FROM habits WHERE user_id = ? AND is_archived = 0;`,
      [userId]
    );

    const completionRows = await db.getAllAsync<{ habit_id: string }>(
      `SELECT habit_id FROM habit_completions WHERE user_id = ? AND completed_date = ?;`,
      [userId, dateStr]
    );

    // 3. Sleep
    const sleep = await db.getFirstAsync<any>(
      `SELECT * FROM sleep_logs WHERE user_id = ? AND sleep_date = ? AND is_deleted = 0;`,
      [userId, dateStr]
    );

    set({
      todayWaterMl: totalWater,
      habits: habitRows.map((h) => ({
        id: h.id,
        userId: h.user_id,
        title: h.title,
        icon: h.icon,
        targetFrequency: h.target_frequency,
        daysOfWeek: JSON.parse(h.days_of_week ?? '[1,2,3,4,5,6,7]'),
        isArchived: Boolean(h.is_archived),
        createdAt: h.created_at,
      })),
      completedHabitIds: completionRows.map((c) => c.habit_id),
      recentSleep: sleep
        ? {
            id: sleep.id,
            userId: sleep.user_id,
            sleepDate: sleep.sleep_date,
            bedtime: sleep.bedtime,
            wakeTime: sleep.wake_time,
            durationMinutes: sleep.duration_minutes,
            subjectiveQuality: sleep.subjective_quality,
            notes: sleep.notes,
            clientCreatedAt: sleep.client_created_at,
            isDeleted: Boolean(sleep.is_deleted),
          }
        : null,
    });
  },

  addWater: async (userId, amountMl) => {
    const db = await getLocalDatabase();
    const id = `water-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO hydration_logs (id, user_id, logged_at, amount_ml, client_created_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, 0);`,
      [id, userId, now, amountMl, now]
    );

    await SyncManager.enqueueMutation('hydration_logs', id, 'INSERT', {
      loggedAt: now,
      amountMl,
      clientCreatedAt: now,
    });

    set((state) => ({ todayWaterMl: state.todayWaterMl + amountMl }));
  },

  createHabit: async (userId, title, icon = 'check') => {
    const db = await getLocalDatabase();
    const id = `habit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO habits (id, user_id, title, icon, target_frequency, days_of_week, is_archived, created_at)
       VALUES (?, ?, ?, ?, 'daily', '[1,2,3,4,5,6,7]', 0, ?);`,
      [id, userId, title, icon, now]
    );

    await SyncManager.enqueueMutation('habits', id, 'INSERT', {
      title,
      icon,
      targetFrequency: 'daily',
      daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
      isArchived: false,
    });

    const dateStr = now.split('T')[0]!;
    await get().loadVitals(userId, dateStr);
  },

  toggleHabit: async (userId, habitId, dateStr) => {
    const db = await getLocalDatabase();
    const completed = get().completedHabitIds.includes(habitId);

    if (completed) {
      await db.runAsync(
        `DELETE FROM habit_completions WHERE habit_id = ? AND completed_date = ?;`,
        [habitId, dateStr]
      );
      set((state) => ({
        completedHabitIds: state.completedHabitIds.filter((id) => id !== habitId),
      }));
    } else {
      const id = `comp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      await db.runAsync(
        `INSERT OR REPLACE INTO habit_completions (id, habit_id, user_id, completed_date, completed_at)
         VALUES (?, ?, ?, ?, ?);`,
        [id, habitId, userId, dateStr, now]
      );
      set((state) => ({
        completedHabitIds: [...state.completedHabitIds, habitId],
      }));
    }
  },

  logSleep: async (userId, params) => {
    const db = await getLocalDatabase();
    const id = `sleep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT OR REPLACE INTO sleep_logs 
      (id, user_id, sleep_date, bedtime, wake_time, duration_minutes, subjective_quality, notes, client_created_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
      [
        id,
        userId,
        params.sleepDate,
        params.bedtime,
        params.wakeTime,
        params.durationMinutes,
        params.subjectiveQuality,
        params.notes ?? null,
        now,
      ]
    );

    await SyncManager.enqueueMutation('sleep_logs', id, 'INSERT', {
      sleepDate: params.sleepDate,
      bedtime: params.bedtime,
      wakeTime: params.wakeTime,
      durationMinutes: params.durationMinutes,
      subjectiveQuality: params.subjectiveQuality,
      notes: params.notes,
      clientCreatedAt: now,
    });

    await get().loadVitals(userId, params.sleepDate);
  },
}));
