import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performSeamlessReload, _resetReloadingForTesting } from './useOTAUpdate';

describe('useOTAUpdate & performSeamlessReload', () => {
  const originalLocation = window.location;
  let reloadMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    _resetReloadingForTesting();
    reloadMock = vi.fn();
    // @ts-expect-error - mock location reload
    delete window.location;
    window.location = { ...originalLocation, reload: reloadMock } as any;
  });

  afterEach(() => {
    _resetReloadingForTesting();
    window.location = originalLocation as any;
    vi.restoreAllMocks();
  });

  it('immediately reloads if document is hidden (seamless background update)', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });

    performSeamlessReload('test-hidden');
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('defers reload if user is in an active Battle match', () => {
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.documentElement.dataset.gameMode = 'pokemon';

    performSeamlessReload('test-battle');
    // Should NOT reload immediately while visible in battle
    expect(reloadMock).not.toHaveBeenCalled();

    // When the user backgrounds the app during or after the battle:
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(reloadMock).toHaveBeenCalledTimes(1);
    delete document.documentElement.dataset.gameMode;
  });
});
