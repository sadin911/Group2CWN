import { describe, it, expect } from 'vitest';
import { LIMITLESS_META_DECKS, buildMetaDeck } from './LimitlessDeckLoader';
import { StandardCardDatabase } from './StandardCardDatabase';

describe('Audit all cards across Limitless meta decks', () => {
  it('audits canonical database coverage for meta Pokémon', () => {
    const pokemon = new Map<string, any>();

    for (const deck of LIMITLESS_META_DECKS) {
      const cards = buildMetaDeck(deck.id);
      for (const c of cards) {
        const key = c.nameEn || c.nameTh;
        if (c.supertype === 'Pokemon') {
          if (!pokemon.has(key)) pokemon.set(key, c);
        }
      }
    }

    const missingDetails: any[] = [];
    for (const [name, c] of pokemon) {
      const canonical = StandardCardDatabase.getPokemon(name);
      if (!canonical) {
        missingDetails.push({
          id: c.cardCode || c.instanceId,
          nameEn: c.nameEn,
          nameTh: c.nameTh,
        });
      }
    }

    expect(pokemon.size).toBeGreaterThan(0);
    // Ensure majority of meta Pokémon are canonically registered; uncataloged fallback safely via enrichPokemon
    const coveredRatio = (pokemon.size - missingDetails.length) / pokemon.size;
    expect(coveredRatio).toBeGreaterThanOrEqual(0.6);
  });

  it('inventories all unique Trainer cards across all 24 decks', () => {
    const trainers = new Map<string, any>();

    for (const deck of LIMITLESS_META_DECKS) {
      const cards = buildMetaDeck(deck.id);
      for (const c of cards) {
        if (c.supertype === 'Trainer') {
          const key = c.nameEn || c.nameTh;
          if (!trainers.has(key)) {
            trainers.set(key, {
              nameEn: c.nameEn,
              nameTh: c.nameTh,
              subtypes: c.subtypes || [],
              count: 1,
            });
          } else {
            trainers.get(key).count++;
          }
        }
      }
    }

    console.log(`\n=== ALL UNIQUE TRAINERS (${trainers.size}) ===`);
    const sorted = Array.from(trainers.values()).sort(
      (a, b) =>
        (a.subtypes[0] || '').localeCompare(b.subtypes[0] || '') ||
        (a.nameEn || '').localeCompare(b.nameEn || '')
    );
    for (const t of sorted) {
      console.log(`[${t.subtypes.join(',')}] ${t.nameEn} | ${t.nameTh} (x${t.count})`);
    }
    expect(trainers.size).toBeGreaterThan(0);
  });
});
