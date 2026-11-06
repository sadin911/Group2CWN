import { useEffect, useCallback } from 'react';
import {
  requestScreenWakeLock,
  releaseScreenWakeLock,
  triggerHapticVibration,
  type HapticPattern,
} from '../utils/playmatSensors';

interface PlaymatSensorsOptions {
  keepAwake?: boolean;
}

/**
 * Hook for Playmat sensors:
 * - Keeps screen awake on tablet/mobile during match
 * - Re-acquires wake lock upon visibilitychange (app resume)
 * - Provides safe haptic vibration cues for card placements
 */
export function usePlaymatSensors(options: PlaymatSensorsOptions = { keepAwake: true }) {
  useEffect(() => {
    if (!options.keepAwake) return;

    requestScreenWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestScreenWakeLock();
      } else {
        releaseScreenWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseScreenWakeLock();
    };
  }, [options.keepAwake]);

  const vibrate = useCallback((pattern: HapticPattern = 20) => {
    return triggerHapticVibration(pattern);
  }, []);

  return { vibrate };
}
