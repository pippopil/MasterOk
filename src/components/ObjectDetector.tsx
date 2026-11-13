import React, { useState } from 'react';
import { Camera } from './Camera';
import { SafeImage } from './SafeImage';
import { detectObjectOnDevice, DetectionResult } from '../lib/ml';
import { APP_IMAGES, POPULAR_GUIDES } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import {
  ScanLine,
  Wrench,
  Leaf,
  ChefHat,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface ScanOutcome {
  label: string;
  brand?: string;
  model?: string;
  year?: number;
  confidence: number;
  mode: 'appliance' | 'upcycling' | 'fridge';
  guideId: string;
  detectedIssues?: string[];
  estimatedMasterCost?: number;
  inferenceMs: number;
  detections: DetectionResult[];
  source: string;
}

export const ObjectDetector: React.FC = () => {
  const navigate = useAppStore((s) => s.navigate);
  const addScanRecord = useAppStore((s) => s.addScanRecord);

  const [mode, setMode] = useState<'appliance' | 'upcycling' | 'fridge'>('appliance');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraErrorMsg, setCameraErrorMsg] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [lowConfidenceWarning, setLowConfidenceWarning] = useState(false);

  const presets = [
    {
      id: 'preset-wm',
      title: 'Стиральная машина LG',
      subtitle: 'Бытовая техника · Засор фильтра',
      mode: 'appliance' as const,
      image: APP_IMAGES.washing,
      guideId: 'lg-wm-filter',
      brand: 'LG',
      model: 'F1296ND3',
    },
    {
      id: 'preset-mw',
      title: 'Микроволновка Samsung',
      subtitle: 'Бытовая техника · Предохранитель',
      mode: 'appliance' as const,
      image: APP_IMAGES.microwave,
      guideId: 'samsung-mw-fuse',
      brand: 'Samsung',
      model: 'MS23K3513AS',
    },
    {
      id: 'preset-chair',
      title: 'Венский стул (бук)',
      subtitle: 'Мебель · Идеи апсайклинга',
      mode: 'upcycling' as const,
      image: APP_IMAGES.chairBefore,
      guideId: 'chair-upcycling',
      brand: 'DIY',
      model: 'Bentwood',
    },
    {
      id: 'preset-fridge',
      title: 'Продукты в холодильнике',
      subtitle: 'Кухня · Рецепты Zero-Waste',
      mode: 'fridge' as const,
      image: APP_IMAGES.fridge,
      guideId: 'lg-wm-filter',
      brand: 'Холодильник',
      model: 'Полки с продуктами',
    },
  ];

  const runDetectionPipeline = async (
    imageData: string,
    activeMode: 'appliance' | 'upcycling' | 'fridge',
    presetHint?: (typeof presets)[0]
  ) => {
    setCapturedImage(imageData);
    setIsAnalyzing(true);
    setOutcome(null);
    setLowConfidenceWarning(false);

    const startedAt = performance.now();

    try {
      // 1. Параллельный запуск локального инференса TensorFlow.js (с таймаутом) и серверного анализа
      const serverFetchPromise = fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mode: activeMode }),
      }).then((r) => r.json());

      const localMlPromise = presetHint
        ? Promise.resolve({ results: [] as DetectionResult[], inferenceMs: 0 })
        : detectObjectOnDevice(imageData);

      const [localMl, json] = await Promise.all([localMlPromise, serverFetchPromise]);
      const topLocal = localMl.results[0];
      const serverData = json?.data || {};

      const confidence =
        presetHint
          ? 0.94
          : topLocal
          ? Math.max(topLocal.confidence, Number(serverData.confidence) || 0.78)
          : Number(serverData.confidence) || 0.65;

      const label =
        presetHint?.title ||
        serverData.title ||
        serverData.itemType ||
        topLocal?.labelRu ||
        (activeMode === 'fridge' ? 'Продукты в холодильнике' : 'Бытовая техника');

      const guideId =
        presetHint?.guideId ||
        serverData.suggestedGuideId ||
        topLocal?.suggestedGuideId ||
        'lg-wm-filter';

      const totalMs = Math.round(performance.now() - startedAt);

      if (confidence < 0.7) {
        setLowConfidenceWarning(true);
      }

      const finalOutcome: ScanOutcome = {
        label,
        brand: presetHint?.brand || serverData.brand,
        model: presetHint?.model || serverData.model,
        year: serverData.year || 2021,
        confidence,
        mode: activeMode,
        guideId,
        detectedIssues: serverData.detectedIssues || [
          'Проверка основного узла и креплений',
          'Профилактическая очистка элементов',
        ],
        estimatedMasterCost: serverData.estimatedMasterCost || 3200,
        inferenceMs: totalMs,
        detections: localMl.results,
        source: topLocal ? 'TensorFlow.js + Server Vision' : 'Server Vision',
      };

      setOutcome(finalOutcome);

      // Сохранить в историю сканирований (Zustand) и отправить на /api/objects
      addScanRecord({
        label: finalOutcome.label,
        brand: finalOutcome.brand,
        model: finalOutcome.model,
        confidence: finalOutcome.confidence,
        mode: activeMode,
        guideId: finalOutcome.guideId,
      });

      fetch('/api/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: finalOutcome.label,
          brand: finalOutcome.brand,
          model: finalOutcome.model,
          year: finalOutcome.year,
          confidence: finalOutcome.confidence,
        }),
      }).catch(() => {});
    } catch {
      setLowConfidenceWarning(true);
      setOutcome({
        label: presetHint?.title || 'Объект распознан (ручное подтверждение)',
        confidence: 0.68,
        mode: activeMode,
        guideId: presetHint?.guideId || 'lg-wm-filter',
        inferenceMs: Math.round(performance.now() - startedAt),
        detections: [],
        source: 'Офлайн-режим',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setOutcome(null);
    setLowConfidenceWarning(false);
    setCameraErrorMsg(null);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-2 max-w-2xl">
          <div className="text-xs font-medium text-cyan-400">
            Модуль распознавания · WebRTC + TensorFlow.js
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
            Сканирование техники, мебели и продуктов
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Сделайте фото через камеру браузера или выберите тестовый снимок. При точности ниже 70% доступен быстрый ручной выбор модели.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start md:self-auto">
          <button
            type="button"
            onClick={() => setMode('appliance')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'appliance'
                ? 'bg-cyan-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Техника
          </button>
          <button
            type="button"
            onClick={() => setMode('upcycling')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'upcycling'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Мебель
          </button>
          <button
            type="button"
            onClick={() => setMode('fridge')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              mode === 'fridge'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Холодильник
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Camera / Captured Image */}
        <div className="lg:col-span-7 space-y-4">
          {!capturedImage ? (
            <Camera
              onCapture={(img) => runDetectionPipeline(img, mode)}
              onError={(err) => setCameraErrorMsg(err.message)}
            />
          ) : (
            <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
              <SafeImage
                src={capturedImage}
                alt="Снимок объекта"
                className="w-full h-full object-cover"
              />
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <ScanLine className="w-8 h-8 text-cyan-400 animate-pulse" />
                  <div className="text-sm font-semibold text-white">
                    Распознавание объекта (TensorFlow.js COCO-SSD)...
                  </div>
                  <div className="text-xs text-slate-400">
                    Анализ категории, модели и возможных неисправностей
                  </div>
                </div>
              )}
              {!isAnalyzing && (
                <button
                  type="button"
                  onClick={resetScanner}
                  className="absolute top-3 right-3 min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Переснять</span>
                </button>
              )}
            </div>
          )}

          {cameraErrorMsg && !capturedImage && (
            <p className="text-xs text-amber-400">
              Примечание: {cameraErrorMsg}. Используйте загрузку фото или готовые тестовые снимки справа.
            </p>
          )}
        </div>

        {/* Right: Detection Outcome & Action Routing (Repair / Upcycling / Recipes) */}
        <div className="lg:col-span-5 space-y-5">
          {outcome ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              {lowConfidenceWarning && (
                <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Уверенность ниже 70% — проверьте распознанный объект или выберите модель вручную из списка ниже.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    Объект распознан
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {Math.round(outcome.confidence * 100)}% · {outcome.inferenceMs} мс
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{outcome.label}</h2>
                <p className="text-xs text-slate-400">
                  Источник: {outcome.source}
                  {outcome.brand ? ` · ${outcome.brand}` : ''}
                  {outcome.model ? ` ${outcome.model}` : ''}
                </p>
              </div>

              {outcome.detectedIssues && outcome.mode === 'appliance' && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <div className="text-xs font-semibold text-slate-300">
                    Вероятные неисправности
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {outcome.detectedIssues.map((issue, idx) => (
                      <li key={idx} className="flex items-center justify-between py-1 border-b border-slate-800/60 last:border-b-0">
                        <span>{issue}</span>
                        <span className="text-emerald-400 font-mono tabular-nums">
                          ~{outcome.estimatedMasterCost} ₽ экономии
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action choices: Repair / Upcycling / Fridge */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/repair/${outcome.guideId}`)}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    <span>Открыть AR-инструкцию по ремонту</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => navigate('/upcycle')}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <Leaf className="w-3.5 h-3.5 text-amber-400" />
                    <span>5 идей апсайклинга</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/recipes')}
                    className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Рецепты из еды</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white">
                  Тестовые образцы для быстрой проверки
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Нажмите на любой снимок, чтобы запустить распознавание и перейти к AR-инструкции или рецептам.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setMode(preset.mode);
                      runDetectionPipeline(preset.image, preset.mode, preset);
                    }}
                    className="group p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition-colors flex flex-col gap-2"
                  >
                    <div className="w-full h-24 rounded-lg overflow-hidden bg-slate-900">
                      <SafeImage
                        src={preset.image}
                        alt={preset.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white line-clamp-1">
                        {preset.title}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1">
                        {preset.subtitle}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Fallback Selector (ТЗ Risk 2 Mitigation) */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="text-xs font-semibold text-slate-300">
              Ручной выбор модели (если камера недоступна)
            </div>
            <div className="flex flex-col divide-y divide-slate-800">
              {POPULAR_GUIDES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => navigate(`/repair/${g.id}`)}
                  className="py-2.5 text-left flex items-center justify-between gap-3 hover:text-cyan-400 transition-colors"
                >
                  <span className="text-xs font-medium text-slate-200 line-clamp-1">
                    {g.title}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                    {g.estimatedTime}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
