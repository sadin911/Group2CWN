import React, { useState, useEffect, useCallback } from 'react';

export type BalatroBadgeColor = 'gold' | 'emerald' | 'crimson' | 'indigo' | 'cyan' | 'purple';

export interface BalatroBadge {
  id: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  color?: BalatroBadgeColor;
  icon?: string;
  timestamp: number;
}

interface BalatroFloaterOverlayProps {
  badges: BalatroBadge[];
  onDismissBadge: (id: string) => void;
}

const COLOR_MAP: Record<BalatroBadgeColor, { bg: string; border: string; text: string; shadow: string; glow: string }> = {
  gold: {
    bg: 'from-amber-500/90 to-yellow-600/95',
    border: 'border-yellow-300',
    text: 'text-amber-100',
    shadow: 'shadow-amber-500/50',
    glow: 'rgba(245, 158, 11, 0.6)',
  },
  emerald: {
    bg: 'from-emerald-600/90 to-teal-700/95',
    border: 'border-emerald-300',
    text: 'text-emerald-100',
    shadow: 'shadow-emerald-500/50',
    glow: 'rgba(16, 185, 129, 0.6)',
  },
  crimson: {
    bg: 'from-red-600/90 to-rose-700/95',
    border: 'border-rose-300',
    text: 'text-rose-100',
    shadow: 'shadow-rose-500/50',
    glow: 'rgba(244, 63, 94, 0.6)',
  },
  indigo: {
    bg: 'from-indigo-600/90 to-blue-700/95',
    border: 'border-indigo-300',
    text: 'text-indigo-100',
    shadow: 'shadow-indigo-500/50',
    glow: 'rgba(99, 102, 241, 0.6)',
  },
  cyan: {
    bg: 'from-cyan-600/90 to-sky-700/95',
    border: 'border-cyan-300',
    text: 'text-cyan-100',
    shadow: 'shadow-cyan-500/50',
    glow: 'rgba(6, 182, 212, 0.6)',
  },
  purple: {
    bg: 'from-purple-600/90 to-fuchsia-700/95',
    border: 'border-purple-300',
    text: 'text-purple-100',
    shadow: 'shadow-purple-500/50',
    glow: 'rgba(168, 85, 247, 0.6)',
  },
};

export const BalatroFloaterOverlay: React.FC<BalatroFloaterOverlayProps> = ({
  badges,
  onDismissBadge,
}) => {
  useEffect(() => {
    if (badges.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      badges.forEach((b) => {
        if (now - b.timestamp >= 900) {
          onDismissBadge(b.id);
        }
      });
    }, 100);

    return () => clearInterval(timer);
  }, [badges, onDismissBadge]);

  return (
    <div
      id="balatro-floater-overlay"
      className="fixed inset-0 pointer-events-none z-[85] overflow-hidden select-none"
    >
      {badges.map((b) => {
        const theme = COLOR_MAP[b.color || 'gold'];
        return (
          <div
            key={b.id}
            data-testid="balatro-action-badge"
            className="absolute transform -translate-x-1/2 -translate-y-1/2 animate-balatro-badge-float"
            style={{
              left: `${b.x}px`,
              top: `${b.y}px`,
            }}
          >
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r ${theme.bg} border-2 ${theme.border} ${theme.text} shadow-xl ${theme.shadow} backdrop-blur-md`}
              style={{
                boxShadow: `0 0 20px ${theme.glow}, 0 4px 12px rgba(0, 0, 0, 0.5)`,
              }}
            >
              {b.icon && <span className="text-sm leading-none drop-shadow">{b.icon}</span>}
              <div className="flex flex-col items-center">
                <span className="font-mono font-black text-xs sm:text-sm tracking-wider uppercase drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
                  {b.text}
                </span>
                {b.subText && (
                  <span className="text-[9px] font-bold opacity-90 uppercase tracking-widest leading-tight">
                    {b.subText}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Custom hook to manage the Balatro floating badge queue
 */
export function useBalatroBadgeQueue() {
  const [badges, setBadges] = useState<BalatroBadge[]>([]);

  const addBadge = useCallback(
    (text: string, x: number, y: number, color: BalatroBadgeColor = 'gold', icon?: string, subText?: string) => {
      const newBadge: BalatroBadge = {
        id: `badge-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        text,
        subText,
        x,
        y,
        color,
        icon,
        timestamp: Date.now(),
      };
      setBadges((prev) => [...prev.slice(-7), newBadge]); // Keep last 8 max
    },
    []
  );

  const dismissBadge = useCallback((id: string) => {
    setBadges((prev) => prev.filter((b) => b.id !== id));
  }, []);

  return {
    badges,
    addBadge,
    dismissBadge,
  };
}
