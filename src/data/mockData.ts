import washingImg from '../assets/images/appliance_washing_machine_1794559142469.jpg';
import microwaveImg from '../assets/images/appliance_microwave_1794559142872.jpg';
import vacuumImg from '../assets/images/appliance_vacuum_1794559143129.jpg';
import fridgeImg from '../assets/images/appliance_fridge_1794559143659.jpg';
import chairBeforeImg from '../assets/images/upcycle_chair_before_1794559144168.jpg';
import chairAfterImg from '../assets/images/upcycle_chair_after_1794559144617.jpg';
import { LocalMaster, MonthlySavingsPoint } from '../utils/engine';

export const APP_IMAGES = {
  washing: washingImg,
  microwave: microwaveImg,
  vacuum: vacuumImg,
  fridge: fridgeImg,
  chairBefore: chairBeforeImg,
  chairAfter: chairAfterImg,
};

export interface ARStep {
  stepNumber: number;
  title: string;
  description: string;
  voiceText: string;
  targetPartId: string;
  highlightCoordinates: { x: number; y: number; z: number };
  arrowDirection?: 'up' | 'down' | 'rotate-cw' | 'rotate-ccw' | 'pull-forward' | 'push';
  toolsRequired: string[];
  safetyWarning?: string;
  checklistItem: string;
  cameraAngle: { x: number; y: number; z: number };
}

export interface RepairGuide {
  id: string;
  applianceId: string;
  title: string;
  symptom: string;
  errorCodes?: string[];
  difficulty: 'Легко' | 'Средне' | 'Сложно';
  estimatedTime: string;
  moneySaved: number;
  co2Saved: number;
  materialsCost: number;
  tools: string[];
  safetyGear: string[];
  modelType: 'washing_machine' | 'microwave' | 'vacuum' | 'chair' | 'fridge';
  steps: ARStep[];
  rating: number;
  reviewsCount: number;
  partsLinks: {
    name: string;
    partNumber: string;
    price: number;
    shop: string;
    linkUrl: string;
  }[];
}

export interface UpcyclingProject {
  id: string;
  title: string;
  furnitureType: string;
  difficulty: 'Легко' | 'Средне' | 'Продвинутый';
  timeEstimate: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  budgetRub: number;
  marketValueRub: number;
  ecoImpact: {
    woodSavedKg: number;
    co2ReducedKg: number;
  };
  technique: string;
  materials: string[];
  steps: {
    step: number;
    title: string;
    instruction: string;
    proTip?: string;
  }[];
  palette: { name: string; hex: string }[];
}

export interface GeneratedUpcycleIdea {
  id: string;
  title: string;
  description: string;
  materials: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
  materialsCost: number;
  marketValueAfter: number;
  objectLabel: string;
}

export interface FridgeRecipe {
  id: string;
  title: string;
  category: string;
  requiredIngredients: string[];
  optionalIngredients: string[];
  cookingTimeMinutes: number;
  difficulty: 'Легко' | 'Средне';
  calories: number;
  servings: number;
  imageEmoji: string;
  steps: string[];
  zeroWasteTip: string;
}

export const INITIAL_SAVINGS_HISTORY: MonthlySavingsPoint[] = [
  { month: 'Июнь', moneySaved: 2100, co2SavedKg: 14, repairsCount: 1 },
  { month: 'Июль', moneySaved: 2850, co2SavedKg: 18, repairsCount: 1 },
  { month: 'Авг', moneySaved: 3200, co2SavedKg: 45, repairsCount: 1 },
  { month: 'Сент', moneySaved: 1900, co2SavedKg: 28, repairsCount: 1 },
  { month: 'Окт', moneySaved: 3500, co2SavedKg: 45, repairsCount: 1 },
];

