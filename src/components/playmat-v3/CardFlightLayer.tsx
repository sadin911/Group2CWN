import React, { useState, useCallback, useEffect } from 'react';
import type { CardInstance } from '../../engine/types';
import { resolveCardImageUrl } from '../../utils/cardImage';

export interface CardFlight {
  id: string;
  card?: CardInstance;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  width?: number;
  height?: number;
  fromRot?: number;
  toRot?: number;
  isFacedown?: boolean;
  type?: 'DRAW' | 'SHUFFLE' | 'DECK_TO_BOARD' | 'HAND_TO_BOARD';
  durationMs?: number;
  timestamp: number;
  onComplete?: () => void;
}

interface CardFlightLayerProps {
  flights: CardFlight[];
  onDismissFlight: (id: string) => void;
}

/**
 * Authentic High-Definition Pokémon Card Back
 */
export const PokemonCardBack: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative w-full h-full rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 border border-indigo-900/60 shadow-inner flex items-center justify-center select-none ${className}`}>
    {/* Outer gold-rimmed frame */}
    <div className="absolute inset-1 rounded-md sm:rounded-lg border border-amber-400/50 shadow-[inset_0_0_8px_rgba(251,191,36,0.25)] pointer-events-none" />

    {/* Cosmic swirling vortex radial gradient */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(56,189,248,0.22)_0%,rgba(30,27,75,0.85)_65%,rgba(15,23,42,1)_100%)] pointer-events-none" />

    {/* Iconic Pokeball Centerpiece */}
    <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-amber-300/80 shadow-[0_0_12px_rgba(251,191,36,0.4)] flex flex-col overflow-hidden bg-slate-950">
      {/* Top Hemisphere (Red) */}
      <div className="w-full h-1/2 bg-gradient-to-b from-rose-500 to-red-600 border-b border-black/80 relative">
        <div className="absolute top-0.5 left-1 w-2.5 h-1 bg-white/40 rounded-full blur-[0.5px]" />
      </div>
      {/* Bottom Hemisphere (White) */}
      <div className="w-full h-1/2 bg-gradient-to-t from-slate-200 to-white" />
      {/* Center Dividing Belt & Button */}
      <div className="absolute inset-0 m-auto w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-slate-800 bg-white shadow-md flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full border border-slate-400 bg-slate-100" />
      </div>
    </div>

    {/* Specular sheen diagonal highlight */}
    <div className="absolute -inset-full bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 pointer-events-none" />
  </div>
);

export const CardFlightLayer: React.FC<CardFlightLayerProps> = ({ flights, onDismissFlight }) => {
  useEffect(() => {
    if (flights.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      flights.forEach((f) => {
        const duration = f.durationMs || 380;
        if (now - f.timestamp >= duration + 50) {
          f.onComplete?.();
          onDismissFlight(f.id);
        }
      });
    }, 40);

    return () => clearInterval(interval);
  }, [flights, onDismissFlight]);

  return (
    <div
      id="card-flight-layer"
      className="fixed inset-0 pointer-events-none z-[88] overflow-hidden select-none"
    >
      {flights.map((f) => {
        const cardWidth = f.width || 68;
        const cardHeight = f.height || Math.round(cardWidth * (88 / 63));
        const duration = f.durationMs || 400;
        const fromRot = f.fromRot ?? (f.type === 'DRAW' ? -12 : 5);
        const toRot = f.toRot ?? 0;
        const imageUrl = f.card ? resolveCardImageUrl(f.card) : '';

        return (
          <div
            key={f.id}
            data-testid="flying-card-item"
            className="fixed top-0 left-0 balatro-flying-card"
            style={
              {
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                '--flight-start-x': `${f.fromX}px`,
                '--flight-start-y': `${f.fromY}px`,
                '--flight-end-x': `${f.toX}px`,
                '--flight-end-y': `${f.toY}px`,
                '--flight-start-rot': `${fromRot}deg`,
                '--flight-end-rot': `${toRot}deg`,
                '--flight-duration': `${duration}ms`,
              } as React.CSSProperties
            }
          >
            <div className="w-full h-full rounded-xl overflow-hidden shadow-2xl border-2 border-white/60 bg-slate-900 ring-2 ring-emerald-400/40">
              {f.isFacedown || !imageUrl ? (
                /* Authentic High-Definition Pokemon Card Back */
                <PokemonCardBack />
              ) : (
                /* Card Face */
                <img
                  src={imageUrl}
                  alt="Flying Card"
                  draggable={false}
                  className="w-full h-full object-cover pointer-events-none"
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function useCardFlightManager() {
  const [flights, setFlights] = useState<CardFlight[]>([]);

  const dismissFlight = useCallback((id: string) => {
    setFlights((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const triggerFlight = useCallback(
    (flightParams: Omit<CardFlight, 'id' | 'timestamp'>) => {
      const newFlight: CardFlight = {
        ...flightParams,
        id: `flight-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
      };
      setFlights((prev) => [...prev, newFlight]);
    },
    []
  );

  const triggerFlightBetweenElements = useCallback(
    (
      fromEl: Element | null,
      toEl: Element | null,
      options: {
        card?: CardInstance;
        isFacedown?: boolean;
        type?: 'DRAW' | 'SHUFFLE' | 'DECK_TO_BOARD' | 'HAND_TO_BOARD';
        durationMs?: number;
        delayMs?: number;
        targetX?: number;
        targetY?: number;
        targetRot?: number;
        onComplete?: () => void;
      } = {}
    ) => {
      if (!fromEl || !toEl) return;
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const width = Math.min(74, Math.max(56, fromRect.width * 0.85));
      const height = Math.round(width * (88 / 63));

      const fromX = fromRect.left + fromRect.width / 2 - width / 2;
      const fromY = fromRect.top + fromRect.height / 2 - height / 2;

      // Allow caller to pass exact target destination coordinate, or fallback to target element center
      const toX = options.targetX !== undefined ? options.targetX - width / 2 : toRect.left + toRect.width / 2 - width / 2;
      const toY = options.targetY !== undefined ? options.targetY - height / 2 : toRect.top + toRect.height / 2 - height / 2;

      const schedule = () => {
        triggerFlight({
          fromX,
          fromY,
          toX,
          toY,
          width,
          height,
          fromRot: options.type === 'DRAW' ? -14 : 5,
          toRot: options.targetRot ?? 0,
          card: options.card,
          isFacedown: options.isFacedown,
          type: options.type || 'DRAW',
          durationMs: options.durationMs || 400,
          onComplete: options.onComplete,
        });
      };

      if (options.delayMs && options.delayMs > 0) {
        setTimeout(schedule, options.delayMs);
      } else {
        schedule();
      }
    },
    [triggerFlight]
  );

  return {
    flights,
    dismissFlight,
    triggerFlight,
    triggerFlightBetweenElements,
  };
}
