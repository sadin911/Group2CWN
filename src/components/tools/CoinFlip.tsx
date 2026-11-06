import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function CoinFace({ side, size = 200 }: { side: 'heads' | 'tails'; size?: number }) {
  const h = side === 'heads';
  const gid = `cg-${side}`;

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={gid} cx="38%" cy="30%" r="70%">
          <stop offset="0%"   stopColor={h ? '#fef9c3' : '#1e3a5f'} />
          <stop offset="50%"  stopColor={h ? '#fbbf24' : '#1e40af'} />
          <stop offset="100%" stopColor={h ? '#92400e' : '#0c1a3a'} />
        </radialGradient>
        <radialGradient id={`${gid}-hi`} cx="28%" cy="22%" r="42%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="100" cy="196" rx="78" ry="7" fill="rgba(0,0,0,0.45)" />

      {/* Outer rim */}
      <circle cx="100" cy="96" r="92" fill={h ? '#78350f' : '#0f172a'} />

      {/* Main coin face */}
      <circle cx="100" cy="96" r="88" fill={`url(#${gid})`} />

      {/* Milled edge */}
      {Array.from({ length: 44 }).map((_, i) => {
        const a = (i / 44) * Math.PI * 2;
        return (
          <line key={i}
            x1={100 + 82 * Math.cos(a)} y1={96 + 82 * Math.sin(a)}
            x2={100 + 89 * Math.cos(a)} y2={96 + 89 * Math.sin(a)}
            stroke={h ? '#92400e' : '#1e3a5f'} strokeWidth="2.6"
          />
        );
      })}

      {/* Re-cover notch overlap */}
      <circle cx="100" cy="96" r="81" fill={`url(#${gid})`} />

      {h ? (
        /* ── HEADS: Pikachu face ── */
        <>
          {/* Left ear (black tip) */}
          <polygon points="60,68 45,18 78,55" fill="#1a1a1a" />
          {/* Left ear (yellow body) */}
          <polygon points="63,68 50,24 76,56" fill="#fbbf24" />

          {/* Right ear (black tip) */}
          <polygon points="140,68 155,18 122,55" fill="#1a1a1a" />
          {/* Right ear (yellow body) */}
          <polygon points="137,68 150,24 124,56" fill="#fbbf24" />

          {/* Face */}
          <circle cx="100" cy="108" r="54" fill="#fde68a" />

          {/* Eyes */}
          <ellipse cx="81"  cy="96" rx="8" ry="9" fill="#1a1a1a" />
          <ellipse cx="119" cy="96" rx="8" ry="9" fill="#1a1a1a" />
          <circle cx="84"   cy="92" r="2.5" fill="white" />
          <circle cx="122"  cy="92" r="2.5" fill="white" />

          {/* Red cheeks */}
          <ellipse cx="68"  cy="114" rx="14" ry="10" fill="#f87171" opacity="0.85" />
          <ellipse cx="132" cy="114" rx="14" ry="10" fill="#f87171" opacity="0.85" />

          {/* Nose */}
          <ellipse cx="100" cy="106" rx="3.5" ry="2.5" fill="#92400e" />

          {/* Mouth */}
          <path d="M 89 116 Q 100 126 111 116"
            stroke="#92400e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        /* ── TAILS: Pikachu lightning-bolt tail ── */
        <>
          {/* Brown tail base */}
          <ellipse cx="100" cy="158" rx="14" ry="9" fill="#78350f" />

          {/* Lightning bolt tail */}
          <polygon
            points="118,32 82,105 108,105 80,170 145,92 114,92 145,32"
            fill="#fbbf24"
          />
          {/* Inner highlight on bolt */}
          <polygon
            points="120,42 90,100 110,100 86,158 135,100 110,100 138,42"
            fill="#fef3c7" opacity="0.35"
          />
          {/* Bolt outline */}
          <polygon
            points="118,32 82,105 108,105 80,170 145,92 114,92 145,32"
            fill="none" stroke="#92400e" strokeWidth="2.5" strokeLinejoin="round"
          />
        </>
      )}

      {/* Specular highlight */}
      <circle cx="100" cy="96" r="81" fill={`url(#${gid}-hi)`} />
    </svg>
  );
}

