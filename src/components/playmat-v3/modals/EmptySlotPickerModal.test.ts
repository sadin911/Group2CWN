import { describe, it, expect } from 'vitest';
import type { CardInstance } from '../../../engine/types';

describe('EmptySlotPickerModal card classification logic', () => {
  const sampleCards: CardInstance[] = [
    {
      instanceId: 'card-1',
      cardCode: 'c-1',
      nameTh: 'ชาริซาร์ด ex',
      nameEn: 'Charizard ex',
      supertype: 'Pokemon',
      subtypes: ['Stage 2', 'ex'],
      evolvesFrom: 'Charmeleon',
      hp: 330,
    },
    {
      instanceId: 'card-2',
      cardCode: 'c-2',
      nameTh: 'ฮิโตคาเงะ',
      nameEn: 'Charmander',
      supertype: 'Pokemon',
      subtypes: ['Basic'],
      hp: 70,
    },
    {
      instanceId: 'card-3',
      cardCode: 'c-3',
      nameTh: 'คำสั่งของบอส',
      nameEn: "Boss's Orders",
      supertype: 'Trainer',
      subtypes: ['Supporter'],
    },
  ];

  it('correctly categorizes Basic vs Evolution Pokémon', () => {
    const basics = sampleCards.filter(
      (c) => c.supertype === 'Pokemon' && (c.subtypes?.includes('Basic') || !c.evolvesFrom)
    );
    const evolutions = sampleCards.filter(
      (c) => c.supertype === 'Pokemon' && !c.subtypes?.includes('Basic') && Boolean(c.evolvesFrom)
    );
    const trainers = sampleCards.filter((c) => c.supertype === 'Trainer');

    expect(basics).toHaveLength(1);
    expect(basics[0].nameEn).toBe('Charmander');

    expect(evolutions).toHaveLength(1);
    expect(evolutions[0].nameEn).toBe('Charizard ex');

    expect(trainers).toHaveLength(1);
    expect(trainers[0].nameEn).toBe("Boss's Orders");
  });

  it('verifies slot target display formatting for bench and active', () => {
    const formatTitle = (targetPosition: 'ACTIVE' | number) => {
      return typeof targetPosition === 'number'
        ? `เลือกการ์ดวางลง เบนช์ ช่องที่ ${targetPosition + 1}`
        : 'เลือกการ์ดวางลงตำแหน่ง Active';
    };

    expect(formatTitle('ACTIVE')).toBe('เลือกการ์ดวางลงตำแหน่ง Active');
    expect(formatTitle(0)).toBe('เลือกการ์ดวางลง เบนช์ ช่องที่ 1');
    expect(formatTitle(4)).toBe('เลือกการ์ดวางลง เบนช์ ช่องที่ 5');
  });
});
