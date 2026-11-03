import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
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
} from '@fitlife/shared-types';
import {
  calculateBmrMifflinStJeor,
  calculateTdee,
  calculateTargetCalories,
} from '@fitlife/domain';

export default function OnboardingScreen() {
  const router = useRouter();
  const { setProfile } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [displayName, setDisplayName] = useState('Arun Kumar');
  const [heightCm, setHeightCm] = useState('175');
  const [weightKg, setWeightKg] = useState('75');
  const [gender, setGender] = useState<Gender>('male');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('beginner');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('recomposition');
  const [trainingEnv, setTrainingEnv] = useState<TrainingEnvironment>('gym');

  const parsedWeight = parseFloat(weightKg) || 70;
  const parsedHeight = parseFloat(heightCm) || 170;

  // Real-time calculation previews
  const bmr = calculateBmrMifflinStJeor({
    weightKg: parsedWeight,
    heightCm: parsedHeight,
    ageYears: 26,
    gender: gender === 'female' ? 'female' : 'male',
  });

  const tdee = calculateTdee(bmr, activityLevel);
  const targetCalorieResult = calculateTargetCalories({
    tdee,
    goal: primaryGoal,
    gender: gender === 'female' ? 'female' : 'male',
  });

  const handleFinish = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Please enter your display name.');
      return;
    }

    const now = new Date().toISOString();
    await setProfile({
      userId: `user-${Date.now()}`,
      displayName: displayName.trim(),
      gender,
      heightCm: parsedHeight,
      currentWeightKg: parsedWeight,
      fitnessLevel,
      activityLevel,
      primaryGoal,
      trainingEnvironment: trainingEnv,
      preferredUnitSystem: 'metric',
      dailyWaterTargetMl: 3000,
      createdAt: now,
      updatedAt: now,
    });

    router.replace('/(tabs)');
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

          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.textInput}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
                placeholder="175"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.textInput}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="numeric"
                placeholder="75"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Gender (for Metabolic Formula)</Text>
          <View style={styles.pillRow}>
            {(['male', 'female', 'prefer_not_to_say'] as Gender[]).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.pill, gender === g && styles.activePill]}
                onPress={() => setGender(g)}
              >
                <Text style={[styles.pillText, gender === g && styles.activePillText]}>
                  {g.toUpperCase().replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Activity Level</Text>
          <View style={styles.pillRow}>
            {(['sedentary', 'light', 'moderate', 'very_active'] as ActivityLevel[]).map((act) => (
              <TouchableOpacity
                key={act}
                style={[styles.pill, activityLevel === act && styles.activePill]}
                onPress={() => setActivityLevel(act)}
              >
                <Text style={[styles.pillText, activityLevel === act && styles.activePillText]}>
                  {act.toUpperCase().replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="Next: Set Goals & Calorie Targets"
            onPress={() => setStep(2)}
            style={styles.nextBtn}
          />
        </SurfaceCard>
      ) : (
        <SurfaceCard elevated>
          <Text style={styles.sectionHeading}>Fitness Goals & Training</Text>

          <Text style={styles.inputLabel}>Primary Objective</Text>
          <View style={styles.pillRow}>
            {(['fat_loss', 'muscle_gain', 'recomposition', 'maintenance'] as PrimaryGoal[]).map((goal) => (
              <TouchableOpacity
                key={goal}
                style={[styles.pill, primaryGoal === goal && styles.activePill]}
                onPress={() => setPrimaryGoal(goal)}
              >
                <Text style={[styles.pillText, primaryGoal === goal && styles.activePillText]}>
                  {goal.toUpperCase().replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Training Environment</Text>
          <View style={styles.pillRow}>
            {(['gym', 'home', 'calisthenics'] as TrainingEnvironment[]).map((env) => (
              <TouchableOpacity
                key={env}
                style={[styles.pill, trainingEnv === env && styles.activePill]}
                onPress={() => setTrainingEnv(env)}
              >
                <Text style={[styles.pillText, trainingEnv === env && styles.activePillText]}>
                  {env.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Scientific Calculation Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewHeading}>Scientifically Calculated Calibration</Text>
            <Text style={styles.previewRow}>
              Basal Metabolic Rate (BMR): <Text style={styles.bold}>{bmr} kcal/day</Text>
            </Text>
            <Text style={styles.previewRow}>
              Daily Energy Expenditure (TDEE): <Text style={styles.bold}>{tdee} kcal/day</Text>
            </Text>
            <Text style={[styles.previewRow, { color: theme.colors.primary }]}>
              Recommended Target: <Text style={styles.bold}>{targetCalorieResult.targetCalories} kcal/day</Text> ({targetCalorieResult.adjustmentPercentage}%)
            </Text>
            {targetCalorieResult.safetyWarning ? (
              <Text style={styles.warningText}>⚠️ {targetCalorieResult.safetyWarning}</Text>
            ) : null}
          </View>

          <View style={styles.twoBtnRow}>
            <Button
              title="Back"
              variant="outline"
              onPress={() => setStep(1)}
              style={{ flex: 1 }}
            />
            <Button
              title="Save & Launch OS"
              onPress={handleFinish}
              style={{ flex: 2 }}
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
    padding: theme.spacing.md,
    fontSize: 16,
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
    marginBottom: theme.spacing.xs,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activePill: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pillText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  activePillText: {
    color: theme.colors.textInverse,
  },
  nextBtn: {
    marginTop: theme.spacing.lg,
  },
  previewBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
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
  twoBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: theme.spacing.md,
  },
});
