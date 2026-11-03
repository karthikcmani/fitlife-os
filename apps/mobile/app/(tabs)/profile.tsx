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
import { SyncManager } from '../../src/services/syncManager';
import { localNotificationManager, LocalNotificationSchedule } from '../../src/services/localNotifications';
import { theme } from '../../src/theme';
import { calculateBmrMifflinStJeor, calculateTdee } from '../../src/domain';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, setProfile, isAuthenticated, backendUrl, logout, setBackendUrl } = useAuthStore();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(backendUrl);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile?.displayName ?? '');
  const [editWeight, setEditWeight] = useState(profile ? String(profile.currentWeightKg) : '');
  const [editHeight, setEditHeight] = useState(profile ? String(profile.heightCm) : '');
  const [editWater, setEditWater] = useState(profile ? String(profile.dailyWaterTargetMl) : '3000');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Notification schedules
  const [schedules, setSchedules] = useState<LocalNotificationSchedule[]>([]);

  useEffect(() => {
    SyncManager.getPendingCount().then(setPendingSyncCount);
    setSchedules([...localNotificationManager.getSchedules()]);
  }, []);

  useEffect(() => {
    if (profile) {
      setEditName(profile.displayName);
      setEditWeight(String(profile.currentWeightKg));
      setEditHeight(String(profile.heightCm));
      setEditWater(String(profile.dailyWaterTargetMl));
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

  const userAge = profile?.dateOfBirth
    ? Math.max(13, new Date().getFullYear() - parseInt(profile.dateOfBirth.split('-')[0], 10))
    : 25;

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
                <Text style={styles.metaLabel}>Basal Metabolic Rate</Text>
                <Text style={[styles.metaValue, { color: theme.colors.primary }]}>{bmr} kcal</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.metaLabel}>Calculated TDEE</Text>
                <Text style={[styles.metaValue, { color: theme.colors.secondary }]}>{tdee} kcal</Text>
              </View>
            </View>

            <View style={styles.goalBox}>
              <Text style={styles.metaLabel}>Primary Fitness Goal</Text>
              <Text style={styles.goalText}>{(profile?.primaryGoal ?? 'maintenance').toUpperCase().replace('_', ' ')}</Text>
              <Text style={styles.envText}>Environment: {(profile?.trainingEnvironment ?? 'gym').toUpperCase()}</Text>
            </View>

            <Button
              title="Recalibrate All Metrics (Wizard)"
              variant="secondary"
              onPress={() => router.push('/onboarding')}
              style={styles.recalBtn}
            />
          </>
        )}
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
});
