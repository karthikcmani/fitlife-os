import { calculateRecoveryScore } from './recovery';

describe('Sleep & Recovery Engine', () => {
  it('calculates optimal recovery for 8 hours sleep with quality 5', () => {
    // 480 min (60 pts) + quality 5 (40 pts) = 100 pts
    const res = calculateRecoveryScore({
      durationMinutes: 480,
      subjectiveQuality: 5,
    });
    expect(res.score).toBe(100);
    expect(res.rating).toBe('optimal');
    expect(res.durationHours).toBe(8);
  });

  it('calculates critical recovery for 4 hours sleep with quality 1', () => {
    // 240 min (15 pts) + quality 1 (8 pts) = 23 pts
    const res = calculateRecoveryScore({
      durationMinutes: 240,
      subjectiveQuality: 1,
    });
    expect(res.score).toBe(23);
    expect(res.rating).toBe('critical');
    expect(res.recommendations.length).toBeGreaterThan(0);
  });

  it('adds recovery bonus for rest days', () => {
    const trainingDay = calculateRecoveryScore({
      durationMinutes: 420, // 50 pts
      subjectiveQuality: 3, // 24 pts -> total 74
      isRestDay: false,
    });
    const restDay = calculateRecoveryScore({
      durationMinutes: 420,
      subjectiveQuality: 3,
      isRestDay: true, // +5 pts -> total 79
    });
    expect(restDay.score).toBe(trainingDay.score + 5);
  });

  it('throws on negative duration', () => {
    expect(() =>
      calculateRecoveryScore({ durationMinutes: -30, subjectiveQuality: 3 })
    ).toThrow(RangeError);
  });
});
