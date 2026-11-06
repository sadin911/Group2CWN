import { describe, it, expect } from 'vitest';
import {
  translateSupertype,
  translateSubtype,
  translateSubtypes,
  translateStage,
  translateEnergyType,
  translatePokemonName,
  getAttackDisplayName,
  getAbilityDisplayName,
  getCardDisplayName,
} from './pokemonThaiTranslator';

describe('pokemonThaiTranslator', () => {
  it('translates supertypes to standard Thai', () => {
    expect(translateSupertype('Pokemon')).toBe('โปเกมอน');
    expect(translateSupertype('Trainer')).toBe('เทรนเนอร์');
    expect(translateSupertype('Energy')).toBe('พลังงาน');
  });

  it('translates subtypes to standard Thai', () => {
    expect(translateSubtype('Basic')).toBe('พื้นฐาน');
    expect(translateSubtype('Stage 1')).toBe('ร่าง 1');
    expect(translateSubtype('Supporter')).toBe('ซัพพอร์ตเตอร์');
    expect(translateSubtype('Item')).toBe('ไอเท็ม');
    expect(translateSubtype('Stadium')).toBe('สเตเดียม');
    expect(translateSubtype('Pokemon Tool')).toBe('ไอเท็มติดโปเกมอน');
    expect(translateSubtype('ex')).toBe('ex');
  });

  it('translates multiple subtypes', () => {
    expect(translateSubtypes(['Basic', 'ex'])).toEqual(['พื้นฐาน', 'ex']);
  });

  it('translates stage and energy types', () => {
    expect(translateStage('Basic')).toBe('โปเกมอนพื้นฐาน');
    expect(translateStage('Stage 2')).toBe('โปเกมอนร่าง 2');
    expect(translateEnergyType('Fire')).toBe('ไฟ');
    expect(translateEnergyType('Water')).toBe('น้ำ');
  });

  it('translates English Pokemon and Trainer names to Thai', () => {
    expect(translatePokemonName('Charizard')).toBe('ลิซาร์ดอน');
    expect(translatePokemonName('Charizard ex')).toBe('ลิซาร์ดอน ex');
    expect(translatePokemonName('Pidgeot ex')).toBe('พีเจียต ex');
    expect(translatePokemonName('Pikachu')).toBe('พิคาชู');
    expect(translatePokemonName('Ultra Ball')).toBe('ไฮเปอร์บอล');
    expect(translatePokemonName('ลิซาร์ดอน')).toBe('ลิซาร์ดอน');
  });

  it('translates attacks prioritizing Thai', () => {
    expect(getAttackDisplayName({ nameTh: 'ท่าไม้ตายพิเศษ', name: 'Special Attack' })).toBe('ท่าไม้ตายพิเศษ');
    expect(getAttackDisplayName('Phantom Dive')).toBe('แฟนทอมไดฟ์');
    expect(getAttackDisplayName({ name: 'Burning Darkness' })).toBe('ความมืดที่แผดเผา');
    expect(getAttackDisplayName({ name: 'Bellowing Thunder' })).toBe('อัสนีบาตคำราม');
    expect(getAttackDisplayName(null)).toBe('ท่าโจมตี');
  });

  it('translates abilities prioritizing Thai', () => {
    expect(getAbilityDisplayName({ nameTh: 'ความสามารถพิเศษ', name: 'Special Ability' })).toBe('ความสามารถพิเศษ');
    expect(getAbilityDisplayName('Infernal Reign')).toBe('การครอบงำแห่งเพลิงนรก');
    expect(getAbilityDisplayName({ name: 'Quick Search' })).toBe('ค้นหาด่วน');
    expect(getAbilityDisplayName({ name: 'Recon Directive' })).toBe('คำสั่งสอดแนม');
    expect(getAbilityDisplayName(null)).toBe('ความสามารถ');
  });

  it('prioritizes Thai card names and translates English names to Thai', () => {
    expect(getCardDisplayName({ nameTh: 'ลิซาร์ดอน', nameEn: 'Charizard' })).toBe('ลิซาร์ดอน');
    expect(getCardDisplayName({ nameEn: 'Pikachu' })).toBe('พิคาชู');
    expect(getCardDisplayName({ nameEn: 'Charizard ex' })).toBe('ลิซาร์ดอน ex');
    expect(getCardDisplayName({ name: 'เซนิกาเมะ' })).toBe('เซนิกาเมะ');
    expect(getCardDisplayName(null)).toBe('การ์ด');
  });
});
