import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { PlayerId, SlotKey, PokemonSlot as PokemonSlotType, EnergyType } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { HPPresetPicker } from '../pokemon/HPPresetPicker';
import { EvolutionModal } from '../pokemon/EvolutionModal';
import { CardImagePreviewModal } from '../pokemon/CardImagePreviewModal';
import { PokemonNameInput } from '../pokemon/PokemonNameInput';
import { EnergyTracker } from '../pokemon/EnergyTracker';
import { AbilityTracker } from '../pokemon/AbilityTracker';
import { STATUS_INFO, STATUS_ORDER } from '../../constants/statusConditions';

interface Props {
  pokemon: PokemonSlotType;
  playerId: PlayerId;
  slot: SlotKey;
  onClose: () => void;
}

export function CardDetailModal({ pokemon, playerId, slot, onClose }: Props) {
  const { updatePokemon, clearPokemon, setEnergyCount } = useGameStore();
  const [showHPPicker, setShowHPPicker] = useState(false);
  const [showEvoModal, setShowEvoModal] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [editingName, setEditingName] = useState(!pokemon.name);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const update = (changes: Partial<PokemonSlotType>) => updatePokemon(playerId, slot, changes);
  const addDamage = (amt: number) =>
    update({ currentDamage: Math.max(0, pokemon.currentDamage + amt) });

  const currentHP = Math.max(0, pokemon.maxHP - pokemon.currentDamage);
  const isKO = pokemon.currentDamage >= pokemon.maxHP && pokemon.maxHP > 0;
  const hpPct = pokemon.maxHP > 0 ? Math.max(0, (currentHP / pokemon.maxHP) * 100) : 100;
  const hpColor = hpPct > 50 ? '#22c55e' : hpPct > 25 ? '#f59e0b' : '#ef4444';
  const slotLabel = slot === 'active' ? 'Active' : `Bench ${(slot as number) + 1}`;
  const playerLabel = playerId === 'player1' ? 'P1' : 'P2';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        className="relative bg-gray-900 rounded-t-3xl max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800">
          <div className="flex-1 min-w-0">
            {editingName ? (
              <PokemonNameInput
                autoFocus
                value={pokemon.name}
                onChange={name => update({ name })}
                onSelectSuggestion={hp => { if (hp) update({ maxHP: hp, currentDamage: 0 }); }}
                onCommit={() => { if (pokemon.name.trim()) setEditingName(false); }}
                placeholder="Enter Pokémon name…"
                className="bg-gray-800 text-white text-lg font-bold outline-none rounded-xl px-3 py-2 w-full"
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="text-left w-full">
                <div className="text-white font-bold text-lg leading-tight truncate">{pokemon.name}</div>
                <div className="text-gray-500 text-xs mt-0.5">{playerLabel} · {slotLabel} — tap to rename</div>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 flex-shrink-0 flex items-center gap-1.5 rounded-xl bg-gray-800 hover:bg-rose-500 text-gray-300 hover:text-white text-xs font-black border border-gray-700 hover:border-rose-400 shadow-md transition-all active:scale-95 group"
            title="ปิดหน้าต่าง (ESC)"
          >
            <span className="text-sm font-black group-hover:rotate-90 transition-transform">✕</span>
            <span>ปิด</span>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">

          {/* HP */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">HP & วิวัฒนาการ</span>
              <div className="flex items-center gap-2">
                {pokemon.imageUrl && (
                  <button
                    onClick={() => setShowZoom(true)}
                    className="text-xs text-blue-300 bg-blue-950/80 border border-blue-700/80 rounded-xl px-2.5 py-1.5 hover:bg-blue-900 active:scale-95 flex items-center gap-1 font-bold shadow-sm"
                    title="ขยายภาพการ์ด"
                  >
                    <span>🔍</span> ขยายภาพ
                  </button>
                )}
                <button
                  onClick={() => setShowEvoModal(true)}
                  className="text-xs text-purple-300 bg-purple-950/80 border border-purple-700/80 rounded-xl px-2.5 py-1.5 hover:bg-purple-900 active:scale-95 flex items-center gap-1 font-bold shadow-sm"
                >
                  <span>🧬</span> พัฒนาร่าง
                </button>
                <button
                  onClick={() => setShowHPPicker(true)}
                  className="text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1.5 hover:text-white hover:border-gray-500 active:bg-gray-750"
                >
                  Max {pokemon.maxHP} ✎
                </button>
              </div>
            </div>
            <div className="h-4 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${hpPct}%`, background: hpColor }}
              />
            </div>
            <div className="flex justify-between items-baseline">
              <span className={`font-black text-2xl ${isKO ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                {isKO ? 'KO!' : `${currentHP} HP`}
              </span>
              <span className="text-gray-600 font-mono text-sm">{pokemon.currentDamage} dmg taken</span>
            </div>
          </div>

          {/* Damage counter */}
          {pokemon.name && (
            <div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Damage</div>
              {/* Primary ±10 */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  onClick={() => addDamage(-10)}
                  className="py-5 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-300 text-2xl font-black active:scale-95 transition-transform"
                >−10</button>
                <button
                  onClick={() => addDamage(10)}
                  className="py-5 rounded-2xl bg-green-950/60 border border-green-800/50 text-green-300 text-2xl font-black active:scale-95 transition-transform"
                >+10</button>
              </div>
              {/* Quick adds */}
              <div className="grid grid-cols-6 gap-2">
                {[-90, -60, -30, 30, 60, 90].map(amt => (
                  <button
                    key={amt}
                    onClick={() => addDamage(amt)}
                    className={`py-3 rounded-xl border text-xs font-bold active:scale-95 transition-transform ${
                      amt < 0
                        ? 'bg-gray-800/80 border-red-900/50 text-red-400'
                        : 'bg-gray-800/80 border-green-900/50 text-green-400'
                    }`}
                  >{amt > 0 ? `+${amt}` : amt}</button>
                ))}
              </div>
            </div>
          )}

          {/* Status */}
          {pokemon.name && (
            <div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Status Condition</div>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_ORDER.map(cond => {
                  const si = STATUS_INFO[cond];
                  const active = pokemon.status === cond;
                  return (
                    <button
                      key={cond}
                      onClick={() => update({ status: cond })}
                      className={`py-4 rounded-2xl border flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                        active
                          ? `${si.bgColor} ${si.borderColor} ${si.color} shadow-lg`
                          : 'bg-gray-800/60 border-gray-700 text-gray-500'
                      }`}
                    >
                      <span className="text-2xl leading-none">{si.emoji}</span>
                      <span className="text-[11px] font-bold">{si.label}</span>
                    </button>
                  );
                })}
              </div>
              {pokemon.status !== 'none' && (
                <p className="text-[11px] text-gray-500 mt-2 px-1">{STATUS_INFO[pokemon.status].rule}</p>
              )}
            </div>
          )}

          {/* Energy */}
          {pokemon.name && (
            <div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Energy</div>
              <EnergyTracker
                energies={pokemon.energies}
                onUpdate={(type: EnergyType, count: number) => setEnergyCount(playerId, slot, type, count)}
                compact
              />
            </div>
          )}

          {/* Ability / Attack */}
          {pokemon.name && (
            <div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Actions</div>
              <AbilityTracker
                abilityUsed={pokemon.abilityUsed}
                attackUsed={pokemon.attackUsed}
                onToggleAbility={() => update({ abilityUsed: !pokemon.abilityUsed })}
                onToggleAttack={() => update({ attackUsed: !pokemon.attackUsed })}
              />
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-col gap-2.5">
            {pokemon.name && (
              <button
                type="button"
                onClick={() => { clearPokemon(playerId, slot); onClose(); }}
                className="w-full py-3 rounded-2xl border border-red-900/60 bg-red-950/40 text-red-400 text-sm font-semibold active:scale-95 transition-transform"
              >
                Remove Pokémon
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 active:scale-95 text-gray-200 text-sm font-black border border-gray-700 shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <span>✕</span>
              <span>ปิดหน้าต่าง</span>
            </button>
          </div>

          {/* Safe area bottom pad */}
          <div className="h-4" />
        </div>
      </motion.div>

      {showHPPicker && (
        <HPPresetPicker
          currentMaxHP={pokemon.maxHP}
          onSelect={(hp, card) => {
            update({
              maxHP: hp,
              currentDamage: 0,
              ...(card?.name ? { name: card.name } : {}),
              ...(card?.imageUrl !== undefined ? { imageUrl: card.imageUrl } : {}),
              ...(card?.types !== undefined ? { types: card.types } : {}),
            });
            setShowHPPicker(false);
          }}
          onClose={() => setShowHPPicker(false)}
        />
      )}

      {showEvoModal && (
        <EvolutionModal
          pokemon={pokemon}
          onSelectEvolution={card => {
            update({
              name: card.name,
              maxHP: card.hp,
              imageUrl: card.imageUrl,
              types: card.types,
              status: 'none',
              abilityUsed: false,
              attackUsed: false,
            });
            setShowEvoModal(false);
          }}
          onClose={() => setShowEvoModal(false)}
        />
      )}

      {showZoom && pokemon.imageUrl && (
        <CardImagePreviewModal
          imageUrl={pokemon.imageUrl}
          cardName={pokemon.name}
          onClose={() => setShowZoom(false)}
        />
      )}
    </div>
  );
}
