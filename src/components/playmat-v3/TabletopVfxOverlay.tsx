import React, { useEffect, useState } from 'react';
import type { TabletopVfxEvent } from './types';
import { Sound } from '../../engine/pixi/SoundEffects';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';

interface TabletopVfxOverlayProps {
  vfxEvent: TabletopVfxEvent | null | undefined;
  onDismiss: () => void;
}

export const TabletopVfxOverlay: React.FC<TabletopVfxOverlayProps> = ({
  vfxEvent,
  onDismiss,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [vfxEvent?.id]);

  useEffect(() => {
    if (!vfxEvent) return;

    // Play sound on appearance
    if (vfxEvent.type === 'ABILITY') {
      Sound.playAttack();
    } else if (vfxEvent.type === 'EVOLUTION') {
      Sound.playCardPlacement();
    }

    const duration = vfxEvent.type === 'ABILITY' ? 1400 : 1600;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [vfxEvent, onDismiss]);

  if (!vfxEvent) return null;

  const isAbility = vfxEvent.type === 'ABILITY';
  const isP1 = vfxEvent.playerSide === 'player1';
  const cardImg = vfxEvent.cardImageUrl ? resolveCardImageUrl(vfxEvent.cardImageUrl, true) : undefined;

  return (
    <div
      id="tabletop-vfx-overlay"
      data-vfx-type={vfxEvent.type}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none select-none"
    >
      {/* Background Energy Burst Flares */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-40 mix-blend-screen animate-pulse ${
          isAbility
            ? 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500 via-sky-600/30 to-transparent'
            : 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 via-yellow-600/30 to-transparent'
        }`}
      />

      {/* Main VFX Card / Banner Box */}
      <div
        className={`relative pointer-events-auto max-w-sm sm:max-w-md w-full rounded-3xl p-6 sm:p-7 flex flex-col items-center text-center gap-3.5 shadow-2xl border transition-all duration-300 transform scale-100 ${
          isAbility
            ? 'bg-gradient-to-b from-slate-950 via-cyan-950/90 to-slate-950 border-cyan-400/80 shadow-cyan-500/30 ring-2 ring-cyan-400/40'
            : 'bg-gradient-to-b from-slate-950 via-amber-950/90 to-slate-950 border-amber-400/80 shadow-amber-500/40 ring-2 ring-amber-400/50'
        }`}
        onClick={onDismiss}
      >
        {/* Type Badge Header */}
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-black tracking-widest px-3 py-1 rounded-full uppercase border shadow-md flex items-center gap-1.5 ${
              isAbility
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-cyan-950'
                : 'bg-amber-500/20 text-amber-300 border-amber-400/60 shadow-amber-950'
            }`}
          >
            <span>{isAbility ? '⚡' : '✨'}</span>
            <span>{isAbility ? 'ABILITY ACTIVATION' : 'POKÉMON EVOLUTION'}</span>
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
              isP1
                ? 'bg-blue-600/30 text-blue-300 border-blue-400/40'
                : 'bg-rose-600/30 text-rose-300 border-rose-400/40'
            }`}
          >
            {isP1 ? 'Player 1' : 'Player 2'}
          </span>
        </div>

        {/* Floating Card Artwork with Radiant Halo */}
        <div className="relative group my-1">
          <div
            className={`absolute -inset-2 rounded-2xl blur-md opacity-75 animate-pulse ${
              isAbility ? 'bg-cyan-400' : 'bg-amber-400'
            }`}
          />
          <div className="relative w-32 sm:w-36 aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/80 bg-slate-950 flex items-center justify-center">
            {!imgError && cardImg ? (
              <img
                src={cardImg}
                alt={vfxEvent.cardName}
                onError={(e) => {
                  handleCardImageError(e, vfxEvent.cardImageUrl);
                  setTimeout(() => {
                    const img = e.target as HTMLImageElement;
                    if (!img || img.naturalWidth === 0) {
                      setImgError(true);
                    }
                  }, 400);
                }}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white text-center">
                <span className="text-3xl mb-1.5">{isAbility ? '⚡' : '✨'}</span>
                <span className="text-xs font-black tracking-tight line-clamp-2 px-1 text-slate-100">
                  {vfxEvent.cardName}
                </span>
                <span className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400 border border-white/10 px-2 py-0.5 rounded-full bg-slate-800/80">
                  {isAbility ? 'Ability' : 'Evolution'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Title & Subtitle Typography */}
        <div className="flex flex-col items-center gap-1">
          {isAbility ? (
            <>
              <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-200 to-cyan-400 tracking-tight drop-shadow">
                {vfxEvent.abilityName || 'Ability'}
              </h3>
              <p className="text-xs sm:text-sm font-bold text-cyan-200/90">
                {vfxEvent.cardName}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 tracking-tight drop-shadow">
                {vfxEvent.cardName}
              </h3>
              {vfxEvent.subtitle && (
                <p className="text-xs sm:text-sm font-bold text-amber-200/90 flex items-center gap-1">
                  <span>{vfxEvent.subtitle}</span>
                </p>
              )}
            </>
          )}
        </div>

        {/* Dismiss Hint */}
        <span className="text-[10px] text-slate-400/80 font-medium">
          (คลิกที่ใดก็ได้เพื่อปิด)
        </span>
      </div>
    </div>
  );
};
