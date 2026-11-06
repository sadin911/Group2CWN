import React from 'react';

export interface MetallicCoinProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'PRE_GAME' | 'STANDARD';
  side?: 'YOU' | 'OPP' | 'HEADS' | 'TAILS' | 'IDLE';
  isFlipping?: boolean;
  onClick?: () => void;
  className?: string;
}

export const MetallicCoin: React.FC<MetallicCoinProps> = ({
  size = 'lg',
  variant = 'PRE_GAME',
  side = 'IDLE',
  isFlipping = false,
  onClick,
  className = '',
}) => {
  // Size dimensions
  const sizeClasses = {
    sm: 'w-16 h-16 text-xs',
    md: 'w-24 h-24 text-sm',
    lg: 'w-32 h-32 text-base',
    xl: 'w-40 h-40 text-lg',
  }[size];

  // Theme palettes based on side
  const isYou = side === 'YOU';
  const isOpp = side === 'OPP';
  const isHeads = side === 'HEADS';
  const isTails = side === 'TAILS';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none cursor-pointer group transition-transform active:scale-95 ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Ambient Outer Drop Shadow & Glow */}
      <div
        className={`absolute inset-0 rounded-full blur-xl transition-opacity duration-500 pointer-events-none ${
          isFlipping
            ? 'bg-amber-400/60 opacity-80 animate-pulse'
            : isYou
            ? 'bg-emerald-400/50 opacity-90'
            : isOpp
            ? 'bg-indigo-400/50 opacity-90'
            : isHeads
            ? 'bg-amber-400/50 opacity-90'
            : isTails
            ? 'bg-slate-400/40 opacity-75'
            : 'bg-amber-500/30 opacity-70 group-hover:opacity-100'
        }`}
      />

      {/* 3D Coin Body */}
      <div
        id="metallic-coin-body"
        className={`relative ${sizeClasses} rounded-full flex flex-col items-center justify-center overflow-hidden transition-all duration-300 shadow-2xl border-4 ${
          isFlipping
            ? 'animate-[spin_0.35s_linear_infinite] border-amber-200'
            : isYou
            ? 'border-emerald-300 ring-4 ring-emerald-500/30'
            : isOpp
            ? 'border-indigo-300 ring-4 ring-indigo-500/30'
            : isHeads
            ? 'border-amber-200 ring-4 ring-amber-400/30'
            : isTails
            ? 'border-slate-300 ring-4 ring-slate-400/30'
            : 'border-amber-300/80 ring-4 ring-amber-400/20 group-hover:ring-amber-300/40'
        }`}
        style={{
          boxShadow:
            '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.5), inset 0 2px 4px 0 rgba(255, 255, 255, 0.8), inset 0 -3px 6px 0 rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Background Metal Finishes */}
        {isFlipping ? (
          <div className="absolute inset-0 bg-[conic-gradient(at_center,#f59e0b,#fef08a,#d97706,#fef08a,#f59e0b)]" />
        ) : isYou ? (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900" />
        ) : isOpp ? (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-purple-800 to-slate-950" />
        ) : isHeads ? (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-700" />
        ) : isTails ? (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800" />
        ) : (
          /* IDLE Pre-Game Pokéball Metal Style */
          <div className="absolute inset-0 flex flex-col">
            {/* Top Half: Brushed Crimson/Gold Metal */}
            <div className="flex-1 bg-gradient-to-b from-amber-400 via-yellow-500 to-amber-600 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-200/50 via-transparent to-transparent" />
            </div>
            {/* Dividing Groove */}
            <div className="h-1.5 sm:h-2 bg-slate-950 border-y border-white/20 relative z-10" />
            {/* Bottom Half: Brushed Silver/Platinum Metal */}
            <div className="flex-1 bg-gradient-to-t from-slate-200 via-slate-300 to-slate-100 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-white/60 via-transparent to-transparent" />
            </div>
          </div>
        )}

        {/* Center Pokéball Metallic Button (Concentric Rings) */}
        {!isFlipping && (side === 'IDLE' || variant === 'PRE_GAME') && (
          <div className="absolute z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900 border-2 border-white/90 shadow-lg flex items-center justify-center">
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border border-white/60 shadow-inner flex items-center justify-center ${
                isYou
                  ? 'bg-emerald-400 text-slate-950'
                  : isOpp
                  ? 'bg-indigo-400 text-white'
                  : 'bg-gradient-to-tr from-amber-300 to-yellow-100 text-slate-900'
              }`}
            >
              <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        )}

        {/* Milled Outer Rim Texture (Simulated via overlay conic border) */}
        <div className="absolute inset-1 rounded-full border border-white/30 pointer-events-none" />
        <div className="absolute inset-2 rounded-full border border-black/20 pointer-events-none" />

        {/* Specular Diagonal Light Sheen */}
        <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/20 to-transparent transform -rotate-45 pointer-events-none" />

        {/* Foreground Content */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center p-2">
          {isFlipping ? (
            <span className="text-3xl sm:text-4xl filter drop-shadow-md">🪙</span>
          ) : isYou ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
              <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                YOU
              </span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-200 drop-shadow">
                👑 คุณชนะ
              </span>
            </div>
          ) : isOpp ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
              <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                OPP
              </span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-200 drop-shadow">
                🛡️ ฝ่ายตรงข้าม
              </span>
            </div>
          ) : isHeads ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
              <span className="text-2xl sm:text-3xl font-black tracking-tighter text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
                HEADS
              </span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-950 drop-shadow">
                👑 ออกหัว
              </span>
            </div>
          ) : isTails ? (
            <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
              <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                TAILS
              </span>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-300 drop-shadow">
                ⭐ ออกก้อย
              </span>
            </div>
          ) : (
            /* IDLE Pre-Game Display */
            <div className="flex flex-col items-center justify-between h-full py-1">
              <span className="text-xs sm:text-sm font-black tracking-wider text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded-full border border-amber-300 shadow-sm mt-0.5">
                YOU
              </span>
              <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-slate-800 bg-white/80 px-2 py-0.5 rounded-full border border-slate-300 shadow-sm mb-0.5">
                OPP
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
