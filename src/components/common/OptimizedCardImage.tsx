import React, { useState, useEffect, useRef } from 'react';

// In-memory cache for all image URLs loaded during this session
export const globalLoadedImageCache = new Set<string>();

/**
 * Preload a list of card image URLs in the background.
 * Browser caches them so when they enter viewport they render immediately.
 */
export function preloadCardImages(urls: (string | undefined | null)[]) {
  if (typeof window === 'undefined') return;

  const runPreload = () => {
    urls.forEach((url) => {
      if (!url || globalLoadedImageCache.has(url)) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
      img.onload = () => globalLoadedImageCache.add(url);
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(runPreload, { timeout: 1500 });
  } else {
    setTimeout(runPreload, 100);
  }
}

interface OptimizedCardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onLoad?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function OptimizedCardImage({
  src,
  alt,
  priority = false,
  className = '',
  containerClassName = '',
  onError,
  onLoad,
  ...rest
}: OptimizedCardImageProps) {
  const isAlreadyLoaded = Boolean(src && globalLoadedImageCache.has(src));
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyLoaded);
  const [shouldLoad, setShouldLoad] = useState<boolean>(priority || isAlreadyLoaded);
  const [hasTerminalError, setHasTerminalError] = useState<boolean>(false);
  const [isStalled, setIsStalled] = useState<boolean>(false);
  const [retryKey, setRetryKey] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync loaded state when src changes
  useEffect(() => {
    if (src && globalLoadedImageCache.has(src)) {
      setIsLoaded(true);
      setShouldLoad(true);
      setHasTerminalError(false);
      setIsStalled(false);
    } else if (!priority) {
      setIsLoaded(false);
      setHasTerminalError(false);
      setIsStalled(false);
    }
  }, [src, priority]);

  // Watchdog timer: if network/CDN stalls for 6s, mark stalled and dismiss skeleton
  useEffect(() => {
    if (!shouldLoad || isLoaded) return;
    const timer = setTimeout(() => {
      setIsStalled(true);
      setIsLoaded(true);
    }, 6000);
    return () => clearTimeout(timer);
  }, [shouldLoad, isLoaded, retryKey]);

  // Ahead-of-time IntersectionObserver with 1000px margin (approx. 2 screens ahead)
  useEffect(() => {
    if (shouldLoad || priority) return;

    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        root: null,
        rootMargin: '1000px 0px', // Fetch 1,000px before scrolling into viewport
        threshold: 0,
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad, priority]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (src) {
      globalLoadedImageCache.add(src);
    }
    setIsLoaded(true);
    setIsStalled(false);
    setHasTerminalError(false);
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (onError) {
      onError(e);
    }
    const target = e.currentTarget;
    if (target && target.src && (target.src.includes('card-placeholder.svg') || target.dataset.finalError === 'true')) {
      setHasTerminalError(true);
      setIsStalled(false);
    }
    // Always mark isLoaded as true on error so skeleton shimmer is dismissed
    setIsLoaded(true);
  };

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoaded(false);
    setIsStalled(false);
    setHasTerminalError(false);
    setRetryKey((k) => k + 1);
  };

  const effectiveSrc = retryKey > 0 && src
    ? (src.includes('?') ? `${src}&rk=${retryKey}` : `${src}?rk=${retryKey}`)
    : src;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden ${containerClassName}`}
    >
      {/* Skeleton Shimmer Placeholder (visible only while loading and not yet cached/errored) */}
      {!isLoaded && !hasTerminalError && (
        <div
          className="absolute inset-0 z-0 bg-slate-900/90 dark:bg-slate-950 flex items-center justify-center overflow-hidden"
          aria-hidden="true"
        >
          {/* Pokéball Wireframe Watermark */}
          <div className="w-12 h-12 rounded-full border-2 border-slate-700/40 relative flex items-center justify-center opacity-40">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700/40 -translate-y-1/2" />
            <div className="w-4 h-4 rounded-full border-2 border-slate-700/50 bg-slate-900 z-10" />
          </div>

          {/* Shimmer Light Sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-skeleton-shimmer pointer-events-none" />
        </div>
      )}

      {/* Stalled Loading Indicator with Tap to Reload */}
      {isStalled && !hasTerminalError && !isAlreadyLoaded && (
        <div className="absolute inset-0 z-10 bg-slate-900/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-2 text-center select-none animate-in fade-in duration-200">
          <span className="text-base mb-1">⏳</span>
          <span className="text-[10px] font-bold text-slate-300">โหลดรูปช้ากว่าปกติ</span>
          <button
            type="button"
            onClick={handleManualRetry}
            className="mt-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span>
            <span>แตะเพื่อโหลดใหม่</span>
          </button>
        </div>
      )}

      {/* Terminal Error Fallback Card Display */}
      {hasTerminalError && (
        <div className="absolute inset-0 z-0 bg-slate-800 dark:bg-slate-900 border border-slate-700/60 rounded-lg flex flex-col items-center justify-center p-2 text-center select-none">
          <div className="w-10 h-10 rounded-full border-2 border-slate-600/40 flex items-center justify-center mb-1.5 opacity-60">
            <span className="text-sm">🎴</span>
          </div>
          <span className="text-[11px] font-medium text-slate-300 line-clamp-2 px-1">{alt}</span>
          <button
            type="button"
            onClick={handleManualRetry}
            className="mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1 active:scale-95 cursor-pointer"
          >
            <span>🔄</span>
            <span>โหลดใหม่</span>
          </button>
        </div>
      )}

      {/* Actual Image */}
      {shouldLoad && effectiveSrc && (
        <img
          key={retryKey}
          src={effectiveSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...(priority ? { fetchPriority: 'high' } : {})}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`${className} ${
            isLoaded && !hasTerminalError ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-200 ease-out`}
          {...rest}
        />
      )}
    </div>
  );
}
