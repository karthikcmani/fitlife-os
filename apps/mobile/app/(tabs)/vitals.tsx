import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Header } from '../../src/components/ui/Header';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import { useVitalsStore } from '../../src/store/vitalsStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { calculateRecoveryScore } from '@fitlife/domain';

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

  const [dateStr] = useState(new Date().toISOString().split('T')[0]!);
  const [newHabitTitle, setNewHabitTitle] = useState('');

  // Sleep Logging State
  const [sleepHours, setSleepHours] = useState('7.5');
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(4);

  const userId = profile?.userId ?? 'local_user';
  const waterTarget = profile?.dailyWaterTargetMl ?? 3000;

  useEffect(() => {
    loadVitals(userId, dateStr);
  }, [userId, dateStr]);

  const handleCreateHabit = async () => {
    if (!newHabitTitle.trim()) return;
    await createHabit(userId, newHabitTitle.trim());
    setNewHabitTitle('');
  };

  const handleLogSleep = async () => {
    const hours = parseFloat(sleepHours) || 7.0;
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
          <Text style={styles.cardTitle}>Hydration Tracking</Text>
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
      </SurfaceCard>

      {/* 2. Daily Habits Checklist */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Daily Habits & Routines</Text>

        {habits.length === 0 ? (
          <Text style={styles.emptyText}>No habits created yet.</Text>
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
          <Text style={styles.cardTitle}>Sleep & Recovery</Text>
          {recovery ? (
            <Text style={styles.recoveryBadge}>
              Score: {recovery.score}/100 ({recovery.rating.toUpperCase()})
            </Text>
          ) : null}
        </View>

        <View style={styles.sleepInputRow}>
          <View style={styles.sleepCol}>
            <Text style={styles.inputLabel}>Sleep Duration (Hours):</Text>
            <TextInput
              style={styles.textInput}
              value={sleepHours}
              onChangeText={setSleepHours}
              keyboardType="numeric"
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
          title="Save Sleep Record"
          onPress={handleLogSleep}
          style={styles.sleepSaveBtn}
        />

        {recovery ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackTitle}>Physiological Readiness Insight:</Text>
            {recovery.recommendations.map((rec, idx) => (
              <Text key={idx} style={styles.feedbackText}>
                • {rec}
              </Text>
            ))}
          </View>
        ) : null}
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
