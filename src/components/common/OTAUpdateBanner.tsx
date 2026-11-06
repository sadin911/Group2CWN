import { useOTAUpdate } from '../../hooks/useOTAUpdate';

/**
 * Non-intrusive, seamless micro-toast for app update status.
 * Never interrupts user flow or requires manual button clicks.
 */
export function OTAUpdateBanner() {
  const { isUpdating, statusMessage } = useOTAUpdate();

  if (!statusMessage) {
    return null;
  }

  return (
    <div className="fixed bottom-16 md:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="px-4 py-2 rounded-full bg-slate-900/90 dark:bg-slate-800/90 text-white text-xs font-bold shadow-xl border border-slate-700/80 backdrop-blur-md flex items-center gap-2">
        <span className={isUpdating ? 'animate-spin' : ''}>
          {isUpdating ? '⚡' : '✨'}
        </span>
        <span>{statusMessage}</span>
      </div>
    </div>
  );
}
