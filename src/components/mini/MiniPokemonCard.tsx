import { useState } from 'react';
import type { PokemonSlot as PokemonSlotType, PlayerId, SlotKey } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { StatusBadge } from '../pokemon/StatusBadge';
import { HPPresetPicker, type CardMatchResult } from '../pokemon/HPPresetPicker';
import { EvolutionModal } from '../pokemon/EvolutionModal';
import { CardImagePreviewModal } from '../pokemon/CardImagePreviewModal';
import { ENERGY_MAP } from '../../constants/energyTypes';
import type { EnergyType } from '../../types/game';
import { resolveCardImageUrl } from '../../utils/cardImage';

interface Props {
  pokemon: PokemonSlotType;
  playerId: PlayerId;
  slot: SlotKey;
  isActive?: boolean;
  isSelected?: boolean;   // tap-selected for swap
  swapMode?: boolean;     // another slot tap-selected — can swap here
  onSelect?: () => void;  // tap handler on ⇄
  isDragSource?: boolean; // being touch-dragged
  isDragTarget?: boolean; // current touch-drag drop target
  onSwapStart?: (e: React.TouchEvent) => void; // ⇄ touchstart → initiate drag
}

export function MiniPokemonCard({
  pokemon, playerId, slot, isActive,
  isSelected = false, swapMode = false, onSelect,
  isDragSource = false, isDragTarget = false, onSwapStart,
}: Props) {
  const { updatePokemon, clearPokemon } = useGameStore();
  const [showPicker, setShowPicker] = useState(false);
  const [showEvoModal, setShowEvoModal] = useState(false);
  const [showZoom, setShowZoom] = useState(false);

  const update = (changes: Partial<PokemonSlotType>) => updatePokemon(playerId, slot, changes);
  const addDamage = (amt: number) =>
    update({ currentDamage: Math.max(0, pokemon.currentDamage + amt) });

  const hasCard = pokemon.name !== '';
  const chips = Math.floor(pokemon.currentDamage / 10);
  const currentHP = Math.max(0, pokemon.maxHP - pokemon.currentDamage);
  const isKO = hasCard && pokemon.currentDamage >= pokemon.maxHP && pokemon.maxHP > 0;
  const hpPct = pokemon.maxHP > 0 ? currentHP / pokemon.maxHP : 1;
  const hpColor = hpPct > 0.5 ? 'text-green-400' : hpPct > 0.25 ? 'text-yellow-400' : 'text-red-400';

  const onPickHP = (hp: number, card?: CardMatchResult) => {
    update({
      maxHP: hp,
      currentDamage: 0,
      name: card?.name || (pokemon.name ? pokemon.name : 'Pokémon'),
      imageUrl: card?.imageUrl !== undefined ? card.imageUrl : pokemon.imageUrl,
      officialImageUrl: card?.officialImageUrl !== undefined ? card.officialImageUrl : pokemon.officialImageUrl,
      types: card?.types !== undefined ? card.types : pokemon.types,
    });
    setShowPicker(false);
  };

  const onEvolve = (card: any) => {
    update({
      name: card.name,
      maxHP: card.hp,
      imageUrl: card.imageUrl,
      officialImageUrl: card.officialImageUrl,
      types: card.types,
      status: 'none', // Clears all status conditions upon evolution per TCG rules
      abilityUsed: false,
      attackUsed: false,
    });
    setShowEvoModal(false);
  };

  const firstType = pokemon.types?.[0] as EnergyType | undefined;
  const typeInfo = firstType ? ENERGY_MAP[firstType] : null;

  // ── Empty slot ──────────────────────────────────────────────────────────────
  if (!hasCard) {
    return (
      <>
        <button
          onClick={() => {
            // When another card is selected, tap here = move it here
            if (swapMode && onSelect) {
              onSelect();
            } else {
              setShowPicker(true);
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 h-full w-full aspect-[63/88] rounded-xl border-2 border-dashed transition-all select-none shadow-md ${
            swapMode
              ? 'border-yellow-400 text-yellow-300 bg-yellow-950/80 scale-[0.97] ring-2 ring-yellow-400/50 shadow-yellow-900/30'
              : isActive
                ? 'border-blue-500/80 text-blue-300 bg-slate-900/90 active:border-blue-400 active:text-blue-200 hover:bg-slate-800/90 shadow-blue-950/40'
                : 'border-slate-600/80 text-slate-400 bg-slate-900/90 active:border-slate-400 active:text-slate-200 hover:bg-slate-800/90 shadow-inner'
          }`}
        >
          <span className="text-xl leading-none">
            {swapMode ? '⇄' : isActive ? '⚔' : '+'}
          </span>
          <span className="text-[10px] font-black uppercase tracking-wider leading-none">
            {swapMode ? 'Move' : isActive ? 'Active' : 'Set HP'}
          </span>
        </button>
        {showPicker && (
          <HPPresetPicker currentMaxHP={0} onSelect={onPickHP} onClose={() => setShowPicker(false)} />
        )}
      </>
    );
  }

  // ── Occupied card ───────────────────────────────────────────────────────────
  const borderStyle = isDragTarget
    ? 'ring-2 ring-emerald-400 border-emerald-400 shadow-lg shadow-emerald-950/50'
    : isDragSource
      ? 'opacity-60 border-yellow-400'
      : isSelected
        ? 'ring-2 ring-yellow-400 border-yellow-400 shadow-lg shadow-yellow-950/50'
        : isKO
          ? 'border-red-500 ring-2 ring-red-500/80'
          : swapMode
            ? 'border-yellow-400/80 ring-1 ring-yellow-400/50'
            : isActive
              ? 'border-blue-500 shadow-lg shadow-blue-950/60 ring-1 ring-blue-500/50'
              : 'border-slate-600 shadow-md ring-1 ring-white/10';

  return (
    <>
      <div className={`relative flex flex-col justify-between p-1 rounded-xl border h-full w-full aspect-[63/88] overflow-hidden transition-all shadow-md group select-none bg-slate-900 ${borderStyle}`}>
        {/* Full-color vibrant card artwork */}
        {pokemon.imageUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-90 transition-opacity filter brightness-100 contrast-105 pointer-events-none"
            style={{ backgroundImage: `url(${resolveCardImageUrl(pokemon.imageUrl)})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-900 pointer-events-none" />
        )}

        {/* Top row: swap + Name/HP + Evolve 🧬 + delete in frosted pill container */}
        <div className="relative flex items-center gap-0.5 flex-shrink-0 z-10 bg-slate-950/85 backdrop-blur-sm rounded-lg p-0.5 border border-white/15 shadow-sm">
          {/* Swap ⇄ */}
          <button
            onClick={onSelect}
            onTouchStart={onSwapStart}
            className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] flex-shrink-0 transition-all active:scale-90 cursor-grab active:cursor-grabbing ${
              isDragSource || isDragTarget
                ? 'bg-emerald-500 text-black font-black'
                : isSelected
                  ? 'bg-yellow-400 text-black font-black'
                  : swapMode
                    ? 'bg-yellow-700 text-yellow-200'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Drag or tap to swap"
          >⇄</button>

          {/* Name and HP — tap to change */}
          <button
            onClick={() => setShowPicker(true)}
            className="flex-1 text-left min-w-0 overflow-hidden px-1 group/btn"
          >
            <div className="flex items-center gap-1 leading-none">
              <span className="text-[9px] font-bold text-white truncate leading-tight group-hover/btn:text-blue-300 drop-shadow">
                {pokemon.name !== 'Pokémon' ? pokemon.name : `${pokemon.maxHP} HP`}
              </span>
              {typeInfo && (
                <span className="text-[8px] flex-shrink-0 leading-none">
                  {typeInfo.emoji}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[8px] font-black text-slate-300 leading-none drop-shadow">
                {pokemon.maxHP} HP
              </span>
              <span className="text-[7px] text-slate-400 leading-none">✎</span>
            </div>
          </button>

          {/* Evolve 🧬 Button */}
          <button
            onClick={() => setShowEvoModal(true)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-purple-900/90 border border-purple-600/80 text-purple-200 text-[10px] font-bold hover:bg-purple-800 active:scale-90 transition-all shadow-sm"
            title="พัฒนาร่าง (Evolve)"
          >
            🧬
          </button>

          {/* Zoom 🔍 Card Image Button */}
          {pokemon.imageUrl && (
            <button
              onClick={() => setShowZoom(true)}
              className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-blue-900/90 border border-blue-600/80 text-blue-200 text-[10px] font-bold hover:bg-blue-800 active:scale-90 transition-all shadow-sm"
              title="ขยายภาพการ์ด (Zoom)"
            >
              🔍
            </button>
          )}

          {/* Delete */}
          <button
            onClick={() => clearPokemon(playerId, slot)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md bg-red-900/90 border border-red-600/80 text-red-200 text-[10px] font-black hover:bg-red-800 active:scale-90 transition-all"
            title="Remove"
          >✕</button>
        </div>

        {/* Damage chips & center HP badge */}
        <div className="relative flex-1 flex flex-col justify-center items-center gap-1 min-h-0 z-10 my-0.5">
          {/* Damage chips */}
          {chips > 0 && (
            <div className="flex flex-wrap justify-center gap-0.5 max-h-10 overflow-hidden bg-slate-950/80 backdrop-blur-sm px-1.5 py-0.5 rounded-md border border-red-500/40 shadow">
              {Array.from({ length: Math.min(chips, 14) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => addDamage(-10)}
                  className="w-2.5 h-2.5 rounded-full bg-red-500 border border-red-300 hover:bg-red-400 active:scale-75 transition-all flex-shrink-0 shadow-sm"
                  title="Remove 10 damage"
                />
              ))}
              {chips > 14 && (
                <span className="text-[8px] text-red-300 font-black self-center leading-none">+{chips - 14}</span>
              )}
            </div>
          )}

          {/* Current HP badge in center */}
          <div className="text-center">
            {isKO ? (
              <span className="bg-red-900/95 border border-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse shadow-md">
                ☠ KO!
              </span>
            ) : (
              <div className="bg-slate-950/85 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1">
                <span className={`text-sm font-black font-mono leading-none drop-shadow ${hpColor}`}>
                  {currentHP}
                </span>
                <span className="text-[8px] text-slate-400 font-bold leading-none">HP</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom row: Status + ±10 in frosted container */}
        <div className="relative flex items-center gap-0.5 flex-shrink-0 z-10 bg-slate-950/85 backdrop-blur-sm rounded-lg p-0.5 border border-white/15 shadow-sm">
          <StatusBadge status={pokemon.status} onChange={status => update({ status })} compact />
          <button
            onClick={() => addDamage(10)}
            className="flex-1 py-0.5 rounded bg-red-950/90 hover:bg-red-900 border border-red-700/80 text-red-200 text-[9px] font-black active:scale-95 transition-all"
          >−10</button>
          <button
            onClick={() => addDamage(-10)}
            className="flex-1 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-200 text-[9px] font-black active:scale-95 transition-all"
          >+10</button>
        </div>
      </div>

      {showPicker && (
        <HPPresetPicker
          currentMaxHP={pokemon.maxHP}
          initialType={firstType || undefined}
          onSelect={onPickHP}
          onClose={() => setShowPicker(false)}
        />
      )}

      {showEvoModal && (
        <EvolutionModal
          pokemon={pokemon}
          onSelectEvolution={onEvolve}
          onClose={() => setShowEvoModal(false)}
        />
      )}

      {showZoom && pokemon.imageUrl && (
        <CardImagePreviewModal
          imageUrl={pokemon.imageUrl}
          officialImageUrl={pokemon.officialImageUrl || null}
          cardName={pokemon.name}
          onClose={() => setShowZoom(false)}
        />
      )}
    </>
  );
}
