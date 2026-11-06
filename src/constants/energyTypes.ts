import type { EnergyType } from '../types/game';

export interface EnergyTypeInfo {
  type: EnergyType;
  emoji: string;
  color: string;
  bgColor: string;
}

export const ENERGY_TYPES: EnergyTypeInfo[] = [
  { type: 'Fire',      emoji: '🔥', color: 'text-red-400',    bgColor: 'bg-red-900/60'     },
  { type: 'Water',     emoji: '💧', color: 'text-blue-400',   bgColor: 'bg-blue-900/60'    },
  { type: 'Grass',     emoji: '🌿', color: 'text-green-400',  bgColor: 'bg-green-900/60'   },
  { type: 'Lightning', emoji: '⚡', color: 'text-yellow-400', bgColor: 'bg-yellow-900/60'  },
  { type: 'Psychic',   emoji: '🔮', color: 'text-purple-400', bgColor: 'bg-purple-900/60'  },
  { type: 'Fighting',  emoji: '👊', color: 'text-orange-400', bgColor: 'bg-orange-900/60'  },
  { type: 'Darkness',  emoji: '🌑', color: 'text-gray-300',   bgColor: 'bg-gray-700/60'    },
  { type: 'Metal',     emoji: '⚙️', color: 'text-slate-300',  bgColor: 'bg-slate-700/60'   },
  { type: 'Dragon',    emoji: '🐉', color: 'text-teal-400',   bgColor: 'bg-teal-900/60'    },
  { type: 'Colorless', emoji: '⭐', color: 'text-gray-400',   bgColor: 'bg-gray-600/60'    },
];

export const ENERGY_MAP = Object.fromEntries(
  ENERGY_TYPES.map(e => [e.type, e])
) as Record<EnergyType, EnergyTypeInfo>;
