/**
 * SmartBotAI — Autonomous Intelligent Pokémon TCG Standard Decision Engine
 * Pure deterministic logic for evaluating and executing legal actions.
 * Features Advanced Competitive Tactics ("ท่าแปลกๆ"):
 * 1. Trapping Gust (Boss's Orders on high retreat cost targets with 0 energy to stall opponent tempo)
 * 2. Snipe Knockout for Game Win (Boss's Orders on low-HP benched targets to claim winning prize cards)
 * 3. Tactical Retreat / Switch (Swapping out damaged Pokémon to deny prizes when a benched attacker is ready)
 * 4. Ultra Ball strategic discard synergy (setting up discard acceleration & tutoring key evolutions)
 * 5. Pidgeot ex Quick Search tutor combo (dynamic card search based on board state)
 * 6. Super Rod recycling (recovering essential Pokémon & energies from discard)
 */

import type { GameState, GameAction, PokemonInPlay, CardInstance } from '../types';
import { ActionValidator } from '../ActionValidator';
import { EvolutionResolver } from '../data/EvolutionResolver';

export interface TacticalNarration {
  tactic: string;
  description: string;
}

export class SmartBotAI {
  /**
   * Determine the single next best legal action for the bot to execute.
   * Returns null if no action is needed or possible.
   */
  static getNextAction(state: GameState, botIndex: 0 | 1): GameAction | null {
    if (state.phase === 'GAME_OVER') return null;

    const player = state.players[botIndex];
    const oppIndex: 0 | 1 = botIndex === 0 ? 1 : 0;
    const opponent = state.players[oppIndex];

    // 1. Handle CHECKUP_PHASE
    if (state.phase === 'CHECKUP_PHASE') {
      return { type: 'EXECUTE_CHECKUP' };
    }

    // 2. Handle PROMOTION_PHASE
    if (state.phase === 'PROMOTION_PHASE') {
      if (state.pendingPromotionForPlayer === botIndex) {
        const bestBenchIndex = this.selectBestPromotionCandidate(player.bench, opponent.active);
        if (bestBenchIndex !== -1) {
          return {
            type: 'PROMOTE_BENCH_TO_ACTIVE',
            playerIndex: botIndex,
            benchIndex: bestBenchIndex,
          };
        }
      }
      return null;
    }

    // 3. Handle DRAW_PHASE
    if (state.phase === 'DRAW_PHASE' && state.activePlayerIndex === botIndex) {
      return { type: 'DRAW_TURN_CARD', playerIndex: botIndex };
    }

    // 4. Handle MAIN_PHASE
    if (state.phase === 'MAIN_PHASE' && state.activePlayerIndex === botIndex) {
      const allMyPokemon = [player.active, ...player.bench].filter((p): p is PokemonInPlay => p !== null);
      const isTurn1ForFirstPlayer = state.turnNumber === 1 && botIndex === state.firstPlayerIndex;

      // =========================================================================
      // TACTIC 3: Tactical Switch / Retreat to save a heavily damaged Active Pokémon
      // =========================================================================
      const tacticalSwapAction = this.evaluateTacticalRetreatOrSwitch(state, botIndex);
      if (tacticalSwapAction) {
        return tacticalSwapAction;
      }

      // =========================================================================
      // Priority 1: Play Basic Pokémon to empty bench spots
      // =========================================================================
      const hasEmptyBench = player.bench.some((b) => b === null);
      if (hasEmptyBench) {
        const basicInHand = player.hand.find(
          (c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic')
        );
        if (basicInHand) {
          const emptyIdx = player.bench.findIndex((b) => b === null);
          return {
            type: 'PLAY_BASIC_POKEMON',
            playerIndex: botIndex,
            cardInstanceId: basicInHand.instanceId,
            benchIndex: emptyIdx,
          };
        }
      }

      // =========================================================================
      // Priority 2: Evolve Pokémon (Rare Candy -> Stage 2 or Regular Evolution)
      // =========================================================================
      const isFirstTurnForBot =
        state.turnNumber === 1 || (state.turnNumber === 2 && botIndex !== state.firstPlayerIndex);

      if (!isFirstTurnForBot) {
        // 2.1 Rare Candy (Basic -> Stage 2 direct evolution)
        const rareCandy = player.hand.find((c) => c.nameEn === 'Rare Candy');
        if (rareCandy) {
          const stage2InHand = player.hand.find(
            (c) =>
              c.supertype === 'Pokemon' &&
              (c.subtypes.includes('Stage 2') || c.subtypes.includes('Stage2'))
          );
          if (stage2InHand) {
            const eligibleBasic = allMyPokemon.find(
              (p) =>
                p.stage === 'Basic' &&
                p.turnEnteredPlay < state.turnNumber &&
                EvolutionResolver.isEvolutionMatch(stage2InHand, p.card, true)
            );
            if (eligibleBasic) {
              const choices: any = {
                targetPokemonInstanceId: eligibleBasic.instanceId,
                selectedCardInstanceIds: [stage2InHand.instanceId],
              };
              if (stage2InHand.nameEn === 'Charizard ex') {
                const fireEnergies = player.deck
                  .filter((c) => c.supertype === 'Energy' && c.energyType === 'Fire')
                  .slice(0, 3);
                if (fireEnergies.length > 0) {
                  choices.energyAttachments = fireEnergies.map((e) => ({
                    energyInstanceId: e.instanceId,
                    targetPokemonInstanceId: eligibleBasic.instanceId,
                  }));
                }
              }
              return {
                type: 'PLAY_ITEM',
                playerIndex: botIndex,
                itemCardInstanceId: rareCandy.instanceId,
                choices,
              };
            }
          }
        }
      }

      // 2.2 Standard Evolution
      const evoCard = player.hand.find(
        (c) =>
          c.supertype === 'Pokemon' &&
          (c.subtypes.includes('Stage 1') ||
            c.subtypes.includes('Stage 2') ||
            c.subtypes.includes('Stage1') ||
            c.subtypes.includes('Stage2'))
      );
      if (evoCard) {
        for (const target of allMyPokemon) {
          if (target.turnEnteredPlay < state.turnNumber && target.turnEvolved < state.turnNumber) {
            const val = ActionValidator.canEvolvePokemon(state, botIndex, evoCard, target);
            if (val.valid) {
              let choices: any = undefined;
              if (evoCard.nameEn === 'Charizard ex') {
                const fireEnergies = player.deck
                  .filter((c) => c.supertype === 'Energy' && c.energyType === 'Fire')
                  .slice(0, 3);
                if (fireEnergies.length > 0) {
                  choices = {
                    energyAttachments: fireEnergies.map((e) => ({
                      energyInstanceId: e.instanceId,
                      targetPokemonInstanceId: target.instanceId,
                    })),
                  };
                }
              }
              return {
                type: 'EVOLVE_POKEMON',
                playerIndex: botIndex,
                evolutionCardInstanceId: evoCard.instanceId,
                targetPokemonInstanceId: target.instanceId,
                choices,
              };
            }
          }
        }
      }

      // =========================================================================
      // Priority 3: Activate Board Abilities
      // =========================================================================
      // 3.1 Pidgeot ex: Quick Search (TACTIC 5: Dynamic Tutor)
      const pidgeot = allMyPokemon.find(
        (p) =>
          p.card.nameEn === 'Pidgeot ex' &&
          ActionValidator.canUseAbility(state, botIndex, p, 'Quick Search').valid
      );
      if (pidgeot && player.deck.length > 0) {
        const targetCard = this.selectPidgeotQuickSearchTarget(state, botIndex);
        if (targetCard) {
          return {
            type: 'USE_ABILITY',
            playerIndex: botIndex,
            sourcePokemonInstanceId: pidgeot.instanceId,
            abilityName: 'Quick Search',
            choices: { selectedCardInstanceIds: [targetCard.instanceId] },
          };
        }
      }

      // 3.2 Miraidon ex: Tandem Unit
      const miraidon = allMyPokemon.find(
        (p) =>
          p.card.nameEn === 'Miraidon ex' &&
          ActionValidator.canUseAbility(state, botIndex, p, 'Tandem Unit').valid
      );
      if (miraidon && player.bench.some((b) => b === null)) {
        const lightningBasics = player.deck
          .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic') && c.energyType === 'Lightning')
          .slice(0, 2);
        return {
          type: 'USE_ABILITY',
          playerIndex: botIndex,
          sourcePokemonInstanceId: miraidon.instanceId,
          abilityName: 'Tandem Unit',
          choices: lightningBasics.length > 0 ? { selectedCardInstanceIds: lightningBasics.map((c) => c.instanceId) } : undefined,
        };
      }

      // 3.3 Raikou V: Fleet-Footed (Must be Active Spot)
      if (
        player.active?.card.nameEn === 'Raikou V' &&
        ActionValidator.canUseAbility(state, botIndex, player.active, 'Fleet-Footed').valid
      ) {
        return {
          type: 'USE_ABILITY',
          playerIndex: botIndex,
          sourcePokemonInstanceId: player.active.instanceId,
          abilityName: 'Fleet-Footed',
        };
      }

      // =========================================================================
      // Priority 4: Play Search & Acceleration Items
      // =========================================================================
      // 4.1 TACTIC 4: Ultra Ball Strategic Discard & Search
      const ultraBall = player.hand.find((c) => c.nameEn === 'Ultra Ball');
      if (ultraBall && player.hand.length >= 3 && player.deck.length > 0) {
        const ultraBallAction = this.evaluateUltraBall(state, botIndex, ultraBall);
        if (ultraBallAction) return ultraBallAction;
      }

      // 4.2 Nest Ball
      if (hasEmptyBench) {
        const nestBall = player.hand.find((c) => c.nameEn === 'Nest Ball');
        if (nestBall && ActionValidator.canPlayItem(state, botIndex, nestBall).valid) {
          const basicInDeck = player.deck.find(
            (c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic')
          );
          if (basicInDeck) {
            return {
              type: 'PLAY_ITEM',
              playerIndex: botIndex,
              itemCardInstanceId: nestBall.instanceId,
              choices: { selectedCardInstanceIds: [basicInDeck.instanceId] },
            };
          }
        }
      }

      // 4.3 Buddy-Buddy Poffin
      if (hasEmptyBench) {
        const poffin = player.hand.find((c) => c.nameEn === 'Buddy-Buddy Poffin');
        if (poffin && ActionValidator.canPlayItem(state, botIndex, poffin).valid) {
          const poffinTargets = player.deck
            .filter((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic') && (c.hp || 0) <= 70)
            .slice(0, 2);
          if (poffinTargets.length > 0) {
            return {
              type: 'PLAY_ITEM',
              playerIndex: botIndex,
              itemCardInstanceId: poffin.instanceId,
              choices: { selectedCardInstanceIds: poffinTargets.map((c) => c.instanceId) },
            };
          }
        }
      }

      // 4.4 Electric Generator
      const generator = player.hand.find((c) => c.nameEn === 'Electric Generator');
      if (generator && ActionValidator.canPlayItem(state, botIndex, generator).valid) {
        return {
          type: 'PLAY_ITEM',
          playerIndex: botIndex,
          itemCardInstanceId: generator.instanceId,
        };
      }

      // 4.5 Dark Patch
      const darkPatch = player.hand.find((c) => c.nameEn === 'Dark Patch');
      if (darkPatch && ActionValidator.canPlayItem(state, botIndex, darkPatch).valid) {
        const hasDarkInDiscard = player.discard.some((c) => c.supertype === 'Energy' && c.energyType === 'Darkness');
        const hasBenchedDark = player.bench.some((b) => b && b.card.energyType === 'Darkness');
        if (hasDarkInDiscard && hasBenchedDark) {
          return {
            type: 'PLAY_ITEM',
            playerIndex: botIndex,
            itemCardInstanceId: darkPatch.instanceId,
          };
        }
      }

      // 4.6 TACTIC 6: Super Rod Recycling
      const superRod = player.hand.find((c) => c.nameEn === 'Super Rod');
      if (superRod && ActionValidator.canPlayItem(state, botIndex, superRod).valid) {
        const superRodAction = this.evaluateSuperRod(state, botIndex, superRod);
        if (superRodAction) return superRodAction;
      }

      // =========================================================================
      // Priority 5: Attach 1 Energy per Turn
      // =========================================================================
      if (!player.turnFlags.energyAttachedThisTurn) {
        const energy = player.hand.find((c) => c.supertype === 'Energy');
        if (energy && allMyPokemon.length > 0) {
          const targetPokemon = this.selectBestEnergyTarget(allMyPokemon);
          if (targetPokemon) {
            return {
              type: 'ATTACH_ENERGY',
              playerIndex: botIndex,
              energyCardInstanceId: energy.instanceId,
              targetPokemonInstanceId: targetPokemon.instanceId,
            };
          }
        }
      }

      // =========================================================================
      // Priority 6: Play Supporter (Strict Standard Rule: Turn 1 first player prohibited)
      // =========================================================================
      if (!player.turnFlags.supporterPlayedThisTurn && !isTurn1ForFirstPlayer) {
        const boss = player.hand.find((c) => c.nameEn === "Boss's Orders");
        if (boss) {
          // TACTIC 2: Snipe Knockout for Game Win
          const snipeTarget = this.findSnipeKnockoutTarget(state, botIndex);
          if (snipeTarget !== null) {
            return {
              type: 'PLAY_SUPPORTER',
              playerIndex: botIndex,
              supporterCardInstanceId: boss.instanceId,
              choices: { opponentBenchIndex: snipeTarget.targetBenchIdx },
            };
          }

          // TACTIC 1: Trapping Gust (High retreat cost + 0 attached energy on bench)
          const trapTarget = this.findTrappingGustTarget(opponent.bench);
          if (trapTarget !== null) {
            return {
              type: 'PLAY_SUPPORTER',
              playerIndex: botIndex,
              supporterCardInstanceId: boss.instanceId,
              choices: { opponentBenchIndex: trapTarget.targetBenchIdx },
            };
          }

          // Fallback Boss's Orders: any valid target on bench
          const anyBenchIdx = opponent.bench.findIndex((b) => b !== null);
          if (anyBenchIdx !== -1) {
            return {
              type: 'PLAY_SUPPORTER',
              playerIndex: botIndex,
              supporterCardInstanceId: boss.instanceId,
              choices: { opponentBenchIndex: anyBenchIdx },
            };
          }
        }

        // Draw / Search Supporters
        const supporter = player.hand.find(
          (c) =>
            c.supertype === 'Trainer' &&
            c.subtypes.includes('Supporter') &&
            ActionValidator.canPlaySupporter(state, botIndex, c).valid
        );
        if (supporter) {
          let choices;
          if (supporter.nameEn === 'Arven') {
            const item = player.deck.find((c) => c.supertype === 'Trainer' && c.subtypes.includes('Item'));
            if (item) choices = { selectedCardInstanceIds: [item.instanceId] };
          }
          return {
            type: 'PLAY_SUPPORTER',
            playerIndex: botIndex,
            supporterCardInstanceId: supporter.instanceId,
            choices,
          };
        }
      }

      // =========================================================================
      // Priority 7: Declare Attack (Strict Standard: Cannot attack on Turn 1 first player)
      // =========================================================================
      if (!player.turnFlags.attackedThisTurn && !isTurn1ForFirstPlayer && player.active && opponent.active) {
        const bestAttack = this.selectBestAttack(player.active);
        if (bestAttack !== null) {
          return {
            type: 'DECLARE_ATTACK',
            playerIndex: botIndex,
            attackIndex: bestAttack,
          };
        }
      }

      // =========================================================================
      // Priority 8: Pass Turn
      // =========================================================================
      return { type: 'PASS_TURN', playerIndex: botIndex };
    }

    return null;
  }

  // ===========================================================================
  // TACTIC 1: Trapping Gust
  // Gust opponent benched Pokémon with retreat cost >= 2 and 0 attached energies
  // ===========================================================================
  static findTrappingGustTarget(bench: (PokemonInPlay | null)[]): { targetBenchIdx: number; name: string } | null {
    let bestIdx = -1;
    let highestRetreat = 1;
    let targetName = '';

    bench.forEach((pokemon, idx) => {
      if (!pokemon) return;
      const retreat = pokemon.card.retreatCost || 0;
      const energyCount = pokemon.attachedEnergies.length;

      // A Pokémon with retreatCost >= 2 and 0 energies is completely trapped
      if (retreat >= 2 && energyCount === 0) {
        if (retreat > highestRetreat) {
          highestRetreat = retreat;
          bestIdx = idx;
          targetName = pokemon.card.nameEn || 'Target';
        }
      }
    });

    if (bestIdx !== -1) {
      return { targetBenchIdx: bestIdx, name: targetName };
    }
    return null;
  }

  // ===========================================================================
  // TACTIC 2: Snipe Knockout for Game Win
  // Gust a weakened opponent benched Pokémon whose KO gives enough prizes to win
  // ===========================================================================
  static findSnipeKnockoutTarget(
    state: GameState,
    botIndex: 0 | 1
  ): { targetBenchIdx: number; name: string } | null {
    const player = state.players[botIndex];
    const oppIndex: 0 | 1 = botIndex === 0 ? 1 : 0;
    const opponent = state.players[oppIndex];

    if (!player.active) return null;

    // Calculate active Pokémon's maximum damage
    let maxDamage = 0;
    if (player.active.card.attacks) {
      for (const att of player.active.card.attacks) {
        if (ActionValidator.checkEnergyCostSatisfied(player.active.attachedEnergies, att.cost)) {
          if (att.damage > maxDamage) maxDamage = att.damage;
        }
      }
    }

    if (maxDamage === 0) return null;

    const remainingPrizesNeeded = player.prizes.length;

    for (let idx = 0; idx < opponent.bench.length; idx++) {
      const b = opponent.bench[idx];
      if (!b) continue;

      const currentHp = b.maxHp - b.damageCounters * 10;
      const prizeYield = b.card.subtypes.includes('ex') || b.card.subtypes.includes('V') ? 2 : 1;

      // If this KO yields the required prizes to WIN THE MATCH immediately!
      if (maxDamage >= currentHp && prizeYield >= remainingPrizesNeeded) {
        return { targetBenchIdx: idx, name: b.card.nameEn || 'Target' };
      }
    }

    return null;
  }

  // ===========================================================================
  // TACTIC 3: Tactical Retreat / Switch
  // Swapping out damaged Pokémon to deny prizes when a benched attacker is ready
  // ===========================================================================
  static evaluateTacticalRetreatOrSwitch(
    state: GameState,
    botIndex: 0 | 1
  ): GameAction | null {
    const player = state.players[botIndex];
    if (!player.active) return null;

    const currentHp = player.active.maxHp - player.active.damageCounters * 10;
    const isEndangered = currentHp <= 60 || player.active.damageCounters >= 6;

    if (!isEndangered) return null;

    // Check if there is a ready attacker on the bench
    let readyBenchIdx = -1;
    for (let i = 0; i < player.bench.length; i++) {
      const b = player.bench[i];
      if (!b) continue;

      // Check if b has at least 1 attack that can be paid right now
      if (b.card.attacks) {
        const canAttack = b.card.attacks.some(
          (att) => att.damage > 0 && ActionValidator.checkEnergyCostSatisfied(b.attachedEnergies, att.cost)
        );
        if (canAttack) {
          readyBenchIdx = i;
          break;
        }
      }
    }

    if (readyBenchIdx === -1) return null;

    // 1. Try Switch item card first (free swap, no energy discard)
    const switchCard = player.hand.find((c) => c.nameEn === 'Switch');
    if (switchCard && ActionValidator.canPlayItem(state, botIndex, switchCard).valid) {
      return {
        type: 'PLAY_ITEM',
        playerIndex: botIndex,
        itemCardInstanceId: switchCard.instanceId,
        choices: { playerBenchIndex: readyBenchIdx },
      };
    }

    // 2. Try Manual Retreat if not already retreated this turn
    if (!player.turnFlags.retreatedThisTurn) {
      const cost = player.active.card.retreatCost || 0;
      if (player.active.attachedEnergies.length >= cost) {
        const discardIds = player.active.attachedEnergies.slice(0, cost).map((e) => e.instanceId);
        return {
          type: 'RETREAT_ACTIVE',
          playerIndex: botIndex,
          benchIndex: readyBenchIdx,
          energyDiscardInstanceIds: discardIds,
        };
      }
    }

    return null;
  }

  // ===========================================================================
  // TACTIC 4: Ultra Ball Strategic Discard & Search
  // ===========================================================================
  static evaluateUltraBall(
    state: GameState,
    botIndex: 0 | 1,
    ultraBall: CardInstance
  ): GameAction | null {
    const player = state.players[botIndex];
    const otherHand = player.hand.filter((c) => c.instanceId !== ultraBall.instanceId);
    if (otherHand.length < 2) return null;

    // Discard Priority:
    // 1. Darkness Energy (if player has Dark Patch in hand or deck)
    // 2. Redundant supporters (if supporter already played this turn)
    // 3. Excess energies if energy already attached
    // 4. Duplicate basics/evolutions
    const sortedDiscards = [...otherHand].sort((a, b) => {
      const aDark = a.supertype === 'Energy' && a.energyType === 'Darkness' ? -10 : 0;
      const bDark = b.supertype === 'Energy' && b.energyType === 'Darkness' ? -10 : 0;
      return aDark - bDark;
    });

    const discardIds = [sortedDiscards[0].instanceId, sortedDiscards[1].instanceId];

    // Search Priority:
    // 1. If Rare Candy in hand + Charmander in play -> Charizard ex
    // 2. If Pidgey in play -> Pidgeot ex
    // 3. Basic Pokémon if bench has room
    // 4. Any strong Pokémon
    const pokemonInDeck = player.deck.filter((c) => c.supertype === 'Pokemon');
    if (pokemonInDeck.length === 0) return null;

    let chosenCard = pokemonInDeck[0];
    const hasRareCandy = player.hand.some((c) => c.nameEn === 'Rare Candy');
    const hasCharmander = [player.active, ...player.bench].some((p) => p?.card.nameEn === 'Charmander');

    if (hasRareCandy && hasCharmander) {
      const zard = pokemonInDeck.find((c) => c.nameEn === 'Charizard ex');
      if (zard) chosenCard = zard;
    } else {
      const pidgeot = pokemonInDeck.find((c) => c.nameEn === 'Pidgeot ex');
      if (pidgeot) chosenCard = pidgeot;
    }

    return {
      type: 'PLAY_ITEM',
      playerIndex: botIndex,
      itemCardInstanceId: ultraBall.instanceId,
      choices: {
        discardCardInstanceIds: discardIds,
        selectedCardInstanceIds: [chosenCard.instanceId],
      },
    };
  }

  // ===========================================================================
  // TACTIC 5: Pidgeot ex Quick Search Tutor
  // Dynamic tutor of the single most impactful card in deck
  // ===========================================================================
  static selectPidgeotQuickSearchTarget(state: GameState, botIndex: 0 | 1): CardInstance | null {
    const player = state.players[botIndex];
    if (player.deck.length === 0) return null;

    const allMyPokemon = [player.active, ...player.bench].filter((p): p is PokemonInPlay => p !== null);
    const hasRareCandy = player.hand.some((c) => c.nameEn === 'Rare Candy');
    const hasCharmander = allMyPokemon.some((p) => p.card.nameEn === 'Charmander');
    const hasCharizardInHand = player.hand.some((c) => c.nameEn === 'Charizard ex');

    // 1. Missing Stage 2 for Rare Candy combo
    if (hasRareCandy && hasCharmander && !hasCharizardInHand) {
      const zard = player.deck.find((c) => c.nameEn === 'Charizard ex');
      if (zard) return zard;
    }

    // 2. Missing Rare Candy for Stage 2 combo
    if (hasCharizardInHand && hasCharmander && !hasRareCandy) {
      const candy = player.deck.find((c) => c.nameEn === 'Rare Candy');
      if (candy) return candy;
    }

    // 3. Need Energy to attack
    if (!player.turnFlags.energyAttachedThisTurn) {
      const hasEnergyInHand = player.hand.some((c) => c.supertype === 'Energy');
      if (!hasEnergyInHand) {
        const energy = player.deck.find((c) => c.supertype === 'Energy');
        if (energy) return energy;
      }
    }

    // 4. Boss's Orders to snipe game win
    const snipe = this.findSnipeKnockoutTarget(state, botIndex);
    if (snipe !== null) {
      const boss = player.deck.find((c) => c.nameEn === "Boss's Orders");
      if (boss) return boss;
    }

    // 5. Draw Supporter if hand is small
    if (player.hand.length <= 3) {
      const drawSupporter = player.deck.find(
        (c) => c.nameEn === "Professor's Research" || c.nameEn === 'Iono'
      );
      if (drawSupporter) return drawSupporter;
    }

    // Fallback: any Trainer or top deck card
    const anyTrainer = player.deck.find((c) => c.supertype === 'Trainer');
    return anyTrainer || player.deck[0];
  }

  // ===========================================================================
  // TACTIC 6: Super Rod Recycling
  // ===========================================================================
  static evaluateSuperRod(
    state: GameState,
    botIndex: 0 | 1,
    superRod: CardInstance
  ): GameAction | null {
    const player = state.players[botIndex];
    const eligibleDiscard = player.discard.filter(
      (c) => c.supertype === 'Pokemon' || c.supertype === 'Energy'
    );

    if (eligibleDiscard.length >= 3) {
      const selected = eligibleDiscard.slice(0, 3).map((c) => c.instanceId);
      return {
        type: 'PLAY_ITEM',
        playerIndex: botIndex,
        itemCardInstanceId: superRod.instanceId,
        choices: { selectedCardInstanceIds: selected },
      };
    }

    return null;
  }

  /**
   * Evaluate bench Pokémon and choose the best candidate to promote into Active Spot.
   */
  private static selectBestPromotionCandidate(
    bench: (PokemonInPlay | null)[],
    oppActive: PokemonInPlay | null
  ): number {
    let bestIdx = -1;
    let highestScore = -999;

    bench.forEach((pokemon, idx) => {
      if (!pokemon) return;

      let score = 10;
      // Bonus for attached energies (closer to attacking)
      score += pokemon.attachedEnergies.length * 25;
      // Bonus for HP
      score += (pokemon.maxHp - pokemon.damageCounters * 10) / 10;
      // Bonus for evolved/ex attackers
      if (pokemon.card.subtypes.includes('ex') || pokemon.stage !== 'Basic') {
        score += 15;
      }
      // Penalty if weak to opponent active's type
      if (oppActive?.card.energyType && pokemon.card.weakness?.type === oppActive.card.energyType) {
        score -= 20;
      }

      if (score > highestScore) {
        highestScore = score;
        bestIdx = idx;
      }
    });

    return bestIdx;
  }

  /**
   * Determine the most strategic target to attach energy to.
   */
  private static selectBestEnergyTarget(allPokemon: PokemonInPlay[]): PokemonInPlay | null {
    if (allPokemon.length === 0) return null;

    // 1. Check if Active Pokémon needs energy to attack
    const active = allPokemon[0];
    if (active.card.attacks && active.card.attacks.length > 0) {
      for (const att of active.card.attacks) {
        const costTotal = Object.values(att.cost).reduce((a, b) => a + b, 0);
        if (active.attachedEnergies.length < costTotal) {
          return active; // Active needs energy for attack!
        }
      }
    }

    // 2. Check benched primary attackers (ex or high HP)
    for (let i = 1; i < allPokemon.length; i++) {
      const p = allPokemon[i];
      if (p.card.subtypes.includes('ex') || p.maxHp >= 200) {
        const totalNeeded = p.card.attacks
          ? Math.max(...p.card.attacks.map((a) => Object.values(a.cost).reduce((x, y) => x + y, 0)))
          : 2;
        if (p.attachedEnergies.length < totalNeeded) {
          return p;
        }
      }
    }

    // 3. Fallback to active or first Pokémon
    return active;
  }

  /**
   * Find the highest-damage affordable attack on Active Pokémon.
   */
  private static selectBestAttack(active: PokemonInPlay): number | null {
    if (!active.card.attacks || active.card.attacks.length === 0) return null;

    let bestIdx: number | null = null;
    let highestDamage = -1;

    active.card.attacks.forEach((att, idx) => {
      const canPay = ActionValidator.checkEnergyCostSatisfied(active.attachedEnergies, att.cost);
      if (canPay) {
        if (att.damage > highestDamage) {
          highestDamage = att.damage;
          bestIdx = idx;
        }
      }
    });

    return bestIdx;
  }
}
