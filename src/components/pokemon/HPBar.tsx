
interface Props {
  maxHP: number;
  currentDamage: number;
}

export function HPBar({ maxHP, currentDamage }: Props) {
  const currentHP = Math.max(0, maxHP - currentDamage);
  const pct = maxHP > 0 ? (currentHP / maxHP) * 100 : 0;

  const barColor =
    pct > 50 ? 'bg-green-500' :
    pct > 25 ? 'bg-yellow-500' :
    'bg-red-500';

  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-300 font-mono whitespace-nowrap">
        {currentHP}/{maxHP}
      </span>
    </div>
  );
}