export function CoinFlip({ compact = false }: { compact?: boolean }) {
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  // Tracks cumulative rotation so each flip continues from where it stopped
  const [spinTarget, setSpinTarget] = useState(0);

  const flip = () => {
    if (flipping) return;
    const outcome: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    setResult(outcome);
    setFlipping(true);
    setShowOverlay(true);
    setSpinTarget(prev => {
      // heads = 0° mod 360°, tails = 180° mod 360°
      const faceAngle = outcome === 'heads' ? 0 : 180;
      const currentMod = ((prev % 360) + 360) % 360;
      let toTarget = (faceAngle - currentMod + 360) % 360;
      if (toTarget === 0) toTarget = 360; // ensure at least one rotation to face
      return prev + 4 * 360 + toTarget;   // 4 full rotations + final arc to face
    });
    setTimeout(() => setFlipping(false), 1000);
  };

  const isHeads = result === 'heads';

  return (
    <>
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-pointer select-none"
            onClick={() => { if (!flipping) setShowOverlay(false); }}
          >
            <div className="flex flex-col items-center gap-10">
              {/* True 3D coin — Pikachu face front, lightning tail back */}
              <div style={{ perspective: 700 }}>
                <motion.div
                  style={{ transformStyle: 'preserve-3d', width: 220, height: 220, position: 'relative' }}
                  animate={{ rotateY: spinTarget }}
                  transition={flipping
                    ? { duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }
                    : { duration: 0 }
                  }
                >
                  {/* Front: heads (Pikachu face) */}
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
                    <CoinFace side="heads" size={220} />
                  </div>
                  {/* Back: tails (lightning tail) — pre-rotated 180° */}
                  <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                    <CoinFace side="tails" size={220} />
                  </div>
                </motion.div>
              </div>

              {/* Result text */}
              <AnimatePresence mode="wait">
                {result && !flipping && (
                  <motion.div
                    key={`${result}-${spinTarget}`}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 16, stiffness: 260 }}
                    className={`text-4xl font-black px-10 py-3 rounded-2xl border-2 tracking-widest ${
                      isHeads
                        ? 'bg-green-900/90 text-green-300 border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.35)]'
                        : 'bg-red-900/90 text-red-300 border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.35)]'
                    }`}
                  >
                    {isHeads ? 'HEADS' : 'TAILS'}
                  </motion.div>
                )}
                {flipping && (
                  <motion.div
                    key="flipping"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-gray-500 text-lg font-semibold tracking-widest"
                  >
                    FLIPPING...
                  </motion.div>
                )}
              </AnimatePresence>

              {result && !flipping && (
                <p className="text-gray-600 text-sm tracking-wide">Tap anywhere to close</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact button */}
      {compact ? (
        <button
          onClick={flip}
          disabled={flipping}
          className="relative w-10 h-10 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center text-xl hover:bg-yellow-500/30 active:scale-95 transition-all disabled:opacity-50 select-none"
        >
          🪙
          {result && !flipping && (
            <span className={`absolute -bottom-1 -right-1 text-[8px] font-black leading-none px-0.5 py-px rounded ${
              isHeads ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
              {isHeads ? 'H' : 'T'}
            </span>
          )}
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={flip}
            disabled={flipping}
            className="w-14 h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center text-2xl hover:bg-yellow-500/30 active:scale-95 transition-all disabled:opacity-50"
          >
            🪙
          </button>
          {result && !flipping && (
            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
              isHeads ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'
            }`}>
              {isHeads ? 'HEADS' : 'TAILS'}
            </span>
          )}
          <span className="text-xs text-gray-500">Coin Flip</span>
        </div>
      )}
    </>
  );
}
