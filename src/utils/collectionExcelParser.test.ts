import { describe, it, expect } from 'vitest';
import { parseExcelOrCsvData } from './collectionExcelParser';

const mockCatalog = [
  {
    id: 'TH-1',
    set: { id: 'SC1a', name: 'Legendary Clash' },
    collectorNumber: '001-154',
    localId: '1',
    name: 'สไตรค์',
  },
  {
    id: 'TH-2',
    set: { id: 'SC1a', name: 'Legendary Clash' },
    collectorNumber: '002-154',
    localId: '2',
    name: 'อโกจิมูชิ',
  },
  {
    id: 'SV8a-025',
    set: { id: 'SV8a', name: 'Terastal Festival' },
    collectorNumber: '025/187',
    localId: '25',
    name: 'พิคาชู ex',
  },
];

describe('collectionExcelParser', () => {
  it('parses CSV with English headers', async () => {
    const csv = `Set,Number,Quantity,Variant
SC1a,1,3,Normal
SV8a,025/187,2,Holo`;

    const result = await parseExcelOrCsvData(csv, mockCatalog);
    expect(result.cards).toHaveLength(2);
    expect(result.totalQuantity).toBe(5);
    expect(result.setsFound).toEqual(['SC1a', 'SV8a']);

    const sc1aCard = result.cards.find((c) => c.setCode === 'SC1a');
    expect(sc1aCard).toBeDefined();
    expect(sc1aCard?.cardId).toBe('TH-1');
    expect(sc1aCard?.quantity).toBe(3);
    expect(sc1aCard?.variant).toBe('normal');

    const sv8aCard = result.cards.find((c) => c.setCode === 'SV8a');
    expect(sv8aCard).toBeDefined();
    expect(sv8aCard?.cardId).toBe('SV8a-025');
    expect(sv8aCard?.quantity).toBe(2);
    expect(sv8aCard?.variant).toBe('holo');
  });

  it('parses CSV with Thai headers and variants', async () => {
    const csv = `ชุด,เลขการ์ด,จำนวน,แบบ
SC1a,002-154,5,รีเวิร์ส
SV8a,25,1,โฮโล`;

    const result = await parseExcelOrCsvData(csv, mockCatalog);
    expect(result.cards).toHaveLength(2);
    expect(result.totalQuantity).toBe(6);

    const card2 = result.cards.find((c) => c.cardId === 'TH-2');
    expect(card2).toBeDefined();
    expect(card2?.quantity).toBe(5);
    expect(card2?.variant).toBe('reverse');
  });

  it('parses headerless CSV based on column positions', async () => {
    const csv = `SC1a,1,4
SV8a,25,2`;

    const result = await parseExcelOrCsvData(csv, mockCatalog);
    expect(result.cards).toHaveLength(2);
    expect(result.totalQuantity).toBe(6);
    expect(result.unmatchedRows).toHaveLength(0);
  });

  it('records unmatched rows with reasons', async () => {
    const csv = `Set,Number,Quantity
SC1a,999,1
NONEXISTENT,001,2`;

    const result = await parseExcelOrCsvData(csv, mockCatalog);
    expect(result.cards).toHaveLength(0);
    expect(result.unmatchedRows).toHaveLength(2);
    expect(result.unmatchedRows[0].reason).toContain('999');
    expect(result.unmatchedRows[1].reason).toContain('NONEXISTENT');
  });

  it('aggregates quantities when same card and variant appears multiple times', async () => {
    const csv = `Set,Number,Quantity,Variant
SC1a,1,2,Normal
SC1a,1,3,Normal`;

    const result = await parseExcelOrCsvData(csv, mockCatalog);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].quantity).toBe(5);
  });
});