export const LOCAL_MASTERS: LocalMaster[] = [
  {
    id: 'master-1',
    name: 'Алексей Смирнов',
    specialty: 'Стиральные машины и сушилки',
    category: 'washing_machine',
    rating: 4.96,
    reviewsCount: 184,
    completedOrders: 512,
    responseMinutes: 12,
    baseVisitRub: 750,
    district: 'Центральный',
    distanceKm: 1.2,
    coordinates: { x: 48, y: 46 },
    availableNow: true,
  },
  {
    id: 'master-2',
    name: 'Дмитрий Козлов',
    specialty: 'СВЧ, электроплиты и модули',
    category: 'microwave',
    rating: 4.88,
    reviewsCount: 97,
    completedOrders: 265,
    responseMinutes: 18,
    baseVisitRub: 600,
    district: 'Северный',
    distanceKm: 2.6,
    coordinates: { x: 30, y: 24 },
    availableNow: true,
  },
  {
    id: 'master-3',
    name: 'Сергей Волков',
    specialty: 'Холодильное оборудование',
    category: 'refrigerator',
    rating: 4.92,
    reviewsCount: 143,
    completedOrders: 390,
    responseMinutes: 25,
    baseVisitRub: 900,
    district: 'Южный',
    distanceKm: 3.4,
    coordinates: { x: 64, y: 74 },
    availableNow: true,
  },
  {
    id: 'master-4',
    name: 'Максим Орлов',
    specialty: 'Универсальный мастер (техника и электрика)',
    category: 'universal',
    rating: 4.81,
    reviewsCount: 76,
    completedOrders: 210,
    responseMinutes: 15,
    baseVisitRub: 650,
    district: 'Западный',
    distanceKm: 2.1,
    coordinates: { x: 22, y: 58 },
    availableNow: false,
  },
  {
    id: 'master-5',
    name: 'Илья Громов',
    specialty: 'Стиральные и посудомоечные машины',
    category: 'washing_machine',
    rating: 4.74,
    reviewsCount: 58,
    completedOrders: 164,
    responseMinutes: 22,
    baseVisitRub: 550,
    district: 'Восточный',
    distanceKm: 4.1,
    coordinates: { x: 78, y: 38 },
    availableNow: true,
  },
];

