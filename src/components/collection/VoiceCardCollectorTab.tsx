import { useState, useMemo, useEffect, useRef } from 'react';
import {
  useVoiceCardRecognition,
  playVoiceSuccessChime,
  playVoiceCommandChime,
  triggerVoiceHaptic,
} from '../../hooks/useVoiceCardRecognition';
import { parseVoiceInput, type VoiceCardParseResult } from '../../utils/voiceCardParser';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import {
  speakVoiceFeedback,
  formatCardSpokenText,
  formatCommandSpokenText,
  initTtsUnlock,
  stopVoiceFeedback,
  isTtsSupported,
  hasThaiTtsSupport,
} from '../../utils/voiceTts';
import { getEnglishMatchForThaiCard } from '../../utils/thaiEnglishCardMatcher';
import { SearchableSetSelect, type SetOption } from '../common/SearchableSetSelect';
import { useCollectionStore } from '../../store/collectionStore';
import type { CardVariantKey } from '../../types/collection';

export interface StagedVoiceCard {
  id: string; // unique key in staged list
  card: any;
  quantity: number;
  variant: CardVariantKey;
  timestamp: number;
}

interface Props {
  catalog: any[];
  defaultFinish: CardVariantKey;
  targetBinderName?: string;
  onImportCards: (cards: Array<{ cardId: string; quantity: number; variant: CardVariantKey }>) => void;
  onCopyToTextTab: (text: string) => void;
}

const STORAGE_KEY_VOICE_SET = 'pokecount_voice_active_set';
const STORAGE_KEY_VOICE_TTS = 'pokecount_voice_tts_enabled';

const SUGGESTED_PHRASES = [
  'ชุด SV8 เบอร์ 25 สองใบ',
  'เบอร์ 26 หนึ่งใบ',
  'พิคาชู โฮโล',
  'ลิซาร์ดอน ex สองใบ',
  'เพิ่มอีกใบ',
  'ลบอันล่าสุด',
  'บันทึก',
];

