import { SQLiteDatabase } from 'expo-sqlite';

export async function seedFoods(db: SQLiteDatabase): Promise<void> {
  const foods = [
    // South Indian staples
    {
      id: 'food-idli',
      name: 'Idli (Steamed Rice & Urad Dal Cake)',
      brand: 'Home / Traditional',
      region: 'indian_south',
      serving_size_g: 50, // 1 medium idli
      serving_unit_name: 'piece',
      calories: 68,
      protein_g: 2.1,
      carbs_g: 14.2,
      fat_g: 0.3,
      fiber_g: 0.8,
      data_source: 'COMMUNITY_RECIPE',
    },
    {
      id: 'food-plain-dosa',
      name: 'Plain Dosa (Fermented Crepe)',
      brand: 'Home / Traditional',
      region: 'indian_south',
      serving_size_g: 80, // 1 medium dosa
      serving_unit_name: 'piece',
      calories: 145,
      protein_g: 3.2,
      carbs_g: 22.4,
      fat_g: 4.8,
      fiber_g: 1.2,
      data_source: 'COMMUNITY_RECIPE',
    },
    {
      id: 'food-sambar',
      name: 'South Indian Sambar (Toor Dal & Vegetables)',
      brand: 'Home / Traditional',
      region: 'indian_south',
      serving_size_g: 150, // 1 small katori (150 ml)
      serving_unit_name: 'katori',
      calories: 110,
      protein_g: 4.5,
      carbs_g: 16.8,
      fat_g: 2.8,
      fiber_g: 3.5,
      data_source: 'COMMUNITY_RECIPE',
    },
    {
      id: 'food-curd-dahi',
      name: 'Curd / Dahi (Plain Whole Milk Yogurt)',
      brand: 'Home / Dairy',
      region: 'indian_south',
      serving_size_g: 150, // 1 katori
      serving_unit_name: 'katori',
      calories: 98,
      protein_g: 5.2,
      carbs_g: 6.8,
      fat_g: 5.5,
      fiber_g: 0,
      data_source: 'OFF_VERIFIED',
    },

    // North & All-India staples
    {
      id: 'food-roti-phulka',
      name: 'Roti / Phulka (Whole Wheat, No Ghee)',
      brand: 'Home / Traditional',
      region: 'indian_north',
      serving_size_g: 35, // 1 medium roti (cooked)
      serving_unit_name: 'roti',
      calories: 88,
      protein_g: 3.1,
      carbs_g: 18.2,
      fat_g: 0.5,
      fiber_g: 2.6,
      data_source: 'COMMUNITY_RECIPE',
    },
    {
      id: 'food-cooked-white-rice',
      name: 'Cooked White Rice (Basmati / Sona Masoori)',
      brand: 'General',
      region: 'global',
      serving_size_g: 150, // 1 medium katori
      serving_unit_name: 'katori',
      calories: 195,
      protein_g: 4.0,
      carbs_g: 43.0,
      fat_g: 0.5,
      fiber_g: 0.8,
      data_source: 'USDA_CC0',
    },
    {
      id: 'food-yellow-dal-tadka',
      name: 'Yellow Dal Tadka (Toor / Moong Dal)',
      brand: 'Home / Traditional',
      region: 'indian_north',
      serving_size_g: 150, // 1 katori
      serving_unit_name: 'katori',
      calories: 140,
      protein_g: 7.2,
      carbs_g: 18.5,
      fat_g: 4.2,
      fiber_g: 4.0,
      data_source: 'COMMUNITY_RECIPE',
    },
    {
      id: 'food-paneer-raw',
      name: 'Raw Paneer (Indian Cottage Cheese)',
      brand: 'Dairy Fresh',
      region: 'indian_north',
      serving_size_g: 100,
      serving_unit_name: 'g',
      calories: 275,
      protein_g: 18.5,
      carbs_g: 3.2,
      fat_g: 21.0,
      fiber_g: 0,
      data_source: 'OFF_VERIFIED',
    },
    {
      id: 'food-soya-chunks',
      name: 'Soya Chunks (Defatted Soy Flour, Dry)',
      brand: 'Nutrela / Generic',
      region: 'global',
      serving_size_g: 50, // 1 standard dry serving
      serving_unit_name: 'g',
      calories: 172,
      protein_g: 26.0,
      carbs_g: 16.5,
      fat_g: 0.5,
      fiber_g: 6.5,
      data_source: 'OFF_VERIFIED',
    },

    // High Protein / Core Staples
    {
      id: 'food-egg-boiled',
      name: 'Whole Boiled Egg (Large)',
      brand: 'Fresh Farm',
      region: 'global',
      serving_size_g: 50, // 1 egg
      serving_unit_name: 'piece',
      calories: 78,
      protein_g: 6.3,
      carbs_g: 0.6,
      fat_g: 5.3,
      fiber_g: 0,
      data_source: 'USDA_CC0',
    },
    {
      id: 'food-egg-white',
      name: 'Boiled Egg White (Large)',
      brand: 'Fresh Farm',
      region: 'global',
      serving_size_g: 33, // 1 white
      serving_unit_name: 'piece',
      calories: 17,
      protein_g: 3.6,
      carbs_g: 0.2,
      fat_g: 0.1,
      fiber_g: 0,
      data_source: 'USDA_CC0',
    },
    {
      id: 'food-chicken-breast-raw',
      name: 'Boneless Skinless Chicken Breast (Raw)',
      brand: 'Fresh Butcher',
      region: 'global',
      serving_size_g: 100,
      serving_unit_name: 'g',
      calories: 120,
      protein_g: 26.0,
      carbs_g: 0,
      fat_g: 1.8,
      fiber_g: 0,
      data_source: 'USDA_CC0',
    },
    {
      id: 'food-rolled-oats',
      name: 'Rolled Oats (Dry)',
      brand: 'Quaker / Generic',
      region: 'global',
      serving_size_g: 40, // 1 serving
      serving_unit_name: 'g',
      calories: 152,
      protein_g: 5.2,
      carbs_g: 27.0,
      fat_g: 2.8,
      fiber_g: 4.0,
      data_source: 'USDA_CC0',
    },
    {
      id: 'food-cow-milk',
      name: 'Whole Cow Milk',
      brand: 'Dairy Fresh',
      region: 'global',
      serving_size_g: 200, // 1 standard glass / cup
      serving_unit_name: 'cup',
      calories: 124,
      protein_g: 6.4,
      carbs_g: 9.6,
      fat_g: 6.8,
      fiber_g: 0,
      data_source: 'OFF_VERIFIED',
    },
    {
      id: 'food-almonds',
      name: 'Raw Almonds (Badam)',
      brand: 'Natural',
      region: 'global',
      serving_size_g: 28, // ~20-22 nuts
      serving_unit_name: 'g',
      calories: 164,
      protein_g: 6.0,
      carbs_g: 6.1,
      fat_g: 14.2,
      fiber_g: 3.5,
      data_source: 'USDA_CC0',
    },
  ];

  for (const f of foods) {
    await db.runAsync(
      `INSERT OR IGNORE INTO foods
      (id, name, brand, region, serving_size_g, serving_unit_name, calories, protein_g, carbs_g, fat_g, fiber_g, data_source, is_verified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);`,
      [
        f.id,
        f.name,
        f.brand,
        f.region,
        f.serving_size_g,
        f.serving_unit_name,
        f.calories,
        f.protein_g,
        f.carbs_g,
        f.fat_g,
        f.fiber_g,
        f.data_source,
        new Date().toISOString(),
      ]
    );
  }
}
