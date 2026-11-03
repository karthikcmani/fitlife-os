import {
  estimate1RmBrzycki,
  estimate1RmEpley,
  calculateSetVolume,
  calculateTotalWorkoutVolume,
  evaluateProgressiveOverload,
} from './strength';

describe('Workout & Strength Engine', () => {
  describe('estimate1RmBrzycki', () => {
    it('returns exact weight for a 1-rep set', () => {
      const res = estimate1RmBrzycki(100, 1);
      expect(res.estimated1RmKg).toBe(100);
      expect(res.accuracy).toBe('exact');
    });

    it('calculates 1RM for 5 reps with high accuracy', () => {
      // 100 * (36 / (37 - 5)) = 100 * (36 / 32) = 112.5 kg
      const res = estimate1RmBrzycki(100, 5);
      expect(res.estimated1RmKg).toBe(112.5);
      expect(res.accuracy).toBe('high');
    });

    it('calculates 1RM for 10 reps with moderate accuracy', () => {
      // 100 * (36 / 27) = 133.33 -> 133.3 kg
      const res = estimate1RmBrzycki(100, 10);
      expect(res.estimated1RmKg).toBe(133.3);
      expect(res.accuracy).toBe('moderate');
    });

    it('flags sets >10 reps as low endurance estimates', () => {
      const res = estimate1RmBrzycki(50, 15);
      expect(res.accuracy).toBe('low_endurance_estimate');
      expect(res.notes).toBeDefined();
    });

    it('throws for non-positive inputs', () => {
      expect(() => estimate1RmBrzycki(0, 5)).toThrow(RangeError);
      expect(() => estimate1RmBrzycki(100, -1)).toThrow(RangeError);
    });
  });

  describe('estimate1RmEpley', () => {
    it('returns exact weight for a 1-rep set', () => {
      const res = estimate1RmEpley(100, 1);
      expect(res.estimated1RmKg).toBe(100);
      expect(res.accuracy).toBe('exact');
    });

    it('calculates 1RM correctly for 5 reps', () => {
      // 100 * (1 + 5/30) = 100 * (1.1666...) = 116.7 kg
      const res = estimate1RmEpley(100, 5);
      expect(res.estimated1RmKg).toBe(116.7);
      expect(res.accuracy).toBe('high');
    });
  });

  describe('Volume Calculations', () => {
    it('calculates single set volume (100kg x 8 reps = 800kg)', () => {
      expect(calculateSetVolume(100, 8)).toBe(800);
    });

    it('calculates total workout volume for completed sets only', () => {
      const sets = [
        { weightKg: 100, reps: 5, isCompleted: true }, // 500
        { weightKg: 100, reps: 5, isCompleted: true }, // 500
        { weightKg: 100, reps: 5, isCompleted: false }, // Skipped / incomplete
      ];
      expect(calculateTotalWorkoutVolume(sets)).toBe(1000);
    });
  });

  describe('evaluateProgressiveOverload', () => {
    it('detects load overload (weight increased at same reps)', () => {
      const prev = { weightKg: 100, reps: 8, rpe: 8 };
      const current = { weightKg: 102.5, reps: 8, rpe: 8.5 };
      const res = evaluateProgressiveOverload(prev, current);
      expect(res.isOverloadAchieved).toBe(true);
      expect(res.dimension).toBe('load_increase');
      expect(res.loadDeltaKg).toBe(2.5);
    });

    it('detects rep overload (reps increased at same weight)', () => {
      const prev = { weightKg: 100, reps: 8 };
      const current = { weightKg: 100, reps: 9 };
      const res = evaluateProgressiveOverload(prev, current);
      expect(res.isOverloadAchieved).toBe(true);
      expect(res.dimension).toBe('rep_increase');
      expect(res.repDelta).toBe(1);
    });

    it('detects RPE efficiency (same weight & reps at lower RPE)', () => {
      const prev = { weightKg: 100, reps: 8, rpe: 9 };
      const current = { weightKg: 100, reps: 8, rpe: 7.5 };
      const res = evaluateProgressiveOverload(prev, current);
      expect(res.isOverloadAchieved).toBe(true);
      expect(res.dimension).toBe('rpe_efficiency');
    });

    it('identifies decreased performance', () => {
      const prev = { weightKg: 100, reps: 8 };
      const current = { weightKg: 95, reps: 7 };
      const res = evaluateProgressiveOverload(prev, current);
      expect(res.isOverloadAchieved).toBe(false);
      expect(res.dimension).toBe('decreased');
    });
  });
});
