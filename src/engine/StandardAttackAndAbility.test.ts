import { describe, it, expect } from 'vitest';
import { ActionValidator } from './ActionValidator';
import { GameReducer, createInitialGameState } from './GameReducer';
import { StandardCardDatabase } from './data/StandardCardDatabase';
import type { PokemonInPlay, CardInstance } from './types';

function createMockPokemon(
  nameEn: string,
  hp: number = 100,
  energyType: string = 'Colorless'
): PokemonInPlay {
  const card: CardInstance = {
    instanceId: `card-${nameEn}-${Math.random().toString(36).slice(2, 6)}`,
    cardCode: `cid-${nameEn}`,
    nameTh: nameEn,
    nameEn: nameEn,
    supertype: 'Pokemon',
    subtypes: ['Basic'],
    hp,
    energyType: energyType as any,
    retreatCost: 1,
    attacks: [
      {
        name: 'Quick Strike',
        damage: 30,
        cost: { Colorless: 1 },
      },
    ],
  };

  const enriched = StandardCardDatabase.enrichPokemon(card);

  return {
    instanceId: `poke-${nameEn}-${Math.random().toString(36).slice(2, 6)}`,
    card: enriched,
    stage: 'Basic',
    maxHp: enriched.hp || hp,
    damageCounters: 0,
    attachedEnergies: [],
    attachedTool: null,
    evolutionHistory: [],
    specialConditions: [],
    turnEnteredPlay: 1,
    turnEvolved: 0,
  };
}

function createMockEnergy(type: string = 'Fire'): CardInstance {
  return {
    instanceId: `energy-${type}-${Math.random().toString(36).slice(2, 6)}`,
    cardCode: `cid-energy-${type}`,
    nameTh: `${type} Energy`,
    nameEn: `Basic ${type} Energy`,
    supertype: 'Energy',
    subtypes: ['Basic'],
    energyType: type as any,
  };
}

