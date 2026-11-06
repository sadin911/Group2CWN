import React, { useState, useMemo, useEffect } from 'react';
import type { CardInstance } from '../../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../../utils/cardImage';
import { getCardDisplayName } from '../../../utils/pokemonThaiTranslator';
import { Sound } from '../../../engine/pixi/SoundEffects';

export interface EmptySlotPickerModalProps {
  isOpen: boolean;
  targetSide: 'player1' | 'player2';
  targetPosition: 'ACTIVE' | number;
  handCards: CardInstance[];
  isGameStarted?: boolean;
  onSelectCard: (card: CardInstance, facedown: boolean) => void;
  onClose: () => void;
  onDrawCard?: () => void;
}

export const EmptySlotPickerModal: React.FC<EmptySlotPickerModalProps> = ({
  isOpen,
  targetSide: _targetSide,
  targetPosition,
  handCards,
  isGameStarted,
  onSelectCard,
  onClose,
  onDrawCard,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'basic' | 'evolution'>('basic');
  const [placeFacedown, setPlaceFacedown] = useState<boolean>(!isGameStarted);

  const isBench = typeof targetPosition === 'number';
  const targetTitle = isBench
    ? `เลือกการ์ดวางลง เบนช์ ช่องที่ ${targetPosition + 1}`
    : 'เลือกการ์ดวางลงตำแหน่ง Active';

  // Categorize cards in hand
  const { basicCards, evolutionCards } = useMemo(() => {
    const basics: CardInstance[] = [];
    const evos: CardInstance[] = [];

    handCards.forEach((c) => {
      if (c.supertype === 'Pokemon') {
        const isBasic = c.subtypes?.includes('Basic') || !c.evolvesFrom;
        if (isBasic) {
          basics.push(c);
        } else {
          evos.push(c);
        }
      }
    });

    return { basicCards: basics, evolutionCards: evos };
  }, [handCards]);

  const displayedCards = useMemo(() => {
    if (filterType === 'basic') return basicCards.length > 0 ? basicCards : handCards;
    if (filterType === 'evolution') return evolutionCards.length > 0 ? evolutionCards : handCards;
    return handCards;
  }, [filterType, basicCards, evolutionCards, handCards]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="empty-slot-picker-modal"
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      style={{ touchAction: 'auto' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[88dvh] flex flex-col rounded-2xl sm:rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-emerald-500/40 shadow-2xl shadow-emerald-950/80 ring-1 ring-white/10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-xl sm:text-2xl shrink-0">{isBench ? '🎴' : '⚔️'}</span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white tracking-wide truncate">
                {targetTitle}
              </h2>
              <p className="text-[10px] sm:text-xs text-emerald-400/90 font-medium truncate">
                แตะที่การ์ดเพื่อวางลงตำแหน่งนี้ทันที
              </p>
            </div>
          </div>
          <button
            id="btn-close-slot-picker"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 font-bold transition-all active:scale-95 cursor-pointer shrink-0"
            title="ปิด"
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs & Facedown Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 sm:px-6 py-2 bg-slate-900/60 border-b border-white/5 shrink-0">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-black/40 border border-white/10 text-xs overflow-x-auto no-scrollbar">
            <button
              id="tab-filter-basic"
              onClick={() => setFilterType('basic')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'basic'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              พื้นฐาน ({basicCards.length})
            </button>
            <button
              id="tab-filter-evolution"
              onClick={() => setFilterType('evolution')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'evolution'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              พัฒนาร่าง ({evolutionCards.length})
            </button>
            <button
              id="tab-filter-all"
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทั้งหมด ({handCards.length})
            </button>
          </div>

          {/* Facedown Toggle (Available before game started or anytime) */}
          {!isGameStarted && (
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 cursor-pointer select-none px-2 py-0.5 rounded-lg bg-slate-800/60 border border-white/10 hover:border-white/20 transition-colors">
              <input
                type="checkbox"
                id="checkbox-place-facedown"
                checked={placeFacedown}
                onChange={(e) => setPlaceFacedown(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-white/20 cursor-pointer"
              />
              <span className="flex items-center gap-1 text-[11px]">
                <span>🎴</span>
                <span>วางคว่ำหน้า</span>
              </span>
            </label>
          )}
        </div>

        {/* Card Grid Body */}
        <div
          id="slot-picker-card-grid"
          className="flex-1 overflow-y-auto overscroll-contain p-2.5 sm:p-4"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >
          {displayedCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-4xl sm:text-5xl mb-3 opacity-60">🃏</span>
              <p className="text-sm sm:text-base font-bold text-slate-300 mb-1">
                ไม่มีการ์ดที่ตรงกับเงื่อนไขในมือ
              </p>
              <p className="text-xs text-slate-500 mb-4 max-w-sm">
                คุณสามารถจั่วการ์ดใหม่ หรือค้นหาการ์ดจากกองสำรับเพื่อนำขึ้นมือได้
              </p>
              {onDrawCard && (
                <button
                  id="btn-modal-quick-draw"
                  onClick={() => {
                    Sound.playCardFlip();
                    onDrawCard();
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-950/50 border border-emerald-400/40 transition-all active:scale-95 cursor-pointer"
                >
                  <span>🃏</span>
                  <span>จั่วการ์ด +1 ใบ</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
              {displayedCards.map((card) => {
                const cardName = getCardDisplayName(card);
                const imageUrl = resolveCardImageUrl(card);
                const isBasic = card.subtypes?.includes('Basic') || !card.evolvesFrom;

                return (
                  <button
                    key={card.instanceId}
                    data-testid="picker-card-item"
                    data-card-id={card.instanceId}
                    onClick={() => {
                      Sound.playCardPlacement();
                      onSelectCard(card, placeFacedown);
                    }}
                    className="group relative flex flex-col rounded-2xl p-1.5 bg-slate-950/80 hover:bg-slate-800 border-2 border-white/15 hover:border-emerald-400/80 shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer text-left overflow-hidden"
                  >
                    {/* Card Art Aspect Ratio 63/88 */}
                    <div className="relative aspect-[63/88] w-full rounded-xl overflow-hidden bg-slate-900 shadow-md">
                      <img
                        src={imageUrl}
                        alt={cardName}
                        draggable={false}
                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => handleCardImageError(e, card)}
                      />
                      {/* Subtype Badge */}
                      <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-slate-950/90 text-[9px] font-black border border-white/20 text-white whitespace-nowrap shadow-sm">
                        {isBasic ? 'Basic' : card.subtypes?.[0] || 'Card'}
                      </div>
                      {/* HP Badge if Pokemon */}
                      {card.hp && (
                        <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-emerald-950/90 text-[9px] font-black text-emerald-300 border border-emerald-400/40 shadow-sm">
                          {card.hp} HP
                        </div>
                      )}
                    </div>

                    {/* Card Name */}
                    <div className="mt-1.5 px-1">
                      <p className="text-[11px] sm:text-xs font-black text-white truncate group-hover:text-emerald-300 transition-colors">
                        {cardName}
                      </p>
                      <p className="text-[9px] font-mono text-slate-400 truncate">
                        {card.nameEn || card.cardCode || ''}
                      </p>
                    </div>

                    {/* Quick Action Overlay on Hover */}
                    <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                      <div className="px-3 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black shadow-lg">
                        วางทันที 📥
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
