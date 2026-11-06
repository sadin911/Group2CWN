import { THEMES } from '../constants/themes';
import { useGameStore } from '../store/gameStore';

export function useTheme() {
  const themeId = useGameStore(s => s.theme);
  return THEMES[themeId] ?? THEMES.midnight;
}
