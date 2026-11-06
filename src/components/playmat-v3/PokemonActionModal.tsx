import React, { useState } from 'react';
import type { TabletopPokemonSlot } from './types';
import type { SpecialCondition, CardInstance } from '../../engine/types';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import {
  translateStage,
  getCardDisplayName,
} from '../../utils/pokemonThaiTranslator';

interface PokemonActionModalProps {
  slot: TabletopPokemonSlot;
  position: 'ACTIVE' | number;
  benchSlots: (TabletopPokemonSlot | null)[];
  hasActive: boolean;
  onClose: () => void;
  onAdjustDamage: (delta: number) => void;
  onSetDamage: (total: number) => void;
  onToggleStatus: (condition: SpecialCondition) => void;
  onSwitchWithBench: (benchIndex: number) => void;
  onRetractToHand: () => void;
  onDevolve: () => void;
  onKnockOut: (toLostZone?: boolean) => void;
  onMoveEnergy: (energyId: string, dest: 'ACTIVE' | number | 'HAND' | 'DISCARD') => void;
  onToggleFacedown?: () => void;
  onToggleAbility?: () => void;
  onRetreatActive?: (benchIndex: number, discardEnergyIds: string[]) => void;
  onZoomCard?: () => void;
  onDeclareAttack?: (attackName: string, damage?: number) => void;
  handEnergies?: CardInstance[];
  onAttachEnergyFromHand?: (cardId: string) => void;
  onPreviewCard?: (card: CardInstance) => void;
  onAttachToolFromHand?: (cardId: string) => void;
  onDetachTool?: (dest: 'HAND' | 'DISCARD') => void;
  handTools?: CardInstance[];
  damageMemory?: Record<string, number>;
  onUpdateDamageMemory?: (key: string, val: number) => void;
  isOpponent?: boolean;
  onShuffleToDeck?: () => void;
}

