import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BinderPageSheet } from './BinderPageSheet';
import { getCoverThemeStyles, getPageSpreadIndices } from './binderUtils';
import { sounds } from '../../../engine/audio/WebAudioSounds';
import type { CustomBinder, BinderPage, BinderSlotItem } from '../../../types/binder';

export interface BinderBookSpreadProps {
  binder: CustomBinder;
  pages: BinderPage[];
  currentPageIndex: number;
  allCardsMap: Map<string, any>;
  onSlotClick?: (slot: BinderSlotItem, card?: any) => void;
  onEmptySlotClick?: (pageIndex: number, slotIndex: number) => void;
  onRemoveCard?: (pageIndex: number, slotIndex: number) => void;
  onMoveCard?: (
    source: { pageIndex: number; slotIndex: number },
    target: { pageIndex: number; slotIndex: number }
  ) => void;
  movingSource?: { pageIndex: number; slotIndex: number } | null;
  onStartMove?: (source: { pageIndex: number; slotIndex: number }) => void;
  onCancelMove?: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageSelect?: (pageIndex: number) => void;
}

interface FlipState {
  direction: 'next' | 'prev';
  isDesktop: boolean;
  fromLeftIdx: number;
  fromRightIdx: number | null;
  toLeftIdx: number;
  toRightIdx: number | null;
}

