import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Crown, Check, History, Heart, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { buildCumulativeSavingsSeries } from '../utils/engine';
import { ZERO_WASTE_RECIPES } from '../data/mockData';

export const ProfileDashboard: React.FC = () => {
  const navigate = useAppStore((s) => s.navigate);
  const isPremium = useAppStore((s) => s.isPremium);
  const setPremium = useAppStore((s) => s.setPremium);
  const savingsHistory = useAppStore((s) => s.savingsHistory);
  const totalSavedRub = useAppStore((s) => s.totalSavedRub);
  const totalCo2SavedKg = useAppStore((s) => s.totalCo2SavedKg);
  const completedRepairsCount = useAppStore((s) => s.completedRepairsCount);
  const scanHistory = useAppStore((s) => s.scanHistory);
  const savedIdeas = useAppStore((s) => s.savedIdeas);
  const savedRecipeIds = useAppStore((s) => s.savedRecipeIds);

  const [chartMetric, setChartMetric] = useState<'money' | 'eco'>('money');

  const chartSeries = useMemo(() => {
    return buildCumulativeSavingsSeries(savingsHistory);
  }, [savingsHistory]);

  const savedRecipes = ZERO_WASTE_RECIPES.filter((r) => savedRecipeIds.includes(r.id));

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-emerald-400">
            Профиль мастера · Экология и семейный бюджет
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Накопленная экономия и история проектов
          </h1>
          <p className="text-sm text-slate-400">
            Отслеживайте динамику сэкономленных средств, предотвращённые выбросы CO₂ и сохранённые идеи.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPremium(!isPremium)}
          className={`min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 border ${
            isPremium
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-amber-500 hover:bg-amber-400 border-amber-400 text-slate-950'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>{isPremium ? 'МастерОК PRO активен' : 'Подключить PRO · 299 ₽/мес'}</span>
        </button>
      </section>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Сэкономлено на ремонте</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-emerald-400">
            {totalSavedRub.toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-xs text-slate-500">В сравнении с вызовом сервисных центров</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Вклад в экологию (CO₂)</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-cyan-400">
            {totalCo2SavedKg} кг
          </div>
          <div className="text-xs text-slate-500">Предотвращено углеродного следа</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400">Завершено проектов</div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
            {completedRepairsCount}
          </div>
          <div className="text-xs text-slate-500">Техника и мебель получили вторую жизнь</div>
        </div>
      </div>

      {/* Recharts Cumulative Savings & Eco Contribution Charts */}
      <section
        data-testid="savings-chart-section"
        className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">
              Динамика экономии и эко-вклада
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Накопительный итог по месяцам (данные обновляются после завершения каждой инструкции)
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start">
            <button
              type="button"
              onClick={() => setChartMetric('money')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                chartMetric === 'money'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Бюджет (₽)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('eco')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                chartMetric === 'eco'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Экология (CO₂ кг)
            </button>
          </div>
        </div>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            {chartMetric === 'money' ? (
              <AreaChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: any) => [
                    `${Number(value).toLocaleString('ru-RU')} ₽`,
                    name === 'cumulativeRub' ? 'Накоплено всего' : 'За месяц',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeRub"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#savingsFill)"
                />
              </AreaChart>
            ) : (
              <BarChart data={chartSeries} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value: any, name: any) => [
                    `${value} кг CO₂`,
                    name === 'cumulativeCo2Kg' ? 'Всего предотвращено' : 'За месяц',
                  ]}
                />
                <Bar dataKey="cumulativeCo2Kg" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </section>

      {/* History & Saved Ideas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Scan History */}
        <section className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>История сканирований</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">{scanHistory.length}</span>
          </div>

          <div className="divide-y divide-slate-800">
            {scanHistory.map((item) => (
              <div
                key={item.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-400 font-mono tabular-nums">
                    Точность {Math.round(item.confidence * 100)}% · {item.timestamp}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/repair/${item.guideId}`)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-cyan-400 flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <span>Открыть</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Saved Upcycling Ideas & Recipes */}
        <section className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" />
              <span>Сохранённые идеи и рецепты</span>
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {savedIdeas.length + savedRecipes.length}
            </span>
          </div>

          {savedIdeas.length === 0 && savedRecipes.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400">
              Пока нет сохранённых идей. Добавьте понравившиеся проекты в разделе «Апсайклинг».
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {savedIdeas.map((idea) => (
                <div key={idea.id} className="py-3 first:pt-0 space-y-1">
                  <div className="text-xs text-amber-400">Апсайклинг · {idea.objectLabel}</div>
                  <div className="text-sm font-semibold text-white">{idea.title}</div>
                  <div className="text-xs text-slate-400 line-clamp-2">{idea.description}</div>
                </div>
              ))}
              {savedRecipes.map((rec) => (
                <div key={rec.id} className="py-3 last:pb-0 space-y-1">
                  <div className="text-xs text-emerald-400">Рецепт · {rec.cookingTimeMinutes} мин</div>
                  <div className="text-sm font-semibold text-white">{rec.title}</div>
                </div>
              ))}
            </div>
          )}

          {/* PRO perks summary */}
          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-white">Преимущества МастерОК PRO</div>
            <div className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Офлайн 3D-инструкции и приоритетная линия мастеров</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
