import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { Header } from '../src/components/ui/Header';
import { SurfaceCard } from '../src/components/ui/SurfaceCard';
import { Button } from '../src/components/ui/Button';
import { useAuthStore } from '../src/store/authStore';
import { useCoachStore } from '../src/store/coachStore';
import { theme } from '../src/theme';
import {
  Gender,
  FitnessLevel,
  ActivityLevel,
  PrimaryGoal,
  TrainingEnvironment,
  EquipmentItem,
  SessionDurationMinutes,
  DietaryPreference,
  PhysicalLimitation,
  PersonalCoachingPlan,
} from '../src/types';
import { parseAndValidateDob } from '../src/domain';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();
  const { generateAndSetPlan, saveAndActivatePlan } = useCoachStore();

  // Wizard Steps: 1: Basic Info, 2: Goal, 3: Experience & Time, 4: Environment & Equipment, 5: Lifestyle & Limitations, 6: Plan Review
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Basic Information
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [dobInput, setDobInput] = useState(() => {
    if (!profile?.dateOfBirth) return '';
    const parts = profile.dateOfBirth.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : profile.dateOfBirth;
  });
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState(profile ? String(profile.currentWeightKg) : '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [waistCm, setWaistCm] = useState(profile?.bodyMeasurements?.waistCm ? String(profile.bodyMeasurements.waistCm) : '');

  // Step 2: Goal
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(profile?.primaryGoal ?? 'general_fitness');

  // Step 3: Experience & Schedule
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(profile?.fitnessLevel ?? 'beginner');
  const [availableDays, setAvailableDays] = useState<number>(profile?.availableTrainingDays ?? 3);
  const [sessionMinutes, setSessionMinutes] = useState<SessionDurationMinutes>(profile?.sessionDurationMinutes ?? 30);
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile?.activityLevel ?? 'moderate');

  // Step 4: Environment & Equipment
  const [trainingEnv, setTrainingEnv] = useState<TrainingEnvironment>(profile?.trainingEnvironment ?? 'home');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem[]>(
    profile?.equipmentInventory && profile.equipmentInventory.length > 0
      ? profile.equipmentInventory
      : ['none']
  );

  // Step 5: Lifestyle & Limitations
  const [dietaryPref, setDietaryPref] = useState<DietaryPreference>(profile?.dietaryPreference ?? 'vegetarian');
  const [selectedLimitations, setSelectedLimitations] = useState<PhysicalLimitation[]>(
    profile?.injuriesOrLimitations && profile.injuriesOrLimitations.length > 0
      ? profile.injuriesOrLimitations
      : ['none']
  );

  // Step 6: Plan Review state
  const [generatedPlan, setGeneratedPlan] = useState<PersonalCoachingPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isActivatingPlan, setIsActivatingPlan] = useState(false);

  // DOB live validation
  const dobValidation = parseAndValidateDob(dobInput);

  // Toggle equipment item in multi-select
  const handleToggleEquipment = (item: EquipmentItem) => {
    if (item === 'none') {
      setSelectedEquipment(['none']);
      return;
    }
    const filtered = selectedEquipment.filter((e) => e !== 'none');
    if (filtered.includes(item)) {
      const next = filtered.filter((e) => e !== item);
      setSelectedEquipment(next.length === 0 ? ['none'] : next);
    } else {
      setSelectedEquipment([...filtered, item]);
    }
  };

  // Toggle limitation item in multi-select
  const handleToggleLimitation = (item: PhysicalLimitation) => {
    if (item === 'none') {
      setSelectedLimitations(['none']);
      return;
    }
    const filtered = selectedLimitations.filter((e) => e !== 'none');
    if (filtered.includes(item)) {
      const next = filtered.filter((e) => e !== item);
      setSelectedLimitations(next.length === 0 ? ['none'] : next);
    } else {
      setSelectedLimitations([...filtered, item]);
    }
  };

  // Step Validation & Navigation
  const handleNextFromStep1 = () => {
    if (!displayName.trim() || displayName.trim().length < 2) {
      Alert.alert('Name Required', 'Please enter your name or nickname.');
      return;
    }
    if (!dobValidation.isValid) {
      Alert.alert('Invalid Date of Birth', dobValidation.errorMessage || 'Please enter DD/MM/YYYY.');
      return;
    }
    const w = parseFloat(weightKg.trim());
    if (isNaN(w) || w < 25 || w > 350) {
      Alert.alert('Invalid Weight', 'Please enter your weight in kg (25 - 350 kg).');
      return;
    }
    const h = parseFloat(heightCm.trim());
    if (isNaN(h) || h < 80 || h > 260) {
      Alert.alert('Invalid Height', 'Please enter your height in cm (80 - 260 cm).');
      return;
    }
    if (!gender) {
      Alert.alert('Biological Sex Selection', 'Please select a sex option so we can accurately calibrate metabolic formulas.');
      return;
    }
    setCurrentStep(2);
  };

  // Generate Plan Transition
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    const userId = profile?.userId ?? `user_${Date.now()}`;
    const w = parseFloat(weightKg.trim());
    const h = parseFloat(heightCm.trim());
    const waist = parseFloat(waistCm.trim());

    const draftProfile = {
      userId,
      displayName: displayName.trim(),
      dateOfBirth: dobValidation.isoDate,
      gender: gender ?? 'prefer_not_to_say',
      heightCm: h,
      currentWeightKg: w,
      fitnessLevel,
      activityLevel,
      primaryGoal,
      trainingEnvironment: trainingEnv,
      availableTrainingDays: availableDays,
      sessionDurationMinutes: sessionMinutes,
      equipmentInventory: selectedEquipment,
      dietaryPreference: dietaryPref,
      injuriesOrLimitations: selectedLimitations,
      bodyMeasurements: !isNaN(waist) && waist > 30 ? { waistCm: waist } : undefined,
      preferredUnitSystem: profile?.preferredUnitSystem ?? 'metric',
      dailyWaterTargetMl: profile?.dailyWaterTargetMl ?? 2500,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const plan = await generateAndSetPlan(draftProfile as any);
      setGeneratedPlan(plan);
      setCurrentStep(6);
    } catch (err: any) {
      Alert.alert('Plan Generation Error', err?.message || 'Could not generate plan.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Activate Plan and Enter App
  const handleActivatePlan = async () => {
    if (!generatedPlan) return;
    setIsActivatingPlan(true);
    try {
      const userId = profile?.userId ?? `user_${Date.now()}`;
      const w = parseFloat(weightKg.trim());
      const h = parseFloat(heightCm.trim());
      const waist = parseFloat(waistCm.trim());

      const finalProfile = {
        userId,
        displayName: displayName.trim(),
        dateOfBirth: dobValidation.isoDate,
        gender: gender ?? 'prefer_not_to_say',
        heightCm: h,
        currentWeightKg: w,
        fitnessLevel,
        activityLevel,
        primaryGoal,
        trainingEnvironment: trainingEnv,
        availableTrainingDays: availableDays,
        sessionDurationMinutes: sessionMinutes,
        equipmentInventory: selectedEquipment,
        dietaryPreference: dietaryPref,
        injuriesOrLimitations: selectedLimitations,
        bodyMeasurements: !isNaN(waist) && waist > 30 ? { waistCm: waist } : undefined,
        preferredUnitSystem: profile?.preferredUnitSystem ?? 'metric',
        dailyWaterTargetMl: profile?.dailyWaterTargetMl ?? 2500,
        createdAt: profile?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setProfile(finalProfile as any);
      await saveAndActivatePlan(generatedPlan);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Activation Error', err?.message || 'Failed to save personal plan.');
    } finally {
      setIsActivatingPlan(false);
    }
  };

  return (
    <ScreenContainer>
      <Header
        title="Personal Fitness Coach"
        subtitle={`Step ${currentStep} of 6 • ${
          currentStep === 1
            ? 'Your Baseline'
            : currentStep === 2
            ? 'Your Primary Goal'
            : currentStep === 3
            ? 'Experience & Schedule'
            : currentStep === 4
            ? 'Environment & Equipment'
            : currentStep === 5
            ? 'Lifestyle & Safety'
            : 'Review Your Plan'
        }`}
      />

      {/* Progress Dots */}
      <View style={styles.stepProgressRow}>
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              s === currentStep && styles.stepDotActive,
              s < currentStep && styles.stepDotCompleted,
            ]}
          />
        ))}
      </View>

      {/* STEP 1: BASIC INFORMATION */}
      {currentStep === 1 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionTitle}>Tell us about your body</Text>
          <Text style={styles.sectionSubtitle}>
            We use these measurements strictly to calculate your daily energy baseline. None of your data ever leaves this phone.
          </Text>

          <Text style={styles.inputLabel}>What should we call you?</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Aarav"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Text style={styles.inputLabel}>Date of Birth (DD/MM/YYYY)</Text>
          <TextInput
            style={[styles.textInput, !dobValidation.isValid && dobInput.length >= 8 && styles.inputError]}
            value={dobInput}
            onChangeText={setDobInput}
            placeholder="e.g. 15/08/1998"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
            maxLength={10}
          />
          {dobValidation.isValid && (
            <Text style={styles.helperText}>Calculated age: {dobValidation.ageYears} years old</Text>
          )}

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.textInput}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="175"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Current Weight (kg)</Text>
              <TextInput
                style={styles.textInput}
                value={weightKg}
                onChangeText={setWeightKg}
                placeholder="70"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Biological Sex (Required for metabolic equations)</Text>
          <Text style={styles.helperText}>
            Mifflin-St Jeor metabolic formulas require biological sex to estimate natural resting calorie consumption accurately.
          </Text>
          <View style={styles.pillRow}>
            {[
              { id: 'male', label: 'Male' },
              { id: 'female', label: 'Female' },
              { id: 'non_binary', label: 'Other / Prefer not to say' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.choicePill, gender === item.id && styles.choicePillActive]}
                onPress={() => setGender(item.id as Gender)}
              >
                <Text style={[styles.choiceText, gender === item.id && styles.choiceTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Waist Measurement (cm, Optional)</Text>
          <TextInput
            style={styles.textInput}
            value={waistCm}
            onChangeText={setWaistCm}
            placeholder="e.g. 82 (Optional)"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
          />

          <Button
            title="Continue to Goal Selection"
            onPress={handleNextFromStep1}
            style={styles.submitBtn}
          />
        </SurfaceCard>
      )}

      {/* STEP 2: PRIMARY FITNESS GOAL */}
      {currentStep === 2 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionTitle}>What is your primary goal?</Text>
          <Text style={styles.sectionSubtitle}>
            Your chosen goal is the main driver of your plan. We never force fat loss onto you based on a BMI number.
          </Text>

          {[
            { id: 'fat_loss', title: '🔥 Lose Body Fat', desc: 'Burn fat and tone up while protecting muscle.' },
            { id: 'muscle_gain', title: '💪 Build Lean Muscle', desc: 'Add functional muscle size and strength.' },
            { id: 'general_fitness', title: '⚡ Improve Overall Fitness', desc: 'Feel energetic, stay active, and build stamina.' },
            { id: 'strength', title: '🏋️ Increase Strength', desc: 'Lift heavier, feel powerful, and strengthen bones.' },
            { id: 'maintenance', title: '⚖️ Maintain Current Fitness', desc: 'Sustain your healthy habits and stay balanced.' },
            { id: 'recomposition', title: '🔄 Body Recomposition', desc: 'Simultaneously build muscle and burn body fat.' },
          ].map((g) => (
            <TouchableOpacity
              key={g.id}
              style={[styles.goalCard, primaryGoal === g.id && styles.goalCardActive]}
              onPress={() => setPrimaryGoal(g.id as PrimaryGoal)}
            >
              <Text style={[styles.goalTitle, primaryGoal === g.id && styles.goalTitleActive]}>{g.title}</Text>
              <Text style={styles.goalDesc}>{g.desc}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.btnRow}>
            <Button title="Back" variant="outline" onPress={() => setCurrentStep(1)} style={{ flex: 1 }} />
            <Button title="Next" onPress={() => setCurrentStep(3)} style={{ flex: 2 }} />
          </View>
        </SurfaceCard>
      )}

      {/* STEP 3: EXPERIENCE & SCHEDULE */}
      {currentStep === 3 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionTitle}>Experience & Time Available</Text>
          <Text style={styles.sectionSubtitle}>
            A plan only works if it fits comfortably into your real week.
          </Text>

          <Text style={styles.inputLabel}>Your Fitness Experience</Text>
          <View style={styles.optionsCol}>
            {[
              { id: 'beginner', title: 'Complete Beginner', desc: 'Never exercised or returning after years away.' },
              { id: 'intermediate', title: 'Some Experience', desc: 'Familiar with basic exercises and workout routine.' },
              { id: 'advanced', title: 'Experienced', desc: 'Training consistently for 1+ years.' },
            ].map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.levelCard, fitnessLevel === item.id && styles.levelCardActive]}
                onPress={() => setFitnessLevel(item.id as FitnessLevel)}
              >
                <Text style={[styles.levelTitle, fitnessLevel === item.id && styles.levelTitleActive]}>
                  {item.title}
                </Text>
                <Text style={styles.levelDesc}>{item.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>How many days per week can you exercise?</Text>
          <View style={styles.daysRow}>
            {[2, 3, 4, 5, 6].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.dayPill, availableDays === days && styles.dayPillActive]}
                onPress={() => setAvailableDays(days)}
              >
                <Text style={[styles.dayPillText, availableDays === days && styles.dayPillTextActive]}>
                  {days} Days
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Available time per workout session</Text>
          <View style={styles.daysRow}>
            {[
              { min: 20, label: '20 Mins' },
              { min: 30, label: '30 Mins' },
              { min: 45, label: '45 Mins' },
              { min: 60, label: '60 Mins' },
            ].map((item) => (
              <TouchableOpacity
                key={item.min}
                style={[styles.dayPill, sessionMinutes === item.min && styles.dayPillActive]}
                onPress={() => setSessionMinutes(item.min as SessionDurationMinutes)}
              >
                <Text style={[styles.dayPillText, sessionMinutes === item.min && styles.dayPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.btnRow}>
            <Button title="Back" variant="outline" onPress={() => setCurrentStep(2)} style={{ flex: 1 }} />
            <Button title="Next" onPress={() => setCurrentStep(4)} style={{ flex: 2 }} />
          </View>
        </SurfaceCard>
      )}

      {/* STEP 4: ENVIRONMENT & EQUIPMENT INVENTORY */}
      {currentStep === 4 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionTitle}>Where will you exercise?</Text>
          <Text style={styles.sectionSubtitle}>
            Your selection determines what exercises you see. If you are at home with no equipment, we will never prescribe barbell or machine exercises!
          </Text>

          <View style={styles.optionsCol}>
            {[
              { id: 'home', title: '🏡 Home Workout', desc: 'Exercise in living room or bedroom.' },
              { id: 'gym', title: '🏢 Commercial Gym', desc: 'Access to machines, barbells, dumbbells, cables.' },
              { id: 'calisthenics', title: '🤸 Calisthenics / Park', desc: 'Bodyweight training using bars and open space.' },
            ].map((env) => (
              <TouchableOpacity
                key={env.id}
                style={[styles.levelCard, trainingEnv === env.id && styles.levelCardActive]}
                onPress={() => setTrainingEnv(env.id as TrainingEnvironment)}
              >
                <Text style={[styles.levelTitle, trainingEnv === env.id && styles.levelTitleActive]}>
                  {env.title}
                </Text>
                <Text style={styles.levelDesc}>{env.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {trainingEnv === 'home' && (
            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={styles.inputLabel}>What equipment do you have at home? (Tap all that apply)</Text>
              <View style={styles.equipmentGrid}>
                {[
                  { id: 'none', label: '🚫 No Equipment (Bodyweight only)' },
                  { id: 'dumbbells', label: '🏋️ Dumbbells (Pair)' },
                  { id: 'resistance_bands', label: '🎗️ Resistance Bands' },
                  { id: 'pull_up_bar', label: '🚪 Doorway Pull-Up Bar' },
                  { id: 'exercise_mat', label: '🧘 Yoga / Exercise Mat' },
                  { id: 'kettlebell', label: '🔔 Kettlebell' },
                  { id: 'bench', label: '🪑 Workout Bench / Sturdy Chair' },
                  { id: 'barbell', label: '🔩 Barbell & Weight Plates' },
                ].map((eq) => {
                  const isChecked = selectedEquipment.includes(eq.id as EquipmentItem);
                  return (
                    <TouchableOpacity
                      key={eq.id}
                      style={[styles.equipCard, isChecked && styles.equipCardActive]}
                      onPress={() => handleToggleEquipment(eq.id as EquipmentItem)}
                    >
                      <Text style={[styles.equipText, isChecked && styles.equipTextActive]}>{eq.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.btnRow}>
            <Button title="Back" variant="outline" onPress={() => setCurrentStep(3)} style={{ flex: 1 }} />
            <Button title="Next" onPress={() => setCurrentStep(5)} style={{ flex: 2 }} />
          </View>
        </SurfaceCard>
      )}

      {/* STEP 5: LIFESTYLE & LIMITATIONS */}
      {currentStep === 5 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionTitle}>Dietary Preference & Safety</Text>
          <Text style={styles.sectionSubtitle}>
            We tailor your meal ideas to your food habits and keep your workouts safe around joint issues.
          </Text>

          <Text style={styles.inputLabel}>Dietary Preference</Text>
          <View style={styles.optionsCol}>
            {[
              { id: 'vegetarian', title: '🌱 Vegetarian', desc: 'Dal, Paneer, Curd, Veggies, Rice & Roti' },
              { id: 'non_vegetarian', title: '🍗 Non-Vegetarian (Includes Fish & Chicken)', desc: 'Eggs, Kerala Fish Curry, Chicken, Dal, Rice' },
              { id: 'eggetarian', title: '🥚 Eggetarian', desc: 'Eggs + Vegetarian diet (No meat or fish)' },
              { id: 'vegan', title: '🌿 100% Vegan', desc: 'Plant-based (No dairy, no eggs, no animal products)' },
            ].map((diet) => (
              <TouchableOpacity
                key={diet.id}
                style={[styles.levelCard, dietaryPref === diet.id && styles.levelCardActive]}
                onPress={() => setDietaryPref(diet.id as DietaryPreference)}
              >
                <Text style={[styles.levelTitle, dietaryPref === diet.id && styles.levelTitleActive]}>{diet.title}</Text>
                <Text style={styles.levelDesc}>{diet.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Any physical limitations or joint aches to protect?</Text>
          <Text style={styles.helperText}>
            We automatically replace exercises that stress these joints with knee/back-friendly alternatives.
          </Text>
          <View style={styles.equipmentGrid}>
            {[
              { id: 'none', label: '✅ No limitations / Feel healthy' },
              { id: 'knee_pain', label: '🦵 Sensitive Knees / Knee pain' },
              { id: 'lower_back', label: '🧘 Lower Back sensitivity' },
              { id: 'shoulder_pain', label: '💪 Shoulder impingement' },
            ].map((lim) => {
              const isChecked = selectedLimitations.includes(lim.id as PhysicalLimitation);
              return (
                <TouchableOpacity
                  key={lim.id}
                  style={[styles.equipCard, isChecked && styles.equipCardActive]}
                  onPress={() => handleToggleLimitation(lim.id as PhysicalLimitation)}
                >
                  <Text style={[styles.equipText, isChecked && styles.equipTextActive]}>{lim.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.btnRow}>
            <Button title="Back" variant="outline" onPress={() => setCurrentStep(4)} style={{ flex: 1 }} />
            <Button
              title="Generate My Plan ✨"
              onPress={handleGeneratePlan}
              loading={isGeneratingPlan}
              style={{ flex: 2 }}
            />
          </View>
        </SurfaceCard>
      )}

      {/* STEP 6: PLAN REVIEW & ACTIVATION */}
      {currentStep === 6 && generatedPlan && (
        <ScrollView style={{ flex: 1 }}>
          <SurfaceCard elevated>
            <View style={styles.planHeaderBadge}>
              <Text style={styles.planBadgeText}>🎯 YOUR CUSTOM PLAN IS READY</Text>
            </View>

            <Text style={styles.planGoalTitle}>{generatedPlan.goalTitle}</Text>
            <Text style={styles.planBaseline}>{generatedPlan.baselineSummary}</Text>

            <View style={styles.planHighlightBox}>
              <Text style={styles.highlightTitle}>💡 Why this plan was created for you:</Text>
              <Text style={styles.highlightDesc}>{generatedPlan.whyThisPlanGenerated}</Text>
            </View>

            {/* Weekly Schedule Overview */}
            <Text style={styles.subSectionTitle}>📅 Your Weekly Training Schedule ({generatedPlan.weeklyWorkouts.length} sessions/week):</Text>
            {generatedPlan.weeklyWorkouts.map((w, idx) => (
              <View key={idx} style={styles.routinePreviewCard}>
                <View style={styles.routineHeaderRow}>
                  <Text style={styles.routineDayText}>{w.dayName}</Text>
                  <Text style={styles.routineTimeText}>⏱️ {w.estimatedMinutes} Mins</Text>
                </View>
                <Text style={styles.routineTitleText}>{w.title}</Text>
                <Text style={styles.routineExSummary}>
                  {w.exercises.length} Exercises: {w.exercises.map((e) => e.name).join(', ')}
                </Text>
              </View>
            ))}

            {/* Daily Meals Overview */}
            <Text style={styles.subSectionTitle}>🍛 Suggested Daily Meals (Familiar Portions):</Text>
            {generatedPlan.dailyMeals.map((m, idx) => (
              <View key={idx} style={styles.mealPreviewCard}>
                <Text style={styles.mealTypeBadge}>{m.mealType.toUpperCase()}</Text>
                <Text style={styles.mealTitleText}>{m.title}</Text>
                <Text style={styles.portionGuideText}>🍽️ Portion: {m.portionGuide}</Text>
                <Text style={styles.macroTag}>Approx. {m.approxCalories} kcal • {m.approxProteinG}g Protein</Text>
              </View>
            ))}

            {/* Milestones */}
            <Text style={styles.subSectionTitle}>🏆 Expected Progression Milestones:</Text>
            {generatedPlan.progressionMilestones.map((milestone, idx) => (
              <View key={idx} style={styles.milestoneRow}>
                <Text style={styles.milestoneDot}>•</Text>
                <Text style={styles.milestoneText}>{milestone}</Text>
              </View>
            ))}

            <View style={styles.actionWrap}>
              <Button
                title="Activate My Personal Plan 🚀"
                onPress={handleActivatePlan}
                loading={isActivatingPlan}
                style={{ width: '100%' }}
              />
              <Button
                title="Adjust Inputs"
                variant="outline"
                onPress={() => setCurrentStep(1)}
                style={{ width: '100%', marginTop: theme.spacing.sm }}
              />
            </View>
          </SurfaceCard>
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  stepProgressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  stepDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.borderLight,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
    width: 36,
  },
  stepDotCompleted: {
    backgroundColor: theme.colors.primaryDark ?? '#1b4332',
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 6,
    fontSize: 11,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    fontSize: 15,
    marginBottom: theme.spacing.sm,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  twoCol: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  col: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  choicePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  choicePillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  choiceText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  choiceTextActive: {
    color: theme.colors.textInverse,
  },
  optionsCol: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  goalCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
    marginBottom: 8,
  },
  goalCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  goalTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 15,
  },
  goalTitleActive: {
    color: theme.colors.primary,
  },
  goalDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  levelCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  levelCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  levelTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  levelTitleActive: {
    color: theme.colors.primary,
  },
  levelDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  dayPill: {
    flex: 1,
    minWidth: 60,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  dayPillActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  dayPillText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  dayPillTextActive: {
    color: theme.colors.textInverse,
  },
  equipmentGrid: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  equipCard: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceElevated,
  },
  equipCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceHighlight,
  },
  equipText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  equipTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  submitBtn: {
    marginTop: theme.spacing.md,
  },
  planHeaderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryDark ?? '#1b4332',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    marginBottom: 8,
  },
  planBadgeText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    fontSize: 11,
  },
  planGoalTitle: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  planBaseline: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
  },
  planHighlightBox: {
    backgroundColor: theme.colors.surfaceHighlight,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  highlightTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    marginBottom: 4,
  },
  highlightDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  subSectionTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.sm,
    marginBottom: 8,
  },
  routinePreviewCard: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  routineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  routineDayText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  routineTimeText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  routineTitleText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  routineExSummary: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  mealPreviewCard: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mealTypeBadge: {
    ...theme.typography.captionBold,
    color: theme.colors.warning,
    fontSize: 10,
    marginBottom: 2,
  },
  mealTitleText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  portionGuideText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  macroTag: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  milestoneDot: {
    color: theme.colors.primary,
    fontSize: 16,
    lineHeight: 18,
  },
  milestoneText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  actionWrap: {
    marginTop: theme.spacing.lg,
    gap: 6,
  },
});
