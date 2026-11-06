import { useOTAUpdate } from '../../hooks/useOTAUpdate';

interface Props {
  variant?: 'toolbar' | 'menu' | 'badge';
  className?: string;
}

export function OTAUpdateButton({ variant = 'toolbar', className = '' }: Props) {
  const {
    isChecking,
    isUpdating,
    checkForUpdates,
  } = useOTAUpdate();

  const handleClick = () => {
    checkForUpdates();
  };

  if (variant === 'menu') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isChecking || isUpdating}
        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between gap-2 shadow-xs cursor-pointer bg-indigo-50/70 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 ${className}`}
      >
        <div className="flex items-center gap-2">
          <span className={isChecking || isUpdating ? 'animate-spin' : ''}>
            {isUpdating ? '⚡' : '🔄'}
          </span>
          <span>
            {isUpdating
              ? 'กำลังอัปเดตแอป...'
              : isChecking
              ? 'กำลังตรวจหาเวอร์ชันใหม่...'
              : 'ตรวจหาอัปเดต'}
          </span>
        </div>
        <span className="text-[10px] opacity-70">
          {isChecking ? 'Checking...' : 'OTA'}
        </span>
      </button>
    );
  }

  if (variant === 'badge') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isChecking || isUpdating}
        title="ตรวจหาอัปเดต"
        className={`px-2 py-1 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-700 ${className}`}
      >
        <span className={isChecking || isUpdating ? 'animate-spin' : ''}>
          {isUpdating ? '⚡' : '🔄'}
        </span>
        <span className="hidden sm:inline">
          {isUpdating ? 'กำลังอัปเดต...' : isChecking ? 'เช็คเวอร์ชัน...' : 'เช็คอัปเดต'}
        </span>
      </button>
    );
  }

  // Default: toolbar button
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isChecking || isUpdating}
      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 ${className}`}
      title="ตรวจหาเวอร์ชันใหม่และอัปเดต Over-The-Air"
    >
      <span className={isChecking || isUpdating ? 'animate-spin' : ''}>
        {isUpdating ? '⚡' : '🔄'}
      </span>
      <span>
        {isUpdating
          ? 'กำลังอัปเดต...'
          : isChecking
          ? 'กำลังเช็ค...'
          : 'เช็คอัปเดต'}
      </span>
    </button>
  );
}
