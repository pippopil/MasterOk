import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSavings,
  matchFridgeRecipes,
  searchCatalog,
  estimateUpcyclingValue,
  parseRoute,
  mapCocoClassToTarget,
  buildCumulativeSavingsSeries,
  filterLocalMasters,
  computeCenterCropRect,
  applyBrightnessContrast,
  isLowConfidence,
  Recipe,
  ApplianceItem,
  LocalMaster,
} from './engine';

test('calculateSavings computes net savings and CO2 accurately', () => {
  const result = calculateSavings(3500, 800, 'washing_machine');
  assert.equal(result.netSavingsRub, 2700);
  assert.equal(result.co2SavedKg, 45);
  assert.equal(result.wastePreventedKg, 35);

  const microwaveResult = calculateSavings(2000, 450, 'microwave');
  assert.equal(microwaveResult.netSavingsRub, 1550);
  assert.equal(microwaveResult.co2SavedKg, 18);
});

test('parseRoute resolves all updated spec routes correctly', () => {
  assert.deepEqual(parseRoute('/'), { page: 'home' });
  assert.deepEqual(parseRoute('/scan'), { page: 'scan' });
  assert.deepEqual(parseRoute('/repair/lg-wm-filter'), {
    page: 'repair',
    guideId: 'lg-wm-filter',
  });
  assert.deepEqual(parseRoute('/upcycle'), { page: 'upcycle' });
  assert.deepEqual(parseRoute('/recipes'), { page: 'recipes' });
  assert.deepEqual(parseRoute('/masters'), { page: 'masters' });
  assert.deepEqual(parseRoute('/profile'), { page: 'profile' });
});

test('mapCocoClassToTarget maps COCO-SSD detections cleanly', () => {
  const mw = mapCocoClassToTarget('microwave');
  assert.equal(mw.targetMode, 'appliance');
  assert.equal(mw.suggestedGuideId, 'samsung-mw-fuse');

  const chair = mapCocoClassToTarget('chair');
  assert.equal(chair.targetMode, 'upcycling');
  assert.equal(chair.suggestedGuideId, 'chair-upcycling');

  const fridge = mapCocoClassToTarget('refrigerator');
  assert.equal(fridge.targetMode, 'fridge');
  assert.equal(fridge.suggestedGuideId, null);

  const laptop = mapCocoClassToTarget('laptop');
  assert.equal(laptop.labelRu, 'Ноутбук');
  assert.equal(laptop.suggestedGuideId, null);

  const unknown = mapCocoClassToTarget('kettle');
  assert.equal(unknown.suggestedGuideId, null);
  assert.ok(!unknown.labelRu.includes('Стиральная'));
});

test('buildCumulativeSavingsSeries computes running totals for Recharts', () => {
  const series = buildCumulativeSavingsSeries([
    { month: 'Авг', moneySaved: 2500, co2SavedKg: 18, repairsCount: 1 },
    { month: 'Сен', moneySaved: 3200, co2SavedKg: 45, repairsCount: 1 },
  ]);
  assert.equal(series[0].cumulativeRub, 2500);
  assert.equal(series[1].cumulativeRub, 5700);
  assert.equal(series[1].cumulativeCo2Kg, 63);
});

test('filterLocalMasters filters by specialization, availability, and rating', () => {
  const masters: LocalMaster[] = [
    {
      id: 'm1',
      name: 'Алексей Смирнов',
      specialty: 'Стиральные машины',
      category: 'washing_machine',
      rating: 4.9,
      reviewsCount: 120,
      completedOrders: 340,
      responseMinutes: 12,
      baseVisitRub: 700,
      district: 'Центральный',
      distanceKm: 1.4,
      coordinates: { x: 45, y: 50 },
      availableNow: true,
    },
    {
      id: 'm2',
      name: 'Игорь Волков',
      specialty: 'Холодильники',
      category: 'refrigerator',
      rating: 4.5,
      reviewsCount: 40,
      completedOrders: 95,
      responseMinutes: 25,
      baseVisitRub: 900,
      district: 'Северный',
      distanceKm: 4.2,
      coordinates: { x: 20, y: 25 },
      availableNow: false,
    },
  ];

  const available = filterLocalMasters(masters, 'all', true, 4.7);
  assert.equal(available.length, 1);
  assert.equal(available[0].id, 'm1');
});

