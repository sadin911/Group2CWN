import type { ReactNode } from 'react';
import { useGameStore, type GameMode } from '../../store/gameStore';
import { AccountMenu } from './AccountMenu';

/**
 * The application top bar, shared by the Collection and Deck pages.
 *
 * The bar carries three things and nothing else: the brand, the navigation tabs,
 * and the account control. Tools that used to sit here — sync, backup, install,
 * update, theme — moved into the account menu, and page-specific controls go in
 * the context strip below via `contextSlot`.
 */

interface NavTab {
  mode: GameMode;
  icon: string;
  label: string;
}

const NAV_TABS: NavTab[] = [
  { mode: 'collection', icon: '📚', label: 'สมุดสะสม' },
  { mode: 'deck', icon: '🃏', label: 'จัดเด็ค' },
];

interface Props {
  /** Wordmark, e.g. "PokéCollection" */
  title: string;
  /** One-line description, shown from `sm` up */
  tagline: string;
  /** Tailwind gradient classes for the wordmark */
  titleClassName: string;
  /** Page-specific controls, rendered in the strip beneath the bar */
  contextSlot?: ReactNode;
}

export function AppHeaderBar({ title, tagline, titleClassName, contextSlot }: Props) {
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-[var(--surface-border)] px-3 sm:px-8 pt-[max(0.625rem,env(safe-area-inset-top,0px))] pb-2 sm:py-3 shadow-md dark:shadow-2xl transition-colors duration-200">
      <div className="w-full flex items-center justify-between gap-3" data-testid="app-header-bar">
        {/* Brand */}
        <div 
          onClick={() => setGameMode('collection')}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setGameMode('collection'); }}
          title="PokeCount Tracker - ไปที่หน้าหลักสมุดสะสม"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900 border border-[var(--surface-border)] shadow-sm shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
            <img
              src={`${import.meta.env.BASE_URL}pwa-192x192.png?v=3`}
              alt="PokeCount Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <h1
              className={`text-sm sm:text-xl font-black bg-clip-text text-transparent leading-none truncate ${titleClassName}`}
            >
              {title}
            </h1>
            <p className="text-[11px] sm:text-xs text-[var(--surface-muted)] font-medium leading-none mt-0.5 hidden sm:block truncate">
              {tagline}
            </p>
          </div>
        </div>

        {/* Navigation — desktop only; mobile uses BottomNav */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--surface-border)]">
          {NAV_TABS.map((tab) => {
            const isActive = gameMode === tab.mode;
            return (
              <button
                key={tab.mode}
                type="button"
                onClick={() => setGameMode(tab.mode)}
                aria-current={isActive ? 'page' : undefined}
                className={`h-9 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-[var(--accent)] text-[var(--accent-fg)] font-black'
                    : 'text-[var(--surface-muted)] hover:text-[var(--surface-fg)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <AccountMenu />
      </div>

      {contextSlot && (
        <div
          className="mt-2 flex items-center gap-2 flex-wrap sm:flex-nowrap"
          data-testid="header-context-strip"
        >
          {contextSlot}
        </div>
      )}
    </header>
  );
}
