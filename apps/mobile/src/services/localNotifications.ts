/**
 * FITLIFE OS — Pure Local Notifications Manager
 * 100% FLOSS & F-Droid compliant. Zero Google Play Services / Firebase dependencies.
 * Uses local scheduling triggers for workout, meal, and hydration prompts.
 */

export interface LocalNotificationSchedule {
  id: string;
  title: string;
  body: string;
  triggerTime: string; // HH:mm format (e.g. "08:00")
  daysOfWeek: number[]; // 1 = Monday, 7 = Sunday
  isEnabled: boolean;
  category: 'workout' | 'hydration' | 'meal' | 'sleep';
}

const DEFAULT_SCHEDULES: LocalNotificationSchedule[] = [
  {
    id: 'notif_water_morning',
    title: 'Hydration Check 💧',
    body: 'Start your morning with 500ml of water to jumpstart your metabolism.',
    triggerTime: '08:30',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    isEnabled: true,
    category: 'hydration',
  },
  {
    id: 'notif_workout_reminder',
    title: 'Training Session Awaits 🏋️',
    body: 'Consistency creates progress. Your scheduled workout is ready.',
    triggerTime: '17:30',
    daysOfWeek: [1, 2, 3, 4, 5],
    isEnabled: true,
    category: 'workout',
  },
  {
    id: 'notif_water_afternoon',
    title: 'Stay Hydrated 💧',
    body: 'Time for an afternoon water refill! Keep your energy up.',
    triggerTime: '14:30',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    isEnabled: true,
    category: 'hydration',
  },
  {
    id: 'notif_sleep_winddown',
    title: 'Sleep Hygiene & Recovery 🌙',
    body: 'Target 7-9 hours of sleep tonight for optimal muscle recovery.',
    triggerTime: '22:00',
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    isEnabled: true,
    category: 'sleep',
  },
];

class LocalNotificationManager {
  private schedules: LocalNotificationSchedule[] = [...DEFAULT_SCHEDULES];

  public getSchedules(): LocalNotificationSchedule[] {
    return this.schedules;
  }

  public toggleSchedule(id: string, isEnabled: boolean): void {
    this.schedules = this.schedules.map((s) =>
      s.id === id ? { ...s, isEnabled } : s
    );
  }

  public addCustomSchedule(schedule: Omit<LocalNotificationSchedule, 'id'>): LocalNotificationSchedule {
    const newSchedule: LocalNotificationSchedule = {
      ...schedule,
      id: `custom_${Date.now()}`,
    };
    this.schedules.push(newSchedule);
    return newSchedule;
  }

  /**
   * Calculates next trigger timestamp for a given HH:mm time
   */
  public getNextTriggerTimestamp(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(hours, minutes, 0, 0);

    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }
    return trigger;
  }
}

export const localNotificationManager = new LocalNotificationManager();
