/**
 * LimitlessDeckLoader.ts
 * Loads official Limitless TCG tournament meta decks and converts raw card data
 * into fully compliant 60-card Standard CardInstance arrays for Playmat V2,
 * powered by the centralized StandardCardDatabase, authentic attacks, and abilities.
 */

import metaDecksData from '../../data/metaDecks.json';
import pokemonNamesData from '../../data/pokemonNames.json';
import pokemonTranslationsData from '../../data/pokemonNameTranslations.json';
import thaiEnglishCardMapData from '../../data/thaiEnglishCardMap.json';
import pokemonCardsEnData from '../../data/pokemonCardsEn.json';
import thaiSupportersData from '../../data/thaiSupporterNames.json';
import type { CardInstance, Supertype } from '../types';
import type { MetaDeck } from '../../types/metaDeck';
import { EvolutionResolver } from './EvolutionResolver';
import { StandardCardDatabase } from './StandardCardDatabase';
import { getMergedMetaDecks } from '../../services/metaDeckService';

// 1. In-memory indexing of raw Thai card database
interface RawCard {
  id: string;
  localId?: string;
  name: string;
  stage?: string;
  category: string;
  hp?: number | null;
  types?: string[];
  imageUrl?: string;
  imageUrlHigh?: string;
  officialImageUrl?: string;
  collectorNumber?: string;
  regulationMark?: string;
  rarityCode?: string;
  set?: { id: string; name: string };
}

const rawCardsById = new Map<string, RawCard>();
(pokemonNamesData as unknown as RawCard[]).forEach((card) => {
  rawCardsById.set(card.id, card);
});

// 2. Thai -> English verified card map
const thEnMap = thaiEnglishCardMapData as Record<
  string,
  {
    enName?: string;
    enImageUrl?: string;
    enOfficialImageUrl?: string;
    enCardName?: string;
  }
>;

// 3. English card lookup by lower-case canonical name
const enCardsByName = new Map<string, any>();
(pokemonCardsEnData as any[]).forEach((c) => {
  if (c.name) {
    const key = c.name.toLowerCase().trim();
    if (!enCardsByName.has(key)) {
      enCardsByName.set(key, c);
    }
  }
});

// 4. Thai official supporters set (235 verified names)
const thaiSupporterSet = new Set<string>((thaiSupportersData as string[]).map((s) => s.trim()));

// 5. Explicit overrides for unindexed cards
const EXPLICIT_THAI_MAPPINGS: Record<
  string,
  { enName: string; supertype: Supertype; subtypes: string[] }
> = {
  'TH-12375': { enName: 'Buddy-Buddy Poffin', supertype: 'Trainer', subtypes: ['Item'] },
  'TH-12938': { enName: "N's Darmanitan", supertype: 'Pokemon', subtypes: ['Stage 1', 'Stage1'] },
  'TH-7896': { enName: 'Neo Upper Energy', supertype: 'Energy', subtypes: ['Special', 'ACE SPEC'] },
};

// Reverse lookup for Thai -> English pokemon name translation
const thaiToEnPokemonMap = new Map<string, string>();
if (pokemonTranslationsData && typeof pokemonTranslationsData === 'object') {
  const pMap = (pokemonTranslationsData as any).pokemon || {};
  for (const [enName, thName] of Object.entries(pMap)) {
    if (typeof thName === 'string') {
      thaiToEnPokemonMap.set(thName.trim(), enName.charAt(0).toUpperCase() + enName.slice(1));
    }
  }
}

const STADIUM_KEYWORDS = [
  'สเตเดียม',
  'เมาน์เทน',
  'โพรงถ้ำ',
  'ป่าเปี่ยมพลัง',
  'ทาวเวอร์',
  'ซิตี้',
  'ทาวน์',
  'การ์เด้น',
  'เหมือง',
  'ซากปรัก',
  'หอเฝ้าระวัง',
  'ยิม',
  'โรงงาน',
];

const TOOL_KEYWORDS = [
  'ผ้าคาดหัว',
  'ลูกโป่ง',
  'กำไล',
  'ทูล',
  'เคาน์เตอร์เกน',
  'เวทเสริมพลัง',
  'เกล็ดหนา',
  'แว่นขยาย',
  'บูสเตอร์เอนเนอร์จี',
  'ผ้าคลุม',
  'โมจิ',
  'หมวกนิรภัย',
  'สายรัด',
];

let instanceCounter = 1;

/**
 * Derives official English name cleanly from raw card data
 */
