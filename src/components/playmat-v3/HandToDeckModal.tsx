import React, { useState, useMemo } from 'react';
import type { CardInstance } from '../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import { getCardDisplayName, translateSupertype } from '../../utils/pokemonThaiTranslator';

export interface HandToDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  handCards: CardInstance[];
  playerName?: string;
  onReturnToDeck: (cardIds: string[], position: 'TOP' | 'BOTTOM' | 'SHUFFLE') => void;
}

export const HandToDeckModal: React.FC<HandToDeckModalProps> = ({
  isOpen,
  onClose,
  handCards,
  playerName,
  onReturnToDeck,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset or initialize selection when modal opens
  const allCardIds = useMemo(() => handCards.map((c) => c.instanceId), [handCards]);

  if (!isOpen) return null;

  const toggleSelect = (instanceId: string) => {
    Sound.playCardPlacement();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(instanceId)) {
        next.delete(instanceId);
      } else {
        next.add(instanceId);
      }
      return next;
    });
  };

  const selectAll = () => {
    Sound.playCardPlacement();
    setSelectedIds(new Set(allCardIds));
  };

  const clearSelection = () => {
    Sound.playCardPlacement();
    setSelectedIds(new Set());
  };

  const handleConfirm = (position: 'TOP' | 'BOTTOM' | 'SHUFFLE') => {
    if (selectedIds.size === 0) return;
    if (position === 'SHUFFLE') {
      Sound.playShuffle();
    } else {
      Sound.playCardFlip();
    }
    onReturnToDeck(Array.from(selectedIds), position);
    onClose();
  };

  const selectedCount = selectedIds.size;

  return (
    <div
      id="hand-to-deck-modal"
      data-testid="hand-to-deck-modal"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none"
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-white/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">📥</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>นำการ์ดบนมือกลับเข้ากองสำรับ (Return to Deck)</span>
                {playerName && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950/80 text-sky-300 border border-sky-400/40">
                    {playerName}
                  </span>
                )}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">
                เลือกการ์ดที่ต้องการส่งกลับ แล้วเลือก [วางบนสุด] [ใส่ใต้สุด] หรือ [สับเข้ากอง]
              </p>
            </div>
          </div>
          <button
            id="btn-close-hand-to-deck-modal"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Quick Selection Controls */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-white/10 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              id="btn-select-all-hand-to-deck"
              type="button"
              onClick={selectAll}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/15 transition-all active:scale-95 cursor-pointer"
            >
              ✓ เลือกทั้งหมด ({handCards.length})
            </button>
            <button
              id="btn-clear-hand-to-deck"
              type="button"
              onClick={clearSelection}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-white/10 transition-all active:scale-95 cursor-pointer"
            >
              ล้างการเลือก
            </button>
          </div>

          <div className="text-xs font-bold text-sky-300">
            เลือกแล้ว: <span className="text-white font-mono text-sm">{selectedCount}</span> / {handCards.length} ใบ
          </div>
        </div>

        {/* Hand Cards Gallery Grid */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          {handCards.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              ไม่มีการ์ดบนมือ
            </div>
          ) : (
            <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-2.5">
              {handCards.map((card, idx) => {
                const isSelected = selectedIds.has(card.instanceId);
                const imageUrl = resolveCardImageUrl(card);
                const cardName = getCardDisplayName(card);

                return (
                  <div
                    key={card.instanceId || idx}
                    id={`hand-to-deck-card-${card.instanceId || idx}`}
                    data-selected={isSelected ? 'true' : 'false'}
                    onClick={() => toggleSelect(card.instanceId)}
                    className={`group relative flex flex-col rounded-xl overflow-hidden border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'border-2 border-sky-400 ring-4 ring-sky-500/40 bg-sky-950/60 shadow-xl shadow-sky-950/70 scale-102'
                        : 'border-white/15 bg-slate-900/80 hover:border-white/40 hover:scale-101'
                    }`}
                  >
                    {/* Checkbox indicator */}
                    <div className="absolute top-1.5 right-1.5 z-20">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black shadow-md border ${
                          isSelected
                            ? 'bg-sky-500 border-white text-white shadow-sky-500/50'
                            : 'bg-black/60 border-white/30 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </div>

                    <div className="relative aspect-[63/88] w-full bg-slate-950">
                      <img
                        src={imageUrl}
                        alt={cardName}
                        className="w-full h-full object-cover"
                        loading="eager"
                        onError={(e) => handleCardImageError(e, card)}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-sky-500/20 pointer-events-none" />
                      )}
                    </div>

                    {/* Card Name & Tag */}
                    <div className="p-1 sm:p-1.5 flex flex-col gap-0.5 bg-slate-950/95 text-center">
                      <span className="text-[8.5px] sm:text-[9.5px] font-bold text-slate-200 truncate">
                        {cardName}
                      </span>
                      <span
                        className={`text-[7px] sm:text-[8px] font-semibold px-1 py-0.2 rounded-full ${
                          card.supertype === 'Pokemon'
                            ? 'bg-emerald-900/80 text-emerald-200'
                            : card.supertype === 'Trainer'
                            ? 'bg-purple-900/80 text-purple-200'
                            : card.supertype === 'Energy'
                            ? 'bg-amber-900/80 text-amber-200'
                            : 'bg-blue-900/80 text-blue-200'
                        }`}
                      >
                        {translateSupertype(card.supertype)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-slate-900/95 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 sm:px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-white/15 transition-all active:scale-95 cursor-pointer"
          >
            ✕ ยกเลิก
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              id="btn-put-deck-top-selected"
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleConfirm('TOP')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white border-sky-400/50 shadow-sky-950/60'
                  : 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <span>⬆️</span>
              <span>วางบนสุดเด็ค ({selectedCount})</span>
            </button>

            <button
              id="btn-put-deck-bottom-selected"
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleConfirm('BOTTOM')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-indigo-700 to-slate-800 hover:from-indigo-600 hover:to-slate-700 text-white border-indigo-400/50 shadow-indigo-950/60'
                  : 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <span>⬇️</span>
              <span>ใส่ใต้สุดเด็ค ({selectedCount})</span>
            </button>

            <button
              id="btn-shuffle-deck-selected"
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleConfirm('SHUFFLE')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black shadow-lg border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                selectedCount > 0
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-purple-400/50 shadow-purple-950/60 animate-pulse'
                  : 'bg-slate-800 text-slate-500 border-white/5 cursor-not-allowed opacity-50'
              }`}
            >
              <span>🔀</span>
              <span>สับเข้ากอง ({selectedCount})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
