import React, { useEffect } from 'react';
import type { TabletopActiveCoinFlip } from '../types';
import { MetallicCoin } from './MetallicCoin';
import { Sound } from '../../../engine/pixi/SoundEffects';

interface TabletopCoinFlipOverlayProps {
  coinFlip: TabletopActiveCoinFlip;
  myRole: 'player1' | 'player2' | 'both' | 'spectator';
  onClose: () => void;
}

export const TabletopCoinFlipOverlay: React.FC<TabletopCoinFlipOverlayProps> = ({
  coinFlip,
  myRole,
  onClose,
}) => {
  const isInitiator = myRole === 'both' || coinFlip.initiatorSide === myRole;
  const isFlipping = coinFlip.isFlipping;
  const result = coinFlip.result;

  // Sound effect on result
  useEffect(() => {
    if (result && !isFlipping) {
      Sound.playCardPlacement();
    }
  }, [result, isFlipping]);

  // Auto-close 2.5s after result is shown
  useEffect(() => {
    if (!isFlipping && result) {
      const timer = setTimeout(() => {
        onClose();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isFlipping, result, onClose]);

  return (
    <div
      id="tabletop-coin-flip-overlay"
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 select-none"
    >
      <div
        className="relative w-full max-w-sm bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl p-6 text-white flex flex-col items-center gap-4 text-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Status Header */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-white/10 text-xs font-bold text-slate-300">
            <span>🪙</span>
            <span>
              {isInitiator ? 'คุณกำลังทอยเหรียญ' : `${coinFlip.initiatorName} กำลังทอยเหรียญ`}
            </span>
          </div>
        </div>

        {/* 3D Metallic Coin Display */}
        <div id="in-game-coin-visual" className="my-2">
          <MetallicCoin
            size="xl"
            variant="STANDARD"
            side={result || 'HEADS'}
            isFlipping={isFlipping}
          />
        </div>

        {/* Result Announcement */}
        <div id="in-game-coin-result" className="flex flex-col items-center gap-1">
          {isFlipping ? (
            <span className="text-sm font-black text-amber-300 animate-pulse">
              กำลังหมุนเหรียญ...
            </span>
          ) : result ? (
            <div className="flex flex-col items-center gap-1 animate-in zoom-in-95 duration-200">
              <span className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                {result === 'HEADS' ? (
                  <span className="text-amber-300 flex items-center gap-1.5">
                    <span>👑</span>
                    <span>ออกหน้า: หัว (HEADS)!</span>
                  </span>
                ) : (
                  <span className="text-slate-200 flex items-center gap-1.5">
                    <span>⭐</span>
                    <span>ออกหน้า: ก้อย (TAILS)!</span>
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {isInitiator ? 'ผลการทอยของคุณ' : `ผลการทอยของ ${coinFlip.initiatorName}`}
              </span>
            </div>
          ) : null}
        </div>

        {/* Dismiss Button */}
        {!isFlipping && (
          <button
            id="btn-close-coin-overlay"
            type="button"
            onClick={onClose}
            className="mt-1 px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-bold text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            ✕ ปิดหน้าต่าง (Close)
          </button>
        )}
      </div>
    </div>
  );
};
