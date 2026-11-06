import { memo, useState } from 'react';
import { resolveCardImageUrl, handleCardImageError } from '../../../utils/cardImage';
import { useBalatroCardTilt } from '../../playmat-v3/hooks/useBalatroCardTilt';
import {
  getSleeveStyleClasses,
  getVariantBadgeInfo,
  formatSlotCollectorNumber,
} from './binderUtils';
import type { BinderSlotItem, PocketSleeveStyle } from '../../../types/binder';

export interface BinderPocketSlotProps {
  slot: BinderSlotItem;
  card?: any;
  sleeveStyle?: PocketSleeveStyle;
  isInteractive?: boolean;
  mode?: 'auto-set' | 'custom';
  pageIndex?: number;
  onSlotClick?: (slot: BinderSlotItem, card?: any) => void;
  onEmptySlotClick?: (slotIndex: number) => void;
  onRemoveCard?: (slotIndex: number) => void;
  onMoveCard?: (
    source: { pageIndex: number; slotIndex: number },
    target: { pageIndex: number; slotIndex: number }
  ) => void;
  movingSource?: { pageIndex: number; slotIndex: number } | null;
  onStartMove?: (source: { pageIndex: number; slotIndex: number }) => void;
  onCancelMove?: () => void;
}

export const BinderPocketSlot = memo(function BinderPocketSlot({
  slot,
  card,
  sleeveStyle = 'matte-black',
  isInteractive = true,
  mode = 'auto-set',
  pageIndex = 0,
  onSlotClick,
  onEmptySlotClick,
  onRemoveCard,
  onMoveCard,
  movingSource,
  onStartMove,
  onCancelMove,
}: BinderPocketSlotProps) {
  const { isOwned, count = 0, variant } = slot;
  const hasCard = Boolean(slot.cardId && card);
  const [isDragOver, setIsDragOver] = useState(false);

  const isThisMovingSource = Boolean(
    movingSource &&
    movingSource.pageIndex === pageIndex &&
    movingSource.slotIndex === slot.slotIndex
  );
  const isAnyMovingActive = Boolean(movingSource);

  // Balatro 3D tilt interaction (smooth perspective rotation and reflection)
  const {
    transformStyle,
    glintStyle,
    onPointerMove,
    onPointerEnter,
    onPointerLeave,
  } = useBalatroCardTilt({
    maxTilt: 14,
    scale: 1.05,
    elevation: 12,
    enabled: isInteractive && hasCard && !isThisMovingSource && !isDragOver,
  });

  const sleeveClasses = getSleeveStyleClasses(sleeveStyle);
  const badgeInfo = hasCard ? getVariantBadgeInfo(variant, card?.rarityCode) : null;
  const collectorNumDisplay = hasCard ? formatSlotCollectorNumber(card?.collectorNumber) : '';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isThisMovingSource) {
      onCancelMove?.();
      return;
    }
    if (isAnyMovingActive && movingSource) {
      onMoveCard?.(movingSource, { pageIndex, slotIndex: slot.slotIndex });
      return;
    }
    if (hasCard) {
      onSlotClick?.(slot, card);
    } else if (mode === 'custom') {
      onEmptySlotClick?.(slot.slotIndex);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveCard?.(slot.slotIndex);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (mode !== 'custom' || !hasCard) return;
    const payload = JSON.stringify({
      pageIndex,
      slotIndex: slot.slotIndex,
    });
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (mode !== 'custom') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (mode !== 'custom') return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (mode !== 'custom') return;
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (mode !== 'custom') return;
    e.preventDefault();
    setIsDragOver(false);
    try {
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;
      const source = JSON.parse(raw);
      if (source && typeof source.slotIndex === 'number') {
        const target = { pageIndex, slotIndex: slot.slotIndex };
        if (source.pageIndex !== target.pageIndex || source.slotIndex !== target.slotIndex) {
          onMoveCard?.(source, target);
        }
      }
    } catch (err) {
      console.error('Failed to parse drag drop payload', err);
    }
  };

  return (
    <div
      className={`relative aspect-[63/88] w-full select-none transition-all duration-200 ${
        isDragOver
          ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 scale-105 z-30 shadow-2xl shadow-amber-400/50 rounded-[7px]'
          : isThisMovingSource
          ? 'opacity-40 ring-2 ring-amber-400 scale-95 z-20 rounded-[7px]'
          : isAnyMovingActive
          ? 'hover:ring-2 hover:ring-amber-300/80 cursor-pointer rounded-[7px]'
          : ''
      }`}
      style={{ perspective: 1000 }}
      data-testid={`binder-slot-${slot.slotIndex}`}
      draggable={mode === 'custom' && hasCard}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 3D Transform Container */}
      <div
        className="relative w-full h-full transition-transform duration-200 ease-out cursor-pointer rounded-[7px] overflow-hidden"
        style={transformStyle}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onClick={handleClick}
      >
        {/* Layer 1 & 2: Archival Pocket Backing & Inner Sleeve */}
        <div className={`absolute inset-0 rounded-[7px] ${sleeveClasses} transition-all duration-300`} />

        {/* Layer 3: Card Content */}
        {hasCard ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-[2px]">
            {isOwned ? (
              /* OWNED CARD: High-def, full-color rendering */
              <div className="relative w-full h-full rounded-[5px] overflow-hidden">
                <img
                  src={resolveCardImageUrl(card, false)}
                  alt={card?.nameTh || card?.name || 'การ์ดโปเกมอน'}
                  className="w-full h-full object-cover rounded-[5px] shadow-sm pointer-events-none"
                  loading="lazy"
                  onError={(e) => handleCardImageError(e, card)}
                />

                {/* Specular Balatro Foil Glint Overlay */}
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-overlay transition-opacity duration-150"
                  style={glintStyle}
                />

                {/* Variant & Rarity Badges (Top Left) */}
                {badgeInfo && (
                  <div className="absolute top-1 left-1 z-10">
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded shadow-md border border-white/20 uppercase tracking-wider ${badgeInfo.className}`}
                    >
                      {badgeInfo.label}
                    </span>
                  </div>
                )}

                {/* Owned Quantity Count (Top Right, if > 1) */}
                {count > 1 && (
                  <div className="absolute top-1 right-1 z-10">
                    <span className="bg-amber-500/90 text-black font-black text-[9px] px-1.5 py-0.5 rounded shadow-md border border-amber-300/40">
                      x{count}
                    </span>
                  </div>
                )}

                {/* Collector Number Badge (Bottom Right) */}
                {collectorNumDisplay && (
                  <div className="absolute bottom-1 right-1 z-10">
                    <span className="bg-black/75 backdrop-blur-sm text-neutral-300 font-mono text-[8px] px-1 py-0.2 rounded border border-white/10">
                      {collectorNumDisplay}
                    </span>
                  </div>
                )}

              </div>
            ) : (
              /* UNOWNED GHOST SILHOUETTE: Translucent checklist style */
              <div className="relative w-full h-full rounded-[5px] overflow-hidden flex flex-col items-center justify-between p-1 bg-black/40">
                {/* Silhouette card image */}
                <img
                  src={resolveCardImageUrl(card, false)}
                  alt={card?.nameTh || card?.name || 'ยังไม่ครอบครอง'}
                  className="w-full h-full object-cover rounded-[5px] opacity-25 grayscale brightness-75 transition-opacity hover:opacity-35 pointer-events-none"
                  loading="lazy"
                  onError={(e) => handleCardImageError(e, card)}
                />

                {/* Center Missing Checklist Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center pointer-events-none">
                  <div className="w-5 h-5 mb-0.5 rounded-full border border-dashed border-white/30 flex items-center justify-center text-white/40 text-[10px]">
                    🔒
                  </div>
                  <span className="text-[10px] font-mono font-bold text-white/70 tracking-wider">
                    {collectorNumDisplay}
                  </span>
                  <span className="text-[9px] font-medium text-white/60 line-clamp-1 px-1">
                    {card?.nameTh || card?.name || 'การ์ดสะสม'}
                  </span>
                </div>
              </div>
            )}

            {/* Custom Mode: Action Buttons (Move & Remove) for all cards */}
            {mode === 'custom' && (
              <div className="absolute top-1 right-1 z-20 flex items-center gap-1">
                <button
                  type="button"
                  title="ย้ายตำแหน่งการ์ด (หรือลากย้าย)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartMove?.({ pageIndex, slotIndex: slot.slotIndex });
                  }}
                  data-testid={`btn-move-slot-${slot.slotIndex}`}
                  className="w-5 h-5 rounded-full bg-amber-500/90 hover:bg-amber-400 text-neutral-950 flex items-center justify-center text-[10px] font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  ⇄
                </button>
                <button
                  type="button"
                  title="นำการ์ดออก"
                  onClick={handleRemove}
                  data-testid={`btn-remove-slot-${slot.slotIndex}`}
                  className="w-5 h-5 rounded-full bg-red-600/80 hover:bg-red-500 text-white flex items-center justify-center text-[10px] font-bold shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        ) : (
          /* EMPTY POCKET */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-2 text-center">
            {mode === 'custom' ? (
              <div
                className={`w-full h-full border-2 border-dashed rounded-[6px] flex flex-col items-center justify-center gap-1 transition-colors group ${
                  isAnyMovingActive
                    ? 'border-amber-400/80 bg-amber-500/10 text-amber-300'
                    : 'border-white/15 hover:border-amber-400/50'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    isAnyMovingActive
                      ? 'bg-amber-400/30 text-amber-200'
                      : 'bg-white/5 group-hover:bg-amber-400/20 text-white/40 group-hover:text-amber-300'
                  }`}
                >
                  {isAnyMovingActive ? '⇣' : '+'}
                </div>
                <span
                  className={`text-[9px] font-medium transition-colors ${
                    isAnyMovingActive
                      ? 'text-amber-200 font-bold'
                      : 'text-white/40 group-hover:text-amber-200'
                  }`}
                >
                  {isAnyMovingActive ? 'วางที่นี่' : 'ใส่การ์ด'}
                </span>
              </div>
            ) : (
              <div className="w-full h-full border border-dashed border-white/5 rounded-[6px] flex items-center justify-center">
                <span className="text-white/10 text-xs font-mono">
                  {slot.slotIndex + 1}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Layer 4: Clear Pocket Plastic Sheen (Reflective archival sleeve texture) */}
        <div
          className="pointer-events-none absolute inset-0 rounded-[7px] bg-gradient-to-tr from-transparent via-white/[0.08] to-transparent opacity-90"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0.06) 100%)',
          }}
        />

        {/* Subtle Top Pocket Slip Opening Rim (Physical top-loader or 9-pocket page opening) */}
        <div className="pointer-events-none absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      </div>
    </div>
  );
});
