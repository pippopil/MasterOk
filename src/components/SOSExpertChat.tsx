import React, { useState, useRef, useEffect } from 'react';
import {
  Headphones,
  Send,
  PenTool,
  ShieldAlert,
  X,
} from 'lucide-react';
import { APP_IMAGES } from '../data/mockData';
import { LocalMaster } from '../utils/engine';
import { SafeImage } from './SafeImage';

interface SOSExpertChatProps {
  currentAppliance?: string;
  selectedMaster?: LocalMaster | null;
}

interface Message {
  id: string;
  sender: 'user' | 'expert';
  text: string;
  timestamp: string;
  imageUrl?: string;
}

export const SOSExpertChat: React.FC<SOSExpertChatProps> = ({
  currentAppliance = 'Стиральная машина LG F1296ND3',
  selectedMaster,
}) => {
  const expertName = selectedMaster?.name || 'Алексей Смирнов';
  const expertMeta = selectedMaster
    ? `${selectedMaster.specialty} · Рейтинг ${selectedMaster.rating} · Отклик ~${selectedMaster.responseMinutes} мин`
    : 'Старший мастер сервиса · Стаж 14 лет · Ответ < 30 сек';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'expert',
      text: `Здравствуйте! Я ${expertName}. Чем могу помочь по ремонту «${currentAppliance}»? Пришлите описание или фото с пометкой проблемного узла.`,
      timestamp: 'Только что',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [showCanvasModal, setShowCanvasModal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ef4444');
  const uploadedPhotoUrl = APP_IMAGES.washing;

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedMaster) {
      setMessages((prev) => [
        ...prev,
        {
          id: `switch-${Date.now()}`,
          sender: 'expert',
          text: `К диалогу подключился ${selectedMaster.name} (${selectedMaster.district} район, выезд от ${selectedMaster.baseVisitRub} ₽). Опишите неисправность.`,
          timestamp: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    }
  }, [selectedMaster?.id]);

  useEffect(() => {
    if ((messages.length > 1 || isTyping) && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async (customText?: string, imageUrl?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() && !imageUrl) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      imageUrl,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/expert-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          context: { currentAppliance, hasImage: !!imageUrl, expertName },
        }),
      });
      const data = await res.json();

      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'expert',
          text:
            data.reply ||
            'Обязательно обесточьте технику! Проверьте крыльчатку и контакты.',
          timestamp: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    } catch {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'expert',
          text: 'Обязательно отключите прибор от сети 220В! Если крыльчатка помпы не крутится, аккуратно проверните её отвёрткой.',
          timestamp: new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
    }
  };

  useEffect(() => {
    if (showCanvasModal && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.src = uploadedPhotoUrl;
      img.onload = () => {
        canvas.width = 500;
        canvas.height = 350;
        ctx.drawImage(img, 0, 0, 500, 350);
      };
    }
  }, [showCanvasModal, uploadedPhotoUrl]);

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height
    );
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(
      ((e.clientX - rect.left) / rect.width) * canvas.width,
      ((e.clientY - rect.top) / rect.height) * canvas.height
    );
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const submitAnnotatedPhoto = () => {
    if (!canvasRef.current) return;
    const annotatedDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);
    setShowCanvasModal(false);
    handleSendMessage('Посмотрите фото — обвёл проблемный узел.', annotatedDataUrl);
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col h-[520px] relative">
      {/* Header */}
      <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/30 shrink-0">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm sm:text-base">{expertName}</h2>
            <p className="text-xs text-slate-400">{expertMeta}</p>
          </div>
        </div>
      </div>

      {/* Safety Alert */}
      <div className="px-4 py-2.5 bg-amber-950/40 border-b border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
        <span>Перед осмотром внутренних узлов отключайте питание 220В и перекрывайте воду.</span>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm space-y-2 ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
              }`}
            >
              {msg.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-white/15 mb-2">
                  <SafeImage
                    src={msg.imageUrl}
                    alt="Разметка проблемного узла"
                    className="w-full max-h-48 object-cover"
                  />
                </div>
              )}
              <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 px-1 font-mono tabular-nums">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="text-xs text-slate-400 px-2">Мастер печатает ответ...</div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowCanvasModal(true)}
          className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 transition-colors flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0"
          title="Обвести деталь на фото"
        >
          <PenTool className="w-4 h-4" />
          <span className="hidden sm:inline">Обвести фото</span>
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Опишите проблему или шаг..."
          aria-label="Сообщение мастеру"
          className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-400"
        />

        <button
          type="button"
          onClick={() => handleSendMessage()}
          disabled={!inputText.trim()}
          aria-label="Отправить сообщение"
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas Modal */}
      {showCanvasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm sm:text-base">
                  Разметка фото для мастера
                </h3>
                <p className="text-xs text-slate-400">
                  Обведите проблемный узел на изображении
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCanvasModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white"
                aria-label="Закрыть разметку"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Цвет маркера:</span>
              <div className="flex items-center gap-2">
                {['#ef4444', '#f59e0b', '#06b6d4', '#10b981'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDrawColor(c)}
                    style={{ backgroundColor: c }}
                    aria-label={`Цвет ${c}`}
                    className={`w-7 h-7 rounded-full border-2 ${
                      drawColor === c ? 'border-white scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="border border-slate-700 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <canvas
                ref={canvasRef}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                className="w-full cursor-crosshair touch-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCanvasModal(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={submitAnnotatedPhoto}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
              >
                Отправить мастеру
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
