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

  const userId = profile?.userId ?? 'local_user';

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
    searchFoods('');
  };

  // Indian quick-add shortcuts
  const handleQuickAdd = async (foodName: string) => {
    await searchFoods(foodName);
  };

  return (
    <ScreenContainer>
      <Header
        title="Nutrition Engine"
        subtitle={`Daily Intake • ${dailyTotals.calories} kcal`}
      />

      {/* 1. Daily Macronutrient Summary Card */}
      <SurfaceCard elevated>
        <Text style={styles.sectionHeading}>Daily Macro Balance</Text>
        <ProgressBar
          label="Protein"
          current={dailyTotals.proteinG}
          target={150}
          unit="g"
          color={theme.colors.primary}
          height={8}
        />
        <ProgressBar
          label="Carbohydrates"
          current={dailyTotals.carbsG}
          target={220}
          unit="g"
          color={theme.colors.secondary}
          height={8}
        />
        <ProgressBar
          label="Dietary Fat"
          current={dailyTotals.fatG}
          target={55}
          unit="g"
          color={theme.colors.warning}
          height={8}
        />
        <ProgressBar
          label="Fiber"
          current={dailyTotals.fiberG}
          target={28}
          unit="g"
          color={theme.colors.accent}
          height={8}
        />
      </SurfaceCard>

      {/* 2. Indian Food Quick-Add Shortcuts */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Indian Regional Staples (Quick Search)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow}>
          {['Idli', 'Dosa', 'Sambar', 'Roti', 'Curd', 'Paneer', 'Rice', 'Dal', 'Egg'].map((item) => (
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

      {/* 3. Food Search & Logging Interface */}
      <SurfaceCard>
        <Text style={styles.sectionHeading}>Log Meal Item</Text>

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

        {/* Selected Food Confirmation */}
        {selectedFood ? (
          <View style={styles.confirmBox}>
            <Text style={styles.confirmTitle}>Selected: {selectedFood.name}</Text>
            <View style={styles.quantityRow}>
              <Text style={styles.inputLabel}>
                Quantity ({selectedFood.servingUnitName}s):
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
          <Text style={styles.emptyText}>No food logged yet today.</Text>
        ) : (
          todayMeals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <Text style={styles.mealHeading}>{meal.mealType.toUpperCase()}</Text>
              {meal.items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {it.foodName ?? 'Food Item'} ({it.servings} serving)
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
  sectionHeading: {
    ...theme.typography.h3,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xs,
  },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  quickChipText: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  mealTypeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  mealTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeMealTypeBtn: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  mealTypeText: {
    ...theme.typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  activeMealTypeText: {
    color: theme.colors.textInverse,
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
  resultsBox: {
    gap: 6,
    marginBottom: theme.spacing.md,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectedResultItem: {
    borderColor: theme.colors.primary,
  },
  foodName: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
  },
  foodPortion: {
    ...theme.typography.caption,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  macroSnippet: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  confirmBox: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginTop: theme.spacing.xs,
  },
  confirmTitle: {
    ...theme.typography.bodyBold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  inputLabel: {
    ...theme.typography.captionBold,
    color: theme.colors.textSecondary,
  },
  quantityInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    width: 80,
    textAlign: 'center',
    fontSize: 16,
  },
  calculatedText: {
    ...theme.typography.captionBold,
    color: theme.colors.warning,
    marginBottom: theme.spacing.md,
  },
  addBtn: {
    marginTop: theme.spacing.xs,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textMuted,
  },
  mealCard: {
    backgroundColor: theme.colors.surfaceElevated,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mealHeading: {
    ...theme.typography.captionBold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemName: {
    ...theme.typography.body,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  itemCal: {
    ...theme.typography.bodyBold,
    color: theme.colors.textSecondary,
  },
});
