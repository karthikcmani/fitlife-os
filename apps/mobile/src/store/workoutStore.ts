import { create } from 'zustand';
import { Exercise, WorkoutSession, WorkoutSet } from '../types';
import { getLocalDatabase } from '../db/sqlite';
import { SyncManager } from '../services/syncManager';
import { estimate1RmBrzycki } from '../domain';

export interface CompletedExerciseSummary {
  name: string;
  sets: {
    weightKg: number;
    reps: number;
    rpe?: number;
  }[];
}

export interface WorkoutCompletedSummary {
  sessionId: string;
  title: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  totalSets: number;
  exercises: CompletedExerciseSummary[];
}

interface WorkoutState {
  exercises: Exercise[];
  recentSessions: WorkoutSession[];
  activeSession: WorkoutSession | null;
  activeSets: WorkoutSet[];
  lastCompletedSummary: WorkoutCompletedSummary | null;
  isLoading: boolean;

  // Actions
  loadExercises: (search?: string, muscleGroup?: string, difficulty?: string) => Promise<void>;
  loadRecentSessions: () => Promise<void>;
  startWorkout: (title: string, userId: string) => Promise<void>;
  addSetToActive: (exerciseId: string, weightKg: number, reps: number, rpe?: number) => Promise<void>;
  finishWorkout: (summary?: WorkoutCompletedSummary) => Promise<void>;
  cancelWorkout: () => void;
  setLastCompletedSummary: (summary: WorkoutCompletedSummary | null) => void;
}

