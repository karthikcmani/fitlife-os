import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Header } from '../../src/components/ui/Header';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore, getStoredAccessToken } from '../../src/store/authStore';
import { useCoachStore } from '../../src/store/coachStore';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { TrainingEnvironment, EquipmentItem, UserProfile } from '../../src/types';
import { SyncManager } from '../../src/services/syncManager';
import { localNotificationManager, LocalNotificationSchedule } from '../../src/services/localNotifications';
import { theme, useTheme, useThemeStore, ThemeAppearance, ThemeColor } from '../../src/theme';
import { healthConnectService } from '../../src/services/healthConnect';
import {
  calculateBmrMifflinStJeor,
  calculateTdee,
  calculateAgeFromDob,
  generatePersonalCoachingPlan,
} from '../../src/domain';

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const themeStore = useThemeStore();
  const { profile, setProfile, isAuthenticated, backendUrl, logout, setBackendUrl } = useAuthStore();
  const { saveAndActivatePlan } = useCoachStore();
  const { activeSession } = useWorkoutStore();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(backendUrl);

  // Health Connect status
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [isSyncingHC, setIsSyncingHC] = useState(false);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName ?? '');
  const [editWeight, setEditWeight] = useState(profile ? String(profile.currentWeightKg) : '');
  const [editHeight, setEditHeight] = useState(profile ? String(profile.heightCm) : '');
  const [editWater, setEditWater] = useState(profile ? String(profile.dailyWaterTargetMl) : '3000');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // In-Place Environment & Equipment State
  const [isEditingEnv, setIsEditingEnv] = useState(false);
  const [selectedEnv, setSelectedEnv] = useState<TrainingEnvironment>(profile?.trainingEnvironment ?? 'home');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem[]>(profile?.equipmentInventory ?? ['none']);
  const [selectedUnavailable, setSelectedUnavailable] = useState<EquipmentItem[]>(profile?.unavailableEquipment ?? []);
  const [isSavingEnv, setIsSavingEnv] = useState(false);

  // Notification schedules
  const [schedules, setSchedules] = useState<LocalNotificationSchedule[]>([]);

  useEffect(() => {
    SyncManager.getPendingCount().then(setPendingSyncCount);
    setSchedules([...localNotificationManager.getSchedules()]);
    healthConnectService.getStatus().then(setHealthStatus);
  }, []);

  const handleExperienceModeChange = async (mode: 'beginner' | 'advanced') => {
    if (!profile) return;
    const updated = { ...profile, experienceMode: mode };
    await setProfile(updated);
  };

  const handleImportHealthConnect = async () => {
    if (!profile) return;
    setIsSyncingHC(true);
    try {
      await healthConnectService.requestPermissions();
      const sleepRes = await healthConnectService.importSleepRecords(profile.userId);
      const actRes = await healthConnectService.importActivityRecords(profile.userId);
      Alert.alert(
        'Health Connect Synced',
        `Imported: ${actRes.importedCount} activity record(s), ${sleepRes.importedCount} sleep log(s).\nSkipped duplicates: ${actRes.skippedDuplicates + sleepRes.skippedDuplicates}.`
      );
      const st = await healthConnectService.getStatus();
      setHealthStatus(st);
    } catch (err: any) {
      Alert.alert('Import Failed', err?.message || 'Unable to import from Health Connect.');
    } finally {
      setIsSyncingHC(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName);
      setEditWeight(String(profile.currentWeightKg));
      setEditHeight(String(profile.heightCm));
      setEditWater(String(profile.dailyWaterTargetMl));
      setSelectedEnv(profile.trainingEnvironment ?? 'home');
      setSelectedEquipment(profile.equipmentInventory ?? ['none']);
      setSelectedUnavailable(profile.unavailableEquipment ?? []);
    }
  }, [profile]);

  const handleToggleSchedule = (id: string, currentValue: boolean) => {
    localNotificationManager.toggleSchedule(id, !currentValue);
    setSchedules([...localNotificationManager.getSchedules()]);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    const w = parseFloat(editWeight);
    const h = parseFloat(editHeight);
    const water = parseInt(editWater, 10);

    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }
    if (isNaN(w) || w < 25 || w > 350) {
      Alert.alert('Invalid Weight', 'Weight must be between 25 kg and 350 kg.');
      return;
    }
    if (isNaN(h) || h < 80 || h > 260) {
      Alert.alert('Invalid Height', 'Height must be between 80 cm and 260 cm.');
      return;
    }
    if (isNaN(water) || water < 500 || water > 10000) {
      Alert.alert('Invalid Water Target', 'Daily water target must be between 500 ml and 10,000 ml.');
      return;
    }

    setIsSavingProfile(true);
    try {
      await setProfile({
        ...profile,
        displayName: editName.trim(),
        currentWeightKg: w,
        heightCm: h,
        dailyWaterTargetMl: water,
        updatedAt: new Date().toISOString(),
      });
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Personal information saved locally.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleEquipment = (item: EquipmentItem) => {
    if (item === 'none') {
      setSelectedEquipment(['none']);
      return;
    }
    const filtered = selectedEquipment.filter((x) => x !== 'none');
    if (filtered.includes(item)) {
      const next = filtered.filter((x) => x !== item);
      setSelectedEquipment(next.length === 0 ? ['none'] : next);
    } else {
      setSelectedEquipment([...filtered, item]);
    }
  };

  const handleToggleUnavailableMachine = (machine: EquipmentItem) => {
    if (selectedUnavailable.includes(machine)) {
      setSelectedUnavailable(selectedUnavailable.filter((x) => x !== machine));
    } else {
      setSelectedUnavailable([...selectedUnavailable, machine]);
    }
  };

  const handleSaveEnvironmentAndEquipment = async () => {
    if (!profile) return;
    setIsSavingEnv(true);
    try {
      if (activeSession) {
        Alert.alert(
          'Workout In Progress',
          'You have an active workout in progress. It is safely preserved. Your newly generated plan will apply to your next session.'
        );
      }

      const updatedProfile: UserProfile = {
        ...profile,
        trainingEnvironment: selectedEnv,
        equipmentInventory:
          selectedEnv === 'gym'
            ? ['barbell', 'bench', 'dumbbells', 'cable_machine']
            : selectedEquipment,
        unavailableEquipment: selectedEnv === 'gym' ? selectedUnavailable : [],
        updatedAt: new Date().toISOString(),
      };

      await setProfile(updatedProfile);
      const newPlan = generatePersonalCoachingPlan(updatedProfile);
      await saveAndActivatePlan(newPlan);

      setIsEditingEnv(false);
      Alert.alert(
        'Plan Regenerated! 🎯',
        `Your personal workouts have been updated for ${selectedEnv.toUpperCase()} training.`
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to update environment and regenerate plan.');
    } finally {
      setIsSavingEnv(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    const token = await getStoredAccessToken();
    if (!token) {
      Alert.alert(
        'Account Connection Required',
        'Please connect or register your self-hosted cloud account before synchronizing data.'
      );
      setIsSyncing(false);
      return;
    }

    const result = await SyncManager.pushPendingMutations(backendUrl, token);
    const updatedCount = await SyncManager.getPendingCount();
    setPendingSyncCount(updatedCount);
    setIsSyncing(false);

    if (result.success) {
      Alert.alert('Sync Complete', `Synchronized ${result.committedCount} records.`);
    } else {
      Alert.alert('Offline Mode Active', `Records staged locally (${updatedCount} pending). Will sync automatically on connection.`);
    }
  };

  const userAge = profile?.dateOfBirth ? calculateAgeFromDob(profile.dateOfBirth) : 25;

  const bmr = profile
    ? calculateBmrMifflinStJeor({
        weightKg: profile.currentWeightKg,
        heightCm: profile.heightCm,
        ageYears: userAge,
        gender: profile.gender === 'female' ? 'female' : 'male',
      })
    : 1700;

  const tdee = profile ? calculateTdee(bmr, profile.activityLevel) : 2400;

  return (
    <ScreenContainer>
      <Header
        title="Profile & Settings"
        subtitle="Physiological Baseline • Privacy • Sync"
      />

      {/* 1. Physiological Profile */}
      <SurfaceCard elevated>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionHeading}>Physiological Calibration</Text>
          <TouchableOpacity
            style={styles.editToggleBtn}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.editToggleText}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View style={styles.editForm}>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.twoCol}>
              <View style={styles.col}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editWeight}
                  onChangeText={setEditWeight}
                  keyboardType="numeric"
                  placeholder="kg"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.col}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editHeight}
                  onChangeText={setEditHeight}
                  keyboardType="numeric"
                  placeholder="cm"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Daily Water Target (ml)</Text>
            <TextInput
              style={styles.textInput}
              value={editWater}
              onChangeText={setEditWater}
              keyboardType="numeric"
              placeholder="3000"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Button
              title="Save Profile Changes"
              onPress={handleSaveProfile}
              loading={isSavingProfile}
              style={{ marginTop: theme.spacing.md }}
            />
          </View>
        ) : (
          <>
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>Current Weight</Text>
                <Text style={styles.metaValue}>{profile?.currentWeightKg ?? '--'} kg</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>Height</Text>
                <Text style={styles.metaValue}>{profile?.heightCm ?? '--'} cm</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>Resting Energy (BMR)</Text>
                <Text style={[styles.metaValue, { color: theme.colors.primary }]}>{bmr} kcal</Text>
                <Text style={styles.metaHint}>Burned just staying alive</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>Daily Burn (TDEE)</Text>
                <Text style={[styles.metaValue, { color: theme.colors.secondary }]}>{tdee} kcal</Text>
                <Text style={styles.metaHint}>Total burned with activity</Text>
              </View>
            </View>

            {/* Goal, Environment & Equipment Card */}
            <View style={styles.goalBox}>
              <Text style={styles.metaLabel}>Active Fitness Goal</Text>
              <Text style={styles.goalText}>
                {(profile?.primaryGoal ?? 'maintenance').toUpperCase().replace(/_/g, ' ')}
              </Text>

              <View style={styles.envEquipmentRow}>
                <Text style={styles.envText}>
                  📍 Location: {(profile?.trainingEnvironment ?? 'home').toUpperCase()}
                </Text>
                <Text style={styles.envText}>
                  🛠 Equipment:{' '}
                  {profile?.trainingEnvironment === 'gym'
                    ? 'Full Commercial Gym'
                    : profile?.equipmentInventory?.includes('none')
                    ? 'None (Strict Bodyweight)'
                    : profile?.equipmentInventory?.join(', ') || 'Bodyweight'}
                </Text>
                {Boolean(profile?.unavailableEquipment?.length) && profile?.trainingEnvironment === 'gym' && (
                  <Text style={[styles.envText, { color: theme.colors.warning }]}>
                    ⚠️ Excluded Machines: {profile?.unavailableEquipment?.join(', ')}
                  </Text>
                )}
                <Text style={styles.envText}>
                  🥗 Diet:{' '}
                  {profile?.dietaryPreference
                    ? profile.dietaryPreference.replace(/_/g, ' ').toUpperCase()
                    : 'STANDARD'}
                </Text>
              </View>
            </View>

            {isEditingEnv ? (
              <View style={styles.envEditorCard}>
                <Text style={styles.envEditorHeading}>Select Training Environment</Text>
                <View style={styles.envGrid}>
                  {[
                    { id: 'home', label: 'Home 🏠', desc: 'Living room & home workout' },
                    { id: 'gym', label: 'Commercial Gym 🏋️', desc: 'Machines, cables & barbells' },
                    { id: 'outdoor', label: 'Outdoor 🌳', desc: 'Brisk walking, jogging & park' },
                    { id: 'calisthenics', label: 'Calisthenics 🤸', desc: 'Bars, pull-ups & bodyweight' },
                  ].map((env) => (
                    <TouchableOpacity
                      key={env.id}
                      style={[
                        styles.envSelectBtn,
                        selectedEnv === env.id && styles.envSelectBtnActive,
                      ]}
                      onPress={() => setSelectedEnv(env.id as TrainingEnvironment)}
                    >
                      <Text
                        style={[
                          styles.envSelectText,
                          selectedEnv === env.id && styles.envSelectTextActive,
                        ]}
                      >
                        {env.label}
                      </Text>
                      <Text style={styles.envSelectDesc}>{env.desc}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Equipment for Home */}
                {selectedEnv === 'home' && (
                  <View style={styles.equipSection}>
                    <Text style={styles.equipSectionTitle}>Available Home Equipment:</Text>
                    <View style={styles.chipWrap}>
                      {[
                        { id: 'none', label: 'None (Bodyweight only)' },
                        { id: 'dumbbells', label: 'Dumbbells' },
                        { id: 'resistance_bands', label: 'Resistance Bands' },
                        { id: 'kettlebell', label: 'Kettlebell' },
                        { id: 'pull_up_bar', label: 'Pull-Up Bar' },
                        { id: 'bench', label: 'Workout Bench' },
                        { id: 'barbell', label: 'Barbell' },
                      ].map((eq) => {
                        const isSelected = selectedEquipment.includes(eq.id as EquipmentItem);
                        return (
                          <TouchableOpacity
                            key={eq.id}
                            style={[styles.equipChip, isSelected && styles.equipChipActive]}
                            onPress={() => handleToggleEquipment(eq.id as EquipmentItem)}
                          >
                            <Text
                              style={[styles.equipChipText, isSelected && styles.equipChipTextActive]}
                            >
                              {isSelected ? '✓ ' : '+ '}
                              {eq.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Gym Unavailable Machines */}
                {selectedEnv === 'gym' && (
                  <View style={styles.equipSection}>
                    <Text style={styles.equipSectionTitle}>
                      Commercial Gym Setup (Full machines included).
                    </Text>
                    <Text style={styles.equipSectionSubtitle}>
                      Tap any machine below that is unavailable or broken at your gym to exclude it from your plan:
                    </Text>
                    <View style={styles.chipWrap}>
                      {[
                        { id: 'leg_press_machine', label: 'Leg Press' },
                        { id: 'lat_pulldown_machine', label: 'Lat Pulldown' },
                        { id: 'chest_press_machine', label: 'Chest Press Machine' },
                        { id: 'cable_machine', label: 'Cable Machine' },
                        { id: 'seated_row_machine', label: 'Seated Cable Row' },
                        { id: 'leg_curl_machine', label: 'Leg Curl Machine' },
                        { id: 'shoulder_press_machine', label: 'Shoulder Press Machine' },
                      ].map((m) => {
                        const isUnavailable = selectedUnavailable.includes(m.id as EquipmentItem);
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[styles.equipChip, isUnavailable && styles.equipChipWarning]}
                            onPress={() => handleToggleUnavailableMachine(m.id as EquipmentItem)}
                          >
                            <Text
                              style={[
                                styles.equipChipText,
                                isUnavailable && styles.equipChipTextWarning,
                              ]}
                            >
                              {isUnavailable ? '✕ Unavailable' : '✓ Available'}: {m.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Outdoor Info */}
                {selectedEnv === 'outdoor' && (
                  <View style={styles.envInfoBox}>
                    <Text style={styles.envInfoText}>
                      🌳 Outdoor plan focuses on power walking, jogging, park benches, and open-air mobility. Zero gym equipment needed!
                    </Text>
                  </View>
                )}

                {/* Calisthenics Info */}
                {selectedEnv === 'calisthenics' && (
                  <View style={styles.envInfoBox}>
                    <Text style={styles.envInfoText}>
                      🤸 Calisthenics plan emphasizes bar pull-ups, active hangs, dips, and advanced bodyweight levers.
                    </Text>
                  </View>
                )}

                <View style={styles.envEditorActionRow}>
                  <Button
                    title="Save & Regenerate Plan 🔄"
                    onPress={handleSaveEnvironmentAndEquipment}
                    loading={isSavingEnv}
                    style={{ flex: 2 }}
                  />
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setIsEditingEnv(false)}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            ) : (
              <View style={{ marginTop: theme.spacing.sm }}>
                <Button
                  title="Change Training Environment & Equipment 🏋️"
                  variant="primary"
                  onPress={() => setIsEditingEnv(true)}
                  style={{ marginBottom: theme.spacing.xs }}
                />
                <Button
                  title="Recalibrate All Metrics (Wizard) ⚙️"
                  variant="secondary"
                  onPress={() => router.push('/onboarding')}
                  style={styles.recalBtn}
                />
              </View>
            )}
          </>
        )}
      </SurfaceCard>

      {/* Experience Coaching Level */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Coaching Experience Mode</Text>
        <Text style={styles.bodyText}>
          Choose how the coaching plan presents exercises, weights, and effort cues.
        </Text>

        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[
              styles.modeCard,
              (profile?.experienceMode ?? 'beginner') === 'beginner' && {
                borderColor: colors.primary,
                backgroundColor: isDark ? 'rgba(0, 230, 153, 0.12)' : 'rgba(0, 204, 136, 0.12)',
              },
            ]}
            onPress={() => handleExperienceModeChange('beginner')}
          >
            <Text style={styles.modeTitle}>🌱 Beginner Mode</Text>
            <Text style={styles.modeDesc}>
              Clear form cues, plain language, simple set tracking. No confusing jargon.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              profile?.experienceMode === 'advanced' && {
                borderColor: colors.primary,
                backgroundColor: isDark ? 'rgba(0, 230, 153, 0.12)' : 'rgba(0, 204, 136, 0.12)',
              },
            ]}
            onPress={() => handleExperienceModeChange('advanced')}
          >
            <Text style={styles.modeTitle}>⚡ Advanced Mode</Text>
            <Text style={styles.modeDesc}>
              RPE effort rating (1-10), tonnage volume load in kg, estimated 1RM, and progressive overload.
            </Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      {/* Appearance & Themes */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Appearance & Theme</Text>
        <Text style={styles.bodyText}>
          Select light or dark mode and your favorite accent theme. Pure contrast and zero distraction.
        </Text>

        <Text style={styles.themeSubLabel}>Appearance Mode</Text>
        <View style={styles.themeRow}>
          {(['dark', 'light', 'system'] as ThemeAppearance[]).map((appMode) => (
            <TouchableOpacity
              key={appMode}
              style={[
                styles.themeBtn,
                themeStore.appearance === appMode && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => themeStore.setAppearance(appMode)}
            >
              <Text
                style={[
                  styles.themeBtnText,
                  themeStore.appearance === appMode && { color: colors.textInverse },
                ]}
              >
                {appMode === 'dark' ? '🌙 Dark' : appMode === 'light' ? '☀️ Light' : '⚙️ System'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.themeSubLabel, { marginTop: 12 }]}>Color Palette</Text>
        <View style={styles.themeRow}>
          {(
            [
              { id: 'emerald', label: 'Emerald 🟢' },
              { id: 'ocean', label: 'Ocean 🔵' },
              { id: 'violet', label: 'Violet 🟣' },
              { id: 'neutral', label: 'Neutral ⚪' },
            ] as { id: ThemeColor; label: string }[]
          ).map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.paletteChip,
                themeStore.themeColor === c.id && {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => themeStore.setThemeColor(c.id)}
            >
              <Text
                style={[
                  styles.paletteChipText,
                  themeStore.themeColor === c.id && { color: colors.textInverse },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SurfaceCard>

      {/* Smart Motion Tools & Health Connect */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Smart Motion & Health Connect</Text>
        <Text style={styles.bodyText}>
          100% FLOSS, local-first sensors. Automatic push-up repetition counter and Health Connect sync with deduplication.
        </Text>

        <Button
          title="Open Automated Push-Up Tracker 📷"
          variant="outline"
          onPress={() => router.push('/pushup-tracker')}
          style={{ marginBottom: 12 }}
        />

        <View style={styles.healthConnectBox}>
          <Text style={styles.healthConnectTitle}>Android Health Connect</Text>
          <Text style={styles.healthConnectSub}>
            Status: {healthStatus?.isConnected ? '🟢 Connected' : '⚪ Ready to Connect'}
          </Text>
          {healthStatus?.lastSyncTimestamp && (
            <Text style={styles.healthConnectSub}>
              Last synced: {new Date(healthStatus.lastSyncTimestamp).toLocaleString()}
            </Text>
          )}

          <Button
            title={isSyncingHC ? 'Syncing...' : 'Import Steps & Sleep Data'}
            variant="secondary"
            loading={isSyncingHC}
            onPress={handleImportHealthConnect}
            style={{ marginTop: 8 }}
          />
        </View>
      </SurfaceCard>

      {/* 2. Local Notifications & Reminders (100% FLOSS, 0 Firebase) */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Local Notification Reminders</Text>
        <Text style={styles.bodyText}>
          Offline alarm notifications scheduled locally on your device via Android Jetpack. Zero Google Play Services or Firebase tracking.
        </Text>

        <View style={styles.schedulesList}>
          {schedules.map((s) => (
            <View key={s.id} style={styles.scheduleItem}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.scheduleTitle}>{s.title}</Text>
                <Text style={styles.scheduleSub}>Daily at {s.triggerTime} • {s.body}</Text>
              </View>
              <Switch
                value={s.isEnabled}
                onValueChange={() => handleToggleSchedule(s.id, s.isEnabled)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.textPrimary}
              />
            </View>
          ))}
        </View>
      </SurfaceCard>

      {/* 3. Encrypted Body Transformation Vault */}
      <SurfaceCard>
        <View style={styles.vaultHeader}>
          <Text style={styles.sectionHeading}>Transformation Photo Vault</Text>
          <Text style={styles.vaultLock}>🔒 Zero-Knowledge</Text>
        </View>
        <Text style={styles.bodyText}>
          Your transformation photos are encrypted using hardware-backed AES-256-GCM. All EXIF metadata (GPS, device serials) is stripped in memory. Photos are excluded from ordinary cloud and ADB backups.
        </Text>
        <Button
          title="Open Transformation Vault"
          variant="secondary"
          onPress={() => router.push('/photo-vault')}
          style={styles.unlockBtn}
        />
      </SurfaceCard>

      {/* 4. Synchronization & Self-Hosting */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Synchronization & Self-Hosting</Text>
        <Text style={styles.bodyText}>
          Pending Local Sync Queue: <Text style={styles.pendingHighlight}>{pendingSyncCount} mutations</Text>
        </Text>

        <Text style={styles.inputLabel}>Backend Server URL (Self-Hosted)</Text>
        <TextInput
          style={styles.textInput}
          value={serverUrlInput}
          onChangeText={setServerUrlInput}
          onBlur={() => setBackendUrl(serverUrlInput)}
          placeholder="https://fitlife.yourdomain.com"
          placeholderTextColor={theme.colors.textMuted}
        />

        <Button
          title={isSyncing ? 'Syncing...' : 'Synchronize Now'}
          onPress={handleSyncNow}
          loading={isSyncing}
          style={styles.syncBtn}
        />

        {!isAuthenticated ? (
          <Button
            title="Connect / Register Cloud Account"
            variant="outline"
            onPress={() => router.push('/auth')}
            style={styles.authBtn}
          />
        ) : (
          <Button
            title="Log Out Session"
            variant="danger"
            onPress={logout}
            style={styles.authBtn}
          />
        )}

        <Button
          title="Open Community & Challenges"
          variant="secondary"
          onPress={() => router.push('/community')}
          style={{ marginTop: theme.spacing.sm }}
        />
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionHeading: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  editToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editToggleText: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  editForm: {
    marginTop: 4,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing.md,
  },
  gridItem: {
    flex: 1,
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  metaLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metaHint: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  metaValue: {
    ...theme.typography.h2,
    color: theme.colors.textPrimary,
  },
  goalBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  goalText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  envEquipmentRow: {
    marginTop: 6,
    gap: 3,
  },
  envText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recalBtn: {
    marginTop: theme.spacing.xs,
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  vaultLock: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  bodyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  unlockBtn: {
    marginTop: theme.spacing.xs,
  },
  schedulesList: {
    marginTop: 4,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  scheduleTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  scheduleSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  pendingHighlight: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: theme.spacing.md,
    minHeight: 48,
  },
  syncBtn: {
    marginBottom: theme.spacing.sm,
  },
  authBtn: {
    marginBottom: theme.spacing.sm,
  },
  envEditorCard: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  envEditorHeading: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  envGrid: {
    gap: 8,
    marginBottom: theme.spacing.md,
  },
  envSelectBtn: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  envSelectBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
  },
  envSelectText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
  envSelectTextActive: {
    color: theme.colors.primary,
  },
  envSelectDesc: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  equipSection: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  equipSectionTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  equipSectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 8,
    lineHeight: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  equipChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  equipChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  equipChipWarning: {
    backgroundColor: 'rgba(255, 75, 75, 0.15)',
    borderColor: theme.colors.danger,
  },
  equipChipText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  equipChipTextActive: {
    color: theme.colors.textInverse,
  },
  equipChipTextWarning: {
    color: theme.colors.danger,
  },
  envInfoBox: {
    backgroundColor: 'rgba(0, 230, 153, 0.08)',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
  },
  envInfoText: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  envEditorActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: theme.spacing.xs,
  },
  modeToggleRow: {
    flexDirection: 'column',
    gap: 10,
    marginTop: theme.spacing.sm,
  },
  modeCard: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  modeTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  modeDesc: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  themeSubLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  themeBtn: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  themeBtnText: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
  },
  paletteChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  paletteChipText: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
    fontSize: 12,
  },
  healthConnectBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  healthConnectTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  healthConnectSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
});
