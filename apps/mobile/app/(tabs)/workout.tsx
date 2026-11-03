import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Header } from '../../src/components/ui/Header';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { Button } from '../../src/components/ui/Button';
import { useWorkoutStore } from '../../src/store/workoutStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { estimate1RmBrzycki } from '../../src/domain';

export default function WorkoutScreen() {
  const { profile } = useAuthStore();
  const {
    exercises,
    activeSession,
    activeSets,
    recentSessions,
    loadExercises,
    loadRecentSessions,
    startWorkout,
    addSetToActive,
    finishWorkout,
    cancelWorkout,
  } = useWorkoutStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('all');
  const [workoutTitle, setWorkoutTitle] = useState('Push Day (Chest / Shoulders / Triceps)');

  // Set Logging State
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('barbell-bench-press');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [inputWeight, setInputWeight] = useState('60');
  const [inputReps, setInputReps] = useState('8');
  const [inputRpe, setInputRpe] = useState('8');

  const userId = profile?.userId ?? 'local_user';

  useEffect(() => {
    loadExercises(searchQuery, selectedMuscle);
    loadRecentSessions();
  }, [searchQuery, selectedMuscle]);

  const handleStartWorkout = async () => {
    await startWorkout(workoutTitle, userId);
  };

  const handleLogSet = async () => {
    const weight = parseFloat(inputWeight) || 0;
    const reps = parseInt(inputReps, 10) || 1;
    const rpe = parseFloat(inputRpe) || undefined;

    await addSetToActive(selectedExerciseId, weight, reps, rpe);
  };

  const selectedExercise = exercises.find((e) => e.id === selectedExerciseId);
  const current1Rm =
    parseFloat(inputWeight) > 0 && parseInt(inputReps, 10) > 0
      ? estimate1RmBrzycki(parseFloat(inputWeight), parseInt(inputReps, 10))
      : null;

  return (
    <ScreenContainer>
      <Header
        title="Workout Engine"
        subtitle={activeSession ? 'Active Session in Progress' : 'Plan & Record Your Training'}
      />

      {/* ACTIVE WORKOUT MODE */}
      {activeSession ? (
        <View>
          <SurfaceCard elevated>
            <View style={styles.sessionHeader}>
              <Text style={styles.activeTitle}>{activeSession.title}</Text>
              <Text style={styles.timeTag}>
                Started {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>

            {/* Exercise Selector */}
            <Text style={styles.inputLabel}>Current Exercise (Tap to Change):</Text>
            <TouchableOpacity
              style={styles.pickerBox}
              onPress={() => setShowExercisePicker(!showExercisePicker)}
            >
              <Text style={styles.pickerText}>{selectedExercise?.name ?? selectedExerciseId}</Text>
              <Text style={styles.pickerSub}>{selectedExercise?.equipmentRequired} • {showExercisePicker ? '▲ Close' : '▼ Change'}</Text>
            </TouchableOpacity>

            {showExercisePicker && (
              <View style={styles.exercisePickerDropdown}>
                <TextInput
                  style={styles.searchBarSmall}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Filter exercises..."
                  placeholderTextColor={theme.colors.textMuted}
                />
                {exercises.slice(0, 8).map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={[
                      styles.dropdownItem,
                      selectedExerciseId === ex.id && styles.selectedDropdownItem,
                    ]}
                    onPress={() => {
                      setSelectedExerciseId(ex.id);
                      setShowExercisePicker(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>{ex.name}</Text>
                    <Text style={styles.dropdownSub}>{ex.primaryMuscleGroup} • {ex.equipmentRequired}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Quick Set Inputs */}
            <View style={styles.inputsRow}>
              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={inputWeight}
                  onChangeText={setInputWeight}
                  keyboardType="numeric"
                  placeholder="kg"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>Reps</Text>
                <TextInput
                  style={styles.textInput}
                  value={inputReps}
                  onChangeText={setInputReps}
                  keyboardType="numeric"
                  placeholder="Reps"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              <View style={styles.inputCol}>
                <Text style={styles.inputLabel}>RPE (1-10)</Text>
                <TextInput
                  style={styles.textInput}
                  value={inputRpe}
                  onChangeText={setInputRpe}
                  keyboardType="numeric"
                  placeholder="8.0"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Live 1RM Estimate Feedback */}
            {current1Rm ? (
              <View style={styles.estimateBox}>
                <Text style={styles.estimateText}>
                  Est. 1RM: <Text style={styles.highlight}>{current1Rm.estimated1RmKg} kg</Text> ({current1Rm.accuracy})
                </Text>
              </View>
            ) : null}

            <Button title="Log Completed Set" onPress={handleLogSet} style={styles.logBtn} />

            {/* Logged Sets Table */}
            {activeSets.length > 0 ? (
              <View style={styles.setsList}>
                <Text style={styles.sectionHeading}>Sets Completed ({activeSets.length})</Text>
                {activeSets.map((s, idx) => (
                  <View key={s.id} style={styles.setRow}>
                    <Text style={styles.setNumber}>#{idx + 1}</Text>
                    <Text style={styles.setDetail}>
                      {s.weightKg} kg × {s.reps} reps
                    </Text>
                    {s.rpe ? <Text style={styles.setRpe}>RPE {s.rpe}</Text> : null}
                    <Text style={styles.volumeText}>Vol: {s.weightKg * s.reps} kg</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actionButtonsRow}>
              <Button
                title="Finish & Save Workout"
                onPress={finishWorkout}
                style={styles.finishBtn}
              />
              <Button
                title="Cancel"
                variant="outline"
                onPress={cancelWorkout}
                style={styles.cancelBtn}
              />
            </View>
          </SurfaceCard>
        </View>
      ) : (
        /* WORKOUT PLANNING & START MODE */
        <View>
          <SurfaceCard elevated>
            <Text style={styles.sectionHeading}>Start Scheduled Session</Text>
            <Text style={styles.inputLabel}>Workout Routine Title</Text>
            <TextInput
              style={styles.textInputFull}
              value={workoutTitle}
              onChangeText={setWorkoutTitle}
              placeholder="e.g. Upper Body Strength A"
              placeholderTextColor={theme.colors.textMuted}
            />
            <Button
              title="Begin Workout Session"
              onPress={handleStartWorkout}
              style={styles.startBtn}
            />
          </SurfaceCard>

          {/* Exercise Library Directory */}
          <SurfaceCard>
            <Text style={styles.sectionHeading}>Exercise Library</Text>
            <TextInput
              style={styles.searchBar}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search 40+ exercises..."
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Muscle Filter Chips */}
            <View style={styles.filterRow}>
              {['all', 'chest', 'back', 'quadriceps', 'shoulders', 'biceps'].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.filterChip,
                    selectedMuscle === m && styles.activeFilterChip,
                  ]}
                  onPress={() => setSelectedMuscle(m)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedMuscle === m && styles.activeFilterText,
                    ]}
                  >
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.exerciseList}>
              {exercises.slice(0, 8).map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={[
                    styles.exerciseItem,
                    selectedExerciseId === ex.id && styles.selectedExerciseItem,
                  ]}
                  onPress={() => setSelectedExerciseId(ex.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    <Text style={styles.exSub}>
                      {ex.category} • {ex.primaryMuscleGroup}
                    </Text>
                  </View>
                  <Text style={styles.diffBadge}>{ex.difficulty}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </SurfaceCard>

          {/* Past History */}
          {recentSessions.length > 0 ? (
            <SurfaceCard>
              <Text style={styles.sectionHeading}>Recent Workout History</Text>
              {recentSessions.slice(0, 3).map((ses) => (
                <View key={ses.id} style={styles.historyRow}>
                  <View>
                    <Text style={styles.histTitle}>{ses.title}</Text>
                    <Text style={styles.histDate}>
                      {new Date(ses.startedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.histSets}>{ses.sets?.length ?? 0} sets</Text>
                </View>
              ))}
            </SurfaceCard>
          ) : null}
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  activeTitle: {
    ...theme.typography.h2,
    color: theme.colors.primary,
  },
  timeTag: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  pickerBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  pickerText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  pickerSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  inputCol: {
    flex: 1,
  },
  textInput: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    fontSize: 16,
    textAlign: 'center',
  },
  textInputFull: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    fontSize: 14,
    marginBottom: theme.spacing.md,
  },
  estimateBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
  },
  estimateText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  highlight: {
    color: theme.colors.warning,
    fontWeight: '700',
  },
  logBtn: {
    marginBottom: theme.spacing.md,
  },
  setsList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionHeading: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  setNumber: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    width: 32,
  },
  setDetail: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  setRpe: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.sm,
  },
  volumeText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  finishBtn: {
    flex: 2,
  },
  cancelBtn: {
    flex: 1,
  },
  startBtn: {
    marginTop: theme.spacing.xs,
  },
  searchBar: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    fontSize: 14,
    marginBottom: theme.spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeFilterChip: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  activeFilterText: {
    color: theme.colors.textInverse,
  },
  exerciseList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedExerciseItem: {
    borderColor: theme.colors.primary,
  },
  exName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  exSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  diffBadge: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  exercisePickerDropdown: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.md,
    gap: 6,
  },
  searchBarSmall: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    color: theme.colors.textPrimary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    ...theme.typography.caption,
    marginBottom: 4,
  },
  dropdownItem: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
  },
  selectedDropdownItem: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  dropdownText: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    fontSize: 13,
  },
  dropdownSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  histTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  histDate: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  histSets: {
    ...theme.typography.body,
    color: theme.colors.primary,
  },
});
