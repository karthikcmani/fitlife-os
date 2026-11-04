export type RecoveryRating = 'optimal' | 'adequate' | 'impaired' | 'critical';

export interface RecoveryScoreParams {
  durationMinutes: number;
  subjectiveQuality: 1 | 2 | 3 | 4 | 5;
  isRestDay?: boolean;
}

export interface RecoveryScoreResult {
  score: number; // 0 to 100
  rating: RecoveryRating;
  durationHours: number;
  sleepDurationScore: number;
  qualityScore: number;
  recommendations: string[];
}

/**
 * Calculates a comprehensive daily recovery index (0 - 100)
 * based on physiological sleep duration recommendations (7-9 hours)
 * and subjective sleep quality ratings.
 */
export function calculateRecoveryScore(params: RecoveryScoreParams): RecoveryScoreResult {
  const { durationMinutes, subjectiveQuality, isRestDay } = params;

  if (durationMinutes < 0) {
    throw new RangeError('Sleep duration cannot be negative');
  }

  const durationHours = Math.round((durationMinutes / 60) * 10) / 10;
  const recommendations: string[] = [];

  // 1. Duration Score (Weight: 60%)
  // Ideal: 450 - 540 min (7.5 - 9.0 hrs) -> 60 pts
  // Adequate: 420 - 450 min (7.0 - 7.5 hrs) -> 50 pts
  // Sub-optimal: 360 - 420 min (6.0 - 7.0 hrs) -> 35 pts
  // Severe deprivation: < 360 min (< 6.0 hrs) -> 15 pts
  let sleepDurationScore = 0;
  if (durationMinutes >= 450 && durationMinutes <= 540) {
    sleepDurationScore = 60;
  } else if (durationMinutes > 540) {
    // Excessive sleep (rebound or overtraining indicator)
    sleepDurationScore = 52;
    recommendations.push('High sleep duration (>9 hours) may indicate elevated systemic fatigue or overtraining.');
  } else if (durationMinutes >= 420) {
    sleepDurationScore = 50;
  } else if (durationMinutes >= 360) {
    sleepDurationScore = 35;
    recommendations.push('Sleep duration was below 7 hours. Muscle protein synthesis and hormonal recovery may be suppressed.');
  } else {
    sleepDurationScore = 15;
    recommendations.push('Severe sleep deficit (<6 hours). Avoid heavy maximal loads or high injury-risk movements today.');
  }

  // 2. Subjective Quality Score (Weight: 40%)
  // Rating 1 = 8 pts, 2 = 16 pts, 3 = 24 pts, 4 = 32 pts, 5 = 40 pts
  const qualityScore = subjectiveQuality * 8;

  let totalScore = sleepDurationScore + qualityScore;

  if (isRestDay) {
    totalScore = Math.min(100, totalScore + 5);
  }

  let rating: RecoveryRating;
  if (totalScore >= 80) {
    rating = 'optimal';
    recommendations.push('Central nervous system and muscular recovery are high. Prime state for progressive overload.');
  } else if (totalScore >= 65) {
    rating = 'adequate';
    recommendations.push('Adequate readiness for standard scheduled training.');
  } else if (totalScore >= 45) {
    rating = 'impaired';
    recommendations.push('Recovery is compromised. Consider reducing total working sets or training volume by 15-20%.');
  } else {
    rating = 'critical';
    recommendations.push('Recovery is critically low. Active recovery, mobility, or a complete rest day is strongly recommended.');
  }

  return {
    score: totalScore,
    rating,
    durationHours,
    sleepDurationScore,
    qualityScore,
    recommendations,
  };
}
