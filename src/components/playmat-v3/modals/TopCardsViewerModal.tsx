import React, { useState } from 'react';
import type { CardInstance } from '../../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../../utils/cardImage';
import { Sound } from '../../../engine/pixi/SoundEffects';
import { getCardDisplayName } from '../../../utils/pokemonThaiTranslator';

interface TopCardsViewerModalProps {
  deck: CardInstance[];
  onClose: () => void;
  onMoveCard: (cardInstanceId: string, toZone: 'HAND' | 'DISCARD' | 'LOST_ZONE') => void;
  onResolveRemainder: (action: 'SHUFFLE' | 'BOTTOM' | 'TOP', remainingCardIds?: string[]) => void;
}

export const TopCardsViewerModal: React.FC<TopCardsViewerModalProps> = ({
  deck = [],
  onClose,
  onMoveCard,
  onResolveRemainder,
}) => {
  const safeDeck = deck || [];
  const [count, setCount] = useState<number>(Math.min(1, safeDeck.length));
  const topCards = safeDeck.slice(0, count);

  const handleTakeToHand = (cardId: string) => {
    Sound.playCardFlip();
    onMoveCard(cardId, 'HAND');
    setCount((prev) => Math.max(0, prev - 1));
  };

  const handleDiscard = (cardId: string) => {
    Sound.playCardFlip();
    onMoveCard(cardId, 'DISCARD');
    setCount((prev) => Math.max(0, prev - 1));
  };

  const handleFinish = (action: 'SHUFFLE' | 'BOTTOM' | 'TOP') => {
    onResolveRemainder(action, topCards.map((c) => c.instanceId));
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
      style={{ touchAction: 'auto' }}
    >
      <div
        id="top-cards-modal"
        className="relative w-full max-w-3xl max-h-[88dvh] bg-slate-900/95 border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3.5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">👁️</span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black tracking-tight truncate">ดูการ์ดใบบนสุด (Top Deck)</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                เปิดดูตามเอฟเฟกต์ (Pokégear, ชุดจับแมลง, อโครมา)
              </p>
            </div>
          </div>

          <button
            id="btn-close-top-cards"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 font-bold"
            title="ปิด"
          >
            ✕
          </button>
        </div>

        {/* Count Stepper */}
        <div className="px-3 py-2 bg-slate-950/50 border-b border-white/10 flex items-center gap-2 text-xs shrink-0">
          <span className="font-semibold text-slate-300 shrink-0 text-[11px] sm:text-xs">จำนวนใบ:</span>
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((num) => (
              <button
                key={num}
                onClick={() => setCount(Math.min(num, deck.length))}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition shrink-0 ${
                  count === num
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-950'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Card Grid */}
        <div
          className="flex-1 p-2.5 sm:p-4 min-h-[180px] overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),0.75rem)]"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {topCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <span className="text-4xl mb-2">📭</span>
              <p className="text-sm">ไม่มีการ์ดให้ตรวจสอบ</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {topCards.map((card, idx) => {
                const cardName = getCardDisplayName(card);
                return (
                  <div
                    key={card.instanceId}
                    id={`top-card-item-${idx}`}
                    data-instance-id={card.instanceId}
                    className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 shadow-lg"
                  >
                    <div className="relative aspect-[63/88] rounded-xl overflow-hidden bg-slate-950">
                      <img
                        src={resolveCardImageUrl(card)}
                        alt={cardName}
                        className="w-full h-full object-cover"
                        onError={(e) => handleCardImageError(e, card)}
                      />
                      <div className="absolute top-1 left-1 bg-black/75 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-sky-400">
                        #{idx + 1}
                      </div>
                    </div>
                    <div className="text-[10px] font-bold truncate text-slate-200 px-0.5" title={cardName}>
                      {cardName}
                    </div>
                    <div className="flex gap-1">
                      <button
                        id={`btn-top-take-hand-${idx}`}
                        onClick={() => handleTakeToHand(card.instanceId)}
                        className="flex-1 py-1 bg-sky-600 hover:bg-sky-500 rounded-lg text-[10px] font-bold text-white transition"
                      >
                        ขึ้นมือ
                      </button>
                      <button
                        id={`btn-top-discard-${idx}`}
                        onClick={() => handleDiscard(card.instanceId)}
                        className="py-1 px-1.5 bg-red-950/70 hover:bg-red-900 rounded-lg text-[10px] font-bold text-red-300 border border-red-500/30 transition"
                      >
                        ทิ้งสุสาน
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Resolution Options */}
        <div className="p-4 bg-slate-950 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-slate-400">
            เลือกการ์ดเสร็จแล้ว? เลือกสิ่งที่ต้องการทำกับการ์ดที่เหลือ:
          </span>
          <div className="flex gap-2">
            <button
              id="btn-resolve-remainder-shuffle"
              onClick={() => handleFinish('SHUFFLE')}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              🔄 สับเข้ากองสำรับ
            </button>
            <button
              id="btn-resolve-remainder-bottom"
              onClick={() => handleFinish('BOTTOM')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              ⬇️ นำลงใต้กองสำรับ
            </button>
            <button
              id="btn-resolve-remainder-top"
              onClick={() => handleFinish('TOP')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              ⬆️ วางไว้บนสุดตามเดิม
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