export const POPULAR_GUIDES: RepairGuide[] = [
  {
    id: 'lg-wm-filter',
    applianceId: 'lg-f1296nd3',
    title: 'Очистка и замена сливного фильтра и помпы',
    symptom: 'Стиральная машина не сливает воду (Ошибка OE), гул во время отжима',
    errorCodes: ['OE', 'DE', 'CL'],
    difficulty: 'Легко',
    estimatedTime: '20 минут',
    moneySaved: 3200,
    co2Saved: 45,
    materialsCost: 0,
    tools: ['Плоская отвертка', 'Неглубокий лоток или таз', 'Впитывающее полотенце'],
    safetyGear: ['Обесточить от 220V', 'Перекрыть кран подачи воды', 'Перчатки х/б'],
    modelType: 'washing_machine',
    rating: 4.9,
    reviewsCount: 384,
    partsLinks: [
      {
        name: 'Оригинальный сливной фильтр LG (узел в сборе)',
        partNumber: 'MDQ61937901',
        price: 650,
        shop: 'Ozon',
        linkUrl: '#ozon-filter',
      },
      {
        name: 'Сливной насос (помпа) Askoll 30W для LG',
        partNumber: '5859EN1004B',
        price: 1100,
        shop: 'Wildberries',
        linkUrl: '#wb-pump',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Обесточивание и перекрытие воды',
        description:
          'Выньте вилку питания 220В из розетки. Перекройте запорный кран подачи холодной воды на задней стенке.',
        voiceText:
          'Перед началом работ обязательно отключите стиральную машину от электрической сети и перекройте воду.',
        targetPartId: 'plug',
        highlightCoordinates: { x: -0.7, y: 0.9, z: -0.6 },
        toolsRequired: ['Сухие руки'],
        safetyWarning: 'Опасность поражения электрическим током!',
        checklistItem: 'Машина обесточена, вилка лежит на виду',
        cameraAngle: { x: -1.1, y: 1.2, z: 2.2 },
      },
      {
        stepNumber: 2,
        title: 'Открытие сервисного люка фильтра',
        description:
          'Найдите прямоугольный лючок в правом нижнем углу передней панели. Аккуратно подденьте защелку плоской отверткой.',
        voiceText: 'Откройте сервисный лючок в правом нижнем углу корпуса.',
        targetPartId: 'service_door',
        highlightCoordinates: { x: 0.55, y: -0.68, z: 0.8 },
        arrowDirection: 'pull-forward',
        toolsRequired: ['Шлицевая отвертка'],
        checklistItem: 'Лючок открыт, открыт доступ к фильтру',
        cameraAngle: { x: 0.9, y: -0.3, z: 2.0 },
      },
      {
        stepNumber: 3,
        title: 'Аварийный слив остатков воды через шланг',
        description:
          'Подставьте плоскую емкость. Извлеките тонкий черный шланг, вытащите пробку-заглушку и слейте 0.5–1 л воды.',
        voiceText:
          'Вытяните аварийный шланг, откройте пробку и слейте воду в подготовленный лоток.',
        targetPartId: 'drain_hose',
        highlightCoordinates: { x: 0.42, y: -0.72, z: 0.86 },
        arrowDirection: 'pull-forward',
        toolsRequired: ['Лоток для воды', 'Тряпка'],
        checklistItem: 'Остаточная вода слита, заглушка возвращена на место',
        cameraAngle: { x: 0.7, y: -0.45, z: 1.7 },
      },
      {
        stepNumber: 4,
        title: 'Выкручивание фильтра против часовой стрелки',
        description:
          'Возьмитесь за рукоятку фильтра и плавно вращайте против часовой стрелки на 3–4 оборота. Извлеките фильтр наружу.',
        voiceText:
          'Поверните рукоятку фильтра против часовой стрелки и извлеките корпус фильтра.',
        targetPartId: 'filter_assembly',
        highlightCoordinates: { x: 0.58, y: -0.68, z: 0.84 },
        arrowDirection: 'rotate-ccw',
        toolsRequired: ['Тряпка'],
        checklistItem: 'Фильтр полностью выкручен и извлечен',
        cameraAngle: { x: 0.8, y: -0.5, z: 1.6 },
      },
      {
        stepNumber: 5,
        title: 'Очистка улитки и проверка крыльчатки помпы',
        description:
          'Удалите из камеры монеты, булавки и нитки. Проверьте пальцем крыльчатку насоса в глубине — она должна вращаться шажками.',
        voiceText:
          'Очистите фильтр от мусора и проверьте свободное вращение крыльчатки насоса.',
        targetPartId: 'pump_impeller',
        highlightCoordinates: { x: 0.58, y: -0.68, z: 0.65 },
        arrowDirection: 'rotate-cw',
        toolsRequired: ['Фонарик смартфона'],
        checklistItem: 'Крыльчатка вращается свободно, посторонние предметы удалены',
        cameraAngle: { x: 0.7, y: -0.5, z: 1.5 },
      },
      {
        stepNumber: 6,
        title: 'Установка фильтра и тестовый запуск',
        description:
          'Промойте фильтр под краном, вставьте строго по резьбе и плотно закрутите по часовой стрелке до упора. Запустите цикл «Полоскание + Отжим».',
        voiceText:
          'Закрутите фильтр по часовой стрелке до упора, закройте люк и запустите тестовый цикл.',
        targetPartId: 'filter_assembly',
        highlightCoordinates: { x: 0.58, y: -0.68, z: 0.84 },
        arrowDirection: 'rotate-cw',
        toolsRequired: [],
        checklistItem: 'Фильтр затянут, протечек нет',
        cameraAngle: { x: 0.6, y: -0.3, z: 1.9 },
      },
    ],
  },
  {
    id: 'samsung-mw-fuse',
    applianceId: 'samsung-ms23',
    title: 'Диагностика и замена высоковольтного предохранителя',
    symptom: 'Микроволновка крутит тарелку и гудит, но не нагревает еду',
    errorCodes: ['НЕ ГРЕЕТ', 'E-01'],
    difficulty: 'Средне',
    estimatedTime: '30 минут',
    moneySaved: 2800,
    co2Saved: 18,
    materialsCost: 240,
    tools: ['Крестовая отвертка PH2', 'Мультиметр', 'Изолированные пассатижи'],
    safetyGear: ['Обесточить 220V', 'Разряд конденсатора через резистор', 'Защитные очки'],
    modelType: 'microwave',
    rating: 4.8,
    reviewsCount: 192,
    partsLinks: [
      {
        name: 'Высоковольтный предохранитель 5kV 0.75A в тубусе',
        partNumber: 'HV-FUSE-5KV',
        price: 240,
        shop: 'Чип и Дип',
        linkUrl: '#chipdip-fuse',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Обесточивание и выдержка времени',
        description:
          'Отключите вилку из розетки. Подождите минимум 10 минут для естественного саморазряда высоковольтного конденсатора.',
        voiceText:
          'Внутри микроволновки напряжение до 4000 Вольт. Обязательно выдерните вилку из розетки.',
        targetPartId: 'mw_plug',
        highlightCoordinates: { x: 0, y: 0.7, z: -0.6 },
        toolsRequired: [],
        safetyWarning: 'Смертельно опасное напряжение до 4000В даже после выключения!',
        checklistItem: 'Шнур выдернут из сети, выдержано 10 минут',
        cameraAngle: { x: 0, y: 0.6, z: 2.0 },
      },
      {
        stepNumber: 2,
        title: 'Снятие металлического кожуха',
        description:
          'Выкрутите 5 винтов по периметру задней крышки. Сдвиньте П-образный кожух назад на 2 см и поднимите вверх.',
        voiceText: 'Открутите винты крепления защитного кожуха и снимите его.',
        targetPartId: 'mw_casing',
        highlightCoordinates: { x: 0, y: 0.35, z: 0 },
        arrowDirection: 'pull-forward',
        toolsRequired: ['Крестовая отвертка PH2'],
        checklistItem: 'Кожух снят, открыт доступ к высоковольтной части',
        cameraAngle: { x: 1.0, y: 0.8, z: 1.7 },
      },
      {
        stepNumber: 3,
        title: 'Разрядка высоковольтного конденсатора',
        description:
          'Отверткой с изолированной ручкой замкните выводы конденсатора на металлический корпус через резистор 100 кОм.',
        voiceText: 'Разрядите высоковольтный конденсатор изолированным инструментом.',
        targetPartId: 'mw_capacitor',
        highlightCoordinates: { x: 0.5, y: -0.15, z: -0.15 },
        toolsRequired: ['Изолированная отвертка'],
        safetyWarning: 'Не прикасайтесь к контактам руками до разряда!',
        checklistItem: 'Конденсатор безопасно разряжен',
        cameraAngle: { x: 0.9, y: 0.3, z: 1.5 },
      },
      {
        stepNumber: 4,
        title: 'Замена предохранителя 5kV в пластиковом тубусе',
        description:
          'Найдите белый тубус между конденсатором и трансформатором. Раскройте защелку, проверьте нить и замените предохранитель.',
        voiceText: 'Замените сгоревший высоковольтный предохранитель на новый.',
        targetPartId: 'mw_fuse',
        highlightCoordinates: { x: 0.5, y: -0.2, z: 0.2 },
        arrowDirection: 'pull-forward',
        toolsRequired: ['Мультиметр'],
        checklistItem: 'Новый предохранитель установлен, тубус защелкнут',
        cameraAngle: { x: 0.8, y: 0.25, z: 1.4 },
      },
      {
        stepNumber: 5,
        title: 'Сборка и тест со стаканом воды',
        description:
          'Установите кожух на место, закрутите винты. Поставьте в камеру полстакана воды на 30 секунд и проверьте нагрев.',
        voiceText: 'Соберите корпус и проверьте нагрев воды за 30 секунд.',
        targetPartId: 'mw_door',
        highlightCoordinates: { x: -0.25, y: 0, z: 0.7 },
        toolsRequired: ['Крестовая отвертка'],
        checklistItem: 'Вода нагрелась, посторонних запахов нет',
        cameraAngle: { x: 0.2, y: 0.4, z: 2.0 },
      },
    ],
  },
  {
    id: 'dyson-v11-clean',
    applianceId: 'dyson-v11',
    title: 'Полная очистка циклона, HEPA-фильтра и турбощетки',
    symptom: 'Пылесос отключается через 10 секунд, пульсирует тяга',
    errorCodes: ['FILTER', 'AIRWAY BLOCKED'],
    difficulty: 'Легко',
    estimatedTime: '25 минут',
    moneySaved: 2500,
    co2Saved: 14,
    materialsCost: 0,
    tools: ['Холодная вода без мыла', 'Ножницы', 'Монета для фиксатора'],
    safetyGear: ['Перчатки', 'Респиратор от пыли'],
    modelType: 'vacuum',
    rating: 4.95,
    reviewsCount: 420,
    partsLinks: [
      {
        name: 'Моющийся HEPA-фильтр для беспроводного пылесоса',
        partNumber: 'DY-970013-02',
        price: 590,
        shop: 'Ozon',
        linkUrl: '#ozon-hepa',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Снятие пылесборника',
        description:
          'Опустите красный рычаг очистки контейнера до щелчка, нажмите фиксатор на направляющей и снимите колбу.',
        voiceText: 'Снимите прозрачный контейнер пылесборника с корпуса.',
        targetPartId: 'vac_bin',
        highlightCoordinates: { x: 0, y: -0.25, z: 0.3 },
        arrowDirection: 'pull-forward',
        toolsRequired: [],
        checklistItem: 'Колба снята и протерта сухой салфеткой',
        cameraAngle: { x: 0.8, y: 0.3, z: 1.8 },
      },
      {
        stepNumber: 2,
        title: 'Промывка моющегося HEPA-фильтра',
        description:
          'Поверните фиолетовый фильтр против часовой стрелки. Промойте под прохладной проточной водой без моющих средств.',
        voiceText: 'Снимите фильтр против часовой стрелки и промойте холодной водой.',
        targetPartId: 'vac_filter',
        highlightCoordinates: { x: 0, y: 0.55, z: 0 },
        arrowDirection: 'rotate-ccw',
        toolsRequired: ['Проточная вода'],
        safetyWarning: 'Сушите фильтр минимум 24 часа! Нельзя сушить феном или на батарее!',
        checklistItem: 'Фильтр промыт и оставлен на естественную сушку',
        cameraAngle: { x: -0.6, y: 0.7, z: 1.5 },
      },
      {
        stepNumber: 3,
        title: 'Очистка вала турбощетки',
        description:
          'Монетой поверните торцевой замок щетки, вытащите валик и аккуратно срежьте волосы по специальному желобку.',
        voiceText: 'Откройте замок щетки и очистите валик от намотавшихся волос.',
        targetPartId: 'vac_brush',
        highlightCoordinates: { x: 0, y: -0.75, z: 0.25 },
        arrowDirection: 'pull-forward',
        toolsRequired: ['Монета', 'Ножницы'],
        checklistItem: 'Валик очищен от волос и ниток',
        cameraAngle: { x: 0.5, y: -0.5, z: 1.7 },
      },
      {
        stepNumber: 4,
        title: 'Установка сухого фильтра',
        description:
          'После полного высыхания установите фильтр на место и поверните по часовой стрелке до четкого щелчка.',
        voiceText: 'Установите полностью сухой фильтр до щелчка по часовой стрелке.',
        targetPartId: 'vac_filter',
        highlightCoordinates: { x: 0, y: 0.55, z: 0 },
        arrowDirection: 'rotate-cw',
        toolsRequired: [],
        checklistItem: 'Пылесос собран, тяга восстановлена',
        cameraAngle: { x: 0.2, y: 0.4, z: 1.8 },
      },
    ],
  },
  {
    id: 'chair-upcycling',
    applianceId: 'vintage-chair',
    title: 'Реновация венского стула в стиле Japandi',
    symptom: 'Потертый лак, рассохшееся сиденье',
    difficulty: 'Легко',
    estimatedTime: '3 часа',
    moneySaved: 4550,
    co2Saved: 28,
    materialsCost: 950,
    tools: ['Наждачка P120/P240', 'Мебельный степлер', 'Кисть синтетическая'],
    safetyGear: ['Респиратор при шлифовке', 'Перчатки'],
    modelType: 'chair',
    rating: 4.94,
    reviewsCount: 128,
    partsLinks: [
      {
        name: 'Меловая краска «Графитовый шелк» 0.5 л',
        partNumber: 'CHALK-GR-05',
        price: 590,
        shop: 'Ozon',
        linkUrl: '#ozon-paint',
      },
    ],
    steps: [
      {
        stepNumber: 1,
        title: 'Демонтаж сиденья и старой обивки',
        description:
          'Переверните стул, выкрутите 4 угловых шурупа, снимите фанерное сиденье и удалите старый поролон.',
        voiceText: 'Открутите четыре шурупа снизу и снимите старое сиденье.',
        targetPartId: 'chair_seat',
        highlightCoordinates: { x: 0, y: 0.05, z: 0 },
        arrowDirection: 'pull-forward',
        toolsRequired: ['Отвертка'],
        checklistItem: 'Сиденье снято, фанерная основа очищена',
        cameraAngle: { x: 0.9, y: 0.4, z: 1.8 },
      },
      {
        stepNumber: 2,
        title: 'Шлифовка и покраска каркаса',
        description:
          'Зашкурьте ножки и изогнутую спинку наждачкой P120, обеспыльте и покройте двумя слоями матовой меловой краски.',
        voiceText: 'Отшлифуйте каркас и нанесите два тонких слоя меловой краски.',
        targetPartId: 'chair_back',
        highlightCoordinates: { x: 0, y: 0.65, z: -0.35 },
        toolsRequired: ['Наждачка P120', 'Кисть'],
        checklistItem: 'Краска высохла и закреплена финишным воском',
        cameraAngle: { x: -0.8, y: 0.8, z: 1.9 },
      },
      {
        stepNumber: 3,
        title: 'Перетяжка сиденья тканью букле',
        description:
          'Вырежьте поролон 30 мм по лекалу фанеры, натяните рогожку или букле с припуском 5 см и закрепите степлером.',
        voiceText: 'Натяните новую ткань на поролон и закрепите мебельным степлером.',
        targetPartId: 'chair_seat',
        highlightCoordinates: { x: 0, y: 0.05, z: 0 },
        arrowDirection: 'push',
        toolsRequired: ['Мебельный степлер'],
        checklistItem: 'Ткань натянута без складок, сиденье прикручено обратно',
        cameraAngle: { x: 0.7, y: 0.6, z: 1.7 },
      },
    ],
  },
];

