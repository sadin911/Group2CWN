---
name: pwa-offline-state-management
description: Advanced Zustand sliced state architecture with offline-first indexing, cloud-write guardrails, reconciliation conflict resolution, and memory safety for rich PWAs.
---

# PWA Offline & Sliced State Management (`pwa-offline-state-management`)

Comprehensive engineering manual for building robust, offline-capable, and quota-safe client state architectures in Progressive Web Applications.

---

## 1. Store Architecture & Slice Separation

In a feature-rich PWA, never merge all reactive states into a single giant store. Partition them by lifecycle and volatility:

```text
src/store/
├── authStore.ts           # Authentication session & cloud tokens
├── collectionStore.ts     # Persistent local cache + offline sync queue
├── deckStore.ts           # User working decks & validation status
├── gameStore.ts           # Highly volatile active match / battle session
├── customBinderStore.ts   # Heavy local media / view configurations
└── themeStore.ts          # Pure UI display preferences
```

### Golden Rules of Slicing
1. **Volatile vs Persistent Separation**: An active battle state (`gameStore`) changes multiple times per second; keep it separate from large collection catalogues to prevent full-tree re-renders.
2. **Selective State Subscriptions**:
   ```typescript
   // ❌ Bad: Subscribes to the entire store, causing re-render on any change
   const { activeDeck, updateCard } = useDeckStore();

   // ✅ Good: Subscribe strictly to the needed primitive or memoized selector
   const activeDeck = useDeckStore((state) => state.activeDeck);
   const updateCard = useDeckStore((state) => state.updateCard);
   ```

---

## 2. The Cloud-Write Guard Layer

Remote database writes (Firebase Firestore / Cloudflare D1 / Supabase) must never be bound directly to rapid UI events (e.g. dragging cards, tapping counters, keystrokes).

### 2.1 The 3-Tier Protection Pattern
1. **Optimistic Local Update**: Update the Zustand store immediately so the UI responds at 60/120 FPS.
2. **Debounced Staging Queue**: Accumulate mutations into an in-memory queue.
3. **Guarded Batch Flush**: Flush to remote storage only when network is online and quota limits are respected.

```typescript
// Pattern: Cloud-Write Guard Implementation
interface CloudGuardOptions {
  debounceMs: number;
  maxBatchSize: number;
}

export function createCloudGuard<T>(
  flushFn: (items: T[]) => Promise<void>,
  options: CloudGuardOptions = { debounceMs: 1500, maxBatchSize: 500 }
) {
  let queue: T[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (item: T) => {
    queue.push(item);

    if (queue.length >= options.maxBatchSize) {
      flush();
      return;
    }

    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, options.debounceMs);
  };

  async function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;

    const payload = [...queue];
    queue = [];

    try {
      if (!navigator.onLine) {
        // Enqueue to IndexedDB for offline background sync
        await persistOfflineQueue(payload);
        return;
      }
      await flushFn(payload);
    } catch (error) {
      // Re-queue on transient network failure
      queue.unshift(...payload);
      console.warn('Cloud guard flush failed, re-queued items:', error);
    }
  }
}
```

---

## 3. Conflict Resolution & Sync Reconciliation

When a device reconnects after being offline, local changes can collide with remote server state.

### Resolution Protocol:
- **Timestamped Mutations**: Store every mutation with an ISO-8601 UTC timestamp and an internal sequence number.
- **Three-Way Merge**:
  1. If remote version > local version and local is pristine: Accept remote.
  2. If local has uncommitted offline mutations: Apply Last-Write-Wins (LWW) at field level, never discard the user's local edits without an explicit user prompt.
  3. When in doubt, fork conflicting deck or collection versions and append `(Local Copy)`.

---

## 4. Verification & Testing

Every state slice with cloud syncing must have dedicated unit tests verifying edge cases:
- Quota throttling: ensure 10 rapid clicks result in exactly 1 batch write.
- Offline recovery: verify queue retains items when `navigator.onLine === false`.
- Run tests via:
  ```bash
  npm test src/store/collectionStore.cloudGuard.test.ts
  npm test src/store/collectionStore.syncReconcile.test.ts
  ```