export function deriveEnglishName(rawName: string, cardId?: string, category?: string): string {
  // 1. Check explicit override
  if (cardId && EXPLICIT_THAI_MAPPINGS[cardId]) {
    return EXPLICIT_THAI_MAPPINGS[cardId].enName;
  }

  // 2. Check verified Thai -> English map
  if (cardId && thEnMap[cardId]?.enName) {
    return thEnMap[cardId].enName!;
  }

  // 3. Known staple Trainer translations
  if (rawName.includes('ปณิธานของลิเลีย')) return "Lillie's Determination";
  if (rawName.includes('คำสั่งของบอส')) return "Boss's Orders";
  if (rawName.includes('งานวิจัยของศาสตราจารย์')) return "Professor's Research";
  if (rawName.includes('นันจาโม')) return 'Iono';
  if (rawName.includes('เปปเปอร์')) return 'Arven';
  if (rawName.includes('อาคามัตสึ')) return 'Crispin';
  if (rawName.includes('ผู้ตัดสิน')) return 'Judge';
  if (rawName.includes('ซุกุริ')) return 'Kieran';
  if (rawName.includes('ฮิคาริ')) return 'Dawn';
  if (rawName.includes('จิตยึดติดของอโครมา')) return "Colress's Tenacity";
  if (rawName.includes('ความมั่นใจของมัตสึบะ')) return "Morty's Conviction";
  if (rawName.includes('การปรนนิบัติของซุยเรน')) return "Lana's Aid";
  if (rawName.includes('การถอดรหัสของผู้คลั่งไคล้รหัสลับ')) return "Ciphermaniac's Codebreaking";
  if (rawName.includes('ความสงบของ AZ')) return "AZ's Tranquility";
  if (rawName.includes('เทคนิคลับของอันสุ')) return "Janine's Secret Art";
  if (rawName.includes('กำลังใจจากเม')) return "Rosa's Encouragement";
  if (rawName.includes('แลมป์ดาแห่งแก๊งร็อกเกต')) return "Team Rocket's Petrel";
  if (rawName.includes('นักโต้คลื่น')) return 'Surfer';
  if (rawName.includes('จิตมุ่งมั่นของศาสตราจารย์โอลิม') || rawName.includes('ซาดะ')) return "Professor Sada's Vitality";

  // Known Items / Tools / Stadiums
  if (rawName.includes('ไฮเปอร์บอล')) return 'Ultra Ball';
  if (rawName.includes('เนสต์บอล')) return 'Nest Ball';
  if (rawName.includes('โปฟฟินมิตรภาพ') || rawName.includes('นากาโยชิ')) return 'Buddy-Buddy Poffin';
  if (rawName.includes('ลูกอมประหลาด')) return 'Rare Candy';
  if (rawName.includes('คันเบ็ดชั้นยอด')) return 'Super Rod';
  if (rawName.includes('สับเปลี่ยนโปเกมอน')) return 'Switch';
  if (rawName.includes('เปลหามยามราตรี')) return 'Night Stretcher';
  if (rawName.includes('อันแฟร์สแตมป์')) return 'Unfair Stamp';
  if (rawName.includes('ใบแดงพิเศษ')) return 'Special Red Card';
  if (rawName.includes('โปเกเกีย 3.0')) return 'Pokégear 3.0';
  if (rawName.includes('โปเกมอนแท็บเล็ต')) return 'Poké Pad';
  if (rawName.includes('แครชแฮมเมอร์')) return 'Crushing Hammer';
  if (rawName.includes('ไอศกรีมจัมโบ้')) return 'Jumbo Ice Cream';
  if (rawName.includes('สลับการ์ดพลังงาน')) return 'Energy Switch';
  if (rawName.includes('เอนเนอร์จี้รีไซเคิล')) return 'Energy Recycler';
  if (rawName.includes('ผ้าคลุมฮีโร่')) return "Hero's Cape";
  if (rawName.includes('โมจิอันทุ')) return 'Binding Mochi';
  if (rawName.includes('ลูกโป่ง')) return 'Air Balloon';
  if (rawName.includes('ต้นไม้ยักษ์วิเศษ')) return 'Grand Tree';
  if (rawName.includes('หอเฝ้าระวังของแก๊งร็อกเกต')) return "Team Rocket's Watchtower";
  if (rawName.includes('มิอาเรซิตี้')) return 'Lumiose City';
  if (rawName.includes('ซากปรักอันตราย')) return 'Risky Ruins';
  if (rawName.includes('เคาน์เตอร์แคชเชอร์')) return 'Counter Catcher';
  if (rawName.includes('ไพรม์แคชเชอร์')) return 'Prime Catcher';
  if (rawName.includes('ดาร์กแพตช์')) return 'Dark Patch';

  // Energy card translations
  if (category === 'Energy' || rawName.includes('พลังงาน') || rawName.includes('เอนเนอร์จี้')) {
    if (rawName.includes('นีโออัปเปอร์')) return 'Neo Upper Energy';
    if (rawName.includes('มิสต์')) return 'Mist Energy';
    if (rawName.includes('จุดระเบิด')) return 'Ignition Energy';
    if (rawName.includes('ไฟ')) return 'Basic Fire Energy';
    if (rawName.includes('สายฟ้า')) return 'Basic Lightning Energy';
    if (rawName.includes('ความมืด')) return 'Basic Darkness Energy';
    if (rawName.includes('น้ำ') || rawName.includes('สายน้ำ')) return 'Basic Water Energy';
    if (rawName.includes('หญ้า')) return 'Basic Grass Energy';
    if (rawName.includes('พลังจิต')) return 'Basic Psychic Energy';
    if (rawName.includes('ต่อสู้')) return 'Basic Fighting Energy';
    if (rawName.includes('โลหะ')) return 'Basic Metal Energy';
    if (rawName.includes('มังกร')) return 'Basic Dragon Energy';
    return rawName;
  }

  // Owner Pokémon translation
  let ownerPrefix = '';
  if (rawName.includes('<ของชิโรนะ>')) ownerPrefix = "Cynthia's ";
  else if (rawName.includes('<ของลิเลีย>')) ownerPrefix = "Lillie's ";
  else if (rawName.includes('<ของ N>') || rawName.includes('<ของ_N>')) ownerPrefix = "N's ";
  else if (rawName.includes('<ของแมรี>')) ownerPrefix = "Marnie's ";

  const isEx = /ex$/i.test(rawName) || rawName.includes(' ex');
  const isVSTAR = rawName.includes('VSTAR');
  const isVMAX = rawName.includes('VMAX');
  const isV = !isVSTAR && !isVMAX && (rawName.endsWith('V') || rawName.includes(' V'));

  let cleanThai = rawName
    .replace(/<ของ.*?_?>/g, '')
    .replace(/_ของ_?.*$/, '')
    .replace(/\s*ex$/i, '')
    .replace(/\s*vstar$/i, '')
    .replace(/\s*vmax$/i, '')
    .replace(/\s*v$/i, '')
    .replace(/^เมก้า\s*/, 'Mega ')
    .trim();

  const isMega = cleanThai.startsWith('Mega ');
  const baseThai = cleanThai.replace(/^Mega\s*/, '').trim();

  const translatedBase = thaiToEnPokemonMap.get(baseThai);
  if (translatedBase) {
    let finalName = `${ownerPrefix}${isMega ? 'Mega ' : ''}${translatedBase}`;
    if (isEx) finalName = `${finalName} ex`;
    else if (isVSTAR) finalName = `${finalName} VSTAR`;
    else if (isVMAX) finalName = `${finalName} VMAX`;
    else if (isV) finalName = `${finalName} V`;
    return finalName;
  }

  return rawName;
}

