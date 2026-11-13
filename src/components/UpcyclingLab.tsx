import React, { useState } from 'react';
import {
  Palette,
  Leaf,
  Hammer,
  ArrowRight,
  Layers,
  Heart,
  RefreshCw,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import {
  UPCYCLING_PROJECTS,
  UpcyclingProject,
  GeneratedUpcycleIdea,
} from '../data/mockData';
import { estimateUpcyclingValue } from '../utils/engine';
import { useAppStore } from '../store/useAppStore';
import { SafeImage } from './SafeImage';

export const UpcyclingLab: React.FC = () => {
  const navigate = useAppStore((s) => s.navigate);
  const savedIdeas = useAppStore((s) => s.savedIdeas);
  const toggleSaveIdea = useAppStore((s) => s.toggleSaveIdea);

  const [activeProject] = useState<UpcyclingProject>(UPCYCLING_PROJECTS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(activeProject.palette[0].hex);
  const [objectInput, setObjectInput] = useState<string>('Старый деревянный стул');
  const [generatedIdeas, setGeneratedIdeas] = useState<GeneratedUpcycleIdea[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const valuation = estimateUpcyclingValue(1000, activeProject.budgetRub, 'upholstery');

  const handleGenerateIdeas = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    const label = objectInput.trim() || 'Старый деревянный стул';
    try {
      const res = await fetch('/api/upcycle-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectLabel: label,
          imageData: activeProject.beforeImageUrl,
        }),
      });
      if (!res.ok) throw new Error('API unavailable');
      const json = await res.json();
      if (Array.isArray(json.ideas) && json.ideas.length > 0) {
        setGeneratedIdeas(json.ideas);
        return;
      }
      throw new Error('Empty ideas');
    } catch {
      setGeneratedIdeas([
        {
          id: `offline-idea-1-${Date.now()}`,
          title: 'Сканди-перезагрузка в матовый графит',
          description: `Шлифовка поверхности (${label}), покрытие двумя слоями меловой краски и финишным матовым воском.`,
          materials: ['Меловая краска 0.4 л', 'Наждачка P120/P240', 'Матовый мебельный воск'],
          difficulty: 'easy',
          estimatedHours: 3,
          materialsCost: 850,
          marketValueAfter: 5200,
          objectLabel: label,
        },
        {
          id: `offline-idea-2-${Date.now()}`,
          title: 'Мягкая перетяжка в фактурное букле',
          description: 'Замена изношенной обивки на плотный поролон 30 мм и износостойкую ткань букле мебельным степлером.',
          materials: ['Ткань букле 0.7×0.7 м', 'Поролон 30 мм', 'Мебельный степлер и скобы 8 мм'],
          difficulty: 'easy',
          estimatedHours: 2.5,
          materialsCost: 950,
          marketValueAfter: 5500,
          objectLabel: label,
        },
        {
          id: `offline-idea-3-${Date.now()}`,
          title: 'Браширование и масло «Американский орех»',
          description: 'Лёгкое браширование и тонировка тёмным маслом для подчёркивания природной текстуры.',
          materials: ['Щётка по дереву (нейлон)', 'Масло-воск «Орех»', 'Х/б ветошь'],
          difficulty: 'medium',
          estimatedHours: 4,
          materialsCost: 700,
          marketValueAfter: 6100,
          objectLabel: label,
        },
        {
          id: `offline-idea-4-${Date.now()}`,
          title: 'Колор-блок с латунными акцентами',
          description: 'Контрастное окрашивание нижней трети опор в тёплую латунь или терракоту с ровной отбивкой лентой.',
          materials: ['Малярный скотч', 'Акриловая эмаль', 'Металлик-акцент «Латунь»'],
          difficulty: 'easy',
          estimatedHours: 2,
          materialsCost: 540,
          marketValueAfter: 4400,
          objectLabel: label,
        },
        {
          id: `offline-idea-5-${Date.now()}`,
          title: 'Прикроватный органайзер-подставка',
          description: 'Трансформация конструкции в открытую консоль с интегрированной полкой для книг и кабель-каналом.',
          materials: ['Сосновая полка 30×25 см', 'Столярный клей D3', 'Уголки латунные'],
          difficulty: 'hard',
          estimatedHours: 5.5,
          materialsCost: 1350,
          marketValueAfter: 7200,
          objectLabel: label,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const difficultyLabel: Record<string, string> = {
    easy: 'Легко',
    medium: 'Средне',
    hard: 'Сложно',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-xs font-medium text-amber-400">
          Апсайклинг и реставрация · Генерация 5 идей
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
          Вторая жизнь старой мебели и вещей
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          Укажите предмет или отсканируйте вещь камерой — ИИ подберёт 5 идей реновации со списком материалов, оценкой стоимости и AR-помощником.
        </p>

        {/* AI 5-Ideas Generator Form */}
        <form
          onSubmit={handleGenerateIdeas}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1 max-w-2xl"
        >
          <input
            type="text"
            value={objectInput}
            onChange={(e) => setObjectInput(e.target.value)}
            placeholder="Например: старый буковый стул, тумба, джинсы..."
            aria-label="Предмет для апсайклинга"
            className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Leaf className="w-4 h-4" />
            )}
            <span>{isGenerating ? 'Генерация...' : 'Получить 5 идей'}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Камера</span>
          </button>
        </form>
      </section>

      {/* Generated 5 AI Ideas */}
      {generatedIdeas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              Персональные идеи для «{objectInput}» ({generatedIdeas.length})
            </h2>
            <span className="text-xs text-slate-400">Сохраняйте лучшие идеи в профиль</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {generatedIdeas.map((idea) => {
              const isSaved = savedIdeas.some((s) => s.id === idea.id);
              return (
                <article
                  key={idea.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400 font-mono tabular-nums">
                      <span className="text-amber-400 font-semibold font-sans">
                        {difficultyLabel[idea.difficulty] || idea.difficulty}
                      </span>
                      <span>
                        ~{idea.estimatedHours} ч · Бюджет {idea.materialsCost} ₽
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white leading-snug">
                      {idea.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {idea.description}
                    </p>
                    <div className="pt-1 text-xs text-slate-400">
                      <span className="text-slate-300 font-medium">Материалы: </span>
                      {idea.materials.join(' · ')}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
                    <span className="text-xs font-mono tabular-nums text-emerald-400 font-semibold">
                      Ценность: {idea.marketValueAfter.toLocaleString('ru-RU')} ₽
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSaveIdea(idea)}
                      className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                        isSaved
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                          : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      <span>{isSaved ? 'Сохранено' : 'В избранное'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured Interactive Before/After Project */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div>
            <div className="text-xs text-slate-400">
              {activeProject.furnitureType} · {activeProject.timeEstimate}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
              {activeProject.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="h-52 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <SafeImage
                  src={activeProject.beforeImageUrl}
                  alt="Стул до реставрации"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-slate-400">До реставрации</div>
            </div>

            <div className="space-y-1.5">
              <div className="h-52 rounded-xl overflow-hidden bg-slate-950 border border-slate-800">
                <SafeImage
                  src={activeProject.afterImageUrl}
                  alt="Стул после апсайклинга"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-xs text-emerald-400 font-medium">После апсайклинга</div>
            </div>
          </div>

          {/* Palette selector */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span>Палитра отделки</span>
              </span>
              <span className="text-slate-400">
                {activeProject.palette.find((p) => p.hex === selectedColor)?.name}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              {activeProject.palette.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelectedColor(color.hex)}
                  style={{ backgroundColor: color.hex }}
                  className={`w-9 h-9 rounded-xl border-2 transition-transform ${
                    selectedColor === color.hex
                      ? 'border-white scale-105'
                      : 'border-slate-700 hover:scale-105'
                  }`}
                  aria-label={color.name}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/repair/chair-upcycling')}
            className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Открыть 3D-инструкцию по реновации</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Economics & Materials */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="font-bold text-white text-sm">Экономика и эко-эффект</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Материалы</div>
                <div className="text-base font-bold font-mono tabular-nums text-amber-400 mt-1">
                  {activeProject.budgetRub.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Оценка после</div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-400 mt-1">
                  {valuation.estimatedFinishedValue.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">Дерево спасено</div>
                <div className="text-sm font-bold font-mono tabular-nums text-white mt-1">
                  {activeProject.ecoImpact.woodSavedKg} кг
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-slate-400">CO₂ снижено</div>
                <div className="text-sm font-bold font-mono tabular-nums text-emerald-400 mt-1">
                  {activeProject.ecoImpact.co2ReducedKg} кг
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Hammer className="w-4 h-4 text-cyan-400" />
              <span>Список материалов</span>
            </h3>
            <ul className="divide-y divide-slate-800 text-xs text-slate-300">
              {activeProject.materials.map((mat, idx) => (
                <li key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{mat}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
