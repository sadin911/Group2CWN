import React, { useState, useMemo } from 'react';
import type { CardInstance } from '../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import { getCardDisplayName, translateSupertype } from '../../utils/pokemonThaiTranslator';

export interface HandToDiscardModalProps {
  isOpen: boolean;
  onClose: () => void;
  handCards: CardInstance[];
  playerName?: string;
  onDiscard: (cardIds: string[]) => void;
  onLostZone?: (cardIds: string[]) => void;
}

export const HandToDiscardModal: React.FC<HandToDiscardModalProps> = ({
  isOpen,
  onClose,
  handCards,
  playerName,
  onDiscard,
  onLostZone,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleConfirmDiscard = () => {
    if (selectedIds.size === 0) return;
    Sound.playCardPlacement();
    onDiscard(Array.from(selectedIds));
    setSelectedIds(new Set());
    onClose();
  };

  const handleConfirmLostZone = () => {
    if (selectedIds.size === 0) return;
    Sound.playCardFlip();
    onLostZone?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div
      id="hand-to-discard-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-slate-900/98 border border-white/20 rounded-3xl shadow-2xl p-4 sm:p-5 text-white flex flex-col gap-3.5 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🗑️</span>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                เลือกทิ้งการ์ดจากมือ
                {playerName && <span className="text-xs font-semibold text-indigo-400">({playerName})</span>}
              </h3>
              <p className="text-[11px] text-slate-400">
                แตะเลือกการ์ดที่ต้องการทิ้งลงสุสาน หรือส่งไปยัง Lost Zone
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-hand-discard-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Toolbar: Card counts & Quick Select */}
        <div className="flex items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <span>บนมือ: <strong className="text-white font-mono">{handCards.length}</strong> ใบ</span>
            <span>•</span>
            <span className={selectedIds.size > 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}>
              เลือกแล้ว: <strong className="font-mono">{selectedIds.size}</strong> ใบ
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              id="btn-discard-modal-select-all"
              onClick={selectAll}
              disabled={handCards.length === 0 || selectedIds.size === handCards.length}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-slate-200 transition active:scale-95 cursor-pointer"
            >
              เลือกทั้งหมด
            </button>
            <button
              type="button"
              id="btn-discard-modal-clear"
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
            >
              ล้างที่เลือก
            </button>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[50vh] p-2 rounded-2xl bg-slate-950/70 border border-white/5 scrollbar-thin">
          {handCards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-xs">ไม่มีการ์ดบนมือ</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 sm:gap-3">
              {handCards.map((card, idx) => {
                const isSelected = selectedIds.has(card.instanceId);
                const displayName = getCardDisplayName(card);
                const supertype = translateSupertype(card.supertype);
                return (
                  <div
                    key={card.instanceId || idx}
                    id={`discard-card-option-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(card.instanceId)}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer select-none group flex flex-col items-center bg-slate-900 ${
                      isSelected
                        ? 'border-amber-400 ring-2 ring-amber-400/40 scale-[1.02] shadow-lg shadow-amber-500/20'
                        : 'border-transparent hover:border-white/30 hover:scale-[1.01]'
                    }`}
                  >
                    {/* Card Image */}
                    <div className="relative w-full aspect-[2.5/3.5] bg-slate-950 overflow-hidden">
                      <img
                        src={resolveCardImageUrl(card)}
                        alt={displayName}
                        onError={(e) => handleCardImageError(e, card)}
                        className={`w-full h-full object-cover transition-opacity ${
                          isSelected ? 'opacity-90' : 'opacity-100 group-hover:opacity-95'
                        }`}
                        loading="lazy"
                      />

                      {/* Supertype pill */}
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/70 text-slate-300 backdrop-blur-xs">
                        {supertype}
                      </span>

                      {/* Checkbox indicator */}
                      <div
                        className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black transition-all ${
                          isSelected
                            ? 'bg-amber-400 text-slate-950 shadow'
                            : 'bg-black/60 text-white/40 border border-white/20'
                        }`}
                      >
                        {isSelected ? '✓' : ''}
                      </div>
                    </div>

                    {/* Card Name */}
                    <div className="w-full p-1.5 text-center bg-slate-900/90 border-t border-white/5">
                      <p className="text-[10px] font-bold text-slate-200 truncate w-full" title={displayName}>
                        {displayName}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2">
            {onLostZone && (
              <button
                type="button"
                id="btn-confirm-lostzone-cards"
                onClick={handleConfirmLostZone}
                disabled={selectedIds.size === 0}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-800 to-indigo-800 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-xs font-black text-purple-200 shadow-md transition active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <span>🌌</span>
                <span>ส่งไป Lost Zone {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}</span>
              </button>
            )}

            <button
              type="button"
              id="btn-confirm-discard-cards"
              onClick={handleConfirmDiscard}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-xs font-black text-white shadow-lg shadow-red-500/25 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <span>🗑️</span>
              <span>ทิ้งลงสุสาน {selectedIds.size > 0 ? `(${selectedIds.size} ใบ)` : ''}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
