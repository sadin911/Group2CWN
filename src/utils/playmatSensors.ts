/**
 * Playmat Device Sensor Utilities:
 * 1. Screen Wake Lock (prevents mobile/tablet screen dimming/sleep during games)
 * 2. Haptic Feedback (vibration cues for tactile feedback during card actions)
 */

let activeWakeLockSentinel: any = null;

export async function requestScreenWakeLock(): Promise<boolean> {
  if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
    return false;
  }
  try {
    if (document.visibilityState === 'visible') {
      activeWakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      return true;
    }
    return false;
  } catch {
    // Gracefully handle low battery, permission denial, or background tab
    return false;
  }
}

export async function releaseScreenWakeLock(): Promise<void> {
  try {
    if (activeWakeLockSentinel) {
      await activeWakeLockSentinel.release();
      activeWakeLockSentinel = null;
    }
  } catch {}
}

export function isWakeLockActive(): boolean {
  return activeWakeLockSentinel !== null;
}

export type HapticPattern = number | number[] | 'light' | 'medium' | 'heavy';

export function triggerHapticVibration(pattern: HapticPattern = 20): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      let resolvedPattern: number | number[] = 20;
      if (typeof pattern === 'string') {
        if (pattern === 'light') resolvedPattern = 15;
        else if (pattern === 'medium') resolvedPattern = 35;
        else if (pattern === 'heavy') resolvedPattern = [50, 30, 50];
      } else {
        resolvedPattern = pattern;
      }
      return navigator.vibrate(resolvedPattern);
    }
    return false;
  } catch {
    return false;
  }
}
