import { useGameStore, type GameMode } from '../../store/gameStore';
import { useDeckStore } from '../../store/deckStore';

export function BottomNav() {
  const gameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const decks = useDeckStore((s) => s.decks);
  const totalDecks = Object.keys(decks).length;

  const tabs: {
    id: GameMode;
    label: string;
    icon: string;
    badge?: number | string;
    activeGradient: string;
    activeText: string;
  }[] = [
    {
      id: 'collection',
      label: 'สมุดสะสม',
      icon: '📚',
      activeGradient: 'from-yellow-400 via-amber-400 to-yellow-500',
      activeText: 'text-amber-600 dark:text-yellow-300',
    },
    {
      id: 'deck',
      label: 'จัดเด็ค',
      icon: '🃏',
      badge: totalDecks > 0 ? totalDecks : undefined,
      activeGradient: 'from-blue-600 via-blue-500 to-indigo-600',
      activeText: 'text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800/80 px-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-8px_25px_rgba(0,0,0,0.6)] select-none transition-colors duration-200">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = gameMode === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setGameMode(tab.id)}
              className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-2xl transition-all duration-200 active:scale-90 ${
                isActive
                  ? 'text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {/* Active glow background pill */}
              {isActive && (
                <div
                  className={`absolute inset-x-2 inset-y-0.5 rounded-xl bg-gradient-to-r ${tab.activeGradient} opacity-15 shadow-inner`}
                />
              )}

              {/* Icon Container with Badge */}
              <div className="relative">
                <span
                  className={`text-xl transition-transform duration-200 ${
                    isActive ? 'scale-110' : 'opacity-80'
                  }`}
                >
                  {tab.icon}
                </span>

                {tab.badge && (
                  <span className="absolute -top-1 -right-2.5 px-1.5 py-0.2 bg-indigo-500 text-white text-[9px] font-black rounded-full border border-slate-950 shadow-sm leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] tracking-tight mt-0.5 transition-colors duration-200 ${
                  isActive
                    ? `${tab.activeText} font-black`
                    : 'font-bold text-slate-400'
                }`}
              >
                {tab.label}
              </span>

              {/* Bottom active pip */}
              {isActive && (
                <span
                  className={`w-1 h-1 rounded-full bg-gradient-to-r ${tab.activeGradient} mt-0.5 shadow-sm`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
