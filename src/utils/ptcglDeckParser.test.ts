import { describe, it, expect } from 'vitest';
import { parsePTCGLDeck, isPTCGLDeckFormat, translateEnCardNameToTh } from './ptcglDeckParser';
import pokemonCardData from '../data/pokemonNames.json';
import exampleDeckText from '../../exampleENImport.txt?raw';

describe('ptcglDeckParser', () => {
  it('detects PTCGL / Limitless deck format correctly', () => {
    const validDeck = `Pokémon: 19\n4 Dreepy TWM 128\n4 Drakloak TWM 129\nTrainer: 32\nEnergy: 9`;
    expect(isPTCGLDeckFormat(validDeck)).toBe(true);

    const validWithoutSections = `4 Dreepy TWM 128\n4 Drakloak TWM 129\n3 Dragapult ex TWM 130`;
    expect(isPTCGLDeckFormat(validWithoutSections)).toBe(true);

    const invalid = `just random text\nnot a deck`;
    expect(isPTCGLDeckFormat(invalid)).toBe(false);
  });

  it('translates English Pokémon and Trainer names to Thai', () => {
    expect(translateEnCardNameToTh('Dragapult ex')).toBe('โดราพัลท์ex');
    expect(translateEnCardNameToTh('Dreepy')).toBe('โดราเมชิยะ');
    expect(translateEnCardNameToTh('Buddy-Buddy Poffin')).toBe('โปฟฟินมิตรภาพ');
    expect(translateEnCardNameToTh("Boss's Orders")).toBe('คำสั่งของบอส');
    expect(translateEnCardNameToTh('Fire Energy')).toBe('พลังงานพื้นฐาน[ไฟ]');
    expect(translateEnCardNameToTh('Darkness Energy')).toBe('พลังงานพื้นฐาน[ความมืด]');
    expect(translateEnCardNameToTh('Unfair Stamp')).toBe('อันแฟร์สแตมป์');
    expect(translateEnCardNameToTh('Special Red Card')).toBe('ใบแดงพิเศษ');
    expect(translateEnCardNameToTh("Lillie's Determination")).toBe('ปณิธานของลิเลีย');
    expect(translateEnCardNameToTh("Rosa's Encouragement")).toBe('กำลังใจจากเม');
    expect(translateEnCardNameToTh('Poké Pad')).toBe('โปเกมอนแท็บเล็ต');
    expect(translateEnCardNameToTh('Night Stretcher')).toBe('เปลหามยามราตรี');
    expect(translateEnCardNameToTh('Risky Ruins')).toBe('ซากปรักอันตราย');
  });

  it('parses the full 60-card Limitless deck from exampleENImport.txt with 100% resolution', () => {
    const deckText = exampleDeckText;

    const result = parsePTCGLDeck(deckText, pokemonCardData);

    expect(result.success).toBe(true);
    expect(result.totalCards).toBe(60);
    expect(result.matchedEntries.length).toBe(24);
    expect(result.unmatchedLines.length).toBe(0);
    expect(result.deckName).toBe('Dragapult ex');
    expect(result.coverCardId).toBeDefined();

    // Verify key cards in deck
    const dragapult = result.matchedEntries.find((e) => e.cardNameEn === 'Dragapult ex');
    expect(dragapult).toBeDefined();
    expect(dragapult?.count).toBe(3);
    expect(dragapult?.cardNameTh).toBe('โดราพัลท์ex');

    const poffin = result.matchedEntries.find((e) => e.cardNameEn === 'Buddy-Buddy Poffin');
    expect(poffin).toBeDefined();
    expect(poffin?.count).toBe(4);
    expect(poffin?.cardNameTh).toBe('โปฟฟินมิตรภาพ');

    const fireEnergy = result.matchedEntries.find((e) => e.cardNameEn === 'Fire Energy');
    expect(fireEnergy).toBeDefined();
    expect(fireEnergy?.count).toBe(3);
  });

  it('handles Thai card names in PTCGL format seamlessly', () => {
    const thaiDeck = `
Pokémon: 4
4 โดราเมชิยะ SV6 079
Trainer: 4
4 โปฟฟินมิตรภาพ SV5K 063
Energy: 4
4 พลังงานพื้นฐาน[ไฟ] SVAL FIR
`;
    const result = parsePTCGLDeck(thaiDeck, pokemonCardData);
    expect(result.success).toBe(true);
    expect(result.totalCards).toBe(12);
    expect(result.matchedEntries.length).toBe(3);
  });

  it('collects unmatched details and resolves them when customMappings are provided', () => {
    const deckWithUnmatched = `
4 Dreepy TWM 128
2 MysteryTrainerXYZ TEF 999
`;
    // Without customMappings: MysteryTrainerXYZ is unmatched
    const result1 = parsePTCGLDeck(deckWithUnmatched, pokemonCardData);
    expect(result1.totalCards).toBe(4);
    expect(result1.unmatchedDetails.length).toBe(1);
    expect(result1.unmatchedDetails[0].rawCardName).toBe('MysteryTrainerXYZ');
    expect(result1.unmatchedDetails[0].count).toBe(2);
    expect(result1.unmatchedDetails[0].setCode).toBe('TEF');

    // With customMappings: MysteryTrainerXYZ mapped to 'TH-7791' (คำสั่งของบอส)
    const customMappings = {
      mysterytrainerxyz: 'TH-7791',
    };
    const result2 = parsePTCGLDeck(deckWithUnmatched, pokemonCardData, customMappings);
    expect(result2.totalCards).toBe(6);
    expect(result2.unmatchedDetails.length).toBe(0);
    expect(result2.matchedEntries.some((e) => e.cardNameEn === 'MysteryTrainerXYZ')).toBe(true);

    // Verify separation into autoMatchedEntries vs customMappedEntries
    expect(result2.autoMatchedEntries.length).toBe(1);
    expect(result2.autoMatchedEntries[0].cardNameEn).toBe('Dreepy');
    expect(result2.autoMatchedEntries[0].isCustomMapped).toBeFalsy();

    expect(result2.customMappedEntries.length).toBe(1);
    expect(result2.customMappedEntries[0].cardNameEn).toBe('MysteryTrainerXYZ');
    expect(result2.customMappedEntries[0].isCustomMapped).toBe(true);
    expect(result2.customMappedEntries[0].rawItem).toBeDefined();
    expect(result2.customMappedEntries[0].rawItem.rawCardName).toBe('MysteryTrainerXYZ');
  });
});


