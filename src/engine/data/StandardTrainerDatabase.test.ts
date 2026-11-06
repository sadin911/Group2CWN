import { describe, it, expect, beforeEach } from 'vitest';
import { StandardTrainerDatabase } from './StandardTrainerDatabase';
import type { GameState, CardInstance } from '../types';

describe('StandardTrainerDatabase', () => {
  let mockState: GameState;

  beforeEach(() => {
    mockState = {
      gameId: 'test-game',
      phase: 'MAIN_PHASE',
      turnNumber: 2,
      activePlayerIndex: 0,
      firstPlayerIndex: 0,
      winner: null,
      players: [
        {
          playerId: 'p1',
          playerName: 'Player 1',
          deck: [],
          hand: [],
          discard: [],
          prizes: [{} as any, {} as any, {} as any, {} as any, {} as any, {} as any], // 6 prizes
          active: null,
          bench: [null, null, null, null, null],
          lostZone: [],
          mulliganCount: 0,
          turnFlags: {
            energyAttachedThisTurn: false,
            supporterPlayedThisTurn: false,
            stadiumPlayedThisTurn: false,
            retreatedThisTurn: false,
            attackedThisTurn: false,
            abilitiesUsed: {},
            pokemonKnockedOutLastTurn: false,
          },
        },
        {
          playerId: 'p2',
          playerName: 'Player 2',
          deck: [],
          hand: [],
          discard: [],
          prizes: [{} as any, {} as any, {} as any, {} as any, {} as any, {} as any], // 6 prizes
          active: null,
          bench: [null, null, null, null, null],
          lostZone: [],
          mulliganCount: 0,
          turnFlags: {
            energyAttachedThisTurn: false,
            supporterPlayedThisTurn: false,
            stadiumPlayedThisTurn: false,
            retreatedThisTurn: false,
            attackedThisTurn: false,
            abilitiesUsed: {},
            pokemonKnockedOutLastTurn: false,
          },
        },
      ],
      stadium: null,
      actionLog: [],
    };
  });

  it('can look up cards by English or Thai name', () => {
    const poffin = StandardTrainerDatabase.getTrainer('Buddy-Buddy Poffin');
    expect(poffin).toBeDefined();
    expect(poffin?.nameTh).toBe('โปฟฟินมิตรภาพ');

    const boss = StandardTrainerDatabase.getTrainer('คำสั่งของบอส');
    expect(boss).toBeDefined();
    expect(boss?.nameEn).toBe("Boss's Orders");

    const candy = StandardTrainerDatabase.getTrainer('Rare Candy');
    expect(candy).toBeDefined();
    expect(candy?.choiceType).toBe('evolve-basic-to-stage2');
  });

  describe('Special Red Card', () => {
    it('rejects play if opponent has > 3 prizes remaining', () => {
      const card: CardInstance = {
        instanceId: 'c1',
        cardCode: 'special-red-card',
        nameEn: 'Special Red Card',
        nameTh: 'ใบแดงพิเศษ',
        supertype: 'Trainer',
        subtypes: ['Item'],
      };

      mockState.players[1].prizes = [{} as any, {} as any, {} as any, {} as any]; // 4 prizes
      const res = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('3 ใบหรือน้อยกว่า');
    });

    it('allows play when opponent has <= 3 prizes remaining', () => {
      const card: CardInstance = {
        instanceId: 'c1',
        cardCode: 'special-red-card',
        nameEn: 'Special Red Card',
        nameTh: 'ใบแดงพิเศษ',
        supertype: 'Trainer',
        subtypes: ['Item'],
      };

      mockState.players[1].prizes = [{} as any, {} as any]; // 2 prizes
      mockState.players[1].hand = [{} as any, {} as any];
      const res = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res.valid).toBe(true);
    });
  });

  describe('Unfair Stamp', () => {
    it('rejects play if no Pokemon was knocked out last turn', () => {
      const card: CardInstance = {
        instanceId: 'c2',
        cardCode: 'unfair-stamp',
        nameEn: 'Unfair Stamp',
        nameTh: 'อันแฟร์สแตมป์',
        supertype: 'Trainer',
        subtypes: ['Item'],
      };

      mockState.players[0].turnFlags.pokemonKnockedOutLastTurn = false;
      const res = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('เทิร์นที่แล้ว');
    });

    it('allows play if Pokemon was knocked out last turn', () => {
      const card: CardInstance = {
        instanceId: 'c2',
        cardCode: 'unfair-stamp',
        nameEn: 'Unfair Stamp',
        nameTh: 'อันแฟร์สแตมป์',
        supertype: 'Trainer',
        subtypes: ['Item'],
      };

      mockState.players[0].turnFlags.pokemonKnockedOutLastTurn = true;
      const res = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res.valid).toBe(true);
    });
  });

  describe('Counter Catcher', () => {
    it('rejects play if player is not behind on prizes', () => {
      const card: CardInstance = {
        instanceId: 'c3',
        cardCode: 'counter-catcher',
        nameEn: 'Counter Catcher',
        nameTh: 'เคาน์เตอร์แคชเชอร์',
        supertype: 'Trainer',
        subtypes: ['Item'],
      };

      mockState.players[0].prizes = [{} as any, {} as any]; // 2 prizes
      mockState.players[1].prizes = [{} as any, {} as any, {} as any]; // 3 prizes
      const res = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('เราตามหลัง');
    });

    it('allows play when player is behind on prizes and opponent has bench Pokemon', () => {
      const card: CardInstance = {
        instanceId: 'c3',
        cardCode: 'counter-catcher',
        nameEn: 'Counter Catcher',
        nameTh: 'เคาน์เตอร์แคชเชอร์',
        supertype: 'Trainer',
        subtypes: ['Item'],
      };

      mockState.players[0].prizes = [{} as any, {} as any, {} as any, {} as any]; // 4 prizes
      mockState.players[1].prizes = [{} as any, {} as any]; // 2 prizes
      mockState.players[1].bench[0] = {
        instanceId: 'opp-bench-1',
        card: { nameEn: 'Pidgey', nameTh: 'โป๊ปโปะ', cardCode: 'p-1', supertype: 'Pokemon', subtypes: ['Basic'] } as any,
        damageCounters: 0,
        specialConditions: [],
        attachedEnergies: [],
        stage: 'Basic',
        maxHp: 60,
        attachedTool: null,
        evolutionHistory: [],
        turnEnteredPlay: 1,
        turnEvolved: 1,
      };

      const res = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res.valid).toBe(true);
    });
  });

  describe("Lillie's Determination", () => {
    it('draws 8 cards if player has exactly 6 prizes remaining, else 6', () => {
      const card: CardInstance = {
        instanceId: 'c4',
        cardCode: 'lillies-determination',
        nameEn: "Lillie's Determination",
        nameTh: 'ปณิธานของลิเลีย',
        supertype: 'Trainer',
        subtypes: ['Supporter'],
      };

      // 6 prizes
      mockState.players[0].deck = Array.from({ length: 20 }, (_, i) => ({
        instanceId: `d-${i}`,
        cardCode: `energy-${i}`,
        nameEn: `Card ${i}`,
        nameTh: `การ์ด ${i}`,
        supertype: 'Energy',
        subtypes: [],
      }));
      mockState.players[0].hand = [card];

      const res = StandardTrainerDatabase.executeTrainer(mockState, 0, card);
      expect(res.success).toBe(true);
      expect(res.message).toContain('8 ใบ');
      expect(mockState.players[0].hand.length).toBe(8);

      // Now with 4 prizes
      mockState.players[0].prizes = [{} as any, {} as any, {} as any, {} as any];
      const res2 = StandardTrainerDatabase.executeTrainer(mockState, 0, card);
      expect(res2.success).toBe(true);
      expect(res2.message).toContain('6 ใบ');
    });
  });

  describe('Briar', () => {
    it('rejects play if opponent does not have exactly 2 prizes remaining', () => {
      const card: CardInstance = {
        instanceId: 'c5',
        cardCode: 'briar',
        nameEn: 'Briar',
        nameTh: 'ไบรอาร์',
        supertype: 'Trainer',
        subtypes: ['Supporter'],
      };

      mockState.players[1].prizes = [{} as any, {} as any, {} as any]; // 3 prizes
      const res = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res.valid).toBe(false);
      expect(res.error).toContain('2 ใบพอดี');

      mockState.players[1].prizes = [{} as any, {} as any]; // 2 prizes
      const res2 = StandardTrainerDatabase.canPlayTrainer(mockState, 0, card);
      expect(res2.valid).toBe(true);
    });
  });
});
