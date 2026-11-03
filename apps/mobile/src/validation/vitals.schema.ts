import { z } from 'zod';

export const hydrationLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  loggedAt: z.string().datetime(),
  amountMl: z.number().int().positive().max(5000),
  clientCreatedAt: z.string().datetime(),
  isDeleted: z.boolean().default(false),
});

export const habitFrequencySchema = z.enum(['daily', 'weekdays', 'specific_days']);

export const habitSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(128),
  icon: z.string().max(32).default('check'),
  targetFrequency: habitFrequencySchema.default('daily'),
  daysOfWeek: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5, 6, 7]),
  isArchived: z.boolean().default(false),
});

export const sleepLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sleepDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  bedtime: z.string().datetime(),
  wakeTime: z.string().datetime(),
  durationMinutes: z.number().int().min(30).max(1440),
  subjectiveQuality: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  notes: z.string().max(1000).optional(),
  clientCreatedAt: z.string().datetime(),
  isDeleted: z.boolean().default(false),
});

export const bodyMeasurementSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  measuredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weightKg: z.number().positive().max(500),
  waistCm: z.number().positive().max(300).optional(),
  chestCm: z.number().positive().max(300).optional(),
  armsCm: z.number().positive().max(100).optional(),
  thighsCm: z.number().positive().max(150).optional(),
  hipsCm: z.number().positive().max(300).optional(),
  neckCm: z.number().positive().max(100).optional(),
  notes: z.string().max(1000).optional(),
});
