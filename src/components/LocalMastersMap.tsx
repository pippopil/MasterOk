import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { MapPin, Star, Clock, MessageSquare, CheckCircle2 } from 'lucide-react';
import { LOCAL_MASTERS } from '../data/mockData';
import { filterLocalMasters, LocalMaster } from '../utils/engine';

interface LocalMastersMapProps {
  onSelectMasterForChat: (master: LocalMaster) => void;
}

export const LocalMastersMap: React.FC<LocalMastersMapProps> = ({
  onSelectMasterForChat,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [selectedMasterId, setSelectedMasterId] = useState<string>(LOCAL_MASTERS[0].id);

  const filteredMasters = useMemo(() => {
    return filterLocalMasters(LOCAL_MASTERS, categoryFilter, onlyAvailable, 0);
  }, [categoryFilter, onlyAvailable]);

  const activeMaster =
    filteredMasters.find((m) => m.id === selectedMasterId) ||
    filteredMasters[0] ||
    LOCAL_MASTERS[0];

  const chartData = useMemo(() => {
    return filteredMasters.map((m) => ({
      name: m.name.split(' ')[0],
      rating: m.rating,
      orders: m.completedOrders,
      visitRub: m.baseVisitRub,
    }));
  }, [filteredMasters]);

  const categories = [
    { id: 'all', label: 'Все мастера' },
    { id: 'washing_machine', label: 'Стиральные машины' },
    { id: 'microwave', label: 'СВЧ и электроника' },
    { id: 'refrigerator', label: 'Холодильники' },
  ];

  return (
    <section
      data-testid="local-masters-section"
      className="space-y-6 border-t border-slate-800 pt-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-cyan-400">
            Локальные мастера рядом · Помощь в сложных случаях
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Карта мастеров по ремонту и рейтинг специалистов
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Выберите проверенного специалиста в вашем районе, сравните рейтинг и среднюю стоимость выезда.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryFilter(cat.id)}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === cat.id
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setOnlyAvailable(!onlyAvailable)}
            className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              onlyAvailable
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
            }`}
          >
            Свободны сейчас
          </button>
        </div>
      </div>

      {/* Interactive District Map + Selected Master Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* District Map Canvas */}
        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-400">
            <span>Схематическая карта районов города</span>
            <span className="font-mono tabular-nums text-slate-300">
              Найдено специалистов: {filteredMasters.length}
            </span>
          </div>

          <div className="relative w-full h-[300px] sm:h-[340px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
            {/* Clean District Grid & Roads SVG */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 w-full h-full opacity-40"
              aria-hidden="true"
            >
              <line x1="0" y1="33" x2="100" y2="33" stroke="#334155" strokeWidth="0.5" />
              <line x1="0" y1="66" x2="100" y2="66" stroke="#334155" strokeWidth="0.5" />
              <line x1="33" y1="0" x2="33" y2="100" stroke="#334155" strokeWidth="0.5" />
              <line x1="66" y1="0" x2="66" y2="100" stroke="#334155" strokeWidth="0.5" />
              <path d="M 8 85 Q 48 45 92 15" fill="none" stroke="#1e293b" strokeWidth="2.5" />
              <path d="M 10 20 Q 52 55 88 80" fill="none" stroke="#1e293b" strokeWidth="2" />
            </svg>

            {/* User Location Marker */}
            <div
              style={{ left: '50%', top: '50%' }}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
            >
              <div className="w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow" />
              <span className="mt-1 text-[10px] font-medium text-slate-300 bg-slate-900/90 px-1.5 py-0.5 rounded">
                Вы здесь
              </span>
            </div>

            {/* Interactive Master Pins */}
            {filteredMasters.map((master) => {
              const isSelected = activeMaster?.id === master.id;
              return (
                <button
                  key={master.id}
                  type="button"
                  onClick={() => setSelectedMasterId(master.id)}
                  style={{ left: `${master.coordinates.x}%`, top: `${master.coordinates.y}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 min-h-[40px] px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-transform ${
                    isSelected
                      ? 'z-20 bg-cyan-500 text-slate-950 border-white scale-105 shadow-lg'
                      : 'z-10 bg-slate-900/95 text-slate-100 border-slate-700 hover:border-cyan-400'
                  }`}
                  aria-label={`Выбрать мастера ${master.name}, рейтинг ${master.rating}`}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono tabular-nums">{master.rating}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Master Details + Recharts Rating Comparison */}
        <div className="lg:col-span-5 flex flex-col gap-4 justify-between">
          {activeMaster && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">
                    {activeMaster.district} район ·{' '}
                    <span className="font-mono tabular-nums">{activeMaster.distanceKm} км</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    {activeMaster.name}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">{activeMaster.specialty}</p>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <div className="flex items-center justify-end gap-1 text-amber-400 font-bold text-sm">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{activeMaster.rating}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {activeMaster.reviewsCount} отзывов
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs border-y border-slate-800 py-3">
                <div>
                  <div className="text-slate-400">Заказов</div>
                  <div className="font-bold font-mono tabular-nums text-white mt-0.5">
                    {activeMaster.completedOrders}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Отклик</div>
                  <div className="font-bold font-mono tabular-nums text-white mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{activeMaster.responseMinutes} мин</span>
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Выезд от</div>
                  <div className="font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                    {activeMaster.baseVisitRub} ₽
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs flex items-center gap-1.5 text-slate-300">
                  <CheckCircle2
                    className={`w-4 h-4 ${
                      activeMaster.availableNow ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  />
                  <span>
                    {activeMaster.availableNow ? 'Готов к выезду сегодня' : 'Занят до завтра'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => onSelectMasterForChat(activeMaster)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Написать мастеру</span>
                </button>
              </div>
            </div>
          )}

          {/* Recharts Visualization of Master Ratings & Orders */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Выполненные заказы и рейтинг</span>
              <span className="text-slate-400">Сравнение мастеров</span>
            </div>
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(value: any, name: any) => [
                      name === 'orders' ? `${value} заказов` : `${value} ★`,
                      name === 'orders' ? 'Заказов' : 'Рейтинг',
                    ]}
                  />
                  <Bar dataKey="orders" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
