import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocalMetaDeckOverrides,
  setLocalMetaDeckOverrides,
  getMergedMetaDecks,
  exportMetaDecksJson,
  saveMetaDeckOverride,
  resetMetaDeckOverride,
} from './metaDeckService';
import type { MetaDeck } from '../types/metaDeck';

// Mock Firestore
vi.mock('../utils/firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
  }),
  setDoc: vi.fn().mockResolvedValue(undefined),
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

describe('metaDeckService', () => {
  const sampleDeck: MetaDeck = {
    id: 'test-deck-1',
    name: 'Sample Test Deck',
    tier: 'Tier 1',
    playstyle: 'Setup',
    cards: {
      'TH-1001': { cardId: 'TH-1001', count: 4 },
      'TH-1002': { cardId: 'TH-1002', count: 4 },
    },
    keyPokemon: ['โปเกมอนทดสอบ'],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  beforeEach(() => {
    installMemoryStorage();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('correctly reads and writes overrides in localStorage', () => {
    expect(getLocalMetaDeckOverrides()).toEqual({});

    const mockOverrides = {
      'test-deck-1': {
        ...sampleDeck,
        name: 'Modified Test Deck',
      },
    };

    setLocalMetaDeckOverrides(mockOverrides);
    expect(getLocalMetaDeckOverrides()).toEqual(mockOverrides);
  });

  it('merges overrides onto base meta decks and flags isOverridden', () => {
    const baseDecks = [sampleDeck];
    const overrides = {
      'test-deck-1': {
        ...sampleDeck,
        name: 'Updated Name by Admin',
        cards: {
          'TH-9999': { cardId: 'TH-9999', count: 4 }, // Remapped
        },
      },
    };

    const merged = getMergedMetaDecks(baseDecks, overrides);
    expect(merged.length).toBe(1);
    expect(merged[0].name).toBe('Updated Name by Admin');
    expect(merged[0].cards['TH-9999']).toBeDefined();
    expect(merged[0].isOverridden).toBe(true);
  });

  it('preserves base deck unmodified if no override exists', () => {
    const baseDecks = [sampleDeck];
    const merged = getMergedMetaDecks(baseDecks, {});
    expect(merged.length).toBe(1);
    expect(merged[0].name).toBe('Sample Test Deck');
    expect(merged[0].isOverridden).toBe(false);
  });

  it('saves an override and updates local cache', async () => {
    const modifiedDeck: MetaDeck = {
      ...sampleDeck,
      name: 'Admin Remapped Deck',
    };

    await saveMetaDeckOverride(modifiedDeck, 'admin@test.com');
    const overrides = getLocalMetaDeckOverrides();
    expect(overrides['test-deck-1']).toBeDefined();
    expect(overrides['test-deck-1'].name).toBe('Admin Remapped Deck');
  });

  it('resets an override when requested', async () => {
    const modifiedDeck: MetaDeck = {
      ...sampleDeck,
      name: 'Admin Remapped Deck',
    };

    await saveMetaDeckOverride(modifiedDeck);
    expect(getLocalMetaDeckOverrides()['test-deck-1']).toBeDefined();

    await resetMetaDeckOverride('test-deck-1');
    expect(getLocalMetaDeckOverrides()['test-deck-1']).toBeUndefined();
  });

  it('exports merged meta decks as a valid clean JSON string without isOverridden flags', () => {
    const baseDecks = [sampleDeck];
    const overrides = {
      'test-deck-1': {
        ...sampleDeck,
        name: 'Exported Clean Deck',
      },
    };

    const jsonString = exportMetaDecksJson(baseDecks, overrides);
    const parsed = JSON.parse(jsonString);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].name).toBe('Exported Clean Deck');
    expect(parsed[0].isOverridden).toBeUndefined();
  });
});
