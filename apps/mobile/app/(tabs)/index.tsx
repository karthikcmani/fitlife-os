import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coachStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { useVitalsStore } from '../../src/store/vitalsStore';
import { theme } from '../../src/theme';
import { getLocalDateString } from '../../src/domain';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { activePlan, loadActivePlan, logPlanMealAsEaten } = useCoachStore();
  const { recentSessions, activeSession, loadRecentSessions, startWorkout } = useWorkoutStore();
  const { dailyTotals, loadTodayNutrition } = useNutritionStore();
  const { todayWaterMl, recentSleep, loadVitals, addWater, logSleep } = useVitalsStore();

  const [dateStr] = useState(() => getLocalDateString());
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);

  const userId = profile?.userId ?? 'local_user';
  const firstName = profile?.displayName ? profile.displayName.split(' ')[0] : 'Friend';

  const currentHour = new Date().getHours();
  const greeting =
    currentHour >= 5 && currentHour < 12
      ? 'Good morning'
      : currentHour >= 12 && currentHour < 17
      ? 'Good afternoon'
      : currentHour >= 17 && currentHour < 21
      ? 'Good evening'
      : 'Good night';

  useFocusEffect(
    useCallback(() => {
      loadRecentSessions();
      loadTodayNutrition(userId, dateStr);
      loadVitals(userId, dateStr);
      loadActivePlan(userId);
    }, [userId, dateStr])
  );

  // Today's completed workout check
  const todayCompletedSession = recentSessions.find(
    (s) => s.startedAt.startsWith(dateStr) && Boolean(s.endedAt) && s.sets && s.sets.some((st) => st.isCompleted)
  );

  const isWorkoutInProgress = Boolean(activeSession);

  // Today's suggested routine from the active coaching plan
  const todayRoutine = activePlan?.weeklyWorkouts?.[0];

  // Next suggested meal based on current hour
  const nextMeal = activePlan?.dailyMeals
    ? currentHour < 11
      ? activePlan.dailyMeals.find((m) => m.mealType === 'breakfast') || activePlan.dailyMeals[0]
      : currentHour < 16
      ? activePlan.dailyMeals.find((m) => m.mealType === 'lunch') || activePlan.dailyMeals[1]
      : currentHour < 20
      ? activePlan.dailyMeals.find((m) => m.mealType === 'snack') || activePlan.dailyMeals[2]
      : activePlan.dailyMeals.find((m) => m.mealType === 'dinner') || activePlan.dailyMeals[3]
    : null;

  // Hydration actuals
  const currentWaterMl = todayWaterMl;
  const targetWaterMl = profile?.dailyWaterTargetMl || 2500;

  // Streak calculation
  const completedSessionsThisWeek = recentSessions.filter(
    (s) => Boolean(s.endedAt) && s.sets && s.sets.some((st) => st.isCompleted)
  ).length;

  // Handle Quick Start / Resume Workout
  const handleWorkoutPrimaryAction = async () => {
    if (isWorkoutInProgress) {
      router.push('/(tabs)/plan');
      return;
    }
    if (todayCompletedSession) {
      Alert.alert('Session Complete', 'Great job! You have already finished your workout for today.');
      return;
    }
    if (todayRoutine) {
      await startWorkout(todayRoutine.title, userId);
      router.push('/(tabs)/plan');
    } else {
      router.push('/(tabs)/plan');
    }
  };

  // Handle Quick +250ml Water Sip
  const handleQuickWaterSip = async () => {
    await addWater(userId, 250);
  };

  // Handle Quick Meal Log
  const handleQuickLogMeal = async () => {
    if (!nextMeal) return;
    setIsLoggingMeal(true);
    try {
      await logPlanMealAsEaten(nextMeal, userId);
      Alert.alert('Meal Logged', `Logged "${nextMeal.title}" into today's nutrition.`);
    } catch {
      Alert.alert('Error', 'Failed to log meal.');
    } finally {
      setIsLoggingMeal(false);
    }
  };

  // One Next Action Context Prompt
  let nextActionHeadline = 'Start Today’s Routine';
  let nextActionCopy = 'Ready to move? Starting your workout builds your weekly habit.';
  let nextActionButtonText = 'Start Workout';
  let nextActionRoute = '/(tabs)/plan';

  if (isWorkoutInProgress) {
    nextActionHeadline = 'Workout in Progress';
    nextActionCopy = `You have an active session "${activeSession?.title}". Resume where you left off.`;
    nextActionButtonText = 'Resume Workout';
    nextActionRoute = '/(tabs)/plan';
  } else if (todayCompletedSession) {
    if (todayWaterMl < targetWaterMl) {
      nextActionHeadline = 'Post-Workout Rehydration';
      nextActionCopy = `You finished your training! Drink water to help muscle recovery.`;
      nextActionButtonText = '+250 ml Water';
    } else if (!recentSleep) {
      nextActionHeadline = 'Track Last Night’s Sleep';
      nextActionCopy = 'Log your sleep to see your recovery insight for tomorrow.';
      nextActionButtonText = 'Log Sleep';
      nextActionRoute = '/(tabs)/plan';
    } else {
      nextActionHeadline = 'All Set For Today!';
      nextActionCopy = 'You have completed all your core fitness tasks. Rest and recover.';
      nextActionButtonText = 'View Progress';
      nextActionRoute = '/(tabs)/progress';
    }
  }

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* COACH GREETING */}
        <View style={styles.greetingHeader}>
          <Text style={styles.greetingTitle}>
            {greeting}, {firstName} 👋
          </Text>
          <Text style={styles.greetingSubtitle}>
            {profile?.primaryGoal
              ? `Your focus is on ${profile.primaryGoal.replace('_', ' ')}. Let’s take one solid step forward today.`
              : 'Welcome to FITLIFE OS. Here is your daily fitness guidance.'}
          </Text>
        </View>

        {/* 1. TODAY'S FOCUS (HERO COACHING CARD) */}
        <SurfaceCard elevated style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <Text style={styles.heroBadge}>🎯 TODAY’S FOCUS</Text>
            {isWorkoutInProgress ? (
              <Text style={styles.statusLive}>● IN PROGRESS</Text>
            ) : todayCompletedSession ? (
              <Text style={styles.statusDone}>✓ COMPLETED</Text>
            ) : null}
          </View>

          <Text style={styles.heroTitle}>
            {isWorkoutInProgress
              ? activeSession?.title ?? 'Active Session'
              : todayCompletedSession
              ? 'Today’s Workout Finished!'
              : todayRoutine?.title ?? '30-Minute Bodyweight Routine'}
          </Text>

          <Text style={styles.heroDescription}>
            {isWorkoutInProgress
              ? 'Your workout session is active. Pick up where you left off with exercise guidance and timers.'
              : todayCompletedSession
              ? `Great job! You logged ${todayCompletedSession.sets?.filter((s) => s.isCompleted).length || 0} completed sets today.`
              : todayRoutine
              ? `${todayRoutine.estimatedMinutes} minutes • ${todayRoutine.exercises.length} exercises tailored for ${profile?.trainingEnvironment || 'home'}.`
              : 'Begin your personalized coaching routine designed for your equipment.'}
          </Text>

          <Button
            title={
              isWorkoutInProgress
                ? 'Resume Active Workout ⏱️'
                : todayCompletedSession
                ? 'View Workout Summary'
                : 'Start Today’s Workout 🚀'
            }
            onPress={handleWorkoutPrimaryAction}
            style={styles.heroButton}
          />
        </SurfaceCard>

        {/* 2. TODAY'S PLAN (4 CLEAN STATUS ROWS) */}
        <SurfaceCard elevated>
          <Text style={styles.cardHeaderTitle}>Today’s Plan</Text>

          {/* Workout Row */}
          <TouchableOpacity
            style={styles.planRow}
            onPress={() => router.push('/(tabs)/plan')}
          >
            <View style={styles.planIconBox}>
              <Text style={styles.planIcon}>🏋️</Text>
            </View>
            <View style={styles.planDetails}>
              <Text style={styles.planRowTitle}>Workout Session</Text>
              <Text style={styles.planRowSub}>
                {isWorkoutInProgress
                  ? 'Active in progress'
                  : todayCompletedSession
                  ? 'Completed for today'
                  : todayRoutine?.title ?? 'Scheduled for today'}
              </Text>
            </View>
            <Text
              style={[
                styles.planStatusBadge,
                todayCompletedSession
                  ? styles.badgeCompleted
                  : isWorkoutInProgress
                  ? styles.badgeInProgress
                  : styles.badgeScheduled,
              ]}
            >
              {todayCompletedSession ? 'Done' : isWorkoutInProgress ? 'Active' : 'Start'}
            </Text>
          </TouchableOpacity>

          {/* Meal Suggestion Row */}
          {nextMeal && (
            <View style={styles.planRow}>
              <View style={styles.planIconBox}>
                <Text style={styles.planIcon}>🍛</Text>
              </View>
              <View style={styles.planDetails}>
                <Text style={styles.planRowTitle}>Next Meal: {nextMeal.title}</Text>
                <Text style={styles.planRowSub}>{nextMeal.portionGuide}</Text>
              </View>
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={handleQuickLogMeal}
                disabled={isLoggingMeal}
              >
                <Text style={styles.quickActionBtnText}>I Ate This</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Hydration Row */}
          <View style={styles.planRow}>
            <View style={styles.planIconBox}>
              <Text style={styles.planIcon}>💧</Text>
            </View>
            <View style={styles.planDetails}>
              <Text style={styles.planRowTitle}>Hydration</Text>
              <Text style={styles.planRowSub}>
                {(todayWaterMl / 1000).toFixed(1)}L of {(targetWaterMl / 1000).toFixed(1)}L logged
              </Text>
            </View>
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleQuickWaterSip}>
              <Text style={styles.quickActionBtnText}>+250 ml</Text>
            </TouchableOpacity>
          </View>

          {/* Sleep Record Row */}
          <TouchableOpacity
            style={styles.planRow}
            onPress={() => router.push('/(tabs)/plan')}
          >
            <View style={styles.planIconBox}>
              <Text style={styles.planIcon}>🌙</Text>
            </View>
            <View style={styles.planDetails}>
              <Text style={styles.planRowTitle}>Sleep & Recovery</Text>
              <Text style={styles.planRowSub}>
                {recentSleep
                  ? `${(recentSleep.durationMinutes / 60).toFixed(1)} hours logged`
                  : 'No sleep record yet. Add rest.'}
              </Text>
            </View>
            <Text
              style={[
                styles.planStatusBadge,
                recentSleep ? styles.badgeCompleted : styles.badgeScheduled,
              ]}
            >
              {recentSleep ? 'Logged' : 'Log'}
            </Text>
          </TouchableOpacity>
        </SurfaceCard>

        {/* 3. YOUR PROGRESS (3 MEANINGFUL INDICATORS) */}
        <SurfaceCard elevated>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeaderTitle}>Your Progress</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
              <Text style={styles.linkText}>View Details →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressGrid}>
            <View style={styles.progressStatBox}>
              <Text style={styles.statNumber}>
                {todayCompletedSession ? '1' : '0'}/1
              </Text>
              <Text style={styles.statLabel}>Today's Workout</Text>
            </View>

            <View style={styles.progressStatBox}>
              <Text style={styles.statNumber}>
                {completedSessionsThisWeek}
              </Text>
              <Text style={styles.statLabel}>Sessions This Week</Text>
            </View>

            <View style={styles.progressStatBox}>
              <Text style={styles.statNumber}>
                {profile?.currentWeightKg ? `${profile.currentWeightKg}` : '--'}
              </Text>
              <Text style={styles.statLabel}>Current Weight (kg)</Text>
            </View>
          </View>
        </SurfaceCard>

        {/* 4. ONE NEXT ACTION CARD */}
        <SurfaceCard style={styles.nextActionCard}>
          <Text style={styles.nextActionLabel}>⚡ ONE NEXT ACTION</Text>
          <Text style={styles.nextActionTitle}>{nextActionHeadline}</Text>
          <Text style={styles.nextActionText}>{nextActionCopy}</Text>

          <Button
            title={nextActionButtonText}
            onPress={() => {
              if (nextActionButtonText.includes('Water')) {
                handleQuickWaterSip();
              } else {
                router.push(nextActionRoute as any);
              }
            }}
            variant="outline"
            style={styles.nextActionButton}
          />
        </SurfaceCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  greetingHeader: {
    marginBottom: theme.spacing.md,
  },
  greetingTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  greetingSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  heroCard: {
    borderColor: theme.colors.primaryDark ?? '#1b4332',
    backgroundColor: '#0a1d13',
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroBadge: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  statusLive: {
    ...theme.typography.captionBold,
    color: theme.colors.danger,
    fontSize: 11,
  },
  statusDone: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 11,
  },
  heroTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  heroDescription: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: theme.spacing.md,
  },
  heroButton: {
    marginTop: 4,
  },
  cardHeaderTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  linkText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  planIconBox: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planIcon: {
    fontSize: 18,
  },
  planDetails: {
    flex: 1,
  },
  planRowTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  planRowSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  planStatusBadge: {
    ...theme.typography.captionBold,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  badgeCompleted: {
    backgroundColor: '#1b4332',
    color: theme.colors.primary,
  },
  badgeInProgress: {
    backgroundColor: '#3d2508',
    color: theme.colors.warning,
  },
  badgeScheduled: {
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.textSecondary,
  },
  quickActionBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
  },
  quickActionBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 11,
  },
  progressGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  progressStatBox: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statNumber: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  statLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  nextActionCard: {
    backgroundColor: theme.colors.surfaceHighlight,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  nextActionLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  nextActionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
    marginTop: 2,
  },
  nextActionText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: theme.spacing.sm,
  },
  nextActionButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
});
