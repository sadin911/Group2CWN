import React, { useEffect, useState } from 'react';
import { PokemonCardBack } from './CardFlightLayer';
import { Sound } from '../../engine/pixi/SoundEffects';

export interface DeckShuffleOverlayProps {
  deckElement: Element | null;
  onComplete?: () => void;
}

/**
 * AAA 3D Casino Riffle Deck Shuffle Overlay
 * Features deck packet splitting, rapid alternating card flutter, and classic bridge snap
 */
export const DeckShuffleOverlay: React.FC<DeckShuffleOverlayProps> = ({
  deckElement,
  onComplete,
}) => {
  const [coords, setCoords] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [showSnapBurst, setShowSnapBurst] = useState(false);

  useEffect(() => {
    if (!deckElement) return;
    const rect = deckElement.getBoundingClientRect();
    setCoords({
      left: rect.left,
      top: rect.top,
      width: rect.width || 68,
      height: rect.height || 95,
    });

    // Play synthesized physical riffle audio sequence
    Sound.playDeckShuffle();

    // Trigger golden snap burst at bridge landing
    const burstTimer = setTimeout(() => {
      setShowSnapBurst(true);
      Sound.playCardPlacement();
    }, 560);

    // Complete and dismiss overlay
    const completeTimer = setTimeout(() => {
      onComplete?.();
    }, 760);

    return () => {
      clearTimeout(burstTimer);
      clearTimeout(completeTimer);
    };
  }, [deckElement, onComplete]);

  if (!coords) return null;

  return (
    <div
      id="deck-shuffle-3d-overlay"
      data-testid="deck-shuffle-overlay"
      className="fixed z-[89] pointer-events-none select-none"
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        width: `${coords.width}px`,
        height: `${coords.height}px`,
        perspective: '1000px',
      }}
    >
      {/* 1. Left Deck Packet (Splits Outward Left) */}
      <div
        className="absolute inset-0 rounded-lg sm:rounded-xl shadow-2xl"
        style={{
          animation: 'deck-split-left 720ms cubic-bezier(0.25, 1, 0.5, 1) forwards',
          transformStyle: 'preserve-3d',
        }}
      >
        <PokemonCardBack className="shadow-lg border-sky-400/50" />
      </div>

      {/* 2. Right Deck Packet (Splits Outward Right) */}
      <div
        className="absolute inset-0 rounded-lg sm:rounded-xl shadow-2xl"
        style={{
          animation: 'deck-split-right 720ms cubic-bezier(0.25, 1, 0.5, 1) forwards',
          transformStyle: 'preserve-3d',
        }}
      >
        <PokemonCardBack className="shadow-lg border-sky-400/50" />
      </div>

      {/* 3. Interleaving Riffle Flutter Cards (8 Cascading Alternating Layers) */}
      {[...Array(8)].map((_, idx) => {
        const isLeft = idx % 2 === 0;
        const offset = 26 - idx * 2.5;
        const riffleX = isLeft ? -offset : offset;
        const riffleRot = isLeft ? -(12 - idx * 1.2) : 12 - idx * 1.2;
        const delayMs = 120 + idx * 42;

        return (
          <div
            key={idx}
            className="absolute inset-0 rounded-lg sm:rounded-xl"
            style={
              {
                '--riffle-x': `${riffleX}px`,
                '--riffle-rot': `${riffleRot}deg`,
                animation: `deck-riffle-flutter 360ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms forwards`,
                opacity: 0,
                transformStyle: 'preserve-3d',
                zIndex: 10 + idx,
              } as React.CSSProperties
            }
          >
            <PokemonCardBack className="scale-[0.98] opacity-95" />
          </div>
        );
      })}

      {/* 4. Final Bridge Arch & Snap Stack */}
      <div
        className="absolute inset-0 rounded-lg sm:rounded-xl"
        style={{
          animation: 'deck-bridge-arc 320ms cubic-bezier(0.34, 1.56, 0.64, 1) 480ms forwards',
          transformStyle: 'preserve-3d',
          zIndex: 30,
        }}
      >
        <PokemonCardBack className="border-amber-400/80 shadow-2xl" />
      </div>

      {/* 5. Golden Stardust Landing Burst */}
      {showSnapBurst && (
        <div className="absolute inset-0 m-auto w-24 h-24 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center animate-out fade-out zoom-out-150 duration-300">
          <div className="w-16 h-16 rounded-full border-2 border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.8)] animate-ping" />
          <div className="absolute text-amber-300 font-mono text-xs font-black drop-shadow">✨ SHUFFLE</div>
        </div>
      )}
    </div>
  );
};

export default DeckShuffleOverlay;
