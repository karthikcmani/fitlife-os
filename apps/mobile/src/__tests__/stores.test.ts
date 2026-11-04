import { localNotificationManager } from '../services/localNotifications';

describe('Mobile Services & State Logic Tests', () => {
  describe('Local Notification Scheduling (F-Droid Clean)', () => {
    it('retrieves default local notification schedules', () => {
      const schedules = localNotificationManager.getSchedules();
      expect(schedules.length).toBeGreaterThanOrEqual(4);

      const waterNotif = schedules.find((s) => s.category === 'hydration');
      expect(waterNotif).toBeDefined();
      expect(waterNotif?.title).toContain('Hydration');
      expect(waterNotif?.isEnabled).toBe(true);
    });

    it('toggles notification schedule enablement', () => {
      const schedules = localNotificationManager.getSchedules();
      const firstId = schedules[0].id;

      localNotificationManager.toggleSchedule(firstId, false);
      let updated = localNotificationManager.getSchedules().find((s) => s.id === firstId);
      expect(updated?.isEnabled).toBe(false);

      localNotificationManager.toggleSchedule(firstId, true);
      updated = localNotificationManager.getSchedules().find((s) => s.id === firstId);
      expect(updated?.isEnabled).toBe(true);
    });

    it('adds custom local notification schedule without network or FCM', () => {
      const custom = localNotificationManager.addCustomSchedule({
        title: 'Post-Workout Protein Shake',
        body: 'Consume 30g protein for muscle protein synthesis.',
        triggerTime: '19:00',
        daysOfWeek: [1, 3, 5],
        isEnabled: true,
        category: 'meal',
      });

      expect(custom.id).toMatch(/^custom_/);
      expect(custom.title).toBe('Post-Workout Protein Shake');

      const all = localNotificationManager.getSchedules();
      expect(all.some((s) => s.id === custom.id)).toBe(true);
    });

    it('calculates future trigger date correctly', () => {
      const nextTrigger = localNotificationManager.getNextTriggerTimestamp('23:59');
      expect(nextTrigger instanceof Date).toBe(true);
      expect(nextTrigger.getTime()).toBeGreaterThan(Date.now() - 60000);
    });
  });
});
