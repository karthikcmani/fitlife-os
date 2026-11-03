import {
  adviseProgressiveOverload,
  detectFatigueAndDeload,
  evaluateMetabolicStall,
} from './heuristicAdvisor';

describe('Heuristic Physiological Advisor Tests', () => {
  describe('Progressive Overload Advisor', () => {
    it('recommends weight increase when all target sets and reps are achieved with moderate RPE', () => {
      const sets = [
        { weightKg: 80, reps: 8, rpe: 7.5 },
        { weightKg: 80, reps: 8, rpe: 8.0 },
        { weightKg: 80, reps: 8, rpe: 8.0 },
      ];
      const result = adviseProgressiveOverload(sets, 3, 8);
      expect(result.shouldIncrease).toBe(true);
      expect(result.suggestedWeightKg).toBe(82.5);
      expect(result.incrementKg).toBe(2.5);
    });

    it('suggests 5kg micro-increase for loads >= 100kg', () => {
      const sets = [
        { weightKg: 120, reps: 5, rpe: 8.0 },
        { weightKg: 120, reps: 5, rpe: 8.0 },
        { weightKg: 120, reps: 5, rpe: 8.5 },
      ];
      const result = adviseProgressiveOverload(sets, 3, 5);
      expect(result.shouldIncrease).toBe(true);
      expect(result.suggestedWeightKg).toBe(125);
      expect(result.incrementKg).toBe(5);
    });

    it('denies weight increase when sets fail to meet target reps', () => {
      const sets = [
        { weightKg: 80, reps: 8, rpe: 8.0 },
        { weightKg: 80, reps: 7, rpe: 9.5 },
        { weightKg: 80, reps: 6, rpe: 10.0 },
      ];
      const result = adviseProgressiveOverload(sets, 3, 8);
      expect(result.shouldIncrease).toBe(false);
      expect(result.suggestedWeightKg).toBe(80);
    });

    it('denies weight increase when RPE is excessive (failure)', () => {
      const sets = [
        { weightKg: 80, reps: 8, rpe: 8.0 },
        { weightKg: 80, reps: 8, rpe: 9.0 },
        { weightKg: 80, reps: 8, rpe: 9.5 },
      ];
      const result = adviseProgressiveOverload(sets, 3, 8);
      expect(result.shouldIncrease).toBe(false);
    });
  });

  describe('Fatigue & Deload Detection', () => {
    it('detects high fatigue after consecutive near-maximal RPE sessions', () => {
      const sessions = [
        { date: '2026-11-01', avgRpe: 9.2, totalVolumeKg: 12000 },
        { date: '2026-11-03', avgRpe: 9.5, totalVolumeKg: 13000 },
        { date: '2026-11-05', avgRpe: 9.0, totalVolumeKg: 12500 },
      ];
      const result = detectFatigueAndDeload(sessions);
      expect(result.needsDeload).toBe(true);
      expect(result.fatigueScore).toBeGreaterThanOrEqual(85);
      expect(result.recommendation).toContain('deload');
    });

    it('reports normal recovery when sessions stay within moderate RPE ranges', () => {
      const sessions = [
        { date: '2026-11-01', avgRpe: 7.5, totalVolumeKg: 10000 },
        { date: '2026-11-03', avgRpe: 7.8, totalVolumeKg: 10500 },
        { date: '2026-11-05', avgRpe: 7.0, totalVolumeKg: 9500 },
      ];
      const result = detectFatigueAndDeload(sessions);
      expect(result.needsDeload).toBe(false);
      expect(result.fatigueScore).toBeLessThan(85);
    });
  });

  describe('Metabolic Adaptation / Plateau Evaluation', () => {
    it('detects a weight loss plateau over 14 days of stagnant weight', () => {
      const records = [
        { date: '2026-10-01', weightKg: 80.0 },
        { date: '2026-10-02', weightKg: 80.1 },
        { date: '2026-10-03', weightKg: 80.0 },
        { date: '2026-10-04', weightKg: 79.9 },
        { date: '2026-10-05', weightKg: 80.0 },
        { date: '2026-10-06', weightKg: 80.1 },
        { date: '2026-10-07', weightKg: 80.0 },
        { date: '2026-10-08', weightKg: 80.0 },
        { date: '2026-10-09', weightKg: 80.1 },
        { date: '2026-10-10', weightKg: 80.0 },
        { date: '2026-10-11', weightKg: 80.0 },
        { date: '2026-10-12', weightKg: 80.1 },
        { date: '2026-10-13', weightKg: 80.0 },
        { date: '2026-10-14', weightKg: 80.0 },
      ];
      const result = evaluateMetabolicStall(records, 'fat_loss');
      expect(result.isStalled).toBe(true);
      expect(result.recommendation).toContain('plateau');
    });

    it('identifies healthy ongoing fat loss', () => {
      const records = [
        { date: '2026-10-01', weightKg: 81.0 },
        { date: '2026-10-02', weightKg: 80.9 },
        { date: '2026-10-03', weightKg: 80.8 },
        { date: '2026-10-04', weightKg: 80.7 },
        { date: '2026-10-05', weightKg: 80.6 },
        { date: '2026-10-06', weightKg: 80.5 },
        { date: '2026-10-07', weightKg: 80.5 },
        { date: '2026-10-08', weightKg: 80.3 },
        { date: '2026-10-09', weightKg: 80.2 },
        { date: '2026-10-10', weightKg: 80.1 },
        { date: '2026-10-11', weightKg: 80.0 },
        { date: '2026-10-12', weightKg: 79.9 },
        { date: '2026-10-13', weightKg: 79.8 },
        { date: '2026-10-14', weightKg: 79.7 },
      ];
      const result = evaluateMetabolicStall(records, 'fat_loss');
      expect(result.isStalled).toBe(false);
      expect(result.weeklyDeltaKg).toBeLessThan(-0.05);
    });
  });
});
