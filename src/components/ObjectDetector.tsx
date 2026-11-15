import React, { useEffect, useState } from 'react';
import { Camera } from './Camera';
import { SafeImage } from './SafeImage';
import { detectObjectOnDevice, DetectionResult, warmCocoSsd } from '../lib/ml';
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
  MapPin,
} from 'lucide-react';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const VALID_GUIDE_IDS = new Set(POPULAR_GUIDES.map((g) => g.id));

interface ScanOutcome {
  label: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  confidence: number;
  mode: 'appliance' | 'upcycling' | 'fridge';
  guideId: string | null;
  detectedIssues?: string[];
  detectedIngredients?: string[];
  estimatedMasterCost?: number;
  inferenceMs: number;
  detections: DetectionResult[];
  source: string;
  unrecognized?: boolean;
}

export const ObjectDetector: React.FC = () => {
  useEffect(() => {
    warmCocoSsd();
  }, []);
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
      // Быстрый путь для демонстрационных карточек-пресетов
      if (presetHint) {
        const finalOutcome: ScanOutcome = {
          label: presetHint.title,
          brand: presetHint.brand,
          model: presetHint.model,
          year: 2021,
          confidence: 0.94,
          mode: activeMode,
          guideId: activeMode === 'fridge' ? null : presetHint.guideId,
          detectedIssues:
            activeMode === 'appliance'
              ? [
                  'Проверка основного рабочего узла и контактов',
                  'Профилактическая очистка фильтров и корпуса',
                ]
              : undefined,
          estimatedMasterCost: 3200,
          inferenceMs: Math.round(performance.now() - startedAt),
          detections: [],
          source: 'Демонстрационный образец',
        };
        setOutcome(finalOutcome);
        addScanRecord({
          label: finalOutcome.label,
          brand: finalOutcome.brand || undefined,
          model: finalOutcome.model || undefined,
          confidence: finalOutcome.confidence,
          mode: activeMode,
          guideId: finalOutcome.guideId,
        });
        return;
      }

      // Параллельный запуск локального TensorFlow.js COCO-SSD и серверного Vision (Gemini)
      const localMlPromise = detectObjectOnDevice(imageData);
      const serverFetchPromise = fetch(`${API_BASE}/api/analyze-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mode: activeMode }),
      })
        .then(async (r) => {
          const body = await r.json().catch(() => null);
          return { ok: r.ok, body };
        })
        .catch(() => ({ ok: false, body: null }));

      const serverRes = await serverFetchPromise;
      const json = serverRes.body;
      const hasRealGemini =
        serverRes.ok && json?.success === true && json?.source === 'gemini' && json?.data;
      const serverData = hasRealGemini ? json.data : null;

      // Если серверный Gemini Vision уже дал точный ответ, даём локальному TF.js до 600 мс на дообогащение;
      // при офлайне или недоступности сервера ждём полный результат COCO-SSD.
      const localMl = hasRealGemini
        ? await Promise.race([
            localMlPromise,
            new Promise<{ results: DetectionResult[]; inferenceMs: number }>((resolve) =>
              setTimeout(() => resolve({ results: [], inferenceMs: 0 }), 600)
            ),
          ])
        : await localMlPromise;
      const topLocal = localMl.results[0];

      const totalMs = Math.round(performance.now() - startedAt);

      if (!serverData && !topLocal) {
        setLowConfidenceWarning(true);
        setOutcome({
          label: 'Объект не распознан автоматически',
          confidence: 0,
          mode: activeMode,
          guideId: null,
          inferenceMs: totalMs,
          detections: [],
          source: json?.error || 'Попробуйте сделать более чёткое фото при хорошем освещении',
          unrecognized: true,
        });
        return;
      }

      const rawServerTitle = serverData?.title || serverData?.itemType || null;
      const label = rawServerTitle || topLocal?.labelRu || 'Распознанный объект';

      const confidence = serverData
        ? Math.max(
            Number(serverData.confidence) || 0.8,
            topLocal ? topLocal.confidence : 0
          )
        : topLocal?.confidence || 0.55;

      const rawGuideId =
        serverData?.suggestedGuideId ?? topLocal?.suggestedGuideId ?? null;
      const guideId =
        typeof rawGuideId === 'string' && VALID_GUIDE_IDS.has(rawGuideId)
          ? rawGuideId
          : null;

      const detectedCategory = String(serverData?.category || '').toLowerCase();
      const inferredMode: 'appliance' | 'upcycling' | 'fridge' =
        detectedCategory === 'food' || detectedCategory === 'refrigerator'
          ? 'fridge'
          : detectedCategory === 'furniture'
          ? 'upcycling'
          : serverData
          ? activeMode
          : topLocal?.targetMode || activeMode;

      if (confidence < 0.7) {
        setLowConfidenceWarning(true);
      }

      const finalOutcome: ScanOutcome = {
        label,
        brand: serverData?.brand || null,
        model: serverData?.model || null,
        year: serverData?.year || null,
        confidence,
        mode: inferredMode,
        guideId,
        detectedIssues: Array.isArray(serverData?.detectedIssues)
          ? serverData.detectedIssues
          : undefined,
        detectedIngredients: Array.isArray(serverData?.detectedIngredients)
          ? serverData.detectedIngredients
          : undefined,
        estimatedMasterCost: serverData?.estimatedMasterCost,
        inferenceMs: totalMs,
        detections: localMl.results,
        source: serverData
          ? topLocal
            ? 'Gemini Vision + TensorFlow.js'
            : 'Gemini Vision'
          : 'TensorFlow.js COCO-SSD (локально)',
      };

      setOutcome(finalOutcome);

      addScanRecord({
        label: finalOutcome.label,
        brand: finalOutcome.brand || undefined,
        model: finalOutcome.model || undefined,
        confidence: finalOutcome.confidence,
        mode: finalOutcome.mode,
        guideId: finalOutcome.guideId,
      });

      fetch(`${API_BASE}/api/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: finalOutcome.label,
          brand: finalOutcome.brand || undefined,
          model: finalOutcome.model || undefined,
          year: finalOutcome.year || undefined,
          confidence: finalOutcome.confidence,
        }),
      }).catch(() => {});
    } catch {
      setLowConfidenceWarning(true);
      setOutcome({
        label: 'Не удалось завершить распознавание',
        confidence: 0,
        mode: activeMode,
        guideId: null,
        inferenceMs: Math.round(performance.now() - startedAt),
        detections: [],
        source: 'Ошибка анализа — выберите модель вручную ниже',
        unrecognized: true,
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
                  <span
                    className={`flex items-center gap-1.5 font-medium ${
                      outcome.unrecognized ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {outcome.unrecognized ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {outcome.unrecognized ? 'Требуется уточнение' : 'Объект распознан'}
                  </span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {outcome.confidence > 0 ? `${Math.round(outcome.confidence * 100)}% · ` : ''}
                    {outcome.inferenceMs} мс
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">{outcome.label}</h2>
                <p className="text-xs text-slate-400">
                  Источник: {outcome.source}
                  {outcome.brand ? ` · ${outcome.brand}` : ''}
                  {outcome.model ? ` ${outcome.model}` : ''}
                </p>
                {outcome.detections.length > 0 && (
                  <p className="text-[11px] text-slate-400">
                    TF.js объекты в кадре:{' '}
                    {outcome.detections
                      .slice(0, 3)
                      .map((d) => `${d.labelRu} (${Math.round(d.confidence * 100)}%)`)
                      .join(', ')}
                  </p>
                )}
              </div>

              {outcome.detectedIngredients && outcome.detectedIngredients.length > 0 && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <div className="text-xs font-semibold text-slate-300">
                    Найденные продукты
                  </div>
                  <p className="text-xs text-emerald-300 leading-relaxed">
                    {outcome.detectedIngredients.join(' · ')}
                  </p>
                </div>
              )}

              {outcome.detectedIssues && outcome.detectedIssues.length > 0 && (
                <div className="space-y-2 border-t border-slate-800 pt-4">
                  <div className="text-xs font-semibold text-slate-300">
                    Возможные неисправности и проверки
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {outcome.detectedIssues.map((issue, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-2 py-1 border-b border-slate-800/60 last:border-b-0">
                        <span>{issue}</span>
                        {outcome.estimatedMasterCost ? (
                          <span className="text-emerald-400 font-mono tabular-nums shrink-0">
                            ~{outcome.estimatedMasterCost} ₽
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action choices: matching 3D AR guide or contextual mode routing */}
              <div className="space-y-2.5 pt-2">
                {outcome.guideId ? (
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
                ) : outcome.mode === 'fridge' ? (
                  <button
                    type="button"
                    onClick={() => navigate('/recipes')}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ChefHat className="w-4 h-4" />
                      <span>Подобрать рецепты по фото</span>
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : outcome.mode === 'upcycling' ? (
                  <button
                    type="button"
                    onClick={() => navigate('/upcycle')}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Leaf className="w-4 h-4" />
                      <span>Идеи апсайклинга для объекта</span>
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/masters')}
                    className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>Консультация инженера по этому объекту</span>
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

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
