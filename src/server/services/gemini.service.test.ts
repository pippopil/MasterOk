import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCleanJson, parseImageDataUrl } from './gemini.service';

test('parseCleanJson strips ```json fences and parses valid JSON', () => {
  const input = '```json\n{ "test": true }\n```';
  const parsed = parseCleanJson<{ test: boolean }>(input);
  assert.deepEqual(parsed, { test: true });
});

test('parseCleanJson extracts JSON wrapped with commentary and fences', () => {
  const input = 'Вот результат анализа:\n```JSON\n{"title": "Микроволновка", "confidence": 0.91}\n```';
  const parsed = parseCleanJson<{ title: string; confidence: number }>(input);
  assert.equal(parsed.title, 'Микроволновка');
  assert.equal(parsed.confidence, 0.91);
});

test('parseCleanJson throws on non-JSON input', () => {
  assert.throws(() => parseCleanJson('просто текст без json'));
});

test('parseImageDataUrl validates base64 image data URLs and extracts mimeType', () => {
  const png = parseImageDataUrl('data:image/png;base64,iVBORw0KGgo=');
  assert.deepEqual(png, { mimeType: 'image/png', data: 'iVBORw0KGgo=' });

  const invalid = parseImageDataUrl('https://example.com/photo.jpg');
  assert.equal(invalid, null);
});
