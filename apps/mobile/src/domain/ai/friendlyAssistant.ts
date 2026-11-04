/**
 * FITLIFE OS — Friendly Offline Fitness Assistant Engine
 * 100% offline, deterministic, zero paid cloud API dependencies.
 * Answers practical user questions tailored to actual stored user data.
 */

import { UserProfile } from '../../types';
import { getFriendlyGoalTitle } from './dailyPlan';

export type AssistantQuestionKey =
  | 'what_to_eat'
  | 'what_workout'
  | 'why_calorie_target'
  | 'how_to_increase_protein'
  | 'missed_yesterday_workout'
  | 'not_progressing'
  | 'train_or_recover';

export interface AssistantContext {
  profile: UserProfile;
  caloriesConsumed: number;
  targetCalories: number;
  proteinConsumedG: number;
  targetProteinG: number;
  todayWaterMl: number;
  targetWaterMl: number;
  recentSleepDurationMinutes?: number;
  recentSleepQuality?: number;
  consecutiveTrainingDays: number;
}

export interface AssistantAnswer {
  questionTitle: string;
  answerSummary: string;
  detailedExplanation: string;
  practicalActionSteps: string[];
  reassuranceNote?: string;
}

export function getFriendlyAssistantAnswer(
  key: AssistantQuestionKey,
  context: AssistantContext
): AssistantAnswer {
  const {
    profile,
    caloriesConsumed,
    targetCalories,
    proteinConsumedG,
    targetProteinG,
    todayWaterMl,
    targetWaterMl,
    recentSleepDurationMinutes,
    consecutiveTrainingDays,
  } = context;

  const remainingCalories = Math.max(0, targetCalories - caloriesConsumed);
  const remainingProtein = Math.max(0, targetProteinG - proteinConsumedG);
  const goalTitle = getFriendlyGoalTitle(profile.primaryGoal);

  switch (key) {
    case 'what_to_eat':
      return {
        questionTitle: 'What should I eat today?',
        answerSummary: `Your target today is ~${targetCalories} kcal with ${targetProteinG}g protein for ${goalTitle}. You have ${remainingCalories} kcal and ${remainingProtein}g protein remaining.`,
        detailedExplanation:
          'A balanced Indian meal plan works wonders without any restrictive crash dieting. You do not need to eat bland boiled food to reach your fitness goals. Focus on combining protein with fiber-rich complex carbohydrates.',
        practicalActionSteps: [
          'Breakfast: 2 boiled eggs or 50g paneer with 2 rotis / oats cooked in milk with nuts.',
          'Lunch: 1 bowl of cooked rice or 2 chapatis, 1 bowl of thick dal / sambar, 1 katori curd, and mixed vegetable thoran / sabzi.',
          'Evening Snack: 1 glass of milk, a handful of roasted chana or badam (almonds), or a boiled egg.',
          'Dinner: 2 chapatis with grilled fish / chicken breast / tofu / paneer and a fresh cucumber-tomato salad.',
        ],
        reassuranceNote: `Enjoy your food! Consistency over weeks matters far more than single-meal perfection. Current hydration: ${todayWaterMl}ml of ${targetWaterMl}ml target.`,
      };

    case 'what_workout':
      return {
        questionTitle: 'What workout should I do?',
        answerSummary: `Based on your environment (${profile.trainingEnvironment.toUpperCase()}) and fitness level (${profile.fitnessLevel.toUpperCase()}), here is your recommended routine.`,
        detailedExplanation:
          profile.trainingEnvironment === 'gym'
            ? 'At the gym, compound movements give you the highest return on investment. Start with an empty barbell or light dumbbells to master movement patterns.'
            : profile.trainingEnvironment === 'home'
            ? 'At home, bodyweight exercises combined with dumbbells provide all the mechanical tension required to build functional strength and muscle tone.'
            : 'Calisthenics uses your own body leverage. Focus on controlled tempos and steady breathing throughout each repetition.',
        practicalActionSteps: [
          'Warm-Up (5 mins): Arm circles, cat-cow stretches, 10 bodyweight squats.',
          profile.trainingEnvironment === 'gym'
            ? 'Main Routine: 3 sets of 8-10 Goblet Squats or Bench Press, followed by Lat Pulldowns and Dumbbell Romanian Deadlifts.'
            : 'Main Routine: 3 sets of Push-Ups (or knee push-ups), Bodyweight Squats, Glute Bridges, and Plank holds.',
          'Cool-Down (3-5 mins): Hamstring and chest doorway stretches.',
        ],
        reassuranceNote: 'If you feel tired or stiff today, drop the weight by 20% or do fewer sets. Showing up is the win.',
      };

    case 'why_calorie_target':
      return {
        questionTitle: 'Why is my calorie target this number?',
        answerSummary: `Your target of ${targetCalories} kcal/day is scientifically calculated from your personal body dimensions, age, and activity level.`,
        detailedExplanation:
          `Using the clinical Mifflin-St Jeor equation, we first calculated your Basal Metabolic Rate (BMR)—the energy needed just to stay alive at rest. Next, we applied your activity multiplier to find your Total Daily Energy Expenditure (TDEE). Finally, for your goal of "${goalTitle}", we applied an evidence-based adjustment: ` +
          (profile.primaryGoal === 'fat_loss'
            ? 'a gentle 20% deficit to trigger fat loss without slowing your thyroid or causing binge cravings.'
            : profile.primaryGoal === 'muscle_gain'
            ? 'a lean 10% surplus to provide amino acid and glycogen building blocks for muscle growth.'
            : 'a maintenance calorie level to keep your weight steady while improving strength and energy.'),
        practicalActionSteps: [
          'Do not drastically undereat below this number; eating too little prompts muscle loss and chronic fatigue.',
          'Track your weekly weight average over 2-3 weeks rather than day-to-day fluctuations.',
        ],
        reassuranceNote: 'We will automatically update this calculation whenever you log changes to your weight in Profile.',
      };

    case 'how_to_increase_protein':
      return {
        questionTitle: 'How can I easily increase my daily protein?',
        answerSummary: `Your protein target is ${targetProteinG}g/day (around ${(targetProteinG / (profile.currentWeightKg || 70)).toFixed(1)}g per kg of body weight).`,
        detailedExplanation:
          'Many people struggle with protein because traditional meals are heavy in carbs. You can easily hit your target by including one dedicated protein anchor in every meal rather than trying to cram it all into dinner.',
        practicalActionSteps: [
          'Add whole eggs or egg whites: 1 whole egg = 6g protein; 2 egg whites = 7g protein.',
          'Incorporate dairy: 100g paneer = 18g protein; 1 cup curd / dahi = 6g protein; 1 glass cow milk = 6.5g protein.',
          'Legumes & pulses: 1 bowl thick dal = 7-8g protein; 1 bowl chana / rajma = 12g protein; 50g soya chunks = 26g protein.',
          'Lean meats & seafood: 100g chicken breast = 26g protein; 100g fish = 20-22g protein.',
          'Spread it across 3-4 meals (e.g. 25-35g per meal) for optimal muscle protein synthesis.',
        ],
        reassuranceNote: 'Start small: adding just 1 extra egg or half a cup of curd per day easily adds 10-15g of protein over time.',
      };

    case 'missed_yesterday_workout':
      return {
        questionTitle: 'What should I do if I missed yesterday’s workout?',
        answerSummary: 'Do NOT stress or try to do a double workout today! Simply pick up with today’s scheduled session.',
        detailedExplanation:
          'Life happens: busy work days, family commitments, or unexpected fatigue. Missing one or two workouts has ZERO negative impact on your long-term fitness results. What harms progress is panic, guilt, or overtraining the next day to "compensate".',
        practicalActionSteps: [
          'Resume your normal routine today without punishing yourself.',
          'Do not skip meals or starve yourself to compensate for not exercising.',
          'Focus on getting a good night of sleep tonight and drinking plenty of water.',
        ],
        reassuranceNote: 'Fitness is a lifelong habit. A single missed day in a year of 365 days is mathematically insignificant.',
      };

    case 'not_progressing':
      return {
        questionTitle: 'Why am I not seeing progress as fast as I expected?',
        answerSummary: 'Progress in human physiology is non-linear and takes 4 to 8 weeks to become visually apparent.',
        detailedExplanation:
          'Body weight fluctuates by 1 to 2.5 kg daily purely due to water retention, salt intake, digestive contents, and hormonal cycles. If you have been lifting weights, you may be building muscle while losing fat simultaneously (body recomposition), which means the scale will not move even though your waist is shrinking and strength is improving.',
        practicalActionSteps: [
          'Look for non-scale victories: Are your clothes fitting looser? Do you have more daily energy? Are you lifting heavier reps?',
          'Measure your waist with a tape measure once every 2 weeks instead of checking the scale daily.',
          'Ensure you are consistently logging meals—untracked cooking oils and snacks often add hidden calories.',
          'Prioritize 7-8 hours of sleep: lack of sleep elevates cortisol, which causes temporary water retention.',
        ],
        reassuranceNote: 'Stay patient and trust the process. Real physiological adaptations take consistent weeks to solidify.',
      };

    case 'train_or_recover':
      const shouldRest =
        consecutiveTrainingDays >= 2 ||
        (recentSleepDurationMinutes !== undefined && recentSleepDurationMinutes < 330);

      return {
        questionTitle: 'Should I train today or take a recovery day?',
        answerSummary: shouldRest
          ? 'Today is best spent on Active Recovery and gentle mobility 🌿'
          : 'You are well-primed for a Training Session today! 🏋️',
        detailedExplanation: shouldRest
          ? `You have logged ${consecutiveTrainingDays} consecutive days of workouts or had less than 5.5 hours of sleep. Muscles grow during rest, not during lifting. Overtraining increases joint strain.`
          : 'Your nervous system and recovery capacity are in a good zone. A standard workout will stimulate positive muscular adaptation.',
        practicalActionSteps: shouldRest
          ? [
              'Go for a 20-30 minute relaxed outdoor walk.',
              'Spend 10 minutes doing gentle hip and spine mobility stretches.',
              'Drink your full water target and aim for an early bedtime tonight.',
            ]
          : [
              'Perform a thorough 5-minute dynamic warm-up.',
              'Focus on 3-4 core compound movements with 60-90 seconds of rest between sets.',
              'Stop 1-2 reps shy of muscular failure to maintain clean form.',
            ],
        reassuranceNote: shouldRest
          ? 'Rest days are when your body repairs and gets stronger. Embrace the recovery!'
          : 'Listen to your body during the session—if anything feels painful, reduce the weight or stop.',
      };

    default:
      return {
        questionTitle: 'General Guidance',
        answerSummary: 'Focus on balanced nutrition, adequate hydration, and consistent daily movement.',
        detailedExplanation: 'FITLIFE OS is here to guide you step by step.',
        practicalActionSteps: ['Log your meals', 'Drink water regularly', 'Get 7-8 hours of sleep'],
      };
  }
}
