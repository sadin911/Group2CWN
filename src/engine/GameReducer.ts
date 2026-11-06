import type { GameState, GameAction, PlayerBoardState, PokemonInPlay, CardInstance } from './types';
import { ActionValidator } from './ActionValidator';
import { EffectRegistry, EffectPrimitives } from './effects/EffectDSL';

export function findPokemonInPlay(
  state: GameState,
  instanceId: string
): { pokemon: PokemonInPlay; playerIndex: 0 | 1; position: 'ACTIVE' | 'BENCH'; benchIndex?: number } | null {
  for (let p = 0; p < 2; p++) {
    const player = state.players[p as 0 | 1];
    if (player.active && player.active.instanceId === instanceId) {
      return { pokemon: player.active, playerIndex: p as 0 | 1, position: 'ACTIVE' };
    }
    for (let b = 0; b < player.bench.length; b++) {
      const benchMon = player.bench[b];
      if (benchMon && benchMon.instanceId === instanceId) {
        return { pokemon: benchMon, playerIndex: p as 0 | 1, position: 'BENCH', benchIndex: b };
      }
    }
  }
  return null;
}

export function createEmptyPlayerState(id: string, name: string): PlayerBoardState {
  return {
    playerId: id,
    playerName: name,
    deck: [],
    hand: [],
    prizes: [],
    discard: [],
    lostZone: [],
    active: null,
    bench: [null, null, null, null, null],
    mulliganCount: 0,
    turnFlags: {
      energyAttachedThisTurn: false,
      supporterPlayedThisTurn: false,
      stadiumPlayedThisTurn: false,
      retreatedThisTurn: false,
      attackedThisTurn: false,
      abilitiesUsed: {},
    },
  };
}

export function createInitialGameState(gameId = 'match-001'): GameState {
  return {
    gameId,
    turnNumber: 0,
    activePlayerIndex: 0,
    firstPlayerIndex: 0,
    phase: 'PRE_GAME',
    players: [
      createEmptyPlayerState('p0', 'Player 1'),
      createEmptyPlayerState('p1', 'Player 2'),
    ],
    stadium: null,
    winner: null,
    actionLog: [],
  };
}

