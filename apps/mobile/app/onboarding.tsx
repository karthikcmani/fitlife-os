import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { Header } from '../src/components/ui/Header';
import { SurfaceCard } from '../src/components/ui/SurfaceCard';
import { Button } from '../src/components/ui/Button';
import { useAuthStore } from '../src/store/authStore';
import { theme } from '../src/theme';
import {
  Gender,
  FitnessLevel,
  ActivityLevel,
  PrimaryGoal,
  TrainingEnvironment,
} from '../src/types';
import {
  calculateBmrMifflinStJeor,
  calculateTdee,
  calculateTargetCalories,
  parseAndValidateDob,
} from '../src/domain';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Personal Biometrics (Empty defaults for new users, prefilled if recalibrating)
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [dobInput, setDobInput] = useState(() => {
    if (!profile?.dateOfBirth) return '';
    const parts = profile.dateOfBirth.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return profile.dateOfBirth;
  });
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState(profile ? String(profile.currentWeightKg) : '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);

  // Step 2: Experience, Activity & Schedule
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(profile?.fitnessLevel ?? 'beginner');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile?.activityLevel ?? 'moderate');
  const [trainingDays, setTrainingDays] = useState<number>(profile?.availableTrainingDays ?? 3);
  const [trainingEnv, setTrainingEnv] = useState<TrainingEnvironment>(profile?.trainingEnvironment ?? 'gym');

  // Step 3: Goal
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(profile?.primaryGoal ?? 'general_fitness');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic live age calculation from DOB
  const dobValidation = parseAndValidateDob(dobInput);
  const calculatedAge = dobValidation.isValid ? dobValidation.ageYears : undefined;

  const parsedWeight = parseFloat(weightKg.trim());
  const parsedHeight = parseFloat(heightCm.trim());

  const areBiometricsValid =
    !isNaN(parsedWeight) &&
    parsedWeight >= 25 &&
    parsedWeight <= 350 &&
    !isNaN(parsedHeight) &&
    parsedHeight >= 80 &&
    parsedHeight <= 260 &&
    calculatedAge !== undefined &&
    gender !== null;

  // Real-time calculation previews (strictly non-fabricated)
  let bmr: number | null = null;
  let tdee: number | null = null;
  let targetCalorieResult: { targetCalories: number; adjustmentPercentage: number; safetyWarning?: string } | null = null;

  if (areBiometricsValid && calculatedAge && gender && activityLevel) {
    try {
      if (gender === 'female' || gender === 'male') {
        bmr = calculateBmrMifflinStJeor({
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          ageYears: calculatedAge,
          gender,
        });
      } else {
        // Median biological calculation for non_binary / prefer_not_to_say
        const maleBmr = calculateBmrMifflinStJeor({
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          ageYears: calculatedAge,
          gender: 'male',
        });
        const femaleBmr = calculateBmrMifflinStJeor({
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          ageYears: calculatedAge,
          gender: 'female',
        });
        bmr = Math.round((maleBmr + femaleBmr) / 2);
      }

      tdee = calculateTdee(bmr, activityLevel);
      targetCalorieResult = calculateTargetCalories({
        tdee,
        goal: primaryGoal,
        gender: gender === 'female' ? 'female' : 'male',
      });
    } catch {
      // Invalid range handling
    }
  }

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};

    if (!displayName.trim() || displayName.trim().length < 2) {
      errs.displayName = 'Please enter your name (at least 2 characters).';
    }

    if (!dobInput.trim()) {
      errs.dob = 'Please enter your date of birth in DD/MM/YYYY format.';
    } else if (!dobValidation.isValid) {
      errs.dob = dobValidation.errorMessage ?? 'Invalid date of birth.';
    }

    if (!heightCm.trim() || isNaN(parsedHeight) || parsedHeight < 80 || parsedHeight > 260) {
      errs.height = 'Height must be between 80 cm and 260 cm.';
    }

    if (!weightKg.trim() || isNaN(parsedWeight) || parsedWeight < 25 || parsedWeight > 350) {
      errs.weight = 'Weight must be between 25 kg and 350 kg.';
    }

    if (!gender) {
      errs.gender = 'Please select a gender option for metabolic energy calibration.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};

    if (!activityLevel) {
      errs.activityLevel = 'Please select your typical weekly activity level.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setErrors({});
      setStep(3);
    }
  };

  const handleFinish = async () => {
    if (isSaving) return;

    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const isoDob = dobValidation.isoDate ?? `${new Date().getFullYear() - (calculatedAge ?? 25)}-01-01`;

      // 35ml per kg hydration recommendation clamped between 2L and 5L
      const waterTarget = Math.min(5000, Math.max(2000, Math.round(parsedWeight * 35)));

      await setProfile({
        userId: profile?.userId ?? `user-${Date.now()}`,
        displayName: displayName.trim(),
        dateOfBirth: isoDob,
        gender: gender ?? 'prefer_not_to_say',
        heightCm: parsedHeight,
        currentWeightKg: parsedWeight,
        fitnessLevel,
        activityLevel: activityLevel ?? 'moderate',
        primaryGoal,
        trainingEnvironment: trainingEnv,
        availableTrainingDays: trainingDays,
        preferredUnitSystem: 'metric',
        dailyWaterTargetMl: waterTarget,
        createdAt: profile?.createdAt ?? now,
        updatedAt: now,
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Storage Error', err?.message ?? 'Failed to save profile. Please try again.');
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <Header
        title="Welcome to FITLIFE OS"
        subtitle={
          step === 1
            ? 'Step 1 of 3: About You & Biometrics'
            : step === 2
            ? 'Step 2 of 3: Activity & Routine'
            : 'Step 3 of 3: Goal Wizard & Calibration'
        }
      />

      {/* STEP 1: PERSONAL BIOMETRICS */}
      {step === 1 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionHeading}>Your Baseline Biometrics</Text>
          <Text style={styles.sectionSub}>
            Stored privately 100% on your device. We use this to calculate your metabolic energy targets.
          </Text>

          {/* Display Name */}
          <Text style={styles.inputLabel}>Display Name *</Text>
          <Text style={styles.fieldExplanation}>What should we call you? Kept private to your phone.</Text>
          <TextInput
            style={[styles.textInput, errors.displayName ? styles.inputError : null]}
            value={displayName}
            onChangeText={(t) => {
              setDisplayName(t);
              if (errors.displayName) setErrors((prev) => ({ ...prev, displayName: '' }));
            }}
            placeholder="e.g. Alex"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="words"
          />
          {errors.displayName ? <Text style={styles.errorText}>{errors.displayName}</Text> : null}

          {/* Date of Birth (DD/MM/YYYY) */}
          <Text style={styles.inputLabel}>Date of Birth (DD/MM/YYYY) *</Text>
          <Text style={styles.fieldExplanation}>
            Used to dynamically calculate your age for Mifflin-St Jeor metabolic equations. Never shared.
          </Text>
          <TextInput
            style={[styles.textInput, errors.dob ? styles.inputError : null]}
            value={dobInput}
            onChangeText={(t) => {
              setDobInput(t);
              if (errors.dob) setErrors((prev) => ({ ...prev, dob: '' }));
            }}
            placeholder="e.g. 24/08/1998"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          {errors.dob ? <Text style={styles.errorText}>{errors.dob}</Text> : null}
          {dobValidation.isValid && dobValidation.ageYears !== undefined ? (
            <Text style={styles.ageBadge}>✓ Age: {dobValidation.ageYears} years old</Text>
          ) : null}

          {/* Height and Weight Row */}
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Height (cm) *</Text>
              <TextInput
                style={[styles.textInput, errors.height ? styles.inputError : null]}
                value={heightCm}
                onChangeText={(t) => {
                  setHeightCm(t);
                  if (errors.height) setErrors((prev) => ({ ...prev, height: '' }));
                }}
                keyboardType="numeric"
                placeholder="e.g. 175"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={3}
              />
              {errors.height ? <Text style={styles.errorText}>{errors.height}</Text> : null}
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>Weight (kg) *</Text>
              <TextInput
                style={[styles.textInput, errors.weight ? styles.inputError : null]}
                value={weightKg}
                onChangeText={(t) => {
                  setWeightKg(t);
                  if (errors.weight) setErrors((prev) => ({ ...prev, weight: '' }));
                }}
                keyboardType="numeric"
                placeholder="e.g. 70"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={5}
              />
              {errors.weight ? <Text style={styles.errorText}>{errors.weight}</Text> : null}
            </View>
          </View>

          {/* Gender */}
          <Text style={styles.inputLabel}>Gender for Metabolic Formula *</Text>
          <Text style={styles.fieldExplanation}>
            Mifflin-St Jeor formula requires biological sex for resting BMR. Neutral uses physiological median.
          </Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'male', label: 'Male' },
                { key: 'female', label: 'Female' },
                { key: 'non_binary', label: 'Non-Binary' },
                { key: 'prefer_not_to_say', label: 'Prefer not to say' },
              ] as { key: Gender; label: string }[]
            ).map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.pill, gender === g.key && styles.activePill]}
                onPress={() => {
                  setGender(g.key);
                  if (errors.gender) setErrors((prev) => ({ ...prev, gender: '' }));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, gender === g.key && styles.activePillText]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}

          <Button
            title="Next: Activity & Routine"
            onPress={handleNextFromStep1}
            style={styles.nextBtn}
          />
        </SurfaceCard>
      )}

      {/* STEP 2: EXPERIENCE, ACTIVITY & SCHEDULE */}
      {step === 2 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionHeading}>Your Daily Routine & Schedule</Text>
          <Text style={styles.sectionSub}>
            We adapt workout recommendations to your realistic schedule and current fitness level.
          </Text>

          {/* Fitness Experience Level */}
          <Text style={styles.inputLabel}>Fitness Experience</Text>
          <Text style={styles.fieldExplanation}>Ensures exercise volume and technique cues match your background.</Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'beginner', label: 'Beginner (New or < 1 yr)' },
                { key: 'intermediate', label: 'Intermediate (1 - 3 yrs)' },
                { key: 'advanced', label: 'Advanced (3+ yrs consistent)' },
              ] as { key: FitnessLevel; label: string }[]
            ).map((lvl) => (
              <TouchableOpacity
                key={lvl.key}
                style={[styles.pill, fitnessLevel === lvl.key && styles.activePill]}
                onPress={() => setFitnessLevel(lvl.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, fitnessLevel === lvl.key && styles.activePillText]}>
                  {lvl.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Daily Activity Level */}
          <Text style={styles.inputLabel}>Daily Activity Level *</Text>
          <Text style={styles.fieldExplanation}>Helps calculate your Total Daily Energy Expenditure (TDEE).</Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'sedentary', label: 'Sedentary (Desk work, mostly sitting)' },
                { key: 'light', label: 'Lightly Active (Light walking / 1-2 workouts)' },
                { key: 'moderate', label: 'Moderately Active (Active day / 3-5 workouts)' },
                { key: 'very_active', label: 'Very Active (Physical job or 6-7 workouts)' },
              ] as { key: ActivityLevel; label: string }[]
            ).map((act) => (
              <TouchableOpacity
                key={act.key}
                style={[styles.pill, activityLevel === act.key && styles.activePill]}
                onPress={() => {
                  setActivityLevel(act.key);
                  if (errors.activityLevel) setErrors((prev) => ({ ...prev, activityLevel: '' }));
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, activityLevel === act.key && styles.activePillText]}>
                  {act.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.activityLevel ? <Text style={styles.errorText}>{errors.activityLevel}</Text> : null}

          {/* Available Training Days Per Week */}
          <Text style={styles.inputLabel}>Available Training Days Per Week</Text>
          <Text style={styles.fieldExplanation}>
            How many days per week can you realistically exercise? (We schedule rest on other days).
          </Text>
          <View style={styles.pillRow}>
            {[2, 3, 4, 5, 6].map((days) => (
              <TouchableOpacity
                key={days}
                style={[styles.pill, styles.smallPill, trainingDays === days && styles.activePill]}
                onPress={() => setTrainingDays(days)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, trainingDays === days && styles.activePillText]}>
                  {days} Days / Wk
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Training Environment */}
          <Text style={styles.inputLabel}>Where Will You Exercise?</Text>
          <Text style={styles.fieldExplanation}>Tailors the exercise library to your available equipment.</Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'gym', label: 'Gym (Barbells & Machines)' },
                { key: 'home', label: 'Home (Dumbbells / Mat)' },
                { key: 'calisthenics', label: 'Outdoor / Calisthenics' },
              ] as { key: TrainingEnvironment; label: string }[]
            ).map((env) => (
              <TouchableOpacity
                key={env.key}
                style={[styles.pill, trainingEnv === env.key && styles.activePill]}
                onPress={() => setTrainingEnv(env.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, trainingEnv === env.key && styles.activePillText]}>
                  {env.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.twoBtnRow}>
            <Button
              title="Back"
              variant="outline"
              onPress={() => setStep(1)}
              style={styles.backBtn}
            />
            <Button
              title="Next: Set Goal"
              onPress={handleNextFromStep2}
              style={styles.saveBtn}
            />
          </View>
        </SurfaceCard>
      )}

      {/* STEP 3: GOAL WIZARD & CALIBRATION */}
      {step === 3 && (
        <SurfaceCard elevated>
          <Text style={styles.sectionHeading}>Choose Your Primary Goal</Text>
          <Text style={styles.sectionSub}>
            Select what you want to achieve. We never assume bodybuilding or extreme dieting.
          </Text>

          {/* Goals List with Explanations */}
          <View style={styles.goalsList}>
            {(
              [
                {
                  key: 'fat_loss',
                  title: 'Lose Body Fat',
                  desc: 'Gentle, sustainable calorie deficit while preserving muscle tone and vitality.',
                },
                {
                  key: 'muscle_gain',
                  title: 'Build Muscle',
                  desc: 'A modest energy surplus with optimal protein to support muscle growth.',
                },
                {
                  key: 'strength',
                  title: 'Become Stronger',
                  desc: 'Focus on progressive compound lifting and functional physical resilience.',
                },
                {
                  key: 'general_fitness',
                  title: 'Improve General Fitness',
                  desc: 'Balanced whole-body health, daily energy, joint mobility, and stamina.',
                },
                {
                  key: 'stamina',
                  title: 'Improve Stamina & Conditioning',
                  desc: 'Enhance cardiovascular capacity, endurance, and heart health.',
                },
                {
                  key: 'health_consistency',
                  title: 'Health & Habit Consistency',
                  desc: 'Build consistent daily hydration, healthy eating, and walking without burnout.',
                },
                {
                  key: 'maintenance',
                  title: 'Maintain Current Fitness',
                  desc: 'Keep your current weight and fitness level steady with zero pressure.',
                },
              ] as { key: PrimaryGoal; title: string; desc: string }[]
            ).map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.goalCard, primaryGoal === g.key && styles.activeGoalCard]}
                onPress={() => setPrimaryGoal(g.key)}
                activeOpacity={0.7}
              >
                <View style={styles.goalCardHeader}>
                  <Text style={[styles.goalCardTitle, primaryGoal === g.key && styles.activeGoalCardTitle]}>
                    {g.title}
                  </Text>
                  {primaryGoal === g.key && <Text style={styles.checkIcon}>✓</Text>}
                </View>
                <Text style={styles.goalCardDesc}>{g.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scientific Metabolic Calibration Box */}
          <View style={styles.previewBox}>
            <Text style={styles.previewHeading}>Your Personalized Calibration</Text>
            {areBiometricsValid && bmr && tdee && targetCalorieResult ? (
              <>
                <Text style={styles.previewRow}>
                  Basal Energy Needs (BMR): <Text style={styles.bold}>{bmr} kcal/day</Text>
                </Text>
                <Text style={styles.previewSubNote}>
                  Energy your body burns naturally just staying alive at complete rest.
                </Text>

                <Text style={styles.previewRow}>
                  Total Daily Burn (TDEE): <Text style={styles.bold}>{tdee} kcal/day</Text>
                </Text>
                <Text style={styles.previewSubNote}>
                  Estimated total calories burned including your daily activity level.
                </Text>

                <Text style={[styles.previewRow, { color: theme.colors.primary, marginTop: 4 }]}>
                  Calibrated Intake Target: <Text style={styles.bold}>{targetCalorieResult.targetCalories} kcal/day</Text>
                </Text>
                <Text style={styles.previewSubNote}>
                  Evidence-based target tailored for your goal ({targetCalorieResult.adjustmentPercentage}% adjustment).
                </Text>

                <Text style={styles.previewRow}>
                  Recommended Hydration: <Text style={styles.bold}>{Math.min(5, Math.max(2, (parsedWeight * 0.035))).toFixed(1)} Litres/day</Text>
                </Text>
                <Text style={styles.previewSubNote}>
                  Based on 35ml per kilogram of your body weight.
                </Text>

                {targetCalorieResult.safetyWarning ? (
                  <Text style={styles.warningText}>⚠️ {targetCalorieResult.safetyWarning}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.incompleteText}>
                Complete all biometrics in Step 1 to calculate your scientific targets.
              </Text>
            )}
          </View>

          <View style={styles.twoBtnRow}>
            <Button
              title="Back"
              variant="outline"
              onPress={() => setStep(2)}
              style={styles.backBtn}
              disabled={isSaving}
            />
            <Button
              title="Save & Launch FITLIFE OS"
              onPress={handleFinish}
              loading={isSaving}
              disabled={isSaving}
              style={styles.saveBtn}
            />
          </View>
        </SurfaceCard>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sectionHeading: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  sectionSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.md,
    lineHeight: 18,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    marginTop: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  fieldExplanation: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 48,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    marginTop: 4,
  },
  ageBadge: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    marginTop: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  pill: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallPill: {
    minWidth: 80,
  },
  activePill: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  activePillText: {
    color: theme.colors.textInverse,
  },
  nextBtn: {
    marginTop: theme.spacing.xl,
  },
  goalsList: {
    gap: 10,
    marginVertical: theme.spacing.sm,
  },
  goalCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  activeGoalCard: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  goalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  goalCardTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  activeGoalCardTitle: {
    color: theme.colors.primary,
  },
  checkIcon: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  goalCardDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
  previewBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  previewHeading: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
  },
  previewRow: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginVertical: 1,
  },
  previewSubNote: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
    marginBottom: 6,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  warningText: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginTop: 6,
  },
  incompleteText: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  twoBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.lg,
  },
  backBtn: {
    flex: 1,
  },
  saveBtn: {
    flex: 2,
  },
});
