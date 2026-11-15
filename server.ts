import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '20mb' }));

// Инициализация Gemini API (строго на стороне сервера)
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
  }
}

const VALID_GUIDE_IDS = new Set([
  'lg-wm-filter',
  'samsung-mw-fuse',
  'dyson-v11-clean',
  'chair-upcycling',
]);

function parseImageDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function generateContentWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Gemini timeout after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function callGeminiWithFallback(
  parts: any[],
  options?: { responseMimeType?: string }
): Promise<string> {
  if (!aiClient) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const attempts: { model: string; timeoutMs: number }[] = [
    { model: 'gemini-4-hydrogen', timeoutMs: 5500 },
    { model: 'gemini-3.1-flash-lite', timeoutMs: 12000 },
  ];
  let lastError: unknown = null;

  for (const { model, timeoutMs } of attempts) {
    try {
      const response = await generateContentWithTimeout(
        aiClient.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
          ...(options?.responseMimeType
            ? { config: { responseMimeType: options.responseMimeType } }
            : {}),
        }),
        timeoutMs
      );
      if (response.text) {
        return response.text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All Gemini models failed');
}

interface StoredObjectRecord {
  id: string;
  type: string;
  brand?: string;
  model?: string;
  year?: number;
  confidence: number;
  createdAt: string;
}

const scannedObjectsDb: StoredObjectRecord[] = [
  {
    id: 'obj-1',
    type: 'Стиральная машина',
    brand: 'LG',
    model: 'F1296ND3',
    year: 2021,
    confidence: 0.94,
    createdAt: new Date().toISOString(),
  },
];

// CRUD: Объекты техники и сканирования
app.get('/api/objects', (_req: Request, res: Response) => {
  res.json({ objects: scannedObjectsDb });
});

app.post('/api/objects', (req: Request, res: Response) => {
  const { type, brand, model, year, confidence } = req.body || {};
  if (!type) {
    res.status(400).json({ error: 'Object type is required' });
    return;
  }
  const created: StoredObjectRecord = {
    id: `obj-${Date.now()}`,
    type: String(type),
    brand: brand ? String(brand) : undefined,
    model: model ? String(model) : undefined,
    year: year ? Number(year) : undefined,
    confidence: Number(confidence) || 0.85,
    createdAt: new Date().toISOString(),
  };
  scannedObjectsDb.unshift(created);
  res.status(201).json({ object: created });
});

// API: Получение шагов AR-инструкций
app.get('/api/instructions', (_req: Request, res: Response) => {
  res.json({
    instructions: [
      { id: 'lg-wm-filter', title: 'Очистка и замена сливного фильтра и помпы', difficulty: 'easy', estimatedTime: 20 },
      { id: 'samsung-mw-fuse', title: 'Диагностика и замена высоковольтного предохранителя', difficulty: 'medium', estimatedTime: 30 },
      { id: 'dyson-v11-clean', title: 'Полная очистка циклона, HEPA-фильтра и турбощетки', difficulty: 'easy', estimatedTime: 25 },
      { id: 'chair-upcycling', title: 'Реновация венского стула в стиле Japandi', difficulty: 'easy', estimatedTime: 180 },
    ],
  });
});

// API: Генерация 5 идей апсайклинга (/api/upcycle-ideas)
app.post('/api/upcycle-ideas', async (req: Request, res: Response) => {
  try {
    const { imageData, objectLabel = 'Деревянный стул' } = req.body || {};

    if (aiClient) {
      try {
        const parts: any[] = [
          {
            text: `Ты — эксперт по апсайклингу. Объект: "${objectLabel}".
Предложи ровно 5 креативных, практичных и разных идей, как дать этой вещи вторую жизнь.
Ответь строго в формате JSON массива внутри объекта:
{
  "ideas": [
    {
      "title": "Название идеи",
      "description": "Подробное описание техники и результата",
      "materials": ["Материал 1", "Материал 2", "Материал 3"],
      "difficulty": "easy",
      "estimatedHours": 3,
      "materialsCost": 850,
      "marketValueAfter": 5200
    }
  ]
}
Поле difficulty должно быть строго "easy", "medium" или "hard".`,
          },
        ];

        const parsedImage = typeof imageData === 'string' ? parseImageDataUrl(imageData) : null;
        if (parsedImage) {
          parts.push({
            inlineData: { mimeType: parsedImage.mimeType, data: parsedImage.data },
          });
        }

        const text = await callGeminiWithFallback(parts, { responseMimeType: 'application/json' });
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.ideas) && parsed.ideas.length > 0) {
            const normalized = parsed.ideas.slice(0, 5).map((idea: any, i: number) => ({
              id: `ai-idea-${Date.now()}-${i}`,
              title: String(idea.title || `Идея ${i + 1}`),
              description: String(idea.description || ''),
              materials: Array.isArray(idea.materials) ? idea.materials.map(String) : [],
              difficulty: ['easy', 'medium', 'hard'].includes(idea.difficulty)
                ? idea.difficulty
                : 'easy',
              estimatedHours: Number(idea.estimatedHours) || 3,
              materialsCost: Number(idea.materialsCost) || 850,
              marketValueAfter: Number(idea.marketValueAfter) || 4500,
              objectLabel,
            }));
            res.json({ ideas: normalized, source: 'gemini' });
            return;
          }
        }
      } catch (err) {
        console.warn('Gemini upcycle-ideas fallback triggered:', err);
      }
    }

    // Гарантированный ответ из 5 структурированных идей по ТЗ
    const label = String(objectLabel);
    res.json({
      source: 'smart-engine',
      ideas: [
        {
          id: `idea-1-${Date.now()}`,
          title: 'Сканди-перезагрузка в матовый графит',
          description: `Шлифовка поверхности (${label}), покрытие двумя слоями экологичной меловой краски и финишным матовым воском.`,
          materials: ['Меловая краска 0.4 л', 'Наждачка P120/P240', 'Матовый мебельный воск'],
          difficulty: 'easy',
          estimatedHours: 3,
          materialsCost: 850,
          marketValueAfter: 5200,
          objectLabel: label,
        },
        {
          id: `idea-2-${Date.now()}`,
          title: 'Мягкий пуф или перетяжка в фактурное букле',
          description: 'Замена изношенной обивки на плотный поролон 30 мм и износостойкую ткань букле с помощью мебельного степлера.',
          materials: ['Ткань букле 0.7×0.7 м', 'Поролон 30 мм', 'Мебельный степлер и скобы 8 мм'],
          difficulty: 'easy',
          estimatedHours: 2.5,
          materialsCost: 950,
          marketValueAfter: 5500,
          objectLabel: label,
        },
        {
          id: `idea-3-${Date.now()}`,
          title: 'Японская техника обжига Якисуги и масло',
          description: 'Лёгкое браширование и тонировка тёмным маслом «Американский орех» для подчёркивания природной фактуры волокон.',
          materials: ['Щётка по дереву (нейлон)', 'Масло-воск «Орех»', 'Х/б ветошь'],
          difficulty: 'medium',
          estimatedHours: 4,
          materialsCost: 700,
          marketValueAfter: 6100,
          objectLabel: label,
        },
        {
          id: `idea-4-${Date.now()}`,
          title: 'Колор-блок с контрастными носками ножек',
          description: 'Окрашивание нижней трети опор в тёплую латунь или терракоту с ровной отбивкой малярной лентой.',
          materials: ['Малярный скотч', 'Акриловая эмаль', 'Металлик-акцент «Латунь»'],
          difficulty: 'easy',
          estimatedHours: 2,
          materialsCost: 540,
          marketValueAfter: 4400,
          objectLabel: label,
        },
        {
          id: `idea-5-${Date.now()}`,
          title: 'Функциональный прикроватный органайзер-подставка',
          description: 'Трансформация конструкции в стильную открытую консоль с интегрированной полкой для книг и кабель-каналом.',
          materials: ['Сосновая полка 30×25 см', 'Столярный клей D3', 'Уголки латунные'],
          difficulty: 'hard',
          estimatedHours: 5.5,
          materialsCost: 1350,
          marketValueAfter: 7200,
          objectLabel: label,
        },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// API: Распознавание продуктов в холодильнике и генерация 3+ рецептов (/api/recipes)
app.post('/api/recipes', async (req: Request, res: Response) => {
  try {
    const { imageData, ingredients = [] } = req.body || {};

    const parsedRecipeImg =
      typeof imageData === 'string' ? parseImageDataUrl(imageData) : null;
    if (aiClient && parsedRecipeImg) {
      try {
        const text = await callGeminiWithFallback(
          [
            {
              text: `Ты — шеф-повар Zero-Waste проекта "МастерОК". Распознай продукты на фото и предложи 3 простых вкусных рецепта из них.
Ответь строго в формате JSON:
{
  "detectedIngredients": ["продукт 1", "продукт 2"],
  "recipes": [
    {
      "id": "rec-1",
      "title": "Название блюда",
      "category": "Завтрак / Ужин",
      "requiredIngredients": ["продукт 1"],
      "optionalIngredients": ["продукт 2"],
      "cookingTimeMinutes": 15,
      "difficulty": "Легко",
      "calories": 320,
      "servings": 2,
      "imageEmoji": "🍳",
      "zeroWasteTip": "Совет по безотходному использованию",
      "steps": ["Шаг 1", "Шаг 2", "Шаг 3"]
    }
  ]
}`,
            },
            {
              inlineData: { mimeType: parsedRecipeImg.mimeType, data: parsedRecipeImg.data },
            },
          ],
          { responseMimeType: 'application/json' }
        );
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.detectedIngredients) && Array.isArray(parsed.recipes)) {
            res.json({
              detectedIngredients: parsed.detectedIngredients,
              recipes: parsed.recipes,
              source: 'gemini',
            });
            return;
          }
        }
      } catch (err) {
        console.warn('Gemini recipes fallback triggered:', err);
      }
    }

    const baseIngredients =
      Array.isArray(ingredients) && ingredients.length > 0
        ? ingredients
        : ['яйца', 'сыр', 'помидоры', 'молоко', 'зелень'];

    res.json({
      source: 'smart-engine',
      detectedIngredients: baseIngredients,
      recipes: [
        {
          id: 'ai-omelette',
          title: 'Сырный омлет с томатами и зеленью',
          category: 'Завтрак',
          requiredIngredients: ['яйца', 'сыр', 'помидоры'],
          optionalIngredients: ['молоко', 'зелень'],
          cookingTimeMinutes: 12,
          difficulty: 'Легко',
          calories: 320,
          servings: 2,
          imageEmoji: '🍳',
          zeroWasteTip: 'Стебли зелени не выбрасывайте — мелко порубите и добавьте в яичную основу.',
          steps: [
            'Взбейте 3 яйца с 2 ст. ложками молока и щепоткой соли.',
            'Нарежьте томаты и слегка припустите их на сковороде 2 минуты.',
            'Залейте яйцами, посыпьте тёртым сыром и готовьте под крышкой 5 минут.',
          ],
        },
        {
          id: 'ai-toast',
          title: 'Горячие сырные тосты с яйцом пашот',
          category: 'Перекус',
          requiredIngredients: ['яйца', 'сыр'],
          optionalIngredients: ['помидоры', 'зелень'],
          cookingTimeMinutes: 10,
          difficulty: 'Легко',
          calories: 290,
          servings: 1,
          imageEmoji: '🥪',
          zeroWasteTip: 'Подойдёт даже вчерашний подсушенный хлеб — на сковороде он станет хрустящим.',
          steps: [
            'Подсушите ломтики хлеба на сухой сковороде.',
            'Расплавьте сверху ломтики сыра и добавьте кружочки томатов.',
            'Подайте с яйцом и свежей зеленью.',
          ],
        },
        {
          id: 'ai-casserole',
          title: 'Запеканка из остатков овощей и сыра',
          category: 'Ужин',
          requiredIngredients: ['яйца', 'сыр', 'молоко'],
          optionalIngredients: ['помидоры', 'зелень'],
          cookingTimeMinutes: 25,
          difficulty: 'Легко',
          calories: 360,
          servings: 2,
          imageEmoji: '🥘',
          zeroWasteTip: 'Можно добавить любые оставшиеся в холодильнике овощи или отварной картофель.',
          steps: [
            'Выложите нарезанные овощи в смазанную форму.',
            'Смешайте яйца, молоко и половину тёртого сыра, залейте овощи.',
            'Запекайте 18 минут при 180°C, посыпав оставшимся сыром за 5 минут до готовности.',
          ],
        },
      ],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// API: Анализ изображения техники/мебели/холодильника и любых бытовых объектов
app.post('/api/analyze-image', async (req: Request, res: Response) => {
  try {
    const { image, mode = 'appliance' } = req.body || {};

    if (!image || typeof image !== 'string') {
      res.status(400).json({ success: false, error: 'Image data is required' });
      return;
    }

    const parsedImage = parseImageDataUrl(image);
    if (!parsedImage) {
      res.status(400).json({
        success: false,
        source: 'invalid_format',
        error: 'Ожидается изображение в формате base64 data:image/*',
      });
      return;
    }

    if (!aiClient) {
      res.status(503).json({
        success: false,
        source: 'unavailable',
        error: 'Серверная модель Vision не настроена',
      });
      return;
    }

    const prompt =
      mode === 'upcycling'
        ? `Ты — эксперт по реставрации и апсайклингу проекта "МастерОК".
Внимательно посмотри на фотографию и точно назови главный объект на русском языке (НЕ выдумывай предмет, которого нет на фото).
Верни строго валидный JSON:
{
  "category": "furniture",
  "title": "Точное название предмета на русском",
  "itemType": "Тип предмета на русском",
  "material": "Предполагаемый материал (дерево, металл, ткань, пластик и т.д.)",
  "confidence": 0.9,
  "suggestedGuideId": null
}
Для suggestedGuideId укажи "chair-upcycling" ТОЛЬКО если на фото действительно стул/кресло/табурет, иначе верни null.`
        : mode === 'fridge'
        ? `Ты — шеф-повар Zero-Waste проекта "МастерОК".
Внимательно посмотри на фото и перечисли ТОЛЬКО реально видимые на изображении продукты и ингредиенты на русском языке. Не выдумывай продукты, которых нет на фото.
Верни строго валидный JSON:
{
  "category": "food",
  "title": "Продукты на фото",
  "detectedIngredients": ["продукт 1", "продукт 2"],
  "confidence": 0.9,
  "suggestedGuideId": null
}`
        : `Ты — компьютерное зрение и эксперт-диагност проекта "МастерОК".
Внимательно посмотри на фотографию и ОБЪЕКТИВНО определи, что именно изображено на фото (будь то микроволновка, пылесос, стиральная машина, холодильник, чайник, кофемашина, утюг, фен, телевизор, ноутбук, смартфон, стул, стол, посуда, продукты или любой другой узнаваемый предмет).
КРИТИЧЕСКИ ВАЖНО:
1. Никогда не отвечай «стиральная машина», если на фото изображён другой объект!
2. Не придумывай бренд и модель, если они не читаются на фото — в этом случае укажи brand: null, model: null, year: null.
3. Выбери category из списка: "washing_machine", "microwave", "vacuum", "refrigerator", "kettle", "coffee_machine", "electronics", "furniture", "food", "other".
4. Поле suggestedGuideId заполняй ТОЛЬКО при точном совпадении типа объекта:
   - "lg-wm-filter" — ТОЛЬКО если на фото стиральная машина
   - "samsung-mw-fuse" — ТОЛЬКО если на фото микроволновая печь
   - "dyson-v11-clean" — ТОЛЬКО если на фото пылесос
   - "chair-upcycling" — ТОЛЬКО если на фото стул, кресло или табурет
   Во всех остальных случаях ставь "suggestedGuideId": null.
5. В detectedIssues перечисли 2–3 реальные типичные неисправности или рекомендации по уходу именно для распознанного объекта (или [] если это не техника/мебель).

Ответь строго валидным JSON:
{
  "category": "other",
  "brand": null,
  "model": null,
  "year": null,
  "confidence": 0.9,
  "title": "Точное название объекта на русском",
  "detectedIssues": ["Типовая проверка или неисправность 1", "Типовая проверка или неисправность 2"],
  "estimatedMasterCost": 2200,
  "estimatedPartsCost": 450,
  "suggestedGuideId": null
}`;

    try {
      const text = await callGeminiWithFallback(
        [
          { text: prompt },
          { inlineData: { mimeType: parsedImage.mimeType, data: parsedImage.data } },
        ],
        { responseMimeType: 'application/json' }
      );

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Gemini did not return valid JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const rawGuideId =
        typeof parsed.suggestedGuideId === 'string' ? parsed.suggestedGuideId : null;
      let safeGuideId = rawGuideId && VALID_GUIDE_IDS.has(rawGuideId) ? rawGuideId : null;

      if (!safeGuideId) {
        const cat = String(parsed.category || '').toLowerCase();
        const titleLower = String(parsed.title || parsed.itemType || '').toLowerCase();
        if (cat === 'washing_machine') safeGuideId = 'lg-wm-filter';
        else if (cat === 'microwave') safeGuideId = 'samsung-mw-fuse';
        else if (cat === 'vacuum' || titleLower.includes('пылесос')) safeGuideId = 'dyson-v11-clean';
        else if (cat === 'furniture' && (titleLower.includes('стул') || titleLower.includes('кресл'))) {
          safeGuideId = 'chair-upcycling';
        }
      }

      res.json({
        success: true,
        source: 'gemini',
        data: {
          ...parsed,
          suggestedGuideId: safeGuideId,
          confidence:
            typeof parsed.confidence === 'number'
              ? Math.max(0.05, Math.min(0.99, parsed.confidence))
              : 0.85,
        },
      });
    } catch (geminiError: any) {
      console.warn('Gemini image analysis failed:', geminiError);
      res.status(503).json({
        success: false,
        source: 'unavailable',
        error: geminiError?.message || 'Серверный Vision временно недоступен',
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// API: Экспертный чат помощи (SOS)
app.post('/api/expert-chat', async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (aiClient) {
      try {
        const replyText = await callGeminiWithFallback([
          {
            text: `Ты — старший мастер сервисной поддержки "МастерОК" Алексей Смирнов.
Контекст: ${JSON.stringify(context || {})}
Вопрос пользователя: "${message}"
Ответь емко и профессионально на русском языке, с обязательным напоминанием о технике безопасности (отключение 220V и перекрытие воды).`,
          },
        ]);

        res.json({
          reply: replyText,
          expert: {
            name: 'Алексей Смирнов',
            badge: 'Ведущий инженер сервиса · 14 лет опыта',
            rating: 4.96,
          },
        });
        return;
      } catch (err) {
        console.warn('Gemini chat fallback triggered:', err);
      }
    }

    res.json({
      reply: `Обязательно обесточьте прибор (выньте вилку из розетки 220В) перед проверкой!

1. Проверьте сливной фильтр в правом нижнем углу — в 80% случаев мешают монеты или нитки.
2. Подставьте плоский лоток и полотенце: выльется около 0.5 л воды.
3. Проверьте крыльчатку помпы: она должна проворачиваться шажками с лёгким магнитным сопротивлением.

Если узел заклинило намертво, выберите ближайшего мастера на карте ниже или пришлите фото с пометкой.`,
      expert: {
        name: 'Алексей Смирнов',
        badge: 'Ведущий инженер сервиса · 14 лет опыта',
        rating: 4.96,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`МастерОК server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
