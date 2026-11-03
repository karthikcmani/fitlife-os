import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Header } from '../../src/components/ui/Header';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { MetricChip } from '../../src/components/ui/MetricChip';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { useVitalsStore } from '../../src/store/vitalsStore';
import { theme } from '../../src/theme';
import {
  calculateBmrMifflinStJeor,
  calculateTdee,
  calculateTargetCalories,
  calculateMacronutrients,
  calculateRecoveryScore,
  calculateTotalWorkoutVolume,
} from '../../src/domain';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { recentSessions, activeSession, loadRecentSessions } = useWorkoutStore();
  const { dailyTotals, loadTodayNutrition } = useNutritionStore();
  const { todayWaterMl, habits, completedHabitIds, recentSleep, loadVitals } = useVitalsStore();

  const [dateStr] = useState(new Date().toISOString().split('T')[0]!);

  const userId = profile?.userId ?? 'local_user';

  useEffect(() => {
    loadRecentSessions();
    loadTodayNutrition(userId, dateStr);
    loadVitals(userId, dateStr);
  }, [userId, dateStr]);

  // Physiological Target Calculations (Derived from Profile)
  const bmr = profile
    ? calculateBmrMifflinStJeor({
        weightKg: profile.currentWeightKg,
        heightCm: profile.heightCm,
        ageYears: 26, // Default or computed from DOB
        gender: profile.gender === 'female' ? 'female' : 'male',
      })
    : 1700;

  const tdee = profile ? calculateTdee(bmr, profile.activityLevel) : 2400;

  const targetCalorieResult = profile
    ? calculateTargetCalories({
        tdee,
        goal: profile.primaryGoal,
        gender: profile.gender === 'female' ? 'female' : 'male',
      })
    : { targetCalories: 2000, isCappedForSafety: false };

  const macroTargets = profile
    ? calculateMacronutrients({
        targetCalories: targetCalorieResult.targetCalories,
        weightKg: profile.currentWeightKg,
        goal: profile.primaryGoal,
      })
    : { proteinG: 140, carbsG: 220, fatG: 55, fiberG: 28 };

  // Sleep Recovery
  const recovery = recentSleep
    ? calculateRecoveryScore({
        durationMinutes: recentSleep.durationMinutes,
        subjectiveQuality: recentSleep.subjectiveQuality as any,
      })
    : null;

  // Today's total workout volume
  const todaySession = recentSessions.find((s) => s.startedAt.startsWith(dateStr));
  const todayVolume = todaySession?.sets
    ? calculateTotalWorkoutVolume(todaySession.sets)
    : 0;

  // Habit completion rate
  const habitCompletionRate =
    habits.length > 0 ? Math.round((completedHabitIds.length / habits.length) * 100) : 0;

  return (
    <ScreenContainer>
      <Header
        title={profile ? `Hi, ${profile.displayName}` : 'FITLIFE OS'}
        subtitle={`Today • ${new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`}
      />

      {/* 1. Daily Calorie & Macronutrient Intelligence Card */}
      <SurfaceCard elevated>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Nutrition & Energy</Text>
          <Text style={styles.calorieHighlight}>
            {dailyTotals.calories} / {targetCalorieResult.targetCalories} kcal
          </Text>
        </View>

        <ProgressBar
          current={dailyTotals.calories}
          target={targetCalorieResult.targetCalories}
          color={theme.colors.primary}
          height={10}
        />

        <View style={styles.macroRow}>
          <MetricChip
            label="Protein"
            value={`${dailyTotals.proteinG}g`}
            unit={`/ ${macroTargets.proteinG}g`}
            accentColor={theme.colors.primary}
          />
          <MetricChip
            label="Carbs"
            value={`${dailyTotals.carbsG}g`}
            unit={`/ ${macroTargets.carbsG}g`}
          />
          <MetricChip
            label="Fat"
            value={`${dailyTotals.fatG}g`}
            unit={`/ ${macroTargets.fatG}g`}
          />
        </View>
      </SurfaceCard>

      {/* 2. Today's Workout Status */}
      <SurfaceCard>
        <Text style={styles.cardTitle}>Workout Activity</Text>
        {activeSession ? (
          <View style={styles.activeWorkoutBox}>
            <Text style={styles.activeWorkoutTitle}>In Progress: {activeSession.title}</Text>
            <Button
              title="Continue Workout"
              onPress={() => router.push('/(tabs)/workout')}
              style={styles.actionBtn}
            />
          </View>
        ) : todaySession ? (
          <View>
            <Text style={styles.completedText}>Completed: {todaySession.title}</Text>
            <View style={styles.metricsRow}>
              <MetricChip
                label="Volume"
                value={`${todayVolume}`}
                unit="kg"
                accentColor={theme.colors.warning}
              />
              <MetricChip label="Sets Logged" value={todaySession.sets?.length ?? 0} />
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.emptyText}>No workout recorded yet today.</Text>
            <Button
              title="Start New Workout"
              onPress={() => router.push('/(tabs)/workout')}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        )}
      </SurfaceCard>

      {/* 3. Hydration & Habits Card */}
      <View style={styles.dualCardRow}>
        <SurfaceCard style={styles.halfCard}>
          <Text style={styles.miniCardTitle}>Hydration</Text>
          <Text style={[styles.largeMetric, { color: theme.colors.secondary }]}>
            {(todayWaterMl / 1000).toFixed(1)}L
          </Text>
          <Text style={styles.subMetric}>
            Target: {((profile?.dailyWaterTargetMl ?? 3000) / 1000).toFixed(1)}L
          </Text>
          <ProgressBar
            current={todayWaterMl}
            target={profile?.dailyWaterTargetMl ?? 3000}
            color={theme.colors.secondary}
            height={6}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.halfCard}>
          <Text style={styles.miniCardTitle}>Habits</Text>
          <Text style={[styles.largeMetric, { color: theme.colors.accent }]}>
            {completedHabitIds.length}/{habits.length}
          </Text>
          <Text style={styles.subMetric}>{habitCompletionRate}% Completed</Text>
          <ProgressBar
            current={completedHabitIds.length}
            target={habits.length > 0 ? habits.length : 1}
            color={theme.colors.accent}
            height={6}
          />
        </SurfaceCard>
      </View>

      {/* 4. Sleep & Nervous System Recovery */}
      <SurfaceCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Sleep & Recovery Index</Text>
          {recovery ? (
            <Text
              style={[
                styles.recoveryBadge,
                recovery.rating === 'optimal'
                  ? { color: theme.colors.primary }
                  : { color: theme.colors.warning },
              ]}
            >
              {recovery.score}/100 • {recovery.rating.toUpperCase()}
            </Text>
          ) : null}
        </View>

        {recovery ? (
          <View>
            <Text style={styles.bodyText}>
              Duration: {recovery.durationHours} hours | Subjective Quality: {recentSleep?.subjectiveQuality}/5
            </Text>
            {recovery.recommendations.map((rec, i) => (
              <Text key={i} style={styles.recommendationText}>
                • {rec}
              </Text>
            ))}
          </View>
        ) : (
          <View>
            <Text style={styles.emptyText}>No sleep recorded for last night.</Text>
            <Button
              title="Log Sleep"
              onPress={() => router.push('/(tabs)/vitals')}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        )}
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  calorieHighlight: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  activeWorkoutBox: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  activeWorkoutTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  actionBtn: {
    marginTop: theme.spacing.md,
  },
  completedText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  dualCardRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  halfCard: {
    flex: 1,
  },
  miniCardTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  largeMetric: {
    ...theme.typography.metricLarge,
    marginVertical: 4,
  },
  subMetric: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  recoveryBadge: {
    ...theme.typography.captionBold,
  },
  bodyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  recommendationText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
