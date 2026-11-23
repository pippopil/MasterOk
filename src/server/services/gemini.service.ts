import { GoogleGenAI } from '@google/genai';

export interface ParsedImageData {
  mimeType: string;
  data: string;
}

export function parseImageDataUrl(dataUrl: string): ParsedImageData | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

/**
 * Очищает markdown-обёртки (```json ... ```) перед парсингом JSON ответа AI.
 */
export function parseCleanJson<T = unknown>(text: string): T {
  const cleanText = text
    .replace(/```json/gi, '')
    .replace(/```/gi, '')
    .trim();

  try {
    return JSON.parse(cleanText) as T;
  } catch {
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI response did not contain valid JSON');
    }
    return JSON.parse(jsonMatch[0]) as T;
  }
}

async function generateContentWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini timeout after ${timeoutMs}ms`)),
      timeoutMs
    );
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

export async function generateContentWithFallback(
  aiClient: GoogleGenAI | null,
  parts: unknown[],
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
          contents: [{ role: 'user', parts: parts as never[] }],
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
