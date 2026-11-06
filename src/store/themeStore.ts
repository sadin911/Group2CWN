import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  initTheme: () => void;
}

const STORAGE_KEY = 'pokecount_theme_preference';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  // Sync meta theme-color for mobile PWA status bar
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#0f172a' : '#f8fafc');
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: 'system',
  resolvedTheme: 'dark',

  setThemeMode: (mode: ThemeMode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Ignore localStorage write failures
    }

    const resolved = mode === 'system' ? getSystemTheme() : mode;
    applyThemeToDOM(resolved);
    set({ themeMode: mode, resolvedTheme: resolved });
  },

  initTheme: () => {
    let savedMode: ThemeMode = 'system';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        savedMode = stored;
      }
    } catch {
      // Ignore
    }

    const resolved = savedMode === 'system' ? getSystemTheme() : savedMode;
    applyThemeToDOM(resolved);
    set({ themeMode: savedMode, resolvedTheme: resolved });

    // Listen for system theme changes if set to system
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (get().themeMode === 'system') {
          const newResolved = getSystemTheme();
          applyThemeToDOM(newResolved);
          set({ resolvedTheme: newResolved });
        }
      };

      mediaQuery.removeEventListener?.('change', handleChange);
      mediaQuery.addEventListener?.('change', handleChange);
    }
  },
}));
