import { useState } from 'react';
import type { PlayerId } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../hooks/useTheme';

interface Props {
  playerId: PlayerId;
  isCurrentTurn: boolean;
}

export function PlayerHeader({ playerId, isCurrentTurn }: Props) {
  const player = useGameStore(s => s[playerId]);
  const { setPrizeCards, setPlayerName } = useGameStore();
  const [editingName, setEditingName] = useState(false);
  const theme = useTheme();

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-colors ${
      isCurrentTurn ? theme.headerOn : theme.headerOff
    }`}>
      {/* Turn indicator */}
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isCurrentTurn ? `${theme.headerDot} animate-pulse` : theme.headerDotOff}`} />

      {/* Player name */}
      {editingName ? (
        <input
          autoFocus
          className="bg-transparent text-sm font-bold text-white outline-none flex-1"
          value={player.name}
          onChange={e => setPlayerName(playerId, e.target.value)}
          onBlur={() => setEditingName(false)}
          onKeyDown={e => e.key === 'Enter' && setEditingName(false)}
        />
      ) : (
        <button onClick={() => setEditingName(true)} className="flex-1 text-left">
          <span className={`text-sm font-bold ${isCurrentTurn ? theme.headerNameOn : theme.headerNameOff}`}>
            {player.name}
          </span>
          {isCurrentTurn && <span className={`ml-1.5 text-sm ${theme.headerTurnBadge}`}>▶</span>}
        </button>
      )}

      {/* Prize cards */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Prize:</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPrizeCards(playerId, i < player.prizeCards ? i : i + 1)}
              className={`w-3 h-3 rounded-sm border transition-colors ${
                i < player.prizeCards
                  ? 'bg-yellow-500 border-yellow-400'
                  : 'bg-gray-700 border-gray-600'
              }`}
            />
          ))}
        </div>
        <span className="text-xs font-mono text-gray-400 w-3">{player.prizeCards}</span>
      </div>
    </div>
  );
}
