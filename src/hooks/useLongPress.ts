import { useRef, useCallback } from 'react';

export function useLongPress(callback: () => void, delay = 500, interval = 120) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    timerRef.current = setTimeout(() => {
      repeatRef.current = setInterval(callback, interval);
    }, delay);
  }, [callback, delay, interval]);

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (repeatRef.current) clearInterval(repeatRef.current);
  }, []);

  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  };
}
