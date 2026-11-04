/**
 * FITLIFE OS — Intelligent Daily Fitness Guide Engine
 * 100% offline, deterministic physiological rules engine.
 * Generates personalized, beginner-friendly daily guidance answering:
 * 1. What should I do today?
 * 2. What should I eat today?
 * 3. How much water should I drink?
 * 4. Should I exercise or recover today?
 * 5. How am I progressing towards my goal?
 */

import { UserProfile, PrimaryGoal } from '../../types';

export interface DailyNutritionContext {
  caloriesConsumed: number;
  targetCalories: number;
  proteinConsumedG: number;
  targetProteinG: number;
  carbsConsumedG: number;
  fatConsumedG: number;
}

export interface DailyPlanInput {
  profile: UserProfile;
  nutrition: DailyNutritionContext;
  todayWaterMl: number;
  hasWorkoutLoggedToday: boolean;
  isWorkoutInProgress?: boolean;
  consecutiveTrainingDays: number;
  recentSleepDurationMinutes?: number;
  recentSleepQuality?: number; // 1-5
  completedHabitsCount: number;
  totalHabitsCount: number;
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  currentHour?: number;
}

export interface DailyWorkoutGuidance {
  isRestDay: boolean;
  headline: string;
  subheadline: string;
  whyThisIsSuggested: string;
  recommendedRoutine: string;
  warmupTip: string;
  cooldownTip: string;
  actionText: string;
}

export interface DailyNutritionGuidance {
  headline: string;
  conversationalSummary: string;
  whyThisIsSuggested: string;
  mealSuggestion: string;
  proteinTip: string;
}

export interface DailyHydrationGuidance {
  targetMl: number;
  currentMl: number;
  headline: string;
  conversationalStatus: string;
  whyThisIsSuggested: string;
  suggestedSchedule: string;
}

export interface DailySleepRecoveryGuidance {
  headline: string;
  conversationalStatus: string;
  whyThisIsSuggested: string;
  sleepTargetHours: number;
  actionableTip: string;
}

export interface DailyPlanOutput {
  greeting: string;
  goalSummary: string;
  workout: DailyWorkoutGuidance;
  nutrition: DailyNutritionGuidance;
  hydration: DailyHydrationGuidance;
  sleep: DailySleepRecoveryGuidance;
  habitFocus: {
    title: string;
    description: string;
    whyItMatters: string;
  };
  nextBestAction: {
    title: string;
    reason: string;
    screenTarget: 'workout' | 'nutrition' | 'vitals';
  };
}

export function getFriendlyGoalTitle(goal: PrimaryGoal): string {
  switch (goal) {
    case 'fat_loss':
      return 'Healthy Fat Loss';
    case 'muscle_gain':
      return 'Muscle Building';
    case 'recomposition':
      return 'Body Recomposition';
    case 'strength':
      return 'Strength Building';
    case 'general_fitness':
      return 'General Fitness & Mobility';
    case 'stamina':
      return 'Endurance & Stamina';
    case 'health_consistency':
      return 'Daily Health & Habit Consistency';
    case 'maintenance':
    default:
      return 'Maintaining Current Fitness';
  }
}

/**
 * Generates the intelligent, conversational Daily Fitness Guide.
 */