export const UPCYCLING_PROJECTS: UpcyclingProject[] = [
  {
    id: 'vintage-chair',
    title: 'Реновация венского стула СССР в стиле Japandi',
    furnitureType: 'Деревянный стул (бук)',
    difficulty: 'Легко',
    timeEstimate: '3–4 часа',
    beforeImageUrl: chairBeforeImg,
    afterImageUrl: chairAfterImg,
    budgetRub: 950,
    marketValueRub: 5500,
    ecoImpact: {
      woodSavedKg: 8.5,
      co2ReducedKg: 28,
    },
    technique: 'Шлифовка · Меловая краска · Перетяжка букле',
    materials: [
      'Меловая краска «Графитовый шелк» (0.4 л)',
      'Наждачная бумага зернистостью P120 и P240',
      'Ткань мебельная рогожка / букле 0.6×0.6 м',
      'Мебельный поролон высокой плотности 30 мм',
      'Мебельный степлер и скобы 8 мм',
      'Воск мебельный матовый финишный',
    ],
    palette: [
      { name: 'Графит матовый', hex: '#2b2d42' },
      { name: 'Шалфей сканди', hex: '#6b7f75' },
      { name: 'Натуральный дуб', hex: '#b5835a' },
      { name: 'Теплый крем', hex: '#d8ceb8' },
    ],
    steps: [
      {
        step: 1,
        title: 'Демонтаж мягкого сиденья и очистка',
        instruction:
          'Переверните стул, выкрутите 4 угловых шурупа крепления фанерного сиденья. Снимите старую ткань и истлевший поролон.',
        proTip: 'Сохраните старую фанерную основу — она идеальное лекало для выкройки поролона.',
      },
      {
        step: 2,
        title: 'Шлифовка каркаса и снятие старого лака',
        instruction:
          'Обработайте ножки и спинку наждачкой P120, удаляя сколы и глянец. Обеспыльте влажной микрофиброй.',
        proTip: 'Для гнутых деталей используйте абразивную губку — она повторяет округлые изгибы.',
      },
      {
        step: 3,
        title: 'Покраска экологичной меловой краской в 2 слоя',
        instruction:
          'Нанесите первый тонкий слой кистью с синтетическим ворсом. Дайте высохнуть 40 минут. Нанесите второй слой и закрепите воском.',
      },
      {
        step: 4,
        title: 'Перетяжка сиденья новым поролоном и букле',
        instruction:
          'Положите поролон на фанеру, накройте тканью с припуском 5 см. Натягивая от центра к углам, зафиксируйте степлером снизу.',
      },
    ],
  },
];

