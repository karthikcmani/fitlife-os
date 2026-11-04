/**
 * FITLIFE OS — Deterministic Personal Fitness & Nutrition Plan Generator
 * 100% offline, equipment-aware, limitation-defensive, and beginner-friendly.
 * Generates structured workout routines and familiar Indian/Kerala portion meals.
 */

import {
  UserProfile,
  PersonalCoachingPlan,
  PlanWorkoutRoutine,
  PlanExerciseItem,
  PlanMealSuggestion,
  EquipmentItem,
  PhysicalLimitation,
} from '../../types/user';
import { calculateBmrMifflinStJeor, calculateTdee, calculateTargetCalories, calculateMacronutrients } from '../nutrition/metabolic';
import { calculateAgeFromDob } from '../user/dob';

/**
 * Exercise database catalog for the personal coach.
 */
interface CoachExerciseDefinition {
  id: string;
  name: string;
  category: 'bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'resistance_band';
  requiredEquipment: EquipmentItem[];
  targetedMusclesSimple: string;
  whyIncluded: string;
  startingPosition: string;
  instructions: string[];
  recommendedSets: number;
  recommendedReps: string;
  recommendedRestSec: number;
  breathingGuidance: string;
  commonMistakes: string[];
  easierAlternative?: string;
  harderAlternative?: string;
  contraindicatedLimitations?: PhysicalLimitation[];
}

