import React from 'react';
import type { TabletopWinnerState } from '../types';
import { Sound } from '../../../engine/pixi/SoundEffects';

interface TabletopVictoryModalProps {
  winner: TabletopWinnerState;
  myRole: 'player1' | 'player2' | 'both' | 'spectator';
  isOnline: boolean;
  onRematch: () => void;
  onClose: () => void;
}

export const TabletopVictoryModal: React.FC<TabletopVictoryModalProps> = ({
  winner,
  myRole,
  isOnline,
  onRematch,
  onClose,
}) => {
  const isYouWinner =
    myRole === 'spectator'
      ? false
      : !isOnline || myRole === 'both'
      ? winner.side === 'player1'
      : winner.side === myRole;

  React.useEffect(() => {
    if (isYouWinner) {
      Sound.playGameVictory();
    } else {
      Sound.playTurnChange();
    }
  }, [isYouWinner]);

  return (
    <div
      id="tabletop-victory-modal"
      data-testid="tabletop-victory-modal"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95 fade-in duration-300 select-none"
    >
      <div
        className={`relative w-full max-w-md rounded-3xl border-2 p-6 sm:p-8 text-white flex flex-col items-center gap-5 text-center shadow-2xl overflow-hidden ${
          isYouWinner
            ? 'bg-gradient-to-b from-amber-950/95 via-slate-900/95 to-slate-950/98 border-amber-400/80 shadow-[0_0_80px_rgba(245,158,11,0.4)]'
            : 'bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-black/98 border-slate-700 shadow-[0_0_60px_rgba(30,41,59,0.5)]'
        }`}
      >
        {/* Glow ambient background element */}
        <div
          className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
            isYouWinner ? 'bg-amber-400/25' : 'bg-indigo-600/15'
          }`}
        />

        {/* Big Icon / Trophy */}
        <div
          className={`w-24 h-24 rounded-3xl border-2 flex items-center justify-center text-5xl shadow-2xl transform transition-transform duration-500 animate-bounce ${
            isYouWinner
              ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 border-yellow-200 shadow-amber-500/50 ring-8 ring-amber-400/20'
              : 'bg-gradient-to-tr from-slate-700 via-slate-800 to-slate-900 border-slate-600 shadow-black/60 ring-8 ring-slate-800/40'
          }`}
        >
          {isYouWinner ? '🏆' : '💀'}
        </div>

        {/* Main Title & Perspective */}
        <div className="flex flex-col gap-1.5 relative z-10">
          <span
            className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mx-auto border ${
              isYouWinner
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isYouWinner ? 'VICTORY' : 'MATCH COMPLETED'}
          </span>
          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md ${
              isYouWinner ? 'text-amber-200' : 'text-slate-300'
            }`}
          >
            {isYouWinner
              ? 'คุณชนะการแข่งขัน!'
              : isOnline
              ? `ฝ่ายตรงข้าม (${winner.name}) ชนะ`
              : `${winner.name} ชนะการแข่งขัน!`}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xs mx-auto">
            {winner.reason === 'PRIZES_CLAIMED'
              ? '✨ ดึงการ์ดรางวัล (Prize Cards) ครบ 6 ใบสำเร็จ!'
              : 'สิ้นสุดการแข่งขัน'}
          </p>
        </div>

        {/* Winner details card */}
        <div className="w-full p-4 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-between shadow-inner relative z-10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎖️</span>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">ผู้ชนะการประลอง</div>
              <div className="text-sm font-black text-white flex items-center gap-1.5">
                <span>{winner.side === 'player1' ? '🔵' : '🔴'}</span>
                <span>{winner.name}</span>
                {isYouWinner && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-bold">
                    YOU
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/30">
            6/6 Prizes
          </span>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2.5 pt-2 relative z-10">
          <button
            id="btn-victory-rematch"
            type="button"
            onClick={onRematch}
            className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 ${
              isYouWinner
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-950/60'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-950/60'
            }`}
          >
            <span>🔄</span>
            <span>เริ่มเล่นใหม่ / ขอ Rematch</span>
          </button>

          <button
            id="btn-victory-close"
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-950/90 hover:bg-slate-800 text-slate-400 hover:text-white font-bold text-xs border border-white/10 transition cursor-pointer"
          >
            ดูสภาพสนามต่อ (Review Board)
          </button>
        </div>
      </div>
    </div>
  );
};
