import { describe, it, expect } from 'vitest';
import {
  createInitialTabletopState,
  TabletopActions,
  makeTabletopPokemonSlot,
} from './tabletopStateHelper';
import { buildCharizardExDeck, CardTemplates, createCard } from '../../engine/data/StandardCardCatalog';

describe('Tabletop V3 Sandbox State Engine (Dual Player & Center Board)', () => {
  it('initializes table with all 60 cards in deck, 0 hand cards, and 0 prizes (no auto-draw, pure tabletop)', () => {
    const p1Cards = buildCharizardExDeck();
    const state = createInitialTabletopState(p1Cards, 'Charizard ex Deck', p1Cards, 'Opponent Deck');

    // Player 1: All 60 cards in deck, 0 in hand, 0 in prizes
    expect(state.player1.deck.length).toBe(60);
    expect(state.player1.hand.length).toBe(0);
    expect(state.player1.prizes.length).toBe(0);
    expect(state.player1.active).toBeNull();
    expect(state.player1.bench.length).toBe(5);
    expect(state.player1.bench.every((b) => b === null)).toBe(true);
    expect(state.player1.discard.length).toBe(0);
    expect(state.player1.lostZone.length).toBe(0);

    // Player 2: All 60 cards in deck, 0 in hand, 0 in prizes
    expect(state.player2.deck.length).toBe(60);
    expect(state.player2.hand.length).toBe(0);
    expect(state.player2.prizes.length).toBe(0);
    expect(state.player2.active).toBeNull();
    expect(state.player2.bench.length).toBe(5);

    // Center Board & Global Settings
    expect(state.stadium).toBeNull();
    expect(state.activeSpotlight).toBeNull();
    expect(state.currentTurn).toBe('player1');
    expect(state.perspective).toBe('player1');
    expect(state.soloRevealAllHands).toBe(false);
    expect(state.turnCount).toBe(1);
  });

  it('allows manual setup of 6 prizes from top of deck', () => {
    const p1Cards = buildCharizardExDeck();
    let state = createInitialTabletopState(p1Cards);

    expect(state.player1.prizes.length).toBe(0);
    expect(state.player1.deck.length).toBe(60);

    state = TabletopActions.setupPrizes(state, 'player1', 6);
    expect(state.player1.prizes.length).toBe(6);
    expect(state.player1.deck.length).toBe(54);
  });

  it('allows manual mulligan (shuffles hand back into deck and draws 7 cards)', () => {
    const p1Cards = buildCharizardExDeck();
    let state = createInitialTabletopState(p1Cards);
    state = TabletopActions.drawCards(state, 'player1', 7);
    expect(state.player1.hand.length).toBe(7);

    state = TabletopActions.mulligan(state, 'player1');
    expect(state.player1.hand.length).toBe(7);
    expect(state.player1.deck.length).toBe(53);
    expect(state.historyLog.some((l) => l.includes('Mulligan'))).toBe(true);
  });

  it('allows starting a new match with chosen decks, 60 cards in deck, and 0 auto-draw', () => {
    const p1Cards = buildCharizardExDeck();
    const p2Cards = [createCard(CardTemplates.Pidgey), createCard(CardTemplates.Pidgeotto)];
    let state = createInitialTabletopState(p1Cards);

    state = TabletopActions.startNewMatch(state, p1Cards, 'Charizard ex', p2Cards, 'Pidgeot Deck', 'player2');
    expect(state.player1.deckName).toBe('Charizard ex');
    expect(state.player2.deckName).toBe('Pidgeot Deck');
    expect(state.player1.hand.length).toBe(0);
    expect(state.player1.prizes.length).toBe(0);
    expect(state.player2.hand.length).toBe(0);
    expect(state.player2.prizes.length).toBe(0);
    expect(state.currentTurn).toBe('player2');
  });

  it('allows choosing and toggling who starts first', () => {
    const p1Cards = buildCharizardExDeck();
    let state = createInitialTabletopState(p1Cards);
    expect(state.currentTurn).toBe('player1');

    state = TabletopActions.setFirstPlayer(state, 'player2');
    expect(state.currentTurn).toBe('player2');

    state = TabletopActions.setFirstPlayer(state, 'player1');
    expect(state.currentTurn).toBe('player1');
  });

  it('thoroughly shuffles deck so cards do not appear in sorted order', () => {
    const p1Cards = buildCharizardExDeck();
    const state = createInitialTabletopState(p1Cards);

    // Verify deck is not in exact 1-to-1 catalog index order
    const originalNames = p1Cards.map((c) => c.nameEn);
    const shuffledNames = state.player1.deck.map((c) => c.nameEn);
    const isExactMatch = originalNames.every((name, idx) => name === shuffledNames[idx]);
    expect(isExactMatch).toBe(false);
  });

  it('allows placing card from hand to Active or Bench freely for either player', () => {
    const p1Cards = buildCharizardExDeck();
    let state = createInitialTabletopState(p1Cards);
    state = TabletopActions.drawCards(state, 'player1', 7);

    const card = state.player1.hand[0];
    state = TabletopActions.placeFromHand(state, 'player1', card.instanceId, 'ACTIVE');

    expect(state.player1.active).not.toBeNull();
    expect(state.player1.active?.card.instanceId).toBe(card.instanceId);
    expect(state.player1.hand.length).toBe(6);

    const secondCard = state.player1.hand[0];
    state = TabletopActions.placeFromHand(state, 'player1', secondCard.instanceId, 0);

    expect(state.player1.bench[0]).not.toBeNull();
    expect(state.player1.bench[0]?.card.instanceId).toBe(secondCard.instanceId);
    expect(state.player1.hand.length).toBe(5);
  });

  it('allows attaching unlimited energy to any Pokemon in play', () => {
    const deckCards = buildCharizardExDeck();
    let state = createInitialTabletopState(deckCards);
    state = TabletopActions.drawCards(state, 'player1', 7);

    // Place active for player 1
    const activeCard = state.player1.hand[0];
    state = TabletopActions.placeFromHand(state, 'player1', activeCard.instanceId, 'ACTIVE');

    // Attach 3 energies in succession without turn limitation
    const e1 = createCard(CardTemplates.BasicFireEnergy);
    const e2 = createCard(CardTemplates.BasicFireEnergy);
    const e3 = createCard(CardTemplates.BasicFireEnergy);
    state.player1.hand.push(e1, e2, e3);

    state = TabletopActions.attachEnergyFromHand(state, 'player1', e1.instanceId, 'ACTIVE');
    state = TabletopActions.attachEnergyFromHand(state, 'player1', e2.instanceId, 'ACTIVE');
    state = TabletopActions.attachEnergyFromHand(state, 'player1', e3.instanceId, 'ACTIVE');

    expect(state.player1.active?.attachedEnergies.length).toBe(3);
  });

  it('allows adjusting damage counters freely (+10, +50, -10, set total, full heal)', () => {
    const deckCards = buildCharizardExDeck();
    let state = createInitialTabletopState(deckCards);
    state = TabletopActions.drawCards(state, 'player1', 7);
    state = TabletopActions.placeFromHand(state, 'player1', state.player1.hand[0].instanceId, 'ACTIVE');

    state = TabletopActions.adjustDamage(state, 'player1', 'ACTIVE', 50);
    expect(state.player1.active?.damage).toBe(50);

    state = TabletopActions.adjustDamage(state, 'player1', 'ACTIVE', 10);
    expect(state.player1.active?.damage).toBe(60);

    state = TabletopActions.adjustDamage(state, 'player1', 'ACTIVE', -10);
    expect(state.player1.active?.damage).toBe(50);

    state = TabletopActions.setDamage(state, 'player1', 'ACTIVE', 180);
    expect(state.player1.active?.damage).toBe(180);

    state = TabletopActions.setDamage(state, 'player1', 'ACTIVE', 0);
    expect(state.player1.active?.damage).toBe(0);
  });

  it('handles evolution and devolution correctly', () => {
    const charmander = createCard(CardTemplates.Charmander);
    const charmeleon = createCard(CardTemplates.Charmeleon);

    let state = createInitialTabletopState([charmander, charmeleon, ...buildCharizardExDeck().slice(2)]);
    state.player1.active = makeTabletopPokemonSlot(charmander);
    state.player1.hand = [charmeleon];

    state = TabletopActions.evolveFromHand(state, 'player1', charmeleon.instanceId, 'ACTIVE');
    expect(state.player1.active!.card.nameEn).toBe('Charmeleon');
    expect(state.player1.active!.evolutionHistory.length).toBe(1);
    expect(state.player1.active!.evolutionHistory[0].nameEn).toBe('Charmander');
    expect(state.player1.hand.length).toBe(0);

    // Devolve
    state = TabletopActions.devolve(state, 'player1', 'ACTIVE');
    expect(state.player1.active!.card.nameEn).toBe('Charmander');
    expect(state.player1.active!.evolutionHistory.length).toBe(0);
    expect(state.player1.hand.length).toBe(1);
    expect(state.player1.hand[0].nameEn).toBe('Charmeleon');
  });

  it('switches Active with Bench freely', () => {
    const p1 = createCard(CardTemplates.Charmander);
    const p2 = createCard(CardTemplates.Pidgey);

    let state = createInitialTabletopState(buildCharizardExDeck());
    state.player1.active = makeTabletopPokemonSlot(p1);
    state.player1.bench[0] = makeTabletopPokemonSlot(p2);

    state = TabletopActions.switchActiveWithBench(state, 'player1', 0);

    expect(state.player1.active?.card.instanceId).toBe(p2.instanceId);
    expect(state.player1.bench[0]?.card.instanceId).toBe(p1.instanceId);
  });

  it('allows scooping up Pokemon and attachments back to hand', () => {
    const p1 = createCard(CardTemplates.Charmander);
    const energy = createCard(CardTemplates.BasicFireEnergy);

    let state = createInitialTabletopState(buildCharizardExDeck());
    state.player1.active = makeTabletopPokemonSlot(p1);
    state.player1.active.attachedEnergies.push(energy);

    state = TabletopActions.retractToHand(state, 'player1', 'ACTIVE');

    expect(state.player1.active).toBeNull();
    expect(state.player1.hand.some((c) => c.instanceId === p1.instanceId)).toBe(true);
    expect(state.player1.hand.some((c) => c.instanceId === energy.instanceId)).toBe(true);
  });

  it('allows taking prizes into hand and drawing cards', () => {
    const deckCards = buildCharizardExDeck();
    let state = createInitialTabletopState(deckCards);
    state = TabletopActions.setupPrizes(state, 'player1', 6);
    state = TabletopActions.drawCards(state, 'player1', 7);

    const initialPrizes = state.player1.prizes.length;
    const initialHand = state.player1.hand.length;

    state = TabletopActions.takePrize(state, 'player1', 0);
    expect(state.player1.prizes.length).toBe(initialPrizes - 1);
    expect(state.player1.hand.length).toBe(initialHand + 1);

    const initialDeck = state.player1.deck.length;
    state = TabletopActions.drawCards(state, 'player1', 3);
    expect(state.player1.deck.length).toBe(initialDeck - 3);
    expect(state.player1.hand.length).toBe(initialHand + 1 + 3);
  });

  it('plays Trainer card directly onto player board slot without popup modal, then dismisses to Discard', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const trainerCard = createCard(CardTemplates.UltraBall);
    state.player1.hand.push(trainerCard);

    // Play directly to player board slot (bypasses modal)
    state = TabletopActions.playTrainerToSpotlight(state, 'player1', trainerCard.instanceId);
    expect(state.activeSpotlight).toBeNull(); // No popup modal!
    expect(state.player1.revealedCard).not.toBeNull();
    expect(state.player1.revealedCard?.nameEn).toBe('Ultra Ball');
    expect(state.player1.hand.some((c) => c.instanceId === trainerCard.instanceId)).toBe(false);

    // Dismiss from board to discard
    state = TabletopActions.dismissRevealedCard(state, 'player1', 'DISCARD');
    expect(state.player1.revealedCard).toBeNull();
    expect(state.player1.discard.some((c) => c.instanceId === trainerCard.instanceId)).toBe(true);
  });

  it('reveals card to player board slot for opponent to see', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    state = TabletopActions.drawCards(state, 'player1', 7);
    const cardToReveal = state.player1.hand[0];

    state = TabletopActions.revealCardToSpotlight(state, 'player1', cardToReveal, 'Player 1 reveals card');
    expect(state.player1.revealedCard).not.toBeNull();
    expect(state.player1.revealedCard?.instanceId).toBe(cardToReveal.instanceId);
    expect(state.player1.hand.some((c) => c.instanceId === cardToReveal.instanceId)).toBe(false);

    // Dismiss revealed card back to hand
    state = TabletopActions.dismissRevealedCard(state, 'player1', 'HAND');
    expect(state.player1.revealedCard).toBeNull();
    expect(state.player1.hand.some((c) => c.instanceId === cardToReveal.instanceId)).toBe(true);

    // Reveal again and dismiss to graveyard (discard)
    state = TabletopActions.revealCardToSpotlight(state, 'player1', cardToReveal);
    state = TabletopActions.dismissRevealedCard(state, 'player1', 'DISCARD');
    expect(state.player1.revealedCard).toBeNull();
    expect(state.player1.discard.some((c) => c.instanceId === cardToReveal.instanceId)).toBe(true);

    // Reveal and dismiss to Lost Zone
    state = TabletopActions.revealCardToSpotlight(state, 'player1', cardToReveal);
    state = TabletopActions.dismissRevealedCard(state, 'player1', 'LOST_ZONE');
    expect(state.player1.revealedCard).toBeNull();
    expect(state.player1.lostZone?.some((c) => c.instanceId === cardToReveal.instanceId)).toBe(true);
  });

  it('toggles solo study mode and flips table perspective', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    expect(state.soloRevealAllHands).toBe(false);

    state = TabletopActions.toggleSoloReveal(state);
    expect(state.soloRevealAllHands).toBe(true);

    expect(state.perspective).toBe('player1');
    state = TabletopActions.setPerspective(state, 'player2');
    expect(state.perspective).toBe('player2');
  });

  it('changes player deck to another card list', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const newCards = [createCard(CardTemplates.Pidgey), createCard(CardTemplates.Pidgeotto)];

    state = TabletopActions.changeDeck(state, 'player2', newCards, 'Pidgeot Deck');
    expect(state.player2.deckName).toBe('Pidgeot Deck');
    expect(state.player2.name).toBe('Player 2 (คู่ต่อสู้)');
  });

  it('declares attack, targets opponent active, calculates weakness x2, and emits action toast', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const charizardCard = {
      ...createCard(CardTemplates.CharizardEx),
      energyType: 'Fire',
    };
    const venusaurCard = {
      ...createCard(CardTemplates.PidgeotEx),
      nameTh: 'ฟุชิกิบานะ',
      weakness: { type: 'Fire', value: 'x2' as const },
    };

    state.player1.active = makeTabletopPokemonSlot(charizardCard);
    state.player2.active = makeTabletopPokemonSlot(venusaurCard);

    // Player 1 attacks Player 2 Active with 180 base damage
    state = TabletopActions.startAttackDeclaration(
      state,
      'player1',
      'ACTIVE',
      'Burning Darkness',
      180
    );

    expect(state.combatState).not.toBeNull();
    expect(state.combatState?.attackerSide).toBe('player1');
    expect(state.combatState?.targetSide).toBe('player2');
    expect(state.combatState?.targetPosition).toBe('ACTIVE');
    expect(state.combatState?.isWeakness).toBe(true);
    expect(state.combatState?.calculatedDamage).toBe(360); // 180 * 2
    expect(state.actionToast).not.toBeNull();
    expect(state.actionToast?.message).toContain('ความมืดที่แผดเผา');

    // Apply combat damage
    state = TabletopActions.applyCombatDamage(state);
    expect(state.player2.active?.damage).toBe(360);
    expect(state.combatState).toBeNull();
    expect(state.actionToast?.message).toContain('+360 DMG');
  });

  it('applies custom damage override when attack damage is adjusted manually', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const attackerCard = {
      ...createCard(CardTemplates.CharizardEx),
      energyType: 'Fire',
    };
    const defenderCard = {
      ...createCard(CardTemplates.VenusaurEx),
      energyType: 'Grass',
      weakness: { type: 'Fire', value: 'x2' as const },
    };

    state.player1.active = makeTabletopPokemonSlot(attackerCard);
    state.player2.active = makeTabletopPokemonSlot(defenderCard);

    // Player 1 attacks with custom base damage of 210 (e.g. 180 base + 30 prize bonus)
    state = TabletopActions.startAttackDeclaration(
      state,
      'player1',
      'ACTIVE',
      'Burning Darkness (+30)',
      210
    );
    expect(state.combatState?.calculatedDamage).toBe(420); // 210 * 2

    // Apply with custom damage override (e.g. user manually specified 280 due to damage reduction effect)
    state = TabletopActions.applyCombatDamage(state, 280);
    expect(state.player2.active?.damage).toBe(280);
    expect(state.actionToast?.message).toContain('+280 DMG');
  });

  it('allows switching target to Bench (Bench Snipe) and negates weakness calculation', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const attackerCard = {
      ...createCard(CardTemplates.CharizardEx),
      energyType: 'Fire',
    };
    const activeDefender = {
      ...createCard(CardTemplates.PidgeotEx),
      nameTh: 'ตัวหน้า',
      weakness: { type: 'Fire', value: 'x2' as const },
    };
    const benchDefender = {
      ...createCard(CardTemplates.PidgeotEx),
      nameTh: 'ตัวเบนช์',
      weakness: { type: 'Fire', value: 'x2' as const },
    };

    state.player1.active = makeTabletopPokemonSlot(attackerCard);
    state.player2.active = makeTabletopPokemonSlot(activeDefender);
    state.player2.bench[0] = makeTabletopPokemonSlot(benchDefender);

    // Start attack: defaults to active with weakness
    state = TabletopActions.startAttackDeclaration(state, 'player1', 'ACTIVE', 'Snipe Fire', 90);
    expect(state.combatState?.isWeakness).toBe(true);
    expect(state.combatState?.calculatedDamage).toBe(180);

    // Switch target to Bench #1 (index 0)
    state = TabletopActions.setCombatTarget(state, 0);
    expect(state.combatState?.targetPosition).toBe(0);
    expect(state.combatState?.isWeakness).toBe(false);
    expect(state.combatState?.calculatedDamage).toBe(90); // Normal base damage for bench

    // Apply combat damage to bench target
    state = TabletopActions.applyCombatDamage(state);
    expect(state.player2.bench[0]?.damage).toBe(90);
    expect(state.player2.active?.damage).toBe(0);
  });

  it('puts hand card to top, bottom, or shuffles into deck', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const card1 = createCard(CardTemplates.Charmander);
    const card2 = createCard(CardTemplates.Pidgey);
    const card3 = createCard(CardTemplates.UltraBall);
    state.player1.hand = [card1, card2, card3];
    const initialDeckLen = state.player1.deck.length;

    // Put card1 to TOP
    state = TabletopActions.putHandToDeck(state, 'player1', card1.instanceId, 'TOP');
    expect(state.player1.hand.length).toBe(2);
    expect(state.player1.deck.length).toBe(initialDeckLen + 1);
    expect(state.player1.deck[0].instanceId).toBe(card1.instanceId);

    // Put card2 to BOTTOM
    state = TabletopActions.putHandToDeck(state, 'player1', card2.instanceId, 'BOTTOM');
    expect(state.player1.hand.length).toBe(1);
    expect(state.player1.deck.length).toBe(initialDeckLen + 2);
    expect(state.player1.deck[state.player1.deck.length - 1].instanceId).toBe(card2.instanceId);

    // Put card3 with SHUFFLE
    state = TabletopActions.putHandToDeck(state, 'player1', card3.instanceId, 'SHUFFLE');
    expect(state.player1.hand.length).toBe(0);
    expect(state.player1.deck.length).toBe(initialDeckLen + 3);
    expect(state.player1.deck.some((c) => c.instanceId === card3.instanceId)).toBe(true);
  });

  it('puts multiple cards from hand to deck in bulk', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const c1 = createCard(CardTemplates.Charmander);
    const c2 = createCard(CardTemplates.Pidgey);
    const c3 = createCard(CardTemplates.UltraBall);
    const c4 = createCard(CardTemplates.BasicFireEnergy);
    state.player1.hand = [c1, c2, c3, c4];
    const initialDeckLen = state.player1.deck.length;

    // Return c1 and c3 to deck with SHUFFLE
    state = TabletopActions.putMultipleHandToDeck(state, 'player1', [c1.instanceId, c3.instanceId], 'SHUFFLE');
    expect(state.player1.hand.length).toBe(2);
    expect(state.player1.hand.map((c) => c.instanceId)).toEqual([c2.instanceId, c4.instanceId]);
    expect(state.player1.deck.length).toBe(initialDeckLen + 2);
    expect(state.player1.deck.some((c) => c.instanceId === c1.instanceId)).toBe(true);
    expect(state.player1.deck.some((c) => c.instanceId === c3.instanceId)).toBe(true);
  });

  it('validates setup readiness before game start: requires active Pokemon and prizes for all players', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());

    // Initially: no active cards, no prizes
    let readiness = TabletopActions.checkSetupReadiness(state);
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingItems).toEqual([
      'Active ของ Player 1',
      'Active ของ Player 2',
      'Prize ของ Player 1',
      'Prize ของ Player 2',
    ]);
    expect(readiness.message).toContain('Active ของ Player 1');

    // Trying revealAllFacedown while incomplete sets warning toast and does not start game
    const beforeReveal = TabletopActions.revealAllFacedown(state);
    expect(beforeReveal.isGameStarted).toBeFalsy();
    expect(beforeReveal.actionToast).not.toBeNull();
    expect(beforeReveal.actionToast?.type).toBe('WARNING');
    expect(beforeReveal.actionToast?.message).toContain('ยังไม่พร้อมเริ่มเกม');

    // Add Player 1 Active
    state.player1.active = makeTabletopPokemonSlot(createCard(CardTemplates.Charmander), true);
    readiness = TabletopActions.checkSetupReadiness(state);
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingItems).not.toContain('Active ของ Player 1');
    expect(readiness.missingItems).toContain('Active ของ Player 2');

    // Add Player 2 Active
    state.player2.active = makeTabletopPokemonSlot(createCard(CardTemplates.PidgeotEx), true);
    readiness = TabletopActions.checkSetupReadiness(state);
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingItems).toEqual(['Prize ของ Player 1', 'Prize ของ Player 2']);

    // Setup Prizes for Player 1
    state = TabletopActions.setupPrizes(state, 'player1', 6);
    readiness = TabletopActions.checkSetupReadiness(state);
    expect(readiness.isReady).toBe(false);
    expect(readiness.missingItems).toEqual(['Prize ของ Player 2']);

    // Setup Prizes for Player 2
    state = TabletopActions.setupPrizes(state, 'player2', 6);
    readiness = TabletopActions.checkSetupReadiness(state);
    expect(readiness.isReady).toBe(true);
    expect(readiness.missingItems).toHaveLength(0);
    expect(readiness.message).toBe('');

    // Now revealAllFacedown succeeds and flips all facedown cards face-up
    expect(state.player1.active?.isFacedown).toBe(true);
    expect(state.player2.active?.isFacedown).toBe(true);

    const startedState = TabletopActions.revealAllFacedown(state);
    expect(startedState.isGameStarted).toBe(true);
    expect(startedState.player1.active?.isFacedown).toBe(false);
    expect(startedState.player2.active?.isFacedown).toBe(false);
    expect(startedState.historyLog.some((log) => log.includes("Let's Play!"))).toBe(true);
  });

  it('triggers winner declaration when all 6 prize cards are claimed after game has started', () => {
    const p1Cards = buildCharizardExDeck();
    let state = createInitialTabletopState(p1Cards);
    state.player1.active = makeTabletopPokemonSlot(createCard(CardTemplates.CharizardEx), false);
    state.player2.active = makeTabletopPokemonSlot(createCard(CardTemplates.PidgeotEx), false);
    state = TabletopActions.setupPrizes(state, 'player1', 6);
    state = TabletopActions.setupPrizes(state, 'player2', 6);
    state = TabletopActions.revealAllFacedown(state);
    expect(state.isGameStarted).toBe(true);
    expect(state.winner).toBeNull();

    // Claim 5 prizes
    for (let i = 0; i < 5; i++) {
      state = TabletopActions.takePrize(state, 'player1', 0);
      expect(state.winner).toBeNull();
      expect(state.player1.prizes.length).toBe(5 - i);
    }

    // Claim 6th (last) prize
    state = TabletopActions.takePrize(state, 'player1', 0);
    expect(state.player1.prizes.length).toBe(0);
    expect(state.winner).not.toBeNull();
    expect(state.winner?.side).toBe('player1');
    expect(state.winner?.reason).toBe('PRIZES_CLAIMED');
    expect(state.historyLog.some((l) => l.includes('ดึงการ์ดรางวัลครบ 6 ใบ'))).toBe(true);
  });

  it('resets board cleanly back to setup phase with resetToSetup', () => {
    const p1Cards = buildCharizardExDeck();
    let state = createInitialTabletopState(p1Cards);
    state.player1.active = makeTabletopPokemonSlot(createCard(CardTemplates.CharizardEx), false);
    state = TabletopActions.setupPrizes(state, 'player1', 6);
    state.isGameStarted = true;
    state.winner = {
      side: 'player1',
      name: 'Player 1',
      reason: 'PRIZES_CLAIMED',
      timestamp: Date.now(),
    };

    const resetState = TabletopActions.resetToSetup(state);
    expect(resetState.isGameStarted).toBe(false);
    expect(resetState.winner).toBeNull();
    expect(resetState.turnCount).toBe(1);
    expect(resetState.player1.active).toBeNull();
    expect(resetState.player1.prizes.length).toBe(0);
    expect(resetState.player1.bench.length).toBe(0);
    expect(resetState.player1.hand.length).toBe(0);
  });

  it('shuffles Pokemon, evolution history, energies, and attached tool back into deck with shufflePokemonToDeck', () => {
    const p1 = createCard(CardTemplates.Charmander);
    const evo = createCard(CardTemplates.CharizardEx);
    const energy1 = createCard(CardTemplates.BasicFireEnergy);
    const energy2 = createCard(CardTemplates.BasicFireEnergy);
    const tool = createCard(CardTemplates.UltraBall); // mock tool card

    let state = createInitialTabletopState(buildCharizardExDeck());
    const slot = makeTabletopPokemonSlot(evo);
    slot.evolutionHistory.push(p1);
    slot.attachedEnergies.push(energy1, energy2);
    slot.attachedTool = tool;
    state.player1.active = slot;

    const initialDeckCount = state.player1.deck.length;

    state = TabletopActions.shufflePokemonToDeck(state, 'player1', 'ACTIVE');

    expect(state.player1.active).toBeNull();
    expect(state.player1.deck.length).toBe(initialDeckCount + 5); // evo + p1 + energy1 + energy2 + tool
    expect(state.player1.deck.some((c) => c.instanceId === evo.instanceId)).toBe(true);
    expect(state.player1.deck.some((c) => c.instanceId === p1.instanceId)).toBe(true);
    expect(state.player1.deck.some((c) => c.instanceId === energy1.instanceId)).toBe(true);
    expect(state.player1.deck.some((c) => c.instanceId === energy2.instanceId)).toBe(true);
    expect(state.player1.deck.some((c) => c.instanceId === tool.instanceId)).toBe(true);
    expect(state.historyLog.some((l) => l.includes('กลับเข้ากองการ์ดแล้วสับ'))).toBe(true);
    expect(state.actionToast?.message).toContain('กลับเข้ากองการ์ดแล้วสับ');
  });

  it('tracks stadiumOwnerSide and discards stadium to its correct owner discard pile', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    const stadiumP1 = createCard(CardTemplates.UltraBall);
    const stadiumP2 = createCard(CardTemplates.NestBall);

    state.player1.hand.push(stadiumP1);
    state.player2.hand.push(stadiumP2);

    // Player 1 plays stadium
    state = TabletopActions.playStadium(state, 'player1', stadiumP1.instanceId);
    expect(state.stadium?.instanceId).toBe(stadiumP1.instanceId);
    expect(state.stadiumOwnerSide).toBe('player1');

    // Player 2 plays new stadium replacing Player 1's stadium
    state = TabletopActions.playStadium(state, 'player2', stadiumP2.instanceId);
    expect(state.stadium?.instanceId).toBe(stadiumP2.instanceId);
    expect(state.stadiumOwnerSide).toBe('player2');
    // Player 1's stadium MUST be sent to Player 1's discard, NOT Player 2's discard!
    expect(state.player1.discard.some((c) => c.instanceId === stadiumP1.instanceId)).toBe(true);
    expect(state.player2.discard.some((c) => c.instanceId === stadiumP1.instanceId)).toBe(false);

    // Discarding Player 2's stadium returns it to Player 2's discard
    state = TabletopActions.discardStadium(state);
    expect(state.stadium).toBeNull();
    expect(state.stadiumOwnerSide).toBeNull();
    expect(state.player2.discard.some((c) => c.instanceId === stadiumP2.instanceId)).toBe(true);
  });

  describe('Dynamic Bench Capacity (5 <-> 8)', () => {
    it('initializes benchLimit to 5 and bench array to 5 elements', () => {
      const state = createInitialTabletopState(buildCharizardExDeck());
      expect(state.player1.benchLimit).toBe(5);
      expect(state.player1.bench.length).toBe(5);
      expect(state.player2.benchLimit).toBe(5);
      expect(state.player2.bench.length).toBe(5);
    });

    it('allows expanding benchLimit from 5 to 8', () => {
      let state = createInitialTabletopState(buildCharizardExDeck());
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      expect(state.player1.benchLimit).toBe(8);
      expect(state.player1.bench.length).toBe(8);
      expect(state.player1.bench.every((b) => b === null)).toBe(true);
      expect(state.historyLog.some((l) => l.includes('ขยายขนาดเบนช์เป็น 8 ช่อง'))).toBe(true);
    });

    it('allows placing card in bench slot 8 (index 7) when benchLimit is 8', () => {
      const card = createCard(CardTemplates.Charmander);
      let state = createInitialTabletopState([card]);
      state.player1.hand.push(card);
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      state = TabletopActions.placeFromHand(state, 'player1', card.instanceId, 7);
      expect(state.player1.bench[7]?.card.instanceId).toBe(card.instanceId);
    });

    it('prevents reducing benchLimit from 8 to 5 if slots 6-8 (indices 5-7) are occupied', () => {
      const card = createCard(CardTemplates.Charmander);
      let state = createInitialTabletopState([card]);
      state.player1.hand.push(card);
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      state = TabletopActions.placeFromHand(state, 'player1', card.instanceId, 5); // Place on slot 6 (index 5)

      // Attempt reducing to 5
      state = TabletopActions.setBenchLimit(state, 'player1', 5);
      expect(state.player1.benchLimit).toBe(8); // Still 8
      expect(state.player1.bench.length).toBe(8);
      expect(state.actionToast?.message).toContain('ช่องที่ 6–8');
    });

    it('allows reducing benchLimit from 8 to 5 when slots 6-8 are empty', () => {
      let state = createInitialTabletopState(buildCharizardExDeck());
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      expect(state.player1.bench.length).toBe(8);

      state = TabletopActions.setBenchLimit(state, 'player1', 5);
      expect(state.player1.benchLimit).toBe(5);
      expect(state.player1.bench.length).toBe(5);
      expect(state.historyLog.some((l) => l.includes('ปรับขนาดเบนช์เป็น 5 ช่อง'))).toBe(true);
    });

    it('switches Active with bench slot in expanded range (e.g. index 6)', () => {
      const activeCard = createCard(CardTemplates.CharizardEx);
      const benchCard = createCard(CardTemplates.Charmander);
      let state = createInitialTabletopState(buildCharizardExDeck());
      state.player1.active = makeTabletopPokemonSlot(activeCard);
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      state.player1.bench[6] = makeTabletopPokemonSlot(benchCard);

      state = TabletopActions.switchActiveWithBench(state, 'player1', 6);
      expect(state.player1.active?.card.instanceId).toBe(benchCard.instanceId);
      expect(state.player1.bench[6]?.card.instanceId).toBe(activeCard.instanceId);
    });

    it('retreats Active into an expanded bench slot (index 7) when benchLimit is 8', () => {
      const activeCard = createCard(CardTemplates.CharizardEx);
      let state = createInitialTabletopState(buildCharizardExDeck());
      state.player1.active = makeTabletopPokemonSlot(activeCard);
      state = TabletopActions.setBenchLimit(state, 'player1', 8);

      state = TabletopActions.retreatActive(state, 'player1', 7);
      expect(state.player1.bench[7]?.card.instanceId).toBe(activeCard.instanceId);
      expect(state.player1.active).toBeNull();
    });

    it('rejects retreating into a bench slot beyond the current benchLimit', () => {
      const activeCard = createCard(CardTemplates.CharizardEx);
      let state = createInitialTabletopState(buildCharizardExDeck());
      state.player1.active = makeTabletopPokemonSlot(activeCard);

      state = TabletopActions.retreatActive(state, 'player1', 6);
      expect(state.player1.active?.card.instanceId).toBe(activeCard.instanceId);
      expect(state.player1.bench[6]).toBeUndefined();
    });

    it('swaps Pokemon between expanded bench slots (index 5 <-> 7)', () => {
      const cardA = createCard(CardTemplates.Charmander);
      const cardB = createCard(CardTemplates.CharizardEx);
      let state = createInitialTabletopState(buildCharizardExDeck());
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      state.player1.bench[5] = makeTabletopPokemonSlot(cardA);
      state.player1.bench[7] = makeTabletopPokemonSlot(cardB);

      state = TabletopActions.swapBenchSlots(state, 'player1', 5, 7);
      expect(state.player1.bench[5]?.card.instanceId).toBe(cardB.instanceId);
      expect(state.player1.bench[7]?.card.instanceId).toBe(cardA.instanceId);
    });

    it('keeps bench capacity per player (asymmetric limits are allowed)', () => {
      let state = createInitialTabletopState(buildCharizardExDeck());
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      expect(state.player1.benchLimit).toBe(8);
      expect(state.player2.benchLimit).toBe(5);
      expect(state.player2.bench.length).toBe(5);
    });

    it('resets both players back to a standard 5-slot bench on rematch setup', () => {
      const card = createCard(CardTemplates.Charmander);
      let state = createInitialTabletopState([card]);
      state.player1.hand.push(card);
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      state = TabletopActions.setBenchLimit(state, 'player2', 8);
      state = TabletopActions.placeFromHand(state, 'player1', card.instanceId, 7);

      state = TabletopActions.resetToSetup(state);
      expect(state.player1.benchLimit).toBe(5);
      expect(state.player1.bench.filter(Boolean).length).toBe(0);
      expect(state.player2.benchLimit).toBe(5);
      expect(state.player2.bench.filter(Boolean).length).toBe(0);

      // A fresh expansion after the rematch still yields a clean 8-slot bench
      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      expect(state.player1.bench.length).toBe(8);
      expect(state.player1.bench.every((b) => b === null)).toBe(true);
    });

    it('upgrades a legacy 5-slot bench state (missing benchLimit) to 8 slots safely', () => {
      let state = createInitialTabletopState(buildCharizardExDeck());
      // Simulate state restored from an older build / remote peer
      delete (state.player1 as Partial<typeof state.player1>).benchLimit;
      state.player1.bench = [null, null, null, null, null];

      state = TabletopActions.setBenchLimit(state, 'player1', 8);
      expect(state.player1.benchLimit).toBe(8);
      expect(state.player1.bench.length).toBe(8);
    });
  });
});


