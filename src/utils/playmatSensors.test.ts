import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestScreenWakeLock,
  releaseScreenWakeLock,
  isWakeLockActive,
  triggerHapticVibration,
} from './playmatSensors';

describe('playmatSensors utilities', () => {
  const originalNavigator = { ...globalThis.navigator };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await releaseScreenWakeLock();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  describe('triggerHapticVibration', () => {
    it('gracefully returns false when vibrate is not supported (e.g. iOS Safari)', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      });

      expect(triggerHapticVibration(20)).toBe(false);
    });

    it('triggers navigator.vibrate when available with number and preset strings', () => {
      const vibrateMock = vi.fn().mockReturnValue(true);
      Object.defineProperty(globalThis, 'navigator', {
        value: { vibrate: vibrateMock },
        configurable: true,
        writable: true,
      });

      const result = triggerHapticVibration([15, 30]);
      expect(result).toBe(true);
      expect(vibrateMock).toHaveBeenCalledWith([15, 30]);

      triggerHapticVibration('light');
      expect(vibrateMock).toHaveBeenCalledWith(15);
    });
  });

  describe('requestScreenWakeLock & releaseScreenWakeLock', () => {
    it('returns false when wakeLock API is unsupported', async () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {},
        configurable: true,
        writable: true,
      });

      const success = await requestScreenWakeLock();
      expect(success).toBe(false);
      expect(isWakeLockActive()).toBe(false);
    });

    it('requests screen sentinel and tracks active state when supported', async () => {
      const releaseMock = vi.fn().mockResolvedValue(undefined);
      const requestMock = vi.fn().mockResolvedValue({
        release: releaseMock,
      });

      Object.defineProperty(globalThis, 'navigator', {
        value: {
          wakeLock: {
            request: requestMock,
          },
        },
        configurable: true,
        writable: true,
      });

      const success = await requestScreenWakeLock();
      expect(success).toBe(true);
      expect(isWakeLockActive()).toBe(true);
      expect(requestMock).toHaveBeenCalledWith('screen');

      await releaseScreenWakeLock();
      expect(releaseMock).toHaveBeenCalled();
      expect(isWakeLockActive()).toBe(false);
    });
  });
});
