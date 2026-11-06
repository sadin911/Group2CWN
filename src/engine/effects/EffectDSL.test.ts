import { describe, it, expect } from 'vitest';
import { GameReducer, createInitialGameState } from '../GameReducer';
import { CardTemplates, buildCharizardExDeck, buildMiraidonExDeck, createCard } from '../data/StandardCardCatalog';
import { EffectRegistry } from './EffectDSL';
import type { PokemonInPlay } from '../types';

describe('Effect DSL & Card Registry', () => {
  it("Professor's Research discards hand and draws 7 cards", () => {
    let state = createInitialGameState();
    const p0Deck = buildCharizardExDeck();
    const p1Deck = buildMiraidonExDeck();

    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: p0Deck,
      player1Deck: p1Deck,
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2; // Not turn 1, so supporter is allowed
    state.activePlayerIndex = 0;

    // Give player 0 a Professor's Research and 3 other cards in hand
    const profResearch = createCard(CardTemplates.ProfessorsResearch);
    state.players[0].hand = [
      profResearch,
      createCard(CardTemplates.Charmander),
      createCard(CardTemplates.BasicFireEnergy),
      createCard(CardTemplates.UltraBall),
    ];

    const initialDiscardCount = state.players[0].discard.length;
    const initialDeckCount = state.players[0].deck.length;

    const res = GameReducer(state, {
      type: 'PLAY_SUPPORTER',
      playerIndex: 0,
      supporterCardInstanceId: profResearch.instanceId,
    });

    expect(res.error).toBeUndefined();
    // Hand should now have exactly 7 cards drawn from deck
    expect(res.nextState.players[0].hand.length).toBe(7);
    // Old 4 cards (supporter + 3 others) should be in discard
    expect(res.nextState.players[0].discard.length).toBe(initialDiscardCount + 4);
    // Deck should decrease by 7
    expect(res.nextState.players[0].deck.length).toBe(initialDeckCount - 7);
    expect(res.nextState.players[0].turnFlags.supporterPlayedThisTurn).toBe(true);
  });

  it('Iono shuffles hands to deck bottom and draws cards equal to remaining prize cards', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    // Set player 0 prizes to 4 cards, player 1 prizes to 2 cards
    state.players[0].prizes = [
      createCard(CardTemplates.BasicFireEnergy),
      createCard(CardTemplates.BasicFireEnergy),
      createCard(CardTemplates.BasicFireEnergy),
      createCard(CardTemplates.BasicFireEnergy),
    ];
    state.players[1].prizes = [
      createCard(CardTemplates.BasicLightningEnergy),
      createCard(CardTemplates.BasicLightningEnergy),
    ];

    const iono = createCard(CardTemplates.Iono);
    state.players[0].hand = [iono, createCard(CardTemplates.Charmander)];
    state.players[1].hand = [createCard(CardTemplates.MiraidonEx), createCard(CardTemplates.Switch)];

    const res = GameReducer(state, {
      type: 'PLAY_SUPPORTER',
      playerIndex: 0,
      supporterCardInstanceId: iono.instanceId,
    });

    expect(res.error).toBeUndefined();
    // Player 0 should draw 4 cards (matching 4 remaining prizes)
    expect(res.nextState.players[0].hand.length).toBe(4);
    // Player 1 should draw 2 cards (matching 2 remaining prizes)
    expect(res.nextState.players[1].hand.length).toBe(2);
  });

  it("Boss's Orders switches opponent's chosen benched Pokémon into the active spot", () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    // Set active for both players
    state.players[0].active = {
      instanceId: 'p0-active-zard',
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

    state.players[1].active = {
      instanceId: 'p1-active-miraidon',
      card: createCard(CardTemplates.MiraidonEx),
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

    const boss = createCard(CardTemplates.BossOrders);
    state.players[0].hand.push(boss);

    // Opponent active is Miraidon ex, Bench[1] is Iron Hands ex
    const ironHandsBench: PokemonInPlay = {
      instanceId: 'bench-iron-hands',
      card: createCard(CardTemplates.IronHandsEx),
      stage: 'Basic',
      maxHp: 230,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 0,
    };
    state.players[1].bench[1] = ironHandsBench;
    const oldOpponentActive = state.players[1].active;

    const res = GameReducer(state, {
      type: 'PLAY_SUPPORTER',
      playerIndex: 0,
      supporterCardInstanceId: boss.instanceId,
      choices: { opponentBenchIndex: 1 },
    });

    expect(res.error).toBeUndefined();
    // Opponent's active must now be Iron Hands ex
    expect(res.nextState.players[1].active?.card.nameEn).toBe('Iron Hands ex');
    // Bench spot 1 must now hold the previous active
    expect(res.nextState.players[1].bench[1]?.instanceId).toBe(oldOpponentActive?.instanceId);
  });

  it('Ultra Ball discards 2 cards and fetches a Pokémon from deck', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.activePlayerIndex = 0;

    const ultraBall = createCard(CardTemplates.UltraBall);
    const discard1 = createCard(CardTemplates.BasicFireEnergy);
    const discard2 = createCard(CardTemplates.BasicFireEnergy);
    state.players[0].hand = [ultraBall, discard1, discard2];

    // Find Charizard ex in deck
    const zardInDeck = state.players[0].deck.find((c) => c.nameEn === 'Charizard ex')!;

    const res = GameReducer(state, {
      type: 'PLAY_ITEM',
      playerIndex: 0,
      itemCardInstanceId: ultraBall.instanceId,
      choices: {
        discardCardInstanceIds: [discard1.instanceId, discard2.instanceId],
        selectedCardInstanceIds: [zardInDeck.instanceId],
      },
    });

    expect(res.error).toBeUndefined();
    // Hand should have Charizard ex
    expect(res.nextState.players[0].hand.some((c) => c.instanceId === zardInDeck.instanceId)).toBe(true);
    // Ultra ball and 2 discarded cards should be in discard pile
    expect(res.nextState.players[0].discard.some((c) => c.instanceId === ultraBall.instanceId)).toBe(true);
    expect(res.nextState.players[0].discard.some((c) => c.instanceId === discard1.instanceId)).toBe(true);
    expect(res.nextState.players[0].discard.some((c) => c.instanceId === discard2.instanceId)).toBe(true);
  });

  it('Rare Candy evolves Basic directly to Stage 2', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.turnNumber = 3;
    state.activePlayerIndex = 0;

    // Active is Charmander that entered in Turn 1
    state.players[0].active = {
      instanceId: 'active-charmander',
      card: createCard(CardTemplates.Charmander),
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

    const rareCandy = createCard(CardTemplates.RareCandy);
    const zardEx = createCard(CardTemplates.CharizardEx);
    state.players[0].hand = [rareCandy, zardEx];

    const res = GameReducer(state, {
      type: 'PLAY_ITEM',
      playerIndex: 0,
      itemCardInstanceId: rareCandy.instanceId,
      choices: {
        targetPokemonInstanceId: 'active-charmander',
        selectedCardInstanceIds: [zardEx.instanceId],
      },
    });

    expect(res.error).toBeUndefined();
    expect(res.nextState.players[0].active?.card.nameEn).toBe('Charizard ex');
    expect(res.nextState.players[0].active?.stage).toBe('Stage2');
    expect(res.nextState.players[0].active?.maxHp).toBe(330);
    expect(res.nextState.players[0].active?.evolutionHistory.length).toBe(1);
    expect(res.nextState.players[0].active?.evolutionHistory[0].nameEn).toBe('Charmander');
  });

  it('Charizard ex Infernal Reign attaches 3 Fire energy from deck upon evolution', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildCharizardExDeck(),
      player1Deck: buildMiraidonExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.turnNumber = 3;
    state.activePlayerIndex = 0;

    state.players[0].active = {
      instanceId: 'active-charmeleon',
      card: createCard(CardTemplates.Charmeleon),
      stage: 'Stage1',
      maxHp: 90,
      damageCounters: 0,
      attachedEnergies: [],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 1,
    };

    const zardCard = createCard(CardTemplates.CharizardEx);
    state.players[0].hand = [zardCard];

    // Pick 3 fire energies from deck
    const fireEnergies = state.players[0].deck
      .filter((c) => c.supertype === 'Energy' && c.energyType === 'Fire')
      .slice(0, 3);

    const res = GameReducer(state, {
      type: 'EVOLVE_POKEMON',
      playerIndex: 0,
      evolutionCardInstanceId: zardCard.instanceId,
      targetPokemonInstanceId: 'active-charmeleon',
      choices: {
        energyAttachments: fireEnergies.map((e) => ({
          energyInstanceId: e.instanceId,
          targetPokemonInstanceId: 'active-charmeleon',
        })),
      },
    });

    expect(res.error).toBeUndefined();
    expect(res.nextState.players[0].active?.card.nameEn).toBe('Charizard ex');
    // Should have 3 fire energies attached by Infernal Reign!
    expect(res.nextState.players[0].active?.attachedEnergies.length).toBe(3);
  });

  it('Charizard ex Burning Darkness scales damage by opponent prizes taken', () => {
    const state = createInitialGameState();
    state.players[0].prizes = new Array(6).fill({});
    state.players[1].prizes = new Array(2).fill({}); // Opponent took 4 prizes!

    const zardInPlay: PokemonInPlay = {
      instanceId: 'zard-1',
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

    const evalRes = EffectRegistry.evaluateAttack(state, 0, zardInPlay, 'Burning Darkness', 180);
    // Base 180 + (4 * 30) = 300 damage!
    expect(evalRes.damage).toBe(300);
  });

  it('Iron Hands ex Amp You Very Much takes an extra prize card on Knock Out', () => {
    let state = createInitialGameState();
    state = GameReducer(state, {
      type: 'SETUP_DECKS',
      player0Deck: buildMiraidonExDeck(),
      player1Deck: buildCharizardExDeck(),
      firstPlayerIndex: 0,
    }).nextState;

    state.phase = 'MAIN_PHASE';
    state.turnNumber = 2;
    state.activePlayerIndex = 0;

    // Attacker: Iron Hands ex with sufficient energy
    const handsCard = createCard(CardTemplates.IronHandsEx);
    state.players[0].active = {
      instanceId: 'hands-active',
      card: handsCard,
      stage: 'Basic',
      maxHp: 230,
      damageCounters: 0,
      attachedEnergies: [
        createCard(CardTemplates.BasicLightningEnergy),
        createCard(CardTemplates.BasicLightningEnergy),
        createCard(CardTemplates.BasicLightningEnergy),
        createCard(CardTemplates.BasicLightningEnergy),
      ],
      attachedTool: null,
      evolutionHistory: [],
      specialConditions: [],
      turnEnteredPlay: 1,
      turnEvolved: 0,
    };

    // Defender: Charmander (70 HP) with 1 Benched Pokemon so game doesn't end immediately
    state.players[1].active = {
      instanceId: 'charmander-def',
      card: createCard(CardTemplates.Charmander),
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
    state.players[1].bench[0] = {
      instanceId: 'pidgey-benched',
      card: createCard(CardTemplates.Pidgey),
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

    // Give player 0 exactly 6 prize cards
    state.players[0].prizes = new Array(6).fill(null).map(() => createCard(CardTemplates.BasicLightningEnergy));
    const initialPrizesP0 = state.players[0].prizes.length; // 6 prizes

    // Attack 0 is Amp You Very Much (120 damage vs 70 HP Charmander = KO)
    // Normally 1 prize, but Amp You Very Much grants +1 extra = 2 prizes!
    const res = GameReducer(state, {
      type: 'DECLARE_ATTACK',
      playerIndex: 0,
      attackIndex: 0,
    });

    expect(res.error).toBeUndefined();
    // 6 - 2 = 4 prizes remaining
    expect(res.nextState.players[0].prizes.length).toBe(initialPrizesP0 - 2);
    // Defender Charmander knocked out
    expect(res.nextState.players[1].active).toBeNull();
    expect(res.nextState.phase).toBe('PROMOTION_PHASE');
  });
});
