import React, { useState, useMemo } from 'react';
import {
  Search,
  Mic,
  Camera,
  ArrowRight,
  SlidersHorizontal,
  PlusCircle,
} from 'lucide-react';
import { MOCK_APPLIANCES_CATALOG, POPULAR_GUIDES } from '../data/mockData';
import { searchCatalog } from '../utils/engine';
import { useAppStore } from '../store/useAppStore';
import { SafeImage } from './SafeImage';

interface CatalogViewProps {
  onOpenUGC: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ onOpenUGC }) => {
  const navigate = useAppStore((s) => s.navigate);
  const customGuides = useAppStore((s) => s.customGuides);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [isListening, setIsListening] = useState(false);

  const categories = [
    { id: 'all', label: 'Все категории' },
    { id: 'washing_machine', label: 'Стиральные машины' },
    { id: 'microwave', label: 'Микроволновки' },
    { id: 'vacuum', label: 'Пылесосы' },
    { id: 'refrigerator', label: 'Холодильники' },
    { id: 'furniture', label: 'Мебель и DIY' },
  ];

  const brands = ['all', 'LG', 'Bosch', 'Samsung', 'Dyson', 'Indesit', 'DIY'];

  const handleVoiceSearch = () => {
    if (
      typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
    ) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'ru-RU';
      recognition.start();
      setIsListening(true);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setSearchQuery(transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
    } else {
      setSearchQuery('LG');
    }
  };

  const filteredItems = useMemo(() => {
    return searchCatalog(
      MOCK_APPLIANCES_CATALOG,
      searchQuery,
      selectedCategory,
      selectedBrand
    );
  }, [searchQuery, selectedCategory, selectedBrand]);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        <div className="max-w-2xl space-y-3">
          <div className="text-xs font-medium text-cyan-400">
            База знаний · 500+ моделей техники и мебели
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight text-balance">
            Интерактивные AR-инструкции по ремонту и апсайклингу
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Наведите камеру на технику или выберите модель из каталога, чтобы получить пошаговую 3D-инструкцию прямо в браузере и сэкономить на вызове мастера.
          </p>
        </div>

        {/* Search + Primary Scan CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-4xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по бренду или модели (LG, Dyson, Bosch)..."
              aria-label="Поиск по каталогу"
              className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 transition-colors"
            />
            <button
              type="button"
              onClick={handleVoiceSearch}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${
                isListening
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-cyan-400'
              }`}
              title="Голосовой поиск"
              aria-label="Голосовой поиск"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Сканировать камерой</span>
          </button>

          <button
            type="button"
            onClick={onOpenUGC}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4 text-slate-400" />
            <span>Добавить гайд</span>
          </button>
        </div>
      </section>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors border ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-400">
          <span className="shrink-0 flex items-center gap-1.5 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Бренд:
          </span>
          {brands.map((brand) => (
            <button
              key={brand}
              type="button"
              onClick={() => setSelectedBrand(brand)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedBrand === brand
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {brand === 'all' ? 'Все' : brand}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden hover:border-slate-700 transition-colors flex flex-col"
          >
            <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
              <SafeImage
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-black/20 to-transparent" />
            </div>

            <div className="p-5 flex-1 flex flex-col gap-4">
              <div className="space-y-1">
                <div className="text-xs text-slate-400 font-mono tabular-nums">
                  {item.brand} · {item.model} · {item.year} г.
                </div>
                <h2 className="font-bold text-white text-base leading-snug">
                  {item.name}
                </h2>
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-3">
                {item.symptoms.map((symptom) => {
                  const targetGuide =
                    POPULAR_GUIDES.find((g) => g.applianceId === item.id) ||
                    (item.category === 'furniture'
                      ? POPULAR_GUIDES.find((g) => g.id === 'chair-upcycling')
                      : POPULAR_GUIDES[0]);

                  return (
                    <div key={symptom.id} className="space-y-2">
                      <div className="text-xs font-medium text-slate-200 leading-snug">
                        {symptom.title}
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono tabular-nums">
                        <span className="text-emerald-400 font-semibold">
                          Экономия ~{(symptom.masterCost - symptom.partsCost).toLocaleString('ru-RU')} ₽
                        </span>
                        <span>{symptom.timeMinutes} мин</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/repair/${targetGuide?.id || 'lg-wm-filter'}`)}
                        className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                      >
                        <span>Открыть AR-инструкцию</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* User Contributed Guides */}
      {customGuides.length > 0 && (
        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-base font-bold text-white">
            Инструкции сообщества ({customGuides.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customGuides.map((cg) => (
              <div
                key={cg.id}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="text-xs text-slate-400 font-mono tabular-nums">
                  {cg.applianceModel} · {cg.difficulty} · {cg.estimatedTime}
                </div>
                <h3 className="text-sm font-bold text-white">{cg.title}</h3>
                <div className="text-xs text-emerald-400 font-mono tabular-nums">
                  Экономия: {cg.moneySaved.toLocaleString('ru-RU')} ₽ · Автор: {cg.author}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredItems.length === 0 && (
        <div className="p-10 text-center rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <p className="text-slate-300 text-sm">
            Модель не найдена. Сфотографируйте шильдик через камеру для автоматического подбора.
          </p>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            <span>Перейти к сканеру</span>
          </button>
        </div>
      )}
    </div>
  );
};
