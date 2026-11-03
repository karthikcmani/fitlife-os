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
} from '../src/domain';

export default function OnboardingScreen() {
  const router = useRouter();
  const { profile, setProfile } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);

  // Form State — empty by default for new users, or prefilled if user is recalibrating existing profile
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [ageYears, setAgeYears] = useState(
    profile?.dateOfBirth ? String(new Date().getFullYear() - parseInt(profile.dateOfBirth.split('-')[0], 10)) : ''
  );
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : '');
  const [weightKg, setWeightKg] = useState(profile ? String(profile.currentWeightKg) : '');
  const [gender, setGender] = useState<Gender | null>(profile?.gender ?? null);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>(profile?.fitnessLevel ?? 'beginner');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(profile?.activityLevel ?? 'moderate');
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>(profile?.primaryGoal ?? 'recomposition');
  const [trainingEnv, setTrainingEnv] = useState<TrainingEnvironment>(profile?.trainingEnvironment ?? 'gym');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Parsed values
  const parsedWeight = parseFloat(weightKg.trim());
  const parsedHeight = parseFloat(heightCm.trim());
  const parsedAge = parseInt(ageYears.trim(), 10);

  const areBiometricsValid =
    !isNaN(parsedWeight) &&
    parsedWeight >= 25 &&
    parsedWeight <= 350 &&
    !isNaN(parsedHeight) &&
    parsedHeight >= 80 &&
    parsedHeight <= 260 &&
    !isNaN(parsedAge) &&
    parsedAge >= 13 &&
    parsedAge <= 120 &&
    gender !== null &&
    activityLevel !== null;

  // Real-time calculation previews (strictly non-fabricated)
  let bmr: number | null = null;
  let tdee: number | null = null;
  let targetCalorieResult: { targetCalories: number; adjustmentPercentage: number; safetyWarning?: string } | null = null;

  if (areBiometricsValid && gender && activityLevel) {
    try {
      if (gender === 'female' || gender === 'male') {
        bmr = calculateBmrMifflinStJeor({
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          ageYears: parsedAge,
          gender,
        });
      } else {
        // Median biological calculation for non_binary / prefer_not_to_say
        const maleBmr = calculateBmrMifflinStJeor({
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          ageYears: parsedAge,
          gender: 'male',
        });
        const femaleBmr = calculateBmrMifflinStJeor({
          weightKg: parsedWeight,
          heightCm: parsedHeight,
          ageYears: parsedAge,
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
      errs.displayName = 'Please enter a name (at least 2 characters).';
    }

    if (!ageYears.trim() || isNaN(parsedAge) || parsedAge < 13 || parsedAge > 120) {
      errs.age = 'Age must be between 13 and 120 years.';
    }

    if (!heightCm.trim() || isNaN(parsedHeight) || parsedHeight < 80 || parsedHeight > 260) {
      errs.height = 'Height must be between 80 cm and 260 cm.';
    }

    if (!weightKg.trim() || isNaN(parsedWeight) || parsedWeight < 25 || parsedWeight > 350) {
      errs.weight = 'Weight must be between 25 kg and 350 kg.';
    }

    if (!gender) {
      errs.gender = 'Please select a gender for metabolic calibration.';
    }

    if (!activityLevel) {
      errs.activityLevel = 'Please select your weekly activity level.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setErrors({});
      setStep(2);
    }
  };

  const handleFinish = async () => {
    if (isSaving) return;

    if (!validateStep1()) {
      setStep(1);
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const estimatedDob = `${currentYear - parsedAge}-01-01`;

      // 35ml per kg hydration recommendation
      const waterTarget = Math.min(5000, Math.max(2000, Math.round(parsedWeight * 35)));

      await setProfile({
        userId: profile?.userId ?? `user-${Date.now()}`,
        displayName: displayName.trim(),
        dateOfBirth: estimatedDob,
        gender: gender ?? 'prefer_not_to_say',
        heightCm: parsedHeight,
        currentWeightKg: parsedWeight,
        fitnessLevel,
        activityLevel: activityLevel ?? 'moderate',
        primaryGoal,
        trainingEnvironment: trainingEnv,
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
        subtitle={step === 1 ? 'Step 1 of 2: Physiological Baseline' : 'Step 2 of 2: Goals & Energy Target'}
      />

      {step === 1 ? (
        <SurfaceCard elevated>
          <Text style={styles.sectionHeading}>Your Biometrics</Text>
          <Text style={styles.sectionSub}>
            All fields are stored locally on your device. Never transmitted without your consent.
          </Text>

          {/* Display Name */}
          <Text style={styles.inputLabel}>Display Name *</Text>
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

          {/* Age, Height, Weight Row */}
          <View style={styles.threeCol}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Age (Yrs) *</Text>
              <TextInput
                style={[styles.textInput, errors.age ? styles.inputError : null]}
                value={ageYears}
                onChangeText={(t) => {
                  setAgeYears(t);
                  if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
                }}
                keyboardType="numeric"
                placeholder="e.g. 25"
                placeholderTextColor={theme.colors.textMuted}
                maxLength={3}
              />
              {errors.age ? <Text style={styles.errorText}>{errors.age}</Text> : null}
            </View>

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
          <Text style={styles.inputLabel}>Gender (for Metabolic Formula) *</Text>
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

          {/* Activity Level */}
          <Text style={styles.inputLabel}>Activity Level *</Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'sedentary', label: 'Sedentary (Desk Job)' },
                { key: 'light', label: 'Light (1-2 days/wk)' },
                { key: 'moderate', label: 'Moderate (3-5 days/wk)' },
                { key: 'very_active', label: 'Very Active (6-7 days/wk)' },
                { key: 'extreme', label: 'Extreme (Athlete/Physical Work)' },
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

          {/* Fitness Experience Level */}
          <Text style={styles.inputLabel}>Experience Level</Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'beginner', label: 'Beginner (<1 yr)' },
                { key: 'intermediate', label: 'Intermediate (1-3 yrs)' },
                { key: 'advanced', label: 'Advanced (3+ yrs)' },
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

          <Button
            title="Next: Set Goals & Calorie Targets"
            onPress={handleNext}
            style={styles.nextBtn}
          />
        </SurfaceCard>
      ) : (
        <SurfaceCard elevated>
          <Text style={styles.sectionHeading}>Fitness Goals & Training</Text>
          <Text style={styles.sectionSub}>
            Define your physiological targets to calibrate nutrition and progressive overload.
          </Text>

          {/* Primary Goal */}
          <Text style={styles.inputLabel}>Primary Objective *</Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'fat_loss', label: 'Fat Loss (-20% Deficit)' },
                { key: 'muscle_gain', label: 'Muscle Gain (+10% Surplus)' },
                { key: 'recomposition', label: 'Body Recomposition' },
                { key: 'maintenance', label: 'Maintenance' },
                { key: 'strength', label: 'Max Strength' },
              ] as { key: PrimaryGoal; label: string }[]
            ).map((goal) => (
              <TouchableOpacity
                key={goal.key}
                style={[styles.pill, primaryGoal === goal.key && styles.activePill]}
                onPress={() => setPrimaryGoal(goal.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, primaryGoal === goal.key && styles.activePillText]}>
                  {goal.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Training Environment */}
          <Text style={styles.inputLabel}>Training Environment *</Text>
          <View style={styles.pillRow}>
            {(
              [
                { key: 'gym', label: 'Commercial / Home Gym' },
                { key: 'home', label: 'Home (Bodyweight / Dumbbells)' },
                { key: 'calisthenics', label: 'Calisthenics / Park' },
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

          {/* Scientific Calculation Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewHeading}>Scientific Metabolic Calibration</Text>
            {areBiometricsValid && bmr && tdee && targetCalorieResult ? (
              <>
                <Text style={styles.previewRow}>
                  Basal Metabolic Rate (BMR): <Text style={styles.bold}>{bmr} kcal/day</Text>
                </Text>
                <Text style={styles.previewRow}>
                  Daily Energy Expenditure (TDEE): <Text style={styles.bold}>{tdee} kcal/day</Text>
                </Text>
                <Text style={[styles.previewRow, { color: theme.colors.primary }]}>
                  Recommended Daily Intake: <Text style={styles.bold}>{targetCalorieResult.targetCalories} kcal/day</Text> ({targetCalorieResult.adjustmentPercentage}%)
                </Text>
                {targetCalorieResult.safetyWarning ? (
                  <Text style={styles.warningText}>⚠️ {targetCalorieResult.safetyWarning}</Text>
                ) : null}
              </>
            ) : (
              <Text style={styles.incompleteText}>
                Complete all biometrics in Step 1 to calculate physiological calorie targets.
              </Text>
            )}
          </View>

          <View style={styles.twoBtnRow}>
            <Button
              title="Back"
              variant="outline"
              onPress={() => setStep(1)}
              style={styles.backBtn}
              disabled={isSaving}
            />
            <Button
              title="Save & Launch OS"
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
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    marginTop: theme.spacing.sm,
    textTransform: 'uppercase',
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
  threeCol: {
    flexDirection: 'row',
    gap: 8,
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
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
  },
  previewRow: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginVertical: 2,
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
