import React, { useState, useEffect } from 'react';
import { Sound } from '../../engine/pixi/SoundEffects';
import { useGameStore } from '../../store/gameStore';

interface TabletopV3DockProps {
  deckCount: number;
  discardCount: number;
  lostZoneCount: number;
  prizeCount: number;
  canUndo: boolean;
  canRedo: boolean;
  onDrawCard: (count: number) => void;
  onShuffleDeck?: () => void;
  onOpenDeckSearch: () => void;
  onOpenTopCards: () => void;
  onOpenPrizes: () => void;
  onOpenDiscardAndLostZone: () => void;
  onOpenRandomizer: () => void;
  onPassTurn: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetTable: () => void;
  isMyTurn?: boolean;
  turnCount?: number;
  className?: string;
}

export const TabletopV3Dock: React.FC<TabletopV3DockProps> = ({
  deckCount,
  discardCount,
  lostZoneCount,
  prizeCount,
  canUndo,
  canRedo,
  onDrawCard,
  onShuffleDeck,
  onOpenDeckSearch,
  onOpenTopCards,
  onOpenPrizes,
  onOpenDiscardAndLostZone,
  onOpenRandomizer,
  onPassTurn,
  onUndo,
  onRedo,
  onResetTable,
  isMyTurn,
  turnCount,
  className,
}) => {
  const [isMuted, setIsMuted] = useState(Sound.getMuted());

  const toggleSound = () => {
    const muted = Sound.toggleMute();
    setIsMuted(muted);
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) onUndo();
        return;
      }

      // Redo: Ctrl+Y or Cmd+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (canRedo) onRedo();
        return;
      }

      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onDrawCard(1);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        onOpenDeckSearch();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        onOpenPrizes();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isMyTurn !== false) {
          onPassTurn();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo, onDrawCard, onOpenDeckSearch, onOpenPrizes, onPassTurn, onUndo, onRedo]);

  return (
    <div
      id="tabletop-v3-dock"
      className={className ?? "relative z-30 max-w-[96vw] select-none pointer-events-none"}
    >
      <div className="pointer-events-auto flex items-center gap-0.5 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-full backdrop-blur-2xl bg-slate-950/90 border border-white/15 shadow-2xl shadow-black/80 ring-1 ring-white/10 text-white text-xs max-w-full overflow-x-auto scrollbar-none whitespace-nowrap">
        {/* Turn Indicator Badge in Dock */}
        {isMyTurn !== undefined && (
          <div
            id="dock-turn-indicator"
            data-my-turn={isMyTurn}
            className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-black border transition-all ${
              isMyTurn
                ? 'bg-emerald-950/90 border-emerald-400/80 text-emerald-300 shadow-md shadow-emerald-950/50 animate-pulse'
                : 'bg-slate-900/90 border-white/10 text-slate-400'
            }`}
          >
            <span
              className={`w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full ${
                isMyTurn ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
              }`}
            />
            <span>{isMyTurn ? 'เทิร์นของคุณ' : 'เทิร์นคู่แข่ง'}</span>
            {turnCount !== undefined && (
              <span className="text-[8px] sm:text-[9px] px-1 rounded bg-black/40 text-slate-300 font-mono">
                T{turnCount}
              </span>
            )}
          </div>
        )}



        {/* 1. Draw Card Button (Balatro Mobile Chunky Button) */}
        <button
          id="btn-dock-draw"
          title="จั่วการ์ด 1 ใบ (D)"
          onClick={() => {
            Sound.playCardFlip();
            onDrawCard(1);
          }}
          disabled={deckCount === 0}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-2 border-cyan-300 sm:border-white/20 text-white font-black text-xs shadow-lg shadow-cyan-950/60 disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">🃏</span>
          <span>จั่ว</span>
          <span className="text-[9px] sm:text-[10px] bg-black/40 px-1.5 py-0.2 rounded-full font-mono text-cyan-200 border border-cyan-400/30">
            {deckCount}
          </span>
        </button>

        {/* 2. Search Deck Button (Balatro Arcade Gold) */}
        <button
          id="btn-dock-search"
          title="ค้นหาเด็ค (S)"
          onClick={() => {
            Sound.playCardPlacement();
            onOpenDeckSearch();
          }}
          disabled={deckCount === 0}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-gradient-to-r from-amber-600 via-orange-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 border-2 border-yellow-300 sm:border-white/20 text-white font-black text-xs shadow-lg shadow-amber-950/60 disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">🔍</span>
          <span>ค้นหา</span>
          <span className="hidden sm:inline-block text-[10px] bg-slate-800/80 px-1.5 py-0.2 rounded-full font-mono text-slate-300">
            S
          </span>
        </button>

        {/* 3. Prizes Button (Balatro Arcade Emerald) */}
        <button
          id="btn-dock-prizes"
          title="ดู / หยิบไพรซ์ (P)"
          onClick={() => {
            Sound.playCardPlacement();
            onOpenPrizes();
          }}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 border-2 border-emerald-300 sm:border-white/20 text-white font-black text-xs shadow-lg shadow-emerald-950/60 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">🏆</span>
          <span>ไพรซ์</span>
          <span className="text-[9px] sm:text-[10px] bg-black/40 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-bold">
            {prizeCount}
          </span>
        </button>

        {/* 4. Pass Turn (Balatro Arcade Crimson / Neon) */}
        <button
          id="btn-dock-pass-turn"
          disabled={isMyTurn === false}
          title={isMyTurn === false ? 'ยังไม่ถึงเทิร์นของคุณ (รอฝ่ายตรงข้ามเล่น)' : 'จบเทิร์น (Space)'}
          onClick={() => {
            if (isMyTurn === false) return;
            Sound.playTurnChange();
            onPassTurn();
          }}
          className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-2xl sm:rounded-full font-black text-xs shadow-lg transition-all ${
            isMyTurn === false
              ? 'opacity-35 bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none'
              : 'bg-gradient-to-r from-rose-600 via-red-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white border-2 border-rose-300 sm:border-white/20 shadow-rose-950/60 active:scale-95 cursor-pointer'
          }`}
        >
          <span className="text-xs sm:text-sm">⏭️</span>
          <span>จบเทิร์น</span>
        </button>

        <div className="h-4 w-[1px] bg-white/20 mx-0.5" />

        {/* Shuffle Deck Button */}
        {onShuffleDeck && (
          <button
            id="btn-dock-shuffle"
            title="สับเด็คการ์ด"
            onClick={() => {
              Sound.playShuffle();
              onShuffleDeck();
            }}
            disabled={deckCount === 0}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-white/25 disabled:opacity-40 font-semibold transition-all active:scale-95 cursor-pointer"
          >
            <span className="text-xs sm:text-sm">🔀</span>
            <span className="hidden sm:inline">สับการ์ด</span>
          </button>
        )}

        {/* View Top Cards */}
        <button
          id="btn-dock-top-cards"
          title="ดูการ์ดใบบนสุดของเด็ค"
          onClick={() => {
            Sound.playCardFlip();
            onOpenTopCards();
          }}
          disabled={deckCount === 0}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-white/25 disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">👁️</span>
          <span className="hidden md:inline">ใบบนสุด</span>
        </button>

        {/* Discard & Lost Zone */}
        <button
          id="btn-dock-discard-zone"
          title="ดูการ์ดในสุสานและ Lost Zone"
          onClick={() => {
            Sound.playCardPlacement();
            onOpenDiscardAndLostZone();
          }}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-white/25 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">🗑️</span>
          <span className="hidden md:inline">สุสาน</span>
          <span className="text-[9px] sm:text-[10px] bg-slate-800 px-1 rounded text-slate-300 font-mono">
            {discardCount}/{lostZoneCount}
          </span>
        </button>

        {/* Dice & Coin Randomizer */}
        <button
          id="btn-dock-randomizer"
          title="ทอยเต๋า / โยนเหรียญ"
          onClick={() => {
            Sound.playCardPlacement();
            onOpenRandomizer();
          }}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-white/25 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">🎲</span>
          <span className="hidden md:inline">สุ่มเต๋า</span>
        </button>

        <div className="hidden sm:block h-4 w-[1px] bg-white/15 mx-0.5" />

        {/* Undo Button */}
        <button
          id="btn-dock-undo"
          title="ย้อนกลับ (Ctrl+Z)"
          onClick={() => {
            Sound.playCardFlip();
            onUndo();
          }}
          disabled={!canUndo}
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-slate-900/90 hover:bg-amber-950/60 border border-white/10 hover:border-amber-500/40 disabled:opacity-30 disabled:cursor-not-allowed text-amber-200 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">↩️</span>
          <span className="hidden lg:inline text-[11px] font-bold">ย้อนกลับ</span>
        </button>

        {/* Redo Button */}
        <button
          id="btn-dock-redo"
          title="ทำซ้ำ (Ctrl+Y)"
          onClick={() => {
            Sound.playCardFlip();
            onRedo();
          }}
          disabled={!canRedo}
          className="flex items-center gap-1 px-1 sm:px-2 py-1 sm:py-1.5 rounded-2xl sm:rounded-full bg-slate-900/90 hover:bg-slate-800 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 transition-all active:scale-95 cursor-pointer"
        >
          <span className="text-xs sm:text-sm">↪️</span>
        </button>

        {/* Reset Table */}
        <button
          id="btn-dock-reset"
          title="เริ่มเกมใหม่ (เลือกเด็คใหม่และจัดโต๊ะ)"
          onClick={() => {
            Sound.playShuffle();
            onResetTable();
          }}
          className="flex items-center gap-1 px-2 py-1.5 rounded-full bg-slate-900 hover:bg-red-950/60 border border-white/10 hover:border-red-500/40 text-slate-400 hover:text-red-300 transition-all"
        >
          <span>🔄</span>
        </button>

        {/* Sound Toggle */}
        <button
          id="btn-dock-sound"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          onClick={toggleSound}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/10 transition-colors"
        >
          <span className="text-xs">{isMuted ? '🔇' : '🔊'}</span>
        </button>

        {/* Switch to PixiJS Engine */}
        <button
          id="btn-dock-switch-pixi"
          title="ทดลองใช้ PixiJS v8 Engine (2D WebGL)"
          onClick={() => {
            useGameStore.getState().setGameMode('playmat-pixi');
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border border-indigo-400/40 text-white font-bold text-[10px] sm:text-xs shadow-md shadow-indigo-950/50 transition-all active:scale-95 cursor-pointer"
        >
          <span>⚡</span>
          <span>PixiJS Engine</span>
        </button>
      </div>
    </div>
  );
};