test('matchFridgeRecipes ranks recipes by matching ingredients', () => {
  const recipes: Recipe[] = [
    {
      id: 'omlet',
      title: 'Сырный омлет с томатами',
      category: 'Завтрак',
      requiredIngredients: ['яйца', 'сыр', 'помидоры'],
      optionalIngredients: ['зелень'],
      cookingTimeMinutes: 12,
      difficulty: 'Легко',
      calories: 320,
      steps: ['Взбить яйца', 'Натереть сыр', 'Пожарить'],
    },
    {
      id: 'soup',
      title: 'Куриный суп с лапшой',
      category: 'Обед',
      requiredIngredients: ['курица', 'морковь', 'лапша', 'лук'],
      optionalIngredients: ['зелень'],
      cookingTimeMinutes: 35,
      difficulty: 'Средне',
      calories: 280,
      steps: ['Сварить бульон', 'Добавить овощи'],
    },
  ];

  const userFridge = ['яйца куриные', 'сыр гауда', 'помидоры черри'];
  const matched = matchFridgeRecipes(userFridge, recipes);

  assert.equal(matched[0].recipe.id, 'omlet');
  assert.equal(matched[0].matchScore, 100);
  assert.equal(matched[0].missingIngredients.length, 0);

  assert.equal(matched[1].recipe.id, 'soup');
  assert.equal(matched[1].matchScore, 0);
  assert.equal(matched[1].missingIngredients.length, 4);
});

test('searchCatalog filters by query, category, and brand', () => {
  const catalog: ApplianceItem[] = [
    {
      id: 'lg-wm-1',
      name: 'Стиральная машина LG F1296ND3',
      brand: 'LG',
      model: 'F1296ND3',
      year: 2021,
      category: 'washing_machine',
      imageUrl: '',
      symptoms: [],
      popularity: 95,
    },
    {
      id: 'bosch-wm-1',
      name: 'Стиральная машина Bosch Serie 4',
      brand: 'Bosch',
      model: 'WAN28200',
      year: 2022,
      category: 'washing_machine',
      imageUrl: '',
      symptoms: [],
      popularity: 90,
    },
    {
      id: 'samsung-mw-1',
      name: 'Микроволновка Samsung Solo',
      brand: 'Samsung',
      model: 'MS23K3513AS',
      year: 2020,
      category: 'microwave',
      imageUrl: '',
      symptoms: [],
      popularity: 88,
    },
  ];

  const lgResults = searchCatalog(catalog, 'lg');
  assert.equal(lgResults.length, 1);
  assert.equal(lgResults[0].id, 'lg-wm-1');

  const mwResults = searchCatalog(catalog, '', 'microwave');
  assert.equal(mwResults.length, 1);
  assert.equal(mwResults[0].category, 'microwave');
});

test('estimateUpcyclingValue calculates ROI and added value', () => {
  const result = estimateUpcyclingValue(1000, 600, 'upholstery');
  assert.equal(result.estimatedFinishedValue, 3700);
  assert.equal(result.addedValue, 2100);
  assert.ok(result.roiPercentage > 100);
});

test('computeCenterCropRect crops center and preserves aspect ratio within maxEdge', () => {
  const rect = computeCenterCropRect(2000, 1000, 0.78, 1024);
  assert.equal(rect.sw, 1560);
  assert.equal(rect.sh, 780);
  assert.equal(rect.sx, 220);
  assert.equal(rect.sy, 110);
  assert.equal(rect.targetW, 1024);
  assert.equal(rect.targetH, 512);

  const full = computeCenterCropRect(800, 600, 1.0, 1024);
  assert.equal(full.sx, 0);
  assert.equal(full.sy, 0);
  assert.equal(full.targetW, 800);
  assert.equal(full.targetH, 600);
});

test('applyBrightnessContrast adjusts pixel luminance and contrast cleanly', () => {
  const pixels = new Uint8ClampedArray([100, 150, 200, 255]);
  applyBrightnessContrast(pixels, 110, 120);
  assert.equal(pixels[3], 255); // alpha preserved
  assert.ok(pixels[0] > 100 && pixels[0] <= 255);
  assert.ok(pixels[2] > 200 && pixels[2] <= 255);
});

test('isLowConfidence flags scores strictly below 75%', () => {
  assert.equal(isLowConfidence(0.74), true);
  assert.equal(isLowConfidence(0.5), true);
  assert.equal(isLowConfidence(0.75), false);
  assert.equal(isLowConfidence(0.94), false);
});

