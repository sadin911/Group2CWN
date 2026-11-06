import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface OTAUpdateState {
  needRefresh: boolean;
  offlineReady: boolean;
  isChecking: boolean;
  isUpdating: boolean;
  statusMessage: string | null;
  checkForUpdates: () => Promise<void>;
  updateNow: () => Promise<void>;
  dismissNotification: () => void;
}

// Global state holders for multi-component subscription
type Listener = () => void;
let globalNeedRefresh = false;
let globalOfflineReady = false;
let globalIsChecking = false;
let globalIsUpdating = false;
let globalStatusMessage: string | null = null;
const listeners = new Set<Listener>();

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let isReloading = false;

export function _resetReloadingForTesting() {
  isReloading = false;
  globalIsUpdating = false;
  globalStatusMessage = null;
}

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Performs a seamless update reload.
 * - If the document is hidden (background tab / minimized app), reloads immediately with 0 disruption.
 * - If the document is visible, briefly displays a subtle status indicator and reloads.
 * - If currently in battle mode, defers the reload until battle ends or tab is hidden.
 */
export function performSeamlessReload(_reason = 'update') {
  if (isReloading) return;

  // Background/hidden: reload immediately, user sees new version upon switching back
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    isReloading = true;
    window.location.reload();
    return;
  }

  // Defer if user is actively in a Battle match
  try {
    const isBattle = typeof document !== 'undefined' && document.documentElement.dataset.gameMode === 'pokemon';
    if (isBattle) {
      const onHidden = () => {
        if (document.visibilityState === 'hidden' && !isReloading) {
          isReloading = true;
          document.removeEventListener('visibilitychange', onHidden);
          window.location.reload();
        }
      };
      document.addEventListener('visibilitychange', onHidden);
      return;
    }
  } catch {
    // Ignore error in non-DOM environments
  }

  isReloading = true;
  globalIsUpdating = true;
  globalStatusMessage = 'อัปเดตเวอร์ชันใหม่เรียบร้อยแล้ว...';
  notify();

  setTimeout(() => {
    window.location.reload();
  }, 600);
}

// Initialize SW registration once
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    updateSWFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Automatically perform seamless reload without requiring manual prompt clicks
        if (updateSWFn) {
          updateSWFn(true).catch(() => performSeamlessReload('onNeedRefresh'));
        } else {
          performSeamlessReload('onNeedRefresh');
        }
      },
      onOfflineReady() {
        globalOfflineReady = true;
        notify();
      },
      onRegistered(registration) {
        if (registration) {
          // Periodically check for updates every 15 minutes
          setInterval(() => {
            registration.update().catch(() => {});
          }, 15 * 60 * 1000);
        }
      },
      onRegisterError(error) {
        console.warn('PWA SW registration error:', error);
      },
    });

    // Listen for service worker takeover when autoUpdate skipWaiting activates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      performSeamlessReload('controllerchange');
    });
  } catch (err) {
    console.warn('Could not initialize registerSW:', err);
  }

  // Check for updates on window visibility focus
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        reg?.update().catch(() => {});
      });
    }
  });

  // Gracefully handle dynamic chunk missing errors after deployments
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    performSeamlessReload('vite:preloadError');
  });
}

export function useOTAUpdate(): OTAUpdateState {
  const [, setTick] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const listener = () => {
      if (isMounted.current) {
        setTick((t) => t + 1);
      }
    };
    listeners.add(listener);
    return () => {
      isMounted.current = false;
      listeners.delete(listener);
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    globalIsChecking = true;
    globalStatusMessage = null;
    notify();

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting) {
            globalStatusMessage = 'กำลังโหลดเวอร์ชันล่าสุด...';
            notify();
            if (updateSWFn) {
              await updateSWFn(true);
            } else {
              performSeamlessReload('manual');
            }
            return;
          }
        }
      }

      // Check if server returns new content
      const res = await fetch(window.location.href, {
        method: 'HEAD',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
      });

      if (res.ok) {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg?.waiting) {
          globalStatusMessage = 'กำลังโหลดเวอร์ชันล่าสุด...';
          notify();
          if (updateSWFn) {
            await updateSWFn(true);
          } else {
            performSeamlessReload('manual');
          }
        } else {
          globalStatusMessage = '✓ แอปของคุณเป็นเวอร์ชันล่าสุดแล้ว';
          notify();
          setTimeout(() => {
            if (globalStatusMessage?.includes('ล่าสุด')) {
              globalStatusMessage = null;
              notify();
            }
          }, 2500);
        }
      }
    } catch (err) {
      console.warn('Error checking OTA update:', err);
      globalStatusMessage = 'ไม่สามารถตรวจสอบการอัปเดตได้ในขณะนี้';
      notify();
      setTimeout(() => {
        globalStatusMessage = null;
        notify();
      }, 2500);
    } finally {
      globalIsChecking = false;
      notify();
    }
  }, []);

  const updateNow = useCallback(async () => {
    performSeamlessReload('updateNow');
  }, []);

  const dismissNotification = useCallback(() => {
    globalNeedRefresh = false;
    globalStatusMessage = null;
    notify();
  }, []);

  return {
    needRefresh: globalNeedRefresh,
    offlineReady: globalOfflineReady,
    isChecking: globalIsChecking,
    isUpdating: globalIsUpdating,
    statusMessage: globalStatusMessage,
    checkForUpdates,
    updateNow,
    dismissNotification,
  };
}
