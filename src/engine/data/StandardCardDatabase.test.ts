import { describe, it, expect } from 'vitest';
import { StandardCardDatabase } from './StandardCardDatabase';

describe('StandardCardDatabase', () => {
  it('enriches Dragapult ex with authentic Phantom Dive attack and HP 320', () => {
    const enriched = StandardCardDatabase.enrichPokemon({
      nameEn: 'Dragapult ex',
      nameTh: 'โดราพัลท์ ex',
    });
    expect(enriched.hp).toBe(320);
    expect(enriched.energyType).toBe('Dragon');
    expect(enriched.attacks.some((a) => a.name === 'Phantom Dive')).toBe(true);
    const phantomDive = enriched.attacks.find((a) => a.name === 'Phantom Dive')!;
    expect(phantomDive.damage).toBe(200);
    expect(phantomDive.cost).toEqual({ Fire: 1, Psychic: 1 });
  });

  it('enriches Drakloak with Recon Directive ability and Headbutt attack', () => {
    const enriched = StandardCardDatabase.enrichPokemon({
      nameEn: 'Drakloak',
      nameTh: 'โดรอนจิ',
    });
    expect(enriched.abilities.length).toBeGreaterThan(0);
    const recon = enriched.abilities.find((a) => a.name === 'Recon Directive')!;
    expect(recon.trigger).toBe('activated');
    expect(recon.isGlobalOncePerTurn).toBe(false); // per-Pokemon rule
    expect(enriched.attacks.some((a) => a.name === 'Headbutt')).toBe(true);
  });

  it('enriches Charizard ex with on-evolution Infernal Reign ability', () => {
    const enriched = StandardCardDatabase.enrichPokemon({
      nameEn: 'Charizard ex',
      nameTh: 'ลิซาร์ดอน ex',
    });
    const infernal = enriched.abilities.find((a) => a.name === 'Infernal Reign')!;
    expect(infernal.trigger).toBe('on-evolution');
    const burning = enriched.attacks.find((a) => a.name === 'Burning Darkness')!;
    expect(burning.damage).toBe(180);
    expect(burning.cost).toEqual({ Fire: 2 });
  });

  it('enriches Budew with 0-energy Errand Running attack', () => {
    const enriched = StandardCardDatabase.enrichPokemon({
      nameEn: 'Budew',
      nameTh: 'ซึโบมี',
    });
    expect(enriched.attacks[0].name).toBe('Errand Running');
    expect(enriched.attacks[0].cost).toEqual({ Free: 0 });
    expect(StandardCardDatabase.canSatisfyCost([], { Free: 0 })).toBe(true);
  });

  it('accurately verifies energy cost satisfaction', () => {
    const phantomDiveCost = { Fire: 1, Psychic: 1 };
    expect(StandardCardDatabase.canSatisfyCost([{ energyType: 'Fire' }], phantomDiveCost)).toBe(false);
    expect(
      StandardCardDatabase.canSatisfyCost(
        [{ energyType: 'Fire' }, { energyType: 'Psychic' }],
        phantomDiveCost
      )
    ).toBe(true);

    const colorlessCost = { Colorless: 2 };
    expect(StandardCardDatabase.canSatisfyCost([{ energyType: 'Water' }], colorlessCost)).toBe(false);
    expect(
      StandardCardDatabase.canSatisfyCost(
        [{ energyType: 'Water' }, { energyType: 'Fire' }],
        colorlessCost
      )
    ).toBe(true);
  });
});
