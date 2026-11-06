import { describe, it, expect } from 'vitest';
import {
  createInitialRoomState,
  applyPlaymatAction,
} from './playmatSyncService';
import type { PlaymatCard } from '../types/playmat';

describe('playmatSyncService - applyPlaymatAction', () => {
  const room = createInitialRoomState('TEST-01');

  const samplePokemon: PlaymatCard = {
    instanceId: 'p1_card_1',
    id: 'sv3-1',
    name: 'Charizard ex',
    supertype: 'Pokémon',
    subtypes: ['Stage 2', 'ex'],
    types: ['Darkness'],
    hp: '330',
  };

  const sampleEnergy: PlaymatCard = {
    instanceId: 'p1_energy_1',
    id: 'sve-1',
    name: 'Fire Energy',
    supertype: 'Energy',
    subtypes: ['Basic'],
  };

  it('handles JOIN_ROOM', () => {
    const s1 = applyPlaymatAction(room, {
      role: 'p1',
      action: 'JOIN_ROOM',
      playerName: 'Ash Ketchum',
    });

    expect(s1.p1.joined).toBe(true);
    expect(s1.p1.playerName).toBe('Ash Ketchum');
    expect(s1.recentActionText).toContain('Ash Ketchum');
  });

  it('handles SETUP_DECK and sets prizes', () => {
    const s1 = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SETUP_DECK',
      deckCount: 47,
      handCount: 7,
      prizeCount: 6,
    });

    expect(s1.p1.deckCount).toBe(47);
    expect(s1.p1.handCount).toBe(7);
    expect(s1.p1.prizeCount).toBe(6);
    expect(s1.p1.prizes.length).toBe(6);
  });

  it('handles DRAW_CARD', () => {
    const start = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SETUP_DECK',
      deckCount: 47,
      handCount: 7,
      prizeCount: 6,
    });

    const s1 = applyPlaymatAction(start, {
      role: 'p1',
      action: 'DRAW_CARD',
      count: 2,
    });

    expect(s1.p1.deckCount).toBe(45);
    expect(s1.p1.handCount).toBe(9);
  });

  it('handles PLAY_TO_ACTIVE and PLAY_TO_BENCH', () => {
    const start = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SETUP_DECK',
      deckCount: 47,
      handCount: 7,
      prizeCount: 6,
    });

    const withActive = applyPlaymatAction(start, {
      role: 'p1',
      action: 'PLAY_TO_ACTIVE',
      card: samplePokemon,
    });

    expect(withActive.p1.active?.name).toBe('Charizard ex');
    expect(withActive.p1.handCount).toBe(6);

    const withBench = applyPlaymatAction(withActive, {
      role: 'p1',
      action: 'PLAY_TO_BENCH',
      card: { ...samplePokemon, instanceId: 'p1_card_2', name: 'Charmander' },
    });

    expect(withBench.p1.bench.length).toBe(1);
    expect(withBench.p1.bench[0].name).toBe('Charmander');
    expect(withBench.p1.handCount).toBe(5);
  });

  it('handles ATTACH_TO_CARD and UPDATE_DAMAGE', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'PLAY_TO_ACTIVE',
      card: samplePokemon,
    });

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'ATTACH_TO_CARD',
      targetInstanceId: samplePokemon.instanceId,
      card: sampleEnergy,
    });

    expect(s.p1.active?.attachedCards?.length).toBe(1);
    expect(s.p1.active?.attachedCards?.[0].name).toBe('Fire Energy');

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'UPDATE_DAMAGE',
      targetInstanceId: samplePokemon.instanceId,
      damage: 120,
    });

    expect(s.p1.active?.damageCounters).toBe(120);
  });

  it('handles TAKE_PRIZE and SWITCH_ACTIVE', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SETUP_DECK',
      deckCount: 47,
      handCount: 7,
      prizeCount: 6,
    });

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'TAKE_PRIZE',
    });

    expect(s.p1.prizeCount).toBe(5);
    expect(s.p1.handCount).toBe(8);

    // Setup active and bench, then switch
    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'PLAY_TO_ACTIVE',
      card: samplePokemon,
    });
    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'PLAY_TO_BENCH',
      card: { ...samplePokemon, instanceId: 'bench_1', name: 'Pidgeot ex' },
    });

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'SWITCH_ACTIVE',
      targetInstanceId: 'bench_1',
    });

    expect(s.p1.active?.name).toBe('Pidgeot ex');
    expect(s.p1.bench[0]?.name).toBe('Charizard ex');
  });

  it('handles PLAY_SUPPORTER and DISCARD_SUPPORTER', () => {
    const supporterCard: PlaymatCard = {
      instanceId: 'sup_1',
      id: 'sv1-1',
      name: "Professor's Research",
      supertype: 'Trainer',
      subtypes: ['Supporter'],
    };

    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'PLAY_SUPPORTER',
      card: supporterCard,
    });

    expect(s.p1.supporter?.name).toBe("Professor's Research");
    expect(s.recentActionText).toContain("Professor's Research");

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'DISCARD_SUPPORTER',
    });

    expect(s.p1.supporter).toBeNull();
    expect(s.p1.discard.length).toBe(1);
    expect(s.p1.discard[0]?.name).toBe("Professor's Research");
  });

  it('handles SEARCH_DECK and updates counts', () => {
    const s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SEARCH_DECK',
      deckCount: 45,
      handCount: 8,
    });

    expect(s.p1.deckCount).toBe(45);
    expect(s.p1.handCount).toBe(8);
    expect(s.recentActionText).toContain('ค้นหาการ์ดในสำรับ');
  });

  it('handles MULLIGAN and increments mulliganCount', () => {
    const start = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SETUP_DECK',
      deckCount: 47,
      handCount: 7,
      prizeCount: 6,
    });

    const s1 = applyPlaymatAction(start, {
      role: 'p1',
      action: 'MULLIGAN',
    });

    expect(s1.p1.mulliganCount).toBe(1);
    expect(s1.p1.handCount).toBe(7);
    expect(s1.recentActionText).toContain('Mulligan ครั้งที่ 1');

    const s2 = applyPlaymatAction(s1, {
      role: 'p1',
      action: 'MULLIGAN',
    });
    expect(s2.p1.mulliganCount).toBe(2);
  });

  it('handles PLAY_ITEM and sets playedItemAnnouncement', () => {
    const itemCard: PlaymatCard = {
      instanceId: 'item_1',
      id: 'sv1-181',
      name: 'Nest Ball',
      supertype: 'Trainer',
      subtypes: ['Item'],
    };

    const s1 = applyPlaymatAction(room, {
      role: 'p1',
      action: 'PLAY_ITEM',
      card: itemCard,
    });

    expect(s1.p1.discard.length).toBe(1);
    expect(s1.p1.discard[0]?.name).toBe('Nest Ball');
    expect(s1.playedItemAnnouncement).not.toBeNull();
    expect(s1.playedItemAnnouncement?.card.name).toBe('Nest Ball');
    expect(s1.recentActionText).toContain('ใช้การ์ดไอเทม [Nest Ball]');
  });

  it('handles SHUFFLE_HAND_AND_DRAW', () => {
    const start = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SETUP_DECK',
      deckCount: 47,
      handCount: 7,
      prizeCount: 6,
    });

    const s1 = applyPlaymatAction(start, {
      role: 'p1',
      action: 'SHUFFLE_HAND_AND_DRAW',
      count: 6,
    });

    expect(s1.p1.handCount).toBe(6);
    expect(s1.p1.deckCount).toBe(48); // 47 + 7 - 6 = 48
    expect(s1.recentActionText).toContain('สับการ์ดบนมือกลับเข้าสำรับ แล้วจั่วใหม่ 6 ใบ');
  });

  it('handles DISCARD_MULTIPLE and DISCARD_HAND', () => {
    const start = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SETUP_DECK',
      deckCount: 47,
      handCount: 7,
      prizeCount: 6,
    });

    const cardA: PlaymatCard = { instanceId: 'c1', id: '1', name: 'Card 1', supertype: 'Card' };
    const cardB: PlaymatCard = { instanceId: 'c2', id: '2', name: 'Card 2', supertype: 'Card' };

    const s1 = applyPlaymatAction(start, {
      role: 'p1',
      action: 'DISCARD_MULTIPLE',
      cards: [cardA, cardB],
    });

    expect(s1.p1.discard.length).toBe(2);
    expect(s1.p1.handCount).toBe(5);
    expect(s1.recentActionText).toContain('ทิ้งการ์ด 2 ใบ');

    const s2 = applyPlaymatAction(s1, {
      role: 'p1',
      action: 'DISCARD_HAND',
      cards: [cardA, cardB, { instanceId: 'c3', id: '3', name: 'Card 3', supertype: 'Card' }],
    });

    expect(s2.p1.discard.length).toBe(5);
    expect(s2.p1.handCount).toBe(0);
    expect(s2.recentActionText).toContain('ทิ้งการ์ดทั้งมือ');
  });

  it('handles KNOCK_OUT_CARD and moves Pokemon + attached to discard', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'PLAY_TO_ACTIVE',
      card: samplePokemon,
    });

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'ATTACH_TO_CARD',
      targetInstanceId: samplePokemon.instanceId,
      card: sampleEnergy,
    });

    expect(s.p1.active?.attachedCards?.length).toBe(1);

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'KNOCK_OUT_CARD',
      targetInstanceId: samplePokemon.instanceId,
    });

    expect(s.p1.active).toBeNull();
    // Charizard ex + attached Fire Energy = 2 cards in discard
    expect(s.p1.discard.length).toBe(2);
    expect(s.p1.discard.map((c) => c.name)).toContain('Charizard ex');
    expect(s.p1.discard.map((c) => c.name)).toContain('Fire Energy');
    expect(s.recentActionText).toContain('สลบ (Knock Out) ลง Discard!');
  });

  it('handles PASS_TURN and toggles turn with quota reset', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'ATTACH_TO_CARD',
      targetInstanceId: 'active_1',
      card: sampleEnergy,
    });
    s.p1.energyAttachedThisTurn = true;
    s.p1.supporterPlayedThisTurn = true;

    const s2 = applyPlaymatAction(s, {
      role: 'p1',
      action: 'PASS_TURN',
    });

    expect(s2.currentTurn).toBe('p2');
    expect(s2.turnNumber).toBe(2);
    expect(s2.p1.energyAttachedThisTurn).toBe(false);
    expect(s2.p1.supporterPlayedThisTurn).toBe(false);
  });

  it('handles REVEAL_CARD announcement', () => {
    const s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'REVEAL_CARD',
      card: samplePokemon,
    });

    expect(s.revealedCardAnnouncement).not.toBeNull();
    expect(s.revealedCardAnnouncement?.card.name).toBe('Charizard ex');
    expect(s.recentActionText).toContain('เปิดเผยการ์ด');
  });

  it('handles UNDO to roll back to previous state snapshot', () => {
    const s1 = applyPlaymatAction(room, {
      role: 'p1',
      action: 'DRAW_CARD',
      count: 2,
    });
    expect(s1.p1.handCount).toBe(2);

    const s2 = applyPlaymatAction(s1, {
      role: 'p1',
      action: 'DRAW_CARD',
      count: 3,
    });
    expect(s2.p1.handCount).toBe(5);

    const s3 = applyPlaymatAction(s2, {
      role: 'p1',
      action: 'UNDO',
    });
    expect(s3.p1.handCount).toBe(2);
    expect(s3.recentActionText).toContain('เลิกทำ (Undo)');
  });

  it('handles RESTART_ROOM and resets boards while keeping player names', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'JOIN_ROOM',
      playerName: 'Satoshi',
    });
    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'PLAY_TO_ACTIVE',
      card: samplePokemon,
    });
    expect(s.p1.active).not.toBeNull();

    const restarted = applyPlaymatAction(s, {
      role: 'p1',
      action: 'RESTART_ROOM',
    });

    expect(restarted.p1.active).toBeNull();
    expect(restarted.p1.playerName).toBe('Satoshi');
    expect(restarted.turnNumber).toBe(1);
    expect(restarted.currentTurn).toBe('p1');
    expect(restarted.matchId).toBe(2);
    expect(restarted.recentActionText).toContain('เริ่มเกมใหม่');
  });

  it('handles TERMINATE_ROOM', () => {
    const s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'TERMINATE_ROOM',
    });

    expect(s.isTerminated).toBe(true);
    expect(s.recentActionText).toContain('ปิดการใช้งานห้อง');
  });

  it('handles CHOOSE_FIRST_PLAYER and updates firstPlayerChoice and currentTurn', () => {
    const s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'CHOOSE_FIRST_PLAYER',
      firstPlayer: 'p2',
    });

    expect(s.currentTurn).toBe('p2');
    expect(s.firstPlayerChoice?.firstPlayer).toBe('p2');
    expect(s.recentActionText).toContain('เริ่มเล่นเป็นคนแรก');
  });

  it('handles PLACE_PRIZES and sets 6 prize cards with prizesPlaced flag', () => {
    const s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'PLACE_PRIZES',
    });

    expect(s.p1.prizeCount).toBe(6);
    expect(s.p1.prizesPlaced).toBe(true);
    expect(s.p1.prizes.length).toBe(6);
    expect(s.p1.prizes[0].isFaceDown).toBe(true);
    expect(s.recentActionText).toContain('จัดวางการ์ดรางวัล 6 ใบ');
  });

  it('handles FLIP_CARDS_FACE_UP and reveals face-down active and bench cards', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'PLAY_TO_ACTIVE',
      card: { ...samplePokemon, isFaceDown: true },
      isFaceDown: true,
    });
    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'PLAY_TO_BENCH',
      card: { ...samplePokemon, instanceId: 'bench_1', isFaceDown: true },
      isFaceDown: true,
    });

    expect(s.p1.active?.isFaceDown).toBe(true);
    expect(s.p1.bench[0].isFaceDown).toBe(true);

    const flipped = applyPlaymatAction(s, {
      role: 'p1',
      action: 'FLIP_CARDS_FACE_UP',
    });

    expect(flipped.p1.active?.isFaceDown).toBe(false);
    expect(flipped.p1.bench[0].isFaceDown).toBe(false);
    expect(flipped.setupPhase).toBe('playing');
    expect(flipped.recentActionText).toContain('เปิดหน้าการ์ด Active & Bench');
  });

  it('handles EVOLVE_CARD stacking on active and bench with preserved damage and attached cards', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'PLAY_TO_ACTIVE',
      card: { ...samplePokemon, damageCounters: 30, attachedCards: [{ instanceId: 'e1', id: 'n1', name: 'Fire Energy' }] },
    });

    const charmeleon: PlaymatCard = {
      instanceId: 'charmeleon_inst',
      id: 'sv3pt5-5',
      name: 'Charmeleon',
      supertype: 'Pokémon',
      subtypes: ['Stage 1'],
      hp: 100,
    };

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'EVOLVE_CARD',
      targetInstanceId: samplePokemon.instanceId,
      card: charmeleon,
    });

    expect(s.p1.active?.name).toBe('Charmeleon');
    expect(s.p1.active?.damageCounters).toBe(30);
    expect(s.p1.active?.attachedCards?.length).toBe(1);
    expect(s.p1.active?.underlyingCards?.length).toBe(1);
    expect(s.p1.active?.underlyingCards?.[0].name).toBe('Charizard ex');
    expect(s.recentActionText).toContain('พัฒนาร่าง Active เป็น [Charmeleon]');
  });

  it('handles SHUFFLE_DECK and REVEAL_HAND / DISMISS_HAND_REVEAL', () => {
    let s = applyPlaymatAction(room, {
      role: 'p1',
      action: 'SHUFFLE_DECK',
      deckCount: 52,
    });
    expect(s.recentActionText).toContain('สับสำรับการ์ด');

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'REVEAL_HAND',
      cards: [samplePokemon],
    });
    expect(s.revealedHandAnnouncement?.cards.length).toBe(1);
    expect(s.revealedHandAnnouncement?.playerName).toBe('Player 1');

    s = applyPlaymatAction(s, {
      role: 'p1',
      action: 'DISMISS_HAND_REVEAL',
    });
    expect(s.revealedHandAnnouncement).toBeNull();
  });

  it('maintains up to 5 action log entries and supports multi-step UNDO', () => {
    let s = room;
    // Apply 20 actions in sequence
    for (let i = 1; i <= 20; i++) {
      s = applyPlaymatAction(s, {
        role: 'p1',
        action: 'DRAW_CARD',
        count: 1,
      });
    }

    expect(s.p1.handCount).toBe(20);
    // History should cap at 5
    expect(s.history?.length).toBe(5);
    expect(s.history?.[0].action).toBe('DRAW_CARD');

    // Undo 3 times
    s = applyPlaymatAction(s, { role: 'p1', action: 'UNDO' });
    s = applyPlaymatAction(s, { role: 'p1', action: 'UNDO' });
    s = applyPlaymatAction(s, { role: 'p1', action: 'UNDO' });

    expect(s.p1.handCount).toBe(17);
    expect(s.history?.length).toBe(2);
  });
});


