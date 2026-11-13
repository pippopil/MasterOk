export interface ApplianceItem {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  category:
    | 'washing_machine'
    | 'refrigerator'
    | 'microwave'
    | 'vacuum'
    | 'dishwasher'
    | 'coffee_machine'
    | 'furniture';
  imageUrl: string;
  symptoms: {
    id: string;
    title: string;
    severity: 'low' | 'medium' | 'high';
    masterCost: number;
    partsCost: number;
    timeMinutes: number;
    difficulty: 'Легко' | 'Средне' | 'Сложно';
    stepsCount: number;
  }[];
  popularity: number;
}

export interface Recipe {
  id: string;
  title: string;
  category: string;
  requiredIngredients: string[];
  optionalIngredients: string[];
  cookingTimeMinutes: number;
  difficulty: 'Легко' | 'Средне';
  calories: number;
  servings?: number;
  imageEmoji?: string;
  zeroWasteTip?: string;
  steps: string[];
}

export interface MonthlySavingsPoint {
  month: string;
  moneySaved: number;
  co2SavedKg: number;
  repairsCount: number;
}

export interface LocalMaster {
  id: string;
  name: string;
  specialty: string;
  category: 'washing_machine' | 'refrigerator' | 'microwave' | 'universal';
  rating: number;
  reviewsCount: number;
  completedOrders: number;
  responseMinutes: number;
  baseVisitRub: number;
  district: string;
  distanceKm: number;
  coordinates: { x: number; y: number }; // 0..100 percent on schematic city map
  availableNow: boolean;
}

export type AppRoute =
  | { page: 'home' }
  | { page: 'scan' }
  | { page: 'repair'; guideId: string }
  | { page: 'upcycle' }
  | { page: 'recipes' }
  | { page: 'masters' }
  | { page: 'profile' };

/**
 * Разбор URL-пути в структурированный маршрут приложения
 */
export function parseRoute(pathname: string): AppRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/' || clean === '/catalog') return { page: 'home' };
  if (clean === '/scan') return { page: 'scan' };
  if (clean.startsWith('/repair/')) {
    const id = decodeURIComponent(clean.slice('/repair/'.length)) || 'lg-wm-filter';
    return { page: 'repair', guideId: id };
  }
  if (clean === '/upcycle') return { page: 'upcycle' };
  if (clean === '/recipes') return { page: 'recipes' };
  if (clean === '/masters') return { page: 'masters' };
  if (clean === '/profile') return { page: 'profile' };
  return { page: 'home' };
}

/**
 * Сопоставление классов COCO-SSD (TensorFlow.js) с категориями МастерОК
 */
export function mapCocoClassToTarget(cocoClass: string): {
  labelRu: string;
  targetMode: 'appliance' | 'upcycling' | 'fridge';
  suggestedGuideId: string;
} {
  const cls = cocoClass.toLowerCase();
  if (cls === 'microwave' || cls === 'oven' || cls === 'toaster') {
    return {
      labelRu: cls === 'microwave' ? 'Микроволновая печь' : 'Кухонная техника',
      targetMode: 'appliance',
      suggestedGuideId: 'samsung-mw-fuse',
    };
  }
  if (cls === 'refrigerator') {
    return {
      labelRu: 'Холодильник',
      targetMode: 'fridge',
      suggestedGuideId: 'lg-wm-filter',
    };
  }
  if (cls === 'chair' || cls === 'couch' || cls === 'dining table' || cls === 'bed') {
    return {
      labelRu: cls === 'chair' ? 'Деревянный стул' : 'Предмет мебели',
      targetMode: 'upcycling',
      suggestedGuideId: 'chair-upcycling',
    };
  }
  return {
    labelRu: 'Бытовая техника',
    targetMode: 'appliance',
    suggestedGuideId: 'lg-wm-filter',
  };
}

/**
 * Расчет экономии пользователя:
 * - Деньги (стоимость работы мастера минус запчасти)
 * - Предотвращенные выбросы CO2 (кг)
 * - Вторичное использование материалов (кг)
 */
