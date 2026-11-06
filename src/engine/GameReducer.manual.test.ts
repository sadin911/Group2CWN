import { describe, it, expect, beforeEach } from 'vitest';
import { reduceGame, createInitialGameState } from './GameReducer';
import type { GameState, CardInstance, PokemonInPlay } from './types';

function createMockCard(id: string, name: string, supertype: 'Pokemon' | 'Trainer' | 'Energy', subtypes: string[] = ['Basic'], hp?: number): CardInstance {
  return {
    instanceId: id,
    cardCode: id,
    nameTh: name,
    nameEn: name,
    supertype,
    subtypes,
    hp,
    energyType: supertype === 'Pokemon' ? 'Fire' : undefined,
    isFacedown: false,
  };
}

describe('Playmat V3: Tabletop Sandbox & Manual Actions (GameReducer)', () => {
  let state: GameState;

  beforeEach(() => {
    state = createInitialGameState('test-tabletop-001');
    state.turnNumber = 1;
    state.activePlayerIndex = 0;
    state.phase = 'MAIN_PHASE';

    // Player 0 setup
    const p0Active: PokemonInPlay = {
      instanceId: 'p0-active-mon',
      card: createMockCard('c-charmander', 'Charmander', 'Pokemon', ['Basic'], 70),
      stage: 'Basic',
      maxHp: 70,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 0,
    };
    state.players[0].active = p0Active;
    state.players[0].hand = [
      createMockCard('c-fire-1', 'Basic Fire Energy', 'Energy', ['Basic']),
      createMockCard('c-charmeleon', 'Charmeleon', 'Pokemon', ['Stage 1'], 100),
      createMockCard('c-belt', 'Choice Belt', 'Trainer', ['Pokémon Tool', 'Tool']),
    ];
    state.players[0].deck = [
      createMockCard('d-1', 'Deck Card 1', 'Trainer', ['Item']),
      createMockCard('d-2', 'Deck Card 2', 'Trainer', ['Item']),
      createMockCard('d-3', 'Deck Card 3', 'Trainer', ['Item']),
    ];
    state.players[0].prizes = [
      createMockCard('pz-1', 'Prize 1', 'Pokemon', ['Basic']),
      createMockCard('pz-2', 'Prize 2', 'Pokemon', ['Basic']),
    ];

    // Player 1 setup
    const p1Active: PokemonInPlay = {
      instanceId: 'p1-active-mon',
      card: createMockCard('c-miraidon', 'Miraidon ex', 'Pokemon', ['Basic', 'ex'], 220),
      stage: 'Basic',
      maxHp: 220,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 0,
    };
    const p1Bench: PokemonInPlay = {
      instanceId: 'p1-bench-mon',
      card: createMockCard('c-mareep', 'Mareep', 'Pokemon', ['Basic'], 60),
      stage: 'Basic',
      maxHp: 60,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 0,
    };
    state.players[1].active = p1Active;
    state.players[1].bench[0] = p1Bench;
    state.players[1].prizes = [
      createMockCard('pz-p1-1', 'Prize P1 1', 'Pokemon', ['Basic']),
    ];
  });

  describe('1. MANUAL_DRAW_CARDS', () => {
    it('draws specified number of cards from deck to hand', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_DRAW_CARDS',
        playerIndex: 0,
        count: 2,
      });

      expect(nextState.players[0].hand.length).toBe(5);
      expect(nextState.players[0].deck.length).toBe(1);
    });

    it('handles drawing more cards than available in deck gracefully', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_DRAW_CARDS',
        playerIndex: 0,
        count: 10,
      });

      expect(nextState.players[0].hand.length).toBe(6);
      expect(nextState.players[0].deck.length).toBe(0);
    });
  });

  describe('2. MANUAL_MOVE_CARD', () => {
    it('moves card from hand to discard', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_MOVE_CARD',
        playerIndex: 0,
        cardInstanceId: 'c-fire-1',
        fromZone: 'HAND',
        toZone: 'DISCARD',
      });

      expect(nextState.players[0].hand.some((c) => c.instanceId === 'c-fire-1')).toBe(false);
      expect(nextState.players[0].discard.some((c) => c.instanceId === 'c-fire-1')).toBe(true);
    });

    it('moves card from discard back to hand', () => {
      state.players[0].discard.push(createMockCard('disc-1', 'Super Rod', 'Trainer', ['Item']));
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_MOVE_CARD',
        playerIndex: 0,
        cardInstanceId: 'disc-1',
        fromZone: 'DISCARD',
        toZone: 'HAND',
      });

      expect(nextState.players[0].discard.length).toBe(0);
      expect(nextState.players[0].hand.some((c) => c.instanceId === 'disc-1')).toBe(true);
    });

    it('moves card from deck to top or bottom of deck', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_MOVE_CARD',
        playerIndex: 0,
        cardInstanceId: 'd-1',
        fromZone: 'DECK',
        toZone: 'DECK',
        deckPosition: 'BOTTOM',
      });

      expect(nextState.players[0].deck[nextState.players[0].deck.length - 1].instanceId).toBe('d-1');
    });

    it('moves card from hand to empty bench slot', () => {
      const basicCard = createMockCard('c-charmander-2', 'Charmander 2', 'Pokemon', ['Basic'], 70);
      state.players[0].hand.push(basicCard);

      const { nextState } = reduceGame(state, {
        type: 'MANUAL_MOVE_CARD',
        playerIndex: 0,
        cardInstanceId: 'c-charmander-2',
        fromZone: 'HAND',
        toZone: 'BENCH',
        benchIndex: 0,
      });

      expect(nextState.players[0].bench[0]).not.toBeNull();
      expect(nextState.players[0].bench[0]?.card.instanceId).toBe('c-charmander-2');
    });
  });

  describe('3. Damage Counters & Manipulation', () => {
    it('adjusts damage counters with MANUAL_ADJUST_DAMAGE', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_ADJUST_DAMAGE',
        targetPokemonInstanceId: 'p0-active-mon',
        damageDelta: 50,
      });

      expect(nextState.players[0].active?.damageCounters).toBe(50);

      // Decreasing damage counters (healing)
      const { nextState: healedState } = reduceGame(nextState, {
        type: 'MANUAL_ADJUST_DAMAGE',
        targetPokemonInstanceId: 'p0-active-mon',
        damageDelta: -20,
      });

      expect(healedState.players[0].active?.damageCounters).toBe(30);
    });

    it('sets damage directly with MANUAL_SET_DAMAGE', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_SET_DAMAGE',
        targetPokemonInstanceId: 'p0-active-mon',
        damage: 60,
      });

      expect(nextState.players[0].active?.damageCounters).toBe(60);
    });

    it('moves damage counters with MANUAL_MOVE_DAMAGE', () => {
      state.players[0].active!.damageCounters = 60;

      const { nextState } = reduceGame(state, {
        type: 'MANUAL_MOVE_DAMAGE',
        sourcePokemonInstanceId: 'p0-active-mon',
        targetPokemonInstanceId: 'p1-active-mon',
        counters: 30,
      });

      expect(nextState.players[0].active?.damageCounters).toBe(30);
      expect(nextState.players[1].active?.damageCounters).toBe(30);
    });
  });

  describe('4. Energy Attachment & Detachment', () => {
    it('attaches energy from hand using MANUAL_ATTACH_ENERGY', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_ATTACH_ENERGY',
        playerIndex: 0,
        cardInstanceId: 'c-fire-1',
        fromZone: 'HAND',
        targetPokemonInstanceId: 'p0-active-mon',
      });

      expect(nextState.players[0].active?.attachedEnergies.length).toBe(1);
      expect(nextState.players[0].active?.attachedEnergies[0].instanceId).toBe('c-fire-1');
      expect(nextState.players[0].hand.some((c) => c.instanceId === 'c-fire-1')).toBe(false);
    });

    it('moves attached energy with MANUAL_MOVE_ENERGY', () => {
      state.players[0].active?.attachedEnergies.push(createMockCard('nrg-1', 'Fire Energy', 'Energy', ['Basic']));
      const p0Bench: PokemonInPlay = {
        instanceId: 'p0-bench-mon',
        card: createMockCard('c-benched', 'Pidgey', 'Pokemon', ['Basic'], 60),
        stage: 'Basic',
        maxHp: 60,
        damageCounters: 0,
        attachedEnergies: [],
        attachedTool: null,
        evolutionHistory: [],
        specialConditions: [],
        turnEnteredPlay: 1,
        turnEvolved: 0,
      };
      state.players[0].bench[0] = p0Bench;

      const { nextState } = reduceGame(state, {
        type: 'MANUAL_MOVE_ENERGY',
        sourcePokemonInstanceId: 'p0-active-mon',
        targetPokemonInstanceId: 'p0-bench-mon',
        energyInstanceId: 'nrg-1',
      });

      expect(nextState.players[0].active?.attachedEnergies.length).toBe(0);
      expect(nextState.players[0].bench[0]?.attachedEnergies.length).toBe(1);
      expect(nextState.players[0].bench[0]?.attachedEnergies[0].instanceId).toBe('nrg-1');
    });

    it('discards attached energy with MANUAL_DISCARD_ATTACHMENT', () => {
      state.players[0].active?.attachedEnergies.push(createMockCard('nrg-1', 'Fire Energy', 'Energy', ['Basic']));

      const { nextState } = reduceGame(state, {
        type: 'MANUAL_DISCARD_ATTACHMENT',
        targetPokemonInstanceId: 'p0-active-mon',
        attachmentInstanceId: 'nrg-1',
        toZone: 'DISCARD',
      });

      expect(nextState.players[0].active?.attachedEnergies.length).toBe(0);
      expect(nextState.players[0].discard.some((c) => c.instanceId === 'nrg-1')).toBe(true);
    });
  });

  describe('5. Tool Attachment & Discard', () => {
    it('attaches tool with MANUAL_ATTACH_TOOL', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_ATTACH_TOOL',
        playerIndex: 0,
        toolCardInstanceId: 'c-belt',
        fromZone: 'HAND',
        targetPokemonInstanceId: 'p0-active-mon',
      });

      expect(nextState.players[0].active?.attachedTool?.instanceId).toBe('c-belt');
      expect(nextState.players[0].hand.some((c) => c.instanceId === 'c-belt')).toBe(false);
    });

    it('discards tool with MANUAL_DISCARD_TOOL', () => {
      state.players[0].active!.attachedTool = createMockCard('c-belt', 'Choice Belt', 'Trainer', ['Tool']);

      const { nextState } = reduceGame(state, {
        type: 'MANUAL_DISCARD_TOOL',
        targetPokemonInstanceId: 'p0-active-mon',
        toZone: 'DISCARD',
      });

      expect(nextState.players[0].active?.attachedTool).toBeNull();
      expect(nextState.players[0].discard.some((c) => c.instanceId === 'c-belt')).toBe(true);
    });
  });

  describe('6. Evolution & De-Evolution', () => {
    it('evolves pokemon manually with MANUAL_EVOLVE', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_EVOLVE',
        playerIndex: 0,
        evolutionCardInstanceId: 'c-charmeleon',
        fromZone: 'HAND',
        targetPokemonInstanceId: 'p0-active-mon',
      });

      expect(nextState.players[0].active?.card.nameEn).toBe('Charmeleon');
      expect(nextState.players[0].active?.stage).toBe('Stage1');
      expect(nextState.players[0].active?.maxHp).toBe(100);
      expect(nextState.players[0].active?.evolutionHistory.length).toBe(1);
      expect(nextState.players[0].active?.evolutionHistory[0].nameEn).toBe('Charmander');
    });

    it('de-evolves pokemon with MANUAL_DEVOLVE retaining damage counters', () => {
      // Setup evolved state with damage
      state.players[0].active!.card = createMockCard('c-charmeleon', 'Charmeleon', 'Pokemon', ['Stage 1'], 100);
      state.players[0].active!.evolutionHistory = [createMockCard('c-charmander', 'Charmander', 'Pokemon', ['Basic'], 70)];
      state.players[0].active!.stage = 'Stage1';
      state.players[0].active!.maxHp = 100;
      state.players[0].active!.damageCounters = 50;

      const { nextState } = reduceGame(state, {
        type: 'MANUAL_DEVOLVE',
        targetPokemonInstanceId: 'p0-active-mon',
        toZone: 'HAND',
      });

      expect(nextState.players[0].active?.card.nameEn).toBe('Charmander');
      expect(nextState.players[0].active?.stage).toBe('Basic');
      expect(nextState.players[0].active?.maxHp).toBe(70);
      expect(nextState.players[0].active?.damageCounters).toBe(50); // Damage counters remain
      expect(nextState.players[0].hand.some((c) => c.nameEn === 'Charmeleon')).toBe(true);
    });
  });

  describe('7. Switching & Gusting', () => {
    it('switches player active with bench using MANUAL_SWITCH_POKEMON', () => {
      const p0Bench: PokemonInPlay = {
        instanceId: 'p0-bench-mon',
        card: createMockCard('c-pidgey', 'Pidgey', 'Pokemon', ['Basic'], 60),
        stage: 'Basic',
        maxHp: 60,
        damageCounters: 0,
        attachedEnergies: [],
        attachedTool: null,
        evolutionHistory: [],
        specialConditions: [],
        turnEnteredPlay: 1,
        turnEvolved: 0,
      };
      state.players[0].bench[0] = p0Bench;
      state.players[0].active!.specialConditions = ['POISON'];

      const { nextState } = reduceGame(state, {
        type: 'MANUAL_SWITCH_POKEMON',
        playerIndex: 0,
        benchIndex: 0,
      });

      expect(nextState.players[0].active?.card.nameEn).toBe('Pidgey');
      expect(nextState.players[0].bench[0]?.card.nameEn).toBe('Charmander');
      expect(nextState.players[0].bench[0]?.specialConditions).toEqual([]); // Cleared on retreat/switch
    });

    it('gusts opponent bench using MANUAL_GUST_OPPONENT', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_GUST_OPPONENT',
        playerIndex: 0,
        opponentBenchIndex: 0,
      });

      expect(nextState.players[1].active?.card.nameEn).toBe('Mareep');
      expect(nextState.players[1].bench[0]?.card.nameEn).toBe('Miraidon ex');
    });
  });

  describe('8. Special Conditions', () => {
    it('toggles special conditions on active pokemon', () => {
      const { nextState: poisoned } = reduceGame(state, {
        type: 'MANUAL_TOGGLE_STATUS',
        playerIndex: 0,
        condition: 'POISON',
        value: true,
      });

      expect(poisoned.players[0].active?.specialConditions).toContain('POISON');

      const { nextState: cleared } = reduceGame(poisoned, {
        type: 'MANUAL_CLEAR_STATUS',
        playerIndex: 0,
      });

      expect(cleared.players[0].active?.specialConditions).toEqual([]);
    });
  });

  describe('9. Prize Cards', () => {
    it('takes prize cards with MANUAL_TAKE_PRIZE', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_TAKE_PRIZE',
        playerIndex: 0,
        count: 1,
      });

      expect(nextState.players[0].prizes.length).toBe(1);
      expect(nextState.players[0].hand.length).toBe(4);
    });

    it('swaps card with prize using MANUAL_SWAP_PRIZE', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_SWAP_PRIZE',
        playerIndex: 0,
        prizeIndex: 0,
        handCardInstanceId: 'c-fire-1',
      });

      expect(nextState.players[0].prizes[0].instanceId).toBe('c-fire-1');
      expect(nextState.players[0].hand.some((c) => c.instanceId === 'pz-1')).toBe(true);
    });

    it('wins game when all prizes are taken', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_TAKE_PRIZE',
        playerIndex: 0,
        count: 2,
      });

      expect(nextState.players[0].prizes.length).toBe(0);
      expect(nextState.winner).toBe(0);
      expect(nextState.winReason).toBe('PRIZES');
      expect(nextState.phase).toBe('GAME_OVER');
    });
  });

  describe('10. Attack Assist & Damage Spread', () => {
    it('deals attack damage and triggers knock out + prizes', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_ATTACK_ASSIST',
        playerIndex: 0,
        attackName: 'Brave Fire',
        activeDamage: 220, // Enough to KO Miraidon ex (220 HP)
        endTurn: true,
      });

      // Miraidon ex is an 'ex' pokemon -> 2 prizes taken
      expect(nextState.players[0].prizes.length).toBe(0); // Had 2 prizes, took 2
      expect(nextState.winner).toBe(0);
      expect(nextState.winReason).toBe('PRIZES');
      expect(nextState.phase).toBe('GAME_OVER');
    });

    it('deals spread damage to bench', () => {
      const { nextState } = reduceGame(state, {
        type: 'MANUAL_ATTACK_ASSIST',
        playerIndex: 0,
        attackName: 'Phantom Dive',
        activeDamage: 100,
        benchDistributions: {
          'p1-bench-mon': 30,
        },
        endTurn: false,
      });

      expect(nextState.players[1].active?.damageCounters).toBe(100);
      expect(nextState.players[1].bench[0]?.damageCounters).toBe(30);
    });
  });

  describe('11. GAME_UNDO_STEP Engine Rollback', () => {
    it('successfully rolls back any manual action step', () => {
      // Step 1: Adjust damage
      const { nextState: stateAfterDamage } = reduceGame(state, {
        type: 'MANUAL_ADJUST_DAMAGE',
        targetPokemonInstanceId: 'p0-active-mon',
        damageDelta: 50,
      });

      expect(stateAfterDamage.players[0].active?.damageCounters).toBe(50);
      expect(stateAfterDamage.undoStack?.length).toBe(1);

      // Step 2: Draw card
      const { nextState: stateAfterDraw } = reduceGame(stateAfterDamage, {
        type: 'MANUAL_DRAW_CARDS',
        playerIndex: 0,
        count: 1,
      });

      expect(stateAfterDraw.players[0].hand.length).toBe(4);
      expect(stateAfterDraw.undoStack?.length).toBe(2);

      // Undo Step 2: Draw should be reverted
      const { nextState: undoDrawState } = reduceGame(stateAfterDraw, {
        type: 'GAME_UNDO_STEP',
      });

      expect(undoDrawState.players[0].hand.length).toBe(3);
      expect(undoDrawState.players[0].active?.damageCounters).toBe(50);
      expect(undoDrawState.undoStack?.length).toBe(1);

      // Undo Step 1: Damage should be reverted
      const { nextState: undoDamageState } = reduceGame(undoDrawState, {
        type: 'GAME_UNDO_STEP',
      });

      expect(undoDamageState.players[0].active?.damageCounters).toBe(0);
      expect(undoDamageState.undoStack?.length).toBe(0);
    });

    it('returns error when undo stack is empty', () => {
      const { nextState, error } = reduceGame(state, {
        type: 'GAME_UNDO_STEP',
      });

      expect(error).toBeDefined();
      expect(nextState).toBe(state);
    });
  });
});
