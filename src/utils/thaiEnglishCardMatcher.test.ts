import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEnglishMatchForThaiCard,
  saveCardMapping,
  resetCardMapping,
  toggleMappingVerification,
  getCustomOverrides,
  setCloudApprovedMappings,
  getCloudApprovedMappings,
  type EnCardMapping,
} from './thaiEnglishCardMatcher';

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

describe('thaiEnglishCardMatcher', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('retrieves baseline match for mapped card', () => {
    // TH-1 is Scyther in baseline map
    const match = getEnglishMatchForThaiCard('TH-1');
    expect(match).toBeDefined();
    if (match) {
      expect(match.enName).toBe('Scyther');
      expect(match.confidence).toBeGreaterThanOrEqual(80);
    }
  });

  it('allows saving and retrieving custom user overrides', () => {
    const customMapping: EnCardMapping = {
      enCardId: 'EN-test-1',
      enName: 'Charizard ex Test',
      enSetId: 'sv3',
      enSetName: 'Obsidian Flames',
      enNumber: '125',
      enImageUrl: 'https://images.pokemontcg.io/sv3/125.png',
      confidence: 100,
      matchMethod: 'manual_override',
      verified: true,
      matchedAt: new Date().toISOString(),
    };

    saveCardMapping('TH-99999', customMapping);

    const overrides = getCustomOverrides();
    expect(overrides['TH-99999']).toBeDefined();
    expect(overrides['TH-99999'].enName).toBe('Charizard ex Test');
    expect(overrides['TH-99999'].userOverridden).toBe(true);

    const retrieved = getEnglishMatchForThaiCard('TH-99999');
    expect(retrieved?.enName).toBe('Charizard ex Test');
  });

  it('allows resetting custom overrides back to baseline', () => {
    const customMapping: EnCardMapping = {
      enCardId: 'EN-swsh2-4-override',
      enName: 'Custom Scyther',
      enSetId: 'custom',
      enSetName: 'Custom Set',
      enNumber: '99',
      enImageUrl: '',
      confidence: 100,
      matchMethod: 'manual_override',
      verified: true,
      matchedAt: new Date().toISOString(),
    };

    saveCardMapping('TH-1', customMapping);
    expect(getEnglishMatchForThaiCard('TH-1')?.enName).toBe('Custom Scyther');

    resetCardMapping('TH-1');
    expect(getEnglishMatchForThaiCard('TH-1')?.enName).toBe('Scyther');
  });

  it('toggles verification status', () => {
    const initial = getEnglishMatchForThaiCard('TH-1');
    const wasVerified = !!initial?.verified;

    toggleMappingVerification('TH-1', wasVerified);
    const updated = getEnglishMatchForThaiCard('TH-1');
    expect(updated?.verified).toBe(!wasVerified);
  });

  it('supports cloud approved mappings with correct precedence hierarchy', () => {
    const cloudMapping: EnCardMapping = {
      enCardId: 'EN-cloud-mew',
      enName: 'Mew ex Cloud Approved',
      enSetId: 'me1',
      enSetName: '151',
      enNumber: '151',
      enImageUrl: 'https://images.pokemontcg.io/me1/151.png',
      confidence: 100,
      matchMethod: 'community_approved',
      verified: true,
      matchedAt: new Date().toISOString(),
      userOverridden: false,
    };

    // 1. Initially TH-TEST-CARD has no match
    expect(getEnglishMatchForThaiCard('TH-TEST-CARD')).toBeNull();

    // 2. Set cloud approved mapping
    setCloudApprovedMappings({
      'TH-TEST-CARD': cloudMapping,
    });
    expect(getCloudApprovedMappings()['TH-TEST-CARD']?.enName).toBe('Mew ex Cloud Approved');

    // It should now resolve from cloud approved
    const matchFromCloud = getEnglishMatchForThaiCard('TH-TEST-CARD');
    expect(matchFromCloud?.enName).toBe('Mew ex Cloud Approved');
    expect(matchFromCloud?.matchMethod).toBe('community_approved');

    // 3. Local override takes precedence over cloud mapping
    const localOverride: EnCardMapping = {
      ...cloudMapping,
      enName: 'Mew ex Local Override',
      matchMethod: 'manual_override',
      userOverridden: true,
    };
    saveCardMapping('TH-TEST-CARD', localOverride);

    const matchFromLocal = getEnglishMatchForThaiCard('TH-TEST-CARD');
    expect(matchFromLocal?.enName).toBe('Mew ex Local Override');
    expect(matchFromLocal?.userOverridden).toBe(true);

    // 4. Resetting local override falls back to cloud approved mapping
    resetCardMapping('TH-TEST-CARD');
    const matchAfterReset = getEnglishMatchForThaiCard('TH-TEST-CARD');
    expect(matchAfterReset?.enName).toBe('Mew ex Cloud Approved');
  });
});