export function BinderBookSpread({
  binder,
  pages,
  currentPageIndex,
  allCardsMap,
  onSlotClick,
  onEmptySlotClick,
  onRemoveCard,
  onMoveCard,
  movingSource,
  onStartMove,
  onCancelMove,
  onPrevPage,
  onNextPage,
}: BinderBookSpreadProps) {
  const totalPages = Math.max(1, pages.length);
  const themeStyles = getCoverThemeStyles(binder.coverTheme);
  const isGoldRing = themeStyles.ringColor === 'gold';

  // 3D Flip Animation State
  const [flipState, setFlipState] = useState<FlipState | null>(null);
  const isFlipping = flipState !== null;

  // Touch swipe coordinates for mobile gesture
  const touchStartXRef = useRef<number | null>(null);

  // Compute 2-page desktop spread indices vs 1-page mobile
  const desktopSpread = getPageSpreadIndices(currentPageIndex, totalPages, true);
  const mobileSpread = getPageSpreadIndices(currentPageIndex, totalPages, false);

  const leftPage = pages[desktopSpread.leftIndex] || {
    pageNumber: desktopSpread.leftIndex + 1,
    slots: [],
  };
  const rightPage =
    desktopSpread.rightIndex !== null ? pages[desktopSpread.rightIndex] : null;

  const mobilePage = pages[mobileSpread.leftIndex] || {
    pageNumber: mobileSpread.leftIndex + 1,
    slots: [],
  };

  const canGoPrev = currentPageIndex > 0;
  const canGoNextDesktop =
    desktopSpread.rightIndex !== null && desktopSpread.rightIndex + 1 < totalPages;
  const canGoNextMobile = mobileSpread.leftIndex + 1 < totalPages;

  // Trigger 3D flip forward
  const triggerNext = useCallback(() => {
    if (isFlipping) return;

    // Detect if desktop spread is active (window width >= 768)
    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;

    if (isDesktop) {
      if (!canGoNextDesktop) return;
      const toLeft = desktopSpread.leftIndex + 2;
      const toRight = toLeft + 1 < totalPages ? toLeft + 1 : null;

      try {
        sounds.playCardDraw();
      } catch {}

      setFlipState({
        direction: 'next',
        isDesktop: true,
        fromLeftIdx: desktopSpread.leftIndex,
        fromRightIdx: desktopSpread.rightIndex,
        toLeftIdx: toLeft,
        toRightIdx: toRight,
      });
    } else {
      if (!canGoNextMobile) return;
      const toLeft = mobileSpread.leftIndex + 1;

      try {
        sounds.playCardDraw();
      } catch {}

      setFlipState({
        direction: 'next',
        isDesktop: false,
        fromLeftIdx: mobileSpread.leftIndex,
        fromRightIdx: null,
        toLeftIdx: toLeft,
        toRightIdx: null,
      });
    }
  }, [isFlipping, canGoNextDesktop, canGoNextMobile, desktopSpread, mobileSpread, totalPages]);

  // Trigger 3D flip backward
  const triggerPrev = useCallback(() => {
    if (isFlipping || !canGoPrev) return;

    const isDesktop = typeof window !== 'undefined' ? window.innerWidth >= 768 : true;

    if (isDesktop) {
      const toLeft = Math.max(0, desktopSpread.leftIndex - 2);
      const toRight = toLeft + 1 < totalPages ? toLeft + 1 : null;

      try {
        sounds.playCardDraw();
      } catch {}

      setFlipState({
        direction: 'prev',
        isDesktop: true,
        fromLeftIdx: desktopSpread.leftIndex,
        fromRightIdx: desktopSpread.rightIndex,
        toLeftIdx: toLeft,
        toRightIdx: toRight,
      });
    } else {
      const toLeft = Math.max(0, mobileSpread.leftIndex - 1);

      try {
        sounds.playCardDraw();
      } catch {}

      setFlipState({
        direction: 'prev',
        isDesktop: false,
        fromLeftIdx: mobileSpread.leftIndex,
        fromRightIdx: null,
        toLeftIdx: toLeft,
        toRightIdx: null,
      });
    }
  }, [isFlipping, canGoPrev, desktopSpread, mobileSpread, totalPages]);

  // Handle animation completion: synchronize store and unmount turning leaf
  const handleFlipComplete = useCallback(() => {
    if (!flipState) return;
    const { direction } = flipState;
    setFlipState(null);

    if (direction === 'next') {
      onNextPage();
    } else {
      onPrevPage();
    }
  }, [flipState, onNextPage, onPrevPage]);

  // Keyboard navigation (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        triggerPrev();
      } else if (e.key === 'ArrowRight') {
        triggerNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerPrev, triggerNext]);

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (deltaX < -50) {
      triggerNext();
    } else if (deltaX > 50) {
      triggerPrev();
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto flex flex-col items-center select-none py-2 sm:py-4 px-2 sm:px-4">
      {/* 3D Binder Book Outer Cover */}
      <div
        className={`relative w-full rounded-2xl p-2 sm:p-5 transition-colors duration-500 overflow-hidden ${themeStyles.coverClass}`}
        style={{
          perspective: 2600,
          transformStyle: 'preserve-3d',
          boxShadow:
            '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 2px 4px rgba(255, 255, 255, 0.1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Decorative Leather Stitching Line */}
        <div
          className={`pointer-events-none absolute inset-1.5 sm:inset-2.5 rounded-[14px] border border-dashed ${themeStyles.stitchingClass}`}
        />

        {/* ========================================================================= */}
        {/* DESKTOP 2-PAGE SPREAD (md and up) WITH 3D TURNING LEAF */}
        {/* ========================================================================= */}
        <div
          className="hidden md:flex relative w-full items-stretch justify-center min-h-[560px] lg:min-h-[640px]"
          style={{ perspective: 2600, transformStyle: 'preserve-3d' }}
        >
          {/* Left Page Stack Thickness / Depth Shadow */}
          <div className="absolute -left-1 inset-y-4 w-2 bg-neutral-950/80 rounded-l-md blur-[2px]" />

          {/* BASE LEFT PAGE CONTAINER */}
          <div className="flex-1 max-w-[50%] z-10 relative">
            <BinderPageSheet
              page={
                flipState?.direction === 'prev' && flipState.isDesktop
                  ? pages[flipState.toLeftIdx] || { pageNumber: flipState.toLeftIdx + 1, slots: [] }
                  : leftPage
              }
              pageIndex={
                flipState?.direction === 'prev' && flipState.isDesktop
                  ? flipState.toLeftIdx
                  : desktopSpread.leftIndex
              }
              pocketsPerPage={binder.pocketsPerPage}
              gridCols={binder.gridCols}
              gridRows={binder.gridRows}
              side="left"
              sleeveStyle={binder.sleeveStyle}
              mode={binder.mode}
              allCardsMap={allCardsMap}
              onSlotClick={onSlotClick}
              onEmptySlotClick={(slotIdx) =>
                onEmptySlotClick?.(desktopSpread.leftIndex, slotIdx)
              }
              onRemoveCard={(slotIdx) =>
                onRemoveCard?.(desktopSpread.leftIndex, slotIdx)
              }
              onMoveCard={onMoveCard}
              movingSource={movingSource}
              onStartMove={onStartMove}
              onCancelMove={onCancelMove}
            />
          </div>

          {/* CENTRAL 3D BINDER SPINE & METALLIC RINGS */}
          <div className="relative w-8 sm:w-12 flex flex-col items-center justify-around z-50 mx-[-2px] shadow-2xl pointer-events-none">
            {/* Spine Groove Shadow */}
            <div
              className={`absolute inset-0 w-full ${themeStyles.spineClass} shadow-[inset_0_0_12px_rgba(0,0,0,0.9)]`}
            />

            {/* 3 Heavy Metal Binder Rings Piercing Through Pages */}
            {[0, 1, 2].map((ringIdx) => (
              <div
                key={ringIdx}
                className="relative w-10 sm:w-14 h-4 my-8 z-50 flex items-center justify-center"
              >
                {/* Ring Outer Loop Arc */}
                <div
                  className="w-full h-3.5 rounded-full border-t border-b border-black/90 shadow-[0_6px_10px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
                  style={{
                    background: isGoldRing
                      ? 'linear-gradient(to right, #78350f 0%, #fef08a 35%, #d97706 70%, #451a03 100%)'
                      : 'linear-gradient(to right, #374151 0%, #f3f4f6 35%, #9ca3af 70%, #1f2937 100%)',
                  }}
                >
                  {/* Specular Metallic Highlight Streak */}
                  <div className="w-full h-[1px] bg-white/70 mx-auto mt-[1px]" />
                </div>
              </div>
            ))}
          </div>

          {/* BASE RIGHT PAGE CONTAINER */}
          <div className="flex-1 max-w-[50%] z-10 relative">
            {rightPage || (flipState?.direction === 'next' && flipState.isDesktop) ? (
              <BinderPageSheet
                page={
                  flipState?.direction === 'next' && flipState.isDesktop
                    ? (flipState.toRightIdx !== null ? pages[flipState.toRightIdx] : { pageNumber: 999, slots: [] }) || { pageNumber: 999, slots: [] }
                    : rightPage!
                }
                pageIndex={
                  flipState?.direction === 'next' && flipState.isDesktop
                    ? (flipState.toRightIdx ?? 0)
                    : (desktopSpread.rightIndex ?? 0)
                }
                pocketsPerPage={binder.pocketsPerPage}
                gridCols={binder.gridCols}
                gridRows={binder.gridRows}
                side="right"
                sleeveStyle={binder.sleeveStyle}
                mode={binder.mode}
                allCardsMap={allCardsMap}
                onSlotClick={onSlotClick}
                onEmptySlotClick={(slotIdx) =>
                  desktopSpread.rightIndex !== null &&
                  onEmptySlotClick?.(desktopSpread.rightIndex, slotIdx)
                }
                onRemoveCard={(slotIdx) =>
                  desktopSpread.rightIndex !== null &&
                  onRemoveCard?.(desktopSpread.rightIndex, slotIdx)
                }
                onMoveCard={onMoveCard}
                movingSource={movingSource}
                onStartMove={onStartMove}
                onCancelMove={onCancelMove}
              />
            ) : (
              /* Blank End Page Sheet */
              <div className="w-full h-full rounded-r-xl rounded-l-sm bg-[#121214]/60 border border-white/5 flex flex-col items-center justify-center p-8 text-neutral-600">
                <span className="text-sm font-medium">สิ้นสุดหน้าสมุดสะสม</span>
                <span className="text-xs text-neutral-700 mt-1">End of binder</span>
              </div>
            )}
          </div>

          {/* Right Page Stack Thickness */}
          <div className="absolute -right-1 inset-y-4 w-2 bg-neutral-950/80 rounded-r-md blur-[2px]" />

          {/* ========================================================================= */}
          {/* THE 3D TURNING LEAF (DESKTOP) */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {flipState && flipState.isDesktop && (
              <motion.div
                key={`flip-leaf-${flipState.direction}-${flipState.fromLeftIdx}`}
                className={`absolute inset-y-0 w-[calc(50%-4px)] z-40 ${
                  flipState.direction === 'next' ? 'right-0' : 'left-0'
                }`}
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: flipState.direction === 'next' ? 'left center' : 'right center',
                }}
                initial={{
                  rotateY: 0,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                }}
                animate={{
                  rotateY: flipState.direction === 'next' ? -180 : 180,
                  boxShadow: [
                    '0 10px 25px rgba(0,0,0,0.5)',
                    '0 30px 60px rgba(0,0,0,0.9)',
                    '0 10px 25px rgba(0,0,0,0.5)',
                  ],
                }}
                transition={{
                  duration: 0.52,
                  ease: [0.25, 1, 0.5, 1], // Natural page curl velocity curve
                }}
                onAnimationComplete={handleFlipComplete}
              >
                {/* FRONT FACE (Visible initially from 0deg to 90deg) */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <BinderPageSheet
                    page={
                      flipState.direction === 'next'
                        ? rightPage || { pageNumber: desktopSpread.leftIndex + 2, slots: [] }
                        : leftPage
                    }
                    pocketsPerPage={binder.pocketsPerPage}
                    gridCols={binder.gridCols}
                    gridRows={binder.gridRows}
                    side={flipState.direction === 'next' ? 'right' : 'left'}
                    sleeveStyle={binder.sleeveStyle}
                    mode={binder.mode}
                    allCardsMap={allCardsMap}
                    isInteractive={false}
                  />

                  {/* Dynamic Page Curvature & Shading Gradient Overlay */}
                  <motion.div
                    className="pointer-events-none absolute inset-0 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.75, 0.95] }}
                    transition={{ duration: 0.52, ease: 'easeInOut' }}
                    style={{
                      background:
                        flipState.direction === 'next'
                          ? 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 30%, transparent 70%)'
                          : 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 30%, transparent 70%)',
                    }}
                  />
                </div>

                {/* BACK FACE (Visible as it flips from 90deg to 180deg) */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <BinderPageSheet
                    page={
                      flipState.direction === 'next'
                        ? pages[flipState.toLeftIdx] || { pageNumber: flipState.toLeftIdx + 1, slots: [] }
                        : (flipState.toRightIdx !== null ? pages[flipState.toRightIdx] : { pageNumber: 999, slots: [] }) || { pageNumber: 999, slots: [] }
                    }
                    pocketsPerPage={binder.pocketsPerPage}
                    gridCols={binder.gridCols}
                    gridRows={binder.gridRows}
                    side={flipState.direction === 'next' ? 'left' : 'right'}
                    sleeveStyle={binder.sleeveStyle}
                    mode={binder.mode}
                    allCardsMap={allCardsMap}
                    isInteractive={false}
                  />

                  {/* Landing Shading Gradient Overlay (Fades out as page lands) */}
                  <motion.div
                    className="pointer-events-none absolute inset-0 rounded-xl"
                    initial={{ opacity: 0.95 }}
                    animate={{ opacity: [0.95, 0.4, 0] }}
                    transition={{ duration: 0.52, ease: 'easeInOut' }}
                    style={{
                      background:
                        flipState.direction === 'next'
                          ? 'linear-gradient(to left, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 30%, transparent 70%)'
                          : 'linear-gradient(to right, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 30%, transparent 70%)',
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ========================================================================= */}
        {/* MOBILE 1-PAGE FLIP SPREAD (< md) WITH 3D LEAF */}
        {/* ========================================================================= */}
        <div
          className="block md:hidden relative w-full min-h-[500px]"
          style={{ perspective: 2000, transformStyle: 'preserve-3d' }}
        >
          {/* BASE UNDERLYING PAGE */}
          <div className="w-full h-full">
            <BinderPageSheet
              page={
                flipState && !flipState.isDesktop
                  ? pages[flipState.toLeftIdx] || { pageNumber: flipState.toLeftIdx + 1, slots: [] }
                  : mobilePage
              }
              pageIndex={
                flipState && !flipState.isDesktop
                  ? flipState.toLeftIdx
                  : mobileSpread.leftIndex
              }
              pocketsPerPage={binder.pocketsPerPage}
              gridCols={binder.gridCols}
              gridRows={binder.gridRows}
              side="single"
              sleeveStyle={binder.sleeveStyle}
              mode={binder.mode}
              allCardsMap={allCardsMap}
              onSlotClick={onSlotClick}
              onEmptySlotClick={(slotIdx) =>
                onEmptySlotClick?.(mobileSpread.leftIndex, slotIdx)
              }
              onRemoveCard={(slotIdx) =>
                onRemoveCard?.(mobileSpread.leftIndex, slotIdx)
              }
              onMoveCard={onMoveCard}
              movingSource={movingSource}
              onStartMove={onStartMove}
              onCancelMove={onCancelMove}
            />
          </div>

          {/* 3D TURNING PAGE OVERLAY FOR MOBILE */}
          <AnimatePresence>
            {flipState && !flipState.isDesktop && (
              <motion.div
                key={`mobile-flip-${flipState.direction}-${flipState.fromLeftIdx}`}
                className="absolute inset-0 w-full h-full z-30"
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'left center',
                }}
                initial={{
                  rotateY: flipState.direction === 'next' ? 0 : -180,
                  boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
                }}
                animate={{
                  rotateY: flipState.direction === 'next' ? -180 : 0,
                }}
                transition={{
                  duration: 0.48,
                  ease: [0.25, 1, 0.5, 1],
                }}
                onAnimationComplete={handleFlipComplete}
              >
                {/* Front Face */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <BinderPageSheet
                    page={
                      flipState.direction === 'next'
                        ? mobilePage
                        : pages[flipState.toLeftIdx] || { pageNumber: flipState.toLeftIdx + 1, slots: [] }
                    }
                    pocketsPerPage={binder.pocketsPerPage}
                    gridCols={binder.gridCols}
                    gridRows={binder.gridRows}
                    side="single"
                    sleeveStyle={binder.sleeveStyle}
                    mode={binder.mode}
                    allCardsMap={allCardsMap}
                    isInteractive={false}
                  />

                  {/* Dynamic Curvature Lighting */}
                  <motion.div
                    className="pointer-events-none absolute inset-0 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0.7, 0.9] }}
                    transition={{ duration: 0.48 }}
                    style={{
                      background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, transparent 60%)',
                    }}
                  />
                </div>

                {/* Back Face */}
                <div
                  className="absolute inset-0 w-full h-full"
                  style={{
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                >
                  <BinderPageSheet
                    page={
                      flipState.direction === 'next'
                        ? pages[flipState.toLeftIdx] || { pageNumber: flipState.toLeftIdx + 1, slots: [] }
                        : mobilePage
                    }
                    pocketsPerPage={binder.pocketsPerPage}
                    gridCols={binder.gridCols}
                    gridRows={binder.gridRows}
                    side="single"
                    sleeveStyle={binder.sleeveStyle}
                    mode={binder.mode}
                    allCardsMap={allCardsMap}
                    isInteractive={false}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Quick Prev/Next Edge Buttons (Desktop & Tablet) */}
        {canGoPrev && (
          <button
            type="button"
            title="เปิดหน้าก่อนหน้า (Arrow Left)"
            disabled={isFlipping}
            onClick={triggerPrev}
            className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-neutral-900/95 hover:bg-neutral-800 text-white border border-white/20 shadow-2xl flex items-center justify-center text-xl font-bold transition-transform active:scale-95 disabled:opacity-40"
            data-testid="btn-binder-prev"
          >
            ‹
          </button>
        )}

        {(canGoNextDesktop || canGoNextMobile) && (
          <button
            type="button"
            title="เปิดหน้าถัดไป (Arrow Right)"
            disabled={isFlipping}
            onClick={triggerNext}
            className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-full bg-neutral-900/95 hover:bg-neutral-800 text-white border border-white/20 shadow-2xl flex items-center justify-center text-xl font-bold transition-transform active:scale-95 disabled:opacity-40"
            data-testid="btn-binder-next"
          >
            ›
          </button>
        )}
      </div>

      {/* Book Spread Bottom Navigation Bar */}
      <div className="mt-3 w-full flex items-center justify-between px-3 text-xs text-neutral-400">
        <button
          type="button"
          disabled={!canGoPrev || isFlipping}
          onClick={triggerPrev}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white font-medium flex items-center gap-1 transition-colors"
        >
          <span>‹</span> หน้าก่อนหน้า
        </button>

        <div className="flex items-center gap-2 font-mono text-neutral-300">
          <span className="font-semibold text-white">
            {desktopSpread.rightIndex !== null
              ? `${desktopSpread.leftIndex + 1}-${desktopSpread.rightIndex + 1}`
              : `${mobileSpread.leftIndex + 1}`}
          </span>
          <span className="text-neutral-500">/</span>
          <span>{totalPages} หน้า</span>
        </div>

        <button
          type="button"
          disabled={(!canGoNextDesktop && !canGoNextMobile) || isFlipping}
          onClick={triggerNext}
          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-white font-medium flex items-center gap-1 transition-colors"
        >
          หน้าถัดไป <span>›</span>
        </button>
      </div>
    </div>
  );
}
