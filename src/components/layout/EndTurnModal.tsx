import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PlayerId, PokemonSlot } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { STATUS_INFO } from '../../constants/statusConditions';

interface AffectedPokemon {
  pokemon: PokemonSlot;
  slot: 'active' | number;
}

interface Props {
  currentPlayer: PlayerId;
  onClose: () => void;
}

function getAffected(pokemon: PokemonSlot, slot: AffectedPokemon['slot']): AffectedPokemon | null {
  if (['poisoned', 'burned', 'asleep', 'paralyzed'].includes(pokemon.status)) {
    return { pokemon, slot };
  }
  return null;
}

export function EndTurnModal({ currentPlayer, onClose }: Props) {
  const state = useGameStore();
  const player = state[currentPlayer];
  const { updatePokemon, endTurn } = useGameStore();

  const affected: AffectedPokemon[] = [
    getAffected(player.activePokemon, 'active'),
    ...player.bench.map((p, i) => getAffected(p, i)),
  ].filter(Boolean) as AffectedPokemon[];

  const [coinFlipResult, setCoinFlipResult] = useState<Record<string, 'heads' | 'tails' | null>>({});
  const [flipping, setFlipping] = useState<Record<string, boolean>>({});

  const flipCoin = (id: string) => {
    setFlipping(f => ({ ...f, [id]: true }));
    setTimeout(() => {
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      setCoinFlipResult(r => ({ ...r, [id]: result }));
      setFlipping(f => ({ ...f, [id]: false }));
    }, 800);
  };

  const applyDamage = (af: AffectedPokemon, amount: number) => {
    const newDamage = Math.min(af.pokemon.maxHP, af.pokemon.currentDamage + amount);
    updatePokemon(currentPlayer, af.slot === 'active' ? 'active' : af.slot as 0|1|2|3|4, {
      currentDamage: newDamage,
    });
  };

  const applyCure = (af: AffectedPokemon) => {
    updatePokemon(currentPlayer, af.slot === 'active' ? 'active' : af.slot as 0|1|2|3|4, {
      status: 'none',
    });
  };

  const handleConfirm = () => {
    endTurn();
    onClose();
  };

  const playerName = player.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm mx-4 max-h-[85vh] overflow-y-auto shadow-2xl"
      >
        <h2 className="text-lg font-black text-white mb-1">End of {playerName}'s Turn</h2>
        <p className="text-xs text-gray-500 mb-4">Resolve between-turn effects before passing.</p>

        {affected.length === 0 ? (
          <div className="text-center py-4 text-gray-500 text-sm">No status effects to resolve.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {affected.map(af => {
              const info = STATUS_INFO[af.pokemon.status];
              const coinKey = af.pokemon.id;

              return (
                <div key={af.pokemon.id} className={`p-3 rounded-xl border ${info.bgColor} ${info.borderColor}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{info.emoji}</span>
                    <div>
                      <div className="font-bold text-sm text-white">
                        {af.pokemon.name || (af.slot === 'active' ? 'Active' : `Bench ${Number(af.slot) + 1}`)}
                      </div>
                      <div className={`text-xs ${info.color}`}>{info.label}</div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-300 mb-2">{info.rule}</p>

                  {/* Poison — apply 10 damage */}
                  {af.pokemon.status === 'poisoned' && (
                    <button
                      onClick={() => applyDamage(af, 10)}
                      className="w-full py-1.5 bg-purple-800/60 hover:bg-purple-700/60 border border-purple-600 rounded-lg text-xs font-bold text-purple-200"
                    >
                      Apply 10 Damage
                    </button>
                  )}

                  {/* Burn — apply 20 damage + flip to cure */}
                  {af.pokemon.status === 'burned' && (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => applyDamage(af, 20)}
                        className="w-full py-1.5 bg-orange-800/60 hover:bg-orange-700/60 border border-orange-600 rounded-lg text-xs font-bold text-orange-200"
                      >
                        Apply 20 Damage
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => flipCoin(coinKey)}
                          disabled={flipping[coinKey]}
                          className="flex-1 py-1.5 bg-gray-700 hover:bg-gray-600 border border-gray-500 rounded-lg text-xs font-bold text-gray-200 disabled:opacity-50"
                        >
                          {flipping[coinKey] ? '🪙...' : '🪙 Flip to cure'}
                        </button>
                        {coinFlipResult[coinKey] && (
                          <div className="flex gap-1">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${coinFlipResult[coinKey] === 'heads' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                              {coinFlipResult[coinKey] === 'heads' ? '✓ HEADS — cured!' : '✕ TAILS'}
                            </span>
                            {coinFlipResult[coinKey] === 'heads' && (
                              <button onClick={() => applyCure(af)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded font-bold">
                                Remove
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sleep — flip to wake */}
                  {af.pokemon.status === 'asleep' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => flipCoin(coinKey)}
                        disabled={flipping[coinKey]}
                        className="flex-1 py-1.5 bg-blue-800/60 hover:bg-blue-700/60 border border-blue-600 rounded-lg text-xs font-bold text-blue-200 disabled:opacity-50"
                      >
                        {flipping[coinKey] ? '🪙...' : '🪙 Flip to wake'}
                      </button>
                      {coinFlipResult[coinKey] && (
                        <div className="flex gap-1 items-center">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${coinFlipResult[coinKey] === 'heads' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                            {coinFlipResult[coinKey] === 'heads' ? '✓ HEADS — woke up!' : '✕ TAILS — still asleep'}
                          </span>
                          {coinFlipResult[coinKey] === 'heads' && (
                            <button onClick={() => applyCure(af)} className="text-xs bg-green-700 hover:bg-green-600 text-white px-2 py-1 rounded font-bold">
                              Wake
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Paralysis — auto removed at end of this player's turn */}
                  {af.pokemon.status === 'paralyzed' && (
                    <div className="text-xs text-yellow-300 bg-yellow-900/30 border border-yellow-700 rounded-lg px-2 py-1.5">
                      ⚡ Paralysis auto-removed when End Turn is confirmed.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-bold"
          >
            Back
          </button>
          <button
            onClick={handleConfirm}
            className="flex-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black"
          >
            End Turn →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
