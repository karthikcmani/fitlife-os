import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../src/components/ui/ScreenContainer';
import { SurfaceCard } from '../src/components/ui/SurfaceCard';
import { Button } from '../src/components/ui/Button';
import { Header } from '../src/components/ui/Header';
import { theme } from '../src/theme';
import { getLocalDatabase } from '../src/db/sqlite';
import { cryptoShredVault, TransformationRecord } from '../src/services/photoVault';

export default function PhotoVaultScreen() {
  const router = useRouter();
  const [records, setRecords] = useState<TransformationRecord[]>([]);
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [hips, setHips] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TransformationRecord | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      const db = await getLocalDatabase();
      const rows = await db.getAllAsync<any>(
        'SELECT * FROM body_measurements ORDER BY measured_at DESC'
      );
      const mapped: TransformationRecord[] = rows.map((r) => ({
        id: r.id,
        date: r.measured_at.split('T')[0],
        weightKg: r.weight_kg,
        waistCm: r.waist_cm || undefined,
        chestCm: r.chest_cm || undefined,
        hipsCm: r.hips_cm || undefined,
        bicepsCm: r.biceps_cm || undefined,
        thighsCm: r.thighs_cm || undefined,
        bodyFatPct: r.body_fat_pct || undefined,
        photoEncryptedPath: r.encrypted_photo_uri || undefined,
        photoIv: r.photo_iv || undefined,
      }));
      setRecords(mapped);
      if (mapped.length > 0 && !selectedRecord) {
        setSelectedRecord(mapped[0]);
      }
    } catch (e) {
      console.error('Failed to load body measurements', e);
    }
  };

  const handleSaveMeasurement = async () => {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight in kg.');
      return;
    }

    try {
      const db = await getLocalDatabase();
      const id = `meas_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      const waistVal = parseFloat(waist) || null;
      const chestVal = parseFloat(chest) || null;
      const hipsVal = parseFloat(hips) || null;

      await db.runAsync(
        `INSERT INTO body_measurements (
          id, user_id, measured_at, weight_kg, waist_cm, chest_cm, hips_cm, client_created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, 'local_user', now, w, waistVal, chestVal, hipsVal, now]
      );

      setWeight('');
      setWaist('');
      setChest('');
      setHips('');
      setIsAdding(false);
      await loadRecords();
      Alert.alert('Saved', 'Body measurement logged successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save measurement.');
    }
  };

  const handleCryptoShred = () => {
    Alert.alert(
      'Permanent Crypto-Shredding',
      'This will destroy the Android Keystore encryption key. All encrypted transformation photos will become mathematically unrecoverable, even from device flash memory. Are you absolutely certain?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Shred Now',
          style: 'destructive',
          onPress: async () => {
            try {
              await cryptoShredVault();
              await loadRecords();
              Alert.alert('Vault Shredded', 'Hardware key destroyed and encrypted media purged.');
            } catch (e) {
              Alert.alert('Error', 'Failed to crypto-shred vault.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <Header
        title="Transformation Vault"
        subtitle="Zero-Knowledge AES-256-GCM Hardware Encrypted"
      />

      {/* Security Status Banner */}
      <SurfaceCard style={styles.securityBanner}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.vaultTitle}>Zero-Knowledge Encrypted</Text>
            <Text style={styles.vaultSubtitle}>
              Hardware Keystore backed • Exif data stripped
            </Text>
          </View>
          <TouchableOpacity
            style={styles.shredButton}
            onPress={handleCryptoShred}
            activeOpacity={0.8}
          >
            <Text style={styles.shredText}>Crypto-Shred</Text>
          </TouchableOpacity>
        </View>
      </SurfaceCard>

      {/* Measurement Quick Add */}
      {!isAdding ? (
        <Button
          title="+ Log Body Measurement"
          variant="outline"
          onPress={() => setIsAdding(true)}
          style={{ marginBottom: theme.spacing.md }}
        />
      ) : (
        <SurfaceCard style={{ marginBottom: theme.spacing.md }}>
          <Text style={styles.sectionTitle}>New Measurement</Text>
          <View style={styles.formGrid}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Weight (kg)*</Text>
              <TextInput
                style={styles.input}
                placeholder="75.0"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Waist (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="82.0"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={waist}
                onChangeText={setWaist}
              />
            </View>
          </View>

          <View style={styles.formGrid}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Chest (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="100.0"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={chest}
                onChangeText={setChest}
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Hips (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="96.0"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                value={hips}
                onChangeText={setHips}
              />
            </View>
          </View>

          <View style={styles.rowBetween}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => setIsAdding(false)}
              style={{ flex: 1, marginRight: theme.spacing.sm }}
            />
            <Button
              title="Save Record"
              variant="primary"
              onPress={handleSaveMeasurement}
              style={{ flex: 1, marginLeft: theme.spacing.sm }}
            />
          </View>
        </SurfaceCard>
      )}

      {/* Records History */}
      <Text style={styles.sectionHeader}>Transformation History</Text>
      {records.length === 0 ? (
        <SurfaceCard>
          <Text style={styles.emptyText}>No transformation records logged yet.</Text>
        </SurfaceCard>
      ) : (
        records.map((r) => (
          <SurfaceCard key={r.id} style={styles.recordCard}>
            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.recordDate}>{r.date}</Text>
                <Text style={styles.recordWeight}>{r.weightKg} kg</Text>
              </View>
              <View style={styles.metricsCol}>
                {r.waistCm && <Text style={styles.metricText}>Waist: {r.waistCm} cm</Text>}
                {r.chestCm && <Text style={styles.metricText}>Chest: {r.chestCm} cm</Text>}
                {r.hipsCm && <Text style={styles.metricText}>Hips: {r.hipsCm} cm</Text>}
              </View>
            </View>
          </SurfaceCard>
        ))
      )}

      <Button
        title="Back to Settings"
        variant="secondary"
        onPress={() => router.back()}
        style={{ marginTop: theme.spacing.lg }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  securityBanner: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
    marginBottom: theme.spacing.md,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vaultTitle: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  vaultSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  shredButton: {
    backgroundColor: '#450a0a',
    borderWidth: 1,
    borderColor: theme.colors.danger,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
  },
  shredText: {
    ...theme.typography.caption,
    color: theme.colors.danger,
    fontWeight: '700',
  },
  sectionHeader: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  formGrid: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 8,
    ...theme.typography.body,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  recordCard: {
    marginBottom: theme.spacing.sm,
  },
  recordDate: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  recordWeight: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  metricsCol: {
    alignItems: 'flex-end',
  },
  metricText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
});
