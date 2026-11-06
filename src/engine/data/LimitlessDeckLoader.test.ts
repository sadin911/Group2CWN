import { describe, it, expect } from 'vitest';
import {
  LIMITLESS_META_DECKS,
  buildMetaDeck,
  getMetaDeckById,
  deriveEnglishName,
} from './LimitlessDeckLoader';

describe('LimitlessDeckLoader', () => {
  it('loads all official Limitless tournament meta decks', () => {
    expect(LIMITLESS_META_DECKS.length).toBeGreaterThanOrEqual(20);
  });

  it('can look up meta decks by ID', () => {
    const dragapult = getMetaDeckById('meta-limitless-284');
    expect(dragapult).toBeDefined();
    expect(dragapult?.name).toBe('Dragapult ex');
    expect(dragapult?.tier).toBe('Tier 1');
  });

  it('builds exactly 60 cards for Dragapult ex with authentic attacks, abilities, and categories', () => {
    const deck = buildMetaDeck('meta-limitless-284');
    expect(deck.length).toBe(60);

    // 1. Dragapult ex has Phantom Dive
    const dragapult = deck.find((c) => c.nameEn === 'Dragapult ex');
    expect(dragapult).toBeDefined();
    expect(dragapult?.hp).toBe(320);
    expect(dragapult?.attacks?.some((a) => a.name === 'Phantom Dive')).toBe(true);

    // 2. Drakloak has Recon Directive
    const drakloak = deck.find((c) => c.nameEn === 'Drakloak');
    expect(drakloak).toBeDefined();
    expect(drakloak?.abilities?.some((a) => a.name === 'Recon Directive')).toBe(true);

    // 3. Fezandipiti ex has Flip the Script
    const fezandipiti = deck.find((c) => c.nameEn === 'Fezandipiti ex');
    expect(fezandipiti).toBeDefined();
    expect(fezandipiti?.abilities?.some((a) => a.name === 'Flip the Script')).toBe(true);

    // 4. Munkidori has Adrena-Brain
    const munkidori = deck.find((c) => c.nameEn === 'Munkidori');
    expect(munkidori).toBeDefined();
    expect(munkidori?.abilities?.some((a) => a.name === 'Adrena-Brain')).toBe(true);

    // 5. Check accurate Trainer categories
    const poffin = deck.find((c) => c.nameEn === 'Buddy-Buddy Poffin');
    expect(poffin).toBeDefined();
    expect(poffin?.supertype).toBe('Trainer');
    expect(poffin?.subtypes).toContain('Item');

    const lillie = deck.find((c) => c.nameEn === "Lillie's Determination");
    expect(lillie).toBeDefined();
    expect(lillie?.supertype).toBe('Trainer');
    expect(lillie?.subtypes).toContain('Supporter');

    const crispin = deck.find((c) => c.nameEn === 'Crispin');
    expect(crispin).toBeDefined();
    expect(crispin?.supertype).toBe('Trainer');
    expect(crispin?.subtypes).toContain('Supporter');

    const stamp = deck.find((c) => c.nameEn === 'Unfair Stamp');
    expect(stamp).toBeDefined();
    expect(stamp?.supertype).toBe('Trainer');
    expect(stamp?.subtypes).toContain('Item');
  });

  it('builds Raging Bolt ex with Bellowing Thunder and Teal Mask Ogerpon ex with Teal Dance', () => {
    const boltDeck = buildMetaDeck('meta-limitless-280');
    expect(boltDeck.length).toBe(60);

    const bolt = boltDeck.find((c) => c.nameEn === 'Raging Bolt ex');
    expect(bolt).toBeDefined();
    expect(bolt?.attacks?.some((a) => a.name === 'Bellowing Thunder')).toBe(true);

    const ogerpon = boltDeck.find((c) => c.nameEn === 'Teal Mask Ogerpon ex');
    expect(ogerpon).toBeDefined();
    expect(ogerpon?.abilities?.some((a) => a.name === 'Teal Dance')).toBe(true);
  });

  it('builds all 24 Limitless meta decks with exactly 60 cards and at least 1 Basic Pokemon', () => {
    for (const meta of LIMITLESS_META_DECKS) {
      const deck = buildMetaDeck(meta.id);
      expect(deck.length).toBe(60);
      const basics = deck.filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'));
      expect(basics.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('correctly derives English names for staples and Pokemon', () => {
    expect(deriveEnglishName('ไฮเปอร์บอล', undefined, 'Trainer')).toBe('Ultra Ball');
    expect(deriveEnglishName('เนสต์บอล', undefined, 'Trainer')).toBe('Nest Ball');
    expect(deriveEnglishName('คำสั่งของบอส', undefined, 'Trainer')).toBe("Boss's Orders");
    expect(deriveEnglishName('พลังงานไฟพื้นฐาน', undefined, 'Energy')).toBe('Basic Fire Energy');
  });
});
