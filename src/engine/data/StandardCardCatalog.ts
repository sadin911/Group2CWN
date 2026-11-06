/**
 * Standard Pokémon TCG Meta Decks — 60-Card Complete Catalog
 * Authentic cards for Charizard ex and Miraidon ex
 */

import type { CardInstance } from '../types';

let nextId = 1;
export function createCard(base: Omit<CardInstance, 'instanceId'>): CardInstance {
  return {
    ...base,
    instanceId: `card-${nextId++}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

export const CardTemplates: Record<string, Omit<CardInstance, 'instanceId'>> = {
  // --- Charizard Deck Pokemon ---
  Charmander: {
    cardCode: 'SVTL-001',
    nameTh: 'ฮิโตคาเงะ',
    nameEn: 'Charmander',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic'],
    energyType: 'Fire',
    hp: 70,
    imageUrl: '/card-images/SVTL/001-021_ฮิโตคาเงะ.webp',
    attacks: [{ name: 'Scratch', cost: { Colorless: 1 }, damage: 10 }],
    retreatCost: 1,
    weakness: { type: 'Water', value: 'x2' as const },
  },
  Charmeleon: {
    cardCode: 'SVTL-002',
    nameTh: 'ลิซาร์โดะ',
    nameEn: 'Charmeleon',
    supertype: 'Pokemon' as const,
    subtypes: ['Stage 1', 'Stage1'],
    evolvesFrom: 'Charmander',
    energyType: 'Fire',
    hp: 90,
    imageUrl: '/card-images/SVTL/002-021_ลิซาร์โดะ.webp',
    attacks: [{ name: 'Combustion', cost: { Fire: 2 }, damage: 50 }],
    retreatCost: 2,
    weakness: { type: 'Water', value: 'x2' as const },
  },
  CharizardEx: {
    cardCode: 'SVTL-006',
    nameTh: 'ลิซาร์ดอน ex',
    nameEn: 'Charizard ex',
    supertype: 'Pokemon' as const,
    subtypes: ['Stage 2', 'Stage2', 'ex'],
    evolvesFrom: 'Charmeleon',
    energyType: 'Darkness', // Tera Darkness Charizard
    hp: 330,
    imageUrl: '/card-images/SVTL/006-021_ลิซาร์ดอนex.webp',
    abilities: [
      {
        name: 'Infernal Reign',
        type: 'Ability',
        text: 'When this Pokémon evolves from your hand, search deck for up to 3 Basic Fire Energy and attach them to your Pokémon in any way.',
        trigger: 'on-evolution',
      },
    ],
    attacks: [
      {
        name: 'Burning Darkness',
        cost: { Fire: 2 },
        damage: 180,
        text: 'This attack does 30 more damage for each Prize card your opponent has taken.',
      },
    ],
    retreatCost: 2,
    weakness: { type: 'Grass', value: 'x2' as const },
  },
  Pidgey: {
    cardCode: 'SV3-087',
    nameTh: 'ป็อปโปะ',
    nameEn: 'Pidgey',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 60,
    imageUrl: '/card-images/SV3/087-108_ป็อปโปะ.webp',
    attacks: [{ name: 'Gust', cost: { Colorless: 1 }, damage: 10 }],
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' as const },
    resistance: { type: 'Fighting', value: '-30' as const },
  },
  PidgeotEx: {
    cardCode: 'SV3-089',
    nameTh: 'พีเจียต ex',
    nameEn: 'Pidgeot ex',
    supertype: 'Pokemon' as const,
    subtypes: ['Stage 2', 'Stage2', 'ex'],
    evolvesFrom: 'Pidgeotto',
    energyType: 'Colorless',
    hp: 280,
    imageUrl: '/card-images/SV3/089-108_พีเจียตex.webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00006482.png',
    abilities: [
      {
        name: 'Quick Search',
        type: 'Ability',
        text: 'Once during your turn, you may search your deck for a card and put it into your hand. Then, shuffle your deck.',
        trigger: 'activated',
        isGlobalOncePerTurn: true,
      },
    ],
    attacks: [{ name: 'Blustery Wind', cost: { Colorless: 2 }, damage: 120 }],
    retreatCost: 0,
    weakness: { type: 'Lightning', value: 'x2' as const },
    resistance: { type: 'Fighting', value: '-30' as const },
  },
  RotomV: {
    cardCode: 'S11-037',
    nameTh: 'โรตอม V',
    nameEn: 'Rotom V',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic', 'V'],
    energyType: 'Lightning',
    hp: 190,
    imageUrl: '/card-images/S11/037-100_โรตอมV.webp',
    abilities: [
      {
        name: 'Instant Charge',
        type: 'Ability',
        text: 'Once during your turn, you may draw 3 cards. If you use this Ability, your turn ends.',
        trigger: 'activated',
        isGlobalOncePerTurn: true,
      },
    ],
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' as const },
  },

  // --- Miraidon Deck Pokemon ---
  MiraidonEx: {
    cardCode: 'SV1V-037',
    nameTh: 'มิไรดอน ex',
    nameEn: 'Miraidon ex',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic', 'ex'],
    energyType: 'Lightning',
    hp: 220,
    imageUrl: '/card-images/SV1V/037-078_มิไรดอนex.webp',
    abilities: [
      {
        name: 'Tandem Unit',
        type: 'Ability',
        text: 'Once during your turn, you may search your deck for up to 2 Basic Lightning Pokémon and put them onto your Bench.',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
      },
    ],
    attacks: [
      {
        name: 'Photon Kinesis',
        cost: { Lightning: 2, Colorless: 1 },
        damage: 60,
        text: 'This attack does 30 more damage for each Lightning Energy attached to all of your Pokémon.',
      },
    ],
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' as const },
  },
  RaikouV: {
    cardCode: 'SCE-049',
    nameTh: 'ไรโค V',
    nameEn: 'Raikou V',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic', 'V'],
    energyType: 'Lightning',
    hp: 200,
    imageUrl: '/card-images/SCE/049-173_ไรโคV.webp',
    abilities: [
      {
        name: 'Fleet-Footed',
        type: 'Ability',
        text: 'Once during your turn, if this Pokémon is in the Active Spot, you may draw a card.',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
      },
    ],
    attacks: [
      {
        name: 'Lightning Rondo',
        cost: { Lightning: 1, Colorless: 1 },
        damage: 20,
        text: 'This attack does 20 more damage for each Benched Pokémon (both yours and your opponent’s).',
      },
    ],
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' as const },
  },
  IronHandsEx: {
    cardCode: 'SV4M-027',
    nameTh: 'แขนเหล็ก ex',
    nameEn: 'Iron Hands ex',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic', 'ex', 'Future'],
    energyType: 'Lightning',
    hp: 230,
    imageUrl: '/card-images/SV4M/027-066_แขนเหล็กex.webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00006946.png',
    attacks: [
      {
        name: 'Amp You Very Much',
        cost: { Lightning: 3, Colorless: 1 },
        damage: 120,
        text: 'If your opponent’s Pokémon is Knocked Out by damage from this attack, take 1 more Prize card.',
      },
    ],
    retreatCost: 4,
    weakness: { type: 'Fighting', value: 'x2' as const },
  },

  // --- Roaring Moon Deck Pokemon ---
  RoaringMoonEx: {
    cardCode: 'SV4K-054',
    nameTh: 'จันทร์คำรน ex',
    nameEn: 'Roaring Moon ex',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic', 'ex', 'Ancient'],
    energyType: 'Darkness',
    hp: 230,
    imageUrl: '/card-images/SV4K/054-066_จันทร์คำรนex.webp',
    attacks: [
      {
        name: 'Frenzied Gouging',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 999, // Knock Out immediately, self 200 damage
        text: 'Knock Out your opponent’s Active Pokémon. If your opponent’s Active Pokémon is Knocked Out in this way, this Pokémon does 200 damage to itself.',
      },
      {
        name: 'Calamity Storm',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 100,
        text: 'You may discard a Stadium in play. If you do, this attack does 120 more damage.',
      },
    ],
    retreatCost: 2,
    weakness: { type: 'Grass', value: 'x2' as const },
  },
  BruteBonnet: {
    cardCode: 'SV4K-053',
    nameTh: 'เห็ดคลุ้มคลั่ง',
    nameEn: 'Brute Bonnet',
    supertype: 'Pokemon' as const,
    subtypes: ['Basic', 'Ancient'],
    energyType: 'Darkness',
    hp: 120,
    imageUrl: '/card-images/SV4K/053-066_เห็ดคลุ้มคลั่ง.webp',
    attacks: [{ name: 'Rampaging Hammer', cost: { Darkness: 2, Colorless: 1 }, damage: 120 }],
    retreatCost: 3,
    weakness: { type: 'Grass', value: 'x2' as const },
  },

  // --- Shared / Meta Trainers ---
  UltraBall: {
    cardCode: 'SVTL-012',
    nameTh: 'ไฮเปอร์บอล',
    nameEn: 'Ultra Ball',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/SVTL/012-021_ไฮเปอร์บอล.webp',
  },
  NestBall: {
    cardCode: 'SV1S-070',
    nameTh: 'เนสต์บอล',
    nameEn: 'Nest Ball',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/SV1S/070-078_เนสต์บอล.webp',
  },
  BuddyBuddyPoffin: {
    cardCode: 'SVTL-010',
    nameTh: 'โปฟฟินมิตรภาพ',
    nameEn: 'Buddy-Buddy Poffin',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/SVTL/010-021_โปฟฟินมิตรภาพ.webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00008685.png',
  },
  RareCandy: {
    cardCode: 'SVTL-013',
    nameTh: 'ลูกอมประหลาด',
    nameEn: 'Rare Candy',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/SVTL/013-021_ลูกอมประหลาด.webp',
  },
  SuperRod: {
    cardCode: 'SV2P-066',
    nameTh: 'คันเบ็ดชั้นยอด',
    nameEn: 'Super Rod',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/SV2P/066-071_คันเบ็ดชั้นยอด.webp',
  },
  Switch: {
    cardCode: 'SVTL-015',
    nameTh: 'สับเปลี่ยนโปเกมอน',
    nameEn: 'Switch',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/SVTL/015-021_สับเปลี่ยนโปเกมอน.webp',
  },
  ElectricGenerator: {
    cardCode: 'SV1V-069',
    nameTh: 'อิเล็กทริกเจนเนอเรเตอร์',
    nameEn: 'Electric Generator',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/SV1V/069-078_อิเล็กทริกเจนเนอเรเตอร์.webp',
  },
  DarkPatch: {
    cardCode: 'S12a-135',
    nameTh: 'ดาร์กแพตช์',
    nameEn: 'Dark Patch',
    supertype: 'Trainer' as const,
    subtypes: ['Item'],
    imageUrl: '/card-images/S12a/135-172_ดาร์กแพตช์.webp',
  },
  ProfessorsResearch: {
    cardCode: 'SVTL-019',
    nameTh: 'งานวิจัยของศาสตราจารย์',
    nameEn: "Professor's Research",
    supertype: 'Trainer' as const,
    subtypes: ['Supporter'],
    imageUrl: '/card-images/SVTL/019-021_งานวิจัยของศาสตราจารย์.webp',
  },
  BossOrders: {
    cardCode: 'SVTL-021',
    nameTh: 'คำสั่งของบอส',
    nameEn: "Boss's Orders",
    supertype: 'Trainer' as const,
    subtypes: ['Supporter'],
    imageUrl: '/card-images/SVTL/021-021_คำสั่งของบอส.webp',
  },
  Iono: {
    cardCode: 'SV2D-069',
    nameTh: 'นันจาโม',
    nameEn: 'Iono',
    supertype: 'Trainer' as const,
    subtypes: ['Supporter'],
    imageUrl: '/card-images/SV2D/069-071_นันจาโม.webp',
  },
  Arven: {
    cardCode: 'SV1V-076',
    nameTh: 'เปปเปอร์',
    nameEn: 'Arven',
    supertype: 'Trainer' as const,
    subtypes: ['Supporter'],
    imageUrl: '/card-images/SV1V/076-078_เปปเปอร์.webp',
  },
  ProfessorSada: {
    cardCode: 'SV4K-064',
    nameTh: 'จิตมุ่งมั่นของศาสตราจารย์โอลิม',
    nameEn: "Professor Sada's Vitality",
    supertype: 'Trainer' as const,
    subtypes: ['Supporter', 'Ancient'],
    imageUrl: '/card-images/SV4K/064-066_จิตมุ่งมั่นของศาสตราจารย์โอลิม.webp',
  },

  // --- Stadiums ---
  Artazon: {
    cardCode: 'SV1a-071',
    nameTh: 'โบウルทาวน์',
    nameEn: 'Artazon',
    supertype: 'Trainer' as const,
    subtypes: ['Stadium'],
    imageUrl: '/card-images/SV1a/071-073_โบウルทาวน์.webp',
  },
  CollapsedStadium: {
    cardCode: 'S9-099',
    nameTh: 'สนามกีฬาพังทลาย',
    nameEn: 'Collapsed Stadium',
    supertype: 'Trainer' as const,
    subtypes: ['Stadium'],
    imageUrl: '/card-images/S9/099-100_สนามกีฬาพังทลาย.webp',
  },

  // --- Energies ---
  BasicFireEnergy: {
    cardCode: 'SVDs-154',
    nameTh: 'พลังงานไฟพื้นฐาน',
    nameEn: 'Basic Fire Energy',
    supertype: 'Energy' as const,
    subtypes: ['Basic'],
    energyType: 'Fire',
    imageUrl: '/card-images/SVDs/FIR_พลังงานพื้นฐาน[ไฟ].webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00006810.png',
  },
  BasicLightningEnergy: {
    cardCode: 'SV1V-108',
    nameTh: 'พลังงานสายฟ้าพื้นฐาน',
    nameEn: 'Basic Lightning Energy',
    supertype: 'Energy' as const,
    subtypes: ['Basic'],
    energyType: 'Lightning',
    imageUrl: '/card-images/SV1V/108-078_พลังงานพื้นฐาน[สายฟ้า].webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00012649.png',
  },
  BasicDarknessEnergy: {
    cardCode: 'SV4K-095',
    nameTh: 'พลังงานความมืดพื้นฐาน',
    nameEn: 'Basic Darkness Energy',
    supertype: 'Energy' as const,
    subtypes: ['Basic'],
    energyType: 'Darkness',
    imageUrl: '/card-images/SV4K/095-066_พลังงานพื้นฐาน【ความมืด】.webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00012781.png',
  },
  BasicWaterEnergy: {
    cardCode: 'SVDs-155',
    nameTh: 'พลังงานน้ำพื้นฐาน',
    nameEn: 'Basic Water Energy',
    supertype: 'Energy' as const,
    subtypes: ['Basic'],
    energyType: 'Water',
    imageUrl: '/card-images/SVDs/WAT_พลังงานพื้นฐาน[น้ำ].webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00006811.png',
  },
  BasicGrassEnergy: {
    cardCode: 'SVDs-153',
    nameTh: 'พลังงานพืชพื้นฐาน',
    nameEn: 'Basic Grass Energy',
    supertype: 'Energy' as const,
    subtypes: ['Basic'],
    energyType: 'Grass',
    imageUrl: '/card-images/SVDs/GRA_พลังงานพื้นฐาน[หญ้า].webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00006809.png',
  },
  BasicPsychicEnergy: {
    cardCode: 'SVDs-156',
    nameTh: 'พลังงานพลังจิตพื้นฐาน',
    nameEn: 'Basic Psychic Energy',
    supertype: 'Energy' as const,
    subtypes: ['Basic'],
    energyType: 'Psychic',
    imageUrl: '/card-images/SVDs/PSY_พลังงานพื้นฐาน[พลังจิต].webp',
    officialImageUrl: 'https://asia.pokemon-card.com/th/card-img/th00006813.png',
  },
};

/**
 * Generate a complete, competitive 60-card Charizard ex Deck
 */
export function buildCharizardExDeck(): CardInstance[] {
  const deck: CardInstance[] = [];

  // Pokemon (17)
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.Charmander));
  for (let i = 0; i < 1; i++) deck.push(createCard(CardTemplates.Charmeleon));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.CharizardEx));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.Pidgey));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.PidgeotEx));
  for (let i = 0; i < 2; i++) deck.push(createCard(CardTemplates.RotomV));
  for (let i = 0; i < 1; i++) deck.push(createCard(CardTemplates.RaikouV));

  // Items (19)
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.RareCandy));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.UltraBall));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.BuddyBuddyPoffin));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.NestBall));
  for (let i = 0; i < 2; i++) deck.push(createCard(CardTemplates.SuperRod));
  for (let i = 0; i < 2; i++) deck.push(createCard(CardTemplates.Switch));

  // Stadiums (2)
  deck.push(createCard(CardTemplates.Artazon));
  deck.push(createCard(CardTemplates.CollapsedStadium));

  // Supporters (12)
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.Arven));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.Iono));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.BossOrders));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.ProfessorsResearch));

  // Energies (10)
  for (let i = 0; i < 7; i++) deck.push(createCard(CardTemplates.BasicFireEnergy));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.BasicDarknessEnergy));

  return deck;
}

/**
 * Generate a complete, competitive 60-card Miraidon ex Deck
 */
export function buildMiraidonExDeck(): CardInstance[] {
  const deck: CardInstance[] = [];

  // Pokemon (13)
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.MiraidonEx));
  for (let i = 0; i < 2; i++) deck.push(createCard(CardTemplates.RaikouV));
  for (let i = 0; i < 2; i++) deck.push(createCard(CardTemplates.IronHandsEx));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.Charmander)); // Basic fill
  for (let i = 0; i < 2; i++) deck.push(createCard(CardTemplates.RotomV));

  // Items (21)
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.ElectricGenerator));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.UltraBall));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.NestBall));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.Switch));
  for (let i = 0; i < 2; i++) deck.push(createCard(CardTemplates.SuperRod));
  for (let i = 0; i < 3; i++) deck.push(createCard(CardTemplates.BuddyBuddyPoffin));

  // Supporters (12)
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.ProfessorsResearch));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.BossOrders));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.Iono));

  // Energies (14)
  for (let i = 0; i < 14; i++) deck.push(createCard(CardTemplates.BasicLightningEnergy));

  return deck;
}

/**
 * Generate a complete, competitive 60-card Roaring Moon ex Deck
 */
export function buildRoaringMoonExDeck(): CardInstance[] {
  const deck: CardInstance[] = [];

  // Pokemon (12)
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.RoaringMoonEx));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.BruteBonnet));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.RotomV));

  // Items (24)
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.DarkPatch));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.UltraBall));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.NestBall));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.Switch));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.BuddyBuddyPoffin));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.SuperRod));

  // Supporters (12)
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.ProfessorSada));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.BossOrders));
  for (let i = 0; i < 4; i++) deck.push(createCard(CardTemplates.Iono));

  // Energies (12)
  for (let i = 0; i < 12; i++) deck.push(createCard(CardTemplates.BasicDarknessEnergy));

  return deck;
}

export type DeckPresetKey = 'charizard-ex' | 'miraidon-ex' | 'roaring-moon-ex';

export interface DeckPresetInfo {
  key: DeckPresetKey;
  nameEn: string;
  nameTh: string;
  archetype: string;
  coverImageUrl: string;
  buildDeck: () => CardInstance[];
}

export const PRESET_DECKS: DeckPresetInfo[] = [
  {
    key: 'charizard-ex',
    nameEn: 'Charizard ex (Tera Darkness)',
    nameTh: 'เด็ค ลิซาร์ดอน ex เทรัสตัลความมืด',
    archetype: 'Stage 2 Comeback Offense',
    coverImageUrl: '/card-images/SVTL/006-021_ลิซาร์ดอนex.webp',
    buildDeck: buildCharizardExDeck,
  },
  {
    key: 'miraidon-ex',
    nameEn: 'Miraidon ex (Electric Box)',
    nameTh: 'เด็ค มิไรดอน ex กล่องสายฟ้า',
    archetype: 'Basic Lightning Multi-Prize Speed',
    coverImageUrl: '/card-images/SV1V/037-078_มิไรดอนex.webp',
    buildDeck: buildMiraidonExDeck,
  },
  {
    key: 'roaring-moon-ex',
    nameEn: 'Roaring Moon ex (Ancient Darkness)',
    nameTh: 'เด็ค จันทร์คำรน ex โบราณ',
    archetype: 'Ancient Frenzy Instant-KO Beatdown',
    coverImageUrl: '/card-images/SV4K/054-066_จันทร์คำรนex.webp',
    buildDeck: buildRoaringMoonExDeck,
  },
];
