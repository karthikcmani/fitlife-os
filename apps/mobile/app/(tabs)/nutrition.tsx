import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Header } from '../../src/components/ui/Header';
import { SurfaceCard } from '../../src/components/ui/SurfaceCard';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Button } from '../../src/components/ui/Button';
import { useNutritionStore } from '../../src/store/nutritionStore';
import { useAuthStore } from '../../src/store/authStore';
import { theme } from '../../src/theme';
import { Food, MealType } from '../../src/types';
import {
  calculateMacronutrients,
  calculateBmrMifflinStJeor,
  calculateTdee,
  calculateTargetCalories,
  parseAndValidateDob,
} from '../../src/domain';

export default function NutritionScreen() {
  const { profile } = useAuthStore();
  const {
    searchResults,
    todayMeals,
    dailyTotals,
    searchFoods,
    loadTodayNutrition,
    logMealItem,
  } = useNutritionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMealType, setSelectedMealType] = useState<MealType>('breakfast');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [servingQuantity, setServingQuantity] = useState('1.0');
  const [dateStr] = useState(new Date().toISOString().split('T')[0]!);
  const [showMacroInfo, setShowMacroInfo] = useState(false);

  const userId = profile?.userId ?? 'local_user';

  // Dynamic nutrition targets scientifically calculated from user profile
  const userWeight = profile?.currentWeightKg ?? 70;
  const userHeight = profile?.heightCm ?? 175;
  const userGoal = profile?.primaryGoal ?? 'general_fitness';
  const userActivity = profile?.activityLevel ?? 'moderate';
  const userGender = profile?.gender === 'female' ? 'female' : 'male';
  const parsedDob = profile?.dateOfBirth ? parseAndValidateDob(profile.dateOfBirth) : null;
  const userAge = parsedDob?.isValid && parsedDob.ageYears ? parsedDob.ageYears : 25;

  const bmr = calculateBmrMifflinStJeor({
    weightKg: userWeight,
    heightCm: userHeight,
    ageYears: userAge,
    gender: userGender,
  });
  const tdee = calculateTdee(bmr, userActivity);
  const targetCalResult = calculateTargetCalories({
    tdee,
    goal: userGoal,
    gender: userGender,
  });
  const targetCalories = targetCalResult.targetCalories;

  const targets = calculateMacronutrients({
    targetCalories,
    weightKg: userWeight,
    goal: userGoal,
  });

  const targetProtein = targets.proteinG;
  const targetCarbs = targets.carbsG;
  const targetFat = targets.fatG;
  const targetFiber = 28;

  useEffect(() => {
    loadTodayNutrition(userId, dateStr);
  }, [userId, dateStr]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchFoods(text);
  };

  const handleLogFood = async () => {
    if (!selectedFood) return;
    const qty = parseFloat(servingQuantity) || 1.0;

    await logMealItem({
      userId,
      mealType: selectedMealType,
      food: selectedFood,
      servings: qty,
      dateStr,
    });

    setSelectedFood(null);
    setSearchQuery('');
    setServingQuantity('1.0');
    searchFoods('');
  };

  // Indian quick-add shortcuts
  const handleQuickAdd = async (foodName: string) => {
    setSearchQuery(foodName);
    await searchFoods(foodName);
  };

  const caloriesRemaining = Math.max(0, targetCalories - dailyTotals.calories);
  const proteinGap = Math.max(0, targetProtein - dailyTotals.proteinG);

  return (
    <ScreenContainer>
      <Header
        title="Nutrition Guide"
        subtitle={`Daily Intake • ${dailyTotals.calories} of ${targetCalories} kcal`}
      />

      {/* 1. Friendly Daily Intake Summary */}
      <SurfaceCard elevated>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionHeading}>Daily Intake Overview</Text>
          <TouchableOpacity onPress={() => setShowMacroInfo(!showMacroInfo)}>
            <Text style={styles.infoLink}>{showMacroInfo ? 'Hide Guide' : 'What do these mean?'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.coachText}>
          {caloriesRemaining > 0
            ? `You have about ${caloriesRemaining} kcal left today to meet your daily target.`
            : `You've reached your daily calorie target (${dailyTotals.calories} kcal). Fuel up on water and rest!`}
        </Text>

        {proteinGap > 15 ? (
          <View style={styles.tipBox}>
            <Text style={styles.tipTitle}>💡 Coach Protein Tip:</Text>
            <Text style={styles.tipText}>
              You need {Math.round(proteinGap)}g more protein today. Add a cup of dal, boiled eggs, curd/yogurt, kadala curry, or paneer to your next meal.
            </Text>
          </View>
        ) : null}

        {showMacroInfo && (
          <View style={styles.macroExplainerBox}>
            <Text style={styles.explainerItem}>
              <Text style={{ fontWeight: '700', color: theme.colors.primary }}>Protein: </Text>
              Builds and repairs muscle tissue and keeps you feeling full for longer.
            </Text>
            <Text style={styles.explainerItem}>
              <Text style={{ fontWeight: '700', color: theme.colors.secondary }}>Carbohydrates: </Text>
              Your body and brain's primary daily energy source for workouts and daily tasks.
            </Text>
            <Text style={styles.explainerItem}>
              <Text style={{ fontWeight: '700', color: theme.colors.warning }}>Fats: </Text>
              Crucial for hormone production, vitamin absorption, and joint health.
            </Text>
            <Text style={styles.explainerItem}>
              <Text style={{ fontWeight: '700', color: theme.colors.accent }}>Fiber: </Text>
              Aids digestion, gut health, and stabilizes blood sugar.
            </Text>
          </View>
        )}

        <ProgressBar
          label="Protein"
          current={dailyTotals.proteinG}
          target={targetProtein}
          unit="g"
          color={theme.colors.primary}
          height={8}
        />
        <ProgressBar
          label="Carbohydrates"
          current={dailyTotals.carbsG}
          target={targetCarbs}
          unit="g"
          color={theme.colors.secondary}
          height={8}
        />
        <ProgressBar
          label="Dietary Fat"
          current={dailyTotals.fatG}
          target={targetFat}
          unit="g"
          color={theme.colors.warning}
          height={8}
        />
        <ProgressBar
          label="Fiber"
          current={dailyTotals.fiberG}
          target={targetFiber}
          unit="g"
          color={theme.colors.accent}
          height={8}
        />
      </SurfaceCard>

      {/* 2. Indian & Familiar Staples Quick-Add */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Familiar Everyday Foods</Text>
        <Text style={styles.subtext}>Tap any staple to search and log quickly:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
          {[
            'Puttu',
            'Appam',
            'Kadala Curry',
            'Fish Curry',
            'Dal',
            'Sambar',
            'Curd',
            'Paneer',
            'Rice',
            'Roti',
            'Egg',
            'Chicken Curry',
            'Avial',
            'Banana',
          ].map((item) => (
            <TouchableOpacity
              key={item}
              style={styles.quickChip}
              onPress={() => handleQuickAdd(item)}
            >
              <Text style={styles.quickChipText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SurfaceCard>

      {/* 3. Food Search & Household Portion Logging */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Log Food</Text>

        {/* Meal Type Selector */}
        <View style={styles.mealTypeRow}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.mealTypeBtn,
                selectedMealType === type && styles.activeMealTypeBtn,
              ]}
              onPress={() => setSelectedMealType(type)}
            >
              <Text
                style={[
                  styles.mealTypeText,
                  selectedMealType === type && styles.activeMealTypeText,
                ]}
              >
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.searchBar}
          value={searchQuery}
          onChangeText={handleSearch}
          placeholder="Search Indian & global food database..."
          placeholderTextColor={theme.colors.textMuted}
        />

        {/* Search Results Dropdown */}
        {searchResults.length > 0 ? (
          <View style={styles.resultsBox}>
            {searchResults.slice(0, 6).map((food) => (
              <TouchableOpacity
                key={food.id}
                style={[
                  styles.resultItem,
                  selectedFood?.id === food.id && styles.selectedResultItem,
                ]}
                onPress={() => setSelectedFood(food)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodPortion}>
                    Serving: {food.servingSizeG}g ({food.servingUnitName}) • {food.calories} kcal
                  </Text>
                </View>
                <Text style={styles.macroSnippet}>
                  {food.proteinG}P | {food.carbsG}C | {food.fatG}F
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Selected Food Confirmation & Household Portions */}
        {selectedFood ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Selected: {selectedFood.name}</Text>
            <Text style={styles.confirmSub}>
              Standard portion: 1 {selectedFood.servingUnitName} ({selectedFood.servingSizeG}g) = {selectedFood.calories} kcal, {selectedFood.proteinG}g protein
            </Text>

            {/* Quick Household Quantity Chips */}
            <Text style={styles.portionLabel}>Choose Portion Size:</Text>
            <View style={styles.portionChipsRow}>
              {[
                { label: 'Half (0.5)', value: '0.5' },
                { label: 'Standard (1.0)', value: '1.0' },
                { label: 'Generous (1.5)', value: '1.5' },
                { label: 'Double (2.0)', value: '2.0' },
              ].map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.portionChip,
                    servingQuantity === p.value && styles.activePortionChip,
                  ]}
                  onPress={() => setServingQuantity(p.value)}
                >
                  <Text
                    style={[
                      styles.portionChipText,
                      servingQuantity === p.value && styles.activePortionChipText,
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.quantityRow}>
              <Text style={styles.inputLabel}>
                Custom Quantity ({selectedFood.servingUnitName}s):
              </Text>
              <TextInput
                style={styles.quantityInput}
                value={servingQuantity}
                onChangeText={setServingQuantity}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.calculatedText}>
              Total: {(selectedFood.calories * (parseFloat(servingQuantity) || 1)).toFixed(0)} kcal •{' '}
              {(selectedFood.proteinG * (parseFloat(servingQuantity) || 1)).toFixed(1)}g Protein
            </Text>

            <Button
              title={`Add to ${selectedMealType.toUpperCase()}`}
              onPress={handleLogFood}
              style={styles.addBtn}
            />
          </View>
        ) : null}
      </SurfaceCard>

      {/* 4. Today's Logged Meals History */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Today's Logged Meals</Text>
        {todayMeals.length === 0 ? (
          <Text style={styles.emptyText}>No food logged yet today. Tap a staple above or search to start!</Text>
        ) : (
          todayMeals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <Text style={styles.mealHeading}>{meal.mealType.toUpperCase()}</Text>
              {meal.items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {it.foodName ?? 'Food Item'} ({it.servings} {it.servings === 1 ? 'serving' : 'servings'})
                  </Text>
                  <Text style={styles.itemCal}>{it.calculatedCalories} kcal</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </SurfaceCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  sectionHeading: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  infoLink: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  coachText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  subtext: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  tipBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  tipTitle: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    marginBottom: 2,
  },
  tipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  macroExplainerBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  explainerItem: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  quickRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.xs,
  },
  quickChipText: {
    ...theme.typography.captionBold,
    color: theme.colors.textPrimary,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeMealTypeBtn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mealTypeText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  activeMealTypeText: {
    color: theme.colors.background,
  },
  searchBar: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  resultsBox: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedResultItem: {
    backgroundColor: theme.colors.surface,
  },
  foodName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  foodPortion: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
  },
  macroSnippet: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
  },
  confirmBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  confirmTitle: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
  },
  confirmSub: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  portionLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  portionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: theme.spacing.sm,
  },
  portionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activePortionChip: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  portionChipText: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  activePortionChipText: {
    color: theme.colors.background,
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.xs,
  },
  inputLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  quantityInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.xs,
    width: 70,
    textAlign: 'center',
    color: theme.colors.textPrimary,
  },
  calculatedText: {
    ...theme.typography.bodyBold,
    color: theme.colors.primary,
    marginVertical: theme.spacing.sm,
    textAlign: 'center',
  },
  addBtn: {
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  mealCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  mealHeading: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
  },
  itemCal: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
});
