import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
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
  generateDailyPlan,
  getFriendlyAssistantAnswer,
  AssistantQuestionKey,
  AssistantAnswer,
  getLocalDateString,
  calculateAgeFromDob,
} from '../../src/domain';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const { recentSessions, activeSession, loadRecentSessions } = useWorkoutStore();
  const { dailyTotals, loadTodayNutrition } = useNutritionStore();
  const { todayWaterMl, habits, completedHabitIds, recentSleep, loadVitals, addWater } = useVitalsStore();

  const [dateStr] = useState(getLocalDateString());
  const [selectedQuestion, setSelectedQuestion] = useState<AssistantQuestionKey | null>(null);
  const [assistantModalVisible, setAssistantModalVisible] = useState(false);
  const [activeAnswer, setActiveAnswer] = useState<AssistantAnswer | null>(null);

  const userId = profile?.userId ?? 'local_user';

  useEffect(() => {
    loadRecentSessions();
    loadTodayNutrition(userId, dateStr);
    loadVitals(userId, dateStr);
  }, [userId, dateStr]);

  const userAge = profile?.dateOfBirth ? calculateAgeFromDob(profile.dateOfBirth) : 25;

  // Physiological Target Calculations (Derived strictly from Profile)
  const bmr = profile
    ? calculateBmrMifflinStJeor({
        weightKg: profile.currentWeightKg,
        heightCm: profile.heightCm,
        ageYears: userAge,
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
    : { targetCalories: 2000, isCappedForSafety: false, adjustmentPercentage: 0 };

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

  // Today's completed workout session (must have endedAt and completed sets)
  const todayCompletedSession = recentSessions.find(
    (s) => s.startedAt.startsWith(dateStr) && Boolean(s.endedAt) && s.sets && s.sets.some((st) => st.isCompleted)
  );
  const todayVolume = todayCompletedSession?.sets
    ? calculateTotalWorkoutVolume(todayCompletedSession.sets)
    : 0;

  const isWorkoutInProgress = Boolean(activeSession);

  // Calculate consecutive workout days based on actually completed workouts
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayDate = getLocalDateString(yesterday);
  const hasYesterdayWorkout = recentSessions.some(
    (s) => s.startedAt.startsWith(yesterdayDate) && Boolean(s.endedAt) && s.sets && s.sets.some((st) => st.isCompleted)
  );
  const consecutiveDays = (todayCompletedSession ? 1 : 0) + (hasYesterdayWorkout ? 1 : 0);

  // Generate Intelligent Daily Fitness Guide
  const dailyPlan = generateDailyPlan({
    profile: profile ?? {
      userId: 'local',
      displayName: 'Friend',
      heightCm: 170,
      currentWeightKg: 70,
      fitnessLevel: 'beginner',
      activityLevel: 'moderate',
      primaryGoal: 'general_fitness',
      trainingEnvironment: 'gym',
      availableTrainingDays: 3,
      preferredUnitSystem: 'metric',
      dailyWaterTargetMl: 2500,
      createdAt: '',
      updatedAt: '',
    },
    nutrition: {
      caloriesConsumed: dailyTotals.calories,
      targetCalories: targetCalorieResult.targetCalories,
      proteinConsumedG: dailyTotals.proteinG,
      targetProteinG: macroTargets.proteinG,
      carbsConsumedG: dailyTotals.carbsG,
      fatConsumedG: dailyTotals.fatG,
    },
    todayWaterMl,
    hasWorkoutLoggedToday: Boolean(todayCompletedSession),
    isWorkoutInProgress,
    consecutiveTrainingDays: consecutiveDays,
    recentSleepDurationMinutes: recentSleep?.durationMinutes,
    recentSleepQuality: recentSleep?.subjectiveQuality,
    completedHabitsCount: completedHabitIds.length,
    totalHabitsCount: habits.length,
  });

  const handleAskAssistant = (key: AssistantQuestionKey) => {
    setSelectedQuestion(key);
    const ans = getFriendlyAssistantAnswer(key, {
      profile: profile ?? {
        userId: 'local',
        displayName: 'Friend',
        heightCm: 170,
        currentWeightKg: 70,
        fitnessLevel: 'beginner',
        activityLevel: 'moderate',
        primaryGoal: 'general_fitness',
        trainingEnvironment: 'gym',
        availableTrainingDays: 3,
        preferredUnitSystem: 'metric',
        dailyWaterTargetMl: 2500,
        createdAt: '',
        updatedAt: '',
      },
      caloriesConsumed: dailyTotals.calories,
      targetCalories: targetCalorieResult.targetCalories,
      proteinConsumedG: dailyTotals.proteinG,
      targetProteinG: macroTargets.proteinG,
      todayWaterMl,
      targetWaterMl: profile?.dailyWaterTargetMl ?? 2500,
      recentSleepDurationMinutes: recentSleep?.durationMinutes,
      consecutiveTrainingDays: consecutiveDays,
    });
    setActiveAnswer(ans);
    setAssistantModalVisible(true);
  };

  const handleQuickWaterAdd = async () => {
    await addWater(userId, 250);
  };

  return (
    <ScreenContainer>
      <Header
        title={dailyPlan.greeting}
        subtitle={dailyPlan.goalSummary}
      />

      {/* 1. YOUR PLAN FOR TODAY (Prominent Daily Coach Guidance) */}
      <SurfaceCard elevated style={styles.planCard}>
        <View style={styles.planCardHeader}>
          <Text style={styles.planBadge}>TODAY’S PERSONAL GUIDANCE</Text>
          <TouchableOpacity
            style={styles.coachPill}
            onPress={() => handleAskAssistant('train_or_recover')}
          >
            <Text style={styles.coachPillText}>💬 Ask Coach</Text>
          </TouchableOpacity>
        </View>

        {/* 1.1 Workout or Recovery Recommendation */}
        <View style={styles.planSection}>
          <Text style={styles.planSectionTitle}>{dailyPlan.workout.headline}</Text>
          <Text style={styles.planText}>{dailyPlan.workout.subheadline}</Text>
          <View style={styles.whyBox}>
            <Text style={styles.whyLabel}>WHY THIS IS SUGGESTED</Text>
            <Text style={styles.whyText}>{dailyPlan.workout.whyThisIsSuggested}</Text>
          </View>
        </View>

        {/* 1.2 Nutrition & Protein Guidance */}
        <View style={styles.planSection}>
          <Text style={styles.planSectionTitle}>What to Eat Today</Text>
          <Text style={styles.planText}>{dailyPlan.nutrition.conversationalSummary}</Text>
          <Text style={styles.mealSuggestionText}>💡 {dailyPlan.nutrition.mealSuggestion}</Text>
          <View style={styles.whyBox}>
            <Text style={styles.whyLabel}>PROTEIN INSIGHT</Text>
            <Text style={styles.whyText}>{dailyPlan.nutrition.proteinTip}</Text>
          </View>
        </View>

        {/* 1.3 Hydration Target & Schedule */}
        <View style={styles.planSection}>
          <View style={styles.rowBetween}>
            <Text style={styles.planSectionTitle}>Daily Hydration Schedule</Text>
            <TouchableOpacity onPress={handleQuickWaterAdd} style={styles.quickWaterBtn}>
              <Text style={styles.quickWaterBtnText}>+250ml Glass</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.planText}>{dailyPlan.hydration.conversationalStatus}</Text>
          <Text style={styles.scheduleTip}>⏰ {dailyPlan.hydration.suggestedSchedule}</Text>
        </View>

        {/* 1.4 Helpful Next Action Button */}
        <View style={styles.nextActionBox}>
          <View style={{ flex: 1 }}>
            <Text style={styles.nextActionLabel}>NEXT RECOMMENDED ACTION</Text>
            <Text style={styles.nextActionTitle}>{dailyPlan.nextBestAction.title}</Text>
            <Text style={styles.nextActionReason}>{dailyPlan.nextBestAction.reason}</Text>
          </View>
          <Button
            title="Go"
            onPress={() => router.push(`/(tabs)/${dailyPlan.nextBestAction.screenTarget}` as any)}
            style={styles.nextActionBtn}
          />
        </View>
      </SurfaceCard>

      {/* 2. FRIENDLY FITNESS ASSISTANT QUICK PROMPTS (100% Offline) */}
      <SurfaceCard>
        <Text style={styles.cardTitle}>Friendly Fitness Assistant 🧠</Text>
        <Text style={styles.cardSubtitle}>
          Offline scientific answers tailored to your real data. Tap any question:
        </Text>

        <View style={styles.assistantPromptsList}>
          <TouchableOpacity
            style={styles.promptChip}
            onPress={() => handleAskAssistant('what_to_eat')}
          >
            <Text style={styles.promptChipText}>🥗 What should I eat today?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promptChip}
            onPress={() => handleAskAssistant('how_to_increase_protein')}
          >
            <Text style={styles.promptChipText}>🍗 How can I easily increase protein?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promptChip}
            onPress={() => handleAskAssistant('why_calorie_target')}
          >
            <Text style={styles.promptChipText}>🔢 Why is my calorie target this number?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promptChip}
            onPress={() => handleAskAssistant('missed_yesterday_workout')}
          >
            <Text style={styles.promptChipText}>🔄 What if I missed yesterday's workout?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promptChip}
            onPress={() => handleAskAssistant('not_progressing')}
          >
            <Text style={styles.promptChipText}>📈 Why is progress feeling slow?</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      {/* 3. Daily Nutrition & Macro Balance */}
      <SurfaceCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Nutrition & Energy Balance</Text>
          <Text style={styles.calorieHighlight}>
            {dailyTotals.calories} / {targetCalorieResult.targetCalories} kcal
          </Text>
        </View>

        <ProgressBar
          current={dailyTotals.calories}
          target={targetCalorieResult.targetCalories}
          color={theme.colors.primary}
          height={8}
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

        <Button
          title="Log Foods (Indian & Household Units)"
          variant="secondary"
          onPress={() => router.push('/(tabs)/nutrition')}
          style={{ marginTop: theme.spacing.md }}
        />
      </SurfaceCard>

      {/* 4. Workout Status */}
      <SurfaceCard>
        <Text style={styles.cardTitle}>Today’s Workout Activity</Text>
        {activeSession ? (
          <View style={styles.activeWorkoutBox}>
            <Text style={styles.activeWorkoutTitle}>In Progress: {activeSession.title}</Text>
            <Text style={styles.bodyText}>
              Started at {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {activeSession.sets?.length ?? 0} sets recorded
            </Text>
            <Button
              title="Resume Active Workout"
              onPress={() => router.push('/(tabs)/workout')}
              style={styles.actionBtn}
            />
          </View>
        ) : todayCompletedSession ? (
          <View>
            <Text style={styles.completedText}>Completed: {todayCompletedSession.title}</Text>
            <View style={styles.metricsRow}>
              <MetricChip
                label="Volume"
                value={`${todayVolume}`}
                unit="kg"
                accentColor={theme.colors.warning}
              />
              <MetricChip label="Sets Logged" value={todayCompletedSession.sets?.length ?? 0} />
            </View>
          </View>
        ) : (
          <View>
            <Text style={styles.emptyText}>
              {dailyPlan.workout.isRestDay
                ? 'Active recovery day. Prioritize light mobility and hydration.'
                : 'No workout logged yet today. Ready when you are!'}
            </Text>
            <Button
              title={dailyPlan.workout.isRestDay ? "Log Gentle Recovery" : "Begin Scheduled Workout"}
              onPress={() => router.push('/(tabs)/workout')}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        )}
      </SurfaceCard>

      {/* 5. Hydration & Habits Card */}
      <View style={styles.dualCardRow}>
        <SurfaceCard style={styles.halfCard}>
          <Text style={styles.miniCardTitle}>Hydration</Text>
          <Text style={[styles.largeMetric, { color: theme.colors.secondary }]}>
            {(todayWaterMl / 1000).toFixed(1)}L
          </Text>
          <Text style={styles.subMetric}>
            Target: {((profile?.dailyWaterTargetMl ?? 2500) / 1000).toFixed(1)}L
          </Text>
          <ProgressBar
            current={todayWaterMl}
            target={profile?.dailyWaterTargetMl ?? 2500}
            color={theme.colors.secondary}
            height={6}
          />
        </SurfaceCard>

        <SurfaceCard style={styles.halfCard}>
          <Text style={styles.miniCardTitle}>Daily Habits</Text>
          <Text style={[styles.largeMetric, { color: theme.colors.accent }]}>
            {completedHabitIds.length}/{habits.length}
          </Text>
          <Text style={styles.subMetric}>
            {habits.length > 0 ? Math.round((completedHabitIds.length / habits.length) * 100) : 0}% Done
          </Text>
          <ProgressBar
            current={completedHabitIds.length}
            target={habits.length > 0 ? habits.length : 1}
            color={theme.colors.accent}
            height={6}
          />
        </SurfaceCard>
      </View>

      {/* 6. Sleep & Nervous System Recovery */}
      <SurfaceCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Sleep & Recovery Index</Text>
          {recentSleep && recovery ? (
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

        {recentSleep && recovery ? (
          <View>
            <Text style={styles.bodyText}>
              Duration: {recovery.durationHours} hours | Subjective Quality: {recentSleep.subjectiveQuality}/5
            </Text>
            {recovery.recommendations.map((rec, i) => (
              <Text key={i} style={styles.recommendationText}>
                • {rec}
              </Text>
            ))}
          </View>
        ) : (
          <View>
            <Text style={styles.emptyText}>No sleep recorded yet.</Text>
            <Text style={styles.emptySubtext}>
              Not enough information to estimate recovery. Log your sleep in Vitals to see physiological readiness insights.
            </Text>
            <Button
              title="Log Sleep"
              onPress={() => router.push('/(tabs)/vitals')}
              variant="secondary"
              style={styles.actionBtn}
            />
          </View>
        )}
      </SurfaceCard>

      {/* OFFLINE ASSISTANT MODAL */}
      <Modal
        visible={assistantModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssistantModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{activeAnswer?.questionTitle ?? 'Fitness Assistant'}</Text>
              <TouchableOpacity onPress={() => setAssistantModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activeAnswer && (
                <>
                  <Text style={styles.answerSummary}>{activeAnswer.answerSummary}</Text>

                  <Text style={styles.answerSectionLabel}>WHY THIS WORKS</Text>
                  <Text style={styles.answerDetail}>{activeAnswer.detailedExplanation}</Text>

                  <Text style={styles.answerSectionLabel}>ACTION STEPS FOR YOU</Text>
                  {activeAnswer.practicalActionSteps.map((step, idx) => (
                    <View key={idx} style={styles.actionStepItem}>
                      <Text style={styles.stepNumber}>✓</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}

                  {activeAnswer.reassuranceNote ? (
                    <View style={styles.reassuranceBox}>
                      <Text style={styles.reassuranceText}>💚 {activeAnswer.reassuranceNote}</Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>

            <Button
              title="Got It"
              onPress={() => setAssistantModalVisible(false)}
              style={{ marginTop: theme.spacing.md }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  planCard: {
    backgroundColor: '#16221c',
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderWidth: 1.5,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  planBadge: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  coachPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  coachPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  planSection: {
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: theme.spacing.md,
  },
  planSectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  planText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  mealSuggestionText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: 6,
    lineHeight: 18,
  },
  whyBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: 8,
  },
  whyLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    fontSize: 10,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  whyText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickWaterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.secondary,
  },
  quickWaterBtnText: {
    ...theme.typography.captionBold,
    color: '#000',
    fontSize: 11,
  },
  scheduleTip: {
    ...theme.typography.caption,
    color: theme.colors.secondary,
    marginTop: 4,
  },
  nextActionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  nextActionLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 10,
  },
  nextActionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  nextActionReason: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 1,
  },
  nextActionBtn: {
    minHeight: 40,
    paddingHorizontal: 18,
  },
  cardTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  assistantPromptsList: {
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  promptChipText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
  },
  calorieHighlight: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  activeWorkoutBox: {
    marginVertical: theme.spacing.sm,
  },
  activeWorkoutTitle: {
    ...theme.typography.h3,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  completedText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginVertical: theme.spacing.sm,
  },
  emptySubtext: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: theme.spacing.sm,
  },
  dualCardRow: {
    flexDirection: 'row',
    gap: 12,
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
    ...theme.typography.h1,
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
    marginBottom: theme.spacing.sm,
  },
  recommendationText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  modalClose: {
    fontSize: 20,
    color: theme.colors.textMuted,
    padding: 8,
  },
  answerSummary: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: theme.spacing.md,
  },
  answerSectionLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: theme.spacing.md,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  answerDetail: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  actionStepItem: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  stepNumber: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  stepText: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  reassuranceBox: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  reassuranceText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    fontSize: 13,
  },
});