export function generateDailyPlan(input: DailyPlanInput): DailyPlanOutput {
  const {
    profile,
    nutrition,
    todayWaterMl,
    hasWorkoutLoggedToday,
    consecutiveTrainingDays,
    recentSleepDurationMinutes,
    recentSleepQuality,
    completedHabitsCount,
    totalHabitsCount,
  } = input;

  const currentHour = input.currentHour ?? new Date().getHours();
  let timeGreeting = 'Good morning';
  if (currentHour >= 12 && currentHour < 17) {
    timeGreeting = 'Good afternoon';
  } else if (currentHour >= 17 && currentHour < 21) {
    timeGreeting = 'Good evening';
  } else if (currentHour >= 21 || currentHour < 5) {
    timeGreeting = 'Good night';
  }
  const greeting = `${timeGreeting}, ${profile.displayName}!`;

  const availableDays = profile.availableTrainingDays ?? 3;
  const isBeginner = profile.fitnessLevel === 'beginner';

  // 1. Workout vs Recovery Logic
  // If user has worked out 2+ consecutive days, or trained 3+ days as beginner, or reported very poor sleep, advise active recovery
  const shouldRecover =
    consecutiveTrainingDays >= 2 ||
    (isBeginner && consecutiveTrainingDays >= 1) ||
    (recentSleepQuality !== undefined && recentSleepQuality <= 2) ||
    (recentSleepDurationMinutes !== undefined && recentSleepDurationMinutes < 330);

  let workoutGuidance: DailyWorkoutGuidance;

  if (hasWorkoutLoggedToday) {
    workoutGuidance = {
      isRestDay: false,
      headline: 'Workout Completed! Great Effort Today 🏆',
      subheadline: 'Your session is logged. Prioritize nutrient intake and hydration to rebuild muscle fibers.',
      whyThisIsSuggested: 'Post-workout recovery is when actual strength adaptation occurs. Rest facilitates muscle repair.',
      recommendedRoutine: 'Rest and light walking only for the remainder of the day.',
      warmupTip: 'Hydrate and stretch any tight muscle groups.',
      cooldownTip: 'Gentle 5-minute hamstring and chest stretches help down-regulate your nervous system.',
      actionText: 'View Completed Workout',
    };
  } else if (input.isWorkoutInProgress) {
    workoutGuidance = {
      isRestDay: false,
      headline: 'Workout In Progress 🏋️',
      subheadline: 'Your session is currently running. Return to the Workout screen to log your completed sets.',
      whyThisIsSuggested: 'Focus on completing scheduled sets with steady rest intervals to stimulate muscular development.',
      recommendedRoutine: 'Continue your active training session.',
      warmupTip: 'Stay warm between sets with light pacing.',
      cooldownTip: 'Perform a 5-minute static stretch routine once all sets are finished.',
      actionText: 'Resume Active Workout',
    };
  } else if (shouldRecover) {
    workoutGuidance = {
      isRestDay: true,
      headline: 'Active Recovery & Movement Day 🌿',
      subheadline: 'No heavy lifting scheduled today. Take a gentle 20-30 minute walk or do light stretching.',
      whyThisIsSuggested: `You have planned ${availableDays} workout days this week. Rest days are necessary to prevent joint inflammation and central nervous system burnout.`,
      recommendedRoutine: '20-30 min brisk walk outdoors + gentle mobility flow.',
      warmupTip: 'Shoulder rolls, cat-cow stretches, and ankle circles.',
      cooldownTip: 'Deep diaphragmatic breathing to enhance parasympathetic recovery.',
      actionText: 'Log Gentle Activity',
    };
  } else {
    const routineName =
      profile.trainingEnvironment === 'gym'
        ? isBeginner
          ? 'Full-Body Foundation (Squat, Press, Pull)'
          : 'Upper / Lower Strength Progression'
        : profile.trainingEnvironment === 'home'
        ? 'Home Dumbbell & Bodyweight Circuit'
        : 'Calisthenics & Functional Core Routine';

    workoutGuidance = {
      isRestDay: false,
      headline: 'Today is a Training Day 🏋️',
      subheadline: `Focus on clean form: ${routineName}`,
      whyThisIsSuggested: `Designed for your "${getFriendlyGoalTitle(profile.primaryGoal)}" goal. Performing resistance exercise stimulates muscle retention and metabolic vitality.`,
      recommendedRoutine: routineName,
      warmupTip: 'Spend 5 minutes doing arm circles, bodyweight squats, and hip openers before adding resistance.',
      cooldownTip: 'Spend 3-5 minutes stretching the working muscles to reduce next-day stiffness.',
      actionText: 'Start Today’s Workout',
    };
  }

  // 2. Nutrition & Protein Guidance
  const remainingCalories = Math.max(0, nutrition.targetCalories - nutrition.caloriesConsumed);
  const remainingProtein = Math.max(0, nutrition.targetProteinG - nutrition.proteinConsumedG);

  let nutritionSummary = '';
  let mealSuggestion = '';
  let proteinTip = '';

  if (nutrition.caloriesConsumed === 0) {
    nutritionSummary = `Your daily calorie target is ~${nutrition.targetCalories} kcal with ${nutrition.targetProteinG}g protein. You haven't logged any meals yet today.`;
    mealSuggestion =
      'Start with a nourishing breakfast like 2-3 boiled eggs or paneer with 2 rotis or a warm bowl of oats with milk and almonds.';
    proteinTip = 'Aiming for 25-35g of protein per meal prevents energy crashes and supports steady metabolism.';
  } else if (remainingCalories < 200) {
    nutritionSummary = `You've reached your calorie target for the day (${nutrition.caloriesConsumed} / ${nutrition.targetCalories} kcal).`;
    mealSuggestion = 'If you feel hungry later, choose light hydration like warm herbal tea, lemon water, or sliced cucumber.';
    proteinTip = `Protein consumed: ${nutrition.proteinConsumedG}g of ${nutrition.targetProteinG}g target. Well balanced!`;
  } else {
    nutritionSummary = `You've consumed ${nutrition.caloriesConsumed} kcal so far (${remainingCalories} kcal remaining). Protein logged: ${nutrition.proteinConsumedG}g / ${nutrition.targetProteinG}g.`;
    if (remainingProtein > 30) {
      mealSuggestion =
        'For your next meal, include a quality protein source: dal with curd, 2-3 eggs, 100g chicken breast, fish, or 100g paneer with vegetables.';
      proteinTip = `You have ${remainingProtein}g of protein left today. Distribute it across your remaining meals.`;
    } else {
      mealSuggestion = 'You are very close to your protein target! A light snack like a cup of curd or a handful of roasted chana is plenty.';
      proteinTip = 'Consistently meeting your protein requirement protects muscle tissue while staying satisfied.';
    }
  }

  const nutritionGuidance: DailyNutritionGuidance = {
    headline: `Calorie & Macro Guide • ${getFriendlyGoalTitle(profile.primaryGoal)}`,
    conversationalSummary: nutritionSummary,
    whyThisIsSuggested:
      profile.primaryGoal === 'fat_loss'
        ? 'A controlled, gentle calorie deficit helps you lose body fat steadily without sacrificing energy or feeling deprived.'
        : profile.primaryGoal === 'muscle_gain'
        ? 'A slight calorie surplus gives your body the extra building blocks needed to synthesize new muscle tissue.'
        : 'Eating around your maintenance calories provides balanced daily energy while supporting functional strength.',
    mealSuggestion,
    proteinTip,
  };

  // 3. Time-Aware Hydration Guidance
  const waterTarget = profile.dailyWaterTargetMl || 2500;
  const remainingWater = Math.max(0, waterTarget - todayWaterMl);
  let hydrationStatus = '';
  let hydrationSchedule = '';
  let hydrationHeadline = 'Daily Hydration Routine 💧';

  if (currentHour >= 5 && currentHour < 12) {
    // Morning (5:00 AM - 11:59 AM)
    hydrationHeadline = 'Morning Hydration 💧';
    if (todayWaterMl === 0) {
      hydrationStatus = `Start your morning with a glass of water (~250-500ml) to rehydrate after sleep. Your daily target estimate is ${(waterTarget / 1000).toFixed(1)}L.`;
      hydrationSchedule = 'Drink 1 glass upon waking, then sip a glass before your breakfast.';
    } else {
      hydrationStatus = `Great morning start: ${(todayWaterMl / 1000).toFixed(1)}L logged so far. Target: ${(waterTarget / 1000).toFixed(1)}L.`;
      hydrationSchedule = 'Sip water steadily throughout your morning activities.';
    }
  } else if (currentHour >= 12 && currentHour < 17) {
    // Afternoon (12:00 PM - 4:59 PM)
    hydrationHeadline = 'Midday Hydration Check 💧';
    if (todayWaterMl === 0) {
      hydrationStatus = `It is afternoon and you haven't logged water yet. Catch up gently with a 300ml glass now—do not chug excessive amounts at once.`;
      hydrationSchedule = 'Keep a bottle nearby and drink 1 glass every 1.5 to 2 hours this afternoon.';
    } else if (remainingWater === 0) {
      hydrationStatus = `Target met! You have reached your ${(waterTarget / 1000).toFixed(1)}L daily estimate. Drink only as thirst dictates.`;
      hydrationSchedule = 'Sip lightly when thirsty. No need to force extra water.';
    } else {
      hydrationStatus = `Logged ${(todayWaterMl / 1000).toFixed(1)}L of ${(waterTarget / 1000).toFixed(1)}L (${(remainingWater / 1000).toFixed(1)}L remaining).`;
      hydrationSchedule = 'Drink 1 glass mid-afternoon and 1 glass before dinner.';
    }
  } else if (currentHour >= 17 && currentHour < 21) {
    // Evening (5:00 PM - 8:59 PM)
    hydrationHeadline = 'Evening Hydration 💧';
    if (remainingWater === 0) {
      hydrationStatus = `Awesome! You have met your ${(waterTarget / 1000).toFixed(1)}L target for today. Drink only to satisfy natural thirst.`;
      hydrationSchedule = 'Taper off water consumption over the next 1-2 hours before sleep.';
    } else if (todayWaterMl === 0) {
      hydrationStatus = `Evening check-in: It looks like water wasn't logged today. Have 1-2 moderate glasses with dinner, but avoid forcing huge volumes before bed.`;
      hydrationSchedule = 'Drink comfortably with dinner; avoid heavy drinking 1-2 hours before sleeping.';
    } else {
      hydrationStatus = `Logged ${(todayWaterMl / 1000).toFixed(1)}L so far (${(remainingWater / 1000).toFixed(1)}L remaining from ${(waterTarget / 1000).toFixed(1)}L estimate).`;
      hydrationSchedule = 'Sip comfortably with dinner, then taper off 1-2 hours before bed for sound sleep.';
    }
  } else {
    // Night (9:00 PM - 4:59 AM)
    hydrationHeadline = 'Nighttime Hydration 🌙';
    hydrationStatus = `Avoid forcing large amounts of water near bedtime. Chugging water now will only interrupt your restorative deep sleep.`;
    hydrationSchedule = 'Take small sips only if thirsty. Prioritize uninterrupted rest tonight.';
  }

  const hydrationGuidance: DailyHydrationGuidance = {
    targetMl: waterTarget,
    currentMl: todayWaterMl,
    headline: hydrationHeadline,
    conversationalStatus: hydrationStatus,
    whyThisIsSuggested: 'Hydration targets are personalized estimates based on body dimensions and climate, not rigid medical mandates. Adjust based on personal thirst and comfort.',
    suggestedSchedule: hydrationSchedule,
  };

  // 4. Sleep & Recovery Guidance
  let sleepSummary = '';
  let sleepTip = '';
  const sleepTargetHours = 8;

  if (!recentSleepDurationMinutes) {
    sleepSummary = 'No sleep recorded yet. Aim for 7 to 9 hours of uninterrupted rest tonight.';
    sleepTip = 'Keep your bedroom cool and dark, and try setting screens aside 30 minutes before sleep.';
  } else {
    const sleepHours = (recentSleepDurationMinutes / 60).toFixed(1);
    if (recentSleepDurationMinutes < 390) {
      sleepSummary = `Recorded ${sleepHours} hours of sleep last night. That is on the lower side for recovery.`;
      sleepTip = 'Take it easier today. Prioritize an early bedtime tonight to allow your body to catch up.';
    } else {
      sleepSummary = `Recorded ${sleepHours} hours of rest last night. Your recovery score is primed for daily activity!`;
      sleepTip = 'Maintain consistent sleep and wake times to reinforce your natural circadian rhythm.';
    }
  }

  const sleepGuidance: DailySleepRecoveryGuidance = {
    headline: 'Sleep & Nervous System Recovery 🌙',
    conversationalStatus: sleepSummary,
    whyThisIsSuggested: 'During deep sleep, your body repairs micro-tears in muscle fibers and replenishes glycogen stores.',
    sleepTargetHours,
    actionableTip: sleepTip,
  };

  // 5. Daily Habit Focus (Time-Aware)
  let defaultHabitTitle = '';
  let defaultHabitDesc = '';

  if (currentHour < 12) {
    defaultHabitTitle = 'Morning Habit: 1 Glass of Water';
    defaultHabitDesc = 'Hydrate your body first thing upon waking before drinking coffee or tea.';
  } else if (currentHour < 17) {
    defaultHabitTitle = 'Afternoon Habit: 5-Minute Movement Break';
    defaultHabitDesc = 'Stand up, stretch your hip flexors, and walk for 5 minutes away from screens.';
  } else if (currentHour < 21) {
    defaultHabitTitle = 'Evening Habit: Mindful Dinner & Hydration Taper';
    defaultHabitDesc = 'Enjoy a balanced dinner and begin reducing fluid intake 1-2 hours before bedtime.';
  } else {
    defaultHabitTitle = 'Night Habit: Screen Dimming & Sleep Wind-Down';
    defaultHabitDesc = 'Dim lights and set mobile screens aside 30 minutes before sleep for deeper REM cycles.';
  }

  const habitFocus = {
    title: completedHabitsCount >= totalHabitsCount && totalHabitsCount > 0
      ? 'All Daily Habits Completed! 🌟'
      : defaultHabitTitle,
    description: completedHabitsCount >= totalHabitsCount && totalHabitsCount > 0
      ? 'Great job keeping consistent today. Consistency compounds over weeks!'
      : defaultHabitDesc,
    whyItMatters: 'Small, repeated actions beat sporadic intense effort every single time.',
  };

  // 6. Next Best Action
  let nextBestAction: DailyPlanOutput['nextBestAction'];
  if (input.isWorkoutInProgress) {
    nextBestAction = {
      title: 'Resume Active Workout',
      reason: 'Your workout session is currently running.',
      screenTarget: 'workout',
    };
  } else if (todayWaterMl === 0 && currentHour < 17) {
    nextBestAction = {
      title: 'Drink & Log a Glass of Water',
      reason: 'Start your hydration for the day (250-500ml).',
      screenTarget: 'vitals',
    };
  } else if (!hasWorkoutLoggedToday && !workoutGuidance.isRestDay) {
    nextBestAction = {
      title: 'Start Today’s Workout Session',
      reason: 'Review exercises, recommended sets, and beginner form cues.',
      screenTarget: 'workout',
    };
  } else if (recentSleepDurationMinutes === undefined) {
    nextBestAction = {
      title: 'Record Last Night’s Sleep',
      reason: 'Log your sleep hours and quality to view physiological recovery readiness.',
      screenTarget: 'vitals',
    };
  } else if (nutrition.caloriesConsumed === 0) {
    nextBestAction = {
      title: 'Log Your Meal',
      reason: 'Keep track of your protein and energy intake.',
      screenTarget: 'nutrition',
    };
  } else {
    nextBestAction = {
      title: 'Log an Afternoon Water Refill',
      reason: 'Stay ahead of afternoon fatigue.',
      screenTarget: 'vitals',
    };
  }

  return {
    greeting,
    goalSummary: `Primary Objective: ${getFriendlyGoalTitle(profile.primaryGoal)} • ${availableDays} Days/Wk`,
    workout: workoutGuidance,
    nutrition: nutritionGuidance,
    hydration: hydrationGuidance,
    sleep: sleepGuidance,
    habitFocus,
    nextBestAction,
  };
}
