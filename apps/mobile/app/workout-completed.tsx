import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { SurfaceCard } from '../src/components/ui/SurfaceCard';
import { Button } from '../src/components/ui/Button';
import { useWorkoutStore, WorkoutCompletedSummary } from '../src/store/workoutStore';
import { theme } from '../src/theme';
import { getLocalDatabase } from '../src/db/sqlite';

export default function WorkoutCompletedScreen() {
  const router = useRouter();
  const { lastCompletedSummary, recentSessions, loadRecentSessions } = useWorkoutStore();
  const [summary, setSummary] = useState<WorkoutCompletedSummary | null>(lastCompletedSummary);
  const [isLoading, setIsLoading] = useState(!lastCompletedSummary);

  useEffect(() => {
    async function resolveSummary() {
      if (lastCompletedSummary) {
        setSummary(lastCompletedSummary);
        setIsLoading(false);
        return;
      }

      // Fallback: load the most recently completed session from SQLite
      try {
        const db = await getLocalDatabase();
        const sessionRow = await db.getFirstAsync<any>(
          `SELECT * FROM workout_sessions WHERE ended_at IS NOT NULL AND is_deleted = 0 ORDER BY ended_at DESC LIMIT 1;`
        );

        if (sessionRow) {
          const setsRows = await db.getAllAsync<any>(
            `SELECT ws.*, e.name as exercise_name 
             FROM workout_sets ws 
             JOIN exercises e ON ws.exercise_id = e.id 
             WHERE ws.workout_session_id = ? AND ws.is_completed = 1 
             ORDER BY ws.set_index ASC;`,
            [sessionRow.id]
          );

          const startMs = new Date(sessionRow.started_at).getTime();
          const endMs = new Date(sessionRow.ended_at).getTime();
          const durMin = Math.max(1, Math.round((endMs - startMs) / 60000));

          // Group by exercise
          const exMap = new Map<string, { name: string; sets: any[] }>();
          for (const s of setsRows) {
            const exName = s.exercise_name || 'Exercise';
            if (!exMap.has(exName)) {
              exMap.set(exName, { name: exName, sets: [] });
            }
            exMap.get(exName)!.sets.push({
              weightKg: s.weight_kg,
              reps: s.reps,
              rpe: s.rpe,
            });
          }

          setSummary({
            sessionId: sessionRow.id,
            title: sessionRow.title,
            startedAt: sessionRow.started_at,
            endedAt: sessionRow.ended_at,
            durationMinutes: isNaN(durMin) ? 25 : durMin,
            totalSets: setsRows.length,
            exercises: Array.from(exMap.values()),
          });
        }
      } catch {
        // Fallback gracefully
      } finally {
        setIsLoading(false);
      }
    }

    resolveSummary();
    loadRecentSessions();
  }, [lastCompletedSummary]);

  const formatCompletionTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleGoProgress = () => {
    router.replace('/(tabs)/progress');
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Celebratory Hero Header */}
        <View style={styles.celebrationBox}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          <Text style={styles.completionHeading}>Workout Completed!</Text>
          <Text style={styles.completionSubtitle}>
            Outstanding consistency! Your completed sets and volume are saved directly to your local health database.
          </Text>
        </View>

        {/* Overview Stats Card */}
        <SurfaceCard elevated style={styles.overviewCard}>
          <Text style={styles.sessionTitle}>{summary?.title ?? 'Full-Body Workout'}</Text>
          <Text style={styles.completedTimestamp}>
            Finished at {formatCompletionTime(summary?.endedAt)} • {summary?.durationMinutes ?? 25} minutes
          </Text>

          <View style={styles.statGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{summary?.exercises.length ?? 0}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{summary?.totalSets ?? 0}</Text>
              <Text style={styles.statLabel}>Sets Logged</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{summary?.durationMinutes ?? 25}m</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
          </View>
        </SurfaceCard>

        {/* Detailed Exercise & Set Breakdown */}
        <Text style={styles.sectionHeading}>Logged Exercise Performance:</Text>

        {summary && summary.exercises.length > 0 ? (
          summary.exercises.map((ex, exIdx) => (
            <SurfaceCard key={exIdx} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseNumberPill}>#{exIdx + 1}</Text>
                <Text style={styles.exerciseName}>{ex.name}</Text>
              </View>

              <View style={styles.setsList}>
                {ex.sets.map((st, setIdx) => (
                  <View key={setIdx} style={styles.setRow}>
                    <Text style={styles.setIndexLabel}>Set {setIdx + 1}</Text>
                    <Text style={styles.setMetric}>
                      {st.weightKg > 0 ? `${st.weightKg} kg × ` : 'Bodyweight × '}
                      <Text style={styles.setReps}>{st.reps} reps</Text>
                    </Text>
                    {st.rpe ? (
                      <Text style={styles.setRpe}>RPE {st.rpe}</Text>
                    ) : (
                      <Text style={styles.checkGlyph}>✓</Text>
                    )}
                  </View>
                ))}
              </View>
            </SurfaceCard>
          ))
        ) : (
          <SurfaceCard style={styles.exerciseCard}>
            <Text style={styles.emptyText}>Session logged successfully.</Text>
          </SurfaceCard>
        )}

        {/* Navigation Action Buttons */}
        <View style={styles.actionButtonsCol}>
          <Button
            title="Return to Dashboard ⌂"
            onPress={handleGoHome}
            style={styles.homeBtn}
          />

          <Button
            title="View Full Progress History 📈"
            variant="outline"
            onPress={handleGoProgress}
            style={styles.progressBtn}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  celebrationBox: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  trophyEmoji: {
    fontSize: 54,
    marginBottom: 8,
  },
  completionHeading: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  completionSubtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  overviewCard: {
    marginVertical: 12,
    backgroundColor: '#0F2318',
    borderColor: '#1D4530',
  },
  sessionTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  completedTimestamp: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 14,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1D4530',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeading: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginVertical: 12,
  },
  exerciseCard: {
    marginBottom: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 8,
  },
  exerciseNumberPill: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  exerciseName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  setsList: {
    gap: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161F1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  setIndexLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  setMetric: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  setReps: {
    color: theme.colors.textPrimary,
    fontWeight: '700',
  },
  setRpe: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  checkGlyph: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  actionButtonsCol: {
    marginTop: 18,
    gap: 12,
  },
  homeBtn: {
    width: '100%',
  },
  progressBtn: {
    width: '100%',
  },
});
