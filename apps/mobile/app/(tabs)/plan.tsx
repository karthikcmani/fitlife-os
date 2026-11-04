import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coachStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { useVitalsStore } from '../../src/store/vitalsStore';
import { theme } from '../../src/theme';
import { PlanExerciseItem, PlanMealSuggestion } from '../../src/types';
import { getLocalDateString } from '../../src/domain';
import { WorkoutAvatar } from '../../src/components/coach/WorkoutAvatar';

export default function MyPlanScreen() {
  const { profile } = useAuthStore();
  const {
    activePlan,
    loadActivePlan,
    logPlanMealAsEaten,
    activeExerciseIndex,
    setActiveExerciseIndex,
    isRestTimerActive,
    restTimerSecondsLeft,
    startRestTimer,
    stopRestTimer,
    decrementRestTimer,
  } = useCoachStore();

  const {
    activeSession,
    activeSets,
    startWorkout,
    addSetToActive,
    finishWorkout,
    cancelWorkout,
    loadRecentSessions,
  } = useWorkoutStore();

  const { dailyTotals, loadTodayNutrition } = useNutritionStore();
  const { todayWaterMl } = useVitalsStore();

  const [activeTab, setActiveTab] = useState<'workout' | 'nutrition'>('workout');
  const [dateStr] = useState(() => getLocalDateString());

  // Set Logging Inputs
  const [inputWeight, setInputWeight] = useState('0');
  const [inputReps, setInputReps] = useState('10');

  // Alternative Swap Modal/State
  const [customExerciseOverride, setCustomExerciseOverride] = useState<Record<number, PlanExerciseItem>>({});

  const userId = profile?.userId ?? 'local_user';

  useEffect(() => {
    loadActivePlan(userId);
    loadRecentSessions();
    loadTodayNutrition(userId, dateStr);
  }, [userId, dateStr]);

  // Rest Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRestTimerActive && restTimerSecondsLeft > 0) {
      interval = setInterval(() => {
        decrementRestTimer();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRestTimerActive, restTimerSecondsLeft]);

  // Today's Routine from the plan
  const todayRoutine = activePlan?.weeklyWorkouts?.[0];
  const routineExercises = todayRoutine?.exercises ?? [];

  // Current Exercise in the stepper
  const rawExercise = routineExercises[activeExerciseIndex];
  const currentExercise: PlanExerciseItem | undefined =
    customExerciseOverride[activeExerciseIndex] || rawExercise;

  // Active sets logged for this specific exercise
  const currentExerciseSets = activeSets.filter(
    (s) => s.exerciseId === (currentExercise?.exerciseId ?? '')
  );

  // Set default weight/reps when switching exercise
  useEffect(() => {
    if (currentExercise) {
      const isBodyweight =
        currentExercise.equipmentRequired.toLowerCase().includes('bodyweight') ||
        currentExercise.equipmentRequired.toLowerCase().includes('none');
      setInputWeight(isBodyweight ? '0' : '10');
      setInputReps(currentExercise.recommendedReps.includes('12') ? '12' : '10');
    }
  }, [currentExercise?.exerciseId]);

  // Start guided session
  const handleStartSession = async () => {
    if (!todayRoutine) return;
    await startWorkout(todayRoutine.title, userId);
    setActiveExerciseIndex(0);
  };

  // Log completed set
  const handleCompleteSet = async () => {
    if (!currentExercise) return;
    const w = parseFloat(inputWeight) || 0;
    const r = parseInt(inputReps, 10) || 10;

    await addSetToActive(currentExercise.exerciseId, w, r);

    // Trigger rest timer
    const restSec = currentExercise.recommendedRestSec || 60;
    startRestTimer(restSec);
  };

  // Swap with alternative
  const handleSwapAlternative = (altName: string) => {
    if (!currentExercise) return;
    const swapped: PlanExerciseItem = {
      ...currentExercise,
      name: altName,
      exerciseId: `custom_${altName.toLowerCase().replace(/\s+/g, '_')}`,
      whyIncluded: `Alternative movement selected for ${altName}.`,
    };
    setCustomExerciseOverride({
      ...customExerciseOverride,
      [activeExerciseIndex]: swapped,
    });
    Alert.alert('Exercise Swapped', `Replaced with ${altName}.`);
  };

  // Next / Previous Exercise Stepper
  const handleNextExercise = () => {
    if (activeExerciseIndex < routineExercises.length - 1) {
      setActiveExerciseIndex(activeExerciseIndex + 1);
      stopRestTimer();
    }
  };

  const handlePrevExercise = () => {
    if (activeExerciseIndex > 0) {
      setActiveExerciseIndex(activeExerciseIndex - 1);
      stopRestTimer();
    }
  };

  // Finish Workout
  const handleFinishWorkout = async () => {
    await finishWorkout();
    stopRestTimer();
    Alert.alert('🎉 Workout Finished!', 'Great job! Your completed session and sets have been saved.');
  };

  return (
    <ScreenContainer>
      {/* HEADER WITH SEGMENT TOGGLE */}
      <View style={styles.topSegmentWrap}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'workout' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('workout')}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'workout' && styles.segmentBtnTextActive]}>
            🏋️ Workout Coaching
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'nutrition' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('nutrition')}
        >
          <Text style={[styles.segmentBtnText, activeTab === 'nutrition' && styles.segmentBtnTextActive]}>
            🍛 Nutrition Plan
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ============================================================== */}
        {/* SECTION 1: WORKOUT COACHING                                     */}
        {/* ============================================================== */}
        {activeTab === 'workout' && (
          <View>
            {/* INACTIVE WORKOUT STATE: PREVIEW ROUTINE */}
            {!activeSession ? (
              <SurfaceCard elevated>
                <View style={styles.badgeRow}>
                  <Text style={styles.goalTag}>🎯 {activePlan?.goalTitle ?? 'Personal Routine'}</Text>
                  <Text style={styles.durationTag}>⏱️ {todayRoutine?.estimatedMinutes ?? 30} Mins</Text>
                </View>

                <Text style={styles.routineHeading}>{todayRoutine?.title ?? 'Full-Body Foundation'}</Text>
                <Text style={styles.routineSubhead}>
                  Tailored for {profile?.trainingEnvironment ?? 'home'} using{' '}
                  {profile?.equipmentInventory?.includes('none')
                    ? 'bodyweight movements only'
                    : profile?.equipmentInventory?.join(', ') || 'available equipment'}
                  .
                </Text>

                {/* 5-Min Warmup Card */}
                <View style={styles.warmupBox}>
                  <Text style={styles.warmupTitle}>🔥 5-Minute Warm-Up Routine</Text>
                  <Text style={styles.warmupStep}>1. Arm circles & shoulder rolls (30 seconds each direction)</Text>
                  <Text style={styles.warmupStep}>2. Bodyweight air squats (10 slow controlled reps)</Text>
                  <Text style={styles.warmupStep}>3. Torso twists and cat-cow spine mobility</Text>
                </View>

                <Text style={styles.exerciseListHeader}>Today’s Exercises ({routineExercises.length}):</Text>
                {routineExercises.map((ex, idx) => (
                  <View key={idx} style={styles.previewExerciseRow}>
                    <Text style={styles.exIndexCircle}>{idx + 1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewExName}>{ex.name}</Text>
                      <Text style={styles.previewExDetail}>
                        {ex.recommendedSets} sets × {ex.recommendedReps} • {ex.targetedMusclesSimple}
                      </Text>
                    </View>
                  </View>
                ))}

                <Button
                  title="Begin Guided Session 🚀"
                  onPress={handleStartSession}
                  style={styles.startRoutineBtn}
                />
              </SurfaceCard>
            ) : (
              /* ACTIVE WORKOUT COACHING STEPPER */
              <View>
                {/* Stepper Progress Bar */}
                <View style={styles.stepperProgressRow}>
                  <Text style={styles.stepperCountText}>
                    Exercise {activeExerciseIndex + 1} of {routineExercises.length}
                  </Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      onPress={handlePrevExercise}
                      disabled={activeExerciseIndex === 0}
                      style={[styles.stepNavBtn, activeExerciseIndex === 0 && { opacity: 0.4 }]}
                    >
                      <Text style={styles.stepNavText}>← Prev</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleNextExercise}
                      disabled={activeExerciseIndex === routineExercises.length - 1}
                      style={[
                        styles.stepNavBtn,
                        activeExerciseIndex === routineExercises.length - 1 && { opacity: 0.4 },
                      ]}
                    >
                      <Text style={styles.stepNavText}>Next →</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {currentExercise && (
                  <SurfaceCard elevated style={styles.coachExerciseCard}>
                    {/* Visual Animated Avatar Demonstration Area */}
                    <WorkoutAvatar
                      exerciseId={currentExercise.exerciseId}
                      category={currentExercise.category ?? 'bodyweight'}
                      exerciseName={currentExercise.name}
                    />

                    <Text style={styles.currentExerciseTitle}>{currentExercise.name}</Text>
                    <Text style={styles.targetMusclesPill}>
                      💪 Muscles: {currentExercise.targetedMusclesSimple}
                    </Text>

                    {/* Why Included */}
                    <View style={styles.coachingCallout}>
                      <Text style={styles.calloutTitle}>💡 Why this exercise is included:</Text>
                      <Text style={styles.calloutText}>{currentExercise.whyIncluded}</Text>
                    </View>

                    {/* Starting Position */}
                    <Text style={styles.cueHeading}>📍 Starting Position:</Text>
                    <Text style={styles.cueText}>{currentExercise.startingPosition}</Text>

                    {/* Step-by-Step Technique Instructions */}
                    <Text style={styles.cueHeading}>🎯 Step-by-Step Movement:</Text>
                    {currentExercise.instructions.map((stepText, idx) => (
                      <View key={idx} style={styles.stepBulletRow}>
                        <Text style={styles.stepNum}>{idx + 1}.</Text>
                        <Text style={styles.stepBulletText}>{stepText}</Text>
                      </View>
                    ))}

                    {/* Breathing Guidance */}
                    <View style={styles.breathingCard}>
                      <Text style={styles.breathingTitle}>🫁 Breathing Guidance:</Text>
                      <Text style={styles.breathingText}>{currentExercise.breathingGuidance}</Text>
                    </View>

                    {/* Common Mistakes */}
                    <View style={styles.mistakeCard}>
                      <Text style={styles.mistakeTitle}>⚠️ Common Mistakes to Avoid:</Text>
                      {currentExercise.commonMistakes.map((mistake, idx) => (
                        <Text key={idx} style={styles.mistakeText}>• {mistake}</Text>
                      ))}
                    </View>

                    {/* Alternatives Area */}
                    <View style={styles.altWrap}>
                      {currentExercise.easierAlternative && (
                        <TouchableOpacity
                          style={styles.altButton}
                          onPress={() => handleSwapAlternative(currentExercise.easierAlternative!)}
                        >
                          <Text style={styles.altBtnText}>
                            ⬇️ Swap with Easier: {currentExercise.easierAlternative}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {currentExercise.harderAlternative && (
                        <TouchableOpacity
                          style={styles.altButton}
                          onPress={() => handleSwapAlternative(currentExercise.harderAlternative!)}
                        >
                          <Text style={styles.altBtnText}>
                            ⬆️ Swap with Harder: {currentExercise.harderAlternative}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Rest Countdown Timer (if active) */}
                    {isRestTimerActive && (
                      <View style={styles.restTimerCard}>
                        <Text style={styles.restTimerLabel}>⏱️ REST BETWEEN SETS</Text>
                        <Text style={styles.restTimerCount}>{restTimerSecondsLeft}s</Text>
                        <TouchableOpacity style={styles.skipTimerBtn} onPress={stopRestTimer}>
                          <Text style={styles.skipTimerText}>Skip Rest</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Sets Completed Summary */}
                    <View style={styles.setsSummaryBox}>
                      <Text style={styles.setsSummaryTitle}>
                        Sets Completed: {currentExerciseSets.length} of {currentExercise.recommendedSets}
                      </Text>
                      {currentExerciseSets.map((s, idx) => (
                        <View key={idx} style={styles.completedSetRow}>
                          <Text style={styles.setRowCheck}>✓ Set {idx + 1}:</Text>
                          <Text style={styles.setRowData}>
                            {s.weightKg} kg × {s.reps} reps
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Real Set Logging Inputs */}
                    <Text style={styles.logSetHeader}>
                      Log Set {currentExerciseSets.length + 1} of {currentExercise.recommendedSets}:
                    </Text>
                    <View style={styles.twoCol}>
                      <View style={styles.col}>
                        <Text style={styles.inputMiniLabel}>Weight (kg)</Text>
                        <TextInput
                          style={styles.setNumericInput}
                          value={inputWeight}
                          onChangeText={setInputWeight}
                          keyboardType="numeric"
                        />
                      </View>
                      <View style={styles.col}>
                        <Text style={styles.inputMiniLabel}>Reps Completed</Text>
                        <TextInput
                          style={styles.setNumericInput}
                          value={inputReps}
                          onChangeText={setInputReps}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>

                    <Button
                      title={`Complete Set ${currentExerciseSets.length + 1} ✓`}
                      onPress={handleCompleteSet}
                      style={styles.completeSetBtn}
                    />

                    {/* Navigation between exercises & Finish */}
                    <View style={styles.workoutActionRow}>
                      <Button
                        title="Finish Workout 🏆"
                        onPress={handleFinishWorkout}
                        style={{ flex: 2 }}
                      />
                      <Button
                        title="Cancel"
                        variant="outline"
                        onPress={cancelWorkout}
                        style={{ flex: 1 }}
                      />
                    </View>
                  </SurfaceCard>
                )}
              </View>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* SECTION 2: NUTRITION GUIDANCE WITH FAMILIAR PORTIONS           */}
        {/* ============================================================== */}
        {activeTab === 'nutrition' && (
          <View>
            {/* Calorie & Protein Targets */}
            <SurfaceCard elevated>
              <Text style={styles.routineHeading}>Today’s Nutrition Approach</Text>
              <Text style={styles.routineSubhead}>
                Practical eating plan designed for your goal. Portions are measured in everyday household units like cups, rotis, and bowls.
              </Text>

              <View style={styles.targetMacroGrid}>
                <View style={styles.macroCard}>
                  <Text style={styles.macroNumber}>{dailyTotals.calories}</Text>
                  <Text style={styles.macroLabel}>Calories Eaten</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroNumber}>{dailyTotals.proteinG}g</Text>
                  <Text style={styles.macroLabel}>Protein Logged</Text>
                </View>
                <View style={styles.macroCard}>
                  <Text style={styles.macroNumber}>{(todayWaterMl / 1000).toFixed(1)}L</Text>
                  <Text style={styles.macroLabel}>Water Drank</Text>
                </View>
              </View>
            </SurfaceCard>

            {/* Suggested Meals Checklist */}
            <Text style={styles.mealsHeader}>Suggested Meals for Today (Familiar Portions):</Text>
            {activePlan?.dailyMeals?.map((meal, idx) => (
              <SurfaceCard key={idx} elevated style={styles.mealCard}>
                <View style={styles.mealCardHeader}>
                  <Text style={styles.mealTypeTag}>{meal.mealType.toUpperCase()}</Text>
                  <Text style={styles.mealApproxTag}>
                    {meal.approxCalories} kcal • {meal.approxProteinG}g Protein
                  </Text>
                </View>

                <Text style={styles.mealCardTitle}>{meal.title}</Text>
                <Text style={styles.mealCardDesc}>{meal.description}</Text>

                {/* Familiar Portion Guide Box */}
                <View style={styles.portionGuideBox}>
                  <Text style={styles.portionGuideLabel}>🍽️ Familiar Portion:</Text>
                  <Text style={styles.portionGuideText}>{meal.portionGuide}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.mealActionRow}>
                  <TouchableOpacity
                    style={styles.ateThisBtn}
                    onPress={() => logPlanMealAsEaten(meal, userId)}
                  >
                    <Text style={styles.ateThisBtnText}>✓ I Ate This Meal</Text>
                  </TouchableOpacity>

                  {meal.alternatives && meal.alternatives.length > 0 && (
                    <TouchableOpacity
                      style={styles.replaceBtn}
                      onPress={() => {
                        const nextAlt = meal.alternatives![0];
                        Alert.alert('Alternative Option', nextAlt);
                      }}
                    >
                      <Text style={styles.replaceBtnText}>View Alternatives</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </SurfaceCard>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  topSegmentWrap: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: theme.colors.primary,
  },
  segmentBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  segmentBtnTextActive: {
    color: theme.colors.textInverse,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  goalTag: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 11,
  },
  durationTag: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  routineHeading: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  routineSubhead: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: theme.spacing.md,
  },
  warmupBox: {
    backgroundColor: '#1b281d',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  warmupTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  warmupStep: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  exerciseListHeader: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  previewExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    gap: 12,
  },
  exIndexCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.surfaceElevated,
    color: theme.colors.primary,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '700',
    fontSize: 12,
  },
  previewExName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  previewExDetail: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  startRoutineBtn: {
    marginTop: theme.spacing.lg,
  },
  stepperProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  stepperCountText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 12,
  },
  stepperControls: {
    flexDirection: 'row',
    gap: 8,
  },
  stepNavBtn: {
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepNavText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  coachExerciseCard: {
    padding: theme.spacing.md,
  },
  avatarDemoArea: {
    backgroundColor: '#0c1e13',
    height: 120,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#19432a',
  },
  avatarSilhouetteBox: {
    alignItems: 'center',
  },
  avatarGlyph: {
    fontSize: 42,
    marginBottom: 4,
  },
  avatarFormCue: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  currentExerciseTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  targetMusclesPill: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  coachingCallout: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  calloutTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  calloutText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  cueHeading: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginTop: 6,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  cueText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: theme.spacing.sm,
  },
  stepBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  stepNum: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    width: 18,
  },
  stepBulletText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  breathingCard: {
    backgroundColor: '#122533',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#00b4d8',
  },
  breathingTitle: {
    ...theme.typography.captionBold,
    color: '#90e0ef',
    fontSize: 11,
  },
  breathingText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  mistakeCard: {
    backgroundColor: '#2b1b17',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.danger,
  },
  mistakeTitle: {
    ...theme.typography.captionBold,
    color: '#f87171',
    fontSize: 11,
  },
  mistakeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  altWrap: {
    gap: 6,
    marginVertical: theme.spacing.sm,
  },
  altButton: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  altBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 12,
  },
  restTimerCard: {
    backgroundColor: '#3b280b',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginVertical: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
  },
  restTimerLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.warning,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  restTimerCount: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.warning,
    marginVertical: 4,
  },
  skipTimerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
  },
  skipTimerText: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 11,
  },
  setsSummaryBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginVertical: theme.spacing.sm,
  },
  setsSummaryTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  completedSetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  setRowCheck: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  setRowData: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  logSetHeader: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  col: {
    flex: 1,
  },
  inputMiniLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 2,
    fontSize: 11,
  },
  setNumericInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    padding: theme.spacing.sm,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '700',
  },
  completeSetBtn: {
    marginTop: theme.spacing.md,
  },
  workoutActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.lg,
  },
  targetMacroGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  macroNumber: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  macroLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  mealsHeader: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginVertical: theme.spacing.md,
  },
  mealCard: {
    marginBottom: theme.spacing.md,
  },
  mealCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealTypeTag: {
    ...theme.typography.captionBold,
    color: theme.colors.warning,
    fontSize: 10,
    backgroundColor: '#3b280b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mealApproxTag: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  mealCardTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  mealCardDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  portionGuideBox: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  portionGuideLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 11,
  },
  portionGuideText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
    marginTop: 2,
  },
  mealActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  ateThisBtn: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  ateThisBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.textInverse,
    fontSize: 12,
  },
  replaceBtn: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  replaceBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
});
