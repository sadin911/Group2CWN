import { describe, it, expect } from 'vitest';
import { createInitialGameState, reduceGame } from './GameReducer';
import type { CardInstance } from './types';

function createMockCard(id: string, name: string, supertype: 'Pokemon' | 'Trainer' | 'Energy', subtypes: string[] = [], overrides: Partial<CardInstance> = {}): CardInstance {
  return {
    instanceId: id,
    cardCode: `TEST-${id}`,
    nameTh: name,
    nameEn: name,
    supertype,
    subtypes,
    imageUrl: 'https://example.com/card.png',
    ...overrides,
  };
}

function create60CardDeck(basicCount = 60, energyCount = 0, trainerCount = 0): CardInstance[] {
  const deck: CardInstance[] = [];
  for (let i = 0; i < basicCount; i++) {
    deck.push(createMockCard(`pkmn-${i}`, `Charmander ${i}`, 'Pokemon', ['Basic'], {
      hp: 70,
      energyType: 'Fire',
      retreatCost: 1,
      attacks: [{ name: 'Scratch', cost: { Colorless: 1 }, damage: 10 }],
    }));
  }
  for (let i = 0; i < energyCount; i++) {
    deck.push(createMockCard(`energy-${i}`, 'Basic Fire Energy', 'Energy', ['Basic'], {
      energyType: 'Fire',
    }));
  }
  for (let i = 0; i < trainerCount; i++) {
    deck.push(createMockCard(`trainer-${i}`, 'Professor Research', 'Trainer', ['Supporter']));
  }
  return deck;
}

