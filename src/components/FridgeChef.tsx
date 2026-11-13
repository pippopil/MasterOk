import React, { useState, useMemo } from 'react';
import {
  Utensils,
  Clock,
  Flame,
  Check,
  Plus,
  X,
  ArrowRight,
  ChefHat,
  Camera,
  Heart,
  RefreshCw,
} from 'lucide-react';
import { ZERO_WASTE_RECIPES, FridgeRecipe, APP_IMAGES } from '../data/mockData';
import { matchFridgeRecipes } from '../utils/engine';
import { useAppStore } from '../store/useAppStore';

export const FridgeChef: React.FC = () => {
  const navigate = useAppStore((s) => s.navigate);
  const savedRecipeIds = useAppStore((s) => s.savedRecipeIds);
  const toggleSaveRecipe = useAppStore((s) => s.toggleSaveRecipe);

  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([
    'яйца',
    'сыр',
    'помидоры',
  ]);
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [recipesPool, setRecipesPool] = useState<FridgeRecipe[]>(ZERO_WASTE_RECIPES);
  const [activeRecipe, setActiveRecipe] = useState<FridgeRecipe | null>(null);
  const [isScanningFridge, setIsScanningFridge] = useState(false);

  const commonIngredients = [
    'яйца',
    'сыр',
    'помидоры',
    'курица',
    'макароны',
    'зелень',
    'сметана',
    'молоко',
    'чеснок',
    'лаваш / лепешка',
    'картофель',
    'морковь',
  ];

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients((prev) =>
      prev.includes(ing) ? prev.filter((i) => i !== ing) : [...prev, ing]
    );
  };

  const addCustomIngredient = () => {
    const trimmed = newIngredientInput.trim().toLowerCase();
    if (trimmed && !selectedIngredients.includes(trimmed)) {
      setSelectedIngredients([...selectedIngredients, trimmed]);
      setNewIngredientInput('');
    }
  };

  const handleAnalyzeFridgePhoto = async () => {
    setIsScanningFridge(true);
    try {
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: APP_IMAGES.fridge,
          ingredients: selectedIngredients,
        }),
      });
      const json = await res.json();
      if (Array.isArray(json.detectedIngredients)) {
        setSelectedIngredients(json.detectedIngredients);
      }
      if (Array.isArray(json.recipes) && json.recipes.length > 0) {
        setRecipesPool((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const merged = [...prev];
          json.recipes.forEach((r: FridgeRecipe) => {
            if (!existingIds.has(r.id)) merged.unshift(r);
          });
          return merged;
        });
      }
    } catch {
      // Keep local recipes
    } finally {
      setIsScanningFridge(false);
    }
  };

  const matchedResults = useMemo(() => {
    return matchFridgeRecipes(selectedIngredients, recipesPool);
  }, [selectedIngredients, recipesPool]);

  return (
    <div className="space-y-8">
      {/* Banner */}
      <section className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="text-xs font-medium text-emerald-400">
          Кухня без отходов · Подбор блюд из остатков продуктов
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
          Рецепты из того, что есть в холодильнике
        </h1>
        <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
          Отметьте имеющиеся продукты или отсканируйте полки холодильника — сервис подберёт рецепты, покажет недостающие ингредиенты и сэкономит бюджет.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleAnalyzeFridgePhoto}
            disabled={isScanningFridge}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {isScanningFridge ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ChefHat className="w-4 h-4" />
            )}
            <span>
              {isScanningFridge ? 'Распознаём продукты...' : 'Распознать фото холодильника'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-4 h-4" />
            <span>Открыть камеру</span>
          </button>
        </div>
      </section>

      {/* Ingredient Picker */}
      <section className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-400" />
              <span>Продукты в наличии ({selectedIngredients.length})</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Нажмите на теги или добавьте собственный ингредиент
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newIngredientInput}
              onChange={(e) => setNewIngredientInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomIngredient()}
              placeholder="Добавить продукт..."
              aria-label="Добавить продукт"
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              onClick={addCustomIngredient}
              className="min-h-[40px] min-w-[40px] px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center transition-colors"
              aria-label="Добавить"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {commonIngredients.map((ing) => {
            const isSelected = selectedIngredients.includes(ing);
            return (
              <button
                key={ing}
                type="button"
                onClick={() => toggleIngredient(ing)}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors border flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5" />}
                <span>{ing}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Matched Recipes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {matchedResults.map(({ recipe, matchScore, missingIngredients }) => {
          const isSaved = savedRecipeIds.includes(recipe.id);
          return (
            <article
              key={recipe.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    {recipe.category} ·{' '}
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        matchScore >= 80
                          ? 'text-emerald-400'
                          : matchScore >= 50
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {matchScore}% совпадение
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSaveRecipe(recipe.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isSaved ? 'text-rose-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                    aria-label={`Сохранить рецепт ${recipe.title}`}
                  >
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <h3 className="font-bold text-white text-base leading-snug">
                  {recipe.title}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400 font-mono tabular-nums">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {recipe.cookingTimeMinutes} мин
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    {recipe.calories} ккал
                  </span>
                  <span>{recipe.difficulty}</span>
                </div>

                {missingIngredients.length > 0 ? (
                  <div className="text-xs text-amber-400">
                    Докупить: {missingIngredients.join(', ')}
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Все ингредиенты есть в холодильнике</span>
                  </div>
                )}

                {recipe.zeroWasteTip && (
                  <p className="text-xs text-slate-400 border-t border-slate-800 pt-2.5 leading-relaxed">
                    Совет: {recipe.zeroWasteTip}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveRecipe(recipe)}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700 hover:border-emerald-400"
              >
                <span>Пошаговый рецепт</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </article>
          );
        })}
      </div>

      {/* Recipe Modal */}
      {activeRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs text-emerald-400 font-mono tabular-nums">
                  {activeRecipe.cookingTimeMinutes} мин · {activeRecipe.calories} ккал
                </div>
                <h3 className="font-bold text-white text-lg mt-0.5">
                  {activeRecipe.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveRecipe(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800"
                aria-label="Закрыть рецепт"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-2.5 text-sm text-slate-300">
              {activeRecipe.steps.map((st, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800"
                >
                  <span className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed text-xs sm:text-sm">{st}</span>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => setActiveRecipe(null)}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-colors"
            >
              Готово, закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
