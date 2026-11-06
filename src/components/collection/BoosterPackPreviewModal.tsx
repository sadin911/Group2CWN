import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { handleBoosterImageError } from '../../utils/boosterImages';

interface Props {
  setId: string;
  setName: string;
  boosterImageUrl: string;
  totalCards?: number;
  uniqueOwned?: number;
  totalCount?: number;
  percentage?: number;
  onClose: () => void;
}

export function BoosterPackPreviewModal({
  setId,
  setName,
  boosterImageUrl,
  totalCards,
  uniqueOwned,
  totalCount,
  percentage,
  onClose,
}: Props) {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 dark:bg-black/90 backdrop-blur-md p-4 select-none overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative max-w-md w-full flex flex-col items-center gap-4 my-auto py-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Bar */}
          <div className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-400 text-slate-950 font-black text-xs shadow-md shadow-yellow-400/25 ring-1 ring-yellow-300/50 shrink-0">
                {setId}
              </span>
              <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                {setName}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 text-slate-500 dark:text-slate-400 hover:text-white transition-all active:scale-95 border border-slate-200 dark:border-slate-700"
              title="ปิด (ESC)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Booster Pack Image Frame */}
          <div
            className={`relative group rounded-3xl overflow-hidden shadow-2xl p-2 transition-all duration-300 cursor-pointer ${
              isZoomed ? 'scale-110' : 'hover:scale-[1.02]'
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
            title="คลิกเพื่อซูมเข้า/ออก"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 via-pink-500/10 to-amber-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
            <img
              src={boosterImageUrl}
              alt={`ซองการ์ดชุด ${setName} (${setId})`}
              className="relative max-h-[60vh] sm:max-h-[65vh] w-auto object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.5)] rounded-2xl"
              loading="eager"
              onError={(e) => handleBoosterImageError(e, setId)}
            />
          </div>

          {/* Bottom Info Card */}
          {totalCards !== undefined && (
            <div className="w-full text-center px-4 py-3 rounded-2xl bg-white/95 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700/80 shadow-xl backdrop-blur-sm space-y-1.5">
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                สะสมแล้ว <span className="text-purple-700 dark:text-yellow-300 font-extrabold">{uniqueOwned}</span> จากทั้งหมด{' '}
                <span className="text-slate-900 dark:text-slate-100 font-extrabold">{totalCards}</span> แบบ (รวม{' '}
                <span className="text-blue-600 dark:text-blue-300 font-bold">{totalCount}</span> ใบ)
              </p>
              {percentage !== undefined && (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-36 bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-slate-700">
                    <div
                      className="bg-gradient-to-r from-yellow-400 to-amber-500 h-full rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-purple-700 dark:text-yellow-300">
                    {percentage}%
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                คลิกรูปซองเพื่อซูมเข้า/ออก • กด ESC เพื่อปิด
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
