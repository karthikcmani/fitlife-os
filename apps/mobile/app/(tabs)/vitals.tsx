import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Header } from '../../src/components/ui/Header';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import { useVitalsStore } from '../../src/store/vitalsStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { calculateRecoveryScore, getLocalDateString } from '../../src/domain';

export default function VitalsScreen() {
  const { profile } = useAuthStore();
  const {
    todayWaterMl,
    habits,
    completedHabitIds,
    recentSleep,
    loadVitals,
    addWater,
    toggleHabit,
    createHabit,
    logSleep,
  } = useVitalsStore();

  const [dateStr] = useState(getLocalDateString());
  const [newHabitTitle, setNewHabitTitle] = useState('');

  // Sleep Logging State — MUST NOT be pre-populated with fake data
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [showEditSleep, setShowEditSleep] = useState(false);

  const userId = profile?.userId ?? 'local_user';
  const waterTarget = profile?.dailyWaterTargetMl ?? 2500;

  useEffect(() => {
    loadVitals(userId, dateStr);
  }, [userId, dateStr]);

  const handleCreateHabit = async () => {
    if (!newHabitTitle.trim()) return;
    await createHabit(userId, newHabitTitle.trim());
    setNewHabitTitle('');
  };

  const handleLogSleep = async () => {
    const hours = parseFloat(sleepHours);
    if (isNaN(hours) || hours <= 0 || hours > 24) {
      Alert.alert('Invalid Duration', 'Please enter a valid sleep duration between 0.5 and 24 hours (e.g. 7.5).');
      return;
    }

    if (!sleepQuality) {
      Alert.alert('Quality Rating Required', 'Please select how restful your sleep felt (rating 1 to 5).');
      return;
    }

    const durationMinutes = Math.round(hours * 60);
    const now = new Date();
    const bedtime = new Date(now.getTime() - durationMinutes * 60000).toISOString();

    await logSleep(userId, {
      sleepDate: dateStr,
      bedtime,
      wakeTime: now.toISOString(),
      durationMinutes,
      subjectiveQuality: sleepQuality,
      notes: 'Logged via FITLIFE OS Vitals Tracker',
    });

    setSleepHours('');
    setSleepQuality(null);
    setShowEditSleep(false);
    Alert.alert('Sleep Saved', `Recorded ${hours} hours of sleep with quality ${sleepQuality}/5.`);
  };

  const recovery = recentSleep
    ? calculateRecoveryScore({
        durationMinutes: recentSleep.durationMinutes,
        subjectiveQuality: recentSleep.subjectiveQuality as any,
      })
    : null;

  return (
    <ScreenContainer>
      <Header
        title="Vitals & Habits"
        subtitle="Hydration • Daily Routines • Sleep Recovery"
      />

      {/* 1. Hydration Tracker */}
      <SurfaceCard elevated>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Daily Hydration</Text>
          <Text style={styles.waterHighlight}>
            {(todayWaterMl / 1000).toFixed(2)}L / {(waterTarget / 1000).toFixed(2)}L
          </Text>
        </View>

        <ProgressBar
          current={todayWaterMl}
          target={waterTarget}
          color={theme.colors.secondary}
          height={10}
        />

        <View style={styles.quickAddRow}>
          <Button
            title="+250 ml (Glass)"
            onPress={() => addWater(userId, 250)}
            variant="secondary"
            style={styles.quickAddBtn}
          />
          <Button
            title="+300 ml (Cup)"
            onPress={() => addWater(userId, 300)}
            variant="secondary"
            style={styles.quickAddBtn}
          />
          <Button
            title="+500 ml (Bottle)"
            onPress={() => addWater(userId, 500)}
            variant="secondary"
            style={styles.quickAddBtn}
          />
          <Button
            title="+1000 ml"
            onPress={() => addWater(userId, 1000)}
            variant="secondary"
            style={styles.quickAddBtn}
          />
        </View>

        {/* Suggested Hydration Schedule */}
        <View style={styles.hydrationScheduleBox}>
          <Text style={styles.scheduleTitle}>⏰ Recommended Daily Hydration Routine:</Text>
          <Text style={styles.scheduleItem}>• <Text style={{ fontWeight: '700' }}>Wake-up:</Text> 500ml to kickstart digestion and alert the nervous system.</Text>
          <Text style={styles.scheduleItem}>• <Text style={{ fontWeight: '700' }}>Before Meals:</Text> 250ml ~30 mins before food for smooth digestion.</Text>
          <Text style={styles.scheduleItem}>• <Text style={{ fontWeight: '700' }}>Training:</Text> 250-500ml sipped throughout your workout session.</Text>
          <Text style={styles.scheduleItem}>• <Text style={{ fontWeight: '700' }}>Evening:</Text> 250ml, tapering off 2 hours before bed for sound sleep.</Text>
        </View>
      </SurfaceCard>

      {/* 2. Daily Habits Checklist */}
      <SurfaceCard>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionHeading}>Daily Habits & Consistency</Text>
        </View>
        <Text style={styles.habitEncourageText}>
          Consistency beats intensity. Missing a day is completely normal—just aim for progress over perfection!
        </Text>

        {habits.length === 0 ? (
          <Text style={styles.emptyText}>No habits created yet. Start with simple goals like "Drink 2L water" or "10-minute walk".</Text>
        ) : (
          habits.map((habit) => {
            const isCompleted = completedHabitIds.includes(habit.id);
            return (
              <TouchableOpacity
                key={habit.id}
                style={[styles.habitRow, isCompleted && styles.completedHabitRow]}
                onPress={() => toggleHabit(userId, habit.id, dateStr)}
              >
                <View
                  style={[
                    styles.checkbox,
                    isCompleted && styles.activeCheckbox,
                  ]}
                >
                  {isCompleted ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text
                  style={[
                    styles.habitTitle,
                    isCompleted && styles.completedHabitTitle,
                  ]}
                >
                  {habit.title}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.addHabitRow}>
          <TextInput
            style={styles.addHabitInput}
            value={newHabitTitle}
            onChangeText={setNewHabitTitle}
            placeholder="Add habit (e.g. 10k Steps, Morning Stretch)..."
            placeholderTextColor={theme.colors.textMuted}
          />
          <Button
            title="Add"
            onPress={handleCreateHabit}
            style={styles.addHabitBtn}
          />
        </View>
      </SurfaceCard>

      {/* 3. Sleep & Recovery Log */}
      <SurfaceCard>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Sleep & Recovery Insight</Text>
          {recentSleep && recovery ? (
            <Text style={styles.recoveryBadge}>
              Score: {recovery.score}/100 ({recovery.rating.toUpperCase()})
            </Text>
          ) : (
            <Text style={styles.recoveryUnavailableBadge}>Recovery Unavailable</Text>
          )}
        </View>

        <Text style={styles.sleepGuideText}>
          Target: 7-9 hours nightly allows optimal muscle tissue repair and hormonal balance. FITLIFE OS calculates wellness readiness estimates; not intended for medical diagnosis.
        </Text>

        {recentSleep ? (
          /* Actual Saved Sleep Record */
          <View style={styles.savedRecordContainer}>
            <View style={styles.savedRecordRow}>
              <View>
                <Text style={styles.savedRecordLabel}>Recorded Sleep Duration:</Text>
                <Text style={styles.savedRecordValue}>
                  {(recentSleep.durationMinutes / 60).toFixed(1)} hours
                </Text>
              </View>
              <View>
                <Text style={styles.savedRecordLabel}>Quality Rating:</Text>
                <Text style={styles.savedRecordValue}>{recentSleep.subjectiveQuality} / 5</Text>
              </View>
            </View>

            {recovery ? (
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackTitle}>Coach Recovery Guidance:</Text>
                {recovery.recommendations.map((rec, idx) => (
                  <Text key={idx} style={styles.feedbackText}>
                    • {rec}
                  </Text>
                ))}
              </View>
            ) : null}

            <Button
              title={showEditSleep ? 'Cancel Editing' : 'Update Sleep Record'}
              variant="outline"
              onPress={() => {
                if (!showEditSleep) {
                  setSleepHours((recentSleep.durationMinutes / 60).toString());
                  setSleepQuality(recentSleep.subjectiveQuality as any);
                }
                setShowEditSleep(!showEditSleep);
              }}
              style={styles.editToggleBtn}
            />
          </View>
        ) : (
          /* Empty State: No Record */
          <View style={styles.emptySleepBox}>
            <Text style={styles.emptySleepTitle}>No sleep recorded yet.</Text>
            <Text style={styles.emptySleepSub}>
              Not enough information to estimate recovery. Log your actual sleep duration and quality below to see physiological readiness recommendations.
            </Text>
          </View>
        )}

        {/* Input Form: Shown either when no record exists, or user clicked Update */}
        {(!recentSleep || showEditSleep) && (
          <View style={styles.sleepFormBox}>
            <Text style={styles.formSectionTitle}>
              {recentSleep ? 'Edit Sleep Record:' : 'Log Last Night’s Sleep:'}
            </Text>

            <View style={styles.sleepInputRow}>
              <View style={styles.sleepCol}>
                <Text style={styles.inputLabel}>Sleep Duration (Hours):</Text>
                <TextInput
                  style={styles.textInput}
                  value={sleepHours}
                  onChangeText={setSleepHours}
                  keyboardType="numeric"
                  placeholder="e.g. 7.5"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.sleepCol}>
                <Text style={styles.inputLabel}>Quality (1 - 5):</Text>
                <View style={styles.qualityRow}>
                  {([1, 2, 3, 4, 5] as const).map((q) => (
                    <TouchableOpacity
                      key={q}
                      style={[
                        styles.qualityBtn,
                        sleepQuality === q && styles.activeQualityBtn,
                      ]}
                      onPress={() => setSleepQuality(q)}
                    >
                      <Text
                        style={[
                          styles.qualityText,
                          sleepQuality === q && styles.activeQualityText,
                        ]}
                      >
                        {q}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <Button
              title={recentSleep ? 'Save Updated Sleep Record' : 'Save Sleep Record'}
              onPress={handleLogSleep}
              style={styles.sleepSaveBtn}
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
  waterHighlight: {
    ...theme.typography.captionBold,
    color: theme.colors.secondary,
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.md,
  },
  quickAddBtn: {
    flex: 1,
    paddingHorizontal: 4,
  },
  hydrationScheduleBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.secondary,
    gap: 4,
  },
  scheduleTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.secondary,
    marginBottom: 4,
  },
  scheduleItem: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  habitEncourageText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  sleepGuideText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  sectionHeading: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 6,
  },
  completedHabitRow: {
    borderColor: theme.colors.primary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  activeCheckbox: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.textInverse,
    fontWeight: '700',
    fontSize: 14,
  },
  habitTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  completedHabitTitle: {
    textDecorationLine: 'line-through',
    color: theme.colors.textMuted,
  },
  addHabitRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.sm,
  },
  addHabitInput: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    fontSize: 14,
  },
  addHabitBtn: {
    paddingHorizontal: theme.spacing.md,
  },
  sleepInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  sleepCol: {
    flex: 1,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    fontSize: 16,
    textAlign: 'center',
  },
  qualityRow: {
    flexDirection: 'row',
    gap: 4,
  },
  qualityBtn: {
    flex: 1,
    height: 48,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeQualityBtn: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  qualityText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  activeQualityText: {
    color: '#FFFFFF',
  },
  sleepSaveBtn: {
    marginBottom: theme.spacing.md,
  },
  recoveryBadge: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  recoveryUnavailableBadge: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    backgroundColor: theme.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  savedRecordContainer: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  savedRecordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  savedRecordLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  savedRecordValue: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  editToggleBtn: {
    marginTop: theme.spacing.xs,
  },
  emptySleepBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  emptySleepTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptySleepSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  sleepFormBox: {
    backgroundColor: theme.colors.surface,
    paddingTop: theme.spacing.sm,
  },
  formSectionTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.secondary,
    marginBottom: theme.spacing.sm,
  },
  feedbackBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  feedbackTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  feedbackText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
