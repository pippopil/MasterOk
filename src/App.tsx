/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useState } from 'react';
import {
  Wrench,
  Camera,
  Leaf,
  MapPin,
  User,
} from 'lucide-react';
import { useAppStore } from './store/useAppStore';
import { POPULAR_GUIDES, RepairGuide } from './data/mockData';
import { LocalMaster } from './utils/engine';
import { CatalogView } from './components/CatalogView';
import { ObjectDetector } from './components/ObjectDetector';
import { UpcyclingLab } from './components/UpcyclingLab';
import { FridgeChef } from './components/FridgeChef';
import { SOSExpertChat } from './components/SOSExpertChat';
import { LocalMastersMap } from './components/LocalMastersMap';
import { ProfileDashboard } from './components/ProfileDashboard';
import { UGCBuilderModal } from './components/UGCBuilderModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import brandLogoImg from './assets/images/masterok_brand_logo_1795454129010.jpg';
import {
  cacheInstructions,
  flushOfflineQueue,
  getCachedInstructions,
} from './lib/offlineDb';

const API_BASE = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/+$/, '');

const ARViewer = React.lazy(() =>
  import('./components/ARViewer').then((m) => ({ default: m.ARViewer }))
);

export default function App() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const syncFromLocation = useAppStore((s) => s.syncFromLocation);
  const recordCompletedRepair = useAppStore((s) => s.recordCompletedRepair);
  const addCustomGuide = useAppStore((s) => s.addCustomGuide);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});
  const [ugcOpen, setUgcOpen] = useState(false);
  const [selectedMasterForChat, setSelectedMasterForChat] = useState<LocalMaster | null>(null);

  useEffect(() => {
    const onPopState = () => syncFromLocation();
    window.addEventListener('popstate', onPopState);

    // Поддержка ?autostart=1 для быстрого перехода в рабочий режим
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' && window.location.pathname === '/') {
      navigate('/scan');
    }

    // Кэширование инструкций в IndexedDB и синхронизация офлайн-очереди при восстановлении сети
    const syncOfflineAndCache = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/instructions`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.instructions)) {
            await cacheInstructions(data.instructions);
          }
        } else {
          await getCachedInstructions();
        }
      } catch {
        await getCachedInstructions();
      }
      await flushOfflineQueue(API_BASE);
    };

    syncOfflineAndCache();
    const onOnline = () => {
      flushOfflineQueue(API_BASE);
    };
    window.addEventListener('online', onOnline);

    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('online', onOnline);
    };
  }, [syncFromLocation, navigate]);

  const activeGuideId =
    route.page === 'repair' ? route.guideId : 'lg-wm-filter';
  const currentGuide: RepairGuide =
    POPULAR_GUIDES.find((g) => g.id === activeGuideId) || POPULAR_GUIDES[0];

  useEffect(() => {
    setCurrentStepIndex(0);
    setCompletedSteps({});
  }, [activeGuideId]);

  const handleNextStep = () => {
    if (currentStepIndex < currentGuide.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      recordCompletedRepair(currentGuide.moneySaved, currentGuide.co2Saved);
      navigate('/profile');
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleStepComplete = (stepNum: number) => {
    setCompletedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const navLinks = [
    { id: 'home', path: '/', label: 'Каталог' },
    { id: 'upcycle', path: '/upcycle', label: 'Апсайклинг' },
    { id: 'recipes', path: '/recipes', label: 'Рецепты' },
    { id: 'masters', path: '/masters', label: 'Мастера' },
    { id: 'profile', path: '/profile', label: 'Профиль' },
  ];

  const isNavActive = (id: string) => {
    if (id === 'home' && (route.page === 'home' || route.page === 'repair')) return true;
    return route.page === id;
  };

  return (
    <div className="min-h-screen bg-[#0c0f17] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 h-14 bg-[#0c0f17]/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-cyan-400 transition-colors"
          >
            <img
              src={brandLogoImg}
              alt="Логотип МастерОК"
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-lg object-cover border border-slate-700/80 shrink-0"
            />
            <span>МастерОК</span>
          </a>

          {/* Zone 2: 5 concise single-line text nav links */}
          <nav
            aria-label="Основная навигация"
            className="hidden md:flex items-center gap-6 text-sm font-medium"
          >
            {navLinks.map((link) => {
              const active = isNavActive(link.id);
              return (
                <a
                  key={link.id}
                  href={link.path}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(link.path);
                  }}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-white border-cyan-400 font-semibold'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary CTA Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => navigate('/scan')}
              className="min-h-[38px] px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Сканировать</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
        <ErrorBoundary onResetHome={() => navigate('/')}>
          {route.page === 'home' && (
            <CatalogView onOpenUGC={() => setUgcOpen(true)} />
          )}

          {route.page === 'scan' && <ObjectDetector />}

          {route.page === 'repair' && (
            <Suspense
              fallback={
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-2">
                  <div className="text-sm font-semibold text-white">
                    Загрузка 3D/AR-сцены...
                  </div>
                  <div className="text-xs text-slate-400">
                    Подготовка интерактивной модели и пошаговой инструкции
                  </div>
                </div>
              }
            >
              <ARViewer
                guide={currentGuide}
                currentStepIndex={currentStepIndex}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onStepComplete={handleStepComplete}
                completedSteps={completedSteps}
                onAskExpert={() => navigate('/masters')}
                onChangeDevice={() => navigate('/')}
              />
            </Suspense>
          )}

          {route.page === 'upcycle' && <UpcyclingLab />}

          {route.page === 'recipes' && <FridgeChef />}

          {route.page === 'masters' && (
            <div className="space-y-8">
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-cyan-400">
                  Помощь специалистов · Чат и карта района
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Связь с экспертом и локальные мастера
                </h1>
                <p className="text-sm text-slate-400">
                  Задайте вопрос дежурному инженеру или выберите мастера рядом для выезда в сложных случаях.
                </p>
              </div>

              <SOSExpertChat
                currentAppliance={currentGuide.title}
                selectedMaster={selectedMasterForChat}
              />

              <LocalMastersMap
                onSelectMasterForChat={(master) => {
                  setSelectedMasterForChat(master);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}

          {route.page === 'profile' && <ProfileDashboard />}
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Tab Bar (56px height, total sticky chrome <= 15% of 844px mobile viewport) */}
      <nav
        aria-label="Мобильная навигация"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#0c0f17]/95 backdrop-blur-md border-t border-slate-800 grid grid-cols-5 items-center"
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            isNavActive('home') ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Каталог</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/scan')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            route.page === 'scan' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Сканер</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/upcycle')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            route.page === 'upcycle' ? 'text-amber-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <Leaf className="w-4 h-4" />
          <span>Идеи</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/masters')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            route.page === 'masters' ? 'text-cyan-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Мастера</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className={`h-full flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium ${
            route.page === 'profile' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Профиль</span>
        </button>
      </nav>

      {/* UGC Modal */}
      <UGCBuilderModal
        isOpen={ugcOpen}
        onClose={() => setUgcOpen(false)}
        onPublish={(newGuide) => {
          addCustomGuide(newGuide);
        }}
      />
    </div>
  );
}
