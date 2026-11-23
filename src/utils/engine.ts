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

const COCO_TRANSLATIONS: Record<
  string,
  {
    labelRu: string;
    targetMode: 'appliance' | 'upcycling' | 'fridge';
    suggestedGuideId: string | null;
  }
> = {
  microwave: {
    labelRu: 'Микроволновая печь',
    targetMode: 'appliance',
    suggestedGuideId: 'samsung-mw-fuse',
  },
  oven: { labelRu: 'Духовой шкаф / плита', targetMode: 'appliance', suggestedGuideId: null },
  toaster: { labelRu: 'Тостер', targetMode: 'appliance', suggestedGuideId: null },
  refrigerator: { labelRu: 'Холодильник', targetMode: 'fridge', suggestedGuideId: null },
  sink: { labelRu: 'Раковина / сантехника', targetMode: 'appliance', suggestedGuideId: null },
  tv: { labelRu: 'Телевизор / монитор', targetMode: 'appliance', suggestedGuideId: null },
  laptop: { labelRu: 'Ноутбук', targetMode: 'appliance', suggestedGuideId: null },
  mouse: { labelRu: 'Компьютерная мышь', targetMode: 'appliance', suggestedGuideId: null },
  keyboard: { labelRu: 'Клавиатура', targetMode: 'appliance', suggestedGuideId: null },
  remote: { labelRu: 'Пульт дистанционного управления', targetMode: 'appliance', suggestedGuideId: null },
  'cell phone': { labelRu: 'Смартфон', targetMode: 'appliance', suggestedGuideId: null },
  'hair drier': { labelRu: 'Фен', targetMode: 'appliance', suggestedGuideId: null },
  clock: { labelRu: 'Часы', targetMode: 'upcycling', suggestedGuideId: null },
  chair: { labelRu: 'Деревянный / офисный стул', targetMode: 'upcycling', suggestedGuideId: 'chair-upcycling' },
  couch: { labelRu: 'Диван / кресло', targetMode: 'upcycling', suggestedGuideId: null },
  'dining table': { labelRu: 'Стол', targetMode: 'upcycling', suggestedGuideId: null },
  bed: { labelRu: 'Кровать / каркас мебели', targetMode: 'upcycling', suggestedGuideId: null },
  bench: { labelRu: 'Скамья / табурет', targetMode: 'upcycling', suggestedGuideId: 'chair-upcycling' },
  'potted plant': { labelRu: 'Комнатное растение', targetMode: 'upcycling', suggestedGuideId: null },
  vase: { labelRu: 'Ваза', targetMode: 'upcycling', suggestedGuideId: null },
  book: { labelRu: 'Книга', targetMode: 'upcycling', suggestedGuideId: null },
  bottle: { labelRu: 'Бутылка / напиток', targetMode: 'fridge', suggestedGuideId: null },
  'wine glass': { labelRu: 'Бокал', targetMode: 'fridge', suggestedGuideId: null },
  cup: { labelRu: 'Чашка / кружка', targetMode: 'fridge', suggestedGuideId: null },
  bowl: { labelRu: 'Миска / тарелка', targetMode: 'fridge', suggestedGuideId: null },
  banana: { labelRu: 'Банан', targetMode: 'fridge', suggestedGuideId: null },
  apple: { labelRu: 'Яблоко', targetMode: 'fridge', suggestedGuideId: null },
  sandwich: { labelRu: 'Сэндвич', targetMode: 'fridge', suggestedGuideId: null },
  orange: { labelRu: 'Апельсин', targetMode: 'fridge', suggestedGuideId: null },
  broccoli: { labelRu: 'Брокколи', targetMode: 'fridge', suggestedGuideId: null },
  carrot: { labelRu: 'Морковь', targetMode: 'fridge', suggestedGuideId: null },
  pizza: { labelRu: 'Пицца', targetMode: 'fridge', suggestedGuideId: null },
  donut: { labelRu: 'Выпечка / пончик', targetMode: 'fridge', suggestedGuideId: null },
  cake: { labelRu: 'Торт / десерт', targetMode: 'fridge', suggestedGuideId: null },
  backpack: { labelRu: 'Рюкзак', targetMode: 'upcycling', suggestedGuideId: null },
  handbag: { labelRu: 'Сумка', targetMode: 'upcycling', suggestedGuideId: null },
  bicycle: { labelRu: 'Велосипед', targetMode: 'appliance', suggestedGuideId: null },
  scissors: { labelRu: 'Ножницы', targetMode: 'upcycling', suggestedGuideId: null },
  toothbrush: { labelRu: 'Зубная щётка', targetMode: 'appliance', suggestedGuideId: null },
  person: { labelRu: 'Человек в кадре', targetMode: 'appliance', suggestedGuideId: null },
};

/**
 * Сопоставление классов COCO-SSD (TensorFlow.js) с категориями МастерОК
 */
