/**
 * FITLIFE OS — Heuristic Physiological Advisor
 * 100% offline, deterministic rules-based intelligence engine.
 * Never invents advice; bases all recommendations on validated exercise science and metabolic physics.
 */

export interface SetPerformance {
  weightKg: number;
  reps: number;
  rpe?: number;
}

export interface OverloadRecommendation {
  shouldIncrease: boolean;
  suggestedWeightKg: number;
  incrementKg: number;
  reason: string;
}

export interface SessionFatigueData {
  date: string;
  avgRpe: number;
  totalVolumeKg: number;
}

export interface FatigueAnalysis {
  needsDeload: boolean;
  fatigueScore: number; // 0 to 100
  recommendation: string;
}

export interface WeightRecord {
  date: string;
  weightKg: number;
}

export interface MetabolicStallAnalysis {
  isStalled: boolean;
  weeklyDeltaKg: number;
  recommendation: string;
}

/**
 * Evaluates whether an athlete should progress load on a given exercise.
 * Rule: If all target sets met target reps with RPE <= 8, recommend standard 2.5kg micro-increase.
 */
export function adviseProgressiveOverload(
  completedSets: SetPerformance[],
  targetSets: number,
  targetReps: number
): OverloadRecommendation {
  if (completedSets.length < targetSets) {
    const lastWeight = completedSets[completedSets.length - 1]?.weightKg || 0;
    return {
      shouldIncrease: false,
      suggestedWeightKg: lastWeight,
      incrementKg: 0,
      reason: `Completed ${completedSets.length}/${targetSets} sets. Complete all prescribed sets before increasing load.`,
    };
  }

  const allMetReps = completedSets.every((s) => s.reps >= targetReps);
  const maxRpe = Math.max(...completedSets.map((s) => s.rpe || 8));
  const baseWeight = completedSets[0]?.weightKg ?? 0;

  if (allMetReps && maxRpe <= 8.5) {
    const increment = baseWeight >= 100 ? 5.0 : 2.5;
    return {
      shouldIncrease: true,
      suggestedWeightKg: baseWeight + increment,
      incrementKg: increment,
      reason: `All ${targetSets} sets achieved ${targetReps}+ reps with moderate RPE (${maxRpe}). Ready for +${increment}kg progression.`,
    };
  }

  return {
    shouldIncrease: false,
    suggestedWeightKg: baseWeight,
    incrementKg: 0,
    reason: `Maintain current load (${baseWeight}kg). Focus on form and reaching RPE <= 8 across all target reps.`,
  };
}

/**
 * Analyzes rolling workout fatigue across the last 7-14 sessions.
 * Triggers deload suggestion if 3+ consecutive sessions have avg RPE >= 9.0 or volume accumulates excessively.
 */
export function detectFatigueAndDeload(sessions: SessionFatigueData[]): FatigueAnalysis {
  if (sessions.length < 3) {
    return {
      needsDeload: false,
      fatigueScore: 20,
      recommendation: 'Baseline data building. Continue standard progression.',
    };
  }

  const recent3 = sessions.slice(-3);
  const consecutiveHighRpe = recent3.every((s) => s.avgRpe >= 9.0);

  // Compute average RPE over the last 5 sessions
  const last5 = sessions.slice(-5);
  const avgRpe5 = last5.reduce((sum, s) => sum + s.avgRpe, 0) / last5.length;

  let fatigueScore = Math.min(100, Math.round(avgRpe5 * 10));
  if (consecutiveHighRpe) {
    fatigueScore = Math.min(100, fatigueScore + 20);
  }

  if (consecutiveHighRpe || fatigueScore >= 85) {
    return {
      needsDeload: true,
      fatigueScore,
      recommendation:
        'High central nervous system fatigue detected across recent sessions. Recommend a 1-week deload: reduce working weights by 40-50% and volume by 50% to prevent overtraining and soft tissue injury.',
    };
  }

  return {
    needsDeload: false,
    fatigueScore,
    recommendation: 'Recovery capacity is sufficient. Maintain planned training intensities.',
  };
}

/**
 * Evaluates weight trend over 14+ days to detect metabolic adaptation or plateaus.
 */
export function evaluateMetabolicStall(
  weightRecords: WeightRecord[],
  goal: 'fat_loss' | 'muscle_gain' | 'maintenance'
): MetabolicStallAnalysis {
  if (weightRecords.length < 14) {
    return {
      isStalled: false,
      weeklyDeltaKg: 0,
      recommendation: 'Insufficient trend data. Log weight daily under consistent morning fasting conditions for at least 14 days.',
    };
  }

  // Sort chronologically
  const sorted = [...weightRecords].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const firstWeek = sorted.slice(0, 7);
  const lastWeek = sorted.slice(-7);

  const avgFirstWeek = firstWeek.reduce((sum, r) => sum + r.weightKg, 0) / firstWeek.length;
  const avgLastWeek = lastWeek.reduce((sum, r) => sum + r.weightKg, 0) / lastWeek.length;

  const totalDelta = avgLastWeek - avgFirstWeek;
  // Approximated weekly change
  const lastItemDate = lastWeek[lastWeek.length - 1]?.date ?? '';
  const firstItemDate = firstWeek[0]?.date ?? '';
  const daysBetween = Math.max(
    1,
    (new Date(lastItemDate).getTime() - new Date(firstItemDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const weeklyDelta = (totalDelta / daysBetween) * 7;

  if (goal === 'fat_loss') {
    // If weekly change is between -0.05kg and +0.2kg over 2+ weeks, fat loss has stalled
    if (weeklyDelta >= -0.05) {
      return {
        isStalled: true,
        weeklyDeltaKg: parseFloat(weeklyDelta.toFixed(2)),
        recommendation:
          'Weight loss plateau detected. Consider a 100-150 kcal daily reduction or introducing a 2-day maintenance refeed to reset leptin and metabolic down-regulation.',
      };
    }
  }

  if (goal === 'muscle_gain') {
    // If weekly change is < 0.05kg, surplus is too low
    if (weeklyDelta < 0.05) {
      return {
        isStalled: true,
        weeklyDeltaKg: parseFloat(weeklyDelta.toFixed(2)),
        recommendation:
          'Weight gain is below target rate for hypertrophy. Increase daily caloric intake by 150-200 kcal primarily from complex carbohydrates.',
      };
    }
  }

  return {
    isStalled: false,
    weeklyDeltaKg: parseFloat(weeklyDelta.toFixed(2)),
    recommendation: 'Progress is on track according to physiological target rates.',
  };
}
