import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceRoller({ compact = false }: { compact?: boolean }) {
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);
  const [key, setKey] = useState(0);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setShowOverlay(true);
    setKey(k => k + 1);
    const final = Math.floor(Math.random() * 6) + 1;

    let ticks = 0;
    const maxTicks = 12;
    const interval = setInterval(() => {
      setDisplay(Math.floor(Math.random() * 6) + 1);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(interval);
        setDisplay(final);
        setResult(final);
        setRolling(false);
      }
    }, 75);
  };

  return (
    <>
      {/* Full-screen result overlay */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-pointer select-none"
            onClick={() => { if (!rolling) setShowOverlay(false); }}
          >
            <div className="flex flex-col items-center gap-8">
              {/* Large dice face */}
              <motion.div
                key={`die-${key}-${display}`}
                className="text-[150px] leading-none"
                animate={rolling ? { rotate: [-8, 8, -6, 6, -4, 4, 0] } : { scale: [1, 1.12, 1] }}
                transition={rolling
                  ? { duration: 0.07, ease: 'linear' }
                  : { duration: 0.35, ease: 'easeOut' }
                }
              >
                {DICE_FACES[display - 1]}
              </motion.div>

              {/* Result number */}
              <AnimatePresence mode="wait">
                {result && !rolling ? (
                  <motion.div
                    key={`num-${key}`}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="text-7xl font-black text-white bg-gray-800/90 border-2 border-gray-500 px-10 py-5 rounded-3xl shadow-[0_0_50px_rgba(255,255,255,0.1)]"
                  >
                    {result}
                  </motion.div>
                ) : rolling ? (
                  <motion.div
                    key="rolling"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 0.4, repeat: Infinity }}
                    className="text-gray-500 text-lg font-semibold tracking-widest"
                  >
                    ROLLING...
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {result && !rolling && (
                <p className="text-gray-600 text-sm tracking-wide">Tap anywhere to close</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact button (in CenterDivider) */}
      {compact ? (
        <button
          onClick={roll}
          disabled={rolling}
          className="relative w-10 h-10 rounded-xl bg-gray-700/50 border-2 border-gray-500/50 flex items-center justify-center text-2xl hover:bg-gray-600/50 active:scale-95 transition-all disabled:opacity-50 select-none"
        >
          {rolling ? DICE_FACES[display - 1] : (result ? DICE_FACES[result - 1] : '🎲')}
          {result && !rolling && (
            <span className="absolute -bottom-1 -right-1 bg-gray-600 text-white text-[8px] font-black leading-none px-0.5 py-px rounded">
              {result}
            </span>
          )}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={roll}
            disabled={rolling}
            className="w-14 h-14 rounded-xl bg-gray-700/50 border-2 border-gray-500/50 flex items-center justify-center text-3xl hover:bg-gray-600/50 active:scale-95 transition-all disabled:opacity-50"
          >
            {rolling ? DICE_FACES[display - 1] : (result ? DICE_FACES[result - 1] : '🎲')}
          </button>
          {result && !rolling && (
            <span className="text-xl font-black text-white">{result}</span>
          )}
          <span className="text-xs text-gray-500">Dice (d6)</span>
        </div>
      )}
    </>
  );
}
