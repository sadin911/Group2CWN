
interface Props {
  abilityUsed: boolean;
  attackUsed: boolean;
  onToggleAbility: () => void;
  onToggleAttack: () => void;
  compact?: boolean;
}

export function AbilityTracker({ abilityUsed, attackUsed, onToggleAbility, onToggleAttack, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex gap-1">
        <button
          onClick={onToggleAbility}
          title="Ability used this turn"
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold border transition-colors ${
            abilityUsed
              ? 'bg-gray-700 text-gray-500 border-gray-600 line-through'
              : 'bg-indigo-900/50 text-indigo-300 border-indigo-600 hover:bg-indigo-800/50'
          }`}
        >
          Ability
        </button>
        <button
          onClick={onToggleAttack}
          title="Attack used this turn"
          className={`text-[10px] px-1.5 py-0.5 rounded font-bold border transition-colors ${
            attackUsed
              ? 'bg-gray-700 text-gray-500 border-gray-600 line-through'
              : 'bg-rose-900/50 text-rose-300 border-rose-600 hover:bg-rose-800/50'
          }`}
        >
          Attack
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={onToggleAbility}
        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          abilityUsed
            ? 'bg-gray-800 text-gray-600 border-gray-700 line-through'
            : 'bg-indigo-900/50 text-indigo-300 border-indigo-600 hover:bg-indigo-800/70'
        }`}
      >
        {abilityUsed ? '✓' : '✦'} Ability
      </button>
      <button
        onClick={onToggleAttack}
        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
          attackUsed
            ? 'bg-gray-800 text-gray-600 border-gray-700 line-through'
            : 'bg-rose-900/50 text-rose-300 border-rose-600 hover:bg-rose-800/70'
        }`}
      >
        {attackUsed ? '✓' : '⚔'} Attack
      </button>
    </div>
  );
}
