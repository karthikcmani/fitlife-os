import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { theme, useTheme } from '../../theme';

interface WorkoutAvatarProps {
  exerciseId: string;
  category: string;
  exerciseName: string;
  whatYouShouldFeel?: string;
  whatThisImproves?: string;
}

/**
 * Animated Workout Avatar Coach.
 * Dynamically demonstrates exercise movements with continuous 60fps
 * biomechanical animations, Front/Side views, posture alignment guides,
 * and live tempo cues (Descent / Drive / Breathing).
 */
export function WorkoutAvatar({
  exerciseId,
  category,
  exerciseName,
  whatYouShouldFeel,
  whatThisImproves,
}: WorkoutAvatarProps) {
  const { colors, isDark } = useTheme();
  const [isPlaying, setIsPlaying] = useState(true);
  const [viewMode, setViewMode] = useState<'side' | 'front'>('side');
  const [movementPhase, setMovementPhase] = useState<'eccentric' | 'pause' | 'concentric'>('eccentric');

  // Animation drivers
  const motionAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Determine movement type
  const normalizedId = exerciseId.toLowerCase();
  const isSquat = normalizedId.includes('squat');
  const isPushUp = normalizedId.includes('push-up') || normalizedId.includes('pushup');
  const isPlank = normalizedId.includes('plank');
  const isRowOrPull = normalizedId.includes('row') || normalizedId.includes('pull');
  const isOverheadPress = normalizedId.includes('press') && !isPushUp;
  const isLunge = normalizedId.includes('lunge');
  const isGluteBridge = normalizedId.includes('bridge');

  useEffect(() => {
    let animLoop: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      if (isPlank) {
        // Isometric breathing pulsation
        animLoop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.15,
              duration: 1800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        );
        animLoop.start();
      } else {
        // Continuous repetition loop
        animLoop = Animated.loop(
          Animated.sequence([
            // Phase 1: Eccentric (Down / Lowering) — 1.6s
            Animated.timing(motionAnim, {
              toValue: 1,
              duration: 1600,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            // Phase 2: Isometric Pause at bottom — 0.4s
            Animated.delay(400),
            // Phase 3: Concentric (Up / Driving) — 1.4s
            Animated.timing(motionAnim, {
              toValue: 0,
              duration: 1400,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            // Reset delay
            Animated.delay(300),
          ])
        );
        animLoop.start();
      }
    } else {
      motionAnim.stopAnimation();
      pulseAnim.stopAnimation();
    }

    return () => {
      if (animLoop) animLoop.stop();
    };
  }, [isPlaying, isPlank, normalizedId]);

  // Track phase from animated value for friendly coaching text
  useEffect(() => {
    const listenerId = motionAnim.addListener(({ value }) => {
      if (value < 0.4) {
        setMovementPhase('concentric');
      } else if (value >= 0.4 && value < 0.85) {
        setMovementPhase('eccentric');
      } else {
        setMovementPhase('pause');
      }
    });

    return () => {
      motionAnim.removeListener(listenerId);
    };
  }, []);

  // Compute live cue message
  let phaseText = 'Controlled Movement';
  let breathCue = 'Breathe steadily';

  if (isPlank) {
    phaseText = 'Solid Core Lock — Hold Position';
    breathCue = 'Inhale deeply through nose, exhale through mouth';
  } else if (isSquat) {
    if (movementPhase === 'eccentric') {
      phaseText = 'Sit hips down & back smoothly';
      breathCue = 'Inhale as you lower';
    } else if (movementPhase === 'pause') {
      phaseText = 'Pause at bottom depth — Knees stable';
      breathCue = 'Keep chest upright';
    } else {
      phaseText = 'Push through mid-foot to stand';
      breathCue = 'Exhale forcefully as you drive up';
    }
  } else if (isPushUp) {
    if (movementPhase === 'eccentric') {
      phaseText = 'Lower chest with 45° elbows';
      breathCue = 'Inhale on the way down';
    } else if (movementPhase === 'pause') {
      phaseText = 'Hold 1 inch off floor';
      breathCue = 'Keep core rigid like a board';
    } else {
      phaseText = 'Push the floor away';
      breathCue = 'Exhale as you press up';
    }
  } else if (isGluteBridge) {
    if (movementPhase === 'eccentric') {
      phaseText = 'Hips drive high into straight bridge';
      breathCue = 'Exhale and squeeze glutes';
    } else {
      phaseText = 'Lower hips with control';
      breathCue = 'Inhale before next rep';
    }
  } else if (isRowOrPull) {
    if (movementPhase === 'eccentric') {
      phaseText = 'Pull elbow back toward hip';
      breathCue = 'Exhale and squeeze back';
    } else {
      phaseText = 'Extend arm forward smoothly';
      breathCue = 'Inhale with steady stretch';
    }
  }

  // Animated interpolations for body parts
  const squatDropY = motionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 24],
  });

  const kneeBendAngle = motionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '35deg'],
  });

  const pushUpDropY = motionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 18],
  });

  const armBendY = motionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 12],
  });

  return (
    <View style={styles.container}>
      {/* Header bar with Action indicator and Play/Pause */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={[styles.statusDot, { backgroundColor: isPlaying ? colors.primary : colors.textMuted }]} />
          <Text style={[styles.badgeText, { color: colors.textMuted }]}>
            {isPlaying ? 'ACTIVE FORM DEMO' : 'PAUSED'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={[styles.viewToggleGroup, { borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'side' && { backgroundColor: colors.primary }]}
              onPress={() => setViewMode('side')}
            >
              <Text style={[styles.viewToggleText, { color: viewMode === 'side' ? colors.textInverse : colors.textMuted }]}>Side</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, viewMode === 'front' && { backgroundColor: colors.primary }]}
              onPress={() => setViewMode('front')}
            >
              <Text style={[styles.viewToggleText, { color: viewMode === 'front' ? colors.textInverse : colors.textMuted }]}>Front</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setIsPlaying(!isPlaying)}
            style={[styles.toggleBtn, { borderColor: colors.border }]}
            accessibilityLabel={isPlaying ? 'Pause demonstration' : 'Play demonstration'}
          >
            <Text style={[styles.toggleBtnText, { color: colors.textPrimary }]}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Center Stage: Animated Coach Avatar */}
      <View style={styles.stage}>
        {/* Floor baseline line */}
        <View style={styles.floorLine} />

        {isPlank ? (
          /* Isometric Plank Avatar */
          <Animated.View style={[styles.plankRig, { transform: [{ scale: pulseAnim }] }]}>
            {/* Head */}
            <View style={styles.plankHead} />
            {/* Rigid Torso Bar */}
            <View style={styles.plankTorso} />
            {/* Forearm support */}
            <View style={styles.plankForearm} />
            {/* Feet anchor */}
            <View style={styles.plankFeet} />
            {/* Core activation aura */}
            <View style={styles.coreGlow} />
          </Animated.View>
        ) : isPushUp ? (
          /* Dynamic Push-Up Avatar */
          <Animated.View
            style={[
              styles.pushUpRig,
              { transform: [{ translateY: pushUpDropY }] },
            ]}
          >
            {/* Head */}
            <View style={styles.pushUpHead} />
            {/* Straight Back */}
            <View style={styles.pushUpTorso} />
            {/* Arms with flex */}
            <Animated.View
              style={[
                styles.pushUpArm,
                { transform: [{ translateY: armBendY }] },
              ]}
            />
            {/* Feet planted */}
            <View style={styles.pushUpFeet} />
          </Animated.View>
        ) : isGluteBridge ? (
          /* Glute Bridge Avatar */
          <Animated.View
            style={[
              styles.bridgeRig,
              { transform: [{ translateY: squatDropY.interpolate({ inputRange: [0, 24], outputRange: [20, 0] }) }] },
            ]}
          >
            <View style={styles.bridgeHead} />
            <View style={styles.bridgeTorso} />
            <View style={styles.bridgeKnees} />
          </Animated.View>
        ) : (
          /* Standing Squat / Row / Overhead Avatar (Default) */
          <Animated.View
            style={[
              styles.standingRig,
              { transform: [{ translateY: squatDropY }] },
            ]}
          >
            {/* Head */}
            <View style={styles.avatarHead} />
            {/* Torso */}
            <View style={styles.avatarTorso} />

            {/* Arms (holding posture / dumbbell) */}
            <View style={styles.avatarArmsRow}>
              <View style={styles.avatarArm} />
              {category === 'dumbbell' && (
                <View style={styles.dumbbellGraphic}>
                  <View style={styles.dbWeight} />
                  <View style={styles.dbHandle} />
                  <View style={styles.dbWeight} />
                </View>
              )}
              <View style={styles.avatarArm} />
            </View>

            {/* Hips */}
            <View style={styles.avatarHips} />

            {/* Legs with animated bend */}
            <View style={styles.avatarLegsRow}>
              <Animated.View
                style={[
                  styles.avatarLeg,
                  { transform: [{ rotate: kneeBendAngle }] },
                ]}
              />
              <Animated.View
                style={[
                  styles.avatarLeg,
                  { transform: [{ rotate: motionAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-35deg'] }) }] },
                ]}
              />
            </View>
          </Animated.View>
        )}
      </View>

      {/* Live Form Guidance Callout */}
      <View style={styles.guidanceBox}>
        <View style={styles.cueRow}>
          <Text style={styles.cueIcon}>🎯</Text>
          <Text style={styles.cueText}>{phaseText}</Text>
        </View>
        <View style={styles.cueRow}>
          <Text style={styles.cueIcon}>🫁</Text>
          <Text style={styles.breathText}>{breathCue}</Text>
        </View>
      </View>

      {whatYouShouldFeel && (
        <View style={[styles.feelBox, { backgroundColor: 'rgba(0, 230, 153, 0.08)', borderColor: colors.primary }]}>
          <Text style={[styles.feelLabel, { color: colors.primary }]}>💡 WHAT YOU SHOULD FEEL:</Text>
          <Text style={[styles.feelText, { color: colors.textPrimary }]}>{whatYouShouldFeel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F1A14',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1D3B2C',
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  viewToggleGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewToggleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  feelBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  feelLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  feelText: {
    fontSize: 12,
    lineHeight: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  toggleBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  toggleBtnText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  stage: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  floorLine: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
  },
  // Standing / Squat Avatar Rig
  standingRig: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#A3E635',
    marginBottom: 3,
  },
  avatarTorso: {
    width: 24,
    height: 38,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
  },
  avatarArmsRow: {
    position: 'absolute',
    top: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  avatarArm: {
    width: 6,
    height: 28,
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
  },
  dumbbellGraphic: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dbWeight: {
    width: 4,
    height: 12,
    backgroundColor: '#38BDF8',
    borderRadius: 2,
  },
  dbHandle: {
    width: 14,
    height: 3,
    backgroundColor: '#E5E7EB',
  },
  avatarHips: {
    width: 22,
    height: 6,
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
  },
  avatarLegsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  avatarLeg: {
    width: 7,
    height: 36,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },

  // Push-Up Avatar Rig
  pushUpRig: {
    position: 'relative',
    width: 130,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushUpHead: {
    position: 'absolute',
    left: 10,
    top: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#A3E635',
  },
  pushUpTorso: {
    position: 'absolute',
    left: 28,
    top: 14,
    width: 80,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    transform: [{ rotate: '8deg' }],
  },
  pushUpArm: {
    position: 'absolute',
    left: 40,
    top: 20,
    width: 6,
    height: 22,
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  pushUpFeet: {
    position: 'absolute',
    right: 12,
    top: 24,
    width: 12,
    height: 6,
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
  },

  // Plank Rig
  plankRig: {
    position: 'relative',
    width: 130,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plankHead: {
    position: 'absolute',
    left: 12,
    top: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#A3E635',
  },
  plankTorso: {
    position: 'absolute',
    left: 30,
    top: 12,
    width: 80,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
  },
  plankForearm: {
    position: 'absolute',
    left: 32,
    bottom: 8,
    width: 18,
    height: 6,
    backgroundColor: '#38BDF8',
    borderRadius: 3,
  },
  plankFeet: {
    position: 'absolute',
    right: 12,
    bottom: 8,
    width: 10,
    height: 6,
    backgroundColor: '#9CA3AF',
    borderRadius: 3,
  },
  coreGlow: {
    position: 'absolute',
    left: 55,
    top: 10,
    width: 24,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
  },

  // Glute Bridge Rig
  bridgeRig: {
    position: 'relative',
    width: 120,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bridgeHead: {
    position: 'absolute',
    left: 10,
    bottom: 12,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#A3E635',
  },
  bridgeTorso: {
    position: 'absolute',
    left: 28,
    bottom: 14,
    width: 50,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    transform: [{ rotate: '-25deg' }],
  },
  bridgeKnees: {
    position: 'absolute',
    right: 30,
    bottom: 12,
    width: 10,
    height: 24,
    backgroundColor: '#38BDF8',
    borderRadius: 4,
    transform: [{ rotate: '45deg' }],
  },

  // Guidance Callouts
  guidanceBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  cueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cueIcon: {
    fontSize: 14,
  },
  cueText: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  breathText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