export function mapCocoClassToTarget(cocoClass: string): {
  labelRu: string;
  targetMode: 'appliance' | 'upcycling' | 'fridge';
  suggestedGuideId: string | null;
} {
  const cls = cocoClass.trim().toLowerCase();
  if (COCO_TRANSLATIONS[cls]) {
    return COCO_TRANSLATIONS[cls];
  }
  return {
    labelRu: cls ? `Объект (${cls})` : 'Неизвестный объект',
    targetMode: 'appliance',
    suggestedGuideId: null,
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

export const CONFIDENCE_WARNING_THRESHOLD = 0.75;

export function isLowConfidence(confidence: number): boolean {
  return !Number.isFinite(confidence) || confidence < CONFIDENCE_WARNING_THRESHOLD;
}

/**
 * Расчёт прямоугольника автоматической обрезки (crop) по центру кадра
 * с сохранением масштаба не выше maxEdge по длинной стороне.
 */
export function computeCenterCropRect(
  srcWidth: number,
  srcHeight: number,
  cropRatio: number = 0.78,
  maxEdge: number = 1024
): {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  targetW: number;
  targetH: number;
} {
  const safeW = Math.max(1, Math.round(srcWidth));
  const safeH = Math.max(1, Math.round(srcHeight));
  const ratio = Math.min(1, Math.max(0.3, cropRatio));

  const sw = Math.max(1, Math.round(safeW * ratio));
  const sh = Math.max(1, Math.round(safeH * ratio));
  const sx = Math.max(0, Math.floor((safeW - sw) / 2));
  const sy = Math.max(0, Math.floor((safeH - sh) / 2));

  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const targetW = Math.max(1, Math.round(sw * scale));
  const targetH = Math.max(1, Math.round(sh * scale));

  return { sx, sy, sw, sh, targetW, targetH };
}

/**
 * Настройка яркости (brightnessPct, 100 = без изменений) и контрастности (contrastPct, 100 = без изменений)
 * на массиве RGBA пикселей для усиления читаемости мелких деталей техники.
 */
export function applyBrightnessContrast(
  pixels: Uint8ClampedArray,
  brightnessPct: number = 108,
  contrastPct: number = 118
): void {
  const brightnessOffset = ((brightnessPct - 100) / 100) * 255;
  const contrastFactor = contrastPct / 100;

  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const shifted = (pixels[i + c] - 128) * contrastFactor + 128 + brightnessOffset;
      pixels[i + c] = shifted < 0 ? 0 : shifted > 255 ? 255 : Math.round(shifted);
    }
  }
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Физический масштаб (метров в 1 единице 3D-сцены) для калибровки размеров деталей.
 */
export function getModelMetersPerUnit(
  modelType: 'washing_machine' | 'microwave' | 'vacuum' | 'chair' | 'fridge'
): number {
  switch (modelType) {
    case 'washing_machine':
    case 'fridge':
      return 0.6 / 1.56; // стандартная ширина корпуса 600 мм
    case 'microwave':
      return 0.49 / 1.8; // стандартная ширина 490 мм
    case 'vacuum':
      return 0.32 / 0.86; // высота циклонного блока 320 мм
    case 'chair':
      return 0.45 / 1.08; // диаметр сиденья 450 мм
    default:
      return 0.5;
  }
}

/**
 * Проецирует нормализованные экранные координаты [0..1, 0..1] на плоскость глубины depthMeters
 * с учётом вертикального угла обзора камеры fovDeg и соотношения сторон aspectRatio.
 */
export function projectScreenPointToDepthPlane(
  normX: number,
  normY: number,
  depthMeters: number,
  fovDeg: number = 45,
  aspectRatio: number = 1.5
): Point3D {
  const safeDepth = Math.max(0.1, depthMeters);
  const ndcX = normX * 2 - 1;
  const ndcY = 1 - normY * 2;
  const halfHeight = safeDepth * Math.tan((fovDeg * Math.PI) / 360);
  const halfWidth = halfHeight * Math.max(0.2, aspectRatio);

  return {
    x: ndcX * halfWidth,
    y: ndcY * halfHeight,
    z: -safeDepth,
  };
}

/**
 * Вычисляет 3D-расстояние между двумя точками в миллиметрах и осям ΔX/ΔY/ΔZ.
 */
export function compute3DDistanceMm(
  p1: Point3D,
  p2: Point3D,
  metersPerUnit: number = 1
): {
  distanceMm: number;
  distanceCm: number;
  dxMm: number;
  dyMm: number;
  dzMm: number;
} {
  const dx = (p2.x - p1.x) * metersPerUnit;
  const dy = (p2.y - p1.y) * metersPerUnit;
  const dz = (p2.z - p1.z) * metersPerUnit;
  const distMeters = Math.hypot(dx, dy, dz);
  const distanceMm = Math.round(distMeters * 10000) / 10;

  return {
    distanceMm,
    distanceCm: Math.round(distanceMm) / 10,
    dxMm: Math.round(Math.abs(dx) * 1000),
    dyMm: Math.round(Math.abs(dy) * 1000),
    dzMm: Math.round(Math.abs(dz) * 1000),
  };
}

export function formatRulerLength(distanceMm: number, unit: 'mm' | 'cm' = 'mm'): string {
  if (unit === 'cm') {
    return `${(distanceMm / 10).toFixed(1)} см`;
  }
  return `${Math.round(distanceMm)} мм`;
}

