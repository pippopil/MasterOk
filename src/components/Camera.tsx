import React, { useEffect, useRef, useState } from 'react';
import { Camera as CameraIcon, Upload, VideoOff, RefreshCw } from 'lucide-react';

export interface CameraProps {
  onCapture: (imageData: string) => void;
  onError: (error: Error) => void;
  autoStart?: boolean;
}

export function Camera({ onCapture, onError, autoStart = false }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameraBlocked, setCameraBlocked] = useState(false);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  };

  const startCamera = async () => {
    setStarting(true);
    setCameraBlocked(false);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Браузер не поддерживает WebRTC камеру');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreaming(true);
      }
    } catch (error) {
      setCameraBlocked(true);
      onError(error instanceof Error ? error : new Error('Нет доступа к камере'));
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart]);

  const captureImage = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = canvas.toDataURL('image/jpeg', 0.85);
      stopCamera();
      onCapture(imageData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const res = ev.target?.result;
      if (typeof res === 'string') {
        stopCamera();
        onCapture(res);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full h-[360px] sm:h-[440px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          streaming ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {streaming ? (
        <>
          {/* AR Target Frame */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl border-2 border-dashed border-cyan-400/70" />
          </div>

          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3 px-4">
            <button
              type="button"
              onClick={captureImage}
              className="min-h-[48px] px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg transition-colors whitespace-nowrap shrink-0"
              aria-label="Сделать фото"
            >
              <CameraIcon className="w-4 h-4" />
              <span>Сделать фото</span>
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-medium transition-colors whitespace-nowrap shrink-0"
            >
              Отключить
            </button>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
            {cameraBlocked ? <VideoOff className="w-6 h-6 text-amber-400" /> : <CameraIcon className="w-6 h-6 text-cyan-400" />}
          </div>
          <div className="max-w-sm space-y-1">
            <p className="text-sm sm:text-base font-semibold text-white">
              {cameraBlocked
                ? 'Камера заблокирована или не подключена'
                : 'Наведите камеру на технику, мебель или полки холодильника'}
            </p>
            <p className="text-xs text-slate-400">
              {cameraBlocked
                ? 'Вы можете загрузить фотографию с устройства или выбрать тестовый образец ниже.'
                : 'Распознавание работает прямо в браузере через WebRTC и TensorFlow.js.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={startCamera}
              disabled={starting}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
            >
              {starting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CameraIcon className="w-4 h-4" />
              )}
              <span>{starting ? 'Запуск камеры...' : 'Включить камеру'}</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold text-sm flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Upload className="w-4 h-4" />
              <span>Загрузить фото</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}
