import type { ObjectDetection } from '@tensorflow-models/coco-ssd';
import { mapCocoClassToTarget } from '../utils/engine';

export interface DetectionResult {
  label: string;
  labelRu: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  targetMode: 'appliance' | 'upcycling' | 'fridge';
  suggestedGuideId: string;
}

let cachedModel: ObjectDetection | null = null;
let loadingPromise: Promise<ObjectDetection> | null = null;

const ML_TIMEOUT_MS = 2200;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Ленивая загрузка лёгкой модели COCO-SSD (lite_mobilenet_v2) с кэшированием и таймаутом.
 */
export async function loadCocoSsd(): Promise<ObjectDetection> {
  if (cachedModel) return cachedModel;
  if (loadingPromise) return withTimeout(loadingPromise, ML_TIMEOUT_MS, 'TF.js model');

  const initPromise = (async () => {
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    const model = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
    cachedModel = model;
    return model;
  })();

  loadingPromise = initPromise;

  try {
    return await withTimeout(initPromise, ML_TIMEOUT_MS, 'TF.js model');
  } catch (err) {
    loadingPromise = null;
    throw err;
  }
}

/**
 * Выполнение on-device распознавания на базе TensorFlow.js.
 * При превышении лимита времени или отсутствии сети быстро уступает место серверному анализу.
 */
export async function detectObjectOnDevice(imageData: string): Promise<{
  results: DetectionResult[];
  inferenceMs: number;
}> {
  const started = performance.now();

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageData;

    await withTimeout(
      new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Не удалось загрузить изображение для анализа'));
      }),
      ML_TIMEOUT_MS,
      'Image decode'
    );

    const model = await loadCocoSsd();
    const predictions = await withTimeout(model.detect(img), ML_TIMEOUT_MS, 'TF.js detect');

    const relevantLabels = new Set([
      'refrigerator',
      'microwave',
      'oven',
      'toaster',
      'sink',
      'chair',
      'couch',
      'dining table',
      'tv',
      'laptop',
      'bottle',
      'bowl',
      'apple',
      'orange',
      'banana',
    ]);

    const results: DetectionResult[] = predictions
      .filter((p) => relevantLabels.has(p.class) || p.score >= 0.55)
      .map((p) => {
        const mapped = mapCocoClassToTarget(p.class);
        return {
          label: p.class,
          labelRu: mapped.labelRu,
          confidence: p.score,
          bbox: {
            x: p.bbox[0],
            y: p.bbox[1],
            width: p.bbox[2],
            height: p.bbox[3],
          },
          targetMode: mapped.targetMode,
          suggestedGuideId: mapped.suggestedGuideId,
        };
      })
      .sort((a, b) => b.confidence - a.confidence);

    return {
      results,
      inferenceMs: Math.round(performance.now() - started),
    };
  } catch (err) {
    console.warn('On-device TF.js detection unavailable, falling back to server Vision:', err);
    return {
      results: [],
      inferenceMs: Math.round(performance.now() - started),
    };
  }
}