/**
 * Builds a CardInstance from raw card database entry
 */
export function buildCardInstanceFromRaw(rawCard: RawCard, uniqueTag: string): CardInstance {
  const nameEn = deriveEnglishName(rawCard.name, rawCard.id, rawCard.category);
  const explicitOverride = EXPLICIT_THAI_MAPPINGS[rawCard.id];

  let supertype: Supertype = 'Pokemon';
  let subtypes: string[] = [];

  if (explicitOverride) {
    supertype = explicitOverride.supertype;
    subtypes = [...explicitOverride.subtypes];
  } else {
    // 1. Lookup in English cards database
    const enCard = enCardsByName.get(nameEn.toLowerCase().trim());
    if (enCard) {
      supertype = (enCard.supertype === 'Pokémon' ? 'Pokemon' : enCard.supertype) as Supertype;
      subtypes = [...(enCard.subtypes || [])];

      if (enCard.stage === 'Stage 1' && !subtypes.includes('Stage 1')) {
        subtypes.push('Stage 1', 'Stage1');
      } else if (enCard.stage === 'Stage 2' && !subtypes.includes('Stage 2')) {
        subtypes.push('Stage 2', 'Stage2');
      } else if (enCard.stage === 'Basic' && !subtypes.includes('Basic')) {
        subtypes.push('Basic');
      }

      // Tool handling
      if (subtypes.includes('Pokémon Tool') || subtypes.includes('Tool')) {
        if (!subtypes.includes('Tool')) subtypes.push('Tool');
        if (!subtypes.includes('Item')) subtypes.push('Item');
      }
    } else {
      // 2. Fallback category matching
      if (rawCard.category === 'Trainer') {
        supertype = 'Trainer';
        const isSupporter = thaiSupporterSet.has(rawCard.name) || thaiSupporterSet.has(rawCard.name.trim());
        const isStadium = STADIUM_KEYWORDS.some((kw) => rawCard.name.includes(kw));
        const isTool = TOOL_KEYWORDS.some((kw) => rawCard.name.includes(kw));

        if (isSupporter) subtypes.push('Supporter');
        else if (isStadium) subtypes.push('Stadium');
        else if (isTool) subtypes.push('Tool', 'Item');
        else subtypes.push('Item');
      } else if (rawCard.category === 'Energy') {
        supertype = 'Energy';
        const isSpecial =
          rawCard.name.includes('พิเศษ') ||
          rawCard.name.includes('จุดระเบิด') ||
          rawCard.name.includes('ปริซึม') ||
          rawCard.name.includes('มิสต์') ||
          rawCard.name.includes('นีโออัปเปอร์');
        subtypes.push(isSpecial ? 'Special' : 'Basic');
        if (rawCard.name.includes('นีโออัปเปอร์')) subtypes.push('ACE SPEC');
      } else {
        supertype = 'Pokemon';
        if (rawCard.stage === 'ร่าง 1') subtypes.push('Stage 1', 'Stage1');
        else if (rawCard.stage === 'ร่าง 2') subtypes.push('Stage 2', 'Stage2');
        else subtypes.push('Basic');
      }
    }
  }

  // Energy type deduction
  let energyType: string | undefined;
  if (supertype === 'Pokemon') {
    energyType = rawCard.types && rawCard.types.length > 0 ? rawCard.types[0] : 'Colorless';
  } else if (supertype === 'Energy') {
    if (nameEn.includes('Fire') || rawCard.name.includes('ไฟ')) energyType = 'Fire';
    else if (nameEn.includes('Lightning') || rawCard.name.includes('สายฟ้า')) energyType = 'Lightning';
    else if (nameEn.includes('Darkness') || rawCard.name.includes('ความมืด')) energyType = 'Darkness';
    else if (nameEn.includes('Water') || rawCard.name.includes('น้ำ')) energyType = 'Water';
    else if (nameEn.includes('Grass') || rawCard.name.includes('หญ้า')) energyType = 'Grass';
    else if (nameEn.includes('Psychic') || rawCard.name.includes('พลังจิต')) energyType = 'Psychic';
    else if (nameEn.includes('Fighting') || rawCard.name.includes('ต่อสู้')) energyType = 'Fighting';
    else if (nameEn.includes('Metal') || rawCard.name.includes('โลหะ')) energyType = 'Metal';
    else if (nameEn.includes('Dragon') || rawCard.name.includes('มังกร')) energyType = 'Dragon';
    else energyType = 'Colorless';
  }

  // Derive evolution relationship
  let evolvesFrom = EvolutionResolver.getPreviousEvolutionName(nameEn, rawCard.name, subtypes);

  // 6. Enrich Pokémon with Authentic Attacks & Abilities from StandardCardDatabase
  let hp = rawCard.hp || 70;
  let attacks = undefined;
  let abilities = undefined;
  let retreatCost: number | undefined = undefined;

  if (supertype === 'Pokemon') {
    const enriched = StandardCardDatabase.enrichPokemon({
      nameEn,
      nameTh: rawCard.name,
      subtypes,
      energyType,
      hp: rawCard.hp || undefined,
      evolvesFrom,
    });

    hp = enriched.hp;
    attacks = enriched.attacks;
    abilities = enriched.abilities.length > 0 ? enriched.abilities : undefined;
    subtypes = enriched.subtypes;
    energyType = enriched.energyType;
    evolvesFrom = enriched.evolvesFrom;
    retreatCost = subtypes.includes('ex') ? 2 : 1;
  }

  const thMapEntry = thEnMap[rawCard.id];
  const imageUrl = rawCard.imageUrl || thMapEntry?.enImageUrl;
  const officialImageUrl = rawCard.officialImageUrl || thMapEntry?.enOfficialImageUrl;
  const imageUrlHigh = rawCard.imageUrlHigh || thMapEntry?.enImageUrl;

  return {
    instanceId: `card-${rawCard.id}-${uniqueTag}-${instanceCounter++}`,
    cardCode: rawCard.collectorNumber || rawCard.id,
    nameTh: rawCard.name,
    nameEn,
    supertype,
    subtypes,
    energyType,
    hp: supertype === 'Pokemon' ? hp : undefined,
    evolvesFrom,
    attacks,
    abilities,
    retreatCost,
    imageUrl,
    imageUrlHigh,
    officialImageUrl,
  };
}

