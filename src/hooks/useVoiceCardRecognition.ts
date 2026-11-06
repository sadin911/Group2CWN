import { useState, useEffect, useRef, useCallback } from 'react';

// Web Audio API Success Chime
export function playVoiceSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.12); // A5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch {
    // AudioContext autoplay policy or browser restriction
  }
}

// Low blip for voice command / set change
export function playVoiceCommandChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.08); // C#5

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore
  }
}

// Gentle alert chime for timeout or silence
export function playVoiceTimeoutChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.2); // Downward E4

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    // Ignore
  }
}

export function triggerVoiceHaptic(type: 'success' | 'command' | 'error' | 'timeout' = 'success') {
  try {
    if (!navigator.vibrate) return;
    if (type === 'success') {
      navigator.vibrate([25, 40, 25]);
    } else if (type === 'command') {
      navigator.vibrate([35]);
    } else if (type === 'timeout') {
      navigator.vibrate([40, 40, 40]);
    } else {
      navigator.vibrate([50, 60, 50]);
    }
  } catch {
    // Ignore
  }
}

export interface UseVoiceCardRecognitionOptions {
  onFinalResult?: (transcript: string) => void;
  onTimeout?: (reason: 'silence' | 'inactivity') => void;
  continuous?: boolean;
  silenceTimeoutMs?: number; // Auto-finalize interim transcript if user pauses for this long (default 1400ms)
  inactivityTimeoutMs?: number; // Alert if listening actively without any speech for this long (default 14000ms)
}

