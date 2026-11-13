# МастерОК (HomeGenie)

Веб- и мобильное приложение с интерактивными 3D/AR-инструкциями по ремонту бытовой техники, апсайклингу мебели, рецептам Zero-Waste из продуктов в холодильнике и картой локальных мастеров.

## Стек
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Zustand, Recharts
- **AR & ML в браузере**: Three.js (3D + 2D-схема), WebRTC, TensorFlow.js (`@tensorflow-models/coco-ssd`)
- **Backend**: Express (`server.ts`) + `@google/genai` (`gemini-4-hydrogen`)
- **Android APK**: Capacitor 7 (`capacitor.config.json`) + GitHub Actions

## Локальный запуск
```bash
npm install
npm run dev
```

## Проверка и тесты
```bash
npm run lint
npx tsx --test src/utils/engine.test.ts
npm run build
```

## Бета-релиз Android APK в GitHub Actions
Workflow `.github/workflows/beta-release-apk.yml` собирает подписанный `.apk` с автоматически увеличивающимся номером сборки (`versionCode` и `versionName` вида `1.0.0-beta.<N>`) и публикует Pre-release в разделе **Releases**.

Как запустить:
1. Перейдите на вкладку **Actions** → **Beta Release APK** → **Run workflow** (или отправьте ветку `beta` / тег `v1.0.0-beta.1`).
2. Номер сборки увеличивается автоматически на основе `github.run_number` и существующих тегов `v*-beta.*` (при желании можно указать вручную в поле `build_number`).
3. Готовый файл `MasterOK-v<version>-beta.<N>.apk` будет прикреплён к артефактам запуска и к соответствующему Beta-релизу.