export function calculateSavings(
  masterCost: number,
  partsCost: number,
  category: string = 'appliance'
): {
  netSavingsRub: number;
  co2SavedKg: number;
  wastePreventedKg: number;
} {
  const netSavings = Math.max(0, masterCost - partsCost);

  let co2Factor = 45;
  let wasteWeight = 35;

  if (category === 'microwave') {
    co2Factor = 18;
    wasteWeight = 12;
  } else if (category === 'vacuum') {
    co2Factor = 14;
    wasteWeight = 6;
  } else if (category === 'furniture') {
    co2Factor = 28;
    wasteWeight = 15;
  } else if (category === 'coffee_machine') {
    co2Factor = 22;
    wasteWeight = 7;
  }

  return {
    netSavingsRub: netSavings,
    co2SavedKg: co2Factor,
    wastePreventedKg: wasteWeight,
  };
}

/**
 * Построение кумулятивного ряда накопленной экономии для графика Recharts
 */
export function buildCumulativeSavingsSeries(
  points: MonthlySavingsPoint[]
): (MonthlySavingsPoint & { cumulativeRub: number; cumulativeCo2Kg: number })[] {
  let runningRub = 0;
  let runningCo2 = 0;

  return points.map((pt) => {
    runningRub += pt.moneySaved;
    runningCo2 += pt.co2SavedKg;
    return {
      ...pt,
      cumulativeRub: runningRub,
      cumulativeCo2Kg: runningCo2,
    };
  });
}

/**
 * Подбор рецептов из того, что есть в холодильнике
 * Ранжирование по проценту совпадения имеющихся ингредиентов
 */
export function matchFridgeRecipes<T extends Recipe>(
  userIngredients: string[],
  recipes: T[]
): {
  recipe: T;
  matchScore: number;
  availableCount: number;
  missingIngredients: string[];
}[] {
  const normalizedUser = userIngredients.map((i) => i.trim().toLowerCase());

  return recipes
    .map((recipe) => {
      const required = recipe.requiredIngredients.map((i) => i.toLowerCase());
      const missing: string[] = [];
      let matchedCount = 0;

      for (const req of required) {
        const found = normalizedUser.some((u) => u.includes(req) || req.includes(u));
        if (found) {
          matchedCount++;
        } else {
          missing.push(req);
        }
      }

      const matchScore = required.length > 0 ? (matchedCount / required.length) * 100 : 0;

      return {
        recipe,
        matchScore: Math.round(matchScore),
        availableCount: matchedCount,
        missingIngredients: missing,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Поиск по каталогу техники и мебели
 */
export function searchCatalog<
  T extends { name: string; brand: string; model: string; category: string }
>(
  items: T[],
  query: string,
  categoryFilter: string = 'all',
  brandFilter: string = 'all'
): T[] {
  const q = query.trim().toLowerCase();

  return items.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesBrand =
      brandFilter === 'all' || item.brand.toLowerCase() === brandFilter.toLowerCase();

    if (!matchesCategory || !matchesBrand) return false;
    if (!q) return true;

    return (
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.model.toLowerCase().includes(q)
    );
  });
}

/**
 * Фильтрация локальных мастеров по специализации, минимальному рейтингу и доступности
 */
export function filterLocalMasters(
  masters: LocalMaster[],
  category: string = 'all',
  onlyAvailable: boolean = false,
  minRating: number = 0
): LocalMaster[] {
  return masters
    .filter((m) => {
      if (category !== 'all' && m.category !== category && m.category !== 'universal') {
        return false;
      }
      if (onlyAvailable && !m.availableNow) {
        return false;
      }
      if (m.rating < minRating) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.rating - a.rating || a.distanceKm - b.distanceKm);
}

/**
 * Расчет ценности апсайклинга мебели
 */
export function estimateUpcyclingValue(
  initialItemValue: number,
  materialsCost: number,
  technique: 'painting' | 'upholstery' | 'decoupage' | 'restoration'
): {
  estimatedFinishedValue: number;
  addedValue: number;
  roiPercentage: number;
} {
  const multipliers: Record<string, number> = {
    painting: 2.2,
    upholstery: 2.8,
    decoupage: 2.0,
    restoration: 3.5,
  };

  const multiplier = multipliers[technique] || 2.0;
  const finishedValue = Math.round(initialItemValue * multiplier + materialsCost * 1.5);
  const totalInvested = initialItemValue + materialsCost;
  const addedValue = Math.max(0, finishedValue - totalInvested);
  const roi = totalInvested > 0 ? Math.round((addedValue / totalInvested) * 100) : 100;

  return {
    estimatedFinishedValue: finishedValue,
    addedValue,
    roiPercentage: roi,
  };
}