describe('Standard Attack & Ability Verification', () => {
  it('enforces attack energy costs and rejects attacks without required energy', () => {
    let state = createInitialGameState();
    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    const charizard = createMockPokemon('Charizard ex', 330, 'Darkness');
    const defender = createMockPokemon('Miraidon ex', 220, 'Lightning');

    state.players[0].active = charizard;
    state.players[1].active = defender;

    // Burning Darkness costs Fire: 2
    // Currently 0 energies attached -> must fail validation
    const val0 = ActionValidator.canDeclareAttack(state, 0, 0);
    expect(val0.valid).toBe(false);
    expect(val0.error).toContain('พลังงานที่ติดอยู่ไม่เพียงพอ');

    // Attach 1 Fire energy -> still insufficient (needs 2)
    charizard.attachedEnergies.push(createMockEnergy('Fire'));
    const val1 = ActionValidator.canDeclareAttack(state, 0, 0);
    expect(val1.valid).toBe(false);

    // Attach 2nd Fire energy -> valid!
    charizard.attachedEnergies.push(createMockEnergy('Fire'));
    const val2 = ActionValidator.canDeclareAttack(state, 0, 0);
    expect(val2.valid).toBe(true);
  });

  it('calculates Weakness (x2) and applies accurate damage counters to defender', () => {
    let state = createInitialGameState();
    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    // Attacker: Raikou V (Lightning type, Lightning Rondo)
    const raikou = createMockPokemon('Raikou V', 200, 'Lightning');
    raikou.attachedEnergies.push(createMockEnergy('Lightning'), createMockEnergy('Colorless'));

    // Defender: Pidgeot ex (Colorless type, Weakness: Lightning x2)
    const pidgeot = createMockPokemon('Pidgeot ex', 280, 'Colorless');
    pidgeot.card.weakness = { type: 'Lightning', value: 'x2' as const };

    state.players[0].active = raikou;
    state.players[1].active = pidgeot;

    // 0 benched pokemon: Lightning Rondo base = 20 + 0 = 20 damage. Weakness x2 = 40 damage.
    const res = GameReducer(state, {
      type: 'DECLARE_ATTACK',
      playerIndex: 0,
      attackIndex: 0, // Lightning Rondo
    });

    expect(res.error).toBeUndefined();
    expect(res.nextState.players[1].active?.damageCounters).toBe(4); // 40 damage = 4 damage counters
    expect(res.nextState.phase).toBe('CHECKUP_PHASE');
  });

  it('processes Knockout, takes prize cards, sets pokemonKnockedOutLastTurn, and initiates PROMOTION_PHASE', () => {
    let state = createInitialGameState();
    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    // Attacker: Roaring Moon ex (Calamity Storm: 220 with Stadium)
    const roaringMoon = createMockPokemon('Roaring Moon ex', 230, 'Darkness');
    roaringMoon.attachedEnergies.push(createMockEnergy('Darkness'), createMockEnergy('Darkness'), createMockEnergy('Colorless'));

    // Defender: Squawkabilly ex (160 HP, 2 prize card Pokémon)
    const squawk = createMockPokemon('Squawkabilly ex', 160, 'Colorless');
    squawk.card.subtypes.push('ex');

    // Defender Bench: Mew ex
    const benchedMew = createMockPokemon('Mew ex', 180, 'Psychic');

    state.players[0].active = roaringMoon;
    state.players[0].prizes = [
      createMockEnergy('Fire'),
      createMockEnergy('Fire'),
      createMockEnergy('Fire'),
      createMockEnergy('Fire'),
      createMockEnergy('Fire'),
      createMockEnergy('Fire'),
    ];

    state.players[1].active = squawk;
    state.players[1].bench[0] = benchedMew;

    state.stadium = {
      instanceId: 'stadium-1',
      cardCode: 'cid-stadium',
      nameTh: 'PokéStop',
      nameEn: 'PokéStop',
      supertype: 'Trainer',
      subtypes: ['Stadium'],
    };

    // Calamity Storm (attack index 1): 220 damage, discards stadium
    const res = GameReducer(state, {
      type: 'DECLARE_ATTACK',
      playerIndex: 0,
      attackIndex: 1,
    });

    expect(res.error).toBeUndefined();
    const next = res.nextState;

    // Defender should be knocked out and removed from active spot
    expect(next.players[1].active).toBeNull();
    expect(next.players[1].turnFlags.pokemonKnockedOutLastTurn).toBe(true);

    // Took 2 prize cards (ex card)
    expect(next.players[0].prizes.length).toBe(4);
    expect(next.players[0].hand.length).toBe(2);

    // Stadium was discarded by Calamity Storm
    expect(next.stadium).toBeNull();

    // Defender must promote bench to active
    expect(next.phase).toBe('PROMOTION_PHASE');
    expect(next.pendingPromotionForPlayer).toBe(1);
  });

  it('rejects on-evolution abilities from manual click on field', () => {
    let state = createInitialGameState();
    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    const charizard = createMockPokemon('Charizard ex', 330, 'Darkness');
    state.players[0].active = charizard;

    // Charizard ex has Infernal Reign (on-evolution)
    const ability = charizard.card.abilities?.find((a) => a.name === 'Infernal Reign');
    expect(ability).toBeDefined();
    expect(ability?.trigger).toBe('on-evolution');

    // Attempting to manually click/activate on field must fail
    const val = ActionValidator.canUseAbility(state, 0, charizard, 'Infernal Reign');
    expect(val.valid).toBe(false);
    expect(val.error).toContain('เมื่อวิวัฒนาการจากการ์ดบนมือเท่านั้น');
  });

  it('supports per-instance once-per-turn ability tracking for Drakloak Recon Directive', () => {
    let state = createInitialGameState();
    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    const drakloak1 = createMockPokemon('Drakloak', 90, 'Dragon');
    const drakloak2 = createMockPokemon('Drakloak', 90, 'Dragon');

    state.players[0].active = drakloak1;
    state.players[0].bench[0] = drakloak2;
    state.players[0].deck = [
      createMockEnergy('Fire'),
      createMockEnergy('Psychic'),
      createMockEnergy('Grass'),
      createMockEnergy('Water'),
    ];

    // Drakloak 1 can use Recon Directive
    const val1 = ActionValidator.canUseAbility(state, 0, drakloak1, 'Recon Directive');
    expect(val1.valid).toBe(true);

    const res1 = GameReducer(state, {
      type: 'USE_ABILITY',
      playerIndex: 0,
      sourcePokemonInstanceId: drakloak1.instanceId,
      abilityName: 'Recon Directive',
    });
    expect(res1.error).toBeUndefined();

    // Drakloak 1 cannot use it again
    const val1Again = ActionValidator.canUseAbility(res1.nextState, 0, drakloak1, 'Recon Directive');
    expect(val1Again.valid).toBe(false);

    // BUT Drakloak 2 CAN still use Recon Directive in the same turn!
    const val2 = ActionValidator.canUseAbility(res1.nextState, 0, drakloak2, 'Recon Directive');
    expect(val2.valid).toBe(true);

    const res2 = GameReducer(res1.nextState, {
      type: 'USE_ABILITY',
      playerIndex: 0,
      sourcePokemonInstanceId: drakloak2.instanceId,
      abilityName: 'Recon Directive',
    });
    expect(res2.error).toBeUndefined();

    // Now both have used it
    expect(ActionValidator.canUseAbility(res2.nextState, 0, drakloak2, 'Recon Directive').valid).toBe(false);
  });

  it('enforces global once-per-turn limit for Pidgeot ex Quick Search', () => {
    let state = createInitialGameState();
    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    const pidgeot1 = createMockPokemon('Pidgeot ex', 280, 'Colorless');
    const pidgeot2 = createMockPokemon('Pidgeot ex', 280, 'Colorless');

    state.players[0].active = pidgeot1;
    state.players[0].bench[0] = pidgeot2;
    state.players[0].deck = [createMockEnergy('Fire')];

    // Pidgeot 1 uses Quick Search
    const res1 = GameReducer(state, {
      type: 'USE_ABILITY',
      playerIndex: 0,
      sourcePokemonInstanceId: pidgeot1.instanceId,
      abilityName: 'Quick Search',
    });
    expect(res1.error).toBeUndefined();

    // Pidgeot 2 CANNOT use Quick Search because Quick Search is globally once per turn
    const val2 = ActionValidator.canUseAbility(res1.nextState, 0, pidgeot2, 'Quick Search');
    expect(val2.valid).toBe(false);
    expect(val2.error).toContain('จำกัด 1 ครั้งต่อเทิร์น');
  });
});
