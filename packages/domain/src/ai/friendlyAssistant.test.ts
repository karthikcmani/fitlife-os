import { describe, it, expect } from '@jest/globals';
import { getFriendlyAssistantAnswer, AssistantQuestionKey, AssistantContext } from './friendlyAssistant';
import { UserProfile } from '@fitlife/shared-types';

describe('Friendly Offline Assistant Engine', () => {
  const mockProfile: UserProfile = {
    userId: 'user-offline-1',
    displayName: 'Rahul',
    dateOfBirth: '1995-05-15',
    heightCm: 175,
    currentWeightKg: 75,
    gender: 'male',
    fitnessLevel: 'beginner',
    activityLevel: 'moderate',
    primaryGoal: 'fat_loss',
    trainingEnvironment: 'gym',
    availableTrainingDays: 4,
    preferredUnitSystem: 'metric',
    dailyWaterTargetMl: 3000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseContext: AssistantContext = {
    profile: mockProfile,
    caloriesConsumed: 1200,
    targetCalories: 2100,
    proteinConsumedG: 60,
    targetProteinG: 135,
    todayWaterMl: 1500,
    targetWaterMl: 3000,
    recentSleepDurationMinutes: 450,
    recentSleepQuality: 4,
    consecutiveTrainingDays: 2,
  };

  const allKeys: AssistantQuestionKey[] = [
    'what_to_eat',
    'what_workout',
    'why_calorie_target',
    'how_to_increase_protein',
    'missed_yesterday_workout',
    'not_progressing',
    'train_or_recover',
  ];

  it('answers all 7 core questions with rich practical guidance', () => {
    for (const key of allKeys) {
      const answer = getFriendlyAssistantAnswer(key, baseContext);
      expect(answer.questionTitle).toBeTruthy();
      expect(answer.answerSummary.length).toBeGreaterThan(15);
      expect(answer.detailedExplanation.length).toBeGreaterThan(20);
      expect(answer.practicalActionSteps.length).toBeGreaterThanOrEqual(2);
      expect(answer.reassuranceNote).toBeTruthy();
    }
  });

  it('reassures the user without guilt when missed_yesterday_workout is asked', () => {
    const answer = getFriendlyAssistantAnswer('missed_yesterday_workout', baseContext);
    expect(answer.detailedExplanation).toContain('Missing one or two workouts has ZERO negative impact');
    expect(answer.reassuranceNote).toContain('A single missed day');
  });

  it('suggests Indian protein sources in how_to_increase_protein', () => {
    const answer = getFriendlyAssistantAnswer('how_to_increase_protein', baseContext);
    const stepsJoined = answer.practicalActionSteps.join(' ').toLowerCase();
    expect(stepsJoined).toContain('paneer');
    expect(stepsJoined).toContain('dal');
    expect(stepsJoined).toContain('egg');
  });

  it('recommends recovery when user has trained 3+ consecutive days or had poor sleep', () => {
    const fatiguedContext: AssistantContext = {
      ...baseContext,
      consecutiveTrainingDays: 4,
      recentSleepDurationMinutes: 300, // 5 hours
    };
    const answer = getFriendlyAssistantAnswer('train_or_recover', fatiguedContext);
    expect(answer.answerSummary).toContain('Active Recovery');
    expect(answer.reassuranceNote).toContain('Rest days');
  });
});
