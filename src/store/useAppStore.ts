import { create } from 'zustand';
import { INITIAL_SAVINGS_HISTORY, GeneratedUpcycleIdea } from '../data/mockData';
import { MonthlySavingsPoint, parseRoute, AppRoute } from '../utils/engine';

export interface ScanHistoryItem {
  id: string;
  label: string;
  brand?: string;
  model?: string;
  confidence: number;
  mode: 'appliance' | 'upcycling' | 'fridge';
  guideId: string;
  timestamp: string;
  imagePreview?: string;
}

export interface CustomUGCGuide {
  id: string;
  title: string;
  applianceModel: string;
  category: string;
  difficulty: 'Легко' | 'Средне' | 'Сложно';
  estimatedTime: string;
  moneySaved: number;
  steps: string[];
  author: string;
}

interface AppStoreState {
  currentPath: string;
  route: AppRoute;
  navigate: (path: string) => void;
  syncFromLocation: () => void;

  // Пользовательские данные и профиль
  isPremium: boolean;
  setPremium: (val: boolean) => void;

  // Экономия и график
  savingsHistory: MonthlySavingsPoint[];
  completedRepairsCount: number;
  totalSavedRub: number;
  totalCo2SavedKg: number;
  recordCompletedRepair: (moneySaved: number, co2SavedKg: number) => void;

  // История сканирований и сохранённые идеи
  scanHistory: ScanHistoryItem[];
  addScanRecord: (item: Omit<ScanHistoryItem, 'id' | 'timestamp'>) => void;

  savedIdeas: GeneratedUpcycleIdea[];
  toggleSaveIdea: (idea: GeneratedUpcycleIdea) => void;

  savedRecipeIds: string[];
  toggleSaveRecipe: (recipeId: string) => void;

  // UGC инструкции
  customGuides: CustomUGCGuide[];
  addCustomGuide: (guide: CustomUGCGuide) => void;
}

const initialPath =
  typeof window !== 'undefined' ? window.location.pathname || '/' : '/';

export const useAppStore = create<AppStoreState>((set, get) => ({
  currentPath: initialPath,
  route: parseRoute(initialPath),

  navigate: (path: string) => {
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    set({
      currentPath: path,
      route: parseRoute(path),
    });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  syncFromLocation: () => {
    if (typeof window === 'undefined') return;
    const p = window.location.pathname || '/';
    set({ currentPath: p, route: parseRoute(p) });
  },

  isPremium: false,
  setPremium: (val) => set({ isPremium: val }),

  savingsHistory: INITIAL_SAVINGS_HISTORY,
  completedRepairsCount: 5,
  totalSavedRub: INITIAL_SAVINGS_HISTORY.reduce((sum, item) => sum + item.moneySaved, 0),
  totalCo2SavedKg: INITIAL_SAVINGS_HISTORY.reduce((sum, item) => sum + item.co2SavedKg, 0),

  recordCompletedRepair: (moneySaved, co2SavedKg) => {
    const history = [...get().savingsHistory];
    const currentMonthLabel = 'Нояб';
    const lastIdx = history.length - 1;

    if (lastIdx >= 0 && history[lastIdx].month === currentMonthLabel) {
      history[lastIdx] = {
        ...history[lastIdx],
        moneySaved: history[lastIdx].moneySaved + moneySaved,
        co2SavedKg: history[lastIdx].co2SavedKg + co2SavedKg,
        repairsCount: history[lastIdx].repairsCount + 1,
      };
    } else {
      history.push({
        month: currentMonthLabel,
        moneySaved,
        co2SavedKg,
        repairsCount: 1,
      });
    }

    set((state) => ({
      savingsHistory: history,
      completedRepairsCount: state.completedRepairsCount + 1,
      totalSavedRub: state.totalSavedRub + moneySaved,
      totalCo2SavedKg: state.totalCo2SavedKg + co2SavedKg,
    }));
  },

  scanHistory: [
    {
      id: 'scan-seed-1',
      label: 'Стиральная машина LG F1296ND3',
      brand: 'LG',
      model: 'F1296ND3',
      confidence: 0.94,
      mode: 'appliance',
      guideId: 'lg-wm-filter',
      timestamp: 'Сегодня, 14:20',
    },
    {
      id: 'scan-seed-2',
      label: 'Венский стул (бук)',
      confidence: 0.89,
      mode: 'upcycling',
      guideId: 'chair-upcycling',
      timestamp: 'Вчера, 19:05',
    },
  ],

  addScanRecord: (item) =>
    set((state) => ({
      scanHistory: [
        {
          ...item,
          id: `scan-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
        ...state.scanHistory,
      ],
    })),

  savedIdeas: [
    {
      id: 'seed-idea-1',
      title: 'Сканди-перезагрузка с меловым графитом',
      description:
        'Снятие старого лака, окрашивание экологичной меловой краской и перетяжка сиденья фактурным букле.',
      materials: ['Меловая краска 0.4 л', 'Наждачка P120/P240', 'Ткань букле 0.6 м', 'Мебельный степлер'],
      difficulty: 'easy',
      estimatedHours: 3.5,
      materialsCost: 950,
      marketValueAfter: 5500,
      objectLabel: 'Деревянный стул',
    },
  ],

  toggleSaveIdea: (idea) =>
    set((state) => {
      const exists = state.savedIdeas.some((i) => i.id === idea.id);
      return {
        savedIdeas: exists
          ? state.savedIdeas.filter((i) => i.id !== idea.id)
          : [idea, ...state.savedIdeas],
      };
    }),

  savedRecipeIds: ['fridge-frittata'],

  toggleSaveRecipe: (recipeId) =>
    set((state) => {
      const exists = state.savedRecipeIds.includes(recipeId);
      return {
        savedRecipeIds: exists
          ? state.savedRecipeIds.filter((id) => id !== recipeId)
          : [recipeId, ...state.savedRecipeIds],
      };
    }),

  customGuides: [],
  addCustomGuide: (guide) =>
    set((state) => ({
      customGuides: [guide, ...state.customGuides],
    })),
}));
