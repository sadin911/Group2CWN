import React from 'react';
import type { TabletopCombatState } from './types';
import { getCardDisplayName, getAttackDisplayName } from '../../utils/pokemonThaiTranslator';

interface TabletopCombatBannerProps {
  combatState: TabletopCombatState | null | undefined;
  onApplyDamage: (damageOverride?: number) => void;
  onCancel: () => void;
}

export const TabletopCombatBanner: React.FC<TabletopCombatBannerProps> = ({
  combatState,
  onApplyDamage,
  onCancel,
}) => {
  const [currentDamage, setCurrentDamage] = React.useState<number>(
    combatState?.calculatedDamage ?? 0
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const lastCombatKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (combatState) {
      const combatKey = `${combatState.attackerSide}-${combatState.attackerPosition}-${combatState.targetSide}-${combatState.targetPosition}-${combatState.attackName}-${combatState.calculatedDamage}`;
      if (lastCombatKeyRef.current !== combatKey) {
        lastCombatKeyRef.current = combatKey;
        setCurrentDamage(combatState.calculatedDamage);
        setIsSubmitting(false);
      }
    } else {
      lastCombatKeyRef.current = null;
    }
  }, [combatState]);

  if (!combatState) return null;

  const attackerDisplay = getCardDisplayName({
    nameTh: combatState.attackerCardName,
    name: combatState.attackerCardName,
  });
  const targetDisplay = getCardDisplayName({
    nameTh: combatState.targetCardName,
    name: combatState.targetCardName,
  });
  const attackDisplay = getAttackDisplayName(combatState.attackName);

  const isBench = combatState.targetPosition !== 'ACTIVE';
  const targetPosLabel =
    combatState.targetPosition === 'ACTIVE'
      ? 'Active'
      : `Bench #${Number(combatState.targetPosition) + 1}`;

  return (
    <div
      id="tabletop-combat-banner"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[75] w-[95vw] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="rounded-2xl border border-amber-500/50 bg-slate-950/95 p-3.5 sm:p-4 shadow-2xl shadow-amber-950/60 backdrop-blur-md">
        {/* Top bar: Attacker -> Target Flow */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800 text-xs sm:text-sm">
          {/* Attacker */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-amber-400 text-base animate-pulse">⚔️</span>
            <div className="truncate">
              <span className="font-bold text-amber-300">
                {attackerDisplay}
              </span>
              <span className="text-slate-400 text-xs ml-1">
                ท่า [{attackDisplay}]
              </span>
            </div>
          </div>

          <div className="text-slate-500 text-xs font-bold shrink-0">➔</div>

          {/* Target */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-red-400 text-base animate-pulse">🎯</span>
            <div className="truncate">
              <span className="font-bold text-red-300">
                {targetDisplay}
              </span>
              <span className="text-slate-400 text-xs ml-1">
                ({targetPosLabel})
              </span>
            </div>
          </div>

          {/* Cancel button */}
          <button
            onClick={() => {
              setIsSubmitting(true);
              onCancel();
            }}
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="ยกเลิกการโจมตี"
            id="cancel-attack-button"
          >
            ✕
          </button>
        </div>

        {/* Calculation details and badges */}
        <div className="my-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
              Base: {combatState.baseDamage}
            </span>

            {combatState.isWeakness && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                🔥 ชนะธาตุ x2 ({combatState.weaknessType})
              </span>
            )}

            {combatState.isResistance && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                🛡️ ต้านทาน -30 ({combatState.resistanceType})
              </span>
            )}

            {isBench && (
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[11px]">
                🎯 ยิงตัวเบนช์ (ไม่คิดจุดอ่อน)
              </span>
            )}
          </div>

          <div className="text-slate-400 text-[11px] hidden sm:block">
            💡 แตะตัวบนเบนช์เพื่อย้ายเป้าหมาย หรือพิมพ์แก้ไขตัวเลขแดเมจด้านล่าง
          </div>
        </div>

        {/* Custom Damage Adjustment Bar */}
        <div className="my-2 p-2 sm:p-2.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
              <span>🎯</span> แดเมจที่จะลง:
            </span>
            <div className="flex items-center bg-slate-950 border border-amber-400/50 rounded-lg px-2.5 py-1 shadow-inner focus-within:border-amber-400">
              <input
                type="number"
                min="0"
                step="10"
                id="input-combat-damage-override"
                value={currentDamage}
                onChange={(e) =>
                  setCurrentDamage(Math.max(0, parseInt(e.target.value, 10) || 0))
                }
                className="w-16 bg-transparent text-amber-300 font-mono font-black text-sm text-right outline-none"
                title="พิมพ์ตัวเลขแดเมจที่ต้องการลงได้เอง"
              />
              <span className="text-[11px] text-amber-400/80 ml-1 font-mono font-bold">DMG</span>
            </div>
          </div>

          {/* Quick +/- Delta adjustments */}
          <div className="flex items-center gap-1 flex-wrap">
            {[-100, -50, -30, -10, 10, 30, 50, 100].map((delta) => (
              <button
                key={delta}
                type="button"
                id={`btn-combat-delta-${delta > 0 ? `plus-${delta}` : `minus-${Math.abs(delta)}`}`}
                onClick={() => setCurrentDamage((prev) => Math.max(0, prev + delta))}
                className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition active:scale-95 cursor-pointer ${
                  delta > 0
                    ? 'bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta}
              </button>
            ))}
            {currentDamage !== combatState.calculatedDamage && (
              <button
                type="button"
                id="btn-combat-reset-calculated"
                onClick={() => setCurrentDamage(combatState.calculatedDamage)}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-[10px] text-slate-400 hover:text-slate-200 transition active:scale-95 cursor-pointer"
                title="รีเซ็ตกลับเป็นค่าที่คำนวณอัตโนมัติ"
              >
                รีเซ็ต ({combatState.calculatedDamage})
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons: 1-Tap Damage */}
        <div className="flex items-center gap-2 pt-1">
          {/* Main 1-tap damage button */}
          <button
            onClick={() => {
              if (isSubmitting) return;
              setIsSubmitting(true);
              onApplyDamage(currentDamage);
            }}
            disabled={isSubmitting}
            id="confirm-combat-damage-button"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm sm:text-base text-slate-950 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 hover:from-amber-300 hover:to-orange-300 active:scale-[0.99] shadow-lg shadow-orange-950/50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>💥 ยืนยันลงดาเมจ</span>
            <span className="px-2 py-0.5 rounded bg-slate-950/20 font-black font-mono">
              +{currentDamage} DMG
            </span>
          </button>

          {/* Secondary fallback button if weakness/resistance was factored */}
          {(combatState.isWeakness || combatState.isResistance) && (
            <button
              onClick={() => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                onApplyDamage(combatState.baseDamage);
              }}
              disabled={isSubmitting}
              id="confirm-normal-damage-button"
              className="px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700 active:scale-[0.99] transition-all cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
              title="ลงดาเมจปกติโดยไม่คูณจุดอ่อน/ต้านทาน"
            >
              ดาเมจปกติ (+{combatState.baseDamage})
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