export const PokemonActionModal: React.FC<PokemonActionModalProps> = ({
  slot,
  position,
  benchSlots,
  hasActive,
  onClose,
  onAdjustDamage,
  onSetDamage,
  onToggleStatus,
  onSwitchWithBench,
  onRetractToHand,
  onDevolve,
  onKnockOut,
  onMoveEnergy,
  onToggleFacedown,
  onToggleAbility,
  onRetreatActive,
  onZoomCard,
  onDeclareAttack,
  handEnergies,
  onAttachEnergyFromHand,
  onPreviewCard,
  onAttachToolFromHand,
  onDetachTool,
  handTools,
  damageMemory,
  onUpdateDamageMemory,
  isOpponent,
  onShuffleToDeck,
}) => {
  const [customDamage, setCustomDamage] = useState<string>(() => {
    const memKey = `${slot.id}_customDamage`;
    if (damageMemory && damageMemory[memKey] !== undefined) {
      return String(damageMemory[memKey]);
    }
    return String(slot.damage);
  });
  const [selectedEnergyId, setSelectedEnergyId] = useState<string | null>(null);
  const [discardForRetreatIds, setDiscardForRetreatIds] = useState<string[]>([]);

  const [customAttackName, setCustomAttackName] = useState('');
  const [customAttackDmg, setCustomAttackDmg] = useState<number>(() => {
    const memKey = `${slot.id}_customAttackDmg`;
    return (damageMemory && damageMemory[memKey] !== undefined) ? damageMemory[memKey] : 30;
  });

  const isFacedown = Boolean(slot.isFacedown || slot.card.isFacedown);
  const cardName = getCardDisplayName(slot.card);
  const imageUrl = resolveCardImageUrl(slot.card);
  const maxHp = slot.card.hp || 100;
  const isBench = typeof position === 'number';

  const handleApplyCustomDamage = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customDamage, 10);
    if (!isNaN(val) && val >= 0) {
      Sound.playCardPlacement();
      onSetDamage(val);
      onUpdateDamageMemory?.(`${slot.id}_customDamage`, val);
    }
  };

  return (
    <div
      id="pokemon-action-modal"
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
      style={{ touchAction: 'auto' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900/95 border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl text-white flex flex-col max-h-[88dvh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed & Sticky Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-3 sm:p-4 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              id="btn-zoom-pokemon-card"
              onClick={() => {
                Sound.playCardFlip();
                onZoomCard?.();
              }}
              className="relative cursor-pointer group rounded-xl overflow-hidden flex-shrink-0"
              title="คลิกเพื่อดูการ์ดขนาดใหญ่ (อ่าน Text ชัดๆ)"
            >
              <img
                src={imageUrl}
                alt={cardName}
                className="w-11 h-15 sm:w-13 sm:h-18 object-cover rounded-xl border border-white/20 shadow group-hover:scale-105 transition-transform"
                onError={(e) => handleCardImageError(e, slot.card)}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-[9px] bg-black/85 px-1 py-0.5 rounded-full text-white font-bold">🔍</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 whitespace-nowrap">
                  {isBench ? `เบนช์ #${position + 1}` : 'ตำแหน่งต่อสู้ (Active)'}
                </span>
                <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 whitespace-nowrap">
                  {translateStage(slot.stage)}
                </span>
                {isFacedown && (
                  <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-amber-300 whitespace-nowrap">
                    🎴 คว่ำหน้า
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-black text-white mt-0.5 truncate">{cardName}</h2>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400">
                <span>
                  HP: <span className="font-bold text-emerald-400">{Math.max(0, maxHp - slot.damage)}</span> / {maxHp}
                </span>
                {onZoomCard && (
                  <button
                    id="btn-zoom-pokemon-card-action"
                    type="button"
                    onClick={() => {
                      Sound.playCardFlip();
                      onZoomCard();
                    }}
                    className="flex items-center gap-0.5 text-[10px] sm:text-[11px] font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                    title="คลิกเพื่อดูการ์ดขนาดใหญ่ (อ่าน Text ชัดๆ)"
                  >
                    <span>🔍</span>
                    <span>ดูใหญ่</span>
                  </button>
                )}
              </div>
            </div>
          </div>
          <button
            id="btn-close-pokemon-modal"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Action Body */}
        <div
          id="pokemon-action-modal-scroll-body"
          className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 flex flex-col gap-3.5 pb-[max(env(safe-area-inset-bottom),1rem)]"
          style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
        >

        {/* Facedown Flip Banner */}
        {isFacedown ? (
          <div className="p-3 bg-amber-950/70 border border-amber-500/50 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎴</span>
              <div>
                <p className="text-xs font-black text-amber-300">การ์ดใบนี้กำลังคว่ำหน้าอยู่ (Facedown)</p>
                <p className="text-[10px] text-amber-200/70">กดปุ่มเพื่อหงายการ์ดขึ้นสู่สนามอย่างเป็นทางการ</p>
              </div>
            </div>
            {onToggleFacedown && (
              <button
                id="btn-flip-face-up"
                onClick={() => {
                  Sound.playCardFlip();
                  onToggleFacedown();
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>🔄</span> พลิกหงายหน้า
              </button>
            )}
          </div>
        ) : (
          onToggleFacedown && (
            <div className="flex justify-end">
              <button
                id="btn-flip-face-down"
                onClick={() => {
                  Sound.playCardFlip();
                  onToggleFacedown();
                  onClose();
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold border border-white/10 flex items-center gap-1 active:scale-95 transition"
              >
                <span>🎴</span> พลิกคว่ำหน้า (Turn Face-Down)
              </button>
            </div>
          )
        )}

        {/* Ability Section */}
        {!isFacedown && onToggleAbility && (
          <div className="p-3 bg-gradient-to-r from-amber-950/70 to-slate-900 border border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚡</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-300">ความสามารถ (Ability)</span>
                  {slot.abilityUsed && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-900/80 text-amber-200 border border-amber-400/40">
                      ใช้แล้วในรอบนี้
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ประกาศใช้ความสามารถตามที่ระบุบนหน้าการ์ดจริงในเทิร์นนี้
                </p>
              </div>
            </div>

            <button
              id="btn-use-ability"
              type="button"
              onClick={() => {
                Sound.playCardFlip();
                onToggleAbility();
              }}
              className={`px-3 py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                slot.abilityUsed
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/20'
                  : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950'
              }`}
            >
              <span>{slot.abilityUsed ? '↩️' : '⚡'}</span>
              <span>{slot.abilityUsed ? 'ใช้แล้ว (คลิกเพื่อรีเซ็ต)' : 'ประกาศใช้ความสามารถ'}</span>
            </button>
          </div>
        )}

        {/* Attacks Section & Attack Announcement */}
        {!isFacedown && onDeclareAttack && (
          <div className="p-3 bg-slate-950/70 border border-white/10 rounded-2xl flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>⚔️</span> ประกาศท่าโจมตี (Attack Announcement)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                💡 ระบุชื่อท่าและดาเมจตามการ์ดจริงเพื่อประกาศโจมตี
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-400/30 flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  id="input-custom-attack-name"
                  placeholder="ระบุชื่อท่าโจมตี (เช่น กงล้อเพลิง)..."
                  value={customAttackName}
                  onChange={(e) => setCustomAttackName(e.target.value)}
                  className="flex-1 bg-slate-950 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-amber-400"
                />
                <div className="flex items-center bg-slate-950 border border-white/20 rounded-lg px-2.5 py-1.5">
                  <span className="text-[10px] text-slate-400 mr-1 font-mono">DMG:</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    id="input-custom-attack-damage"
                    value={customAttackDmg}
                    onChange={(e) =>
                      setCustomAttackDmg(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-16 bg-transparent text-amber-300 font-mono font-black text-xs text-right outline-none"
                  />
                </div>
                <button
                  type="button"
                  id="btn-declare-attack"
                  onClick={() => {
                    const name = customAttackName.trim() || 'ท่าโจมตี';
                    Sound.playAttack();
                    onDeclareAttack(name, customAttackDmg);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 hover:shadow-red-500/30"
                  title="คลิกเพื่อประกาศใช้ท่าโจมตีนี้"
                >
                  <span>⚔️</span>
                  <span>ประกาศใช้ท่านี้</span>
                </button>
              </div>

              {/* Quick +/- Delta adjustments (10, 50, 100) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[10px] text-slate-400 shrink-0">ปรับดาเมจ:</span>
                {[-100, -50, -10, 10, 50, 100].map((delta) => (
                  <button
                    key={delta}
                    type="button"
                    id={`btn-attack-delta-${delta > 0 ? `plus-${delta}` : `minus-${Math.abs(delta)}`}`}
                    onClick={() => setCustomAttackDmg((prev) => Math.max(0, prev + delta))}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition active:scale-95 cursor-pointer ${
                      delta > 0
                        ? 'bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300'
                        : 'bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300'
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </button>
                ))}
              </div>

              {/* Quick damage preset chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pt-0.5">
                <span className="text-[10px] text-slate-400 shrink-0">ลัดดาเมจ:</span>
                {[0, 30, 50, 80, 100, 120, 160, 200, 240, 280, 330].map((dmg) => (
                  <button
                    key={dmg}
                    type="button"
                    onClick={() => setCustomAttackDmg(dmg)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer shrink-0 ${
                      customAttackDmg === dmg
                        ? 'bg-amber-400 text-slate-950 font-black scale-105'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {dmg}
                  </button>
                ))}
              </div>

              {/* Aliases for test backwards-compatibility */}
              <button
                type="button"
                id="btn-declare-custom-attack"
                onClick={() => {
                  const name = customAttackName.trim() || 'ท่าโจมตี';
                  Sound.playAttack();
                  onDeclareAttack(name, customAttackDmg);
                  onClose();
                }}
                className="hidden"
                aria-hidden="true"
              />
              <button
                type="button"
                id="btn-toggle-custom-attack"
                className="hidden"
                aria-hidden="true"
              />
            </div>
          </div>
        )}
        <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>🎯</span> ปรับแต่งแดเมจ (Damage Counters)
            </span>
            <span
              id="current-damage-value"
              className="text-sm font-black text-red-400 bg-red-950/60 border border-red-500/30 px-2 py-0.5 rounded-lg"
            >
              {slot.damage} Damage
            </span>
          </div>

          {/* Quick Delta Buttons */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {[
              { label: '+10', delta: 10, color: 'bg-red-600 hover:bg-red-500', id: 'btn-dmg-plus-10' },
              { label: '+50', delta: 50, color: 'bg-red-600 hover:bg-red-500', id: 'btn-dmg-plus-50' },
              { label: '+100', delta: 100, color: 'bg-rose-700 hover:bg-rose-600', id: 'btn-dmg-plus-100' },
              { label: '-10', delta: -10, color: 'bg-slate-800 hover:bg-slate-700', id: 'btn-dmg-minus-10' },
              { label: '-50', delta: -50, color: 'bg-slate-800 hover:bg-slate-700', id: 'btn-dmg-minus-50' },
              { label: 'Heal', delta: -slot.damage, color: 'bg-emerald-600 hover:bg-emerald-500', id: 'btn-dmg-heal' },
            ].map((btn) => (
              <button
                key={btn.label}
                id={btn.id}
                onClick={() => {
                  Sound.playCardPlacement();
                  onAdjustDamage(btn.delta);
                }}
                className={`py-2 rounded-xl text-xs font-black shadow-md active:scale-95 transition-all ${btn.color}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Custom Damage Form */}
          <form onSubmit={handleApplyCustomDamage} className="flex gap-2 mt-1">
            <input
              id="input-custom-damage"
              type="number"
              min="0"
              step="10"
              value={customDamage}
              onChange={(e) => setCustomDamage(e.target.value)}
              placeholder="ระบุตัวเลขแดเมจ..."
              className="flex-1 bg-slate-900 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <button
              id="btn-submit-custom-damage"
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold active:scale-95 transition-all cursor-pointer"
            >
              ตั้งค่า
            </button>
          </form>
        </div>

        {/* Special Conditions */}
        <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 flex flex-col gap-2">
          <span className="text-xs font-bold text-slate-300">⚡ สภาพผิดปกติ (Status Conditions)</span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'POISON' as SpecialCondition, label: '🟣 พิษ (Poison)' },
              { id: 'BURN' as SpecialCondition, label: '🔥 ไหม้ (Burn)' },
              { id: 'ASLEEP' as SpecialCondition, label: '💤 หลับ (Asleep)' },
              { id: 'PARALYZED' as SpecialCondition, label: '⚡ ชา (Paralyzed)' },
              { id: 'CONFUSED' as SpecialCondition, label: '🌀 สับสน (Confused)' },
            ].map((cond) => {
              const active = slot.specialConditions.includes(cond.id);
              return (
                <button
                  key={cond.id}
                  onClick={() => {
                    Sound.playCardPlacement();
                    onToggleStatus(cond.id);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                      : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {cond.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Attach Energy from Hand */}
        {handEnergies && handEnergies.length > 0 && onAttachEnergyFromHand && (
          <div className="bg-slate-950/60 border border-indigo-500/30 rounded-2xl p-3 flex flex-col gap-2">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <span>⚡</span> แนบพลังงานจากการ์ดบนมือ (Attach from Hand)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {handEnergies.map((energyCard) => (
                <button
                  key={energyCard.instanceId}
                  id={`btn-modal-attach-energy-${energyCard.instanceId}`}
                  onClick={() => {
                    Sound.playCardPlacement();
                    onAttachEnergyFromHand(energyCard.instanceId);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 text-xs font-bold active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                  title={`คลิกเพื่อติด ${getCardDisplayName(energyCard)} ให้กับโปเกมอนตัวนี้`}
                >
                  <span>⚡</span>
                  <span>{getCardDisplayName(energyCard)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Attached Energies Management */}
        {slot.attachedEnergies.length > 0 && (
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>🔋</span> พลังงานที่แนบอยู่ ({slot.attachedEnergies.length} ใบ)
              </span>
              <span className="text-[10px] text-slate-400">
                แตะเพื่อเลือกจัดการ / กด 🔍 เพื่อดูรูปการ์ด
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slot.attachedEnergies.map((energy, eIdx) => {
                const isSelected = selectedEnergyId === energy.instanceId;
                const energyImg = resolveCardImageUrl(energy);
                return (
                  <div
                    key={energy.instanceId || eIdx}
                    className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/30'
                        : 'bg-slate-900 border-white/15 text-slate-300 hover:border-white/40'
                    }`}
                    onClick={() =>
                      setSelectedEnergyId(isSelected ? null : energy.instanceId)
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-11 rounded bg-slate-800 overflow-hidden shrink-0 border border-white/15 shadow-sm">
                        <img
                          src={energyImg}
                          alt={getCardDisplayName(energy)}
                          className="w-full h-full object-cover"
                          onError={(e) => handleCardImageError(e, energy)}
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-white text-xs truncate">
                          {getCardDisplayName(energy)}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {energy.nameEn || 'Energy Card'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {onPreviewCard && (
                        <button
                          type="button"
                          id={`btn-preview-energy-${eIdx}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            Sound.playCardFlip();
                            onPreviewCard(energy);
                          }}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-white/10 flex items-center gap-0.5 transition"
                          title="ดูรูปการ์ดพลังงานขยายใหญ่ (Zoom)"
                        >
                          <span>🔍</span>
                          <span className="hidden xs:inline">ดูการ์ด</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Energy Action Submenu when one is selected */}
            {selectedEnergyId && (
              <div className="mt-2 p-2 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-wrap gap-1.5 animate-in fade-in duration-100">
                <button
                  onClick={() => {
                    Sound.playCardPlacement();
                    onMoveEnergy(selectedEnergyId, 'HAND');
                    setSelectedEnergyId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium"
                >
                  ย้ายขึ้นมือ
                </button>
                <button
                  onClick={() => {
                    Sound.playCardPlacement();
                    onMoveEnergy(selectedEnergyId, 'DISCARD');
                    setSelectedEnergyId(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 text-xs font-medium"
                >
                  ทิ้งสุสาน
                </button>
                {isBench && hasActive && (
                  <button
                    onClick={() => {
                      Sound.playCardPlacement();
                      onMoveEnergy(selectedEnergyId, 'ACTIVE');
                      setSelectedEnergyId(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 text-xs font-medium"
                  >
                    ย้ายไป Active
                  </button>
                )}
                {benchSlots.map((b, bIdx) => {
                  if (!b || (isBench && bIdx === position)) return null;
                  return (
                    <button
                      key={bIdx}
                      onClick={() => {
                        Sound.playCardPlacement();
                        onMoveEnergy(selectedEnergyId, bIdx);
                        setSelectedEnergyId(null);
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                    >
                      ย้ายไป Bench #{bIdx + 1}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Attached Tool Management */}
        <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <span>🛠️</span> ไอเท็มติดโปเกมอน (Pokémon Tool)
            </span>
            {slot.attachedTool && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 font-bold">
                ติดตั้งแล้ว 1 ชิ้น
              </span>
            )}
          </div>

          {slot.attachedTool ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-purple-400/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-12 rounded bg-slate-800 overflow-hidden shrink-0 border border-white/15 shadow-sm">
                  <img
                    src={resolveCardImageUrl(slot.attachedTool)}
                    alt={getCardDisplayName(slot.attachedTool)}
                    className="w-full h-full object-cover"
                    onError={(e) => handleCardImageError(e, slot.attachedTool)}
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-white truncate">
                    {getCardDisplayName(slot.attachedTool)}
                  </span>
                  <span className="text-[10px] text-purple-300 truncate">
                    {slot.attachedTool.nameEn || 'Tool Card'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onPreviewCard && (
                  <button
                    type="button"
                    onClick={() => {
                      Sound.playCardFlip();
                      onPreviewCard(slot.attachedTool!);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-bold border border-white/10 transition flex items-center gap-1"
                    title="ดูรูปการ์ด Tool ขยายใหญ่"
                  >
                    <span>🔍</span>
                    <span>ดูการ์ด</span>
                  </button>
                )}
                {onDetachTool && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        Sound.playCardPlacement();
                        onDetachTool('HAND');
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium transition"
                      title="ย้าย Tool กลับขึ้นมือ"
                    >
                      ขึ้นมือ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        Sound.playCardPlacement();
                        onDetachTool('DISCARD');
                      }}
                      className="px-2 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-xs font-medium transition"
                      title="ทิ้ง Tool ลงสุสาน"
                    >
                      ทิ้งสุสาน
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-400 italic">
                ยังไม่ได้ติดไอเท็ม (โปเกมอน 1 ตัว สามารถติดไอเท็มได้ 1 ชิ้น)
              </span>
              {/* Attach Tool from Hand if available */}
              {handTools && handTools.length > 0 && onAttachToolFromHand && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
                  <span className="text-[11px] font-bold text-purple-300">
                    ติด Tool จากการ์ดบนมือ:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {handTools.map((tool) => (
                      <button
                        key={tool.instanceId}
                        type="button"
                        onClick={() => {
                          Sound.playCardPlacement();
                          onAttachToolFromHand(tool.instanceId);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-200 text-xs font-bold transition active:scale-95 cursor-pointer"
                      >
                        <span>🛠️</span>
                        <span>{getCardDisplayName(tool)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Retreat & Switch Section for Active Pokémon */}
        {!isBench && (
          <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span>🏃</span> การหนีสู่เบนช์ (Retreat & Switch)
              </span>
              <span className="text-[10px] text-slate-400">
                {slot.attachedEnergies.length > 0
                  ? `เลือกทิ้ง Energy ที่แนบอยู่ (${slot.attachedEnergies.length} ใบ)`
                  : 'หนีฟรี (ไม่มี Energy แนบ)'}
              </span>
            </div>

            {/* If has attached energies: show quick select checkboxes */}
            {slot.attachedEnergies.length > 0 && (
              <div className="p-2 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col gap-1.5 text-xs">
                <span className="text-[11px] font-semibold text-slate-300">
                  ติ๊กเลือก Energy ที่ต้องการทิ้งเป็นค่าหนี (Discard Energy):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {slot.attachedEnergies.map((energy, idx) => {
                    const isSelected = discardForRetreatIds.includes(energy.instanceId);
                    return (
                      <button
                        key={energy.instanceId || idx}
                        id={`btn-retreat-discard-energy-${idx}`}
                        type="button"
                        onClick={() => {
                          setDiscardForRetreatIds((prev) =>
                            prev.includes(energy.instanceId)
                              ? prev.filter((id) => id !== energy.instanceId)
                              : [...prev, energy.instanceId]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                          isSelected
                            ? 'bg-red-900/80 border-red-500 text-red-100 shadow-md ring-1 ring-red-400'
                            : 'bg-slate-800 border-white/10 text-slate-300 hover:border-white/30'
                        }`}
                      >
                        <span>{isSelected ? '✓' : '⚡'}</span>
                        <span>{getCardDisplayName(energy) || `Energy #${idx + 1}`}</span>
                        {isSelected && <span className="text-[9px] text-red-300">(ทิ้ง)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bench Target Selection */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-400 font-semibold">
                เลือกโปเกมอนบนเบนช์ที่จะขึ้นมาแทน:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-1.5">
                {benchSlots.map((b, bIdx) => {
                  if (!b) return null;
                  const bName = getCardDisplayName(b.card) || `Bench #${bIdx + 1}`;
                  return (
                    <button
                      key={bIdx}
                      id={`btn-retreat-to-bench-${bIdx}`}
                      type="button"
                      onClick={() => {
                        Sound.playCardPlacement();
                        if (onRetreatActive) {
                          onRetreatActive(bIdx, discardForRetreatIds);
                        } else {
                          discardForRetreatIds.forEach((eid) => onMoveEnergy(eid, 'DISCARD'));
                          onSwitchWithBench(bIdx);
                        }
                        onClose();
                      }}
                      className="py-2 px-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow active:scale-95 transition-all flex flex-col items-center justify-center gap-0.5 truncate cursor-pointer"
                    >
                      <span className="text-[10px] text-emerald-200">Bench #{bIdx + 1}</span>
                      <span className="truncate w-full text-center font-black">{bName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Position & Table Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {isBench && (
            <button
              id="btn-switch-to-active"
              onClick={() => {
                Sound.playCardPlacement();
                onSwitchWithBench(position);
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>🔄</span> {isOpponent ? "ขอสลับขึ้น Active (คำสั่งของบอส)" : "ย้ายขึ้น Active"}
            </button>
          )}

          {/* Devolve if has history */}
          {slot.evolutionHistory.length > 0 && (
            <button
              onClick={() => {
                Sound.playCardFlip();
                onDevolve();
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-700/60 hover:bg-amber-600/80 text-amber-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
            >
              <span>↩️</span> คืนร่าง (Devolve)
            </button>
          )}

          {/* Scoop Up */}
          <button
            id="btn-scoop-pokemon-to-hand"
            onClick={() => {
              Sound.playCardPlacement();
              onRetractToHand();
              onClose();
            }}
            className="py-2.5 px-3 rounded-xl bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>🖐️</span> เก็บขึ้นมือ (Scoop)
          </button>

          {/* Shuffle to Deck */}
          {onShuffleToDeck && (
            <button
              id="btn-shuffle-pokemon-to-deck"
              type="button"
              onClick={() => {
                Sound.playShuffle();
                onShuffleToDeck();
                onClose();
              }}
              className="py-2.5 px-3 rounded-xl bg-teal-900/70 hover:bg-teal-800 text-teal-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="นำโปเกมอนตัวนี้ ร่างวิวัฒนาการ พลังงาน และไอเท็มทั้งหมดกลับเข้าเด็ค แล้วสับกองการ์ดทั้งกอง"
            >
              <span>🔀</span> สับเข้ากอง (Shuffle)
            </button>
          )}

          {/* Knock Out */}
          <button
            onClick={() => {
              Sound.playCardPlacement();
              onKnockOut(false);
              onClose();
            }}
            className="py-2.5 px-3 rounded-xl bg-red-900/60 hover:bg-red-800/80 text-red-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            <span>💀</span> สลบ (ทิ้งสุสาน)
          </button>

          <button
            onClick={() => {
              Sound.playCardPlacement();
              onKnockOut(true);
              onClose();
            }}
            className="py-2.5 px-3 rounded-xl bg-purple-950 hover:bg-purple-900 text-purple-200 text-xs font-bold active:scale-95 transition-all flex items-center justify-center gap-1"
          >
            <span>🌀</span> ส่งไป Lost Zone
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};