export const ZERO_WASTE_RECIPES: FridgeRecipe[] = [
  {
    id: 'fridge-frittata',
    title: 'Средиземноморская фриттата «Чистый холодильник»',
    category: 'Завтрак / Ужин',
    requiredIngredients: ['яйца', 'сыр', 'помидоры'],
    optionalIngredients: ['зелень', 'молоко', 'перец'],
    cookingTimeMinutes: 15,
    difficulty: 'Легко',
    calories: 320,
    servings: 2,
    imageEmoji: '🍳',
    steps: [
      'Взбейте 3–4 яйца с 2 столовыми ложками молока или сметаны, добавьте соль и перец.',
      'Нарежьте остатки овощей (томаты, перец) и обжарьте на сковороде 3 минуты.',
      'Залейте яичной смесью, посыпьте натертым сыром.',
      'Убавьте огонь до минимума, накройте крышкой на 7–8 минут до схватывания центра.',
    ],
    zeroWasteTip:
      'Сырные корочки можно заморозить и позже добавить при варке супа для сливочного аромата.',
  },
  {
    id: 'creamy-pasta',
    title: 'Паста с томатно-сливочным соусом и сыром',
    category: 'Обед / Ужин',
    requiredIngredients: ['макароны', 'помидоры', 'сыр'],
    optionalIngredients: ['чеснок', 'сметана', 'зелень'],
    cookingTimeMinutes: 12,
    difficulty: 'Легко',
    calories: 440,
    servings: 2,
    imageEmoji: '🍝',
    steps: [
      'Отварите макароны в подсоленной воде на 1 минуту меньше времени на упаковке.',
      'На сковороде припустите измельченные помидоры с чесноком и ложкой сметаны.',
      'Переложите пасту в соус, добавьте полполовника воды от варки макарон и тертый сыр.',
      'Энергично перемешивайте 1 минуту до кремовой текстуры.',
    ],
    zeroWasteTip:
      'Вода от варки пасты содержит крахмал — она связывает соус в шелковистую эмульсию без сливок.',
  },
  {
    id: 'quick-quesadilla',
    title: 'Хрустящая кесадилья из остатков лаваша',
    category: 'Перекус',
    requiredIngredients: ['сыр', 'лаваш / лепешка'],
    optionalIngredients: ['помидоры', 'курица', 'зелень'],
    cookingTimeMinutes: 8,
    difficulty: 'Легко',
    calories: 290,
    servings: 1,
    imageEmoji: '🌮',
    steps: [
      'На одну половину лаваша выложите натертый сыр, ломтики томата и остатки птицы.',
      'Сложите пополам и прижмите ладонью.',
      'Обжарьте на сухой сковороде по 2–3 минуты с каждой стороны до золотистой корочки.',
    ],
    zeroWasteTip:
      'Подсохший лаваш можно сбрызнуть водой — при нагреве на сковороде он снова станет эластичным.',
  },
];