/**
 * Builds a complete 60-card tournament deck from a Limitless Meta Deck ID
 */
export function buildMetaDeck(deckId: string): CardInstance[] {
  const metaDeck = (metaDecksData as unknown as MetaDeck[]).find((d) => d.id === deckId);
  if (!metaDeck) {
    throw new Error(`Limitless Meta Deck with id "${deckId}" not found.`);
  }

  const deck: CardInstance[] = [];

  if (metaDeck.cards) {
    for (const [cardId, entry] of Object.entries(metaDeck.cards)) {
      const rawCard = rawCardsById.get(cardId);
      if (!rawCard) {
        console.warn(`[LimitlessDeckLoader] Card ID "${cardId}" not found in database.`);
        continue;
      }

      for (let i = 0; i < entry.count; i++) {
        deck.push(buildCardInstanceFromRaw(rawCard, `${deckId}-${i}`));
      }
    }
  }

  return deck;
}

/**
 * Resolves a card ID or entry from a user custom deck into a CardInstance
 */
export function resolveUserDeckCard(
  cardId: string,
  entry: { cardId?: string; count: number; name?: string },
  uniqueTag: string
): CardInstance {
  const targetId = (entry.cardId || cardId || '').trim();

  // 1. Direct match in raw Thai cards (exact, uppercase, or normalized TH- prefix)
  let raw = rawCardsById.get(targetId);
  if (!raw) {
    raw = rawCardsById.get(targetId.toUpperCase());
  }
  if (!raw && targetId.toLowerCase().startsWith('th-')) {
    raw = rawCardsById.get('TH-' + targetId.slice(3));
  }
  if (raw) {
    return buildCardInstanceFromRaw(raw, uniqueTag);
  }

  // 2. Check English card database
  const enCard = (pokemonCardsEnData as any[]).find(
    (c) => c.id === targetId || c.rawId === targetId || (c.name && c.name.toLowerCase() === targetId.toLowerCase())
  );
  if (enCard) {
    const supertype: Supertype =
      enCard.supertype === 'Trainer' || enCard.category === 'Trainer'
        ? 'Trainer'
        : enCard.supertype === 'Energy' || enCard.category === 'Energy'
        ? 'Energy'
        : 'Pokemon';

    return {
      instanceId: `card-${enCard.id || targetId}-${uniqueTag}-${instanceCounter++}`,
      cardCode: enCard.collectorNumber || enCard.id || targetId,
      nameTh: enCard.nameTh || enCard.name,
      nameEn: enCard.name,
      supertype,
      subtypes: enCard.subtypes || (supertype === 'Pokemon' ? ['Basic'] : []),
      energyType: enCard.types?.[0] || 'Colorless',
      hp: enCard.hp,
      attacks: enCard.attacks,
      abilities: enCard.abilities,
      retreatCost: enCard.retreatCost,
      imageUrl: enCard.imageUrl,
      officialImageUrl: enCard.officialImageUrl,
    };
  }

  // 3. Fallback generic card so no card is ever lost in custom decks
  return {
    instanceId: `card-custom-${targetId}-${uniqueTag}-${instanceCounter++}`,
    cardCode: targetId,
    nameTh: entry.name || targetId,
    nameEn: entry.name || targetId,
    supertype: 'Pokemon',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 70,
  };
}

