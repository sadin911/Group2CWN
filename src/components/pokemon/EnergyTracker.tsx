import { useState } from 'react';
import type { EnergyType } from '../../types/game';
import { ENERGY_TYPES } from '../../constants/energyTypes';

interface Props {
  energies: Partial<Record<EnergyType, number>>;
  onUpdate: (type: EnergyType, count: number) => void;
  compact?: boolean;
}

export function EnergyTracker({ energies, onUpdate, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const total = Object.values(energies).reduce((a, b) => a + (b ?? 0), 0);
  const attached = ENERGY_TYPES.filter(e => (energies[e.type] ?? 0) > 0);

  if (compact) {
    return (
      <>
        <div className="flex flex-wrap gap-0.5 items-center">
          {attached.map(e => (
            <button
              key={e.type}
              onClick={() => onUpdate(e.type, (energies[e.type] ?? 0) - 1)}
              className={`text-[11px] px-1 py-0.5 rounded font-medium select-none active:opacity-60 ${e.bgColor} ${e.color}`}
              title={`Tap to remove 1 ${e.type}`}
            >
              {e.emoji}{energies[e.type]}
            </button>
          ))}
          <button
            onClick={() => setShowPicker(true)}
            className="w-[18px] h-[18px] rounded bg-gray-700 text-gray-400 hover:text-white text-[10px] font-bold flex items-center justify-center select-none leading-none"
            title="Add energy"
          >+</button>
        </div>

        {showPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setShowPicker(false)}>
            <div className="bg-gray-900 border border-gray-700 rounded-t-2xl p-4 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
              <p className="text-[11px] text-gray-500 mb-3 text-center font-semibold uppercase tracking-wide">Add Energy</p>
              <div className="grid grid-cols-5 gap-2">
                {ENERGY_TYPES.map(e => {
                  const count = energies[e.type] ?? 0;
                  return (
                    <button
                      key={e.type}
                      onClick={() => { onUpdate(e.type, count + 1); setShowPicker(false); }}
                      className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border select-none active:opacity-60 ${
                        count > 0 ? `${e.bgColor} border-current/30` : 'bg-gray-800 border-gray-700'
                      }`}
                    >
                      <span className="text-xl leading-none">{e.emoji}</span>
                      <span className={`text-[9px] font-bold ${count > 0 ? e.color : 'text-gray-500'}`}>
                        {e.type.slice(0, 3)}
                      </span>
                      {count > 0 && <span className={`text-[9px] ${e.color}`}>×{count}</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowPicker(false)}
                className="mt-3 w-full py-2 rounded-xl bg-gray-800 text-gray-400 text-sm font-semibold"
              >Done</button>
            </div>
          </div>
        )}
      </>
    );
  }

  const typesToShow = expanded ? ENERGY_TYPES : (attached.length > 0 ? attached : ENERGY_TYPES.slice(0, 4));

  return (
    <div>
      <button
        onClick={() => setExpanded(e => !e)}
        className="text-xs text-gray-500 hover:text-gray-300 mb-1 flex items-center gap-1"
      >
        ⚡ Energy {total > 0 ? `(${total})` : ''} {expanded ? '▲' : '▼'}
      </button>
      <div className="flex flex-wrap gap-1">
        {typesToShow.map(e => {
          const count = energies[e.type] ?? 0;
          return (
            <div key={e.type} className={`flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 border ${count > 0 ? e.bgColor + ' border-current/30' : 'bg-gray-800/40 border-gray-700'}`}>
              <span className="text-sm">{e.emoji}</span>
              {count > 0 && (
                <span className={`text-xs font-bold ${e.color}`}>{count}</span>
              )}
              <div className="flex flex-col ml-0.5">
                <button
                  onClick={() => onUpdate(e.type, count + 1)}
                  className="text-gray-400 hover:text-white leading-none text-[10px]"
                >▲</button>
                <button
                  onClick={() => onUpdate(e.type, count - 1)}
                  className="text-gray-400 hover:text-white leading-none text-[10px]"
                  disabled={count === 0}
                >▼</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
