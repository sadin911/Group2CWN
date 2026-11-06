import { describe, it, expect } from 'vitest';
import { createInitialTabletopState, TabletopActions } from './tabletopStateHelper';
import { buildCharizardExDeck } from '../../engine/data/StandardCardCatalog';

describe('Tabletop Consent Actions & State', () => {
  it('toggles consent required mode on and off', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    expect(state.isConsentRequired).toBeFalsy();

    state = TabletopActions.toggleConsentRequired(state);
    expect(state.isConsentRequired).toBe(true);
    expect(state.historyLog[state.historyLog.length - 1]).toContain('เปิดใช้งาน');

    state = TabletopActions.toggleConsentRequired(state);
    expect(state.isConsentRequired).toBe(false);
    expect(state.historyLog[state.historyLog.length - 1]).toContain('ปิดใช้งาน');
  });

  it('handles requestConsent and respondConsent approval flow', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());
    expect(state.pendingConsent).toBeFalsy();

    // Request consent to inspect top cards
    state = TabletopActions.requestConsent(state, {
      id: 'consent-test-1',
      requesterSide: 'player1',
      requesterName: 'Player 1',
      actionType: 'INSPECT_TOP',
      description: 'ขอดูการ์ดบนสุดของกองสำรับ',
      timestamp: Date.now(),
    });

    expect(state.pendingConsent).not.toBeNull();
    expect(state.pendingConsent?.actionType).toBe('INSPECT_TOP');
    expect(state.historyLog[state.historyLog.length - 1]).toContain('รอการยินยอม');

    // Respond with approval
    state = TabletopActions.respondConsent(state, true);
    expect(state.pendingConsent).toBeNull();
    expect(state.historyLog[state.historyLog.length - 1]).toContain('ยินยอม: ขอดูการ์ดบนสุดของกองสำรับ');
  });

  it('handles requestConsent and respondConsent denial flow', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());

    // Request consent to declare attack
    state = TabletopActions.requestConsent(state, {
      id: 'consent-test-2',
      requesterSide: 'player1',
      requesterName: 'Player 1',
      actionType: 'DECLARE_ATTACK',
      description: "สั่งโจมตีด้วยท่า 'Burning Dark'",
      timestamp: Date.now(),
    });

    expect(state.pendingConsent?.actionType).toBe('DECLARE_ATTACK');

    // Deny consent
    state = TabletopActions.respondConsent(state, false);
    expect(state.pendingConsent).toBeNull();
    expect(state.historyLog[state.historyLog.length - 1]).toContain('ปฏิเสธ');
  });

  it('handles SHUFFLE_DECK consent flow with deck shuffle', () => {
    let state = createInitialTabletopState(buildCharizardExDeck());

    // Request consent to shuffle/cut deck after search
    state = TabletopActions.requestConsent(state, {
      id: 'consent-deck-cut-test',
      requesterSide: 'player1',
      requesterName: 'Player 1',
      actionType: 'SHUFFLE_DECK',
      description: 'Player 1 ค้นหาสำรับเสร็จแล้ว ต้องการให้ระบบสับหรือตัดสำรับหรือไม่?',
      timestamp: Date.now(),
    });

    expect(state.pendingConsent?.actionType).toBe('SHUFFLE_DECK');

    // Player 2 approves -> shuffles player 1's deck and clears consent
    state = TabletopActions.shuffleDeck(state, 'player1');
    state = TabletopActions.respondConsent(state, true);

    expect(state.pendingConsent).toBeNull();
    expect(state.lastConsentResult?.actionType).toBe('SHUFFLE_DECK');
    expect(state.lastConsentResult?.approved).toBe(true);
    expect(state.actionToast?.message).toContain('สับกองสำรับ');
  });

  it('handles SWITCH_POKEMON (Boss\'s Orders) consent flow with payload and switchActiveWithBench', () => {
    const cards = buildCharizardExDeck();
    let state = createInitialTabletopState(cards, 'P1 Deck', cards, 'P2 Deck');
    state = TabletopActions.drawCards(state, 'player2', 7);

    // Setup active (with 80 damage) and bench (with 20 damage) on player 2
    state = TabletopActions.placeFromHand(state, 'player2', state.player2.hand[0].instanceId, 'ACTIVE');
    state = TabletopActions.placeFromHand(state, 'player2', state.player2.hand[0].instanceId, 0);
    state = TabletopActions.setDamage(state, 'player2', 'ACTIVE', 80);
    state = TabletopActions.setDamage(state, 'player2', 0, 20);

    const initialActiveId = state.player2.active?.card.instanceId;
    const initialBenchId = state.player2.bench[0]?.card.instanceId;
    const targetBenchCard = state.player2.bench[0]?.card;
    expect(initialActiveId).toBeDefined();
    expect(initialBenchId).toBeDefined();
    expect(state.player2.active?.damage).toBe(80);
    expect(state.player2.bench[0]?.damage).toBe(20);

    // Player 1 requests Boss's Orders to switch Player 2's bench 0 to active
    state = TabletopActions.requestConsent(state, {
      id: 'consent-switch-test',
      requesterSide: 'player1',
      requesterName: 'Player 1',
      actionType: 'SWITCH_POKEMON',
      description: 'ขอสลับโปเกมอนขึ้นมาเป็นตำแหน่ง Active (คำสั่งของบอส / Gust)',
      timestamp: Date.now(),
      payload: { targetSide: 'player2', benchIndex: 0, revealedCard: targetBenchCard },
      revealedCard: targetBenchCard,
    });

    expect(state.pendingConsent?.actionType).toBe('SWITCH_POKEMON');
    expect(state.pendingConsent?.payload?.benchIndex).toBe(0);
    expect(state.pendingConsent?.revealedCard?.instanceId).toBe(initialBenchId);

    // Player 2 approves -> switches active with bench 0 and records lastConsentResult with payload & revealedCard
    const { targetSide, benchIndex } = state.pendingConsent?.payload || {};
    state = TabletopActions.respondConsent(state, true);
    state = TabletopActions.switchActiveWithBench(state, targetSide, benchIndex);

    expect(state.pendingConsent).toBeNull();
    expect(state.lastConsentResult?.actionType).toBe('SWITCH_POKEMON');
    expect(state.lastConsentResult?.approved).toBe(true);
    expect(state.lastConsentResult?.payload?.benchIndex).toBe(0);
    expect(state.lastConsentResult?.revealedCard?.instanceId).toBe(initialBenchId);
    expect(state.lastConsentResult?.payload?.revealedCard?.instanceId).toBe(initialBenchId);

    // Opponent perspective: active is now initialBenchId (keeps its 20 dmg), bench is initialActiveId (keeps its 80 dmg)
    expect(state.player2.active?.card.instanceId).toBe(initialBenchId);
    expect(state.player2.active?.damage).toBe(20);
    expect(state.player2.bench[0]?.card.instanceId).toBe(initialActiveId);
    expect(state.player2.bench[0]?.damage).toBe(80);

    // Requester perspective guard test:
    // When requester receives lastConsentResult, check isAlreadySwitched logic
    const revealedCard = state.lastConsentResult?.revealedCard;
    const isAlreadySwitched = revealedCard && state.player2.active?.card.instanceId === revealedCard.instanceId;
    expect(isAlreadySwitched).toBe(true);
    // Because isAlreadySwitched is true, requester MUST NOT switchActiveWithBench again (which would revert the board)
    if (!isAlreadySwitched) {
      state = TabletopActions.switchActiveWithBench(state, targetSide, benchIndex);
    }
    // Verify state remains correctly switched with damages intact
    expect(state.player2.active?.card.instanceId).toBe(initialBenchId);
    expect(state.player2.active?.damage).toBe(20);
    expect(state.player2.bench[0]?.card.instanceId).toBe(initialActiveId);
    expect(state.player2.bench[0]?.damage).toBe(80);
  });

  it('handles DISCARD_ENERGY consent flow with payload and moveEnergy', () => {
    const cards = buildCharizardExDeck();
    let state = createInitialTabletopState(cards, 'P1 Deck', cards, 'P2 Deck');
    state = TabletopActions.drawCards(state, 'player2', 7);

    // Setup active pokemon with attached energy on player 2
    state = TabletopActions.placeFromHand(state, 'player2', state.player2.hand[0].instanceId, 'ACTIVE');
    const energyCard = {
      instanceId: 'energy-fire-test-1',
      id: 'energy-fire-1',
      cardCode: 'SVP-001',
      nameEn: 'Basic Fire Energy',
      nameTh: 'พลังงานไฟพื้นฐาน',
      supertype: 'Energy' as const,
      subtypes: [],
      energyType: 'FIRE' as const,
    };
    state.player2.active!.attachedEnergies.push(energyCard);
    expect(state.player2.active?.attachedEnergies.length).toBe(1);

    // Player 1 requests consent to discard Player 2's active energy
    state = TabletopActions.requestConsent(state, {
      id: 'consent-discard-energy-test',
      requesterSide: 'player1',
      requesterName: 'Player 1',
      actionType: 'DISCARD_ENERGY',
      description: 'ขอถอดพลังงานออกจากโปเกมอนลงสุสาน',
      timestamp: Date.now(),
      payload: { targetSide: 'player2', targetPosition: 'ACTIVE', energyId: 'energy-fire-test-1', energyType: 'พลังงานไฟพื้นฐาน' },
    });

    expect(state.pendingConsent?.actionType).toBe('DISCARD_ENERGY');
    expect(state.pendingConsent?.payload?.energyId).toBe('energy-fire-test-1');

    // Player 2 approves -> moves energy to discard
    const { targetSide, targetPosition, energyId } = state.pendingConsent?.payload || {};
    state = TabletopActions.respondConsent(state, true);
    state = TabletopActions.moveEnergy(state, targetSide, targetPosition, energyId, 'DISCARD');

    expect(state.pendingConsent).toBeNull();
    expect(state.lastConsentResult?.actionType).toBe('DISCARD_ENERGY');
    expect(state.lastConsentResult?.approved).toBe(true);
    expect(state.player2.active?.attachedEnergies.length).toBe(0);
    expect(state.player2.discard.some((c) => c.instanceId === 'energy-fire-test-1')).toBe(true);
  });

  it('records lastCombatResult with unique combat id when applying combat damage or cancelling', () => {
    const cards = buildCharizardExDeck();
    let state = createInitialTabletopState(cards, 'P1 Deck', cards, 'P2 Deck');
    state = TabletopActions.drawCards(state, 'player1', 7);
    state = TabletopActions.drawCards(state, 'player2', 7);
    state = TabletopActions.placeFromHand(state, 'player1', state.player1.hand[0].instanceId, 'ACTIVE');
    state = TabletopActions.placeFromHand(state, 'player2', state.player2.hand[0].instanceId, 'ACTIVE');

    // 1. Declare attack
    state = TabletopActions.startAttackDeclaration(state, 'player1', 'ACTIVE', 'Burning Shot', 180);
    expect(state.combatState).toBeDefined();
    expect(state.combatState?.id).toMatch(/^combat_player1_\d+/);
    const combatId = state.combatState!.id;
    const combatTimestamp = state.combatState!.timestamp;

    // 2. Apply damage
    state = TabletopActions.applyCombatDamage(state, 180);
    expect(state.combatState).toBeNull();
    expect(state.lastCombatResult).toBeDefined();
    expect(state.lastCombatResult?.id).toBe(combatId);
    expect(state.lastCombatResult?.damageApplied).toBe(180);
    expect(state.lastCombatResult?.timestamp).toBe(combatTimestamp);
    expect(state.player2.active?.damage).toBe(180);

    // 3. Declare another attack and cancel
    state = TabletopActions.startAttackDeclaration(state, 'player2', 'ACTIVE', 'Slash', 50);
    const combat2Id = state.combatState!.id;
    state = TabletopActions.cancelCombat(state);
    expect(state.combatState).toBeNull();
    expect(state.lastCombatResult?.id).toBe(combat2Id);
    expect(state.lastCombatResult?.damageApplied).toBe(0);
  });

  it('handles START_GAME consent flow: clears pendingConsent, sets lastConsentResult and starts game', () => {
    const cards = buildCharizardExDeck();
    let state = createInitialTabletopState(cards, 'P1 Deck', cards, 'P2 Deck');
    state = TabletopActions.drawCards(state, 'player1', 7);
    state = TabletopActions.drawCards(state, 'player2', 7);
    state = TabletopActions.placeFromHand(state, 'player1', state.player1.hand[0].instanceId, 'ACTIVE', true);
    state = TabletopActions.placeFromHand(state, 'player2', state.player2.hand[0].instanceId, 'ACTIVE', true);
    state = TabletopActions.setupPrizes(state, 'player1', 6);
    state = TabletopActions.setupPrizes(state, 'player2', 6);

    expect(state.player1.active?.isFacedown).toBe(true);
    expect(state.player2.active?.isFacedown).toBe(true);
    expect(state.isGameStarted).toBeFalsy();

    // 1. Player 1 requests START_GAME
    state = TabletopActions.requestConsent(state, {
      id: 'consent-start-game-test',
      requesterSide: 'player1',
      requesterName: 'Player 1',
      actionType: 'START_GAME',
      description: "พร้อมเริ่มการแข่งขัน (Let's Play!) พลิกหงายโปเกมอนทั้งหมดและเริ่มเกมพร้อมกัน",
      timestamp: Date.now(),
    });

    expect(state.pendingConsent).not.toBeNull();
    expect(state.pendingConsent?.actionType).toBe('START_GAME');

    // 2. Player 2 approves -> respondConsent must clear pendingConsent and set lastConsentResult
    state = TabletopActions.respondConsent(state, true);
    expect(state.pendingConsent).toBeNull();
    expect(state.lastConsentResult?.actionType).toBe('START_GAME');
    expect(state.lastConsentResult?.approved).toBe(true);

    // 3. revealAllFacedown sets isGameStarted = true and flips cards face-up
    state = TabletopActions.revealAllFacedown(state);
    expect(state.isGameStarted).toBe(true);
    expect(state.player1.active?.isFacedown).toBe(false);
    expect(state.player2.active?.isFacedown).toBe(false);
    expect(state.pendingConsent).toBeNull();
  });
});

