import { useCallback, useEffect, useRef, useState } from 'react';

interface VoiceControlHandlers {
  onNextStep: () => void;
  onRepeatStep: () => void;
  onStopSpeaking: () => void;
  onPrevStep?: () => void;
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionCtor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructorLike;
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

/**
 * Клиентское голосовое управление по Web Speech API (аудио не отправляется на сервер).
 * Поддерживаемые команды: "следующий шаг", "повтори", "стоп", "назад".
 */
export function useVoiceControl(handlers: VoiceControlHandlers) {
  const [isSupported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Игнорируем остановку уже закрытого распознавателя
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceError('Голосовое управление не поддерживается в этом браузере');
      return;
    }

    stopListening();
    setVoiceError(null);

    try {
      const recognition = new Ctor();
      recognition.lang = 'ru-RU';
      recognition.continuous = true;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const idx = event.results.length - 1;
        const result = event.results[idx];
        if (!result || !result.isFinal) return;
        const transcript = result[0]?.transcript?.toLowerCase().trim() || '';
        if (!transcript) return;

        setLastCommand(transcript);

        if (transcript.includes('следующ') || transcript.includes('дальше')) {
          handlersRef.current.onNextStep();
        } else if (transcript.includes('повтор')) {
          handlersRef.current.onRepeatStep();
        } else if (transcript.includes('стоп') || transcript.includes('хватит')) {
          handlersRef.current.onStopSpeaking();
          stopListening();
        } else if (transcript.includes('назад') && handlersRef.current.onPrevStep) {
          handlersRef.current.onPrevStep();
        }
      };

      recognition.onerror = () => {
        setVoiceError('Нет доступа к микрофону или распознавание прервано');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch {
      setVoiceError('Не удалось запустить микрофон');
      setIsListening(false);
    }
  }, [stopListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isSupported,
    isListening,
    lastCommand,
    voiceError,
    toggleListening,
    stopListening,
  };
}
