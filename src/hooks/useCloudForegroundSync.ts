import { useEffect, useRef } from 'react';
import { auth } from '../utils/firebase';
import { useCollectionStore } from '../store/collectionStore';
import { useDeckStore } from '../store/deckStore';

const SYNC_THROTTLE_MS = 15_000; // Throttle to at most once per 15 seconds

/**
 * Automatically reconciles collection binders and decks with Firebase Cloud
 * whenever the user switches back to the application (foreground resume on mobile PWA or tab focus on desktop).
 */
export function useCloudForegroundSync(): void {
  const lastSyncTimeRef = useRef<number>(0);

  useEffect(() => {
    const triggerForegroundSync = async () => {
      const user = auth.currentUser;
      if (!user?.uid) return;

      const now = Date.now();
      if (now - lastSyncTimeRef.current < SYNC_THROTTLE_MS) {
        return;
      }
      lastSyncTimeRef.current = now;

      try {
        await Promise.all([
          useCollectionStore.getState().reconcileWithCloud(user.uid),
          useDeckStore.getState().loadUserDecksFromCloud(user.uid),
        ]);
      } catch (err) {
        console.warn('[useCloudForegroundSync] Background reconcile error:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void triggerForegroundSync();
      }
    };

    const handleFocus = () => {
      void triggerForegroundSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}
