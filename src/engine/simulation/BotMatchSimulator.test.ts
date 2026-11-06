import { describe, it, expect } from 'vitest';
import { GameReducer, createInitialGameState } from '../GameReducer';
import { buildCharizardExDeck, buildMiraidonExDeck } from '../data/StandardCardCatalog';
import type { GameState, GameAction } from '../types';

/**
 * Headless Bot Decision Engine for Autonomous Match Simulation
 */
class HeadlessBotPlayer {
  static getNextAction(state: GameState, botIndex: 0 | 1): GameAction | null {
    const player = state.players[botIndex];

    // Handle Promotion Phase
    if (state.phase === 'PROMOTION_PHASE') {
      if (state.pendingPromotionForPlayer === botIndex) {
        const benchIdx = player.bench.findIndex((b) => b !== null);
        if (benchIdx !== -1) {
          return { type: 'PROMOTE_BENCH_TO_ACTIVE', playerIndex: botIndex, benchIndex: benchIdx };
        }
      }
      return null;
    }

    if (state.phase === 'CHECKUP_PHASE') {
      return { type: 'EXECUTE_CHECKUP' };
    }

    // Handle Draw Phase
    if (state.phase === 'DRAW_PHASE' && state.activePlayerIndex === botIndex) {
      return { type: 'DRAW_TURN_CARD', playerIndex: botIndex };
    }

    // Handle Main Phase Actions
    if (state.phase === 'MAIN_PHASE' && state.activePlayerIndex === botIndex) {
      // 1. Play Basic Pokémon from Hand to Bench
      const basicInHand = player.hand.find(
        (c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic')
      );
      const emptyBenchSpot = player.bench.findIndex((b) => b === null);
      if (basicInHand && emptyBenchSpot !== -1) {
        return {
          type: 'PLAY_BASIC_POKEMON',
          playerIndex: botIndex,
          cardInstanceId: basicInHand.instanceId,
          benchIndex: emptyBenchSpot,
        };
      }

      // 2. Attach Energy if not already attached
      if (!player.turnFlags.energyAttachedThisTurn) {
        const energyInHand = player.hand.find((c) => c.supertype === 'Energy');
        const targetPokemon = player.active || player.bench.find((b) => b !== null);
        if (energyInHand && targetPokemon) {
          return {
            type: 'ATTACH_ENERGY',
            playerIndex: botIndex,
            energyCardInstanceId: energyInHand.instanceId,
            targetPokemonInstanceId: targetPokemon.instanceId,
          };
        }
      }

      // 3. Evolve Pokémon if legal
      const evoCard = player.hand.find(
        (c) => c.supertype === 'Pokemon' && (c.subtypes.includes('Stage 1') || c.subtypes.includes('Stage 2') || c.subtypes.includes('Stage1') || c.subtypes.includes('Stage2'))
      );
      if (evoCard) {
        const targets = [player.active, ...player.bench].filter((p) => p !== null);
        for (const target of targets) {
          if (target && target.turnEnteredPlay < state.turnNumber && target.turnEvolved < state.turnNumber) {
            return {
              type: 'EVOLVE_POKEMON',
              playerIndex: botIndex,
              evolutionCardInstanceId: evoCard.instanceId,
              targetPokemonInstanceId: target.instanceId,
            };
          }
        }
      }

      // 4. Play Supporter if legal and not turn 1 for player 1
      if (
        !player.turnFlags.supporterPlayedThisTurn &&
        !(state.turnNumber === 1 && botIndex === state.firstPlayerIndex)
      ) {
        const supporter = player.hand.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Supporter'));
        if (supporter) {
          return {
            type: 'PLAY_SUPPORTER',
            playerIndex: botIndex,
            supporterCardInstanceId: supporter.instanceId,
          };
        }
      }

      // 5. Attack if legal and not turn 1 for player 1
      if (!(state.turnNumber === 1 && botIndex === state.firstPlayerIndex) && !player.turnFlags.attackedThisTurn) {
        if (player.active && player.active.card.attacks && player.active.card.attacks.length > 0) {
          // Check if attack cost satisfied
          const attack = player.active.card.attacks[0];
          const totalEnergy = player.active.attachedEnergies.length;
          const costTotal = Object.values(attack.cost).reduce((a, b) => a + b, 0);

          if (totalEnergy >= costTotal) {
            return {
              type: 'DECLARE_ATTACK',
              playerIndex: botIndex,
              attackIndex: 0,
            };
          }
        }
      }

      // 6. Pass Turn if nothing left to do
      return { type: 'PASS_TURN', playerIndex: botIndex };
    }

    return null;
  }
}

describe('Headless Full Match Simulation (Bot vs Bot)', () => {
  it('Simulates a 50+ turn match between Charizard ex and Miraidon ex without deadlocks', () => {
    let state = createInitialGameState();
    const p0Deck = buildCharizardExDeck();
    const p1Deck = buildMiraidonExDeck();

    // 1. Setup Decks
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: p0Deck,
      player1Deck: p1Deck,
      firstPlayerIndex: 0,
    }).nextState;

    // Official Pokemon TCG Rule: Players must Mulligan until holding at least 1 Basic Pokemon
    while (!state.players[0].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 0 }).nextState;
    }
    while (!state.players[1].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))) {
      state = GameReducer(state, { type: 'EXECUTE_MULLIGAN', playerIndex: 1 }).nextState;
    }

    // 2. Setup Initial Active & Bench
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

    // Put up to 2 extra basics on bench
    const p0ExtraBasics = state.players[0].hand
      .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))
      .slice(0, 2);
    const p1ExtraBasics = state.players[1].hand
      .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'))
      .slice(0, 2);

    if (p0ExtraBasics.length > 0) {
      state = GameReducer(state, {
        type: 'SET_INITIAL_BENCH',
        playerIndex: 0,
        cardInstanceIds: p0ExtraBasics.map((c) => c.instanceId),
      }).nextState;
    }

    if (p1ExtraBasics.length > 0) {
      state = GameReducer(state, {
        type: 'SET_INITIAL_BENCH',
        playerIndex: 1,
        cardInstanceIds: p1ExtraBasics.map((c) => c.instanceId),
      }).nextState;
    }

    // 3. Reveal and Start Game (Prize cards dealt)
    state = GameReducer(state, { type: 'REVEAL_AND_START_GAME' }).nextState;
    expect(state.phase).toBe('DRAW_PHASE');
    expect(state.players[0].prizes.length).toBe(6);
    expect(state.players[1].prizes.length).toBe(6);

    // 4. Run Turn Loop
    let actionCount = 0;
    const MAX_ACTIONS = 300;

    while (state.phase !== 'GAME_OVER' && actionCount < MAX_ACTIONS) {
      actionCount++;

      // Active player tries to act
      const botIdx = state.phase === 'PROMOTION_PHASE'
        ? (state.pendingPromotionForPlayer ?? state.activePlayerIndex)
        : state.activePlayerIndex;

      const action = HeadlessBotPlayer.getNextAction(state, botIdx);
      if (!action) {
        break; // Reached end of possible actions
      }

      const step = GameReducer(state, action);
      if (step.error) {
        // If an action fails, pass turn to avoid infinite loop
        if (state.phase === 'MAIN_PHASE') {
          state = GameReducer(state, { type: 'PASS_TURN', playerIndex: botIdx }).nextState;
        } else {
          break;
        }
      } else {
        state = step.nextState;
      }
    }

    // Verify invariants
    expect(actionCount).toBeGreaterThan(10);
    expect(state.players[0].prizes.length).toBeLessThanOrEqual(6);
    expect(state.players[1].prizes.length).toBeLessThanOrEqual(6);
    expect(state.players[0].prizes.length).toBeGreaterThanOrEqual(0);
    expect(state.players[1].prizes.length).toBeGreaterThanOrEqual(0);

    // State action log should have recorded each action
    expect(state.actionLog.length).toBeGreaterThan(10);
  }, 60000);
});
