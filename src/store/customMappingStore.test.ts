import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCustomMappingStore } from './customMappingStore';

vi.mock('firebase/firestore', () => ({
  doc: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  collection: (...segments: unknown[]) => ({ path: segments.slice(1).join('/') }),
  setDoc: vi.fn(async () => undefined),
  getDocs: vi.fn(async () => ({ empty: true, forEach: () => {} })),
  deleteDoc: vi.fn(async () => undefined),
}));

vi.mock('../utils/firebase', () => ({
  db: {},
}));

function installMemoryStorage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => {
      data.clear();
    },
    get length() {
      return data.size;
    },
    key: (index: number) => Array.from(data.keys())[index] ?? null,
  });
}

describe('customMappingStore', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    useCustomMappingStore.setState({ mappings: {} });
  });

  it('sets and persists a custom card mapping', async () => {
    const store = useCustomMappingStore.getState();

    await store.setMapping('Super Rod Custom', {
      id: 'TH-9999',
      name: 'เบ็ดตกปลาชั้นยอด',
      set: { id: 'SV2D' },
    });

    const state = useCustomMappingStore.getState();
    const mapping = state.mappings['super rod custom'];
    expect(mapping).toBeDefined();
    expect(mapping.cardId).toBe('TH-9999');
    expect(mapping.cardNameTh).toBe('เบ็ดตกปลาชั้นยอด');

    // Check mapping dictionary
    const dict = state.getMappingDictionary();
    expect(dict['super rod custom']).toBe('TH-9999');

    // Check localStorage persistence
    const raw = localStorage.getItem('pokecount_user_card_mappings_v1');
    expect(raw).toContain('TH-9999');
  });

  it('removes a custom mapping', async () => {
    const store = useCustomMappingStore.getState();

    await store.setMapping('Unwanted Card', {
      id: 'TH-1234',
      name: 'การ์ดทดสอบ',
    });

    expect(useCustomMappingStore.getState().mappings['unwanted card']).toBeDefined();

    await store.removeMapping('Unwanted Card');
    expect(useCustomMappingStore.getState().mappings['unwanted card']).toBeUndefined();
  });
});
