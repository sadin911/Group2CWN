import { useState, useRef, useEffect } from 'react';
import { useThemeStore, type ThemeMode } from '../../store/themeStore';

interface Props {
  variant?: 'pill' | 'dropdown' | 'segmented';
  className?: string;
}

export function ThemeToggle({ variant = 'dropdown', className = '' }: Props) {
  const themeMode = useThemeStore((s) => s.themeMode);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);

  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const options: { mode: ThemeMode; label: string; icon: string; desc: string }[] = [
    { mode: 'light', label: 'สว่าง (Light)', icon: '☀️', desc: 'ธีม Poké Ball ขาวแดงสว่างสดใส' },
    { mode: 'dark', label: 'มืด (Dark)', icon: '🌙', desc: 'ธีม Poké Ball กลางคืนสบายตา' },
    { mode: 'system', label: 'อัตโนมัติ (Auto)', icon: '💻', desc: 'ปรับตามการตั้งค่าเครื่อง' },
  ];

  /**
   * Full-width three-way switch, sized to sit as a row inside the account menu.
   * Uses the shared surface tokens so it matches every other control in the menu.
   */
  if (variant === 'segmented') {
    return (
      <div
        data-testid="theme-segmented"
        className={`grid grid-cols-3 gap-0.5 p-0.5 rounded-xl bg-[var(--surface)] ${className}`}
      >
        {options.map((opt) => {
          const isActive = themeMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setThemeMode(opt.mode)}
              aria-pressed={isActive}
              title={opt.desc}
              className={`h-8 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 ${
                isActive
                  ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                  : 'text-[var(--surface-muted)] hover:text-[var(--surface-fg)]'
              }`}
            >
              <span aria-hidden="true">{opt.icon}</span>
              <span>{opt.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div className={`inline-flex items-center p-1 rounded-xl bg-slate-900/80 dark:bg-slate-950 border border-slate-700/80 dark:border-slate-800 shadow-inner ${className}`}>
        {options.map((opt) => {
          const isActive = themeMode === opt.mode;
          return (
            <button
              key={opt.mode}
              type="button"
              onClick={() => setThemeMode(opt.mode)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 ring-1 ring-red-400/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={opt.desc}
            >
              <span>{opt.icon}</span>
              <span className="hidden sm:inline">{opt.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant (standard header icon button)
  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-800/90 dark:bg-slate-800 hover:bg-slate-700 border border-slate-700 dark:border-slate-700 text-slate-200 flex items-center justify-center text-sm shadow-sm transition-all hover:scale-105 active:scale-95"
        title={`ธีม: ${themeMode === 'system' ? 'อัตโนมัติ (ตามเครื่อง)' : themeMode === 'dark' ? 'มืด (Dark)' : 'สว่าง (Light)'}`}
      >
        {themeMode === 'system' ? (
          <span className="text-sm">💻</span>
        ) : resolvedTheme === 'dark' ? (
          <span className="text-sm">🌙</span>
        ) : (
          <span className="text-sm">☀️</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900/95 dark:bg-slate-900 border border-slate-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 space-y-1 backdrop-blur-xl">
          <div className="px-2.5 py-1 border-b border-slate-800">
            <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1">
              <span>⚪🔴</span>
              <span>ธีม Poké Ball</span>
            </p>
          </div>

          {options.map((opt) => {
            const isSelected = themeMode === opt.mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  setThemeMode(opt.mode);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{opt.icon}</span>
                  <div>
                    <div className="leading-tight">{opt.label}</div>
                    <div className={`text-[10px] ${isSelected ? 'text-rose-100' : 'text-slate-400'}`}>
                      {opt.mode === 'system' ? `ตามเครื่อง (${resolvedTheme === 'dark' ? 'มืด' : 'สว่าง'})` : opt.mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                    </div>
                  </div>
                </div>
                {isSelected && <span className="text-xs font-black">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
