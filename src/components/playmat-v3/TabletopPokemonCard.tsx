import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { TabletopPokemonSlot } from './types';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { Sound } from '../../engine/pixi/SoundEffects';
import { getCardDisplayName } from '../../utils/pokemonThaiTranslator';
import { useBalatroCardTilt } from './hooks/useBalatroCardTilt';

interface EnergyTypeVisualInfo {
  name: string;
  thaiName: string;
  icon: string;
  auraBloomClass: string;
  auraCoronaClass: string;
  auraRingClass: string;
  surfaceBorderClass: string;
  crestClass: string;
  badgeClass: string;
}

function resolveEnergyType(card: { energyType?: string; nameEn?: string; nameTh?: string }): string {
  if (card.energyType) return card.energyType;
  const name = `${card.nameEn || ''} ${card.nameTh || ''}`.toLowerCase();
  if (name.includes('fire') || name.includes('ไฟ')) return 'Fire';
  if (name.includes('water') || name.includes('น้ำ')) return 'Water';
  if (name.includes('lightning') || name.includes('electric') || name.includes('ไฟฟ้า') || name.includes('สายฟ้า')) return 'Lightning';
  if (name.includes('grass') || name.includes('พืช')) return 'Grass';
  if (name.includes('psychic') || name.includes('พลังจิต')) return 'Psychic';
  if (name.includes('fighting') || name.includes('ต่อสู้')) return 'Fighting';
  if (name.includes('darkness') || name.includes('dark') || name.includes('ความมืด')) return 'Darkness';
  if (name.includes('metal') || name.includes('โลหะ') || name.includes('เหล็ก')) return 'Metal';
  if (name.includes('dragon') || name.includes('มังกร')) return 'Dragon';
  return 'Colorless';
}

const MULTI_ENERGY_VISUAL_INFO: EnergyTypeVisualInfo = {
  name: 'Multi',
  thaiName: 'หลายธาตุ',
  icon: '🌈',
  auraBloomClass: 'bg-gradient-to-tr from-rose-500/80 via-amber-400/75 via-emerald-400/75 via-sky-400/75 to-purple-600/80 shadow-[0_0_45px_rgba(236,72,153,0.95)]',
  auraCoronaClass: 'bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-sky-400 to-purple-500 shadow-[0_0_30px_rgba(236,72,153,0.9)]',
  auraRingClass: 'ring-2 sm:ring-4 ring-pink-400 border-2 border-amber-200 shadow-[0_0_22px_rgba(236,72,153,0.9)]',
  surfaceBorderClass: 'border-2 border-pink-400 shadow-[0_0_18px_rgba(236,72,153,0.7)]',
  crestClass: 'bg-gradient-to-br from-pink-600 via-amber-500 to-sky-500 text-white border border-white/80 shadow-[0_0_12px_rgba(236,72,153,0.9)]',
  badgeClass: 'bg-gradient-to-r from-rose-600 via-amber-500 via-emerald-600 to-sky-600 text-white border border-white/60 shadow-[0_0_10px_rgba(236,72,153,0.8)]',
};

