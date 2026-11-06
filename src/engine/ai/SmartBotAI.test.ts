import { describe, it, expect } from 'vitest';
import { SmartBotAI } from './SmartBotAI';
import { GameReducer, createInitialGameState } from '../GameReducer';
import { buildCharizardExDeck, buildMiraidonExDeck, CardTemplates, createCard } from '../data/StandardCardCatalog';

describe('SmartBotAI Unit Tests', () => {
  it('correctly handles DRAW_PHASE by returning DRAW_TURN_CARD', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 1,
    }).nextState;

    state.phase = 'DRAW_PHASE';
    state.activePlayerIndex = 1;

    const action = SmartBotAI.getNextAction(state, 1);
    expect(action).toEqual({ type: 'DRAW_TURN_CARD', playerIndex: 1 });
  });

  it('selects best promotion candidate (prioritizes energy-loaded Pokémon)', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 1,
    }).nextState;

    state.phase = 'PROMOTION_PHASE';
    state.pendingPromotionForPlayer = 1;

    // Bench 0: Basic Charmander with 0 energy
    state.players[1].bench[0] = {
      instanceId: 'bench-0',
      card: createCard(CardTemplates.Charmander),
      stage: 'Basic',
      maxHp: 70,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    // Bench 1: Miraidon ex with 2 energies
    state.players[1].bench[1] = {
      instanceId: 'bench-1',
      card: createCard(CardTemplates.MiraidonEx),
      stage: 'Basic',
      maxHp: 220,
      damageCounters: 0,
      attachedEnergies: [
        createCard(CardTemplates.BasicLightningEnergy),
        createCard(CardTemplates.BasicLightningEnergy),
      ],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    const action = SmartBotAI.getNextAction(state, 1);
    expect(action).toEqual({
      type: 'PROMOTE_BENCH_TO_ACTIVE',
      playerIndex: 1,
      benchIndex: 1, // Must pick Miraidon with 2 energies over unpowered Charmander
    });
  });

  it('attaches energy to active attacker needing energy to attack', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 1,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.activePlayerIndex = 1;
    state.turnNumber = 2;
    state.players[1].turnFlags.abilitiesUsed['Tandem Unit'] = true;

    const energyCard = createCard(CardTemplates.BasicLightningEnergy);
    state.players[1].hand = [energyCard];
    state.players[1].active = {
      instanceId: 'active-1',
      card: createCard(CardTemplates.MiraidonEx),
      stage: 'Basic',
      maxHp: 220,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    const action = SmartBotAI.getNextAction(state, 1);
    expect(action).toEqual({
      type: 'ATTACH_ENERGY',
      playerIndex: 1,
      energyCardInstanceId: energyCard.instanceId,
      targetPokemonInstanceId: 'active-1',
    });
  });

  it('simulates an autonomous 30-turn bot match executing legal Standard actions', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    // Official Pokemon TCG Rule: Players must Mulligan until holding at least 1 Basic Pokemon
    while (!state.players[0].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 0 }).nextState;
    }
    while (!state.players[1].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 1 }).nextState;
    }

    // Set initial active
    const p0Basic = state.players[0].hand.find((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))!;
    const p1Basic = state.players[1].hand.find((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))!;

    state = GameReducer(state, {
      type: 'SET_INITIAL_ACTIVE',
      playerIndex: 0,
      cardInstanceId: p0Basic.instanceId,
    }).nextState;

    state = GameReducer(state, {
      type: 'SET_INITIAL_ACTIVE',
      playerIndex: 1,
      cardInstanceId: p1Basic.instanceId,
    }).nextState;

    const p0Bench = state.players[0].hand
      .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))
      .slice(0, 2);
    const p1Bench = state.players[1].hand
      .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))
      .slice(0, 2);

    if (p0Bench.length > 0) {
      state = GameReducer(state, {
        type: 'SET_INITIAL_BENCH',
        playerIndex: 0,
        cardInstanceIds: p0Bench.map((c) => c.instanceId),
      }).nextState;
    }
    if (p1Bench.length > 0) {
      state = GameReducer(state, {
        type: 'SET_INITIAL_BENCH',
        playerIndex: 1,
        cardInstanceIds: p1Bench.map((c) => c.instanceId),
      }).nextState;
    }

    state = GameReducer(state, { type: 'REVEAL_AND_START_GAME' }).nextState;

    let turnsExecuted = 0;
    let iterations = 0;
    const maxIterations = 500;

    while (state.phase !== 'GAME_OVER' && turnsExecuted < 30 && iterations < maxIterations) {
      iterations++;

      if (state.phase === 'CHECKUP_PHASE') {
        state = GameReducer(state, { type: 'EXECUTE_CHECKUP' }).nextState;
        continue;
      }

      const actingPlayer =
        state.phase === 'PROMOTION_PHASE' && state.pendingPromotionForPlayer !== undefined
          ? state.pendingPromotionForPlayer
          : state.activePlayerIndex;

      const action = SmartBotAI.getNextAction(state, actingPlayer as 0 | 1);

      if (!action) {
        break;
      }

      if (action.type === 'PASS_TURN') {
        turnsExecuted++;
      }

      const res = GameReducer(state, action);
      expect(res.error).toBeUndefined();
      state = res.nextState;
    }

    expect(turnsExecuted).toBeGreaterThanOrEqual(3);
    expect(iterations).toBeLessThan(maxIterations);
  }, 30000);

  it('Tactic 1: Trapping Gust - targets high retreat cost Pokémon with 0 energy on opponent bench', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.activePlayerIndex = 0;
    state.turnNumber = 3;

    // Player 0 has Boss's Orders in hand
    const bossCard = createCard(CardTemplates.BossOrders);
    state.players[0].hand = [bossCard];
    state.players[0].active = {
      instanceId: 'p0-active',
      card: createCard(CardTemplates.CharizardEx),
      stage: 'Stage2',
      maxHp: 330,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 2,
    };

    // Opponent bench 0: retreat cost 1, 1 energy
    state.players[1].bench[0] = {
      instanceId: 'opp-bench-0',
      card: { ...createCard(CardTemplates.Charmander), retreatCost: 1 },
      stage: 'Basic',
      maxHp: 70,
      damageCounters: 0,
      attachedEnergies: [createCard(CardTemplates.BasicLightningEnergy)],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    // Opponent bench 1: retreat cost 3, 0 energy (PERFECT TRAP TARGET)
    state.players[1].bench[1] = {
      instanceId: 'opp-bench-1',
      card: { ...createCard(CardTemplates.CharizardEx), retreatCost: 3 },
      stage: 'Stage2',
      maxHp: 330,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 2,
    };

    const action = SmartBotAI.getNextAction(state, 0);
    expect(action).toEqual({
      type: 'PLAY_SUPPORTER',
      playerIndex: 0,
      supporterCardInstanceId: bossCard.instanceId,
      choices: { opponentBenchIndex: 1 }, // Must trap bench 1 (retreat cost 3, 0 energy)
    });
  });

  it('Tactic 2: Snipe Knockout for Game Win - gusts weakened bench target to claim winning prizes', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.activePlayerIndex = 0;
    state.turnNumber = 4;
    // Player 0 only has 1 prize left to take!
    state.players[0].prizes = [createCard(CardTemplates.BasicFireEnergy)];

    const bossCard = createCard(CardTemplates.BossOrders);
    state.players[0].hand = [bossCard];

    // Active Charizard ex with 3 energies (can attack for 180 damage)
    state.players[0].active = {
      instanceId: 'p0-active',
      card: createCard(CardTemplates.CharizardEx),
      stage: 'Stage2',
      maxHp: 330,
      damageCounters: 0,
      attachedEnergies: [
        createCard(CardTemplates.BasicFireEnergy),
        createCard(CardTemplates.BasicFireEnergy),
        createCard(CardTemplates.BasicFireEnergy),
      ],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 2,
    };

    // Opponent active has 220 HP (cannot be KO'd in 1 hit by 180 dmg)
    state.players[1].active = {
      instanceId: 'opp-active',
      card: createCard(CardTemplates.MiraidonEx),
      stage: 'Basic',
      maxHp: 220,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    // Opponent bench 0: weakened Pokémon with only 30 HP left (3 damage counters on 60 HP)
    state.players[1].bench[0] = {
      instanceId: 'opp-bench-weak',
      card: createCard(CardTemplates.Pidgey),
      stage: 'Basic',
      maxHp: 60,
      damageCounters: 3, // 30 HP remaining <= 180 damage
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    const action = SmartBotAI.getNextAction(state, 0);
    expect(action).toEqual({
      type: 'PLAY_SUPPORTER',
      playerIndex: 0,
      supporterCardInstanceId: bossCard.instanceId,
      choices: { opponentBenchIndex: 0 }, // Must gust the weakened target for the win!
    });
  });

  it('Tactic 3: Tactical Switch - switches heavily damaged active when ready bench attacker exists', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.activePlayerIndex = 0;
    state.turnNumber = 3;

    const switchCard = createCard(CardTemplates.Switch);
    state.players[0].hand = [switchCard];

    // Active Pokémon is heavily damaged (20 HP remaining)
    state.players[0].active = {
      instanceId: 'p0-active-damaged',
      card: createCard(CardTemplates.Charmander),
      stage: 'Basic',
      maxHp: 70,
      damageCounters: 5, // 20 HP remaining
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    // Bench Pokémon has enough energies and can attack!
    state.players[0].bench[0] = {
      instanceId: 'p0-bench-ready',
      card: createCard(CardTemplates.MiraidonEx),
      stage: 'Basic',
      maxHp: 220,
      damageCounters: 0,
      attachedEnergies: [
        createCard(CardTemplates.BasicLightningEnergy),
        createCard(CardTemplates.BasicLightningEnergy),
        createCard(CardTemplates.BasicLightningEnergy),
      ],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    const action = SmartBotAI.getNextAction(state, 0);
    expect(action).toEqual({
      type: 'PLAY_ITEM',
      playerIndex: 0,
      itemCardInstanceId: switchCard.instanceId,
      choices: { playerBenchIndex: 0 }, // Must play Switch to swap to bench 0
    });
  });
});

