import { z } from 'zod';

const optionalImageDataSchema = z
  .string()
  .max(15_000_000, 'Размер изображения слишком велик')
  .optional();

export const createObjectSchema = z.object({
  type: z.string().trim().min(1, 'Укажите тип объекта').max(160),
  brand: z.string().trim().max(80).optional(),
  model: z.string().trim().max(120).optional(),
  year: z.number().int().min(1950).max(2035).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const analyzeImageSchema = z.object({
  image: z
    .string()
    .min(20, 'Некорректные данные изображения')
    .max(15_000_000, 'Размер изображения превышает лимит')
    .refine(
      (val) => /^data:image\/[a-zA-Z0-9.+-]+;base64,.+/.test(val),
      'Ожидается изображение в формате base64 data:image/*'
    ),
  mode: z.enum(['appliance', 'upcycling', 'fridge']).default('appliance'),
});

export const upcycleIdeasSchema = z.object({
  imageData: optionalImageDataSchema,
  objectLabel: z.string().trim().min(1).max(160).default('Деревянный стул'),
});

export const upcycleSuggestSchema = z.object({
  objectLabel: z.string().trim().min(1).max(160),
  confidence: z.number().min(0).max(1).default(0.8),
});

export const recipesSchema = z.object({
  imageData: optionalImageDataSchema,
  ingredients: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
});

export const expertChatSchema = z.object({
  message: z.string().trim().min(1, 'Введите вопрос').max(2000),
  context: z.record(z.string(), z.unknown()).optional(),
});