function getEnergyVisualInfo(type: string): EnergyTypeVisualInfo {
  switch (type) {
    case 'Fire':
      return {
        name: 'Fire',
        thaiName: 'ไฟ',
        icon: '🔥',
        auraBloomClass: 'bg-gradient-to-tr from-rose-600/85 via-orange-500/85 to-amber-300/80 shadow-[0_0_40px_rgba(249,115,22,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-red-600 via-orange-500 to-amber-300 shadow-[0_0_25px_rgba(249,115,22,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-orange-500 border-2 border-amber-300 shadow-[0_0_22px_rgba(249,115,22,0.95)]',
        surfaceBorderClass: 'border-2 border-orange-400 shadow-[0_0_16px_rgba(249,115,22,0.7)]',
        crestClass: 'bg-gradient-to-br from-red-600 via-orange-500 to-amber-500 text-amber-100 border border-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.9)]',
        badgeClass: 'bg-gradient-to-r from-red-700 via-orange-600 to-amber-600 text-amber-100 border border-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.8)]',
      };
    case 'Water':
      return {
        name: 'Water',
        thaiName: 'น้ำ',
        icon: '💧',
        auraBloomClass: 'bg-gradient-to-tr from-blue-700/85 via-cyan-500/85 to-sky-300/80 shadow-[0_0_40px_rgba(14,165,233,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-blue-600 via-sky-400 to-cyan-200 shadow-[0_0_25px_rgba(56,189,248,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-sky-400 border-2 border-cyan-200 shadow-[0_0_22px_rgba(56,189,248,0.95)]',
        surfaceBorderClass: 'border-2 border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.7)]',
        crestClass: 'bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-sky-100 border border-cyan-200 shadow-[0_0_12px_rgba(56,189,248,0.9)]',
        badgeClass: 'bg-gradient-to-r from-blue-800 via-blue-600 to-sky-500 text-sky-100 border border-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.8)]',
      };
    case 'Lightning':
      return {
        name: 'Lightning',
        thaiName: 'สายฟ้า',
        icon: '⚡',
        auraBloomClass: 'bg-gradient-to-tr from-amber-500/90 via-yellow-400/90 to-yellow-100/85 shadow-[0_0_45px_rgba(250,204,21,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-amber-500 via-yellow-300 to-white shadow-[0_0_25px_rgba(250,204,21,1)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-yellow-400 border-2 border-yellow-100 shadow-[0_0_25px_rgba(250,204,21,1)]',
        surfaceBorderClass: 'border-2 border-yellow-300 shadow-[0_0_18px_rgba(250,204,21,0.8)]',
        crestClass: 'bg-gradient-to-br from-amber-500 to-yellow-300 text-slate-950 font-black border border-yellow-100 shadow-[0_0_12px_rgba(250,204,21,0.95)]',
        badgeClass: 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-300 text-slate-950 border border-yellow-200 shadow-[0_0_10px_rgba(250,204,21,0.85)]',
      };
    case 'Grass':
      return {
        name: 'Grass',
        thaiName: 'พืช',
        icon: '🍃',
        auraBloomClass: 'bg-gradient-to-tr from-emerald-800/85 via-green-500/85 to-lime-300/80 shadow-[0_0_40px_rgba(34,197,94,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-emerald-600 via-green-400 to-lime-200 shadow-[0_0_25px_rgba(74,222,128,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-emerald-400 border-2 border-lime-200 shadow-[0_0_22px_rgba(52,211,153,0.95)]',
        surfaceBorderClass: 'border-2 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.7)]',
        crestClass: 'bg-gradient-to-br from-emerald-700 via-green-600 to-lime-500 text-emerald-100 border border-lime-200 shadow-[0_0_12px_rgba(52,211,153,0.9)]',
        badgeClass: 'bg-gradient-to-r from-emerald-800 via-green-600 to-lime-600 text-emerald-100 border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.8)]',
      };
    case 'Psychic':
      return {
        name: 'Psychic',
        thaiName: 'พลังจิต',
        icon: '🔮',
        auraBloomClass: 'bg-gradient-to-tr from-purple-800/85 via-fuchsia-500/85 to-pink-300/80 shadow-[0_0_40px_rgba(168,85,247,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-purple-600 via-fuchsia-400 to-pink-200 shadow-[0_0_25px_rgba(192,132,252,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-purple-400 border-2 border-pink-200 shadow-[0_0_22px_rgba(192,132,252,0.95)]',
        surfaceBorderClass: 'border-2 border-purple-400 shadow-[0_0_16px_rgba(192,132,252,0.7)]',
        crestClass: 'bg-gradient-to-br from-purple-700 via-fuchsia-600 to-pink-500 text-purple-100 border border-pink-200 shadow-[0_0_12px_rgba(192,132,252,0.9)]',
        badgeClass: 'bg-gradient-to-r from-purple-900 via-fuchsia-700 to-pink-600 text-purple-100 border border-purple-300 shadow-[0_0_10px_rgba(192,132,252,0.8)]',
      };
    case 'Fighting':
      return {
        name: 'Fighting',
        thaiName: 'ต่อสู้',
        icon: '🥋',
        auraBloomClass: 'bg-gradient-to-tr from-amber-950/85 via-amber-700/85 to-orange-400/80 shadow-[0_0_40px_rgba(217,119,6,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-amber-800 via-orange-600 to-amber-300 shadow-[0_0_25px_rgba(217,119,6,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-amber-500 border-2 border-orange-200 shadow-[0_0_22px_rgba(217,119,6,0.95)]',
        surfaceBorderClass: 'border-2 border-amber-500 shadow-[0_0_16px_rgba(217,119,6,0.7)]',
        crestClass: 'bg-gradient-to-br from-amber-900 to-orange-600 text-amber-100 border border-amber-300 shadow-[0_0_12px_rgba(217,119,6,0.9)]',
        badgeClass: 'bg-gradient-to-r from-amber-950 via-amber-800 to-orange-700 text-amber-100 border border-amber-400 shadow-[0_0_10px_rgba(217,119,6,0.8)]',
      };
    case 'Darkness':
      return {
        name: 'Darkness',
        thaiName: 'ความมืด',
        icon: '🌑',
        auraBloomClass: 'bg-gradient-to-tr from-indigo-950/90 via-purple-900/85 to-indigo-600/80 shadow-[0_0_40px_rgba(129,140,248,0.9)]',
        auraCoronaClass: 'bg-gradient-to-tr from-slate-900 via-indigo-700 to-purple-500 shadow-[0_0_25px_rgba(129,140,248,0.9)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-indigo-400 border-2 border-purple-300 shadow-[0_0_22px_rgba(129,140,248,0.9)]',
        surfaceBorderClass: 'border-2 border-indigo-400 shadow-[0_0_16px_rgba(129,140,248,0.7)]',
        crestClass: 'bg-gradient-to-br from-slate-950 via-indigo-900 to-purple-800 text-indigo-100 border border-indigo-300 shadow-[0_0_12px_rgba(129,140,248,0.85)]',
        badgeClass: 'bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-900 text-indigo-200 border border-indigo-400 shadow-[0_0_10px_rgba(129,140,248,0.75)]',
      };
    case 'Metal':
      return {
        name: 'Metal',
        thaiName: 'โลหะ',
        icon: '⚙️',
        auraBloomClass: 'bg-gradient-to-tr from-slate-500/85 via-slate-200/85 to-white/80 shadow-[0_0_40px_rgba(226,232,240,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-slate-500 via-slate-200 to-white shadow-[0_0_25px_rgba(226,232,240,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-slate-200 border-2 border-white shadow-[0_0_22px_rgba(226,232,240,0.95)]',
        surfaceBorderClass: 'border-2 border-slate-200 shadow-[0_0_16px_rgba(226,232,240,0.7)]',
        crestClass: 'bg-gradient-to-br from-slate-700 via-slate-500 to-slate-300 text-white border border-white shadow-[0_0_12px_rgba(226,232,240,0.9)]',
        badgeClass: 'bg-gradient-to-r from-slate-700 via-slate-500 to-zinc-400 text-slate-100 border border-slate-300 shadow-[0_0_10px_rgba(203,213,225,0.8)]',
      };
    case 'Dragon':
      return {
        name: 'Dragon',
        thaiName: 'มังกร',
        icon: '🐉',
        auraBloomClass: 'bg-gradient-to-tr from-rose-700/85 via-amber-500/85 to-yellow-300/80 shadow-[0_0_40px_rgba(245,158,11,1)]',
        auraCoronaClass: 'bg-gradient-to-tr from-rose-600 via-amber-400 to-yellow-200 shadow-[0_0_25px_rgba(245,158,11,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-amber-400 border-2 border-yellow-200 shadow-[0_0_22px_rgba(245,158,11,0.95)]',
        surfaceBorderClass: 'border-2 border-amber-400 shadow-[0_0_16px_rgba(245,158,11,0.7)]',
        crestClass: 'bg-gradient-to-br from-rose-800 to-amber-500 text-amber-100 border border-yellow-300 shadow-[0_0_12px_rgba(245,158,11,0.9)]',
        badgeClass: 'bg-gradient-to-r from-amber-700 via-yellow-600 to-rose-600 text-amber-100 border border-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.8)]',
      };
    default:
      return {
        name: 'Colorless',
        thaiName: 'ไร้สี',
        icon: '⭐',
        auraBloomClass: 'bg-gradient-to-tr from-white/70 via-slate-200/60 to-white/70 shadow-[0_0_35px_rgba(255,255,255,0.9)]',
        auraCoronaClass: 'bg-gradient-to-tr from-slate-200 via-white to-slate-100 shadow-[0_0_20px_rgba(255,255,255,0.95)]',
        auraRingClass: 'ring-2 sm:ring-4 ring-white border-2 border-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.85)]',
        surfaceBorderClass: 'border-2 border-white/90 shadow-[0_0_16px_rgba(255,255,255,0.6)]',
        crestClass: 'bg-gradient-to-br from-slate-600 to-slate-400 text-white border border-white shadow-[0_0_10px_rgba(255,255,255,0.7)]',
        badgeClass: 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 text-slate-100 border border-white/50 shadow-[0_0_10px_rgba(255,255,255,0.6)]',
      };
  }
}