export function useVoiceCardRecognition({
  onFinalResult,
  onTimeout,
  continuous = true,
  silenceTimeoutMs = 1400,
  inactivityTimeoutMs = 14000,
}: UseVoiceCardRecognitionOptions = {}) {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [language, setLanguage] = useState<'th-TH' | 'en-US'>('th-TH');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [lastFinalTranscript, setLastFinalTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const isAndroid = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const isSpeakingRef = useRef<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const restartTimeoutRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const inactivityTimerRef = useRef<any>(null);

  const currentInterimRef = useRef<string>('');
  const lastFinalizedTextRef = useRef<string>('');
  const lastFinalizedTimeRef = useRef<number>(0);

  const onFinalResultRef = useRef(onFinalResult);
  onFinalResultRef.current = onFinalResult;

  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Check Web Speech API availability
  useEffect(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsSupported(false);
    }
  }, []);

  // Clear timers
  const clearSilenceDecisionTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimer();
    if (!isListeningRef.current || inactivityTimeoutMs <= 0) return;

    inactivityTimerRef.current = setTimeout(() => {
      if (isListeningRef.current) {
        playVoiceTimeoutChime();
        triggerVoiceHaptic('timeout');
        onTimeoutRef.current?.('inactivity');
      }
    }, inactivityTimeoutMs);
  }, [clearInactivityTimer, inactivityTimeoutMs]);

  // Event-driven Audio Level Synthesizer:
  // Eliminates getUserMedia microphone lock that starves SpeechRecognition on Android OS!
  const stopAudioLevelSimulation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startAudioLevelSimulation = useCallback(() => {
    stopAudioLevelSimulation();
    let currentLevel = 0.1;

    const tick = (now: number) => {
      if (!isListeningRef.current) {
        setAudioLevel(0);
        return;
      }

      let targetLevel = 0.08;
      if (isSpeakingRef.current) {
        // High, organic pulse while user is actively speaking
        const sineWave = Math.sin(now / 70) * 0.25 + 0.65;
        const jitter = (Math.sin(now / 23) + Math.cos(now / 41)) * 0.1;
        targetLevel = Math.min(1, Math.max(0.4, sineWave + jitter));
      } else {
        // Subtle rhythmic heartbeat when idle/listening
        const idleWave = Math.sin(now / 350) * 0.05 + 0.1;
        targetLevel = Math.max(0.04, idleWave);
      }

      // Smooth lerp
      currentLevel += (targetLevel - currentLevel) * 0.2;
      setAudioLevel(currentLevel);

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [stopAudioLevelSimulation]);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    isSpeakingRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    currentInterimRef.current = '';
    clearSilenceDecisionTimer();
    clearInactivityTimer();
    stopAudioLevelSimulation();

    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
  }, [clearInactivityTimer, clearSilenceDecisionTimer, stopAudioLevelSimulation]);

  const startListening = useCallback(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setError('เบราว์เซอร์นี้ยังไม่รองรับระบบสั่งการด้วยเสียง กรุณาใช้ Chrome, Edge หรือ Safari');
      setIsSupported(false);
      return;
    }

    setError(null);
    stopListening();

    try {
      const rec = new SpeechRec();
      // Android Chrome performs significantly better with single-turn (continuous = false) + auto-restart
      rec.continuous = isAndroid ? false : continuous;
      rec.interimResults = true;
      rec.lang = language;
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        startAudioLevelSimulation();
        resetInactivityTimer();
      };

      rec.onaudiostart = () => {
        isSpeakingRef.current = true;
        resetInactivityTimer();
      };

      rec.onspeechstart = () => {
        isSpeakingRef.current = true;
        resetInactivityTimer();
      };

      rec.onspeechend = () => {
        isSpeakingRef.current = false;
      };

      rec.onsoundend = () => {
        isSpeakingRef.current = false;
      };

      rec.onresult = (event: any) => {
        isSpeakingRef.current = true;
        resetInactivityTimer();

        let interim = '';
        let finalStr = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalStr += trans;
          } else {
            interim += trans;
          }
        }

        // Handle interim speech
        if (interim) {
          const cleanedInterim = interim.trim();
          setInterimTranscript(cleanedInterim);
          currentInterimRef.current = cleanedInterim;

          // Smart Silence/Decision Timeout:
          // If iOS (or browser) holds interim text and user pauses speaking for silenceTimeoutMs,
          // auto-finalize the transcript so the system decides immediately!
          clearSilenceDecisionTimer();
          silenceTimerRef.current = setTimeout(() => {
            const pendingText = currentInterimRef.current.trim();
            if (pendingText && isListeningRef.current) {
              // Auto-finalize interim transcript
              currentInterimRef.current = '';
              setInterimTranscript('');
              setLastFinalTranscript(pendingText);
              lastFinalizedTextRef.current = pendingText;
              lastFinalizedTimeRef.current = Date.now();

              if (onFinalResultRef.current) {
                onFinalResultRef.current(pendingText);
              }

              // On continuous iOS, abort to reset recognition buffer for next sentence
              try {
                rec.abort();
              } catch {
                // Ignore
              }
            }
          }, silenceTimeoutMs);
        }

        // Handle finalized speech
        if (finalStr.trim()) {
          clearSilenceDecisionTimer();
          const cleaned = finalStr.trim();

          // Deduplicate against auto-finalized interim within last 1200ms
          const isDuplicate =
            cleaned === lastFinalizedTextRef.current &&
            Date.now() - lastFinalizedTimeRef.current < 1500;

          if (!isDuplicate) {
            lastFinalizedTextRef.current = cleaned;
            lastFinalizedTimeRef.current = Date.now();
            setLastFinalTranscript(cleaned);
            setInterimTranscript('');
            currentInterimRef.current = '';

            if (onFinalResultRef.current) {
              onFinalResultRef.current(cleaned);
            }
          }
        }
      };

      rec.onerror = (e: any) => {
        if (e.error === 'no-speech') {
          // Expected when quiet, ignore and allow onend to restart smoothly
          return;
        }
        if (e.error === 'not-allowed') {
          setError('กรุณาอนุญาตการเข้าถึงไมโครโฟนเพื่อใช้งานระบบเสียง (แตะอนุญาตหรือตรวจสอบการตั้งค่าเบราว์เซอร์)');
          stopListening();
          return;
        }
        if (e.error === 'audio-capture') {
          // Retry briefly if audio device temporarily busy
          if (isListeningRef.current) {
            restartTimeoutRef.current = setTimeout(() => {
              if (isListeningRef.current) {
                try {
                  rec.start();
                } catch {
                  // Ignore
                }
              }
            }, 350);
            return;
          }
        }
        if (e.error === 'network') {
          setError('เกิดปัญหาเครือข่ายในการประมวลผลเสียง กรุณาตรวจสอบอินเทอร์เน็ต');
          return;
        }
        setError(`ข้อผิดพลาดการรู้จำเสียง: ${e.error || 'Unknown'}`);
      };

      rec.onend = () => {
        clearSilenceDecisionTimer();

        // If there was an unfinalized interim when recognition ended, finalize it now
        const pendingInterim = currentInterimRef.current.trim();
        if (pendingInterim) {
          currentInterimRef.current = '';
          setInterimTranscript('');
          setLastFinalTranscript(pendingInterim);
          lastFinalizedTextRef.current = pendingInterim;
          lastFinalizedTimeRef.current = Date.now();
          if (onFinalResultRef.current) {
            onFinalResultRef.current(pendingInterim);
          }
        }

        // Auto-restart if user intends to stay in listening mode
        if (isListeningRef.current && continuous) {
          restartTimeoutRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              try {
                rec.start();
              } catch {
                // If rec.start() fails because it is already active or in transition, retry once
                setTimeout(() => {
                  if (isListeningRef.current) {
                    try {
                      rec.start();
                    } catch {
                      isListeningRef.current = false;
                      setIsListening(false);
                      stopAudioLevelSimulation();
                    }
                  }
                }, 300);
              }
            }
          }, isAndroid ? 150 : 100);
        } else {
          isListeningRef.current = false;
          setIsListening(false);
          stopAudioLevelSimulation();
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      setError(`ไม่สามารถเปิดใช้งานไมโครโฟนได้: ${err?.message || 'Error'}`);
      isListeningRef.current = false;
      setIsListening(false);
      stopAudioLevelSimulation();
    }
  }, [
    clearSilenceDecisionTimer,
    continuous,
    inactivityTimeoutMs,
    isAndroid,
    language,
    resetInactivityTimer,
    silenceTimeoutMs,
    startAudioLevelSimulation,
    stopAudioLevelSimulation,
    stopListening,
  ]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Restart recognition if language changes while listening
  useEffect(() => {
    if (isListeningRef.current) {
      startListening();
    }
  }, [language, startListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      stopAudioLevelSimulation();
      clearSilenceDecisionTimer();
      clearInactivityTimer();
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignore
        }
      }
    };
  }, [clearInactivityTimer, clearSilenceDecisionTimer, stopAudioLevelSimulation]);

  return {
    isSupported,
    isListening,
    language,
    setLanguage,
    startListening,
    stopListening,
    toggleListening,
    interimTranscript,
    lastFinalTranscript,
    audioLevel,
    error,
    isAndroid,
  };
}

