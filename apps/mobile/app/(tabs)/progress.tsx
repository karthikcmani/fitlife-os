import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Header } from '../../src/components/ui/Header';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useCoachStore } from '../../src/store/coachStore';
import { theme } from '../../src/theme';
import { getLocalDateString } from '../../src/domain';
import { getLocalDatabase } from '../../src/db/sqlite';

interface WeightEntry {
  date: string;
  weightKg: number;
}

export default function ProgressScreen() {
  const { profile, setProfile } = useAuthStore();
  const { recentSessions, loadRecentSessions } = useWorkoutStore();
  const { activePlan, loadActivePlan } = useCoachStore();

  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newWeightInput, setNewWeightInput] = useState(
    profile?.currentWeightKg ? String(profile.currentWeightKg) : ''
  );
  const [isSavingWeight, setIsSavingWeight] = useState(false);

  const userId = profile?.userId ?? 'local_user';
  const dateStr = getLocalDateString();

  useEffect(() => {
    loadRecentSessions();
    loadActivePlan(userId);
    loadWeightHistory();
  }, [userId]);

  const loadWeightHistory = async () => {
    try {
      const db = await getLocalDatabase();
      const rows = await db.getAllAsync<{ date: string; weight_kg: number }>(
        'SELECT date, weight_kg FROM body_measurements WHERE user_id = ? AND weight_kg IS NOT NULL ORDER BY date DESC LIMIT 10',
        [userId]
      );
      if (rows && rows.length > 0) {
        setWeightHistory(
          rows.map((r: { date: string; weight_kg: number }) => ({
            date: r.date,
            weightKg: r.weight_kg,
          }))
        );
      } else if (profile?.currentWeightKg) {
        setWeightHistory([
          {
            date: dateStr,
            weightKg: profile.currentWeightKg,
          },
        ]);
      }
    } catch {
      // Fallback to profile weight
      if (profile?.currentWeightKg) {
        setWeightHistory([
          {
            date: dateStr,
            weightKg: profile.currentWeightKg,
          },
        ]);
      }
    }
  };

  const handleSaveWeight = async () => {
    const val = parseFloat(newWeightInput);
    if (isNaN(val) || val < 25 || val > 350) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight between 25 kg and 350 kg.');
      return;
    }

    setIsSavingWeight(true);
    try {
      const db = await getLocalDatabase();
      const id = `bm_${Date.now()}`;
      await db.runAsync(
        `INSERT INTO body_measurements (id, user_id, date, weight_kg, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, date) DO UPDATE SET weight_kg = excluded.weight_kg, updated_at = excluded.updated_at`,
        [id, userId, dateStr, val, new Date().toISOString(), new Date().toISOString()]
      );

      if (profile) {
        await setProfile({
          ...profile,
          currentWeightKg: val,
          updatedAt: new Date().toISOString(),
        });
      }

      setShowLogModal(false);
      await loadWeightHistory();
      Alert.alert('Weight Saved', `Logged ${val} kg for today.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save weight.');
    } finally {
      setIsSavingWeight(false);
    }
  };

  // Filter completed sessions
  const completedSessions = recentSessions.filter(
    (s) => Boolean(s.endedAt) && s.sets && s.sets.some((st) => st.isCompleted)
  );

  const currentWeight = profile?.currentWeightKg ?? (weightHistory[0]?.weightKg || 0);
  const oldestRecordedWeight = weightHistory.length > 1
    ? weightHistory[weightHistory.length - 1].weightKg
    : currentWeight;

  const weightDiff = currentWeight - oldestRecordedWeight;

  const weeklyTargetSessions = profile?.availableTrainingDays ?? 3;
  const sessionsThisWeek = completedSessions.length;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Header
          title="Your Progress"
          subtitle="Real results built one step at a time"
        />

        {/* 1. Weight Tracker Card */}
        <SurfaceCard elevated style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardCategory}>BODY WEIGHT</Text>
              <Text style={styles.heroWeight}>
                {currentWeight > 0 ? `${currentWeight} kg` : 'Not recorded'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowLogModal(!showLogModal)}
              style={styles.logWeightBtn}
            >
              <Text style={styles.logWeightBtnText}>+ Log Weight</Text>
            </TouchableOpacity>
          </View>

          {/* Weight Delta Pill */}
          {weightHistory.length > 1 && (
            <View style={styles.deltaRow}>
              <Text
                style={[
                  styles.deltaText,
                  { color: weightDiff <= 0 ? theme.colors.primary : '#F59E0B' },
                ]}
              >
                {weightDiff > 0 ? `+${weightDiff.toFixed(1)} kg` : `${weightDiff.toFixed(1)} kg`}
              </Text>
              <Text style={styles.deltaSubtext}>since first recorded entry</Text>
            </View>
          )}

          {/* Inline Weight Logger */}
          {showLogModal && (
            <View style={styles.inlineLogBox}>
              <Text style={styles.logPrompt}>Enter Today's Weight (kg):</Text>
              <View style={styles.inputActionRow}>
                <TextInput
                  style={styles.weightInput}
                  value={newWeightInput}
                  onChangeText={setNewWeightInput}
                  keyboardType="numeric"
                  placeholder="e.g. 56.5"
                  placeholderTextColor={theme.colors.textMuted}
                />
                <Button
                  title="Save"
                  onPress={handleSaveWeight}
                  loading={isSavingWeight}
                  style={styles.saveWeightBtn}
                />
              </View>
            </View>
          )}

          {/* Simple Clean History Bar */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent Entries:</Text>
            {weightHistory.length === 0 ? (
              <Text style={styles.emptyNote}>No weight logged yet.</Text>
            ) : (
              <View style={styles.historyList}>
                {weightHistory.slice(0, 5).map((entry, idx) => (
                  <View key={idx} style={styles.historyRow}>
                    <Text style={styles.historyDate}>{entry.date}</Text>
                    <Text style={styles.historyValue}>{entry.weightKg} kg</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </SurfaceCard>

        {/* 2. Consistency Card */}
        <SurfaceCard elevated style={styles.card}>
          <Text style={styles.cardCategory}>WEEKLY CONSISTENCY</Text>
          <View style={styles.consistencyRow}>
            <View style={styles.streakBox}>
              <Text style={styles.streakNumber}>{sessionsThisWeek}</Text>
              <Text style={styles.streakLabel}>of {weeklyTargetSessions} workouts</Text>
            </View>

            <View style={styles.consistencyGuidance}>
              <Text style={styles.consistencyHeadline}>
                {sessionsThisWeek >= weeklyTargetSessions
                  ? '🎯 Weekly Target Achieved!'
                  : sessionsThisWeek > 0
                  ? '🔥 Good Momentum!'
                  : 'Start Your First Session'}
              </Text>
              <Text style={styles.consistencySubtext}>
                {sessionsThisWeek >= weeklyTargetSessions
                  ? 'Great dedication. Remember that recovery days build strength.'
                  : 'Consistency beats intensity. Each workout moves you closer to your goal.'}
              </Text>
            </View>
          </View>
        </SurfaceCard>

        {/* 3. Completed Sessions History */}
        <SurfaceCard elevated style={styles.card}>
          <Text style={styles.cardCategory}>COMPLETED WORKOUTS</Text>

          {completedSessions.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyIcon}>🏋️</Text>
              <Text style={styles.emptyTitle}>No workouts finished yet</Text>
              <Text style={styles.emptySubtext}>
                Head over to the <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>My Plan</Text> tab and tap "Begin Guided Session" to start your fitness journey!
              </Text>
            </View>
          ) : (
            <View style={styles.sessionsList}>
              {completedSessions.map((session, idx) => (
                <View key={idx} style={styles.sessionItem}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionDate}>
                      {session.startedAt.substring(0, 10)}
                    </Text>
                  </View>
                  <Text style={styles.sessionDetail}>
                    ✅ {session.sets?.filter((s) => s.isCompleted).length || 0} sets logged successfully
                  </Text>
                </View>
              ))}
            </View>
          )}
        </SurfaceCard>

        {/* 4. Active Fitness Goal Summary */}
        <SurfaceCard elevated style={styles.card}>
          <Text style={styles.cardCategory}>YOUR ACTIVE GOAL</Text>
          <Text style={styles.goalTitle}>
            {profile?.primaryGoal
              ? profile.primaryGoal.replace(/_/g, ' ').toUpperCase()
              : 'HEALTHY FITNESS'}
          </Text>
          <Text style={styles.goalDetail}>
            Environment: <Text style={styles.goalHighlight}>{profile?.trainingEnvironment ?? 'Home'}</Text>
          </Text>
          <Text style={styles.goalDetail}>
            Equipment: <Text style={styles.goalHighlight}>
              {profile?.equipmentInventory?.includes('none')
                ? 'Bodyweight Only (No equipment needed)'
                : profile?.equipmentInventory?.join(', ') || 'Bodyweight'}
            </Text>
          </Text>
          <Text style={styles.goalDetail}>
            Target Routine: <Text style={styles.goalHighlight}>{profile?.availableTrainingDays ?? 3} days per week • {profile?.sessionDurationMinutes ?? 30} mins</Text>
          </Text>
        </SurfaceCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  card: {
    marginVertical: 8,
  },
  cardCategory: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroWeight: {
    ...theme.typography.h1,
    color: theme.colors.text,
  },
  logWeightBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  logWeightBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  deltaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  deltaSubtext: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  inlineLogBox: {
    backgroundColor: '#1E2922',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#2D4A3A',
  },
  logPrompt: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  weightInput: {
    flex: 1,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  saveWeightBtn: {
    paddingHorizontal: 20,
  },
  historySection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  historyTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyNote: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: 'italic',
  },
  historyList: {
    gap: 6,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  historyDate: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  historyValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  consistencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  streakBox: {
    backgroundColor: '#1E2922',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D4A3A',
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  streakLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  consistencyGuidance: {
    flex: 1,
  },
  consistencyHeadline: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  consistencySubtext: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtext: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  sessionsList: {
    gap: 10,
    marginTop: 6,
  },
  sessionItem: {
    backgroundColor: '#16221B',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  sessionDate: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  sessionDetail: {
    color: theme.colors.primary,
    fontSize: 12,
    marginTop: 4,
  },
  goalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  goalDetail: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginVertical: 2,
  },
  goalHighlight: {
    color: theme.colors.text,
    fontWeight: '600',
  },
});
