import React, { useState } from 'react';
import { X, Wrench, CheckCircle, Trash2 } from 'lucide-react';
import { CustomUGCGuide } from '../store/useAppStore';

interface UGCBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (guide: CustomUGCGuide) => void;
}

export const UGCBuilderModal: React.FC<UGCBuilderModalProps> = ({
  isOpen,
  onClose,
  onPublish,
}) => {
  const [title, setTitle] = useState('');
  const [applianceModel, setApplianceModel] = useState('');
  const [category, setCategory] = useState('washing_machine');
  const [difficulty, setDifficulty] = useState<'Легко' | 'Средне' | 'Сложно'>('Легко');
  const [estimatedTime, setEstimatedTime] = useState('20 мин');
  const [moneySaved, setMoneySaved] = useState('3000');
  const [steps, setSteps] = useState<string[]>([
    'Обесточить устройство и отключить подачу воды',
    'Снять защитную панель с помощью отвертки',
  ]);
  const [newStepText, setNewStepText] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const addStep = () => {
    if (newStepText.trim()) {
      setSteps([...steps, newStepText.trim()]);
      setNewStepText('');
    }
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !applianceModel.trim() || steps.length === 0) return;

    const newGuide: CustomUGCGuide = {
      id: `ugc-${Date.now()}`,
      title: title.trim(),
      applianceModel: applianceModel.trim(),
      category,
      difficulty,
      estimatedTime,
      moneySaved: Number(moneySaved) || 2500,
      steps,
      author: 'Вы (Домашний мастер)',
    };

    onPublish(newGuide);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setTitle('');
      setApplianceModel('');
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Создание инструкции"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
    >
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base sm:text-lg">
                Поделиться своим опытом ремонта
              </h2>
              <p className="text-xs text-slate-400">
                Создайте инструкцию и помогите другим пользователям
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно создания инструкции"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white">Инструкция опубликована!</h3>
            <p className="text-xs text-slate-400">
              Спасибо за вклад в сообщество и культуру разумного потребления.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
            <div>
              <label htmlFor="ugc-title" className="block text-slate-300 font-semibold mb-1">
                Название инструкции
              </label>
              <input
                id="ugc-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Замена сливного насоса в стиральной машине"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="ugc-model" className="block text-slate-300 font-semibold mb-1">
                  Марка и модель техники
                </label>
                <input
                  id="ugc-model"
                  type="text"
                  required
                  value={applianceModel}
                  onChange={(e) => setApplianceModel(e.target.value)}
                  placeholder="Например: Indesit BIAA 13"
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label htmlFor="ugc-category" className="block text-slate-300 font-semibold mb-1">
                  Категория
                </label>
                <select
                  id="ugc-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="washing_machine">Стиральная машина</option>
                  <option value="refrigerator">Холодильник</option>
                  <option value="microwave">Микроволновка</option>
                  <option value="vacuum">Пылесос</option>
                  <option value="furniture">Мебель (Апсайклинг)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="ugc-difficulty" className="block text-slate-300 font-semibold mb-1">
                  Сложность
                </label>
                <select
                  id="ugc-difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'Легко' | 'Средне' | 'Сложно')}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                >
                  <option value="Легко">Легко</option>
                  <option value="Средне">Средне</option>
                  <option value="Сложно">Сложно</option>
                </select>
              </div>

              <div>
                <label htmlFor="ugc-time" className="block text-slate-300 font-semibold mb-1">
                  Время
                </label>
                <input
                  id="ugc-time"
                  type="text"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label htmlFor="ugc-money" className="block text-slate-300 font-semibold mb-1">
                  Экономия (₽)
                </label>
                <input
                  id="ugc-money"
                  type="number"
                  value={moneySaved}
                  onChange={(e) => setMoneySaved(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white tabular-nums"
                />
              </div>
            </div>

            {/* Steps builder */}
            <div className="space-y-2">
              <div className="text-slate-300 font-semibold">
                Шаги ремонта ({steps.length})
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {steps.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs gap-2"
                  >
                    <span className="text-slate-300">
                      {idx + 1}. {s}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      aria-label={`Удалить шаг ${idx + 1}`}
                      className="text-slate-500 hover:text-rose-400 p-1.5 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addStep();
                    }
                  }}
                  placeholder="Добавить шаг инструкции..."
                  aria-label="Текст нового шага"
                  className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={addStep}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-800 text-cyan-400 font-semibold text-xs border border-slate-700 hover:bg-slate-700 whitespace-nowrap"
                >
                  + Шаг
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full min-h-[44px] py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-colors"
              >
                Опубликовать в каталоге МастерОК
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
