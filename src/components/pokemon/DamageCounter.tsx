import { useLongPress } from '../../hooks/useLongPress';

interface Props {
  damage: number;
  maxHP: number;
  onAdd: (amount: number) => void;
  compact?: boolean;
}

export function DamageCounter({ damage, maxHP, onAdd, compact = false }: Props) {
  const longPressPlus = useLongPress(() => onAdd(10));
  const longPressMinus = useLongPress(() => onAdd(-10));
  const isKO = damage >= maxHP && maxHP > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onAdd(-10)}
          className="w-5 h-5 rounded bg-gray-700 text-gray-300 text-xs font-bold flex items-center justify-center hover:bg-gray-600 active:bg-gray-500"
        >−</button>
        <span className={`text-xs font-bold font-mono w-8 text-center ${isKO ? 'text-red-400' : 'text-gray-200'}`}>
          {isKO ? 'KO' : damage}
        </span>
        <button
          onClick={() => onAdd(10)}
          className="w-5 h-5 rounded bg-gray-700 text-gray-300 text-xs font-bold flex items-center justify-center hover:bg-gray-600 active:bg-gray-500"
        >+</button>
      </div>
    );
  }

  // Full mode: all controls in one compact row
  // [-30] [−(hold)] | N dmg | [(hold)+] [+30] [+60] [+90]
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => onAdd(-30)}
        className="text-[9px] font-bold px-1.5 py-1.5 rounded-md bg-gray-700/60 text-gray-500 hover:text-red-400 hover:bg-red-900/20 active:bg-red-900/40 transition-colors select-none"
      >-30</button>

      <button
        onClick={() => onAdd(-10)}
        {...longPressMinus}
        className="h-7 w-7 rounded-lg bg-gray-700 text-gray-200 text-sm font-bold flex items-center justify-center hover:bg-gray-600 active:bg-gray-500 select-none"
      >−</button>

      <div className="flex-1 text-center">
        {isKO ? (
          <span className="text-base font-black text-red-400 animate-pulse">KO!</span>
        ) : (
          <span className="text-base font-black text-white font-mono">
            {damage}<span className="text-[10px] text-gray-500 font-normal ml-0.5">dmg</span>
          </span>
        )}
      </div>

      <button
        onClick={() => onAdd(10)}
        {...longPressPlus}
        className="h-7 w-7 rounded-lg bg-gray-700 text-gray-200 text-sm font-bold flex items-center justify-center hover:bg-gray-600 active:bg-gray-500 select-none"
      >+</button>

      {[30, 60, 90].map(amt => (
        <button
          key={amt}
          onClick={() => onAdd(amt)}
          className="text-[9px] font-bold px-1.5 py-1.5 rounded-md bg-gray-700/60 text-gray-500 hover:text-green-400 hover:bg-green-900/20 active:bg-green-900/40 transition-colors select-none"
        >+{amt}</button>
      ))}
    </div>
  );
}