export const useWorkoutStore = create<WorkoutState>((set, get) => ({
  exercises: [],
  recentSessions: [],
  activeSession: null,
  activeSets: [],
  lastCompletedSummary: null,
  isLoading: false,

  loadExercises: async (search, muscleGroup, difficulty) => {
    set({ isLoading: true });
    const db = await getLocalDatabase();

    let query = `SELECT * FROM exercises WHERE 1=1`;
    const params: any[] = [];

    if (search && search.trim().length > 0) {
      query += ` AND name LIKE ?`;
      params.push(`%${search.trim()}%`);
    }

    if (muscleGroup && muscleGroup !== 'all') {
      query += ` AND primary_muscle_group = ?`;
      params.push(muscleGroup);
    }

    if (difficulty && difficulty !== 'all') {
      query += ` AND difficulty = ?`;
      params.push(difficulty);
    }

    query += ` ORDER BY name ASC LIMIT 100;`;

    const rows = await db.getAllAsync<any>(query, params);

    set({
      exercises: rows.map((r) => ({
        id: r.id,
        name: r.name,
        primaryMuscleGroup: r.primary_muscle_group,
        secondaryMuscleGroups: JSON.parse(r.secondary_muscle_groups ?? '[]'),
        category: r.category,
        difficulty: r.difficulty,
        instructions: r.instructions,
        equipmentRequired: r.equipment_required,
        isCustom: Boolean(r.is_custom),
        createdAt: r.created_at,
        simpleExplanation: r.simple_explanation || undefined,
        beginnerInstructions: r.beginner_instructions || undefined,
        commonMistakes: r.common_mistakes ? JSON.parse(r.common_mistakes) : [],
        easierAlternatives: r.easier_alternatives ? JSON.parse(r.easier_alternatives) : [],
        recommendedSets: r.recommended_sets ?? 3,
        recommendedReps: r.recommended_reps ?? '8-12 reps',
        recommendedRestSec: r.recommended_rest_sec ?? 60,
      })),
      isLoading: false,
    });
  },

  loadRecentSessions: async () => {
    const db = await getLocalDatabase();

    // 1. Clean up stale unended sessions older than 24 hours
    await db.runAsync(
      `UPDATE workout_sessions SET is_deleted = 1 WHERE ended_at IS NULL AND is_deleted = 0 AND datetime(started_at) < datetime('now', '-1 day');`
    );

    // 2. Check for an active in-progress session (started recently, not ended, not deleted)
    if (!get().activeSession) {
      const activeRow = await db.getFirstAsync<any>(
        `SELECT * FROM workout_sessions WHERE ended_at IS NULL AND is_deleted = 0 ORDER BY started_at DESC LIMIT 1;`
      );

      if (activeRow) {
        const setRows = await db.getAllAsync<any>(
          `SELECT * FROM workout_sets WHERE workout_session_id = ? AND is_deleted = 0 ORDER BY set_index ASC;`,
          [activeRow.id]
        );

        const restoredSession: WorkoutSession = {
          id: activeRow.id,
          userId: activeRow.user_id,
          title: activeRow.title,
          startedAt: activeRow.started_at,
          endedAt: activeRow.ended_at,
          notes: activeRow.notes,
          clientCreatedAt: activeRow.client_created_at,
          clientUpdatedAt: activeRow.client_updated_at,
          isDeleted: Boolean(activeRow.is_deleted),
          sets: setRows.map((s) => ({
            id: s.id,
            workoutSessionId: s.workout_session_id,
            exerciseId: s.exercise_id,
            setIndex: s.set_index,
            setType: s.set_type,
            weightKg: s.weight_kg,
            reps: s.reps,
            rpe: s.rpe,
            isCompleted: Boolean(s.is_completed),
            createdAt: s.created_at,
          })),
        };

        set({
          activeSession: restoredSession,
          activeSets: restoredSession.sets ?? [],
        });
      }
    }

    // 3. Load completed sessions for history
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM workout_sessions WHERE is_deleted = 0 AND ended_at IS NOT NULL ORDER BY started_at DESC LIMIT 10;`
    );

    const sessions: WorkoutSession[] = [];
    for (const r of rows) {
      const sets = await db.getAllAsync<any>(
        `SELECT * FROM workout_sets WHERE workout_session_id = ? AND is_deleted = 0 ORDER BY set_index ASC;`,
        [r.id]
      );

      sessions.push({
        id: r.id,
        userId: r.user_id,
        title: r.title,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        notes: r.notes,
        clientCreatedAt: r.client_created_at,
        clientUpdatedAt: r.client_updated_at,
        isDeleted: Boolean(r.is_deleted),
        sets: sets.map((s) => ({
          id: s.id,
          workoutSessionId: s.workout_session_id,
          exerciseId: s.exercise_id,
          setIndex: s.set_index,
          setType: s.set_type,
          weightKg: s.weight_kg,
          reps: s.reps,
          rpe: s.rpe,
          isCompleted: Boolean(s.is_completed),
          createdAt: s.created_at,
        })),
      });
    }

    set({ recentSessions: sessions });
  },

  startWorkout: async (title, userId) => {
    const id = `session-${Date.now()}`;
    const now = new Date().toISOString();

    const newSession: WorkoutSession = {
      id,
      userId,
      title,
      startedAt: now,
      clientCreatedAt: now,
      clientUpdatedAt: now,
      isDeleted: false,
      sets: [],
    };

    const db = await getLocalDatabase();
    await db.runAsync(
      `INSERT INTO workout_sessions (id, user_id, title, started_at, client_created_at, client_updated_at, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, 0);`,
      [newSession.id, newSession.userId, newSession.title, newSession.startedAt, now, now]
    );

    // Enqueue sync mutation
    await SyncManager.enqueueMutation('workout_sessions', newSession.id, 'INSERT', {
      title: newSession.title,
      startedAt: newSession.startedAt,
      clientCreatedAt: now,
      clientUpdatedAt: now,
    });

    set({ activeSession: newSession, activeSets: [] });
  },

  addSetToActive: async (exerciseId, weightKg, reps, rpe) => {
    const active = get().activeSession;
    if (!active) return;

    const setId = `set-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const setIndex = get().activeSets.length;
    const now = new Date().toISOString();

    const newSet: WorkoutSet = {
      id: setId,
      workoutSessionId: active.id,
      exerciseId,
      setIndex,
      setType: 'standard',
      weightKg,
      reps,
      rpe,
      isCompleted: true,
      createdAt: now,
    };

    const db = await getLocalDatabase();
    await db.runAsync(
      `INSERT INTO workout_sets (id, workout_session_id, exercise_id, set_index, set_type, weight_kg, reps, rpe, is_completed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?);`,
      [newSet.id, newSet.workoutSessionId, newSet.exerciseId, newSet.setIndex, newSet.setType, newSet.weightKg, newSet.reps, newSet.rpe ?? null, now]
    );

    // Enqueue sync mutation
    await SyncManager.enqueueMutation('workout_sets', newSet.id, 'INSERT', {
      workoutSessionId: newSet.workoutSessionId,
      exerciseId: newSet.exerciseId,
      setIndex: newSet.setIndex,
      setType: newSet.setType,
      weightKg: newSet.weightKg,
      reps: newSet.reps,
      rpe: newSet.rpe,
      isCompleted: true,
    });

    // Calculate PR feedback
    const oneRm = estimate1RmBrzycki(weightKg, reps);

    set((state) => ({
      activeSets: [...state.activeSets, newSet],
    }));
  },

  finishWorkout: async (summary) => {
    const active = get().activeSession;
    if (!active) return;

    const now = new Date().toISOString();
    const db = await getLocalDatabase();

    // 1. Mark all completed sets
    await db.runAsync(
      `UPDATE workout_sets SET is_completed = 1 WHERE workout_session_id = ?;`,
      [active.id]
    );

    // 2. Mark workout session ended
    await db.runAsync(
      `UPDATE workout_sessions SET ended_at = ?, client_updated_at = ? WHERE id = ?;`,
      [now, now, active.id]
    );

    await SyncManager.enqueueMutation('workout_sessions', active.id, 'UPDATE', {
      endedAt: now,
      clientUpdatedAt: now,
    });

    set({
      activeSession: null,
      activeSets: [],
      lastCompletedSummary: summary ?? null,
    });
    await get().loadRecentSessions();
  },

  setLastCompletedSummary: (summary) => {
    set({ lastCompletedSummary: summary });
  },

  cancelWorkout: async () => {
    const active = get().activeSession;
    if (active) {
      const db = await getLocalDatabase();
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE workout_sessions SET is_deleted = 1, client_updated_at = ? WHERE id = ?;`,
        [now, active.id]
      );
      await db.runAsync(
        `DELETE FROM workout_sets WHERE workout_session_id = ?;`,
        [active.id]
      );
      await SyncManager.enqueueMutation('workout_sessions', active.id, 'DELETE', {
        id: active.id,
      });
    }
    set({ activeSession: null, activeSets: [] });
    await get().loadRecentSessions();
  },
}));
