import React, { useEffect } from 'react';
import type { TabletopActionToastItem } from './types';

interface TabletopActionToastProps {
  toast: TabletopActionToastItem | null | undefined;
  onDismiss: () => void;
}

export const TabletopActionToast: React.FC<TabletopActionToastProps> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    if (!toast) return;
    const duration = toast.type === 'WARNING' ? 4500 : 2800;
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isWarning = toast.type === 'WARNING';
  const isP1 = toast.playerSide === 'player1';
  const borderColor = isWarning
    ? 'border-amber-400/80 shadow-amber-500/30'
    : isP1
    ? 'border-blue-500/50 shadow-blue-500/20'
    : toast.playerSide === 'player2'
    ? 'border-red-500/50 shadow-red-500/20'
    : 'border-amber-400/50 shadow-amber-400/20';
  const badgeBg = isP1
    ? 'bg-blue-600/30 text-blue-300 border-blue-500/40'
    : 'bg-red-600/30 text-red-300 border-red-500/40';

  return (
    <div
      id="tabletop-action-toast"
      className="pointer-events-none fixed top-16 left-1/2 -translate-x-1/2 z-[80] transition-all duration-300 animate-in fade-in slide-in-from-top-4"
    >
      <div
        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-2xl backdrop-blur-md ${
          isWarning ? 'bg-slate-950/95 ring-1 ring-amber-400/50' : 'bg-slate-900/90'
        } text-white border ${borderColor} shadow-xl shadow-black/70 transition-all max-w-[92vw] sm:max-w-lg`}
      >
        <span className="text-lg select-none flex-shrink-0">{toast.icon || (isWarning ? '⚠️' : '⚡')}</span>
        {toast.cardImageUrl && (
          <div className="relative w-9 h-12 rounded-lg overflow-hidden border border-white/40 shadow-md flex-shrink-0 bg-slate-950">
            <img
              src={toast.cardImageUrl}
              alt={toast.cardName || 'Card'}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        {toast.playerSide && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${badgeBg}`}
          >
            {isP1 ? 'P1' : 'P2'}
          </span>
        )}
        <span className={`text-xs sm:text-sm font-medium ${isWarning ? 'text-amber-200' : 'text-slate-100'} leading-tight`}>
          {toast.message}
        </span>
        <button
          onClick={onDismiss}
          className="ml-auto text-slate-400 hover:text-white transition-colors p-1 text-xs rounded-full hover:bg-slate-800 flex-shrink-0"
          aria-label="Dismiss toast"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