interface TabletopPokemonCardProps {
  slot: TabletopPokemonSlot | null;
  position: 'ACTIVE' | number;
  side?: 'player1' | 'player2';
  label?: string;
  isAttacker?: boolean;
  isTarget?: boolean;
  isWeaknessTarget?: boolean;
  isResistanceTarget?: boolean;
  isDropTarget?: boolean;
  dropHint?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragEnter?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onSelectSlot: () => void;
  onDiscardEnergy?: (energyInstanceId: string) => void;
  onEmptySlotClick?: () => void;
  onToggleFacedown?: () => void;
  onToggleAbility?: () => void;
  onZoomCard?: () => void;
  onPreviewCard?: (card: any) => void;
  onTargetSelect?: () => void;
}

export const TabletopPokemonCard = React.memo<TabletopPokemonCardProps>(function TabletopPokemonCard({
  slot,
  position,
  side,
  label,
  isAttacker = false,
  isTarget = false,
  isWeaknessTarget = false,
  isResistanceTarget = false,
  isDropTarget = false,
  dropHint,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onPointerDown,
  onPointerUp,
  onSelectSlot,
  onDiscardEnergy,
  onEmptySlotClick,
  onToggleFacedown,
  onToggleAbility,
  onZoomCard,
  onPreviewCard,
  onTargetSelect,
}) {
  const isBench = typeof position === 'number';
  const posId = isBench ? `bench-${position}` : 'active';

  const [floatingDamage, setFloatingDamage] = useState<number | null>(null);
  const currentDamage = slot?.damage ?? 0;
  const prevDamageRef = useRef(currentDamage);

  // Balatro Card Slam & Squash Rebound on card placement or evolution
  const [isSlamming, setIsSlamming] = useState(false);
  const prevCardInstanceRef = useRef(slot?.card?.instanceId);

  useEffect(() => {
    if (slot?.card?.instanceId && slot.card.instanceId !== prevCardInstanceRef.current) {
      setIsSlamming(true);
      const timer = setTimeout(() => setIsSlamming(false), 380);
      prevCardInstanceRef.current = slot.card.instanceId;
      return () => clearTimeout(timer);
    }
    prevCardInstanceRef.current = slot?.card?.instanceId;
  }, [slot?.card?.instanceId]);

  useEffect(() => {
    if (currentDamage > prevDamageRef.current) {
      const diff = currentDamage - prevDamageRef.current;
      setFloatingDamage(diff);
      const timer = setTimeout(() => setFloatingDamage(null), 1800);
      return () => clearTimeout(timer);
    }
    prevDamageRef.current = currentDamage;
  }, [currentDamage]);

  // Balatro 3D perspective tilt & specular glint physics
  const balatroTilt = useBalatroCardTilt({ maxTilt: 12, scale: 1.05, elevation: 12 });

  // Detect high rarity or ex for Balatro Polychrome rainbow holographic sheen
  const isHoloOrEx = useMemo(() => {
    if (!slot?.card) return false;
    const r = ((slot.card as any).rarity || '').toLowerCase();
    const n = (slot.card.nameEn || slot.card.nameTh || '').toLowerCase();
    const hasSpecialSubtype = slot.card.subtypes?.some((s) => {
      const sub = s.toLowerCase();
      return (
        sub.includes('ex') ||
        sub.includes('vmax') ||
        sub.includes('vstar') ||
        sub.includes('radiant') ||
        sub.includes('ace spec') ||
        sub.includes('acespec')
      );
    });
    return (
      hasSpecialSubtype ||
      r.includes('ex') ||
      r.includes('sar') ||
      r.includes('sr') ||
      r.includes('ur') ||
      r.includes('secret') ||
      r.includes('promo') ||
      n.includes(' ex') ||
      n.includes('vmax') ||
      n.includes('vstar')
    );
  }, [slot?.card]);

  // Group attached energies by type for compact, non-intrusive pill display
  const energyGroups = useMemo(() => {
    if (!slot || !slot.attachedEnergies.length) return [];
    const map = new Map<string, { type: string; cards: any[]; visualInfo: EnergyTypeVisualInfo }>();
    slot.attachedEnergies.forEach((e) => {
      const type = resolveEnergyType(e);
      const existing = map.get(type);
      if (existing) {
        existing.cards.push(e);
      } else {
        map.set(type, {
          type,
          cards: [e],
          visualInfo: getEnergyVisualInfo(type),
        });
      }
    });
    return Array.from(map.values());
  }, [slot]);

  if (!slot) {
    return (
      <div
        role="button"
        tabIndex={0}
        id={`slot-${posId}-empty`}
        data-slot-zone="true"
        data-slot-side={side}
        data-slot-pos={position}
        onClick={(e) => {
          if (e.defaultPrevented) return;
          (onEmptySlotClick || onSelectSlot)();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            (onEmptySlotClick || onSelectSlot)();
          }
        }}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`group relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl sm:rounded-2xl backdrop-blur-md transition-all duration-150 cursor-pointer select-none shrink-0 min-w-0 ${
          isDropTarget
            ? 'border-emerald-400 bg-emerald-500/30 scale-105 ring-4 ring-emerald-400/60 shadow-2xl shadow-emerald-500/50 text-emerald-200'
            : 'border-white/20 bg-slate-900/30 hover:bg-slate-800/50 hover:border-emerald-400/50 text-slate-400 hover:text-emerald-300'
        } ${
          isBench
            ? 'card-bench-size'
            : 'card-active-size ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/30'
        }`}
      >
        <div className="flex flex-col items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 pointer-events-none w-full max-w-full overflow-hidden">
          <span className="text-base xs:text-lg sm:text-2xl opacity-70 group-hover:scale-110 transition-transform">
            {isDropTarget
              ? dropHint?.includes('⚡')
                ? '⚡'
                : dropHint?.includes('🧬')
                ? '🧬'
                : '📥'
              : isBench
              ? '➕'
              : '⭐'}
          </span>
          <span className="text-[9px] xs:text-[10px] sm:text-xs font-bold tracking-wider uppercase opacity-85 text-center truncate max-w-full px-0.5">
            {isDropTarget ? (dropHint || 'วางลงที่นี่') : label || (isBench ? `B${position + 1}` : 'Active')}
          </span>
          <span className="hidden md:block text-[8px] sm:text-[9.5px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-full">
            {isDropTarget ? 'ปล่อยเพื่อวาง' : 'ลากการ์ดมาวาง'}
          </span>
        </div>
      </div>
    );
  }

  const isFacedown = Boolean(slot.isFacedown || slot.card.isFacedown);
  const imageUrl = resolveCardImageUrl(slot.card);
  const cardName = getCardDisplayName(slot.card);
  const maxHp = slot.card.hp || 100;
  const isDamaged = slot.damage > 0;
  const isKnockedOut = slot.damage >= maxHp;
  const isPokemon = slot.card.supertype === 'Pokemon';
  const hasAbility = Boolean(slot.card.abilities && slot.card.abilities.length > 0);

  // Energy counts & type resolution
  const energyMap: Record<string, number> = {};
  slot.attachedEnergies.forEach((e) => {
    const type = resolveEnergyType(e);
    energyMap[type] = (energyMap[type] || 0) + 1;
  });
  const attachedTypes = Object.keys(energyMap);
  const hasEnergy = slot.attachedEnergies.length > 0;
  const isMultiType = attachedTypes.length > 1;
  const dominantEnergyType = attachedTypes[0] || 'Colorless';
  const visualInfo = isMultiType ? MULTI_ENERGY_VISUAL_INFO : getEnergyVisualInfo(dominantEnergyType);


  // Dynamic ring styling based on combat states and drop target
  let ringStyle = isBench ? 'card-bench-size' : 'card-active-size';

  if (!hasEnergy && !isBench) {
    ringStyle += ' ring-2 sm:ring-3 ring-emerald-400/50 shadow-lg shadow-emerald-950/30';
  }

  if (isDropTarget) {
    ringStyle += ' ring-4 ring-emerald-400 bg-emerald-500/20 scale-105 shadow-2xl shadow-emerald-400/60 z-30 animate-pulse';
  } else if (isAttacker) {
    ringStyle += ' ring-4 ring-amber-400 shadow-2xl shadow-amber-500/50 scale-105 z-30 animate-pulse';
  } else if (isTarget) {
    ringStyle += ' ring-4 ring-red-500 shadow-2xl shadow-red-500/60 scale-105 z-30 animate-pulse';
  } else if (onTargetSelect) {
    ringStyle += ' ring-2 ring-dashed ring-red-400/70 hover:ring-red-400 hover:scale-105 cursor-pointer z-20';
  }

  return (
    <div
      id={`slot-${posId}-card`}
      data-slot-zone="true"
      data-slot-side={side}
      data-slot-pos={position}
      data-facedown={isFacedown ? 'true' : 'false'}
      data-energy-aura={hasEnergy ? (isMultiType ? 'Multi' : dominantEnergyType) : undefined}
      data-attached-energies-count={slot.attachedEnergies.length}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        (onTargetSelect || onSelectSlot)();
      }}
      style={{
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none',
      }}
      className={`group relative select-none flex flex-col rounded-xl sm:rounded-2xl overflow-visible transition-all duration-150 ${
        draggable ? 'cursor-grab active:cursor-grabbing touch-none' : ''
      } ${ringStyle} ${isBench ? 'card-placement-impact' : 'card-swap-stepup'}`}
    >
      {/* Placement Impact Shockwave (Soft momentary ripple) */}
      <div
        className={`absolute -inset-0.5 sm:-inset-1 rounded-xl sm:rounded-2xl pointer-events-none z-0 card-placement-ripple ${
          hasEnergy ? visualInfo.surfaceBorderClass : 'border border-sky-400/40'
        }`}
      />

      {/* Energy Aura Halo (Delicate, thin, elegant energy outline) */}
      {hasEnergy && (
        <div
          data-testid="energy-aura-glow"
          data-energy-type={isMultiType ? 'Multi' : dominantEnergyType}
          className={`absolute -inset-0.5 sm:-inset-1 pointer-events-none z-0 rounded-xl sm:rounded-2xl ring-1 sm:ring-1.5 opacity-60 ${visualInfo.surfaceBorderClass}`}
        />
      )}

      {/* Drop Target Overlay */}
      {isDropTarget && (
        <div className="absolute inset-0 z-35 flex flex-col items-center justify-center bg-emerald-950/75 rounded-xl sm:rounded-2xl border-2 border-emerald-400 backdrop-blur-xs animate-in zoom-in-95 pointer-events-none p-1 text-center">
          <span className="text-base sm:text-lg animate-bounce">
            {dropHint?.includes('⚡') ? '⚡' : dropHint?.includes('🧬') ? '🧬' : dropHint?.includes('🛠️') ? '🛠️' : '📥'}
          </span>
          <span className="text-[8px] sm:text-[9.5px] font-black text-emerald-200 drop-shadow">
            {dropHint || 'ปล่อยเพื่อวาง'}
          </span>
        </div>
      )}

      {/* Attacker Aura Badge */}
      {isAttacker && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] sm:text-[10px] shadow-lg border border-amber-300 flex items-center gap-1 whitespace-nowrap animate-bounce">
          <span>⚔️</span>
          <span>ตัวโจมตี</span>
        </div>
      )}

      {/* Target Reticle Badge */}
      {isTarget && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-[9px] sm:text-[10px] shadow-lg border border-red-300 flex items-center gap-1 whitespace-nowrap animate-bounce">
          <span>🎯</span>
          <span>เป้าหมาย</span>
          {isWeaknessTarget && <span className="text-amber-300 font-extrabold ml-0.5">🔥x2</span>}
          {isResistanceTarget && <span className="text-cyan-200 font-extrabold ml-0.5">🛡️-30</span>}
        </div>
      )}

      {/* Floating Damage Animation (+XX DMG) */}
      {floatingDamage !== null && (
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-2.5 py-0.5 rounded-full bg-red-600/95 text-white font-black text-xs sm:text-sm shadow-xl border-2 border-amber-300 animate-bounce whitespace-nowrap">
          +{floatingDamage} DMG!
        </div>
      )}



      {/* Main Card Surface with Balatro 3D Tilt & Slam */}
      <div
        id={`slot-${posId}-surface`}
        onClick={(e) => {
          if (e.defaultPrevented) return;
          (onTargetSelect || onSelectSlot)();
        }}
        onPointerMove={balatroTilt.onPointerMove}
        onPointerEnter={balatroTilt.onPointerEnter}
        onPointerLeave={balatroTilt.onPointerLeave}
        style={balatroTilt.transformStyle}
        className={`relative w-full h-full rounded-xl sm:rounded-2xl overflow-hidden cursor-pointer shadow-xl bg-slate-900 transition-shadow active:scale-95 group-hover:shadow-indigo-500/30 ${
          isSlamming ? 'animate-balatro-slam' : ''
        } ${isHoloOrEx ? 'balatro-polychrome-shimmer' : ''} ${
          hasEnergy ? visualInfo.surfaceBorderClass : 'border border-white/25'
        }`}
      >
        {/* Balatro Dynamic Specular Glint Sheen */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={balatroTilt.glintStyle}
        />
        {isFacedown ? (
          /* Realistic Pokemon Cardback Design */
          <div
            id={`slot-${posId}-facedown`}
            className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-blue-950 to-slate-950 border-2 border-sky-400/40 p-0.5 sm:p-1 select-none overflow-hidden"
          >
            {/* Holographic radial glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent pointer-events-none" />

            {/* Pokeball Motif */}
            <div className="relative w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 rounded-full border border-sky-300/60 sm:border-2 bg-gradient-to-b from-rose-600 via-rose-500 to-slate-950 flex items-center justify-center shadow-lg">
              <div className="w-full h-0.5 bg-slate-950 absolute" />
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white border border-slate-950 sm:border-2 flex items-center justify-center z-10 shadow-inner">
                <div className="w-0.5 h-0.5 rounded-full bg-slate-950" />
              </div>
            </div>

            {/* Facedown Label Badge */}
            <div className="mt-0.5 flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-black/80 border border-sky-400/50 text-[6.5px] sm:text-[8px] font-black text-sky-200 tracking-wide uppercase shadow">
              <span>🎴</span>
              <span>คว่ำหน้า</span>
            </div>

            {/* Quick Flip Button on Hover / Tap */}
            {onToggleFacedown && (
              <button
                id={`btn-quick-flip-${posId}`}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  Sound.playCardFlip();
                  onToggleFacedown();
                }}
                className="absolute bottom-0.5 px-1 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[6.5px] sm:text-[7.5px] leading-none font-black shadow-md active:scale-95 transition-all z-20 flex items-center gap-0.5 cursor-pointer"
                title="คลิกเพื่อพลิกหงายหน้า"
              >
                <span>🔄</span> พลิกหงาย
              </button>
            )}
          </div>
        ) : (
          /* Face-up Card Content */
          <>
            <img
              src={imageUrl}
              alt={cardName}
              draggable={false}
              className={`w-full h-full object-cover object-center aspect-[63/88] pointer-events-none ${
                isKnockedOut ? 'grayscale contrast-125 opacity-70' : ''
              }`}
              loading="eager"
              onError={(e) => handleCardImageError(e, slot.card)}
            />

            {/* Evolution History badge if Stage 1 or 2 */}
            {slot.evolutionHistory.length > 0 && (
              <div
                title={`วิวัฒนาการมาจาก ${slot.evolutionHistory.map((c) => getCardDisplayName(c)).join(' > ')}`}
                className="absolute top-1 right-1 px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded bg-black/80 border border-white/20 text-[7px] sm:text-[8px] font-bold text-amber-300 backdrop-blur-sm z-10"
              >
                +{slot.evolutionHistory.length} Evo
              </div>
            )}

            {/* Attached Tool Badge (Click to preview high-res card artwork) */}
            {slot.attachedTool && (
              <button
                type="button"
                id={`btn-tool-preview-${posId}`}
                title={`ไอเท็มติดโปเกมอน: ${getCardDisplayName(slot.attachedTool)} (คลิกเพื่อดูรูปการ์ด)`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  Sound.playCardFlip();
                  if (onPreviewCard && slot.attachedTool) {
                    onPreviewCard(slot.attachedTool);
                  }
                }}
                className="absolute top-1 left-1 px-1.5 py-0.5 rounded-lg bg-purple-950/90 hover:bg-purple-900 border border-purple-400/50 hover:border-purple-300 text-[8.5px] sm:text-[9.5px] text-purple-200 z-10 shadow cursor-pointer transition active:scale-95 flex items-center gap-0.5"
              >
                <span>🛠️</span>
                <span className="hidden sm:inline text-[7.5px] font-bold opacity-90">Tool</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Quick Ability Trigger Button / Status Badge (Positioned at right-edge center, zero overlap with bottom energy tray) */}
      {!isFacedown && isPokemon && onToggleAbility && (
        <button
          id={`btn-quick-ability-${posId}`}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            Sound.playCardFlip();
            onToggleAbility();
          }}
          className={`absolute top-1/2 -translate-y-1/2 -right-1.5 sm:-right-2 z-20 w-5 sm:w-6 h-5 sm:h-6 rounded-full text-[9px] sm:text-[10px] font-black border shadow-lg transition-all active:scale-90 flex items-center justify-center cursor-pointer ${
            slot.abilityUsed
              ? 'bg-slate-950/90 text-slate-500 border-slate-700 opacity-70'
              : hasAbility
              ? 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 border-white shadow-amber-500/40 hover:scale-110 ring-2 ring-amber-400/40'
              : 'opacity-0 group-hover:opacity-100 bg-slate-900/90 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border-amber-400/50 shadow-md'
          }`}
          title={
            slot.abilityUsed
              ? 'ความสามารถ (Ability) ใช้แล้วในเทิร์นนี้ - คลิกเพื่อรีเซ็ต'
              : 'คลิกเพื่อประกาศใช้ความสามารถ (Ability)'
          }
        >
          <span>⚡</span>
        </button>
      )}

      {/* Floating 3D Damage Counter / Dice on Top (Click opens Detail Modal for convenient damage adjustment) */}
      {isDamaged && (
        <div
          id={`damage-counter-${posId}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelectSlot();
          }}
          title={`แดเมจสะสม ${slot.damage} หน่วย (คลิกเพื่อเปิดหน้าจัดการแดเมจ/การ์ด)`}
          className="absolute -top-2.5 -right-2 sm:-top-3.5 sm:-right-2.5 z-20 flex items-center justify-center min-w-[24px] sm:min-w-[32px] h-[24px] sm:h-[32px] px-1 rounded-lg sm:rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-700 border border-white sm:border-2 shadow-xl shadow-red-950/80 animate-in zoom-in-75 duration-100 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
        >
          <span className="text-[10px] sm:text-xs font-black text-white tracking-tighter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {slot.damage}
          </span>
        </div>
      )}

      {/* Status Condition Badges */}
      {slot.specialConditions.length > 0 && (
        <div className="absolute -top-2.5 left-1 z-20 flex -space-x-1">
          {slot.specialConditions.map((cond) => (
            <span
              key={cond}
              title={cond}
              className="flex items-center justify-center w-4 sm:w-6 h-4 sm:h-6 rounded-full bg-slate-950 border border-white/40 text-[8px] sm:text-[10px] shadow"
            >
              {cond === 'POISON' && '🟣'}
              {cond === 'BURN' && '🔥'}
              {cond === 'ASLEEP' && '💤'}
              {cond === 'PARALYZED' && '⚡'}
              {cond === 'CONFUSED' && '🌀'}
            </span>
          ))}
        </div>
      )}

      {/* Attached Energy Jewel Tray (Overlapping Gem Orbs: cluster stack that elegantly fits 4+ types without clutter) */}
      {!isFacedown && energyGroups.length > 0 && (
        <div
          id={`energy-tray-${posId}`}
          data-testid="attached-energy-tray"
          className="absolute -bottom-2.5 sm:-bottom-3 left-1 sm:left-1.5 z-25 flex items-center -space-x-1 sm:-space-x-1.5 hover:space-x-1 transition-all duration-200 group/tray max-w-[95%] pointer-events-auto select-none"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {energyGroups.map((grp) => {
            const topEnergy = grp.cards[grp.cards.length - 1];
            const energyName = getCardDisplayName(topEnergy) || `พลังงาน${grp.visualInfo.thaiName}`;
            return (
              <div key={grp.type} className="group/energy relative flex items-center">
                <button
                  type="button"
                  id={`btn-energy-${posId}-${grp.type.toLowerCase()}`}
                  title={`พลังงาน${grp.visualInfo.thaiName} (${grp.cards.length} ใบ): ${onDiscardEnergy ? 'คลิกเพื่อทิ้งลงสุสานทันที' : energyName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDiscardEnergy && topEnergy) {
                      onDiscardEnergy(topEnergy.instanceId);
                    }
                  }}
                  className={`relative w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-lg border text-[9px] sm:text-[10.5px] font-black cursor-pointer transition-all active:scale-90 hover:scale-125 hover:z-30 backdrop-blur-md ${grp.visualInfo.badgeClass}`}
                >
                  <span className="leading-none drop-shadow">{grp.visualInfo.icon}</span>
                  {grp.cards.length > 1 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-black/90 border border-white/50 text-[7px] sm:text-[8px] font-black text-amber-300 flex items-center justify-center leading-none shadow">
                      {grp.cards.length}
                    </span>
                  )}
                  {onDiscardEnergy && (
                    <span
                      className="hidden group-hover/energy:inline-flex absolute inset-0 items-center justify-center rounded-full bg-red-600/90 text-white text-[8px] font-black leading-none shadow"
                      title="ทิ้งพลังงานนี้ลงสุสาน"
                    >
                      ✕
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Zoom Preview Button on hover/desktop (Hidden on mobile, stops pointer propagation) */}
      {onZoomCard && (
        <button
          id={`btn-quick-zoom-${posId}`}
          type="button"
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            Sound.playCardFlip();
            onZoomCard();
          }}
          title="คลิกเพื่อดูการ์ดขนาดใหญ่ (อ่าน Text ชัดๆ)"
          className="absolute -left-1.5 sm:-left-2 top-1/2 -translate-y-1/2 z-20 w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-slate-900/90 hover:bg-sky-600 text-sky-300 hover:text-white border border-white/30 shadow-md hidden sm:flex items-center justify-center text-[9px] sm:text-[11px] opacity-0 group-hover:opacity-100 transition-all active:scale-90 cursor-pointer"
        >
          <span>🔍</span>
        </button>
      )}
    </div>
  );
});