/**
 * Builds CardInstance array from a user custom deck
 */
export function buildUserCustomDeck(deck: {
  id?: string;
  cards?: Record<string, { count: number; cardId?: string; name?: string }>;
}): CardInstance[] {
  const cards: CardInstance[] = [];
  const deckId = deck.id || 'custom';

  if (deck.cards) {
    for (const [cardId, entry] of Object.entries(deck.cards)) {
      if (!entry || entry.count <= 0) continue;
      for (let i = 0; i < entry.count; i++) {
        cards.push(resolveUserDeckCard(cardId, entry, `${deckId}-${i}`));
      }
    }
  }

  // If user deck has fewer than 60 cards, it's still fine for tabletop sandbox!
  return cards;
}

/**
 * Exported list of all 24 Limitless tournament meta decks for selection UI
 */
export const LIMITLESS_META_DECKS = metaDecksData as unknown as MetaDeck[];

/**
 * Find a meta deck by ID (incorporating any Admin overrides)
 */
export function getMetaDeckById(deckId: string): MetaDeck | undefined {
  try {
    const merged = getMergedMetaDecks();
    const found = merged.find((d) => d.id === deckId);
    if (found) return found;
  } catch {}
  return LIMITLESS_META_DECKS.find((d) => d.id === deckId);
}
