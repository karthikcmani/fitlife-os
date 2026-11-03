export type OneRepMaxAccuracy = 'exact' | 'high' | 'moderate' | 'low_endurance_estimate';

export interface OneRepMaxResult {
  weightKg: number;
  reps: number;
  estimated1RmKg: number;
  formula: 'brzycki' | 'epley';
  accuracy: OneRepMaxAccuracy;
  notes?: string;
}

export type OverloadDimension =
  | 'load_increase'
  | 'rep_increase'
  | 'volume_increase'
  | 'rpe_efficiency'
  | 'neutral'
  | 'decreased';

export interface ProgressiveOverloadResult {
  dimension: OverloadDimension;
  isOverloadAchieved: boolean;
  loadDeltaKg: number;
  repDelta: number;
  volumeDeltaKg: number;
  summary: string;
}

/**
 * Estimates 1RM using the Brzycki Formula:
 * 1RM = weight * (36 / (37 - reps))
 * Clinically validated for sets between 1 and 10 repetitions.
 */
export function estimate1RmBrzycki(weightKg: number, reps: number): OneRepMaxResult {
  if (weightKg <= 0 || reps <= 0) {
    throw new RangeError('Weight and reps must be strictly positive');
  }

  if (reps === 1) {
    return {
      weightKg,
      reps: 1,
      estimated1RmKg: weightKg,
      formula: 'brzycki',
      accuracy: 'exact',
    };
  }

  let accuracy: OneRepMaxAccuracy;
  let notes: string | undefined;

  if (reps <= 5) {
    accuracy = 'high';
  } else if (reps <= 10) {
    accuracy = 'moderate';
  } else {
    accuracy = 'low_endurance_estimate';
    notes = '1RM estimation degrades in clinical accuracy beyond 10 reps due to cardiovascular fatigue.';
  }

  // Capped at reps <= 36 to prevent division by zero or negative denominator
  const effectiveReps = Math.min(reps, 30);
  const estimated = weightKg * (36 / (37 - effectiveReps));

  return {
    weightKg,
    reps,
    estimated1RmKg: Math.round(estimated * 10) / 10,
    formula: 'brzycki',
    accuracy,
    notes,
  };
}

/**
 * Estimates 1RM using the Epley Formula:
 * 1RM = weight * (1 + reps / 30)
 */
export function estimate1RmEpley(weightKg: number, reps: number): OneRepMaxResult {
  if (weightKg <= 0 || reps <= 0) {
    throw new RangeError('Weight and reps must be strictly positive');
  }

  if (reps === 1) {
    return {
      weightKg,
      reps: 1,
      estimated1RmKg: weightKg,
      formula: 'epley',
      accuracy: 'exact',
    };
  }

  let accuracy: OneRepMaxAccuracy;
  let notes: string | undefined;

  if (reps <= 5) {
    accuracy = 'high';
  } else if (reps <= 10) {
    accuracy = 'moderate';
  } else {
    accuracy = 'low_endurance_estimate';
    notes = '1RM estimation degrades in clinical accuracy beyond 10 reps.';
  }

  const estimated = weightKg * (1 + reps / 30);

  return {
    weightKg,
    reps,
    estimated1RmKg: Math.round(estimated * 10) / 10,
    formula: 'epley',
    accuracy,
    notes,
  };
}

/**
 * Calculates volume of a single exercise set: weight * reps.
 * For bodyweight exercises, weightKg represents added resistance.
 */
export function calculateSetVolume(weightKg: number, reps: number): number {
  if (weightKg < 0 || reps < 0) {
    throw new RangeError('Weight and reps cannot be negative');
  }
  return Math.round(weightKg * reps * 10) / 10;
}

/**
 * Calculates total volume for a collection of completed sets.
 */
export function calculateTotalWorkoutVolume(
  sets: Array<{ weightKg: number; reps: number; isCompleted: boolean }>
): number {
  return sets
    .filter((s) => s.isCompleted)
    .reduce((total, s) => total + calculateSetVolume(s.weightKg, s.reps), 0);
}

/**
 * Evaluates progressive overload across two consecutive exercise performance sets.
 */
export function evaluateProgressiveOverload(
  prevSet: { weightKg: number; reps: number; rpe?: number },
  currentSet: { weightKg: number; reps: number; rpe?: number }
): ProgressiveOverloadResult {
  const loadDelta = currentSet.weightKg - prevSet.weightKg;
  const repDelta = currentSet.reps - prevSet.reps;
  const prevVolume = calculateSetVolume(prevSet.weightKg, prevSet.reps);
  const currentVolume = calculateSetVolume(currentSet.weightKg, currentSet.reps);
  const volumeDelta = currentVolume - prevVolume;

  // 1. Load Overload: Increased weight with at least identical reps
  if (loadDelta > 0 && repDelta >= 0) {
    return {
      dimension: 'load_increase',
      isOverloadAchieved: true,
      loadDeltaKg: loadDelta,
      repDelta,
      volumeDeltaKg: volumeDelta,
      summary: `Load increased by +${loadDelta} kg with ${currentSet.reps} reps.`,
    };
  }

  // 2. Rep Overload: Increased reps with identical or higher weight
  if (repDelta > 0 && loadDelta >= 0) {
    return {
      dimension: 'rep_increase',
      isOverloadAchieved: true,
      loadDeltaKg: loadDelta,
      repDelta,
      volumeDeltaKg: volumeDelta,
      summary: `Reps increased by +${repDelta} at ${currentSet.weightKg} kg.`,
    };
  }

  // 3. Volume Overload: Total volume load increased
  if (volumeDelta > 0) {
    return {
      dimension: 'volume_increase',
      isOverloadAchieved: true,
      loadDeltaKg: loadDelta,
      repDelta,
      volumeDeltaKg: volumeDelta,
      summary: `Total set volume increased by +${volumeDelta} kg.`,
    };
  }

  // 4. RPE Efficiency: Same load & reps executed with lower perceived exertion
  if (loadDelta === 0 && repDelta === 0 && prevSet.rpe !== undefined && currentSet.rpe !== undefined) {
    if (currentSet.rpe < prevSet.rpe) {
      return {
        dimension: 'rpe_efficiency',
        isOverloadAchieved: true,
        loadDeltaKg: 0,
        repDelta: 0,
        volumeDeltaKg: 0,
        summary: `Performance matched with lower RPE (${currentSet.rpe} vs ${prevSet.rpe}), indicating neural adaptation.`,
      };
    }
  }

  if (loadDelta === 0 && repDelta === 0) {
    return {
      dimension: 'neutral',
      isOverloadAchieved: false,
      loadDeltaKg: 0,
      repDelta: 0,
      volumeDeltaKg: 0,
      summary: 'Performance matched previous baseline.',
    };
  }

  return {
    dimension: 'decreased',
    isOverloadAchieved: false,
    loadDeltaKg: loadDelta,
    repDelta,
    volumeDeltaKg: volumeDelta,
    summary: 'Performance was lower than previous baseline.',
  };
}
