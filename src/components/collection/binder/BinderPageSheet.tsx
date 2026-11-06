import { memo } from 'react';
import { BinderPocketSlot } from './BinderPocketSlot';
import { getPocketGridClass } from './binderUtils';
import type { BinderPage, BinderPocketLayout, PocketSleeveStyle, BinderSlotItem } from '../../../types/binder';

export interface BinderPageSheetProps {
  page: BinderPage;
  pageIndex?: number;
  pocketsPerPage: BinderPocketLayout;
  gridCols?: number;
  gridRows?: number;
  side: 'left' | 'right' | 'single';
  sleeveStyle: PocketSleeveStyle;
  mode?: 'auto-set' | 'custom';
  allCardsMap: Map<string, any>;
  isInteractive?: boolean;
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

export const BinderPageSheet = memo(function BinderPageSheet({
  page,
  pageIndex,
  pocketsPerPage,
  gridCols,
  gridRows,
  side,
  sleeveStyle,
  mode = 'auto-set',
  allCardsMap,
  isInteractive = true,
  onSlotClick,
  onEmptySlotClick,
  onRemoveCard,
  onMoveCard,
  movingSource,
  onStartMove,
  onCancelMove,
}: BinderPageSheetProps) {
  const gridClass = getPocketGridClass(pocketsPerPage, gridCols, gridRows);
  const isLeft = side === 'left';
  const isRight = side === 'right';

  // Calculate owned card count on this page
  const totalSlotsWithCards = page.slots.filter((s) => s.cardId).length;
  const ownedSlotsCount = page.slots.filter((s) => s.isOwned).length;

  return (
    <div
      className={`relative w-full h-full flex flex-col justify-between p-3 sm:p-4 rounded-xl bg-gradient-to-b from-[#18181b] via-[#121214] to-[#0c0c0e] border border-white/10 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] ${
        isLeft
          ? 'rounded-r-sm pr-5 sm:pr-6 border-r-neutral-800/80'
          : isRight
          ? 'rounded-l-sm pl-5 sm:pl-6 border-l-neutral-800/80'
          : 'rounded-xl'
      }`}
      data-testid={`binder-page-sheet-${page.pageNumber}`}
    >
      {/* 3 Archival Binder Punch Holes */}
      <div
        className={`pointer-events-none absolute inset-y-0 flex flex-col justify-around py-12 z-20 ${
          isLeft ? 'right-1.5' : isRight ? 'left-1.5' : 'left-1.5'
        }`}
      >
        {[0, 1, 2].map((ringIdx) => (
          <div
            key={ringIdx}
            className="w-3.5 h-3.5 rounded-full bg-neutral-950 border border-white/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] ring-1 ring-black/80 flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-black/80" />
          </div>
        ))}
      </div>

      {/* Grid of Pockets */}
      <div className={`grid ${gridClass} w-full flex-1 items-center justify-center content-center`}>
        {page.slots.map((slot) => {
          const card = slot.cardId ? allCardsMap.get(slot.cardId) : undefined;
          return (
            <BinderPocketSlot
              key={slot.slotIndex}
              slot={slot}
              card={card}
              sleeveStyle={sleeveStyle}
              isInteractive={isInteractive}
              mode={mode}
              pageIndex={pageIndex ?? page.pageNumber - 1}
              onSlotClick={onSlotClick}
              onEmptySlotClick={onEmptySlotClick}
              onRemoveCard={onRemoveCard}
              onMoveCard={onMoveCard}
              movingSource={movingSource}
              onStartMove={onStartMove}
              onCancelMove={onCancelMove}
            />
          );
        })}
      </div>

      {/* Page Sheet Footer */}
      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-neutral-400 font-medium px-1">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
          {totalSlotsWithCards > 0 ? (
            <span>
              ครอบครอง {ownedSlotsCount}/{totalSlotsWithCards} ใบ
            </span>
          ) : (
            <span>หน้าว่าง</span>
          )}
        </span>

        <span className="font-mono text-neutral-300 font-semibold tracking-wider">
          หน้า {page.pageNumber}
        </span>
      </div>
    </div>
  );
});
