import { useState, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  disabled?: boolean;
  pullThreshold?: number;
}

export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
  pullThreshold = 58,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const hasTriggeredHapticRef = useRef(false);

  const isAtTop = () => {
    const root = document.getElementById("root");
    const rootScroll = root ? root.scrollTop : 0;
    const scrollY =
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;
    return scrollY <= 5 && rootScroll <= 5;
  };

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshing || e.touches.length !== 1) return;

      startYRef.current = e.touches[0].clientY;
      startXRef.current = e.touches[0].clientX;
      isPullingRef.current = false;
      hasTriggeredHapticRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || e.touches.length !== 1) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      // If user was scrolling up and hit the top, recalibrate start point
      if (scrollTop <= 5 && startYRef.current < currentY && !isPullingRef.current) {
        startYRef.current = currentY;
        startXRef.current = currentX;
      }

      const deltaY = currentY - startYRef.current;
      const deltaX = currentX - startXRef.current;

      // Only engage if pulling downwards at top and gesture is predominantly vertical
      if (deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX) * 1.1 && isAtTop()) {
        isPullingRef.current = true;
        const damped = Math.min(95, Math.pow(deltaY, 0.85) * 1.9);
        pullDistanceRef.current = damped;
        setPullDistance(damped);

        if (damped >= pullThreshold && !hasTriggeredHapticRef.current) {
          hasTriggeredHapticRef.current = true;
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate(18);
            } catch (_) {}
          }
        } else if (damped < pullThreshold) {
          hasTriggeredHapticRef.current = false;
        }

        if (e.cancelable && damped > 8) {
          e.preventDefault();
        }
      } else {
        if (isPullingRef.current || pullDistanceRef.current > 0) {
          isPullingRef.current = false;
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current && pullDistanceRef.current === 0) return;
      const triggered = pullDistanceRef.current >= pullThreshold;
      isPullingRef.current = false;

      if (triggered && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(pullThreshold * 0.85);

        try {
          await onRefresh();
          setIsSuccess(true);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try {
              navigator.vibrate([15, 40, 20]);
            } catch (_) {}
          }
          await new Promise((r) => setTimeout(r, 650));
        } catch (err) {
          console.error("Pull-to-refresh error:", err);
        } finally {
          setTimeout(() => {
            setIsRefreshing(false);
            setIsSuccess(false);
            setPullDistance(0);
            pullDistanceRef.current = 0;
          }, 350);
        }
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [disabled, isRefreshing, onRefresh, pullThreshold]);

  const isReadyToRelease = pullDistance >= pullThreshold;

  return (
    <div className="relative w-full min-h-full">
      {/* Pull-To-Refresh Floating Indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{
              opacity: isRefreshing ? 1 : Math.min(1, Math.max(0, pullDistance / 24)),
              y: Math.min(pullDistance, 75),
            }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 26, stiffness: 350 }}
            className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none select-none"
            style={{
              paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
            }}
          >
            <div
              className={`flex items-center gap-2.5 px-4 py-2 rounded-full shadow-2xl border backdrop-blur-xl transition-all duration-200 ${
                isSuccess
                  ? "bg-emerald-600/95 text-white border-emerald-300 shadow-emerald-500/40"
                  : isReadyToRelease || isRefreshing
                  ? "bg-purple-600/95 dark:bg-purple-900/95 text-white border-purple-300 dark:border-yellow-400/50 shadow-purple-600/40"
                  : "bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700 shadow-slate-950/20"
              }`}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center transition-transform ${
                  isRefreshing
                    ? "animate-spin"
                    : isSuccess
                    ? "scale-110"
                    : ""
                }`}
                style={{
                  transform: isRefreshing
                    ? undefined
                    : `rotate(${pullDistance * 4.2}deg) scale(${Math.min(0.85 + pullDistance / 90, 1.15)})`,
                }}
              >
                {isSuccess ? (
                  <span className="text-xs font-black text-white">✓</span>
                ) : (
                  <img
                    src={`${import.meta.env.BASE_URL}pwa-192x192.png?v=3`}
                    alt="PokeCount Logo"
                    className="w-full h-full object-cover rounded-full drop-shadow"
                  />
                )}
              </div>

              <span className="text-xs font-bold tracking-tight">
                {isSuccess
                  ? "รีเฟรชและล้าง Filter สำเร็จ!"
                  : isRefreshing
                  ? "กำลังรีเฟรชและล้าง Filter..."
                  : isReadyToRelease
                  ? "ปล่อยเพื่อรีเฟรชและล้าง Filter ✨"
                  : "ดึงลงเพื่อรีเฟรชและล้าง Filter"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Children */}
      <div className="w-full min-h-full">
        {children}
      </div>
    </div>
  );
}