const COACH_EXERCISE_CATALOG: CoachExerciseDefinition[] = [
  // --- BODYWEIGHT MOVEMENTS ---
  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Air Squat',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Thighs, Hips & Glutes',
    whyIncluded: 'Builds foundational lower-body strength and mobility without stressing joints.',
    startingPosition: 'Stand tall with your feet slightly wider than shoulder-width, toes turned slightly outward.',
    instructions: [
      'Reach your arms forward for balance.',
      'Bend your hips and knees smoothly, sitting back like into an imaginary sturdy chair.',
      'Lower until your thighs are roughly parallel to the floor (or as low as feels comfortable).',
      'Push firmly through the center of your feet to return to standing.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Inhale smoothly as you lower down; exhale with control as you stand up.',
    commonMistakes: ['Letting knees cave inwards toward each other', 'Lifting heels off the ground', 'Rounding the spine'],
    easierAlternative: 'Chair Box Squat (sit down onto a sturdy chair and stand back up)',
    harderAlternative: 'Dumbbell Goblet Squat',
  },
  {
    id: 'knee-push-up',
    name: 'Incline or Knee Push-Up',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Chest, Front Shoulders & Arms',
    whyIncluded: 'Develops pressing strength and core control with reduced bodyweight resistance.',
    startingPosition: 'Kneel on a soft mat or place hands on an elevated surface like a sofa or counter. Hands shoulder-width apart.',
    instructions: [
      'Keep your body in a straight line from your head down to your knees.',
      'Lower your chest toward the surface by bending your elbows back at a 45-degree angle.',
      'Lower until your chest is 2 inches above the surface.',
      'Press smoothly back up until your arms are fully extended.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Inhale as your chest lowers; exhale as you push the ground away.',
    commonMistakes: ['Flaring elbows out wide at 90 degrees', 'Sagging hips and overarching the lower back'],
    easierAlternative: 'Wall Push-Up (hands placed against a wall standing upright)',
    harderAlternative: 'Full Standard Floor Push-Up',
  },
  {
    id: 'standard-push-up',
    name: 'Standard Floor Push-Up',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Chest, Shoulders, Arms & Abs',
    whyIncluded: 'The gold-standard upper-body push exercise that builds pressing power and torso stability.',
    startingPosition: 'Get into a high plank with hands slightly wider than shoulders and toes planted firmly.',
    instructions: [
      'Brace your abdominal muscles and squeeze your glutes to form a solid, rigid plank.',
      'Lower your entire body in one piece until your chest is about an inch from the floor.',
      'Keep your elbows tucked at roughly 45 degrees relative to your torso.',
      'Press through your palms to return to the starting plank position.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–12 reps',
    recommendedRestSec: 75,
    breathingGuidance: 'Breathe in as you lower your chest; breathe out forcefully as you press up.',
    commonMistakes: ['Dipping head forward before the chest', 'Allowing the lower back to sag'],
    easierAlternative: 'Incline or Knee Push-Up',
    harderAlternative: 'Diamond Push-Up or Feet-Elevated Push-Up',
  },
  {
    id: 'glute-bridge',
    name: 'Floor Glute Bridge',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Glutes (Buttocks) & Hamstrings',
    whyIncluded: 'Activates hip extensor muscles while supporting spinal alignment and taking pressure off knees.',
    startingPosition: 'Lie flat on your back with knees bent, feet flat on the floor hip-width apart.',
    instructions: [
      'Rest your arms alongside your body with palms facing down.',
      'Press your heels firmly into the ground.',
      'Lift your hips upward until your knees, hips, and shoulders form a straight line.',
      'Squeeze your glutes tightly at the top for 2 seconds, then lower down smoothly.',
    ],
    recommendedSets: 3,
    recommendedReps: '12–15 reps',
    recommendedRestSec: 45,
    breathingGuidance: 'Exhale as you bridge your hips upward; inhale as you slowly lower.',
    commonMistakes: ['Hyperextending the lower back rather than squeezing the glutes', 'Pushing off toes instead of heels'],
    easierAlternative: 'Isometric Glute Squeeze (lying flat)',
    harderAlternative: 'Single-Leg Glute Bridge',
  },
  {
    id: 'step-back-lunge',
    name: 'Reverse Step-Back Lunge',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Front & Back of Thighs, Balance',
    whyIncluded: 'Strengthens each leg individually while being gentle on the kneecap compared to forward lunges.',
    startingPosition: 'Stand tall with feet hip-width apart and hands on your hips or chest.',
    instructions: [
      'Take a comfortable, controlled step backwards with your left foot.',
      'Lower both knees toward the floor until both form roughly 90-degree angles.',
      'Keep your torso upright and front knee directly above your front ankle.',
      'Push off the front heel to step back to the starting standing position. Switch legs.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps per leg',
    recommendedRestSec: 60,
    breathingGuidance: 'Inhale as you step back and lower; exhale as you step forward.',
    commonMistakes: ['Leaning heavily forward over the front knee', 'Banging the back knee into the floor'],
    easierAlternative: 'Stationary Split Squat (holding onto a wall for balance)',
    harderAlternative: 'Dumbbell Walking Lunge',
    contraindicatedLimitations: ['knee_pain'],
  },
  {
    id: 'forearm-plank',
    name: 'Forearm Core Plank',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Abdominal Wall, Lower Back & Core',
    whyIncluded: 'Builds isometric endurance and spinal protection without twisting or flexing the spine.',
    startingPosition: 'Rest on your forearms with elbows directly under shoulders, legs extended back.',
    instructions: [
      'Keep your forearms parallel on the mat.',
      'Lift your body off the floor so you are supported only on forearms and toes.',
      'Brace your stomach as if expecting a gentle tap, keeping hips level.',
      'Hold the position steady without letting hips rise into the air or sag toward the floor.',
    ],
    recommendedSets: 3,
    recommendedReps: '20–30 seconds hold',
    recommendedRestSec: 45,
    breathingGuidance: 'Breathe steadily and smoothly in small calm breaths; never hold your breath.',
    commonMistakes: ['Holding breath', 'Letting hips sag down toward the floor', 'Craning neck looking forward'],
    easierAlternative: 'Knee Plank (knees resting on mat instead of toes)',
    harderAlternative: 'Plank with Shoulder Taps',
  },
  {
    id: 'bird-dog',
    name: 'Bird-Dog Spinal Stability',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Lower Back, Core & Glutes',
    whyIncluded: 'Recommended by back specialists to strengthen the posterior chain with zero spinal compression.',
    startingPosition: 'On hands and knees on a mat: hands under shoulders, knees under hips.',
    instructions: [
      'Slowly extend your right arm straight forward and left leg straight back at the same time.',
      'Keep your torso flat like a tabletop without tilting to either side.',
      'Hold the extended position for 2 seconds.',
      'Return to hands and knees smoothly and repeat on the opposite side.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps per side',
    recommendedRestSec: 45,
    breathingGuidance: 'Exhale as you reach arm and leg out; inhale as you bring them back.',
    commonMistakes: ['Arching the lower back when kicking leg up', 'Rotating hips sideways'],
    easierAlternative: 'Single Arm or Single Leg Extensions individually',
    harderAlternative: 'Plank Bird-Dog',
  },

  // --- DUMBBELL MOVEMENTS (FOR USERS WITH DUMBBELLS) ---
  {
    id: 'dumbbell-goblet-squat',
    name: 'Dumbbell Goblet Squat',
    category: 'dumbbell',
    requiredEquipment: ['dumbbells'],
    targetedMusclesSimple: 'Quads, Glutes & Upper Core',
    whyIncluded: 'The front-loaded dumbbell naturally acts as a counterweight, promoting an upright torso and deep squat.',
    startingPosition: 'Hold one dumbbell vertically with both hands cupping the top head close against your upper chest.',
    instructions: [
      'Stand with feet shoulder-width apart, elbows pointing down toward the floor.',
      'Squat down between your knees, keeping your chest proud and the weight close to your heart.',
      'Lower until your elbows touch your inner thighs or as deep as comfortable.',
      'Drive smoothly through your mid-foot and heels to return to standing.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 75,
    breathingGuidance: 'Inhale deep into your belly on the way down; exhale forcefully through pursed lips as you stand.',
    commonMistakes: ['Letting the dumbbell pull your shoulders forward', 'Rounding the lower back'],
    easierAlternative: 'Bodyweight Air Squat',
    harderAlternative: 'Dumbbell Front Squat (two dumbbells at shoulders)',
  },
  {
    id: 'dumbbell-floor-press',
    name: 'Dumbbell Floor Press',
    category: 'dumbbell',
    requiredEquipment: ['dumbbells', 'exercise_mat'],
    targetedMusclesSimple: 'Chest, Front Shoulders & Triceps',
    whyIncluded: 'Provides all the chest-building benefits of bench pressing while the floor prevents over-stretching the shoulders.',
    startingPosition: 'Lie on your back on the floor with knees bent and feet flat. Hold a dumbbell in each hand at chest level.',
    instructions: [
      'Start with your upper arms resting on the floor at a 45-degree angle to your sides.',
      'Press both dumbbells upward in a smooth arc until your arms are extended above your chest.',
      'Gently lower the dumbbells until your triceps lightly graze the floor.',
      'Pause for a split second before pressing back up.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–12 reps',
    recommendedRestSec: 75,
    breathingGuidance: 'Inhale as arms lower to floor; exhale as you press dumbbells upward.',
    commonMistakes: ['Banging elbows hard into the floor', 'Pressing dumbbells too high above the face instead of mid-chest'],
    easierAlternative: 'Incline or Knee Push-Up',
    harderAlternative: 'Dumbbell Bench Press',
  },
  {
    id: 'dumbbell-bent-row',
    name: 'Dumbbell One-Arm Row',
    category: 'dumbbell',
    requiredEquipment: ['dumbbells'],
    targetedMusclesSimple: 'Upper Back, Lats & Biceps',
    whyIncluded: 'Balances out forward-slumped sitting posture by strengthening the mid-back and pulling muscles.',
    startingPosition: 'Place your left hand and left knee on a sturdy chair or couch. Hold a dumbbell in your right hand hanging down.',
    instructions: [
      'Keep your back flat and neck neutral like a level tabletop.',
      'Pull the dumbbell upward toward your hip crease, leading with your elbow.',
      'Squeeze your right shoulder blade in toward your spine at the top for 1 second.',
      'Lower the dumbbell with control until your arm is fully lengthened.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps per arm',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you pull the weight to your hip; inhale as you lower the weight.',
    commonMistakes: ['Yanking the dumbbell with body momentum', 'Rounding the spine'],
    easierAlternative: 'Resistance Band Row',
    harderAlternative: 'Two-Arm Bent-Over Dumbbell Row',
  },
  {
    id: 'dumbbell-overhead-press',
    name: 'Seated Dumbbell Shoulder Press',
    category: 'dumbbell',
    requiredEquipment: ['dumbbells'],
    targetedMusclesSimple: 'Shoulders & Upper Arms',
    whyIncluded: 'Develops functional overhead reaching strength while seated position protects the lower back.',
    startingPosition: 'Sit upright on a sturdy chair or bench with dumbbells held at shoulder level, palms facing forward or slightly inward.',
    instructions: [
      'Brace your core and keep your back supported against the chair.',
      'Press both dumbbells upward until your arms are straight above your head (without clanking the weights).',
      'Lower the dumbbells slowly until they return to ear/shoulder level.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you press upward; inhale smoothly as you lower.',
    commonMistakes: ['Leaning back and arching the lower back excessively', 'Dropping weights quickly'],
    easierAlternative: 'Dumbbell Front Raise (lighter weight)',
    harderAlternative: 'Standing Dumbbell Overhead Press',
    contraindicatedLimitations: ['shoulder_pain'],
  },
  {
    id: 'dumbbell-romanian-deadlift',
    name: 'Dumbbell Romanian Deadlift (RDL)',
    category: 'dumbbell',
    requiredEquipment: ['dumbbells'],
    targetedMusclesSimple: 'Hamstrings, Glutes & Lower Back',
    whyIncluded: 'Teaches the essential hip-hinge movement that protects your back during daily lifting tasks.',
    startingPosition: 'Stand tall holding a dumbbell in each hand in front of your thighs, feet hip-width apart.',
    instructions: [
      'Keep a soft, slight bend in your knees throughout the movement (do not lock them).',
      'Push your hips backward towards the wall behind you while keeping your back flat.',
      'Slide the dumbbells down the front of your shins until you feel a comfortable stretch in the backs of your thighs.',
      'Drive hips forward and squeeze glutes to return to standing tall.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 75,
    breathingGuidance: 'Inhale as your hips hinge backward; exhale forcefully as you drive hips forward.',
    commonMistakes: ['Squatting instead of hinging at the hips', 'Rounding the shoulders and upper back'],
    easierAlternative: 'Floor Glute Bridge',
    harderAlternative: 'Barbell Romanian Deadlift',
    contraindicatedLimitations: ['lower_back'],
  },

  // --- GYM SPECIFIC MOVEMENTS ---
  {
    id: 'lat-pulldown',
    name: 'Cable Lat Pulldown',
    category: 'machine',
    requiredEquipment: ['barbell'],
    targetedMusclesSimple: 'Back Width (Lats) & Biceps',
    whyIncluded: 'Builds pulling strength safely with adjustable weight before advancing to pull-ups.',
    startingPosition: 'Sit down at the lat pulldown machine, adjust thigh pads snugly, and grip the bar wider than shoulders.',
    instructions: [
      'Sit tall with your chest slightly tilted upwards.',
      'Pull the bar down smoothly toward your upper chest, drawing your elbows down and back.',
      'Squeeze your lats for 1 second at the bottom.',
      'Allow the bar to rise back up with control until your arms are lengthened.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you pull the bar down; inhale as it returns up.',
    commonMistakes: ['Leaning way back and swinging body weight', 'Pulling bar behind the neck'],
    easierAlternative: 'Resistance Band Lat Pulldown',
    harderAlternative: 'Bodyweight Pull-Up',
  },
  {
    id: 'leg-press',
    name: 'Seated Leg Press Machine',
    category: 'machine',
    requiredEquipment: ['barbell'],
    targetedMusclesSimple: 'Legs, Thighs & Glutes',
    whyIncluded: 'Allows deep lower-body stimulation without spinal loading, ideal for beginners.',
    startingPosition: 'Sit securely in the machine with back and head flat against the padded support. Feet hip-width on platform.',
    instructions: [
      'Release the safety catch with feet placed flat in the center of the platform.',
      'Lower the platform slowly toward your chest until knees reach roughly 90 degrees.',
      'Push firmly through the center of your feet to extend your legs back out.',
      'Do not lock your knees violently at the top.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 75,
    breathingGuidance: 'Inhale as knees bend; exhale as you push the sled away.',
    commonMistakes: ['Locking knees hard at full extension', 'Letting lower back lift off the seat pad'],
    easierAlternative: 'Bodyweight Air Squat',
    harderAlternative: 'Barbell Back Squat',
  },
];

function getEligibleExercises(
  environment: string,
  equipment: EquipmentItem[],
  limitations: PhysicalLimitation[]
): CoachExerciseDefinition[] {
  const isGym = environment === 'gym';
  const hasDumbbells = equipment.includes('dumbbells');
  const hasBarbell = equipment.includes('barbell');
  const hasBands = equipment.includes('resistance_bands');

  return COACH_EXERCISE_CATALOG.filter((ex) => {
    if (ex.contraindicatedLimitations && limitations.length > 0) {
      const hasConflict = ex.contraindicatedLimitations.some((lim) => limitations.includes(lim));
      if (hasConflict) return false;
    }

    if (isGym) return true;

    if (environment === 'calisthenics' || equipment.includes('none') || equipment.length === 0) {
      return ex.category === 'bodyweight';
    }

    if (ex.category === 'bodyweight') return true;
    if (ex.category === 'dumbbell' && hasDumbbells) return true;
    if (ex.category === 'resistance_band' && hasBands) return true;
    if (ex.category === 'barbell' && hasBarbell) return true;

    return false;
  });
}

function buildWeeklyWorkouts(
  profile: UserProfile,
  eligible: CoachExerciseDefinition[]
): PlanWorkoutRoutine[] {
  const trainingDays = Math.min(6, Math.max(2, profile.availableTrainingDays ?? 3));
  const sessionMinutes = profile.sessionDurationMinutes ?? 30;
  
  const exerciseCount = sessionMinutes <= 20 ? 3 : sessionMinutes <= 30 ? 4 : sessionMinutes <= 45 ? 5 : 6;

  const lowerBody = eligible.filter((e) => e.targetedMusclesSimple.toLowerCase().includes('thigh') || e.targetedMusclesSimple.toLowerCase().includes('glute'));
  const upperPush = eligible.filter((e) => e.targetedMusclesSimple.toLowerCase().includes('chest') || e.targetedMusclesSimple.toLowerCase().includes('shoulder'));
  const upperPull = eligible.filter((e) => e.targetedMusclesSimple.toLowerCase().includes('back') || e.targetedMusclesSimple.toLowerCase().includes('arm'));
  const coreStability = eligible.filter((e) => e.targetedMusclesSimple.toLowerCase().includes('core') || e.targetedMusclesSimple.toLowerCase().includes('ab') || e.targetedMusclesSimple.toLowerCase().includes('stability'));

  const routines: PlanWorkoutRoutine[] = [];
  const dayNames = ['Monday (Day 1)', 'Wednesday (Day 2)', 'Friday (Day 3)', 'Saturday (Day 4)', 'Sunday (Day 5)', 'Tuesday (Day 6)'];

  for (let d = 0; d < trainingDays; d++) {
    const routineTitle =
      trainingDays <= 3
        ? `Full Body Foundation (Session ${d + 1})`
        : d % 2 === 0
        ? `Upper Body & Core (Session ${d + 1})`
        : `Lower Body & Mobility (Session ${d + 1})`;

    const selectedList: CoachExerciseDefinition[] = [];

    if (trainingDays <= 3 || d % 2 === 1) {
      const lower = lowerBody[d % (lowerBody.length || 1)];
      if (lower && !selectedList.includes(lower)) selectedList.push(lower);
    }

    if (trainingDays <= 3 || d % 2 === 0) {
      const push = upperPush[d % (upperPush.length || 1)];
      if (push && !selectedList.includes(push)) selectedList.push(push);

      const pull = upperPull[d % (upperPull.length || 1)];
      if (pull && !selectedList.includes(pull)) selectedList.push(pull);
    }

    const core = coreStability[d % (coreStability.length || 1)];
    if (core && !selectedList.includes(core)) selectedList.push(core);

    for (const ex of eligible) {
      if (selectedList.length >= exerciseCount) break;
      if (!selectedList.includes(ex)) {
        selectedList.push(ex);
      }
    }

    const planExercises: PlanExerciseItem[] = selectedList.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      category: ex.category,
      whyIncluded: ex.whyIncluded,
      targetedMusclesSimple: ex.targetedMusclesSimple,
      equipmentRequired: ex.requiredEquipment.includes('none') ? 'None (Bodyweight)' : ex.requiredEquipment.join(', '),
      startingPosition: ex.startingPosition,
      instructions: ex.instructions,
      recommendedSets: ex.recommendedSets,
      recommendedReps: ex.recommendedReps,
      recommendedRestSec: ex.recommendedRestSec,
      breathingGuidance: ex.breathingGuidance,
      commonMistakes: ex.commonMistakes,
      easierAlternative: ex.easierAlternative,
      harderAlternative: ex.harderAlternative,
    }));

    routines.push({
      dayIndex: d + 1,
      dayName: dayNames[d] || `Day ${d + 1}`,
      title: routineTitle,
      isRestDay: false,
      estimatedMinutes: sessionMinutes,
      exercises: planExercises,
    });
  }

  return routines;
}

function buildDailyMeals(
  profile: UserProfile,
  targetCalories: number,
  targetProteinG: number
): PlanMealSuggestion[] {
  const isVeg = profile.dietaryPreference === 'vegetarian' || profile.dietaryPreference === 'vegan';
  const isVegan = profile.dietaryPreference === 'vegan';
  const isEgg = profile.dietaryPreference === 'eggetarian';

  const meals: PlanMealSuggestion[] = [
    {
      mealType: 'breakfast',
      title: isVeg
        ? 'Steamed Idli or Puttu with Kadala Curry'
        : 'Whole Eggs with Toasted Bread or Dosa',
      description: isVeg
        ? 'Wholesome South Indian breakfast providing steady complex carbs and plant protein.'
        : 'High-protein breakfast to fuel your morning energy and preserve lean muscle.',
      portionGuide: isVeg
        ? '3 Idlis or 1 slice Puttu + 1 small bowl Kadala (black chickpea) curry + Coconut chutney'
        : '2 Whole Eggs (boiled or omelette) + 2 slices brown bread or 2 small Dosas + Sambar',
      approxCalories: Math.round(targetCalories * 0.25),
      approxProteinG: Math.round(targetProteinG * 0.25),
      isVegetarian: isVeg,
      alternatives: [
        'Oats cooked in milk with sliced banana and 1 tbsp crushed almonds',
        '2 Paneer Stuffed Parathas with 1 cup fresh low-fat curd',
      ],
    },
    {
      mealType: 'lunch',
      title: isVeg
        ? 'Kerala Style Rice Plate with Dal & Mixed Veg Sabzi'
        : 'Rice with Kerala Fish Curry (Meen Curry) or Chicken Breast',
      description: 'The balanced midday meal providing energy for daily activity and afternoon focus.',
      portionGuide: isVeg
        ? '1 medium cup Boiled Rice (Matta or Ponni) + 1 large bowl Dal/Sambar + 1 bowl Thoran (cabbage/beans) + Curd'
        : '1 cup Steamed Rice + 1 bowl Fish Curry (Ayila/Sardine) or 150g grilled chicken + Thoran + Salad',
      approxCalories: Math.round(targetCalories * 0.35),
      approxProteinG: Math.round(targetProteinG * 0.35),
      isVegetarian: isVeg,
      alternatives: [
        '3 Wheat Chapatis + 1 bowl Chana Masala + Fresh cucumber and carrot slices',
        '1 cup Quinoa or Brown Rice with Paneer Tikka and green salad',
      ],
    },
    {
      mealType: 'snack',
      title: isVegan
        ? 'Roasted Chickpeas (Sundal) with Lemon & Chai'
        : isVeg
        ? 'Sprouted Moong Salad or Paneer Cubes with Green Tea'
        : 'Boiled Egg Whites or Roasted Peanuts with Tea',
      description: 'A light protein bridge between lunch and dinner to prevent late-afternoon energy crashes.',
      portionGuide: '1 small bowl Roasted Makhana or Boiled Chana (Sundal) + 1 cup unsweetened tea/coffee',
      approxCalories: Math.round(targetCalories * 0.15),
      approxProteinG: Math.round(targetProteinG * 0.15),
      isVegetarian: isVeg || isEgg,
      alternatives: [
        '1 glass tender coconut water + handful of roasted almonds',
        '1 cup plain Greek curd or buttermilk (sambharam) with crushed curry leaves and ginger',
      ],
    },
    {
      mealType: 'dinner',
      title: isVeg
        ? 'Soft Wheat Chapatis with Dal Tadka or Paneer Bhurji'
        : 'Wheat Chapatis with Light Chicken Curry or Grilled Fish',
      description: 'An easy-to-digest dinner to promote restful sleep and nocturnal muscle recovery.',
      portionGuide: isVeg
        ? '2 Soft Chapatis (light oil) + 1 bowl Dal or Paneer Curry + Green vegetable salad'
        : '2 Soft Chapatis + 1 bowl Chicken Curry (light gravy) or Fish + Sliced tomato and cucumber',
      approxCalories: Math.round(targetCalories * 0.25),
      approxProteinG: Math.round(targetProteinG * 0.25),
      isVegetarian: isVeg,
      alternatives: [
        'Warm Vegetable and Lentil Khichdi with 1 cup Curd',
        '2 Appams with Vegetable Stew (Ishtu) or Egg Roast',
      ],
    },
  ];

  return meals;
}

export function generatePersonalCoachingPlan(profile: UserProfile): PersonalCoachingPlan {
  const age = profile.dateOfBirth ? calculateAgeFromDob(profile.dateOfBirth) : 25;
  const bmr = calculateBmrMifflinStJeor({
    weightKg: profile.currentWeightKg,
    heightCm: profile.heightCm,
    ageYears: age,
    gender: profile.gender === 'female' ? 'female' : 'male',
  });
  const tdee = calculateTdee(bmr, profile.activityLevel);
  const targetCalResult = calculateTargetCalories({
    tdee,
    goal: profile.primaryGoal,
    gender: profile.gender === 'female' ? 'female' : 'male',
  });
  const macros = calculateMacronutrients({
    targetCalories: targetCalResult.targetCalories,
    weightKg: profile.currentWeightKg,
    goal: profile.primaryGoal,
  });

  const equipment = profile.equipmentInventory || ['none'];
  const limitations = profile.injuriesOrLimitations || [];
  const eligibleExercises = getEligibleExercises(profile.trainingEnvironment, equipment, limitations);

  const weeklyWorkouts = buildWeeklyWorkouts(profile, eligibleExercises);
  const dailyMeals = buildDailyMeals(profile, targetCalResult.targetCalories, macros.proteinG);

  const goalTitles: Record<string, string> = {
    fat_loss: 'Healthy Fat Loss & Conditioning',
    muscle_gain: 'Lean Muscle Building & Strength',
    recomposition: 'Body Recomposition & Muscle Tone',
    strength: 'Functional Strength & Stability',
    maintenance: 'Fitness Maintenance & Vitality',
    general_fitness: 'Complete Daily Health & Fitness',
    stamina: 'Stamina, Endurance & Energy',
    health_consistency: 'Daily Movement & Habit Consistency',
  };

  const goalTitle = goalTitles[profile.primaryGoal] || 'Personalized Health & Fitness Plan';

  const equipmentDesc =
    profile.trainingEnvironment === 'gym'
      ? 'Gym Equipment'
      : equipment.includes('none')
      ? 'Bodyweight Only (No Equipment)'
      : equipment.join(', ');

  const baselineSummary = `${profile.currentWeightKg} kg, ${profile.heightCm} cm • ${profile.availableTrainingDays ?? 3} days/wk • ${profile.trainingEnvironment.toUpperCase()} (${equipmentDesc})`;

  const milestones = [
    'Weeks 1–4: Build exercise consistency, master clean movement technique, and establish regular hydration habits.',
    'Weeks 5–8: Add 1–2 repetitions per set or progress to the next exercise variation; notice improved daily energy.',
    'Weeks 9–12: Experience measurable changes in body composition, resting stamina, and physical confidence.',
  ];

  const whyPlan = `This plan was designed for your goal of "${goalTitle}". Your training is tailored to ${profile.trainingEnvironment} using ${equipmentDesc} across ${profile.availableTrainingDays ?? 3} weekly sessions of ${profile.sessionDurationMinutes ?? 30} minutes. Your nutrition target is calibrated to ${targetCalResult.targetCalories} kcal with ${macros.proteinG}g protein to safely support your goal.`;

  return {
    id: `plan_${profile.userId}_${Date.now()}`,
    userId: profile.userId,
    createdAt: new Date().toISOString(),
    primaryGoal: profile.primaryGoal,
    goalTitle,
    baselineSummary,
    weeklyWorkouts,
    dailyMeals,
    dailyWaterTargetMl: profile.dailyWaterTargetMl || 2500,
    progressionMilestones: milestones,
    whyThisPlanGenerated: whyPlan,
  };
}