export const MOCK_APPLIANCES_CATALOG = [
  {
    id: 'lg-f1296nd3',
    name: 'Стиральная машина LG F1296ND3',
    brand: 'LG',
    model: 'F1296ND3',
    year: 2021,
    category: 'washing_machine' as const,
    imageUrl: washingImg,
    popularity: 98,
    symptoms: [
      {
        id: 's1',
        title: 'Ошибка OE: Не сливает воду, шумит помпа',
        severity: 'high' as const,
        masterCost: 3500,
        partsCost: 650,
        timeMinutes: 20,
        difficulty: 'Легко' as const,
        stepsCount: 6,
      },
      {
        id: 's2',
        title: 'Стучит и вибрирует при отжиме (амортизаторы)',
        severity: 'medium' as const,
        masterCost: 4200,
        partsCost: 1200,
        timeMinutes: 40,
        difficulty: 'Средне' as const,
        stepsCount: 5,
      },
    ],
  },
  {
    id: 'samsung-ms23',
    name: 'Микроволновая печь Samsung MS23K3513AS',
    brand: 'Samsung',
    model: 'MS23K3513AS',
    year: 2022,
    category: 'microwave' as const,
    imageUrl: microwaveImg,
    popularity: 92,
    symptoms: [
      {
        id: 's4',
        title: 'Гудит и крутит, но не греет (предохранитель 5kV)',
        severity: 'high' as const,
        masterCost: 2800,
        partsCost: 240,
        timeMinutes: 25,
        difficulty: 'Средне' as const,
        stepsCount: 5,
      },
    ],
  },
  {
    id: 'dyson-v11',
    name: 'Беспроводной пылесос Dyson V11 Absolute',
    brand: 'Dyson',
    model: 'V11 Absolute',
    year: 2023,
    category: 'vacuum' as const,
    imageUrl: vacuumImg,
    popularity: 95,
    symptoms: [
      {
        id: 's6',
        title: 'Пульсирует тяга, индикация «Засор / Фильтр»',
        severity: 'medium' as const,
        masterCost: 2500,
        partsCost: 0,
        timeMinutes: 15,
        difficulty: 'Легко' as const,
        stepsCount: 4,
      },
    ],
  },
  {
    id: 'bosch-serie4',
    name: 'Стиральная машина Bosch Serie 4 WAN28200',
    brand: 'Bosch',
    model: 'WAN28200ME',
    year: 2021,
    category: 'washing_machine' as const,
    imageUrl: washingImg,
    popularity: 90,
    symptoms: [
      {
        id: 's8',
        title: 'Ошибка E18: Заблокирован слив',
        severity: 'high' as const,
        masterCost: 3600,
        partsCost: 700,
        timeMinutes: 20,
        difficulty: 'Легко' as const,
        stepsCount: 6,
      },
    ],
  },
  {
    id: 'indesit-bwc',
    name: 'Холодильник Indesit BIAA 13',
    brand: 'Indesit',
    model: 'BIAA 13',
    year: 2019,
    category: 'refrigerator' as const,
    imageUrl: fridgeImg,
    popularity: 86,
    symptoms: [
      {
        id: 's9',
        title: 'Вода под нижними ящиками (засор дренажа)',
        severity: 'low' as const,
        masterCost: 2200,
        partsCost: 50,
        timeMinutes: 15,
        difficulty: 'Легко' as const,
        stepsCount: 4,
      },
    ],
  },
  {
    id: 'vintage-chair-cat',
    name: 'Винтажный венский стул (Реновация)',
    brand: 'DIY',
    model: 'Bentwood Classic',
    year: 1986,
    category: 'furniture' as const,
    imageUrl: chairBeforeImg,
    popularity: 89,
    symptoms: [
      {
        id: 's10',
        title: 'Скол лака и продавленное сиденье (Апсайклинг)',
        severity: 'low' as const,
        masterCost: 5500,
        partsCost: 950,
        timeMinutes: 180,
        difficulty: 'Легко' as const,
        stepsCount: 3,
      },
    ],
  },
];
