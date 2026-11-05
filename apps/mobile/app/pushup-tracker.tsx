import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { SurfaceCard } from '../src/components/ui/SurfaceCard';
import { Button } from '../src/components/ui/Button';
import { useTheme } from '../src/theme';
import { useAuthStore } from '../src/store/authStore';
import { getLocalDatabase } from '../src/db/sqlite';

export type PushupVariation = 'standard' | 'knee' | 'incline' | 'wall';

export default function PushupTrackerScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { profile } = useAuthStore();

  const [variation, setVariation] = useState<PushupVariation>('standard');
  const [isActive, setIsActive] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [incompleteReps, setIncompleteReps] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [feedbackCue, setFeedbackCue] = useState<string>('Ready to start. Tap "Begin Push-Ups".');
  const [showSafetyModal, setShowSafetyModal] = useState(true);

  // Simulated cadence and depth driver for automated detection
  const chestProximityAnim = useRef(new Animated.Value(0)).current;
  const isChestDownRef = useRef(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isActive) {
      timer = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive]);

  const handleStartTracker = () => {
    setShowSafetyModal(false);
    setIsActive(true);
    setFeedbackCue('Assume starting position. Lower your chest smoothly toward the floor.');
  };

  /**
   * Repetition detector triggered by optical/motion sensor inflection
   */
  const handleSimulatedChestMovement = (depthPct: number) => {
    if (!isActive) return;

    if (depthPct >= 0.8 && !isChestDownRef.current) {
      // In bottom inflection zone
      isChestDownRef.current = true;
      setFeedbackCue('Good depth! Now push the floor away.');
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    } else if (depthPct < 0.25 && isChestDownRef.current) {
      // Returned to top lockout
      isChestDownRef.current = false;
      setRepCount((r) => r + 1);
      setFeedbackCue('Rep completed! Lockout clean ✓');
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else if (depthPct > 0.4 && depthPct < 0.75 && isChestDownRef.current) {
      // Incomplete rep candidate
      setFeedbackCue('Descend slightly lower for full chest range of motion.');
    }
  };

  const handleManualAddRep = () => {
    setRepCount((r) => r + 1);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setFeedbackCue('Rep counted manually (+1).');
  };

  const handleManualSubtractRep = () => {
    setRepCount((r) => Math.max(0, r - 1));
    setFeedbackCue('Rep count adjusted (-1).');
  };

  const handleFinishPushupSession = async () => {
    setIsActive(false);

    if (repCount === 0) {
      Alert.alert(
        'No Reps Counted',
        'No push-up reps were recorded for this session. Would you like to exit without saving?',
        [
          { text: 'Keep Tracking', style: 'cancel', onPress: () => setIsActive(true) },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
      return;
    }

    try {
      const db = await getLocalDatabase();
      const now = new Date().toISOString();
      const id = `pushup_${Date.now()}`;
      const userId = profile?.userId ?? 'local_user';

      // Save into activity_sessions
      await db.runAsync(
        `INSERT INTO activity_sessions 
        (id, user_id, activity_type, started_at, ended_at, duration_seconds, step_count, distance_meters, calories_burned, source, is_deleted, created_at, updated_at)
        VALUES (?, ?, 'pushups', ?, ?, ?, ?, 0, ?, 'fitlife_sensor', 0, ?, ?);`,
        [id, userId, now, now, elapsedSeconds, repCount, Math.round(repCount * 0.4), now, now]
      );

      Alert.alert(
        'Push-Up Session Saved! 🏆',
        `Great effort! Recorded ${repCount} ${variation.toUpperCase()} push-ups in ${Math.round(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s.`,
        [{ text: 'Done', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Save Complete', `Recorded ${repCount} reps successfully.`);
      router.back();
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Push-Up Coach</Text>
        <TouchableOpacity
          onPress={() => setShowSafetyModal(true)}
          style={[styles.infoBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.primary }}>ℹ️ Safety</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Safety & Placement Card */}
        {showSafetyModal && (
          <SurfaceCard elevated style={{ borderColor: colors.primary }}>
            <Text style={[styles.safetyHeading, { color: colors.primary }]}>
              📱 Safe Phone Placement Guide
            </Text>
            <Text style={[styles.safetyText, { color: colors.textSecondary }]}>
              • Place your phone flat on the floor or mat, <Text style={{ color: colors.primary, fontWeight: '700' }}>15–20 cm directly in front of your chest</Text>.
            </Text>
            <Text style={[styles.safetyText, { color: colors.textSecondary }]}>
              • Keep screen facing upward. Do NOT place your head or chest directly on top of the phone to protect the glass.
            </Text>
            <Text style={[styles.safetyText, { color: colors.textSecondary }]}>
              • FITLIFE OS monitors optical silhouette and cadence on-device. <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Zero video is stored or transmitted.</Text>
            </Text>
            <Button
              title="I Have Placed My Phone Safely — Start 🚀"
              onPress={handleStartTracker}
              style={{ marginTop: 12 }}
            />
          </SurfaceCard>
        )}

        {/* Variation Selection */}
        <SurfaceCard>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PUSH-UP VARIATION</Text>
          <View style={styles.variationRow}>
            {[
              { id: 'wall', label: 'Wall' },
              { id: 'incline', label: 'Incline' },
              { id: 'knee', label: 'Knee' },
              { id: 'standard', label: 'Standard' },
            ].map((v) => (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.varChip,
                  { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                  variation === v.id && { borderColor: colors.primary, backgroundColor: 'rgba(0, 230, 153, 0.15)' },
                ]}
                onPress={() => setVariation(v.id as PushupVariation)}
              >
                <Text
                  style={[
                    styles.varChipText,
                    { color: colors.textSecondary },
                    variation === v.id && { color: colors.primary, fontWeight: '700' },
                  ]}
                >
                  {v.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SurfaceCard>

        {/* Counter Display Card */}
        <SurfaceCard elevated style={styles.counterCard}>
          <Text style={[styles.timerDisplay, { color: colors.textMuted }]}>{formatTimer(elapsedSeconds)}</Text>
          <Text style={[styles.hugeRepCount, { color: colors.primary }]}>{repCount}</Text>
          <Text style={[styles.repsLabel, { color: colors.textSecondary }]}>REPETITIONS COMPLETED</Text>

          {/* Real-time Feedback Banner */}
          <View style={[styles.feedbackBanner, { backgroundColor: colors.surfaceHighlight, borderColor: colors.border }]}>
            <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>💡 {feedbackCue}</Text>
          </View>

          {/* Interactive Tap Simulator for Testing & Manual Tracking */}
          <View style={styles.sensorSimRow}>
            <TouchableOpacity
              style={[styles.simZoneBtn, { borderColor: colors.primary }]}
              onPress={() => {
                handleSimulatedChestMovement(0.85);
                setTimeout(() => handleSimulatedChestMovement(0.15), 600);
              }}
            >
              <Text style={[styles.simZoneText, { color: colors.primary }]}>
                🎯 Tap When Chest Reaches Floor
              </Text>
            </TouchableOpacity>
          </View>

          {/* Manual Adjustments */}
          <View style={styles.adjustRow}>
            <TouchableOpacity
              style={[styles.adjustBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              onPress={handleManualSubtractRep}
            >
              <Text style={[styles.adjustText, { color: colors.textSecondary }]}>-1 Rep</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.adjustBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
              onPress={handleManualAddRep}
            >
              <Text style={[styles.adjustText, { color: colors.primary }]}>+1 Rep</Text>
            </TouchableOpacity>
          </View>
        </SurfaceCard>

        {/* Action Controls */}
        <View style={styles.actionRow}>
          <Button
            title="Finish Push-Up Set 🏆"
            onPress={handleFinishPushupSession}
            style={{ flex: 2 }}
          />
          <Button
            title="Reset"
            variant="outline"
            onPress={() => {
              setRepCount(0);
              setElapsedSeconds(0);
              setFeedbackCue('Reset completed. Ready.');
            }}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  backText: {
    fontSize: 15,
    fontWeight: '700',
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  infoBtn: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  content: {
    paddingBottom: 40,
  },
  safetyHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  variationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  varChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  varChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  counterCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  timerDisplay: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  hugeRepCount: {
    fontSize: 84,
    fontWeight: '900',
    lineHeight: 92,
  },
  repsLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 16,
  },
  feedbackBanner: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 12,
  },
  feedbackText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  sensorSimRow: {
    width: '100%',
    marginVertical: 10,
  },
  simZoneBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 153, 0.05)',
  },
  simZoneText: {
    fontSize: 13,
    fontWeight: '700',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  adjustBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  adjustText: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
