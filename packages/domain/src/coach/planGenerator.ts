/**
 * FITLIFE OS — Deterministic Personal Fitness & Nutrition Plan Generator
 * 100% offline, environment-aware, equipment-defensive, and beginner-friendly.
 * Generates tailored workout routines and familiar Indian/Kerala portion meals.
 */

import {
  UserProfile,
  PersonalCoachingPlan,
  PlanWorkoutRoutine,
  PlanExerciseItem,
  PlanMealSuggestion,
  EquipmentItem,
  PhysicalLimitation,
} from '@fitlife/shared-types';
import { calculateBmrMifflinStJeor, calculateTdee, calculateTargetCalories, calculateMacronutrients } from '../nutrition/metabolic';
import { calculateAgeFromDob } from '../user/dob';

/**
 * Exercise database catalog for the personal coach.
 */
export interface CoachExerciseDefinition {
  id: string;
  name: string;
  category: 'bodyweight' | 'dumbbell' | 'barbell' | 'machine' | 'resistance_band' | 'outdoor' | 'calisthenics';
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

export const COACH_EXERCISE_CATALOG: CoachExerciseDefinition[] = [
  // --- 1. BODYWEIGHT HOME MOVEMENTS ---
  {
    id: 'bodyweight-squat',
    name: 'Bodyweight Air Squat',
    category: 'bodyweight',
    requiredEquipment: ['none', 'exercise_mat'],
    targetedMusclesSimple: 'Thighs, Hips & Glutes',
    whyIncluded: 'Builds foundational lower-body strength and mobility without stressing joints.',
    startingPosition: 'Stand tall with feet slightly wider than shoulder-width, toes turned slightly outward.',
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

  // --- 2. DUMBBELL MOVEMENTS (FOR HOME/GYM WITH DUMBBELLS) ---
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
      'Press both dumbbells upward until your arms are straight above your head.',
      'Lower the dumbbells slowly until they return to ear/shoulder level.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you press upward; inhale smoothly as you lower.',
    commonMistakes: ['Leaning back and arching the lower back excessively', 'Dropping weights quickly'],
    easierAlternative: 'Dumbbell Front Raise',
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

  // --- 3. GYM SPECIFIC MOVEMENTS (MACHINES & GYM EQUIPMENT) ---
  {
    id: 'leg-press',
    name: 'Seated Leg Press Machine',
    category: 'machine',
    requiredEquipment: ['leg_press_machine'],
    targetedMusclesSimple: 'Quads, Hamstrings & Glutes',
    whyIncluded: 'Allows deep lower-body stimulation without spinal loading, ideal for gym strength progression.',
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
  {
    id: 'chest-press-machine',
    name: 'Seated Chest Press Machine',
    category: 'machine',
    requiredEquipment: ['chest_press_machine'],
    targetedMusclesSimple: 'Chest, Front Shoulders & Triceps',
    whyIncluded: 'Provides a guided, safe pressing track to build upper body pushing strength without requiring free-weight balance.',
    startingPosition: 'Adjust seat height so handles align with mid-chest. Sit flat with feet firmly on the ground.',
    instructions: [
      'Grip the handles firmly with knuckles pointing forward.',
      'Press handles outward in a smooth, controlled motion until arms are almost fully extended.',
      'Pause for 1 second with chest contracted.',
      'Slowly allow the handles to return back toward your chest, feeling a comfortable chest stretch.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you press handles away; inhale as you return with control.',
    commonMistakes: ['Shrugging shoulders up toward ears', 'Letting weights slam at the bottom of the rep'],
    easierAlternative: 'Incline Push-Up',
    harderAlternative: 'Barbell Flat Bench Press',
  },
  {
    id: 'lat-pulldown',
    name: 'Cable Lat Pulldown',
    category: 'machine',
    requiredEquipment: ['lat_pulldown_machine', 'cable_machine'],
    targetedMusclesSimple: 'Back Width (Lats) & Biceps',
    whyIncluded: 'Builds vertical pulling strength safely with adjustable weight before advancing to pull-ups.',
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
    id: 'seated-cable-row',
    name: 'Seated Cable Row Machine',
    category: 'machine',
    requiredEquipment: ['seated_row_machine', 'cable_machine'],
    targetedMusclesSimple: 'Mid-Back, Rhomboids & Rear Shoulders',
    whyIncluded: 'Builds horizontal pulling power and reverses slumped desk posture with smooth cable resistance.',
    startingPosition: 'Sit with feet on the footrests, knees slightly bent. Grasp the V-bar attachment with arms extended.',
    instructions: [
      'Sit upright with a natural arch in your lower back and chest high.',
      'Pull the handle smoothly into your lower abdomen, squeezing your shoulder blades together.',
      'Pause for 1 second at peak contraction.',
      'Extend your arms forward with control, allowing a gentle stretch in the lats.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you row the handle toward your ribs; inhale as arms extend.',
    commonMistakes: ['Swinging torso back and forth', 'Rounding lower back'],
    easierAlternative: 'Dumbbell One-Arm Row',
    harderAlternative: 'Barbell Bent-Over Row',
  },
  {
    id: 'seated-leg-curl',
    name: 'Seated or Lying Leg Curl Machine',
    category: 'machine',
    requiredEquipment: ['leg_curl_machine'],
    targetedMusclesSimple: 'Hamstrings (Back of Thighs)',
    whyIncluded: 'Directly isolates and strengthens the hamstring muscles, improving knee stability and joint balance.',
    startingPosition: 'Position your knees aligned with the machine pivot point, padded roller just below your calves.',
    instructions: [
      'Grip the support handles firmly.',
      'Curl the padded lever downward toward your glutes in a smooth arching motion.',
      'Squeeze your hamstrings at the bottom for 1 second.',
      'Slowly allow the pad to return to the starting position without letting weight stack touch.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you curl the pad down; inhale as you slowly extend.',
    commonMistakes: ['Jerking hips off the bench', 'Moving through rep too quickly'],
    easierAlternative: 'Floor Glute Bridge',
    harderAlternative: 'Romanian Deadlift',
  },
  {
    id: 'shoulder-press-machine',
    name: 'Overhead Shoulder Press Machine',
    category: 'machine',
    requiredEquipment: ['shoulder_press_machine'],
    targetedMusclesSimple: 'Deltoids (Shoulders) & Triceps',
    whyIncluded: 'Develops pressing strength overhead along a fixed path that stabilizes shoulders.',
    startingPosition: 'Adjust seat so handles are at ear height. Sit with your back pressed firmly against backrest.',
    instructions: [
      'Grip handles firmly and brace your core.',
      'Press upward in a smooth motion until arms are extended overhead (do not lock elbows hard).',
      'Pause for a beat at the top.',
      'Lower the handles with control until they return to ear level.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you press upward; inhale as handles descend.',
    commonMistakes: ['Arching the lower back off the pad', 'Dropping the weight abruptly'],
    easierAlternative: 'Light Dumbbell Shoulder Press',
    harderAlternative: 'Standing Barbell Overhead Press',
    contraindicatedLimitations: ['shoulder_pain'],
  },
  {
    id: 'barbell-bench-press',
    name: 'Barbell Flat Bench Press',
    category: 'barbell',
    requiredEquipment: ['barbell', 'bench'],
    targetedMusclesSimple: 'Chest, Anterior Deltoids & Triceps',
    whyIncluded: 'The classic compound upper-body strength builder for building pushing strength and bone density.',
    startingPosition: 'Lie flat on bench, eyes directly under the racked bar. Grip bar slightly wider than shoulder-width.',
    instructions: [
      'Unrack the bar and hold it steady over your chest with straight arms.',
      'Lower the bar with control to your mid-chest (nipple line), keeping elbows at 45 degrees.',
      'Gently touch your chest without bouncing.',
      'Press the bar smoothly back up to the starting position.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 90,
    breathingGuidance: 'Inhale as bar lowers to chest; exhale forcefully as you drive bar upward.',
    commonMistakes: ['Flaring elbows out to 90 degrees', 'Bouncing bar off the sternum'],
    easierAlternative: 'Seated Chest Press Machine',
    harderAlternative: 'Incline Barbell Bench Press',
  },

  // --- 4. OUTDOOR MOVEMENTS ---
  {
    id: 'outdoor-brisk-walk',
    name: 'Brisk Aerobic Power Walk',
    category: 'outdoor',
    requiredEquipment: ['none'],
    targetedMusclesSimple: 'Cardiovascular System, Calves & Glutes',
    whyIncluded: 'Gentle aerobic conditioning that enhances heart health, oxygen uptake, and calorie burn without joint impact.',
    startingPosition: 'Stand tall outdoors with relaxed shoulders and head looking forward.',
    instructions: [
      'Walk at a purposeful, brisk pace that elevates your heart rate.',
      'Swing your arms naturally with bent elbows to increase cadence.',
      'Land softly on your heel and roll through to push off your toes.',
      'Maintain steady breathing throughout the interval.',
    ],
    recommendedSets: 1,
    recommendedReps: '15–20 minutes continuous',
    recommendedRestSec: 60,
    breathingGuidance: 'Breathe rhythmically in sync with your foot strike (e.g., 3 paces in, 3 paces out).',
    commonMistakes: ['Slumping shoulders forward', 'Strolling at casual shopping pace'],
    easierAlternative: 'Light stroll on flat pavement',
    harderAlternative: 'Outdoor Walk & Jog Intervals',
  },
  {
    id: 'park-bench-step-ups',
    name: 'Park Bench Step-Ups',
    category: 'outdoor',
    requiredEquipment: ['bench', 'none'],
    targetedMusclesSimple: 'Quads, Glutes & Calves',
    whyIncluded: 'Develops unilateral leg strength and stair-climbing power using any outdoor park bench.',
    startingPosition: 'Stand facing a sturdy outdoor bench or elevated park curb, feet hip-width apart.',
    instructions: [
      'Place your entire right foot firmly onto the bench seat.',
      'Push through your right heel to stand fully upright onto the bench.',
      'Tap your left toe lightly on top.',
      'Step back down with your left foot under control. Switch lead legs.',
    ],
    recommendedSets: 3,
    recommendedReps: '10 reps per leg',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as you step up; inhale as you step down with control.',
    commonMistakes: ['Pushing off the back foot instead of using the front leg', 'Allowing knee to collapse inward'],
    easierAlternative: 'Curb Step-Ups (lower height)',
    harderAlternative: 'Park Bench Step-Ups with Knee Drive',
  },
  {
    id: 'park-bench-incline-pushups',
    name: 'Park Bench Incline Push-Up',
    category: 'outdoor',
    requiredEquipment: ['bench', 'none'],
    targetedMusclesSimple: 'Chest, Arms & Core',
    whyIncluded: 'Provides an effective outdoor pressing stimulus utilizing the backrest or seat of a park bench.',
    startingPosition: 'Place hands shoulder-width apart on a park bench seat, body in straight incline plank.',
    instructions: [
      'Brace core and lower chest toward the bench by bending elbows back at 45 degrees.',
      'Lower until chest touches or hovers 1 inch above bench.',
      'Press smoothly through palms back to straight arm position.',
    ],
    recommendedSets: 3,
    recommendedReps: '10–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Inhale as chest lowers; exhale as you push bench away.',
    commonMistakes: ['Sagging hips', 'Flaring elbows wide'],
    easierAlternative: 'Park Bench Backrest Push-Up (higher incline)',
    harderAlternative: 'Park Bench Dip',
  },
  {
    id: 'outdoor-walking-lunges',
    name: 'Open-Air Walking Lunges',
    category: 'outdoor',
    requiredEquipment: ['none'],
    targetedMusclesSimple: 'Thighs, Hips & Balance',
    whyIncluded: 'Builds functional walking endurance, hip stability, and lower body strength in open space.',
    startingPosition: 'Stand tall on grass or flat park path with hands on hips.',
    instructions: [
      'Take a large, controlled stride forward.',
      'Lower your hips until both front and back knees bend to 90 degrees.',
      'Drive up through the front heel and immediately step forward with the opposite leg.',
      'Continue walking forward continuously.',
    ],
    recommendedSets: 3,
    recommendedReps: '10 steps per leg',
    recommendedRestSec: 60,
    breathingGuidance: 'Inhale on the descent; exhale as you rise and step forward.',
    commonMistakes: ['Short strides causing knee overreach', 'Torso leaning heavily forward'],
    easierAlternative: 'Stationary Step-Back Lunge',
    harderAlternative: 'Walking Lunges with Overhead Reach',
    contraindicatedLimitations: ['knee_pain'],
  },

  // --- 5. CALISTHENICS MOVEMENTS ---
  {
    id: 'calisthenics-pull-ups',
    name: 'Bar Pull-Ups or Active Hang',
    category: 'calisthenics',
    requiredEquipment: ['pull_up_bar'],
    targetedMusclesSimple: 'Lats, Upper Back & Forearms',
    whyIncluded: 'The ultimate bodyweight upper-body pulling movement for back width and grip strength.',
    startingPosition: 'Grip an overhead bar with palms facing away, hands slightly wider than shoulders, body hanging freely.',
    instructions: [
      'Engage your shoulder blades by pulling them down away from your ears.',
      'Pull your chest up toward the bar by driving your elbows down to the floor.',
      'Pull until your chin clears the bar comfortably.',
      'Lower your body with control until arms are fully extended.',
    ],
    recommendedSets: 3,
    recommendedReps: '5–8 reps (or 20s Active Hang)',
    recommendedRestSec: 90,
    breathingGuidance: 'Exhale forcefully as you pull up; inhale as you lower smoothly.',
    commonMistakes: ['Kicking legs and swinging body', 'Dropping down quickly without control'],
    easierAlternative: 'Horizontal Bar Inverted Row',
    harderAlternative: 'Chest-to-Bar Pull-Up',
  },
  {
    id: 'calisthenics-parallel-dips',
    name: 'Parallel Bar Dips or Bench Dips',
    category: 'calisthenics',
    requiredEquipment: ['bench', 'pull_up_bar'],
    targetedMusclesSimple: 'Triceps, Lower Chest & Front Shoulders',
    whyIncluded: 'Builds impressive pressing power and triceps mass using bodyweight leverage.',
    startingPosition: 'Support yourself on parallel bars or with hands behind you on a sturdy bench, arms straight.',
    instructions: [
      'Keep your chest proud and shoulders pulled down away from ears.',
      'Bend elbows backward to lower your body until elbows reach roughly 90 degrees.',
      'Do not descend deeper than comfortable for your shoulders.',
      'Press firmly through your palms to return to the top lockout.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 75,
    breathingGuidance: 'Inhale as your body descends; exhale as you press up.',
    commonMistakes: ['Dipping too low and straining shoulder capsule', 'Shrugging shoulders forward'],
    easierAlternative: 'Bench Dips with knees bent',
    harderAlternative: 'Straight-Bar Dips',
    contraindicatedLimitations: ['shoulder_pain'],
  },
  {
    id: 'calisthenics-diamond-pushups',
    name: 'Diamond Close-Grip Push-Ups',
    category: 'calisthenics',
    requiredEquipment: ['none'],
    targetedMusclesSimple: 'Triceps & Inner Chest',
    whyIncluded: 'Shifts bodyweight resistance intensely onto the triceps without requiring weights.',
    startingPosition: 'High plank position with index fingers and thumbs touching to form a diamond shape under your chest.',
    instructions: [
      'Keep body in a tight, solid plank.',
      'Lower your chest toward your hands, keeping elbows tracking back near your ribs.',
      'Touch chest gently to your hands.',
      'Press forcefully back up to full arm extension.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–10 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Inhale on the way down; exhale as you push up.',
    commonMistakes: ['Flaring elbows out to sides', 'Sagging hips'],
    easierAlternative: 'Incline Diamond Push-Up against a bench',
    harderAlternative: 'Archer Push-Up',
  },
  {
    id: 'calisthenics-inverted-row',
    name: 'Horizontal Bar Inverted Row',
    category: 'calisthenics',
    requiredEquipment: ['pull_up_bar'],
    targetedMusclesSimple: 'Mid-Back, Rear Delts & Biceps',
    whyIncluded: 'Builds horizontal bodyweight pulling strength and prepares the body for strict pull-ups.',
    startingPosition: 'Lie under a waist-height bar, reach up to grip the bar with palms facing feet, heels planted on floor.',
    instructions: [
      'Keep your body rigid like an inverted plank from heels to head.',
      'Pull your chest up to touch the bar, squeezing your shoulder blades together.',
      'Lower your body with control until arms are straight.',
    ],
    recommendedSets: 3,
    recommendedReps: '8–12 reps',
    recommendedRestSec: 60,
    breathingGuidance: 'Exhale as chest touches bar; inhale as body lowers.',
    commonMistakes: ['Hips sagging or bending at waist', 'Jerking with the neck'],
    easierAlternative: 'Inverted Row with knees bent at 90 degrees',
    harderAlternative: 'Elevated Feet Inverted Row',
  },
];

/**
 * Filter exercises strictly matching the user's available equipment and physical limitations.
 */
export function getEligibleExercises(
  environment: string,
  equipment: EquipmentItem[] = [],
  limitations: PhysicalLimitation[] = [],
  unavailableEquipment: EquipmentItem[] = []
): CoachExerciseDefinition[] {
  const isGym = environment === 'gym';
  const isOutdoor = environment === 'outdoor';
  const isCalisthenics = environment === 'calisthenics';
  const isHome = environment === 'home';

  const userEquipSet = new Set(equipment);
  const unavailSet = new Set(unavailableEquipment);

  return COACH_EXERCISE_CATALOG.filter((ex) => {
    // 1. Check physical contraindications
    if (ex.contraindicatedLimitations && limitations.length > 0) {
      const hasConflict = ex.contraindicatedLimitations.some((lim) => limitations.includes(lim));
      if (hasConflict) return false;
    }

    // 2. Check explicitly unavailable equipment
    if (ex.requiredEquipment.some((eq) => unavailSet.has(eq))) {
      return false;
    }

    // 3. OUTDOOR ENVIRONMENT
    if (isOutdoor) {
      return ex.category === 'outdoor' || (ex.category === 'bodyweight' && ex.requiredEquipment.includes('none'));
    }

    // 4. CALISTHENICS ENVIRONMENT
    if (isCalisthenics) {
      if (ex.category === 'calisthenics') {
        if (ex.requiredEquipment.includes('pull_up_bar') && !userEquipSet.has('pull_up_bar') && !userEquipSet.has('none')) {
          if (equipment.length > 0 && !equipment.includes('none') && !equipment.includes('pull_up_bar')) return false;
        }
        return true;
      }
      return ex.category === 'bodyweight' && ex.requiredEquipment.includes('none');
    }

    // 5. GYM ENVIRONMENT
    if (isGym) {
      // In a commercial gym, access to machines, barbells, dumbbells, and bodyweight is standard.
      // Exclude outdoor-only movements.
      if (ex.category === 'outdoor') return false;

      // If user explicitly marked equipment as unavailable, step 2 already excluded it.
      return true;
    }

    // 6. HOME ENVIRONMENT (Strict Home Filtering)
    if (isHome) {
      // Home NEVER uses gym machines or outdoor movements!
      if (ex.category === 'machine' || ex.category === 'outdoor') return false;

      // If Home with NO EQUIPMENT (none):
      if (userEquipSet.has('none') || equipment.length === 0) {
        return ex.category === 'bodyweight' && ex.requiredEquipment.includes('none');
      }

      // If Home with specific equipment:
      if (ex.category === 'bodyweight') return true;
      if (ex.category === 'dumbbell' && userEquipSet.has('dumbbells')) return true;
      if (ex.category === 'resistance_band' && userEquipSet.has('resistance_bands')) return true;
      if (ex.category === 'barbell' && userEquipSet.has('barbell')) return true;
      if (ex.category === 'calisthenics' && userEquipSet.has('pull_up_bar') && ex.requiredEquipment.includes('pull_up_bar')) return true;

      return false;
    }

    return false;
  });
}

/**
 * Generates an appropriate workout plan according to training days, session duration, and environment.
 */
function buildWeeklyWorkouts(
  profile: UserProfile,
  eligible: CoachExerciseDefinition[]
): PlanWorkoutRoutine[] {
  const env = profile.trainingEnvironment || 'home';
  const isGym = env === 'gym';
  const isOutdoor = env === 'outdoor';
  const isCalisthenics = env === 'calisthenics';

  const trainingDays = Math.min(6, Math.max(2, profile.availableTrainingDays ?? 3));
  const sessionMinutes = profile.sessionDurationMinutes ?? 30;
  
  // Decide exercise count per session based on duration
  const exerciseCount = sessionMinutes <= 20 ? 3 : sessionMinutes <= 30 ? 4 : sessionMinutes <= 45 ? 5 : 6;

  // Separate pools by environment priority
  let prioritizedPool: CoachExerciseDefinition[] = [];

  if (isGym) {
    // In Gym: Prioritize gym machines, barbells, and dumbbell compounds first!
    const machines = eligible.filter((e) => e.category === 'machine');
    const freeWeights = eligible.filter((e) => e.category === 'barbell' || e.category === 'dumbbell');
    const bodyweight = eligible.filter((e) => e.category === 'bodyweight');
    prioritizedPool = [...machines, ...freeWeights, ...bodyweight];
  } else if (isOutdoor) {
    const outdoorEx = eligible.filter((e) => e.category === 'outdoor');
    const bodyweight = eligible.filter((e) => e.category === 'bodyweight');
    prioritizedPool = [...outdoorEx, ...bodyweight];
  } else if (isCalisthenics) {
    const calisthenicsEx = eligible.filter((e) => e.category === 'calisthenics');
    const bodyweight = eligible.filter((e) => e.category === 'bodyweight');
    prioritizedPool = [...calisthenicsEx, ...bodyweight];
  } else {
    // Home: If user has dumbbells, prioritize dumbbell exercises!
    const dumbbells = eligible.filter((e) => e.category === 'dumbbell');
    const bodyweight = eligible.filter((e) => e.category === 'bodyweight');
    prioritizedPool = [...dumbbells, ...bodyweight];
  }

  // Group exercises by movement pattern
  const lowerBody = prioritizedPool.filter((e) => 
    e.targetedMusclesSimple.toLowerCase().includes('thigh') || 
    e.targetedMusclesSimple.toLowerCase().includes('glute') ||
    e.targetedMusclesSimple.toLowerCase().includes('quad') ||
    e.targetedMusclesSimple.toLowerCase().includes('hamstring') ||
    e.targetedMusclesSimple.toLowerCase().includes('leg')
  );

  const upperPush = prioritizedPool.filter((e) => 
    e.targetedMusclesSimple.toLowerCase().includes('chest') || 
    e.targetedMusclesSimple.toLowerCase().includes('shoulder') ||
    e.targetedMusclesSimple.toLowerCase().includes('deltoid') ||
    e.targetedMusclesSimple.toLowerCase().includes('tricep')
  );

  const upperPull = prioritizedPool.filter((e) => 
    e.targetedMusclesSimple.toLowerCase().includes('back') || 
    e.targetedMusclesSimple.toLowerCase().includes('lat') ||
    e.targetedMusclesSimple.toLowerCase().includes('bicep') ||
    e.targetedMusclesSimple.toLowerCase().includes('rhomboid')
  );

  const coreCardio = prioritizedPool.filter((e) => 
    e.targetedMusclesSimple.toLowerCase().includes('core') || 
    e.targetedMusclesSimple.toLowerCase().includes('ab') || 
    e.targetedMusclesSimple.toLowerCase().includes('stability') ||
    e.targetedMusclesSimple.toLowerCase().includes('cardio')
  );

  const routines: PlanWorkoutRoutine[] = [];
  const dayNames = ['Monday (Day 1)', 'Wednesday (Day 2)', 'Friday (Day 3)', 'Saturday (Day 4)', 'Sunday (Day 5)', 'Tuesday (Day 6)'];

  for (let d = 0; d < trainingDays; d++) {
    const envPrefix = isGym ? 'Gym' : isOutdoor ? 'Outdoor' : isCalisthenics ? 'Calisthenics' : 'Home';
    const routineTitle =
      trainingDays <= 3
        ? `${envPrefix} Full-Body Circuit (Session ${d + 1})`
        : d % 2 === 0
        ? `${envPrefix} Upper Body & Push (Session ${d + 1})`
        : `${envPrefix} Lower Body & Pull (Session ${d + 1})`;

    const selectedList: CoachExerciseDefinition[] = [];

    // Helper to safely pick distinct exercise
    const pickFromPool = (pool: CoachExerciseDefinition[]) => {
      if (!pool || pool.length === 0) return;
      for (let i = 0; i < pool.length; i++) {
        const candidate = pool[(d + i) % pool.length];
        if (candidate && !selectedList.some((s) => s.id === candidate.id)) {
          selectedList.push(candidate);
          return;
        }
      }
    };

    // 1. Lower Body movement
    pickFromPool(lowerBody);

    // 2. Upper Push movement
    pickFromPool(upperPush);

    // 3. Upper Pull movement
    pickFromPool(upperPull);

    // 4. Core / Stability / Cardio
    pickFromPool(coreCardio);

    // 5. Fill remaining quota up to exerciseCount from remaining prioritized pool
    for (const ex of prioritizedPool) {
      if (selectedList.length >= exerciseCount) break;
      if (!selectedList.some((s) => s.id === ex.id)) {
        selectedList.push(ex);
      }
    }

    // Map to PlanExerciseItem
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
  const isEggetarian = profile.dietaryPreference === 'eggetarian';

  const breakfastCalories = Math.round(targetCalories * 0.25);
  const lunchCalories = Math.round(targetCalories * 0.35);
  const snackCalories = Math.round(targetCalories * 0.15);
  const dinnerCalories = Math.round(targetCalories * 0.25);

  const breakfastProtein = Math.round(targetProteinG * 0.25);
  const lunchProtein = Math.round(targetProteinG * 0.35);
  const snackProtein = Math.round(targetProteinG * 0.15);
  const dinnerProtein = Math.round(targetProteinG * 0.25);

  const meals: PlanMealSuggestion[] = [
    // 1. Breakfast
    {
      mealType: 'breakfast',
      title: isVeg
        ? 'Steamed Puttu & Kadala Curry'
        : isEggetarian
        ? 'Boiled Eggs & Whole Wheat Toast'
        : 'Egg Roast with Appam or Rotis',
      description: isVeg
        ? 'Steamed Puttu with Black Chickpeas Kadala Curry'
        : isEggetarian
        ? 'Whole Boiled Eggs with Whole Wheat Toast'
        : 'Spiced Egg Roast with Whole Wheat Rotis',
      portionGuide: isVeg
        ? '1 piece rice or ragi puttu with 1 bowl black chickpea kadala curry.'
        : isEggetarian
        ? '2 whole boiled eggs, 2 slices whole wheat toast, with tea or black coffee.'
        : '2 eggs simmered in onion-tomato gravy with 2 appams or whole wheat rotis.',
      approxCalories: breakfastCalories,
      approxProteinG: breakfastProtein,
      isVegetarian: isVeg,
      alternatives: [
        'Warm oatmeal cooked with milk, sliced almonds, and half a banana.',
        '3 steamed idlis with vegetable sambar and fresh coconut chutney.',
      ],
    },
    // 2. Lunch
    {
      mealType: 'lunch',
      title: isVeg
        ? 'Kerala Matta Rice with Dal & Thoran'
        : 'Matta Rice with Meen Curry (Fish) & Thoran',
      description: isVeg
        ? 'Red Matta Rice with Yellow Dal and Cabbage Thoran'
        : 'Red Matta Rice with Fresh Fish Curry and Vegetable Thoran',
      portionGuide: isVeg
        ? '1 cup cooked Matta rice, 1 generous bowl of yellow dal tadka, and 1 cup cabbage/beans thoran.'
        : '1 cup cooked Matta rice, 1 slice seer/ayala fish curry (kudampuli style), and 1 cup vegetable thoran.',
      approxCalories: lunchCalories,
      approxProteinG: lunchProtein,
      isVegetarian: isVeg,
      alternatives: [
        '2 soft phulkas/rotis with 1 bowl paneer bhurji and fresh cucumber salad.',
        'Brown rice or quinoa with chickpea chana masala and curd/yogurt.',
      ],
    },
    // 3. Evening Snack
    {
      mealType: 'snack',
      title: 'Boiled Green Gram (Cherupayar) or Roasted Chana',
      description: 'Protein-rich legume snack with green tea',
      portionGuide: '1 small katori (bowl) of seasoned boiled green gram or roasted Bengal gram with green tea.',
      approxCalories: snackCalories,
      approxProteinG: snackProtein,
      isVegetarian: true,
      alternatives: [
        '1 cup unsweetened curd/yogurt topped with roasted chia seeds.',
        'A fistful of mixed roasted almonds and walnuts with black coffee.',
      ],
    },
    // 4. Dinner
    {
      mealType: 'dinner',
      title: isVeg
        ? 'Soft Wheat Chapatis with Paneer Curry'
        : 'Soft Wheat Chapatis with Grilled Chicken or Egg Curry',
      description: isVeg
        ? 'Fresh Whole Wheat Chapatis with Palak Paneer'
        : 'Fresh Whole Wheat Chapatis with Lean Chicken Curry',
      portionGuide: isVeg
        ? '2 medium whole wheat chapatis with 1 bowl palak paneer and a fresh cucumber-tomato salad.'
        : '2 medium whole wheat chapatis with 1 bowl country chicken curry or 2 egg curry and sliced cucumber.',
      approxCalories: dinnerCalories,
      approxProteinG: dinnerProtein,
      isVegetarian: isVeg,
      alternatives: [
        'Steamed vegetable daliya (broken wheat) khichdi with 1 bowl curd.',
        'Clear vegetable soup with sautéed tofu or paneer cubes.',
      ],
    },
  ];

  return meals;
}

/**
 * Main Deterministic Coaching Plan Generator
 */
export function generatePersonalCoachingPlan(profile: UserProfile): PersonalCoachingPlan {
  const age = profile.dateOfBirth ? calculateAgeFromDob(profile.dateOfBirth) : 25;
  const isFemale = profile.gender === 'female';

  // 1. Calculate Resting and Daily Metabolic Calorie Targets
  const bmr = calculateBmrMifflinStJeor({
    weightKg: profile.currentWeightKg,
    heightCm: profile.heightCm,
    ageYears: age,
    gender: isFemale ? 'female' : 'male',
  });

  const tdee = calculateTdee(bmr, profile.activityLevel || 'moderate');
  const targetCalorieResult = calculateTargetCalories({
    tdee,
    goal: profile.primaryGoal || 'general_fitness',
    gender: isFemale ? 'female' : 'male',
  });
  const targetCalories = targetCalorieResult.targetCalories;

  const macros = calculateMacronutrients({
    targetCalories,
    weightKg: profile.currentWeightKg,
    goal: profile.primaryGoal || 'general_fitness',
  });

  // 2. Filter Eligible Exercises based on Environment, Equipment, and Physical Limitations
  const environment = profile.trainingEnvironment || 'home';
  const equipment = profile.equipmentInventory || ['none'];
  const limitations = profile.injuriesOrLimitations || ['none'];
  const unavailableEquipment = profile.unavailableEquipment || [];

  const eligibleExercises = getEligibleExercises(environment, equipment, limitations, unavailableEquipment);

  // 3. Build Structured Weekly Workout Routines
  const weeklyWorkouts = buildWeeklyWorkouts(profile, eligibleExercises);

  // 4. Build Nutrition and Indian Portion Meals
  const dailyMeals = buildDailyMeals(profile, targetCalories, macros.proteinG);

  // 5. Plan Transparency & Rationale
  let transparencyExplanation = '';
  if (environment === 'gym') {
    transparencyExplanation = 'Your plan is designed for gym training using the machines and equipment you selected. It focuses on guided machine and free-weight movements for progressive strength and muscle stimulation.';
  } else if (environment === 'outdoor') {
    transparencyExplanation = 'Your plan is designed for outdoor training using cardiovascular walking/jogging intervals and open-air bodyweight circuits.';
  } else if (environment === 'calisthenics') {
    transparencyExplanation = 'Your plan is designed for calisthenics training using bodyweight leverage, bar progressions, and core control.';
  } else {
    // Home
    if (equipment.includes('none') || equipment.length === 0) {
      transparencyExplanation = 'Your plan is designed for home workouts using bodyweight movements only (no equipment required). Exercises are chosen to build full-body strength and mobility in a living room space.';
    } else {
      transparencyExplanation = `Your plan is designed for home workouts using your ${equipment.join(', ')} and bodyweight. Exercises leverage your equipment to progressively build muscle and burn calories at home.`;
    }
  }

  const planId = `coach_plan_${Date.now()}`;
  const goalTitle =
    profile.primaryGoal === 'fat_loss'
      ? 'Healthy Fat Loss & Conditioning'
      : profile.primaryGoal === 'muscle_gain'
      ? 'Lean Muscle & Hypertrophy'
      : profile.primaryGoal === 'strength'
      ? 'Functional Strength & Bone Density'
      : 'Healthy Stamina & Consistency';

  const baselineSummary = `${profile.currentWeightKg} kg • ${profile.heightCm} cm • ${age} yrs • Target: ~${targetCalories} kcal/day`;

  return {
    id: planId,
    userId: profile.userId,
    createdAt: new Date().toISOString(),
    primaryGoal: profile.primaryGoal,
    goalTitle,
    baselineSummary,
    weeklyWorkouts,
    dailyMeals,
    dailyWaterTargetMl: profile.dailyWaterTargetMl || 2500,
    progressionMilestones: [
      'Week 1–2: Master starting positions, steady tempo, and breathing cadence.',
      'Week 3–4: Add 1–2 reps per set as movements feel smoother.',
      'Week 5–6: Increase dumbbell weight slightly or decrease rest intervals by 10s.',
    ],
    whyThisPlanGenerated: transparencyExplanation,
  };
}