export function VoiceCardCollectorTab({
  catalog,
  defaultFinish,
  targetBinderName,
  onImportCards,
  onCopyToTextTab,
}: Props) {
  // Staged cards queue
  const [stagedCards, setStagedCards] = useState<StagedVoiceCard[]>([]);

  // A set chosen on the collection page is the user's current working context,
  // so it wins over the set remembered from the last voice session. Read before
  // the state below, which uses it as its initial value.
  const collectionSetFilter = useCollectionStore((s) => s.filters.selectedSet);

  // Active set context (can be spoken or chosen)
  const [activeSetId, setActiveSetId] = useState<string>(() => {
    if (collectionSetFilter && collectionSetFilter !== 'ALL') return collectionSetFilter;
    return localStorage.getItem(STORAGE_KEY_VOICE_SET) || 'SV8a';
  });

  // Fast TTS confirmation toggle (enabled by default)
  const [ttsEnabled, setTtsEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_VOICE_TTS);
    return stored === null ? true : stored === 'true';
  });

  // Last recognized utterance & parsed info
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [lastParseResult, setLastParseResult] = useState<VoiceCardParseResult | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{ text: string; type: 'success' | 'info' | 'warn' } | null>(null);
  const [candidates, setCandidates] = useState<any[] | null>(null);

  const toastTimeoutRef = useRef<any>(null);

  // Collect all available set IDs and names
  const availableSets = useMemo<SetOption[]>(() => {
    const map = new Map<string, { id: string; name: string; count: number; marks: Set<string> }>();
    for (const card of catalog) {
      const id = card.set?.id;
      if (!id) continue;
      if (!map.has(id)) {
        map.set(id, { id, name: card.set?.name || id, count: 0, marks: new Set<string>() });
      }
      const entry = map.get(id)!;
      entry.count++;
      // Carried through so the picker's regulation quick-tabs can filter,
      // matching how the collection page builds its own set list.
      if (card.regulationMark) entry.marks.add(card.regulationMark);
    }
    return Array.from(map.values()).map((s) => ({
      id: s.id,
      name: s.name,
      count: s.count,
      regulationMarks: Array.from(s.marks),
    }));
  }, [catalog]);

  // Persist active set & TTS setting
  useEffect(() => {
    if (activeSetId) {
      localStorage.setItem(STORAGE_KEY_VOICE_SET, activeSetId);
    }
  }, [activeSetId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VOICE_TTS, String(ttsEnabled));
  }, [ttsEnabled]);

  // Stop any ongoing speech on unmount
  useEffect(() => {
    return () => {
      stopVoiceFeedback();
    };
  }, []);

  const showToast = (text: string, type: 'success' | 'info' | 'warn' = 'info') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setFeedbackToast({ text, type });
    toastTimeoutRef.current = setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  // Add card to staged queue
  const addCardToStaging = (card: any, qty: number = 1, variant?: CardVariantKey) => {
    const v = variant || defaultFinish;
    setStagedCards((prev) => {
      // If card with same id and variant exists, increment
      const existingIdx = prev.findIndex((item) => item.card.id === card.id && item.variant === v);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + qty,
          timestamp: Date.now(),
        };
        return updated;
      }
      return [
        {
          id: `${card.id}-${v}-${Date.now()}`,
          card,
          quantity: qty,
          variant: v,
          timestamp: Date.now(),
        },
        ...prev,
      ];
    });

    playVoiceSuccessChime();
    triggerVoiceHaptic('success');
  };

  // Process speech transcript
  const handleSpeechFinal = (transcript: string) => {
    setLastTranscript(transcript);
    const parsed = parseVoiceInput(transcript, catalog, activeSetId);
    setLastParseResult(parsed);

    // 1. Handle Voice Commands
    if (parsed.type === 'command' && parsed.command) {
      playVoiceCommandChime();
      triggerVoiceHaptic('command');

      switch (parsed.command) {
        case 'undo':
          setStagedCards((prev) => {
            if (prev.length === 0) {
              showToast('ไม่มีรายการการ์ดให้ยกเลิก', 'warn');
              return prev;
            }
            const removed = prev[0];
            showToast(`ยกเลิก ${removed.card.name} #${removed.card.collectorNumber} แล้ว`, 'info');
            if (ttsEnabled) {
              speakVoiceFeedback(formatCommandSpokenText('undo', removed.card.name, language), { lang: language, rate: 1.45 });
            }
            return prev.slice(1);
          });
          break;

        case 'clear':
          if (stagedCards.length > 0) {
            setStagedCards([]);
            showToast('ล้างรายการการ์ดทั้งหมดแล้ว', 'info');
            if (ttsEnabled) {
              speakVoiceFeedback(formatCommandSpokenText('clear', undefined, language), { lang: language, rate: 1.45 });
            }
          }
          break;

        case 'increase_last':
          setStagedCards((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[0] = { ...updated[0], quantity: updated[0].quantity + 1 };
            showToast(`เพิ่ม ${updated[0].card.name} เป็น ${updated[0].quantity} ใบ`, 'success');
            if (ttsEnabled) {
              speakVoiceFeedback(formatCommandSpokenText('increase_last', `${updated[0].card.name} ${updated[0].quantity} ใบ`, language), { lang: language, rate: 1.45 });
            }
            return updated;
          });
          break;

        case 'decrease_last':
          setStagedCards((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            if (updated[0].quantity > 1) {
              updated[0] = { ...updated[0], quantity: updated[0].quantity - 1 };
              showToast(`ลด ${updated[0].card.name} เหลือ ${updated[0].quantity} ใบ`, 'info');
              if (ttsEnabled) {
                speakVoiceFeedback(formatCommandSpokenText('decrease_last', `${updated[0].card.name} ${updated[0].quantity} ใบ`, language), { lang: language, rate: 1.45 });
              }
              return updated;
            } else {
              showToast(`ลบ ${updated[0].card.name} ออกแล้ว`, 'info');
              if (ttsEnabled) {
                speakVoiceFeedback(formatCommandSpokenText('undo', updated[0].card.name, language), { lang: language, rate: 1.45 });
              }
              return prev.slice(1);
            }
          });
          break;

        case 'confirm':
          if (stagedCards.length === 0) {
            showToast('ยังไม่มีรายการการ์ดในรายการที่จะนำเข้า', 'warn');
          } else {
            if (ttsEnabled) {
              speakVoiceFeedback(formatCommandSpokenText('confirm', undefined, language), { lang: language, rate: 1.45 });
            }
            handleConfirmImport();
          }
          break;
      }
      return;
    }

    // 2. Handle Set Change
    if (parsed.type === 'set_change' && parsed.newActiveSet) {
      setActiveSetId(parsed.newActiveSet);
      playVoiceCommandChime();
      triggerVoiceHaptic('command');
      showToast(`สลับชุดปัจจุบันเป็น: ${parsed.newActiveSet}`, 'success');
      if (ttsEnabled) {
        speakVoiceFeedback(formatCommandSpokenText('set_change', parsed.newActiveSet, language), { lang: language, rate: 1.45 });
      }
      return;
    }

    // 3. Handle Card Match
    if (parsed.type === 'card' && parsed.matchedCard) {
      addCardToStaging(parsed.matchedCard, parsed.quantity, parsed.variant);

      if (parsed.candidates && parsed.candidates.length > 1) {
        setCandidates(parsed.candidates);
      } else {
        setCandidates(null);
      }

      // Fast TTS confirmation
      if (ttsEnabled) {
        const enMatch = getEnglishMatchForThaiCard(parsed.matchedCard.id);
        const collectorNum =
          parsed.matchedCard.collectorNumber ||
          parsed.matchedCard.localId ||
          parsed.parsedInfo?.detectedNumber;
        const spoken = formatCardSpokenText(
          parsed.matchedCard.name,
          parsed.quantity,
          parsed.variant,
          language,
          collectorNum,
          enMatch?.enName
        );
        speakVoiceFeedback(spoken, { lang: language, rate: 1.45 });
      }

      showToast(
        `✓ ${parsed.matchedCard.name} #${parsed.matchedCard.collectorNumber || ''} (${parsed.matchedCard.set?.id || ''}) x${parsed.quantity}`,
        'success'
      );
      return;
    }

    // 4. Unknown utterance
    setCandidates(null);
    triggerVoiceHaptic('error');
    showToast(parsed.feedbackMessage || `ไม่เข้าใจคำสั่ง "${transcript}"`, 'warn');
  };

  const {
    isSupported,
    isListening,
    language,
    setLanguage,
    toggleListening,
    interimTranscript,
    audioLevel,
    error,
    isAndroid,
  } = useVoiceCardRecognition({
    onFinalResult: handleSpeechFinal,
    onTimeout: (reason) => {
      if (reason === 'inactivity') {
        if (ttsEnabled) {
          speakVoiceFeedback(formatCommandSpokenText('timeout', undefined, language), { lang: language, rate: 1.45 });
        }
        showToast('⏳ ไม่ได้ยินเสียงพูดนานเกินไป (แตะพูดใหม่อีกครั้ง หรือแตะตัวอย่างด้านล่าง)', 'warn');
      }
    },
    continuous: true,
    silenceTimeoutMs: 1400, // Auto-finalize after 1.4s of silence on interim
  });

  const handleToggleListeningWithUnlock = () => {
    initTtsUnlock();
    toggleListening();
  };

  const handleUpdateQuantity = (id: string, delta: number) => {
    setStagedCards((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as StagedVoiceCard[]
    );
  };

  const handleUpdateVariant = (id: string, newVariant: CardVariantKey) => {
    setStagedCards((prev) =>
      prev.map((item) => (item.id === id ? { ...item, variant: newVariant } : item))
    );
  };

  const handleRemoveCard = (id: string) => {
    setStagedCards((prev) => prev.filter((item) => item.id !== id));
  };

  const totalCardsCount = stagedCards.reduce((acc, c) => acc + c.quantity, 0);

  const handleConfirmImport = () => {
    if (stagedCards.length === 0) return;
    const cardsToImport = stagedCards.map((c) => ({
      cardId: c.card.id,
      quantity: c.quantity,
      variant: c.variant,
    }));
    onImportCards(cardsToImport);
  };

  const handleCopyAsText = () => {
    if (stagedCards.length === 0) return;
    // Group by set
    const bySet = new Map<string, Array<{ num: string; qty: number }>>();
    for (const item of stagedCards) {
      const setId = item.card.set?.id || 'UNKNOWN';
      const num = item.card.collectorNumber || item.card.localId || '1';
      const cleanNum = num.split(/[-/]/)[0];
      if (!bySet.has(setId)) bySet.set(setId, []);
      bySet.get(setId)!.push({ num: cleanNum, qty: item.quantity });
    }

    let resultText = '';
    for (const [sId, list] of bySet.entries()) {
      resultText += `Set ${sId}\n`;
      for (const entry of list) {
        resultText += `${entry.num},${entry.qty}\n`;
      }
      resultText += '\n';
    }

    onCopyToTextTab(resultText.trim());
    showToast('คัดลอกรายการเป็นการ์ดข้อความเรียบร้อย', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Unsupported Browser Warning */}
      {!isSupported && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs leading-relaxed flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-black text-sm">เบราว์เซอร์นี้ยังไม่รองรับ Web Speech API</p>
            <p className="mt-0.5">
              แนะนำให้เปิดใช้งานบน Google Chrome, Microsoft Edge หรือ Safari (รวมถึง iOS/iPadOS และ Android Chrome)
              เพื่อให้สามารถใช้เสียงในการสั่งการ์ดได้เต็มประสิทธิภาพ
            </p>
          </div>
        </div>
      )}

      {/* Voice Studio Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-indigo-900/15 via-purple-900/10 to-slate-900/20 border border-indigo-500/25 shadow-lg">
        {/* Glowing Background Radial */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none transition-all duration-700"
          style={{
            transform: isListening ? `scale(${1 + audioLevel * 0.8})` : 'scale(1)',
            opacity: isListening ? 0.7 + audioLevel * 0.5 : 0.2,
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center space-y-4">
          {/* Active Set & Language Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-indigo-500/15 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold">ชุดปัจจุบัน:</span>
              <div className="min-w-[180px] sm:min-w-[260px] text-left">
                <SearchableSetSelect
                  sets={availableSets}
                  selectedSet={activeSetId}
                  onSelectSet={setActiveSetId}
                  placeholder="ค้นหาชุดการ์ด..."
                  accentColor="indigo"
                  showProgress={false}
                  allowClear={false}
                />
              </div>
              <span className="text-[10px] text-slate-400 hidden sm:inline">(พูด "ชุด..." เพื่อสลับได้)</span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Android Capability Badge */}
              {isAndroid && (
                <span
                  title="ระบบเสียงได้รับการปรับแต่งพิเศษสำหรับ Android Chrome เรียบร้อย"
                  className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-[11px] font-bold hidden sm:inline-flex items-center gap-1"
                >
                  <span>🤖</span> Android
                </span>
              )}

              {/* TTS Voice Confirmation Toggle */}
              {isTtsSupported() && (
                <button
                  type="button"
                  data-testid="voice-tts-toggle-button"
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  title={
                    ttsEnabled
                      ? `เสียงขานรับ TTS เปิดอยู่ (${hasThaiTtsSupport() ? 'รองรับเสียงไทย' : 'ใช้เสียงภาษาอังกฤษสำรอง'} - แตะเพื่อปิด)`
                      : 'เสียงขานรับ TTS ปิดอยู่ (แตะเพื่อเปิด)'
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs flex items-center gap-1 border ${
                    ttsEnabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <span className="text-sm">{ttsEnabled ? '🔊' : '🔈'}</span>
                  <span className="hidden sm:inline">ขานรับ {ttsEnabled ? 'เปิด' : 'ปิด'}</span>
                  {ttsEnabled && !hasThaiTtsSupport() && (
                    <span className="text-[10px] px-1 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded font-semibold">
                      EN Voice
                    </span>
                  )}
                </button>
              )}

              {/* Language Switcher */}
              <div className="flex items-center gap-0.5 bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setLanguage('th-TH')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all text-xs ${
                    language === 'th-TH'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  🇹🇭 ไทย
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('en-US')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all text-xs ${
                    language === 'en-US'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  🇺🇸 EN
                </button>
              </div>
            </div>
          </div>

          {/* Microphone Interactive Center Button */}
          <div className="relative my-2">
            {/* Outer Pulse Rings when listening */}
            {isListening && (
              <>
                <div
                  className="absolute inset-0 rounded-full bg-indigo-500/30 animate-ping"
                  style={{ animationDuration: '2s' }}
                />
                <div
                  className="absolute -inset-3 rounded-full border border-indigo-400/40 transition-transform duration-75 pointer-events-none"
                  style={{ transform: `scale(${1 + audioLevel * 0.4})` }}
                />
                <div
                  className="absolute -inset-6 rounded-full border border-purple-400/25 transition-transform duration-100 pointer-events-none"
                  style={{ transform: `scale(${1 + audioLevel * 0.7})` }}
                />
              </>
            )}

            <button
              type="button"
              onClick={handleToggleListeningWithUnlock}
              data-testid="voice-mic-main-button"
              title={isListening ? 'แตะเพื่อหยุดฟัง' : 'แตะเพื่อเริ่มพูดสั่งการ์ด'}
              className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all duration-300 transform active:scale-95 ${
                isListening
                  ? 'bg-gradient-to-tr from-rose-500 via-pink-500 to-indigo-600 shadow-rose-500/30 scale-105 ring-4 ring-indigo-400/50'
                  : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 hover:shadow-indigo-500/30 hover:scale-105'
              }`}
            >
              <span className="text-3xl sm:text-4xl">{isListening ? '🛑' : '🎙️'}</span>
              <span className="text-[10px] font-black uppercase mt-1 tracking-wider">
                {isListening ? 'กำลังฟัง' : 'แตะเพื่อพูด'}
              </span>
            </button>
          </div>

          {/* Real-time Waveform Indicator */}
          {isListening && (
            <div className="flex items-center gap-1.5 h-6">
              {[0.4, 0.8, 1, 0.7, 0.5, 0.9, 0.3].map((factor, idx) => {
                const height = Math.max(4, audioLevel * 24 * factor);
                return (
                  <div
                    key={idx}
                    className="w-1.5 rounded-full bg-gradient-to-t from-indigo-500 to-pink-500 transition-all duration-75"
                    style={{ height: `${height}px` }}
                  />
                );
              })}
            </div>
          )}

          {/* Live Transcript & Interim Feedback */}
          <div className="w-full max-w-md min-h-[44px] flex items-center justify-center">
            {interimTranscript ? (
              <div className="px-4 py-2 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
                <span className="truncate">"{interimTranscript}..."</span>
              </div>
            ) : lastTranscript ? (
              <div className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2 max-w-full">
                <span className="text-slate-400 shrink-0 font-bold">ได้ยิน:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 truncate">
                  "{lastTranscript}"
                </span>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {isListening
                  ? 'กำลังฟังเสียงของคุณ... ลองพูด "เบอร์ 25 สองใบ" หรือ "พิคาชู โฮโล"'
                  : 'กดปุ่มไมโครโฟนด้านบนแล้วพูดเลขการ์ด หรือชื่อการ์ดได้เลย'}
              </p>
            )}
          </div>

          {/* Breakdown tags if recognized */}
          {lastParseResult?.parsedInfo && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] font-black">
              {lastParseResult.parsedInfo.detectedSet && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  ชุด: {lastParseResult.parsedInfo.detectedSet}
                </span>
              )}
              {lastParseResult.parsedInfo.detectedNumber && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  เลข: #{lastParseResult.parsedInfo.detectedNumber}
                </span>
              )}
              {lastParseResult.parsedInfo.detectedName && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  ชื่อ: {lastParseResult.parsedInfo.detectedName}
                </span>
              )}
              {lastParseResult.parsedInfo.detectedQty && lastParseResult.parsedInfo.detectedQty > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  จำนวน: x{lastParseResult.parsedInfo.detectedQty}
                </span>
              )}
              {lastParseResult.parsedInfo.detectedVariant &&
                lastParseResult.parsedInfo.detectedVariant !== 'normal' && (
                  <span className="px-2 py-0.5 rounded-md bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/20">
                    ฟอยล์: {lastParseResult.parsedInfo.detectedVariant.toUpperCase()}
                  </span>
                )}
            </div>
          )}

          {/* Toast message */}
          {feedbackToast && (
            <div
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                feedbackToast.type === 'success'
                  ? 'bg-emerald-500 text-white'
                  : feedbackToast.type === 'warn'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-indigo-600 text-white'
              }`}
            >
              {feedbackToast.text}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Candidates / Did You Mean Chips */}
      {candidates && candidates.length > 1 && (
        <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <span>🔍 พบหลายการ์ดที่ตรงกับคำพูด แตะการ์ดที่ต้องการ:</span>
            <button
              type="button"
              onClick={() => setCandidates(null)}
              className="text-slate-400 hover:text-slate-600 text-[11px]"
            >
              ซ่อน
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {candidates.map((cand) => (
              <button
                key={cand.id}
                type="button"
                onClick={() => {
                  addCardToStaging(cand, 1);
                  setCandidates(null);
                  showToast(`เพิ่ม ${cand.name} #${cand.collectorNumber} แล้ว`, 'success');
                }}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 shadow-sm shrink-0 transition-all text-left group"
              >
                <img
                  src={resolveCardImageUrl(cand.imageUrl)}
                  onError={(e) => handleCardImageError(e, cand.imageUrl, cand.officialImageUrl)}
                  alt={cand.name}
                  className="w-8 h-11 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate max-w-[120px]">
                    {cand.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    {cand.set?.id} #{cand.collectorNumber}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Spoken Examples */}
      <div className="p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
          <span>💡 ตัวอย่างคำสั่งเสียง (แตะเพื่อลอง):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_PHRASES.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => handleSpeechFinal(phrase)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all hover:border-indigo-400 active:scale-95"
            >
              🗣️ "{phrase}"
            </button>
          ))}
        </div>
      </div>

      {/* Staged Cards Queue */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <span>📋 รายการการ์ดที่สั่งไว้</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-black">
              {totalCardsCount} ใบ ({stagedCards.length} แบบ)
            </span>
          </h3>

          {stagedCards.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAsText}
                className="px-2.5 py-1 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold transition-colors"
                title="แปลงรายการเป็นข้อความสำหรับแท็บ Text"
              >
                คัดลอกเป็น Text
              </button>
              <button
                type="button"
                onClick={() => setStagedCards([])}
                className="px-2.5 py-1 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
              >
                ล้างทั้งหมด
              </button>
            </div>
          )}
        </div>

        {stagedCards.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 space-y-2">
            <span className="text-4xl block">🎙️</span>
            <p className="text-xs font-bold">ยังไม่มีการ์ดในรายการ</p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              กดปุ่มไมค์ด้านบนแล้วเริ่มพูดได้เลย เช่น "ชุด SV8 เบอร์ 25 สองใบ" หรือ "พิคาชู 4 ใบ"
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1 scrollbar-thin">
            {stagedCards.map((item) => {
              const { card, quantity, variant } = item;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-400/50 transition-all"
                >
                  {/* Card Thumbnail & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={resolveCardImageUrl(card.imageUrl)}
                      onError={(e) => handleCardImageError(e, card.imageUrl, card.officialImageUrl)}
                      alt={card.name}
                      className="w-9 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-700 shrink-0 shadow-sm"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                        {card.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 font-bold text-slate-700 dark:text-slate-300">
                          {card.set?.id}
                        </span>
                        <span>#{card.collectorNumber}</span>
                        {card.rarityCode && card.rarityCode !== 'REGULAR' && (
                          <span className="font-extrabold text-amber-500">{card.rarityCode}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper & Variant */}
                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={variant}
                      onChange={(e) => handleUpdateVariant(item.id, e.target.value as CardVariantKey)}
                      className="px-2 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="normal">Normal</option>
                      <option value="holo">Holo</option>
                      <option value="reverse">Reverse</option>
                      <option value="promo">Promo</option>
                    </select>

                    <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-700 p-0.5 border border-slate-200 dark:border-slate-600">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition-colors"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-black text-slate-800 dark:text-white">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-600 transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCard(item.id)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center transition-colors text-xs font-bold"
                      title="ลบรายการนี้"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Primary Submit Action */}
      {stagedCards.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ปลายทาง: <span className="font-bold text-slate-700 dark:text-slate-200">{targetBinderName || 'สมุดสะสม'}</span>
          </div>

          <button
            type="button"
            onClick={handleConfirmImport}
            data-testid="voice-confirm-import-btn"
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:from-indigo-500 hover:to-pink-400 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center gap-2"
          >
            <span>📥</span>
            <span>บันทึก {totalCardsCount} ใบ เข้าสมุดสะสม</span>
          </button>
        </div>
      )}
    </div>
  );
}