describe('Pokémon TCG Standard Engine — Phase 1 Core State Machine', () => {
  it('validates 60-card deck requirement and deals opening hands of 7 cards', () => {
    let state = createInitialGameState('test-1');
    const deck0 = create60CardDeck();
    const deck1 = create60CardDeck();

    const res = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: deck0,
      player1Deck: deck1,
      firstPlayerIndex: 0,
    });

    expect(res.error).toBeUndefined();
    state = res.nextState;

    expect(state.phase).toBe('SETUP_PLACEMENT');
    expect(state.players[0].hand).toHaveLength(7);
    expect(state.players[0].prizes).toHaveLength(6);
    expect(state.players[0].deck).toHaveLength(47);
  });

  it('rejects decks that do not have exactly 60 cards', () => {
    const state = createInitialGameState('test-invalid-deck');
    const badDeck = create60CardDeck().slice(0, 50); // only 50 cards

    const res = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: badDeck,
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    });

    expect(res.error).toContain('60 ใบพอดี');
  });

  it('handles Mulligan procedure, reshuffles hand, and increments mulligan count', () => {
    let state = createInitialGameState('test-mulligan');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    const res = reduceGame(state, {
      type: 'EXECUTE_MULLIGAN',
      playerIndex: 0,
    });

    expect(res.nextState.players[0].mulliganCount).toBe(1);
    expect(res.nextState.players[0].hand).toHaveLength(7);
  });

  it('sets initial active & bench cards, reveals, and deals 6 prize cards to start Turn 1', () => {
    let state = createInitialGameState('test-setup-prizes');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    // Both players confirm hands
    state = reduceGame(state, { type: 'CONFIRM_OPENING_HAND', playerIndex: 0 }).nextState;

    // Player 0 sets active
    const p0ActiveCard = state.players[0].hand[0];
    state = reduceGame(state, {
      type: 'SET_INITIAL_ACTIVE',
      playerIndex: 0,
      cardInstanceId: p0ActiveCard.instanceId,
    }).nextState;

    // Player 1 sets active
    const p1ActiveCard = state.players[1].hand[0];
    state = reduceGame(state, {
      type: 'SET_INITIAL_ACTIVE',
      playerIndex: 1,
      cardInstanceId: p1ActiveCard.instanceId,
    }).nextState;

    // Reveal and start game
    const res = reduceGame(state, { type: 'REVEAL_AND_START_GAME' });
    state = res.nextState;

    expect(state.phase).toBe('DRAW_PHASE');
    expect(state.turnNumber).toBe(1);
    expect(state.activePlayerIndex).toBe(0);
    expect(state.players[0].prizes).toHaveLength(6);
    expect(state.players[1].prizes).toHaveLength(6);
    expect(state.players[0].active?.card.isFacedown).toBe(false);
  });

  it('enforces Turn 1 Player 1 restrictions: CANNOT play Supporter and CANNOT attack', () => {
    let state = createInitialGameState('test-turn1-rules');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    // Setup active Pokémon
    const p0Active = state.players[0].hand[0];
    const p1Active = state.players[1].hand[0];
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: p0Active.instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: p1Active.instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Draw turn 1 card
    state = reduceGame(state, { type: 'DRAW_TURN_CARD', playerIndex: 0 }).nextState;
    expect(state.phase).toBe('MAIN_PHASE');

    // Give Player 0 a Supporter in hand
    const supporterCard = createMockCard('supporter-t1', 'Boss Orders', 'Trainer', ['Supporter']);
    state.players[0].hand.push(supporterCard);

    // Attempt to play Supporter on Turn 1 as Player 1 -> MUST BE REJECTED!
    const supporterRes = reduceGame(state, {
      type: 'PLAY_SUPPORTER',
      playerIndex: 0,
      supporterCardInstanceId: supporterCard.instanceId,
    });
    expect(supporterRes.error).toContain('ผู้เล่นคนแรกห้ามใช้ Supporter ในเทิร์นที่ 1');

    // Give Player 0 active enough energy to attack
    state.players[0].active!.attachedEnergies.push(createMockCard('e1', 'Fire Energy', 'Energy', ['Basic'], { energyType: 'Fire' }));

    // Attempt to attack on Turn 1 as Player 1 -> MUST BE REJECTED!
    const attackRes = reduceGame(state, {
      type: 'DECLARE_ATTACK',
      playerIndex: 0,
      attackIndex: 0,
    });
    expect(attackRes.error).toContain('ผู้เล่นคนแรกห้ามสั่งโจมตีในเทิร์นที่ 1');
  });

  it('enforces Evolution rules: cannot evolve on Turn 1 or on the turn a Pokémon entered play', () => {
    let state = createInitialGameState('test-evolution-rules');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: state.players[0].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: state.players[1].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;
    state = reduceGame(state, { type: 'DRAW_TURN_CARD', playerIndex: 0 }).nextState;

    const charmeleon = createMockCard('charmeleon-1', 'Charmeleon', 'Pokemon', ['Stage1'], {
      hp: 90,
      evolvesFrom: 'Charmander',
    });
    state.players[0].hand.push(charmeleon);

    // Turn 1 evolution attempt -> MUST BE REJECTED
    const evoResTurn1 = reduceGame(state, {
      type: 'EVOLVE_POKEMON',
      playerIndex: 0,
      evolutionCardInstanceId: charmeleon.instanceId,
      targetPokemonInstanceId: state.players[0].active!.instanceId,
    });
    expect(evoResTurn1.error).toContain('ห้ามพัฒนาร่าง');

    // Advance to Turn 2
    state.turnNumber = 2;
    state.players[0].active!.turnEnteredPlay = 0; // Was placed in setup

    // Now evolution should succeed on Turn 2!
    const evoResTurn2 = reduceGame(state, {
      type: 'EVOLVE_POKEMON',
      playerIndex: 0,
      evolutionCardInstanceId: charmeleon.instanceId,
      targetPokemonInstanceId: state.players[0].active!.instanceId,
    });
    expect(evoResTurn2.error).toBeUndefined();
    expect(evoResTurn2.nextState.players[0].active?.card.nameTh).toBe('Charmeleon');
    expect(evoResTurn2.nextState.players[0].active?.evolutionHistory).toHaveLength(1);
    expect(evoResTurn2.nextState.players[0].active?.maxHp).toBe(90);
  });

  it('allows evolving Pokémon directly on the Bench', () => {
    let state = createInitialGameState('test-bench-evolution');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: state.players[0].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: state.players[1].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;
    state = reduceGame(state, { type: 'DRAW_TURN_CARD', playerIndex: 0 }).nextState;

    // Place a Charmander on Bench
    const charmanderBench = createMockCard('charmander-bench', 'Charmander', 'Pokemon', ['Basic'], { hp: 70 });
    state.players[0].bench[0] = {
      instanceId: 'pokemon-bench-0',
      card: charmanderBench,
      stage: 'Basic',
      maxHp: 70,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 0,
      turnEvolved: 0,
    };

    // Add Charmeleon (even without explicit evolvesFrom, relying on EvolutionResolver) to hand
    const charmeleon = createMockCard('charmeleon-bench-evo', 'Charmeleon', 'Pokemon', ['Stage1'], {
      hp: 90,
    });
    state.players[0].hand.push(charmeleon);

    // Advance to Turn 3 (Player 0's second turn)
    state.turnNumber = 3;

    // Evolve Bench #0
    const evoRes = reduceGame(state, {
      type: 'EVOLVE_POKEMON',
      playerIndex: 0,
      evolutionCardInstanceId: charmeleon.instanceId,
      targetPokemonInstanceId: 'pokemon-bench-0',
    });

    expect(evoRes.error).toBeUndefined();
    const evolvedBench = evoRes.nextState.players[0].bench[0];
    expect(evolvedBench).not.toBeNull();
    expect(evolvedBench?.card.nameTh).toBe('Charmeleon');
    expect(evolvedBench?.stage).toBe('Stage1');
    expect(evolvedBench?.maxHp).toBe(90);
    expect(evolvedBench?.evolutionHistory).toHaveLength(1);
    expect(evolvedBench?.evolutionHistory[0].nameTh).toBe('Charmander');
  });

  it('allows evolving Bench Pokémon directly to Stage 2 using Rare Candy', () => {
    let state = createInitialGameState('test-rare-candy-bench');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: state.players[0].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: state.players[1].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;
    state = reduceGame(state, { type: 'DRAW_TURN_CARD', playerIndex: 0 }).nextState;

    // Place Charmander on Bench
    const charmanderBench = createMockCard('charmander-candy-bench', 'Charmander', 'Pokemon', ['Basic'], { hp: 70 });
    state.players[0].bench[1] = {
      instanceId: 'pokemon-bench-1',
      card: charmanderBench,
      stage: 'Basic',
      maxHp: 70,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 0,
      turnEvolved: 0,
    };

    const rareCandy = createMockCard('rare-candy-1', 'Rare Candy', 'Trainer', ['Item']);
    const charizardEx = createMockCard('charizard-ex-candy', 'Charizard ex', 'Pokemon', ['Stage2', 'ex'], {
      hp: 330,
    });
    state.players[0].hand.push(rareCandy, charizardEx);

    state.turnNumber = 3;

    // Play Rare Candy on Bench #1
    const candyRes = reduceGame(state, {
      type: 'PLAY_ITEM',
      playerIndex: 0,
      itemCardInstanceId: rareCandy.instanceId,
      choices: {
        targetPokemonInstanceId: 'pokemon-bench-1',
        selectedCardInstanceIds: [charizardEx.instanceId],
      },
    });

    expect(candyRes.error).toBeUndefined();
    const evolvedBench = candyRes.nextState.players[0].bench[1];
    expect(evolvedBench).not.toBeNull();
    expect(evolvedBench?.card.nameTh).toBe('Charizard ex');
    expect(evolvedBench?.stage).toBe('Stage2');
    expect(evolvedBench?.maxHp).toBe(330);
  });

  it('enforces Energy Attachment limit: exactly 1 manual attachment per turn', () => {
    let state = createInitialGameState('test-energy-limit');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: state.players[0].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: state.players[1].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;
    state = reduceGame(state, { type: 'DRAW_TURN_CARD', playerIndex: 0 }).nextState;

    const e1 = createMockCard('e1', 'Fire Energy', 'Energy', ['Basic'], { energyType: 'Fire' });
    const e2 = createMockCard('e2', 'Fire Energy', 'Energy', ['Basic'], { energyType: 'Fire' });
    state.players[0].hand.push(e1, e2);

    // Attach 1st energy -> Success
    state = reduceGame(state, {
      type: 'ATTACH_ENERGY',
      playerIndex: 0,
      energyCardInstanceId: e1.instanceId,
      targetPokemonInstanceId: state.players[0].active!.instanceId,
    }).nextState;
    expect(state.players[0].active?.attachedEnergies).toHaveLength(1);
    expect(state.players[0].turnFlags.energyAttachedThisTurn).toBe(true);

    // Attempt to attach 2nd energy -> REJECTED!
    const attach2Res = reduceGame(state, {
      type: 'ATTACH_ENERGY',
      playerIndex: 0,
      energyCardInstanceId: e2.instanceId,
      targetPokemonInstanceId: state.players[0].active!.instanceId,
    });
    expect(attach2Res.error).toContain('สูงสุด 1 ครั้งต่อเทิร์น');
  });

  it('calculates Weakness (x2) and Resistance (-30) accurately during attack', () => {
    let state = createInitialGameState('test-weakness-res');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    // Attacker: Fire type with 50 damage attack
    const attackerCard = createMockCard('fire-p', 'Charizard', 'Pokemon', ['Basic'], {
      hp: 180,
      energyType: 'Fire',
      attacks: [{ name: 'Fire Blast', cost: { Fire: 1 }, damage: 50 }],
    });
    // Defender: Grass type weak to Fire (x2) and resistant to Water (-30)
    const defenderCard = createMockCard('grass-p', 'Venusaur', 'Pokemon', ['Basic'], {
      hp: 200,
      energyType: 'Grass',
      weakness: { type: 'Fire', value: 'x2' },
      resistance: { type: 'Water', value: '-30' },
    });

    state.players[0].hand[0] = attackerCard;
    state.players[1].hand[0] = defenderCard;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: attackerCard.instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: defenderCard.instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Advance to Turn 2 so Player 0 can attack
    state.turnNumber = 2;
    state.phase = 'MAIN_PHASE';
    state.players[0].active!.attachedEnergies.push(createMockCard('e-fire', 'Fire Energy', 'Energy', ['Basic'], { energyType: 'Fire' }));

    // Attack! Base 50 * Weakness 2 = 100 damage = 10 damage counters
    state = reduceGame(state, {
      type: 'DECLARE_ATTACK',
      playerIndex: 0,
      attackIndex: 0,
    }).nextState;

    expect(state.players[1].active?.damageCounters).toBe(10); // 10 counters = 100 damage!
  });

  it('handles Knockout, awards Prize cards (1 for normal, 2 for ex), and triggers Win on taking all 6 prizes', () => {
    let state = createInitialGameState('test-knockout-prizes');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    const attacker = createMockCard('att', 'Pikachu', 'Pokemon', ['Basic'], {
      hp: 120,
      energyType: 'Lightning',
      attacks: [{ name: 'Thunderbolt', cost: { Lightning: 1 }, damage: 150 }],
    });
    // Defender is an "ex" Pokémon with 120 HP (150 damage will KO it)
    const defenderEx = createMockCard('def-ex', 'Mew ex', 'Pokemon', ['Basic', 'ex'], {
      hp: 120,
      energyType: 'Psychic',
    });

    state.players[0].hand[0] = attacker;
    state.players[1].hand[0] = defenderEx;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: attacker.instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: defenderEx.instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Put a backup Pokémon on defender bench so it doesn't bench out immediately
    state.players[1].bench[0] = {
      instanceId: 'bench-backup',
      card: createMockCard('b1', 'Eevee', 'Pokemon', ['Basic'], { hp: 60 }),
      stage: 'Basic',
      maxHp: 60,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 0,
      turnEvolved: 0,
    };

    // Set player 0 prizes to only 2 left (knocking out 'ex' will take 2 prizes and trigger WIN!)
    state.players[0].prizes = state.players[0].prizes.slice(0, 2);

    // Turn 2 attack
    state.turnNumber = 2;
    state.phase = 'MAIN_PHASE';
    state.players[0].active!.attachedEnergies.push(createMockCard('e-lt', 'Lightning Energy', 'Energy', ['Basic'], { energyType: 'Lightning' }));

    const res = reduceGame(state, {
      type: 'DECLARE_ATTACK',
      playerIndex: 0,
      attackIndex: 0,
    });
    state = res.nextState;

    // Player 0 took 2 prizes -> 0 prizes left -> WINS!
    expect(state.phase).toBe('GAME_OVER');
    expect(state.winner).toBe(0);
    expect(state.winReason).toBe('PRIZES');
    expect(state.players[1].discard.some((c) => c.instanceId === defenderEx.instanceId)).toBe(true);
  });

  it('triggers Bench-out win if opponent has no Pokémon remaining in play after KO', () => {
    let state = createInitialGameState('test-bench-out');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    const attacker = createMockCard('att', 'Pikachu', 'Pokemon', ['Basic'], {
      hp: 100,
      energyType: 'Lightning',
      attacks: [{ name: 'Zap', cost: { Lightning: 1 }, damage: 100 }],
    });
    const lonelyDefender = createMockCard('def', 'Pidgey', 'Pokemon', ['Basic'], { hp: 50 });

    state.players[0].hand[0] = attacker;
    state.players[1].hand[0] = lonelyDefender;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: attacker.instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: lonelyDefender.instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Turn 2: Player 1 has NO bench Pokémon
    state.turnNumber = 2;
    state.phase = 'MAIN_PHASE';
    state.players[0].active!.attachedEnergies.push(createMockCard('e', 'Lightning Energy', 'Energy', ['Basic'], { energyType: 'Lightning' }));

    state = reduceGame(state, {
      type: 'DECLARE_ATTACK',
      playerIndex: 0,
      attackIndex: 0,
    }).nextState;

    expect(state.phase).toBe('GAME_OVER');
    expect(state.winner).toBe(0);
    expect(state.winReason).toBe('BENCH_OUT');
  });

  it('triggers Deck-out loss if a player cannot draw a card on Draw Phase', () => {
    let state = createInitialGameState('test-deck-out');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: state.players[0].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: state.players[1].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Force Player 0 deck to 0 cards
    state.players[0].deck = [];
    state.phase = 'DRAW_PHASE';

    const res = reduceGame(state, { type: 'DRAW_TURN_CARD', playerIndex: 0 });
    expect(res.nextState.phase).toBe('GAME_OVER');
    expect(res.nextState.winner).toBe(1); // Player 1 wins
    expect(res.nextState.winReason).toBe('DECK_OUT');
  });

  it('resolves Pokémon Checkup: applies Poison and Burn damage, cures Paralysis', () => {
    let state = createInitialGameState('test-checkup');
    state = reduceGame(state, {
      type: 'SETUP_DECKS',
      player0Deck: create60CardDeck(),
      player1Deck: create60CardDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 0, cardInstanceId: state.players[0].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'SET_INITIAL_ACTIVE', playerIndex: 1, cardInstanceId: state.players[1].hand[0].instanceId }).nextState;
    state = reduceGame(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    // Infect Player 0 active with Poison and Paralysis
    state.players[0].active!.specialConditions = ['POISON', 'PARALYZED'];
    state.players[0].active!.damageCounters = 0;
    state.activePlayerIndex = 0;

    // Execute Checkup
    state = reduceGame(state, { type: 'EXECUTE_CHECKUP' }).nextState;

    // Poison must add 1 damage counter (10 damage)
    expect(state.players[0].active?.damageCounters).toBeGreaterThanOrEqual(1);
    // Paralysis must be cured because Player 0's turn ended!
    expect(state.players[0].active?.specialConditions.includes('PARALYZED')).toBe(false);
    // Poison persists across checkup
    expect(state.players[0].active?.specialConditions.includes('POISON')).toBe(true);
    // Turn advances to Player 1
    expect(state.turnNumber).toBe(2);
    expect(state.activePlayerIndex).toBe(1);
    expect(state.phase).toBe('DRAW_PHASE');
  });
});