export function reduceGame(state: GameState, action: GameAction): { nextState: GameState; error?: string } {
  // Handle undo action directly
  if (action.type === 'GAME_UNDO_STEP') {
    if (!state.undoStack || state.undoStack.length === 0) {
      return { nextState: state, error: 'ไม่มีประวัติการกระทำที่สามารถย้อนกลับได้' };
    }
    const stack = [...state.undoStack];
    const previousState = stack.pop()!;
    previousState.undoStack = stack;
    return { nextState: previousState };
  }

  const cloned: GameState = JSON.parse(JSON.stringify(state));

  // Maintain undo stack (up to 20 snapshots)
  const snapshot: GameState = JSON.parse(JSON.stringify(state));
  delete snapshot.undoStack;
  const currentStack = [...(state.undoStack || [])];
  if (currentStack.length >= 20) {
    currentStack.shift();
  }
  currentStack.push(snapshot);
  cloned.undoStack = currentStack;

  switch (action.type) {
    case 'SETUP_DECKS': {
      if (action.player0Deck.length !== 60 || action.player1Deck.length !== 60) {
        return { nextState: state, error: 'สำรับการ์ดต้องมี 60 ใบพอดีตามกฎ Standard' };
      }

      cloned.players[0].deck = [...action.player0Deck];
      cloned.players[1].deck = [...action.player1Deck];
      cloned.firstPlayerIndex = action.firstPlayerIndex;
      cloned.activePlayerIndex = action.firstPlayerIndex;

      // Authentic Pokémon TCG rule: Thoroughly shuffle both 60-card decks before dealing
      EffectPrimitives.shuffleDeck(cloned, 0);
      EffectPrimitives.shuffleDeck(cloned, 1);

      // Deal opening hands of 7 cards from top of shuffled deck
      cloned.players[0].hand = cloned.players[0].deck.splice(0, 7);
      cloned.players[1].hand = cloned.players[1].deck.splice(0, 7);

      // Deal 6 prize cards face-down immediately for both players
      cloned.players[0].prizes = cloned.players[0].deck.splice(0, 6).map((c) => ({ ...c, isFacedown: true }));
      cloned.players[1].prizes = cloned.players[1].deck.splice(0, 6).map((c) => ({ ...c, isFacedown: true }));

      // Auto-resolve opening mulligans if hand lacks basic Pokémon
      for (let p = 0; p < 2; p++) {
        let attempts = 0;
        while (!cloned.players[p].hand.some((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic')) && attempts < 10) {
          cloned.players[p].deck.push(...cloned.players[p].hand);
          cloned.players[p].hand = [];
          cloned.players[p].mulliganCount += 1;
          EffectPrimitives.shuffleDeck(cloned, p as 0 | 1);
          cloned.players[p].hand = cloned.players[p].deck.splice(0, 7);
          attempts++;
        }
      }

      cloned.phase = 'SETUP_PLACEMENT';
      break;
    }

    case 'EXECUTE_MULLIGAN': {
      const player = cloned.players[action.playerIndex];
      player.deck.push(...player.hand);
      player.hand = [];
      player.mulliganCount += 1;
      // Re-shuffle deck thoroughly
      EffectPrimitives.shuffleDeck(cloned, action.playerIndex);
      // Re-deal 7 cards from top of shuffled deck
      player.hand = player.deck.splice(0, 7);
      break;
    }

    case 'CONFIRM_OPENING_HAND': {
      // Both players confirm hands have at least 1 Basic Pokémon
      cloned.phase = 'SETUP_PLACEMENT';
      break;
    }

    case 'CLAIM_MULLIGAN_DRAWS': {
      const player = cloned.players[action.playerIndex];
      const draws = Math.min(action.drawCount, player.deck.length);
      const drawnCards = player.deck.splice(0, draws);
      player.hand.push(...drawnCards);
      break;
    }

    case 'SET_INITIAL_ACTIVE': {
      const player = cloned.players[action.playerIndex];
      const cardIdx = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
      if (cardIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ดที่เลือกในมือ' };
      }
      const [card] = player.hand.splice(cardIdx, 1);
      player.active = {
        instanceId: `active-${action.playerIndex}-${Date.now()}`,
        card: { ...card, isFacedown: true },
        stage: 'Basic',
        maxHp: card.hp || 70,
        damageCounters: 0,
        attachedEnergies: [],
        attachedTool: null,
        evolutionHistory: [],
        specialConditions: [],
        turnEnteredPlay: 0,
        turnEvolved: 0,
      };
      break;
    }

    case 'SET_INITIAL_BENCH': {
      const player = cloned.players[action.playerIndex];
      for (const cardId of action.cardInstanceIds) {
        const cardIdx = player.hand.findIndex((c) => c.instanceId === cardId);
        if (cardIdx !== -1) {
          const [card] = player.hand.splice(cardIdx, 1);
          const emptyBenchIdx = player.bench.findIndex((b) => b === null);
          if (emptyBenchIdx !== -1) {
            player.bench[emptyBenchIdx] = {
              instanceId: `bench-${action.playerIndex}-${emptyBenchIdx}-${Date.now()}`,
              card: { ...card, isFacedown: true },
              stage: 'Basic',
              maxHp: card.hp || 70,
              damageCounters: 0,
              attachedEnergies: [],
              attachedTool: null,
              evolutionHistory: [],
              specialConditions: [],
              turnEnteredPlay: 0,
              turnEvolved: 0,
            };
          }
        }
      }
      break;
    }

    case 'REVEAL_AND_START_GAME': {
      // Reveal active & bench for both players
      for (let p = 0; p < 2; p++) {
        const player = cloned.players[p];
        if (player.active) {
          player.active.card.isFacedown = false;
        }
        player.bench.forEach((b) => {
          if (b) b.card.isFacedown = false;
        });
        // Deal 6 prize cards face-down if not already set
        if (player.prizes.length === 0) {
          player.prizes = player.deck.splice(0, 6).map((c) => ({ ...c, isFacedown: true }));
        }
      }

      cloned.turnNumber = 1;
      cloned.activePlayerIndex = cloned.firstPlayerIndex;
      cloned.phase = 'DRAW_PHASE';
      break;
    }

    case 'DRAW_TURN_CARD': {
      const validation = ActionValidator.canDrawTurnCard(cloned, action.playerIndex);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const player = cloned.players[action.playerIndex];
      // Rule: If deck is empty, player loses immediately (Deck Out)
      if (player.deck.length === 0) {
        cloned.winner = action.playerIndex === 0 ? 1 : 0;
        cloned.winReason = 'DECK_OUT';
        cloned.phase = 'GAME_OVER';
        break;
      }

      const [drawn] = player.deck.splice(0, 1);
      player.hand.push(drawn);
      cloned.phase = 'MAIN_PHASE';
      break;
    }

    case 'PLAY_BASIC_POKEMON': {
      const player = cloned.players[action.playerIndex];
      const cardIdx = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
      if (cardIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ดบนมือ' };
      }
      const card = player.hand[cardIdx];

      const validation = ActionValidator.canPlayBasicPokemon(
        cloned,
        action.playerIndex,
        card,
        action.benchIndex,
        action.targetPosition
      );
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      player.hand.splice(cardIdx, 1);

      // Check if placing as Active
      if (action.targetPosition === 'ACTIVE' || (player.active === null && action.targetPosition !== 'BENCH')) {
        player.active = {
          instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          card: { ...card, isFacedown: false },
          stage: 'Basic',
          maxHp: card.hp || 70,
          damageCounters: 0,
          attachedEnergies: [],
          attachedTool: null,
          evolutionHistory: [],
          specialConditions: [],
          turnEnteredPlay: cloned.turnNumber || 0,
          turnEvolved: 0,
        };

        // If in SETUP_PLACEMENT, check whether both players have an active Pokémon
        if (cloned.phase === 'SETUP_PLACEMENT') {
          const oppIndex = (1 - action.playerIndex) as 0 | 1;
          const opp = cloned.players[oppIndex];
          if (!opp.active) {
            const oppBasicIdx = opp.hand.findIndex((c) => c.supertype === 'Pokemon' && c.subtypes.includes('Basic'));
            if (oppBasicIdx !== -1) {
              const [oppCard] = opp.hand.splice(oppBasicIdx, 1);
              opp.active = {
                instanceId: `pokemon-opp-${Date.now()}`,
                card: { ...oppCard, isFacedown: false },
                stage: 'Basic',
                maxHp: oppCard.hp || 70,
                damageCounters: 0,
                attachedEnergies: [],
                attachedTool: null,
                evolutionHistory: [],
                specialConditions: [],
                turnEnteredPlay: 0,
                turnEvolved: 0,
              };
            }
          }

          if (cloned.players[0].active && cloned.players[1].active) {
            cloned.turnNumber = 1;
            cloned.activePlayerIndex = cloned.firstPlayerIndex;
            cloned.phase = 'DRAW_PHASE';
          }
        }
      } else {
        // Placing as Bench
        const maxBench = cloned.stadium?.nameEn?.includes('Area Zero') ? 8 : 5;
        const targetBenchIdx = action.benchIndex !== undefined
          ? action.benchIndex
          : player.bench.findIndex((b, idx) => idx < maxBench && b === null);

        if (targetBenchIdx !== -1 && targetBenchIdx < player.bench.length) {
          player.bench[targetBenchIdx] = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card: { ...card, isFacedown: false },
            stage: 'Basic',
            maxHp: card.hp || 70,
            damageCounters: 0,
            attachedEnergies: [],
            attachedTool: null,
            evolutionHistory: [],
            specialConditions: [],
            turnEnteredPlay: cloned.turnNumber || 0,
            turnEvolved: 0,
          };
        }
      }
      break;
    }

    case 'EVOLVE_POKEMON': {
      const player = cloned.players[action.playerIndex];
      const evoCardIdx = player.hand.findIndex((c) => c.instanceId === action.evolutionCardInstanceId);
      if (evoCardIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ดวิวัฒนาการบนมือ' };
      }
      const evoCard = player.hand[evoCardIdx];

      // Find target Pokémon (active or bench)
      let target: PokemonInPlay | null = null;
      if (player.active?.instanceId === action.targetPokemonInstanceId) {
        target = player.active;
      } else {
        target = player.bench.find((b) => b?.instanceId === action.targetPokemonInstanceId) || null;
      }

      if (!target) {
        return { nextState: state, error: 'ไม่พบโปเกมอนเป้าหมายที่จะพัฒนาร่าง' };
      }

      const validation = ActionValidator.canEvolvePokemon(cloned, action.playerIndex, evoCard, target);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      player.hand.splice(evoCardIdx, 1);
      target.evolutionHistory.push(target.card);
      target.card = evoCard;
      target.stage = (evoCard.subtypes.find((s) => s.startsWith('Stage')) as any) || 'Stage1';
      target.maxHp = evoCard.hp || target.maxHp;
      target.turnEvolved = cloned.turnNumber;
      // Rule: Evolution cures all special conditions!
      target.specialConditions = [];

      // Trigger On-Evolution Abilities (e.g. Infernal Reign)
      const onEvoAbilities = evoCard.abilities?.filter(
        (a) => a.trigger === 'on-evolution' || a.name.toLowerCase().includes('infernal reign')
      );
      if (onEvoAbilities && onEvoAbilities.length > 0) {
        for (const ab of onEvoAbilities) {
          EffectRegistry.executeAbility(cloned, action.playerIndex, target, ab.name, action.choices);
        }
      }
      break;
    }

    case 'ATTACH_ENERGY': {
      const validation = ActionValidator.canAttachEnergy(cloned, action.playerIndex);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const player = cloned.players[action.playerIndex];
      const energyIdx = player.hand.findIndex((c) => c.instanceId === action.energyCardInstanceId);
      if (energyIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ดพลังงานบนมือ' };
      }

      let target: PokemonInPlay | null = null;
      if (player.active?.instanceId === action.targetPokemonInstanceId) {
        target = player.active;
      } else {
        target = player.bench.find((b) => b?.instanceId === action.targetPokemonInstanceId) || null;
      }

      if (!target) {
        return { nextState: state, error: 'ไม่พบโปเกมอนที่จะติดพลังงาน' };
      }

      const [energyCard] = player.hand.splice(energyIdx, 1);
      target.attachedEnergies.push(energyCard);
      player.turnFlags.energyAttachedThisTurn = true;
      break;
    }

    case 'ATTACH_TOOL': {
      const player = cloned.players[action.playerIndex];
      const cardIdx = player.hand.findIndex((c) => c.instanceId === action.toolCardInstanceId);
      if (cardIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ด Pokémon Tool บนมือ' };
      }

      let target: PokemonInPlay | null = null;
      if (player.active?.instanceId === action.targetPokemonInstanceId) {
        target = player.active;
      } else {
        target = player.bench.find((b) => b?.instanceId === action.targetPokemonInstanceId) || null;
      }

      if (!target) {
        return { nextState: state, error: 'ไม่พบโปเกมอนที่จะติดไอเทมโปเกมอน' };
      }

      const validation = ActionValidator.canAttachTool(cloned, action.playerIndex, target);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const [removedTool] = player.hand.splice(cardIdx, 1);
      target.attachedTool = removedTool;

      // Apply Tool stat effects (e.g. Hero's Cape +100 HP, Bravery Charm +50 HP to Basic)
      const toolName = removedTool.nameEn?.toLowerCase() || '';
      if (toolName.includes("hero's cape")) {
        target.maxHp += 100;
      } else if (toolName.includes('bravery charm') && target.stage === 'Basic') {
        target.maxHp += 50;
      }
      break;
    }

    case 'PLAY_ITEM': {
      const player = cloned.players[action.playerIndex];
      const cardIdx = player.hand.findIndex((c) => c.instanceId === action.itemCardInstanceId);
      if (cardIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ด Item บนมือ' };
      }

      const itemCard = player.hand[cardIdx];
      const validation = ActionValidator.canPlayItem(cloned, action.playerIndex, itemCard);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const result = EffectRegistry.executeItem(cloned, action.playerIndex, itemCard, action.choices);
      if (!result.success) {
        return { nextState: state, error: result.error };
      }

      // Discard item from hand
      const itemIdx = player.hand.findIndex((c) => c.instanceId === action.itemCardInstanceId);
      if (itemIdx !== -1) {
        const [discarded] = player.hand.splice(itemIdx, 1);
        player.discard.push(discarded);
      }
      break;
    }

    case 'PLAY_SUPPORTER': {
      const player = cloned.players[action.playerIndex];
      const cardIdx = player.hand.findIndex((c) => c.instanceId === action.supporterCardInstanceId);
      if (cardIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ด Supporter บนมือ' };
      }

      const supporter = player.hand[cardIdx];
      const validation = ActionValidator.canPlaySupporter(cloned, action.playerIndex, supporter);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const result = EffectRegistry.executeSupporter(cloned, action.playerIndex, supporter, action.choices);
      if (!result.success) {
        return { nextState: state, error: result.error };
      }

      const sIdx = player.hand.findIndex((c) => c.instanceId === action.supporterCardInstanceId);
      if (sIdx !== -1) {
        const [discarded] = player.hand.splice(sIdx, 1);
        player.discard.push(discarded);
      }
      player.turnFlags.supporterPlayedThisTurn = true;
      break;
    }

    case 'USE_ABILITY': {
      const player = cloned.players[action.playerIndex];
      let pokemon: PokemonInPlay | null = null;
      if (player.active?.instanceId === action.sourcePokemonInstanceId) {
        pokemon = player.active;
      } else {
        pokemon = player.bench.find((b) => b?.instanceId === action.sourcePokemonInstanceId) || null;
      }

      if (!pokemon) {
        return { nextState: state, error: 'ไม่พบโปเกมอนที่เป็นเจ้าของความสามารถนี้ในสนาม' };
      }

      const validation = ActionValidator.canUseAbility(cloned, action.playerIndex, pokemon, action.abilityName);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const result = EffectRegistry.executeAbility(
        cloned,
        action.playerIndex,
        pokemon,
        action.abilityName,
        action.choices
      );
      if (!result.success) {
        return { nextState: state, error: result.error };
      }

      const ability = pokemon.card.abilities?.find(
        (ab) => ab.name.toLowerCase().trim() === action.abilityName.toLowerCase().trim()
      );
      const clean = action.abilityName.toLowerCase().trim();
      const isGlobal =
        ability?.isGlobalOncePerTurn ??
        (clean.includes('quick search') ||
          clean.includes('flip the script') ||
          clean.includes('instant charge') ||
          clean.includes('squawk and seize'));

      if (isGlobal) {
        player.turnFlags.abilitiesUsed[ability?.name || action.abilityName] = true;
      } else {
        player.turnFlags.abilitiesUsed[`${pokemon.instanceId}:${ability?.name || action.abilityName}`] = true;
      }

      // End turn if Instant Charge
      if (clean.includes('instant charge')) {
        cloned.phase = 'CHECKUP_PHASE';
      }
      break;
    }

    case 'PLAY_STADIUM': {
      const player = cloned.players[action.playerIndex];
      const cardIdx = player.hand.findIndex((c) => c.instanceId === action.stadiumCardInstanceId);
      if (cardIdx === -1) {
        return { nextState: state, error: 'ไม่พบการ์ด Stadium บนมือ' };
      }
      const stadiumCard = player.hand[cardIdx];

      const validation = ActionValidator.canPlayStadium(cloned, action.playerIndex, stadiumCard);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      player.hand.splice(cardIdx, 1);
      if (cloned.stadium) {
        // Discard old stadium to its owner's discard
        cloned.players[action.playerIndex === 0 ? 1 : 0].discard.push(cloned.stadium);
      }
      cloned.stadium = stadiumCard;
      player.turnFlags.stadiumPlayedThisTurn = true;
      break;
    }

    case 'RETREAT_ACTIVE': {
      const validation = ActionValidator.canRetreatActive(
        cloned,
        action.playerIndex,
        action.benchIndex,
        action.energyDiscardInstanceIds
      );
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const player = cloned.players[action.playerIndex];
      const active = player.active!;

      // Discard retreat cost energies
      for (const discardId of action.energyDiscardInstanceIds) {
        const eIdx = active.attachedEnergies.findIndex((e) => e.instanceId === discardId);
        if (eIdx !== -1) {
          const [discarded] = active.attachedEnergies.splice(eIdx, 1);
          player.discard.push(discarded);
        }
      }

      // Rule: Retreating cures all special conditions!
      active.specialConditions = [];

      // Swap active and bench
      const benchPokemon = player.bench[action.benchIndex]!;
      player.bench[action.benchIndex] = active;
      player.active = benchPokemon;
      player.turnFlags.retreatedThisTurn = true;
      break;
    }

    case 'DECLARE_ATTACK': {
      const validation = ActionValidator.canDeclareAttack(cloned, action.playerIndex, action.attackIndex);
      if (!validation.valid) {
        return { nextState: state, error: validation.error };
      }

      const attacker = cloned.players[action.playerIndex].active!;
      const defenderPlayerIndex = action.playerIndex === 0 ? 1 : 0;
      const defenderPlayer = cloned.players[defenderPlayerIndex];
      const defender = defenderPlayer.active;

      if (!defender) {
        return { nextState: state, error: 'ฝ่ายตรงข้ามไม่มีโปเกมอนในตำแหน่ง Active Spot' };
      }

      const attack = attacker.card.attacks![action.attackIndex];
      const evaluated = EffectRegistry.evaluateAttack(
        cloned,
        action.playerIndex,
        attacker,
        attack.name,
        attack.damage || 0,
        action.choices
      );
      let damage = evaluated.damage;

      // Calculate Weakness (x2)
      if (defender.card.weakness && defender.card.weakness.type === attacker.card.energyType) {
        damage *= 2;
      }

      // Calculate Resistance (-30)
      if (defender.card.resistance && defender.card.resistance.type === attacker.card.energyType) {
        damage = Math.max(0, damage - 30);
      }

      // Apply damage counters (10 damage = 1 counter)
      defender.damageCounters += Math.floor(damage / 10);
      cloned.players[action.playerIndex].turnFlags.attackedThisTurn = true;

      // Check Knock Out
      const remainingHp = defender.maxHp - defender.damageCounters * 10;
      if (remainingHp <= 0) {
        defenderPlayer.turnFlags.pokemonKnockedOutLastTurn = true;
        // Discard Pokémon & all attachments
        defenderPlayer.discard.push(defender.card, ...defender.attachedEnergies, ...defender.evolutionHistory);
        if (defender.attachedTool) defenderPlayer.discard.push(defender.attachedTool);
        defenderPlayer.active = null;

        // Take Prize Cards (1 for normal, 2 for ex/V, 3 for VMAX) + any extra prize modifier (e.g. Iron Hands)
        let prizeCount = 1;
        if (defender.card.subtypes.includes('VMAX')) prizeCount = 3;
        else if (defender.card.subtypes.includes('ex') || defender.card.subtypes.includes('V')) prizeCount = 2;
        prizeCount += evaluated.extraPrizesOnKo;

        const actualPrizes = Math.min(prizeCount, cloned.players[action.playerIndex].prizes.length);
        const takenPrizes = cloned.players[action.playerIndex].prizes.splice(0, actualPrizes);
        cloned.players[action.playerIndex].hand.push(...takenPrizes.map((p) => ({ ...p, isFacedown: false })));

        // Win Condition 1: Took all 6 Prize cards
        if (cloned.players[action.playerIndex].prizes.length === 0) {
          cloned.winner = action.playerIndex;
          cloned.winReason = 'PRIZES';
          cloned.phase = 'GAME_OVER';
          break;
        }

        // Win Condition 2: Opponent has no Pokémon left in play
        const hasBenchLeft = defenderPlayer.bench.some((b) => b !== null);
        if (!hasBenchLeft) {
          cloned.winner = action.playerIndex;
          cloned.winReason = 'BENCH_OUT';
          cloned.phase = 'GAME_OVER';
          break;
        }

        // Must promote bench to active
        cloned.phase = 'PROMOTION_PHASE';
        cloned.pendingPromotionForPlayer = defenderPlayerIndex;
        break;
      }

      // If no KO, proceed to Checkup
      cloned.phase = 'CHECKUP_PHASE';
      break;
    }

    case 'PASS_TURN': {
      if (cloned.phase !== 'MAIN_PHASE') {
        return { nextState: state, error: 'ผ่านเทิร์นได้เฉพาะใน Main Phase เท่านั้น' };
      }
      cloned.phase = 'CHECKUP_PHASE';
      break;
    }

    case 'EXECUTE_CHECKUP': {
      // 1. Poison check (10 damage)
      // 2. Burn check (20 damage + coin flip)
      // 3. Sleep check (coin flip)
      // 4. Paralysis cure
      for (let p = 0; p < 2; p++) {
        const active = cloned.players[p].active;
        if (!active) continue;

        if (active.specialConditions.includes('POISON')) {
          active.damageCounters += 1;
        }
        if (active.specialConditions.includes('BURN')) {
          active.damageCounters += 2;
          // 50% coin flip simulation: Heads cures Burn
          if (Math.random() >= 0.5) {
            active.specialConditions = active.specialConditions.filter((c) => c !== 'BURN');
          }
        }
        if (active.specialConditions.includes('ASLEEP')) {
          // 50% coin flip: Heads wakes up
          if (Math.random() >= 0.5) {
            active.specialConditions = active.specialConditions.filter((c) => c !== 'ASLEEP');
          }
        }
        if (active.specialConditions.includes('PARALYZED')) {
          // Paralysis cured at the end of the affected player's turn
          if (p === cloned.activePlayerIndex) {
            active.specialConditions = active.specialConditions.filter((c) => c !== 'PARALYZED');
          }
        }
      }

      // Check checkup knockouts
      for (let p = 0; p < 2; p++) {
        const active = cloned.players[p].active;
        if (active && active.maxHp - active.damageCounters * 10 <= 0) {
          const opponentIdx = (p === 0 ? 1 : 0) as 0 | 1;
          cloned.players[p].discard.push(
            active.card,
            ...active.attachedEnergies,
            ...active.evolutionHistory
          );
          if (active.attachedTool) {
            cloned.players[p].discard.push(active.attachedTool);
          }
          cloned.players[p].active = null;

          // Prize card (1 for normal, 2 for ex/V, 3 for VMAX)
          let prizeCount = 1;
          if (active.card.subtypes.includes('VMAX')) prizeCount = 3;
          else if (active.card.subtypes.includes('ex') || active.card.subtypes.includes('V')) prizeCount = 2;
          const actualPrizes = Math.min(prizeCount, cloned.players[opponentIdx].prizes.length);
          const taken = cloned.players[opponentIdx].prizes.splice(0, actualPrizes);
          cloned.players[opponentIdx].hand.push(...taken.map((c) => ({ ...c, isFacedown: false })));

          if (cloned.players[opponentIdx].prizes.length === 0) {
            cloned.winner = opponentIdx;
            cloned.winReason = 'PRIZES';
            cloned.phase = 'GAME_OVER';
            return { nextState: cloned };
          }

          const hasBenchLeft = cloned.players[p].bench.some((b) => b !== null);
          if (!hasBenchLeft) {
            cloned.winner = opponentIdx;
            cloned.winReason = 'BENCH_OUT';
            cloned.phase = 'GAME_OVER';
            return { nextState: cloned };
          }

          // Must promote bench to active
          cloned.phase = 'PROMOTION_PHASE';
          cloned.pendingPromotionForPlayer = p as 0 | 1;
          return { nextState: cloned };
        }
      }

      // Advance turn: reset the ending player's KO flag
      cloned.players[cloned.activePlayerIndex].turnFlags.pokemonKnockedOutLastTurn = false;

      cloned.turnNumber += 1;
      cloned.activePlayerIndex = cloned.activePlayerIndex === 0 ? 1 : 0;
      // Reset turn flags for the new active player
      cloned.players[cloned.activePlayerIndex].turnFlags = {
        energyAttachedThisTurn: false,
        supporterPlayedThisTurn: false,
        stadiumPlayedThisTurn: false,
        retreatedThisTurn: false,
        attackedThisTurn: false,
        pokemonKnockedOutLastTurn: cloned.players[cloned.activePlayerIndex].turnFlags.pokemonKnockedOutLastTurn || false,
        abilitiesUsed: {},
      };
      cloned.phase = 'DRAW_PHASE';
      break;
    }

    case 'PROMOTE_BENCH_TO_ACTIVE': {
      const player = cloned.players[action.playerIndex];
      if (player.active !== null) {
        return { nextState: state, error: 'Active Spot ยังมีโปเกมอนอยู่ ไม่จำเป็นต้องโปรโมต' };
      }
      if (action.benchIndex < 0 || action.benchIndex >= player.bench.length || !player.bench[action.benchIndex]) {
        return { nextState: state, error: 'ตำแหน่ง Bench ที่เลือกไม่มีโปเกมอน' };
      }

      const [promoted] = player.bench.splice(action.benchIndex, 1, null);
      player.active = promoted;
      cloned.pendingPromotionForPlayer = undefined;
      cloned.phase = 'CHECKUP_PHASE';
      break;
    }

    // ==========================================
    // Tabletop Sandbox & Full Player Agency Handlers (Playmat V3)
    // ==========================================

    case 'MANUAL_DRAW_CARDS': {
      const player = cloned.players[action.playerIndex];
      const count = Math.min(action.count, player.deck.length);
      if (count > 0) {
        const drawn = player.deck.splice(0, count).map((c) => ({ ...c, isFacedown: false }));
        player.hand.push(...drawn);
      }
      if (cloned.phase === 'DRAW_PHASE') {
        cloned.phase = 'MAIN_PHASE';
      }
      break;
    }

    case 'MANUAL_MOVE_CARD': {
      const player = cloned.players[action.playerIndex];
      let card: CardInstance | null = null;

      // Extract card from fromZone
      switch (action.fromZone) {
        case 'HAND': {
          const idx = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
          if (idx !== -1) [card] = player.hand.splice(idx, 1);
          break;
        }
        case 'DECK': {
          const idx = player.deck.findIndex((c) => c.instanceId === action.cardInstanceId);
          if (idx !== -1) [card] = player.deck.splice(idx, 1);
          break;
        }
        case 'DISCARD': {
          const idx = player.discard.findIndex((c) => c.instanceId === action.cardInstanceId);
          if (idx !== -1) [card] = player.discard.splice(idx, 1);
          break;
        }
        case 'LOST_ZONE': {
          const idx = player.lostZone.findIndex((c) => c.instanceId === action.cardInstanceId);
          if (idx !== -1) [card] = player.lostZone.splice(idx, 1);
          break;
        }
        case 'PRIZES': {
          const idx = player.prizes.findIndex((c) => c.instanceId === action.cardInstanceId);
          if (idx !== -1) [card] = player.prizes.splice(idx, 1);
          break;
        }
        case 'ACTIVE': {
          if (player.active && player.active.card.instanceId === action.cardInstanceId) {
            card = player.active.card;
            player.active = null;
          }
          break;
        }
        case 'BENCH': {
          for (let i = 0; i < player.bench.length; i++) {
            const b = player.bench[i];
            if (b && b.card.instanceId === action.cardInstanceId) {
              card = b.card;
              player.bench[i] = null;
              break;
            }
          }
          break;
        }
      }

      if (!card) {
        return { nextState: state, error: `ไม่พบการ์ด ${action.cardInstanceId} ใน ${action.fromZone}` };
      }

      // Insert card into toZone
      switch (action.toZone) {
        case 'HAND': {
          card.isFacedown = false;
          player.hand.push(card);
          break;
        }
        case 'DECK': {
          card.isFacedown = true;
          if (action.deckPosition === 'BOTTOM') {
            player.deck.push(card);
          } else {
            player.deck.unshift(card);
          }
          break;
        }
        case 'DISCARD': {
          card.isFacedown = false;
          player.discard.push(card);
          break;
        }
        case 'LOST_ZONE': {
          card.isFacedown = false;
          player.lostZone.push(card);
          break;
        }
        case 'PRIZES': {
          card.isFacedown = true;
          player.prizes.push(card);
          break;
        }
        case 'BENCH': {
          card.isFacedown = false;
          const newMon: PokemonInPlay = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card,
            stage: (card.subtypes.includes('Stage 2') || card.subtypes.includes('Stage2')) ? 'Stage2' : (card.subtypes.includes('Stage 1') || card.subtypes.includes('Stage1')) ? 'Stage1' : 'Basic',
            maxHp: card.hp || 70,
            damageCounters: 0,
            attachedEnergies: [],
            attachedTool: null,
            evolutionHistory: [],
            specialConditions: [],
            turnEnteredPlay: cloned.turnNumber,
            turnEvolved: 0,
          };
          const slot = action.benchIndex !== undefined && player.bench[action.benchIndex] === null
            ? action.benchIndex
            : player.bench.findIndex((b) => b === null);
          if (slot !== -1) {
            player.bench[slot] = newMon;
          } else {
            player.bench.push(newMon);
          }
          break;
        }
        case 'ACTIVE': {
          card.isFacedown = false;
          player.active = {
            instanceId: `pokemon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            card,
            stage: (card.subtypes.includes('Stage 2') || card.subtypes.includes('Stage2')) ? 'Stage2' : (card.subtypes.includes('Stage 1') || card.subtypes.includes('Stage1')) ? 'Stage1' : 'Basic',
            maxHp: card.hp || 70,
            damageCounters: 0,
            attachedEnergies: [],
            attachedTool: null,
            evolutionHistory: [],
            specialConditions: [],
            turnEnteredPlay: cloned.turnNumber,
            turnEvolved: 0,
          };
          break;
        }
      }
      break;
    }

    case 'MANUAL_ADJUST_DAMAGE': {
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (target) {
        target.pokemon.damageCounters = Math.max(0, target.pokemon.damageCounters + action.damageDelta);
      }
      break;
    }

    case 'MANUAL_SET_DAMAGE': {
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (target) {
        target.pokemon.damageCounters = Math.max(0, action.damage);
      }
      break;
    }

    case 'MANUAL_MOVE_DAMAGE': {
      const src = findPokemonInPlay(cloned, action.sourcePokemonInstanceId);
      const tgt = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (src && tgt) {
        const moved = Math.min(src.pokemon.damageCounters, action.counters);
        src.pokemon.damageCounters -= moved;
        tgt.pokemon.damageCounters += moved;
      }
      break;
    }

    case 'MANUAL_ATTACH_ENERGY': {
      const player = cloned.players[action.playerIndex];
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (!target) return { nextState: state, error: 'ไม่พบเป้าหมายโปเกมอน' };

      let energyCard: CardInstance | null = null;
      if (action.fromZone === 'HAND') {
        const idx = player.hand.findIndex((c) => c.instanceId === action.cardInstanceId);
        if (idx !== -1) [energyCard] = player.hand.splice(idx, 1);
      } else if (action.fromZone === 'DECK') {
        const idx = player.deck.findIndex((c) => c.instanceId === action.cardInstanceId);
        if (idx !== -1) [energyCard] = player.deck.splice(idx, 1);
      } else if (action.fromZone === 'DISCARD') {
        const idx = player.discard.findIndex((c) => c.instanceId === action.cardInstanceId);
        if (idx !== -1) [energyCard] = player.discard.splice(idx, 1);
      }

      if (energyCard) {
        energyCard.isFacedown = false;
        target.pokemon.attachedEnergies.push(energyCard);
      }
      break;
    }

    case 'MANUAL_MOVE_ENERGY': {
      const src = findPokemonInPlay(cloned, action.sourcePokemonInstanceId);
      const tgt = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (src && tgt) {
        const idx = src.pokemon.attachedEnergies.findIndex((e) => e.instanceId === action.energyInstanceId);
        if (idx !== -1) {
          const [energy] = src.pokemon.attachedEnergies.splice(idx, 1);
          tgt.pokemon.attachedEnergies.push(energy);
        }
      }
      break;
    }

    case 'MANUAL_DISCARD_ATTACHMENT': {
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (target) {
        const idx = target.pokemon.attachedEnergies.findIndex((e) => e.instanceId === action.attachmentInstanceId);
        if (idx !== -1) {
          const [card] = target.pokemon.attachedEnergies.splice(idx, 1);
          card.isFacedown = false;
          const player = cloned.players[target.playerIndex];
          if (action.toZone === 'LOST_ZONE') {
            player.lostZone.push(card);
          } else if (action.toZone === 'HAND') {
            player.hand.push(card);
          } else {
            player.discard.push(card);
          }
        }
      }
      break;
    }

    case 'MANUAL_ATTACH_TOOL': {
      const player = cloned.players[action.playerIndex];
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (!target) return { nextState: state, error: 'ไม่พบเป้าหมายโปเกมอน' };

      let toolCard: CardInstance | null = null;
      if (action.fromZone === 'HAND') {
        const idx = player.hand.findIndex((c) => c.instanceId === action.toolCardInstanceId);
        if (idx !== -1) [toolCard] = player.hand.splice(idx, 1);
      } else if (action.fromZone === 'DECK') {
        const idx = player.deck.findIndex((c) => c.instanceId === action.toolCardInstanceId);
        if (idx !== -1) [toolCard] = player.deck.splice(idx, 1);
      }

      if (toolCard) {
        toolCard.isFacedown = false;
        if (target.pokemon.attachedTool) {
          player.discard.push(target.pokemon.attachedTool);
        }
        target.pokemon.attachedTool = toolCard;
      }
      break;
    }

    case 'MANUAL_DISCARD_TOOL': {
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (target && target.pokemon.attachedTool) {
        const tool = target.pokemon.attachedTool;
        target.pokemon.attachedTool = null;
        tool.isFacedown = false;
        const player = cloned.players[target.playerIndex];
        if (action.toZone === 'LOST_ZONE') {
          player.lostZone.push(tool);
        } else if (action.toZone === 'HAND') {
          player.hand.push(tool);
        } else {
          player.discard.push(tool);
        }
      }
      break;
    }

    case 'MANUAL_TAKE_PRIZE': {
      const player = cloned.players[action.playerIndex];
      if (action.prizeIndex !== undefined && action.prizeIndex >= 0 && action.prizeIndex < player.prizes.length) {
        const [prize] = player.prizes.splice(action.prizeIndex, 1);
        prize.isFacedown = false;
        player.hand.push(prize);
      } else {
        const count = action.count || 1;
        const taken = player.prizes.splice(0, count).map((c) => ({ ...c, isFacedown: false }));
        player.hand.push(...taken);
      }

      if (player.prizes.length === 0) {
        cloned.winner = action.playerIndex;
        cloned.winReason = 'PRIZES';
        cloned.phase = 'GAME_OVER';
      }
      break;
    }

    case 'MANUAL_SWAP_PRIZE': {
      const player = cloned.players[action.playerIndex];
      const handIdx = player.hand.findIndex((c) => c.instanceId === action.handCardInstanceId);
      if (handIdx !== -1 && action.prizeIndex >= 0 && action.prizeIndex < player.prizes.length) {
        const [fromHand] = player.hand.splice(handIdx, 1);
        const [fromPrize] = player.prizes.splice(action.prizeIndex, 1);
        fromHand.isFacedown = true;
        fromPrize.isFacedown = false;
        player.prizes.splice(action.prizeIndex, 0, fromHand);
        player.hand.push(fromPrize);
      }
      break;
    }

    case 'MANUAL_ADD_PRIZE_CARD': {
      const player = cloned.players[action.playerIndex];
      let card: CardInstance | null = null;
      if (action.fromZone === 'DECK' && player.deck.length > 0) {
        [card] = player.deck.splice(0, 1);
      } else if (action.fromZone === 'HAND' && player.hand.length > 0) {
        [card] = player.hand.splice(0, 1);
      }
      if (card) {
        card.isFacedown = true;
        player.prizes.push(card);
      }
      break;
    }

    case 'MANUAL_EVOLVE': {
      const player = cloned.players[action.playerIndex];
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (!target) return { nextState: state, error: 'ไม่พบเป้าหมายโปเกมอน' };

      let evoCard: CardInstance | null = null;
      if (action.fromZone === 'HAND') {
        const idx = player.hand.findIndex((c) => c.instanceId === action.evolutionCardInstanceId);
        if (idx !== -1) [evoCard] = player.hand.splice(idx, 1);
      } else if (action.fromZone === 'DECK') {
        const idx = player.deck.findIndex((c) => c.instanceId === action.evolutionCardInstanceId);
        if (idx !== -1) [evoCard] = player.deck.splice(idx, 1);
      }

      if (evoCard) {
        evoCard.isFacedown = false;
        target.pokemon.evolutionHistory.push(target.pokemon.card);
        target.pokemon.card = evoCard;
        target.pokemon.stage = (evoCard.subtypes.includes('Stage 2') || evoCard.subtypes.includes('Stage2'))
          ? 'Stage2'
          : (evoCard.subtypes.includes('Stage 1') || evoCard.subtypes.includes('Stage1'))
          ? 'Stage1'
          : 'Basic';
        target.pokemon.maxHp = evoCard.hp || target.pokemon.maxHp;
        target.pokemon.specialConditions = [];
        target.pokemon.turnEvolved = cloned.turnNumber;
      }
      break;
    }

    case 'MANUAL_DEVOLVE': {
      const target = findPokemonInPlay(cloned, action.targetPokemonInstanceId);
      if (target && target.pokemon.evolutionHistory.length > 0) {
        const currentCard = target.pokemon.card;
        const prevCard = target.pokemon.evolutionHistory.pop()!;
        currentCard.isFacedown = false;
        const player = cloned.players[target.playerIndex];
        if (action.toZone === 'HAND') {
          player.hand.push(currentCard);
        } else {
          player.discard.push(currentCard);
        }
        target.pokemon.card = prevCard;
        target.pokemon.stage = (prevCard.subtypes.includes('Stage 2') || prevCard.subtypes.includes('Stage2'))
          ? 'Stage2'
          : (prevCard.subtypes.includes('Stage 1') || prevCard.subtypes.includes('Stage1'))
          ? 'Stage1'
          : 'Basic';
        target.pokemon.maxHp = prevCard.hp || target.pokemon.maxHp;
      }
      break;
    }

    case 'MANUAL_SWITCH_POKEMON': {
      const player = cloned.players[action.playerIndex];
      if (action.benchIndex >= 0 && action.benchIndex < player.bench.length && player.bench[action.benchIndex]) {
        const oldActive = player.active;
        const newActive = player.bench[action.benchIndex]!;
        if (action.clearConditions !== false && oldActive) {
          oldActive.specialConditions = [];
        }
        player.active = newActive;
        player.bench[action.benchIndex] = oldActive;
      }
      break;
    }

    case 'MANUAL_GUST_OPPONENT': {
      const oppIdx = (1 - action.playerIndex) as 0 | 1;
      const opp = cloned.players[oppIdx];
      if (action.opponentBenchIndex >= 0 && action.opponentBenchIndex < opp.bench.length && opp.bench[action.opponentBenchIndex]) {
        const oldActive = opp.active;
        const newActive = opp.bench[action.opponentBenchIndex]!;
        if (oldActive) {
          oldActive.specialConditions = [];
        }
        opp.active = newActive;
        opp.bench[action.opponentBenchIndex] = oldActive;
      }
      break;
    }

    case 'MANUAL_TOGGLE_STATUS': {
      const player = cloned.players[action.playerIndex];
      if (player.active) {
        const existingIdx = player.active.specialConditions.indexOf(action.condition);
        if (action.value === true && existingIdx === -1) {
          player.active.specialConditions.push(action.condition);
        } else if (action.value === false && existingIdx !== -1) {
          player.active.specialConditions.splice(existingIdx, 1);
        } else if (action.value === undefined) {
          if (existingIdx !== -1) {
            player.active.specialConditions.splice(existingIdx, 1);
          } else {
            player.active.specialConditions.push(action.condition);
          }
        }
      }
      break;
    }

    case 'MANUAL_CLEAR_STATUS': {
      const player = cloned.players[action.playerIndex];
      if (player.active) {
        player.active.specialConditions = [];
      }
      break;
    }

    case 'MANUAL_SHUFFLE_DECK': {
      EffectPrimitives.shuffleDeck(cloned, action.playerIndex);
      break;
    }

    case 'MANUAL_DISCARD_STADIUM': {
      if (cloned.stadium) {
        cloned.players[cloned.activePlayerIndex].discard.push(cloned.stadium);
        cloned.stadium = null;
      }
      break;
    }

    case 'MANUAL_COIN_FLIP':
    case 'MANUAL_DICE_ROLL':
    case 'MANUAL_CUSTOM_ANNOUNCEMENT': {
      // Recorded in actionLog for tournament audit trail
      break;
    }

    case 'MANUAL_ATTACK_ASSIST': {
      const oppIdx = (1 - action.playerIndex) as 0 | 1;
      const opp = cloned.players[oppIdx];
      const player = cloned.players[action.playerIndex];

      // Active damage
      if (action.activeDamage > 0 && opp.active) {
        opp.active.damageCounters += action.activeDamage;
      }

      // Bench damage distributions
      if (action.benchDistributions) {
        for (const [targetId, dmg] of Object.entries(action.benchDistributions)) {
          const target = findPokemonInPlay(cloned, targetId);
          if (target && dmg > 0) {
            target.pokemon.damageCounters += dmg;
          }
        }
      }

      // Self damage
      if (action.selfDamage && action.selfDamage > 0 && player.active) {
        player.active.damageCounters += action.selfDamage;
      }

      // Check Knockouts for opp active
      if (opp.active && opp.active.damageCounters >= opp.active.maxHp) {
        opp.discard.push(opp.active.card);
        opp.discard.push(...opp.active.evolutionHistory);
        opp.discard.push(...opp.active.attachedEnergies);
        if (opp.active.attachedTool) opp.discard.push(opp.active.attachedTool);
        opp.active = null;

        // Auto-detect prizes (2 for ex/V/VSTAR/VMAX, 1 for regular)
        const isMultiPrize = opp.discard[opp.discard.length - 1]?.subtypes.some((s) =>
          ['ex', 'V', 'VSTAR', 'VMAX'].includes(s)
        );
        const prizesToTake = Math.min(player.prizes.length, isMultiPrize ? 2 : 1);
        const taken = player.prizes.splice(0, prizesToTake).map((c) => ({ ...c, isFacedown: false }));
        player.hand.push(...taken);

        if (player.prizes.length === 0) {
          cloned.winner = action.playerIndex;
          cloned.winReason = 'PRIZES';
          cloned.phase = 'GAME_OVER';
          break;
        }

        const hasBench = opp.bench.some((b) => b !== null);
        if (!hasBench) {
          cloned.winner = action.playerIndex;
          cloned.winReason = 'BENCH_OUT';
          cloned.phase = 'GAME_OVER';
          break;
        }

        cloned.phase = 'PROMOTION_PHASE';
        cloned.pendingPromotionForPlayer = oppIdx;
      }

      if (action.endTurn && cloned.phase !== 'GAME_OVER') {
        if (cloned.phase !== 'PROMOTION_PHASE') {
          cloned.turnNumber += 1;
          cloned.activePlayerIndex = oppIdx;
          cloned.players[oppIdx].turnFlags = {
            energyAttachedThisTurn: false,
            supporterPlayedThisTurn: false,
            stadiumPlayedThisTurn: false,
            retreatedThisTurn: false,
            attackedThisTurn: false,
            abilitiesUsed: {},
          };
          cloned.phase = 'DRAW_PHASE';
        }
      }
      break;
    }

    case 'CONCEDE': {
      cloned.winner = action.playerIndex === 0 ? 1 : 0;
      cloned.winReason = 'CONCEDE';
      cloned.phase = 'GAME_OVER';
      break;
    }
  }

  cloned.actionLog.push(action);
  return { nextState: cloned };
}

export const GameReducer = reduceGame;
