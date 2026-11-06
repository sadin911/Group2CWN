/**
 * StandardCardDatabase.ts
 * Centralized, authoritative database of authentic Pokémon TCG Standard format cards.
 * Provides canonical attacks with authentic costs, damage, and effects,
 * as well as authentic abilities categorized into activated vs triggered.
 */

import type { AttackCost, CardAttack, CardAbility } from '../types';

export interface CanonicalPokemon {
  nameEn: string;
  nameTh: string;
  stage: 'Basic' | 'Stage 1' | 'Stage 2';
  subtypes: string[]; // e.g. ['Basic', 'ex'], ['Stage 2', 'ex']
  energyType: string;
  hp: number;
  retreatCost: number;
  weakness?: { type: string; value: 'x2' };
  resistance?: { type: string; value: '-30' };
  evolvesFrom?: string;
  abilities?: CardAbility[];
  attacks: CardAttack[];
}

export interface CanonicalTrainer {
  nameEn: string;
  nameTh: string;
  subtype: 'Supporter' | 'Item' | 'Tool' | 'Stadium';
  isAceSpec?: boolean;
  text?: string;
}

export interface CanonicalEnergy {
  nameEn: string;
  nameTh: string;
  energyType: string;
  isSpecial: boolean;
  isAceSpec?: boolean;
  text?: string;
}

// ---------------------------------------------------------------------------
// 1. CANONICAL POKEMON REGISTRY
// ---------------------------------------------------------------------------
const POKEMON_REGISTRY: Record<string, CanonicalPokemon> = {
  // === DRAGAPULT LINE ===
  'dragapult ex': {
    nameEn: 'Dragapult ex',
    nameTh: 'โดราพัลท์ ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'ex', 'Tera'],
    energyType: 'Dragon',
    hp: 320,
    retreatCost: 1,
    evolvesFrom: 'Drakloak',
    attacks: [
      {
        name: 'Jet Headbutt',
        cost: { Colorless: 1 },
        damage: 70,
        text: 'Jet Headbutt',
      },
      {
        name: 'Phantom Dive',
        cost: { Fire: 1, Psychic: 1 },
        damage: 200,
        text: 'Put 6 damage counters on your opponent’s Benched Pokémon in any way you like.',
      },
    ],
  },
  drakloak: {
    nameEn: 'Drakloak',
    nameTh: 'โดรอนจิ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Dragon',
    hp: 90,
    retreatCost: 1,
    evolvesFrom: 'Dreepy',
    abilities: [
      {
        name: 'Recon Directive',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may look at the top 2 cards of your deck and put 1 of them into your hand. Put the other card on the bottom of your deck.',
      },
    ],
    attacks: [
      {
        name: 'Headbutt',
        cost: { Fire: 1, Psychic: 1 },
        damage: 70,
        text: 'Headbutt',
      },
    ],
  },
  dreepy: {
    nameEn: 'Dreepy',
    nameTh: 'โดราเมชิยะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Dragon',
    hp: 70,
    retreatCost: 1,
    attacks: [
      {
        name: 'Petty Grudge',
        cost: { Psychic: 1 },
        damage: 10,
        text: 'Petty Grudge',
      },
      {
        name: 'Bite',
        cost: { Fire: 1, Psychic: 1 },
        damage: 40,
        text: 'Bite',
      },
    ],
  },

  // === CHARIZARD LINE ===
  'charizard ex': {
    nameEn: 'Charizard ex',
    nameTh: 'ลิซาร์ดอน ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'ex', 'Tera'],
    energyType: 'Darkness',
    hp: 330,
    retreatCost: 2,
    weakness: { type: 'Grass', value: 'x2' },
    evolvesFrom: 'Charmeleon',
    abilities: [
      {
        name: 'Infernal Reign',
        type: 'Ability',
        trigger: 'on-evolution',
        isGlobalOncePerTurn: false,
        text: 'When this Pokémon evolves from your hand during your turn, you may search your deck for up to 3 Basic Fire Energy cards and attach them to your Pokémon in any way you like. Then, shuffle your deck.',
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
  },
  charmeleon: {
    nameEn: 'Charmeleon',
    nameTh: 'ลิซาร์โดะ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Fire',
    hp: 90,
    retreatCost: 2,
    weakness: { type: 'Water', value: 'x2' },
    evolvesFrom: 'Charmander',
    attacks: [
      {
        name: 'Combustion',
        cost: { Fire: 2 },
        damage: 50,
        text: 'Combustion',
      },
    ],
  },
  charmander: {
    nameEn: 'Charmander',
    nameTh: 'ฮิโตคาเงะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fire',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Water', value: 'x2' },
    attacks: [
      {
        name: 'Scratch',
        cost: { Colorless: 1 },
        damage: 10,
        text: 'Scratch',
      },
    ],
  },

  // === PIDGEOT LINE ===
  'pidgeot ex': {
    nameEn: 'Pidgeot ex',
    nameTh: 'พีเจียต ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'ex'],
    energyType: 'Colorless',
    hp: 280,
    retreatCost: 0,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Pidgeotto',
    abilities: [
      {
        name: 'Quick Search',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: true,
        text: 'Once during your turn, you may search your deck for a card and put it into your hand. Then, shuffle your deck. You can’t use more than 1 Quick Search Ability each turn.',
      },
    ],
    attacks: [
      {
        name: 'Blustery Wind',
        cost: { Colorless: 2 },
        damage: 120,
        text: 'You may discard a Stadium in play.',
      },
    ],
  },
  pidgeotto: {
    nameEn: 'Pidgeotto',
    nameTh: 'พีเจียน',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Colorless',
    hp: 80,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Pidgey',
    attacks: [
      {
        name: 'Flap',
        cost: { Colorless: 2 },
        damage: 40,
        text: 'Flap',
      },
    ],
  },
  pidgey: {
    nameEn: 'Pidgey',
    nameTh: 'ป็อปโปะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Gust',
        cost: { Colorless: 1 },
        damage: 10,
        text: 'Gust',
      },
    ],
  },

  // === RAGING BOLT EX ===
  'raging bolt ex': {
    nameEn: 'Raging Bolt ex',
    nameTh: 'ฟ้าคะนองคลั่ง ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex', 'Ancient'],
    energyType: 'Dragon',
    hp: 240,
    retreatCost: 3,
    attacks: [
      {
        name: 'Burst Roar',
        cost: { Colorless: 1 },
        damage: 0,
        text: 'Discard your hand and draw 6 cards.',
      },
      {
        name: 'Bellowing Thunder',
        cost: { Lightning: 1, Fighting: 1 },
        damage: 70,
        text: 'You may discard any amount of Basic Energy from your Pokémon. This attack does 70 damage for each card you discarded in this way.',
      },
    ],
  },

  // === TEAL MASK OGERPON EX ===
  'teal mask ogerpon ex': {
    nameEn: 'Teal Mask Ogerpon ex',
    nameTh: 'โอการ์ปอง หน้ากากสีทีล ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex', 'Tera'],
    energyType: 'Grass',
    hp: 210,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    abilities: [
      {
        name: 'Teal Dance',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may attach a Basic Grass Energy card from your hand to this Pokémon. If you do, draw a card.',
      },
    ],
    attacks: [
      {
        name: 'Myriad Leaf Shower',
        cost: { Grass: 3 },
        damage: 30,
        text: 'This attack does 30 more damage for each Energy attached to both Active Pokémon.',
      },
    ],
  },

  // === ROARING MOON EX ===
  'roaring moon ex': {
    nameEn: 'Roaring Moon ex',
    nameTh: 'จันทร์คำราม ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex', 'Ancient'],
    energyType: 'Darkness',
    hp: 230,
    retreatCost: 2,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Frenzied Gouging',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 0,
        text: 'Knock Out your opponent’s Active Pokémon. If your opponent’s Active Pokémon is Knocked Out in this way, this Pokémon does 200 damage to itself.',
      },
      {
        name: 'Calamity Storm',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 100,
        text: 'You may discard a Stadium in play. If you do, this attack does 120 more damage.',
      },
    ],
  },

  // === IRON HANDS EX ===
  'iron hands ex': {
    nameEn: 'Iron Hands ex',
    nameTh: 'มือเหล็ก ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex', 'Future'],
    energyType: 'Lightning',
    hp: 230,
    retreatCost: 4,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Arm Press',
        cost: { Lightning: 2, Colorless: 1 },
        damage: 160,
        text: 'Arm Press',
      },
      {
        name: 'Amp You Very Much',
        cost: { Lightning: 1, Colorless: 3 },
        damage: 120,
        text: 'If your opponent’s Pokémon is Knocked Out by damage from this attack, take 1 more Prize card.',
      },
    ],
  },

  // === MIRAIDON EX ===
  'miraidon ex': {
    nameEn: 'Miraidon ex',
    nameTh: 'มิไรดอน ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Lightning',
    hp: 220,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    abilities: [
      {
        name: 'Tandem Unit',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may search your deck for up to 2 Basic Lightning Pokémon and put them onto your Bench. Then, shuffle your deck.',
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
  },

  // === RAIKOU V ===
  'raikou v': {
    nameEn: 'Raikou V',
    nameTh: 'ไรโค V',
    stage: 'Basic',
    subtypes: ['Basic', 'V'],
    energyType: 'Lightning',
    hp: 200,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    abilities: [
      {
        name: 'Fleet-Footed',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, if this Pokémon is in the Active Spot, you may draw a card.',
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
  },

  // === SUICUNE V ===
  'suicune v': {
    nameEn: 'Suicune V',
    nameTh: 'ซุยคุน V',
    stage: 'Basic',
    subtypes: ['Basic', 'V'],
    energyType: 'Water',
    hp: 210,
    retreatCost: 2,
    weakness: { type: 'Lightning', value: 'x2' },
    abilities: [
      {
        name: 'Fleet-Footed',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, if this Pokémon is in the Active Spot, you may draw a card.',
      },
    ],
    attacks: [
      {
        name: 'Blizzard Rondo',
        cost: { Water: 1, Colorless: 1 },
        damage: 20,
        text: 'This attack does 20 more damage for each Benched Pokémon (both yours and your opponent’s).',
      },
    ],
  },

  // === RADIANT GRENINJA ===
  'radiant greninja': {
    nameEn: 'Radiant Greninja',
    nameTh: 'เก็คโคกะจรัสแสง',
    stage: 'Basic',
    subtypes: ['Basic', 'Radiant'],
    energyType: 'Water',
    hp: 130,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    abilities: [
      {
        name: 'Concealed Cards',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may discard an Energy card from your hand. If you do, draw 2 cards.',
      },
    ],
    attacks: [
      {
        name: 'Moonlight Shuriken',
        cost: { Water: 2, Colorless: 1 },
        damage: 90,
        text: 'Discard 2 Energy from this Pokémon. This attack does 90 damage to 2 of your opponent’s Pokémon.',
      },
    ],
  },

  // === GRENINJA EX ===
  'greninja ex': {
    nameEn: 'Greninja ex',
    nameTh: 'เก็คโคกะ ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'ex', 'Tera'],
    energyType: 'Fighting',
    hp: 300,
    retreatCost: 1,
    weakness: { type: 'Psychic', value: 'x2' },
    evolvesFrom: 'Frogadier',
    attacks: [
      {
        name: 'Shinobi Slash',
        cost: { Water: 1 },
        damage: 170,
        text: 'Search your deck for any 1 card and put it into your hand. Then, shuffle your deck.',
      },
      {
        name: 'Mirage Barrage',
        cost: { Water: 1, Colorless: 2 },
        damage: 120,
        text: 'Discard 2 Energy from this Pokémon. This attack does 120 damage to 2 of your opponent’s Pokémon.',
      },
    ],
  },
  frogadier: {
    nameEn: 'Frogadier',
    nameTh: 'เกโคกาชิระ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Water',
    hp: 90,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    evolvesFrom: 'Froakie',
    attacks: [
      {
        name: 'Water Drip',
        cost: { Water: 1 },
        damage: 20,
        text: 'Water Drip',
      },
    ],
  },
  froakie: {
    nameEn: 'Froakie',
    nameTh: 'เคโรมัตซึ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Water',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    attacks: [
      {
        name: 'Flock',
        cost: { Water: 1 },
        damage: 10,
        text: 'Flock',
      },
    ],
  },

  // === FEZANDIPITI EX ===
  'fezandipiti ex': {
    nameEn: 'Fezandipiti ex',
    nameTh: 'คิจิคิกิสึ ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Psychic',
    hp: 210,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    abilities: [
      {
        name: 'Flip the Script',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: true,
        text: 'Once during your turn, if any of your Pokémon were Knocked Out during your opponent’s last turn, you may draw 3 cards. You can’t use more than 1 Flip the Script Ability each turn.',
      },
    ],
    attacks: [
      {
        name: 'Cruel Arrow',
        cost: { Colorless: 3 },
        damage: 100,
        text: 'This attack does 100 damage to 1 of your opponent’s Pokémon. (Don’t apply Weakness and Resistance for Benched Pokémon.)',
      },
    ],
  },

  // === MUNKIDORI ===
  munkidori: {
    nameEn: 'Munkidori',
    nameTh: 'มาชิมาชิระ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 110,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    abilities: [
      {
        name: 'Adrena-Brain',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, if this Pokémon has any Darkness Energy attached to it, you may move up to 3 damage counters from 1 of your Pokémon to 1 of your opponent’s Pokémon.',
      },
    ],
    attacks: [
      {
        name: 'Mind Bend',
        cost: { Psychic: 1, Colorless: 1 },
        damage: 60,
        text: 'Your opponent’s Active Pokémon is now Confused.',
      },
    ],
  },

  // === DUDUNSPARCE LINE ===
  dudunsparce: {
    nameEn: 'Dudunsparce',
    nameTh: 'โนโกก็อจจิ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Colorless',
    hp: 140,
    retreatCost: 3,
    weakness: { type: 'Fighting', value: 'x2' },
    evolvesFrom: 'Dunsparce',
    abilities: [
      {
        name: 'Run Away Draw',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may draw 3 cards. If you do, shuffle this Pokémon and all attached cards into your deck.',
      },
    ],
    attacks: [
      {
        name: 'Tail Smack',
        cost: { Colorless: 3 },
        damage: 100,
        text: 'Tail Smack',
      },
    ],
  },
  'dudunsparce ex': {
    nameEn: 'Dudunsparce ex',
    nameTh: 'โนโกจิดัช ex',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1', 'ex'],
    energyType: 'Colorless',
    hp: 270,
    retreatCost: 3,
    weakness: { type: 'Fighting', value: 'x2' },
    abilities: [
      {
        name: 'Run Away Draw',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, draw 3 cards. Then, shuffle this Pokémon and attached cards into deck.',
      },
    ],
    attacks: [
      {
        name: 'Tail Smack',
        cost: { Colorless: 3 },
        damage: 100,
        text: 'Tail Smack',
      },
    ],
  },
  dunsparce: {
    nameEn: 'Dunsparce',
    nameTh: 'โนก็อจจิ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Dig',
        cost: { Colorless: 1 },
        damage: 30,
        text: 'Dig',
      },
    ],
  },

  // === MEW EX ===
  'mew ex': {
    nameEn: 'Mew ex',
    nameTh: 'มิว ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Psychic',
    hp: 180,
    retreatCost: 0,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    abilities: [
      {
        name: 'Restart',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may draw cards until you have 3 cards in your hand.',
      },
    ],
    attacks: [
      {
        name: 'Genome Hacking',
        cost: { Colorless: 3 },
        damage: 0,
        text: 'Choose 1 of your opponent’s Active Pokémon’s attacks and use it as this attack.',
      },
    ],
  },

  // === ROTOM V ===
  'rotom v': {
    nameEn: 'Rotom V',
    nameTh: 'โรตอม V',
    stage: 'Basic',
    subtypes: ['Basic', 'V'],
    energyType: 'Lightning',
    hp: 190,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    abilities: [
      {
        name: 'Instant Charge',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: true,
        text: 'Once during your turn, you may draw 3 cards. If you use this Ability, your turn ends.',
      },
    ],
    attacks: [
      {
        name: 'Scrap Short',
        cost: { Lightning: 2 },
        damage: 40,
        text: 'Put up to 2 Pokémon Tool cards from your discard pile into the Lost Zone.',
      },
    ],
  },

  // === DUSKNOIR LINE ===
  dusknoir: {
    nameEn: 'Dusknoir',
    nameTh: 'โยนัวร์',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2'],
    energyType: 'Psychic',
    hp: 160,
    retreatCost: 3,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Dusclops',
    abilities: [
      {
        name: 'Cursed Blast',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may put 13 damage counters on 1 of your opponent’s Pokémon. If you do, this Pokémon is Knocked Out.',
      },
    ],
    attacks: [
      {
        name: 'Shadow Bind',
        cost: { Psychic: 3 },
        damage: 150,
        text: 'During your opponent’s next turn, the Defending Pokémon can’t retreat.',
      },
    ],
  },
  dusclops: {
    nameEn: 'Dusclops',
    nameTh: 'ซามาโยรุ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Psychic',
    hp: 90,
    retreatCost: 2,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Duskull',
    abilities: [
      {
        name: 'Cursed Blast',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may put 5 damage counters on 1 of your opponent’s Pokémon. If you do, this Pokémon is Knocked Out.',
      },
    ],
    attacks: [
      {
        name: 'Will-O-Wisp',
        cost: { Psychic: 2 },
        damage: 50,
        text: 'Will-O-Wisp',
      },
    ],
  },
  duskull: {
    nameEn: 'Duskull',
    nameTh: 'โยมาวารุ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Collect',
        cost: { Psychic: 1 },
        damage: 0,
        text: 'Draw a card.',
      },
    ],
  },

  // === BUDEW ===
  budew: {
    nameEn: 'Budew',
    nameTh: 'ซึโบมี',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 30,
    retreatCost: 0,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Errand Running',
        cost: { Free: 0 },
        damage: 0,
        text: 'Search your deck for an Item card, reveal it, and put it into your hand. Then, shuffle your deck.',
      },
    ],
  },

  // === MEOWTH EX ===
  'meowth ex': {
    nameEn: 'Meowth ex',
    nameTh: 'เนียส ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Colorless',
    hp: 160,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Pay Day',
        cost: { Colorless: 1 },
        damage: 30,
        text: 'Draw a card.',
      },
      {
        name: 'Slash',
        cost: { Colorless: 3 },
        damage: 130,
        text: 'Slash',
      },
    ],
  },

  // === PECHARUNT EX ===
  'pecharunt ex': {
    nameEn: 'Pecharunt ex',
    nameTh: 'โมโมวาโร่ ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Darkness',
    hp: 190,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    abilities: [
      {
        name: 'Subjugating Chains',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may switch 1 of your Benched Darkness Pokémon (except any Pecharunt ex) to the Active Spot. If you do, that Pokémon is now Poisoned.',
      },
    ],
    attacks: [
      {
        name: 'Irritating Burst',
        cost: { Darkness: 2 },
        damage: 60,
        text: 'This attack does 60 damage for each Prize card your opponent has taken.',
      },
    ],
  },

  // === TATSUSGIRI ===
  tatsugiri: {
    nameEn: 'Tatsugiri',
    nameTh: 'ชาริทัตสึ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Dragon',
    hp: 70,
    retreatCost: 1,
    abilities: [
      {
        name: 'Attract Customer',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, if this Pokémon is in the Active Spot, you may look at the top 6 cards of your deck, reveal a Supporter card you find there, and put it into your hand.',
      },
    ],
    attacks: [
      {
        name: 'Surf',
        cost: { Fire: 1, Water: 1 },
        damage: 50,
        text: 'Surf',
      },
    ],
  },

  // === BIBAREL LINE ===
  bibarel: {
    nameEn: 'Bibarel',
    nameTh: 'บิดัล',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Colorless',
    hp: 120,
    retreatCost: 2,
    weakness: { type: 'Fighting', value: 'x2' },
    evolvesFrom: 'Bidoof',
    abilities: [
      {
        name: 'Industrious Incisors',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may draw cards until you have 5 cards in your hand.',
      },
    ],
    attacks: [
      {
        name: 'Tail Smash',
        cost: { Colorless: 3 },
        damage: 100,
        text: 'Flip a coin. If tails, this attack does nothing.',
      },
    ],
  },
  bidoof: {
    nameEn: 'Bidoof',
    nameTh: 'บิปปะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Rollout',
        cost: { Colorless: 1 },
        damage: 20,
        text: 'Rollout',
      },
    ],
  },

  // === METANG LINE ===
  metang: {
    nameEn: 'Metang',
    nameTh: 'เมแทงก์',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Metal',
    hp: 100,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    evolvesFrom: 'Beldum',
    abilities: [
      {
        name: 'Metal Maker',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may look at the top 4 cards of your deck and attach any number of Basic Metal Energy cards you find there to your Pokémon in any way you like. Put the other cards on the bottom of your deck in any order.',
      },
    ],
    attacks: [
      {
        name: 'Beam',
        cost: { Metal: 2, Colorless: 1 },
        damage: 60,
        text: 'Beam',
      },
    ],
  },
  beldum: {
    nameEn: 'Beldum',
    nameTh: 'ดันบัล',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Metal',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    attacks: [
      {
        name: 'Dig Claws',
        cost: { Metal: 1 },
        damage: 20,
        text: 'Dig Claws',
      },
    ],
  },
  metagross: {
    nameEn: 'Metagross',
    nameTh: 'เมทากรอส',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2'],
    energyType: 'Metal',
    hp: 170,
    retreatCost: 3,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    evolvesFrom: 'Metang',
    attacks: [
      {
        name: 'Meteor Mash',
        cost: { Metal: 2 },
        damage: 120,
        text: 'During your next turn, this Pokémon’s Meteor Mash attack does 60 more damage.',
      },
      {
        name: 'Luster Blast',
        cost: { Metal: 3, Colorless: 1 },
        damage: 200,
        text: 'Discard 2 Energy from this Pokémon.',
      },
    ],
  },

  // === NOCTOWL LINE ===
  noctowl: {
    nameEn: 'Noctowl',
    nameTh: 'โยรุโนะซึคุ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Colorless',
    hp: 100,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Hoothoot',
    abilities: [
      {
        name: 'Jeweled Hunt',
        type: 'Ability',
        trigger: 'on-evolution',
        isGlobalOncePerTurn: false,
        text: 'When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, if you have any Tera Pokémon in play, you may search your deck for up to 2 Trainer cards, reveal them, and put them into your hand.',
      },
    ],
    attacks: [
      {
        name: 'Speed Wing',
        cost: { Colorless: 2 },
        damage: 60,
        text: 'Speed Wing',
      },
    ],
  },
  hoothoot: {
    nameEn: 'Hoothoot',
    nameTh: 'โฮโฮ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 80,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Silent Wing',
        cost: { Colorless: 1 },
        damage: 20,
        text: 'Your opponent reveals their hand.',
      },
    ],
  },

  // === HYDRAPPLE EX LINE ===
  'hydrapple ex': {
    nameEn: 'Hydrapple ex',
    nameTh: 'คามิสึโอโรจิ ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'ex'],
    energyType: 'Grass',
    hp: 330,
    retreatCost: 3,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Dipplin',
    abilities: [
      {
        name: 'Ripening Charge',
        type: 'Ability',
        trigger: 'activated',
        isGlobalOncePerTurn: false,
        text: 'Once during your turn, you may attach a Basic Grass Energy card from your hand to 1 of your Pokémon. If you attached Energy to a Pokémon in this way, heal 30 damage from that Pokémon.',
      },
    ],
    attacks: [
      {
        name: 'Syrup Storm',
        cost: { Colorless: 2 },
        damage: 30,
        text: 'This attack does 30 more damage for each Grass Energy attached to all of your Pokémon.',
      },
    ],
  },
  dipplin: {
    nameEn: 'Dipplin',
    nameTh: 'คามิชชู',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 90,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Applin',
    attacks: [
      {
        name: 'Syrup Bomb',
        cost: { Grass: 1 },
        damage: 20,
        text: 'Syrup Bomb',
      },
    ],
  },
  applin: {
    nameEn: 'Applin',
    nameTh: 'คาจิชชู',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 40,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Find a Friend',
        cost: { Grass: 1 },
        damage: 0,
        text: 'Search your deck for a Pokémon.',
      },
    ],
  },

  // === CYNTHIA'S GARCHOMP EX LINE ===
  "cynthia's garchomp ex": {
    nameEn: "Cynthia's Garchomp ex",
    nameTh: 'กาเบรียสex <ของชิโรนะ>',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'ex'],
    energyType: 'Fighting',
    hp: 330,
    retreatCost: 0,
    weakness: { type: 'Grass', value: 'x2' },
    evolvesFrom: "Cynthia's Gabite",
    attacks: [
      {
        name: 'Dragon Dive',
        cost: { Fighting: 1, Colorless: 1 },
        damage: 260,
        text: 'Discard 2 Energy from this Pokémon. This attack does 50 damage to 1 of your opponent’s Benched Pokémon.',
      },
    ],
  },
  "cynthia's gabite": {
    nameEn: "Cynthia's Gabite",
    nameTh: 'กาไบต์ <ของชิโรนะ>',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Fighting',
    hp: 100,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    evolvesFrom: "Cynthia's Gible",
    attacks: [
      {
        name: 'Slash',
        cost: { Fighting: 1 },
        damage: 50,
        text: 'Slash',
      },
    ],
  },
  "cynthia's gible": {
    nameEn: "Cynthia's Gible",
    nameTh: 'ฟุคามารุ <ของชิโรนะ>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fighting',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Bite',
        cost: { Fighting: 1 },
        damage: 20,
        text: 'Bite',
      },
    ],
  },

  // === N'S ZOROARK EX LINE ===
  "n's zoroark ex": {
    nameEn: "N's Zoroark ex",
    nameTh: 'โซโรอาร์คex <ของ N>',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1', 'ex'],
    energyType: 'Darkness',
    hp: 280,
    retreatCost: 2,
    weakness: { type: 'Grass', value: 'x2' },
    evolvesFrom: "N's Zorua",
    attacks: [
      {
        name: 'Night Burst',
        cost: { Darkness: 2 },
        damage: 130,
        text: 'This attack does 20 more damage for each N’s Pokémon in your discard pile.',
      },
    ],
  },
  "n's zorua": {
    nameEn: "N's Zorua",
    nameTh: 'โซรัว <ของ N>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Darkness',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Scratch',
        cost: { Darkness: 1 },
        damage: 20,
        text: 'Scratch',
      },
    ],
  },

  // === FROSLASS LINE ===
  froslass: {
    nameEn: 'Froslass',
    nameTh: 'ยูกิเมโนโกะ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Water',
    hp: 90,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    evolvesFrom: 'Snorunt',
    abilities: [
      {
        name: 'Freezing Shroud',
        type: 'Ability',
        trigger: 'checkup',
        isGlobalOncePerTurn: false,
        text: 'During Pokémon Checkup, put 1 damage counter on each Pokémon with an Ability (both yours and your opponent’s), except any Froslass.',
      },
    ],
    attacks: [
      {
        name: 'Frost Smash',
        cost: { Water: 1, Colorless: 1 },
        damage: 60,
        text: 'Frost Smash',
      },
    ],
  },
  snorunt: {
    nameEn: 'Snorunt',
    nameTh: 'ยูกิวาราชิ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Water',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    attacks: [
      {
        name: 'Powder Snow',
        cost: { Water: 1 },
        damage: 10,
        text: 'Your opponent’s Active Pokémon is now Asleep.',
      },
    ],
  },

  // === ALAKAZAM LINE ===
  alakazam: {
    nameEn: 'Alakazam',
    nameTh: 'ฟูดิน',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2'],
    energyType: 'Psychic',
    hp: 140,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Kadabra',
    attacks: [
      {
        name: 'Mind Jack',
        cost: { Psychic: 2 },
        damage: 90,
        text: 'This attack does 30 more damage for each of your opponent’s Benched Pokémon.',
      },
      {
        name: 'Dimensional Hand',
        cost: { Psychic: 2, Colorless: 1 },
        damage: 120,
        text: 'This attack can be used even if this Pokémon is on the Bench.',
      },
    ],
  },
  kadabra: {
    nameEn: 'Kadabra',
    nameTh: 'ยุนเกเรอร์',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Psychic',
    hp: 80,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Abra',
    attacks: [
      {
        name: 'Teleportation',
        cost: { Psychic: 1 },
        damage: 30,
        text: 'Switch this Pokémon with 1 of your Benched Pokémon.',
      },
    ],
  },
  abra: {
    nameEn: 'Abra',
    nameTh: 'เคซี',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 50,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Psyshot',
        cost: { Psychic: 1 },
        damage: 20,
        text: 'Psyshot',
      },
    ],
  },

  // === EXTENDED STANDARD COMPETITIVE META POKEMON ===
  'bloodmoon ursaluna ex': {
    nameEn: 'Bloodmoon Ursaluna ex',
    nameTh: 'กาจิกุมะ พระจันทร์สีเลือด ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Colorless',
    hp: 260,
    retreatCost: 3,
    weakness: { type: 'Fighting', value: 'x2' },
    abilities: [
      {
        name: 'Seasoned Skill',
        type: 'Ability',
        trigger: 'passive',
        text: 'Blood Moon costs Colorless less for each Prize card your opponent has taken.',
      },
    ],
    attacks: [
      {
        name: 'Blood Moon',
        cost: { Colorless: 5 },
        damage: 240,
        text: 'During your next turn, this Pokémon can\'t attack.',
      },
    ],
  },
  'latias ex': {
    nameEn: 'Latias ex',
    nameTh: 'ลาทิอาส ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Psychic',
    hp: 210,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    abilities: [
      {
        name: 'Skylight',
        type: 'Ability',
        trigger: 'passive',
        text: 'Your Basic Pokémon in play have no Retreat Cost.',
      },
    ],
    attacks: [
      {
        name: 'Infinity Blade',
        cost: { Psychic: 1, Colorless: 2 },
        damage: 200,
        text: 'During your next turn, this Pokémon can\'t attack.',
      },
    ],
  },
  'lillie\'s clefairy ex': {
    nameEn: 'Lillie\'s Clefairy ex',
    nameTh: 'ปิปปี ex <ของลิเลีย>',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Psychic',
    hp: 190,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    abilities: [
      {
        name: 'Fairy Zone',
        type: 'Ability',
        trigger: 'passive',
        text: 'All of your Lillie\'s Pokémon take 30 less damage from attacks.',
      },
    ],
    attacks: [
      {
        name: 'Full Moon Miracle',
        cost: { Psychic: 1, Colorless: 2 },
        damage: 60,
        text: 'Heal 30 damage from each of your Pokémon.',
      },
    ],
  },
  'wellspring mask ogerpon ex': {
    nameEn: 'Wellspring Mask Ogerpon ex',
    nameTh: 'โอการ์ปอง หน้ากากบ่อน้ำ ex',
    stage: 'Basic',
    subtypes: ['Basic', 'Tera', 'ex'],
    energyType: 'Water',
    hp: 210,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    attacks: [
      {
        name: 'Sob',
        cost: { Water: 1 },
        damage: 20,
        text: 'During your opponent\'s next turn, the Defending Pokémon can\'t retreat.',
      },
      {
        name: 'Torrential Pump',
        cost: { Water: 1, Colorless: 2 },
        damage: 100,
        text: 'You may shuffle 3 Energy from this Pokémon into your deck to do 120 damage to 1 of your opponent\'s Benched Pokémon.',
      },
    ],
  },
  'iron leaves ex': {
    nameEn: 'Iron Leaves ex',
    nameTh: 'ใบด่างเหล็ก ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex', 'Future'],
    energyType: 'Grass',
    hp: 220,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    abilities: [
      {
        name: 'Rapid Vernier',
        type: 'Ability',
        trigger: 'on-play',
        text: 'When you play this Pokémon onto Bench, you may switch with Active and move Energy to it.',
      },
    ],
    attacks: [
      {
        name: 'Prismatic Edge',
        cost: { Grass: 2, Colorless: 1 },
        damage: 180,
        text: 'During your next turn, this Pokémon can\'t attack.',
      },
    ],
  },
  'iron crown ex': {
    nameEn: 'Iron Crown ex',
    nameTh: 'หัวเหล็ก ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex', 'Future'],
    energyType: 'Psychic',
    hp: 220,
    retreatCost: 2,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    abilities: [
      {
        name: 'Cobalt Command',
        type: 'Ability',
        trigger: 'passive',
        text: 'Attacks used by your Future Pokémon, except Iron Crown ex, do 20 more damage to Active.',
      },
    ],
    attacks: [
      {
        name: 'Twin Shotel',
        cost: { Psychic: 1, Colorless: 2 },
        damage: 50,
        text: 'This attack does 50 damage to 2 of your opponent\'s Pokémon, bypassing Weakness & Resistance.',
      },
    ],
  },
  'flutter mane': {
    nameEn: 'Flutter Mane',
    nameTh: 'เกศากระพือ',
    stage: 'Basic',
    subtypes: ['Basic', 'Ancient'],
    energyType: 'Psychic',
    hp: 90,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    abilities: [
      {
        name: 'Midnight Fluttering',
        type: 'Ability',
        trigger: 'passive',
        text: 'As long as this Pokémon is in Active Spot, your opponent\'s Active Pokémon has no Abilities.',
      },
    ],
    attacks: [
      {
        name: 'Hex Hurl',
        cost: { Colorless: 3 },
        damage: 90,
        text: 'Put 2 damage counters on your opponent\'s Benched Pokémon in any way you like.',
      },
    ],
  },
  'comfey': {
    nameEn: 'Comfey',
    nameTh: 'คิววะวา',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    abilities: [
      {
        name: 'Flower Selecting',
        type: 'Ability',
        trigger: 'activated',
        text: 'Once during your turn, if in Active Spot, look at top 2 cards of deck, take 1, put other in Lost Zone.',
      },
    ],
    attacks: [
      {
        name: 'Spinning Attack',
        cost: { Psychic: 1, Colorless: 1 },
        damage: 30,
        text: 'Spinning Attack',
      },
    ],
  },
  'brute bonnet': {
    nameEn: 'Brute Bonnet',
    nameTh: 'เห็ดคลุ้มคลั่ง',
    stage: 'Basic',
    subtypes: ['Basic', 'Ancient'],
    energyType: 'Darkness',
    hp: 120,
    retreatCost: 3,
    weakness: { type: 'Grass', value: 'x2' },
    abilities: [
      {
        name: 'Toxic Powder',
        type: 'Ability',
        trigger: 'activated',
        text: 'Once during your turn, if an Ancient Booster is attached, both Active Pokémon are now Poisoned.',
      },
    ],
    attacks: [
      {
        name: 'Rampaging Hammer',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 120,
        text: 'During your next turn, this Pokémon can\'t attack.',
      },
    ],
  },
  'koraidon ex': {
    nameEn: 'Koraidon ex',
    nameTh: 'โคไรดอน ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex', 'Ancient'],
    energyType: 'Fighting',
    hp: 230,
    retreatCost: 2,
    weakness: { type: 'Psychic', value: 'x2' },
    attacks: [
      {
        name: 'Splitting Beam',
        cost: { Fighting: 1 },
        damage: 30,
        text: 'This attack does 30 damage to 2 of your opponent\'s Benched Pokémon.',
      },
      {
        name: 'Kaiser Tackle',
        cost: { Fighting: 2, Colorless: 1 },
        damage: 280,
        text: 'This Pokémon also does 60 damage to itself.',
      },
    ],
  },
  'bouffalant': {
    nameEn: 'Bouffalant',
    nameTh: 'บัฟฟรอน',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 100,
    retreatCost: 2,
    weakness: { type: 'Fighting', value: 'x2' },
    abilities: [
      {
        name: 'Curly Wall',
        type: 'Ability',
        trigger: 'passive',
        text: 'If you have another Bouffalant in play, your Basic Colorless Pokémon take 60 less damage from attacks.',
      },
    ],
    attacks: [
      {
        name: 'Boundless Power',
        cost: { Colorless: 3 },
        damage: 130,
        text: 'During your next turn, this Pokémon can\'t attack.',
      },
    ],
  },
  'thwackey': {
    nameEn: 'Thwackey',
    nameTh: 'บาจินคี',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 90,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Grookey',
    abilities: [
      {
        name: 'Boom Boom Groove',
        type: 'Ability',
        trigger: 'activated',
        text: 'Once during your turn, if your Active has Festival Lead, search deck for any 1 card.',
      },
    ],
    attacks: [
      {
        name: 'Beat',
        cost: { Grass: 2 },
        damage: 50,
        text: 'Beat',
      },
    ],
  },
  'grookey': {
    nameEn: 'Grookey',
    nameTh: 'ซารุโนริ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Branch Poke',
        cost: { Grass: 1 },
        damage: 10,
        text: 'Branch Poke',
      },
    ],
  },
  'rabsca': {
    nameEn: 'Rabsca',
    nameTh: 'เบราคาสุ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Rellor',
    abilities: [
      {
        name: 'Spherical Shield',
        type: 'Ability',
        trigger: 'passive',
        text: 'Prevent all damage and effects of attacks done to your Benched Pokémon by opponent\'s attacks.',
      },
    ],
    attacks: [
      {
        name: 'Psychic',
        cost: { Grass: 1 },
        damage: 20,
        text: 'Psychic',
      },
    ],
  },
  'rellor': {
    nameEn: 'Rellor',
    nameTh: 'ชิกาโรโค',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 40,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Rollout',
        cost: { Grass: 1 },
        damage: 10,
        text: 'Rollout',
      },
    ],
  },
  'chi-yu': {
    nameEn: 'Chi-Yu',
    nameTh: 'อวี้อวี๋',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fire',
    hp: 110,
    retreatCost: 1,
    weakness: { type: 'Water', value: 'x2' },
    attacks: [
      {
        name: 'Jealousy',
        cost: { Fire: 1 },
        damage: 0,
        text: 'Discard the top card of your opponent\'s deck.',
      },
      {
        name: 'Flame Surge',
        cost: { Fire: 2 },
        damage: 100,
        text: 'Attach a Basic Fire Energy from your deck to up to 2 Benched Pokémon.',
      },
    ],
  },
  'kyurem': {
    nameEn: 'Kyurem',
    nameTh: 'คิวเรม',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Dragon',
    hp: 130,
    retreatCost: 2,
    abilities: [
      {
        name: 'Plasma Cancellation',
        type: 'Ability',
        trigger: 'passive',
        text: 'If your opponent has Colress in discard, Trifrost has no attack cost.',
      },
    ],
    attacks: [
      {
        name: 'Trifrost',
        cost: { Water: 2, Metal: 2, Colorless: 1 },
        damage: 110,
        text: 'Discard all Energy from this Pokémon. Does 110 damage to 3 of opponent\'s Pokémon.',
      },
    ],
  },
  'yveltal': {
    nameEn: 'Yveltal',
    nameTh: 'อีเวลทอล',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Darkness',
    hp: 120,
    retreatCost: 2,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Corrosive Suction',
        cost: { Darkness: 1 },
        damage: 30,
        text: 'Heal 30 damage from this Pokémon.',
      },
      {
        name: 'Dark Cutter',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 100,
        text: 'Dark Cutter',
      },
    ],
  },
  'mega kangaskhan ex': {
    nameEn: 'Mega Kangaskhan ex',
    nameTh: 'เมก้าการูรา ex',
    stage: 'Basic',
    subtypes: ['Basic', 'MEGA', 'ex'],
    energyType: 'Colorless',
    hp: 300,
    retreatCost: 3,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Comet Punch',
        cost: { Colorless: 2 },
        damage: 60,
        text: 'Comet Punch',
      },
      {
        name: 'Magnum Punch',
        cost: { Colorless: 3 },
        damage: 240,
        text: 'This Pokémon does 30 damage to itself.',
      },
    ],
  },
  'mega lucario ex': {
    nameEn: 'Mega Lucario ex',
    nameTh: 'เมก้าลูคาริโอ ex',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1', 'MEGA', 'ex'],
    energyType: 'Fighting',
    hp: 330,
    retreatCost: 2,
    weakness: { type: 'Psychic', value: 'x2' },
    evolvesFrom: 'Riolu',
    attacks: [
      {
        name: 'Aura Smash',
        cost: { Fighting: 2, Colorless: 1 },
        damage: 270,
        text: 'Discard 1 Energy from this Pokémon.',
      },
    ],
  },
  'riolu': {
    nameEn: 'Riolu',
    nameTh: 'ริโอลุ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fighting',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Psychic', value: 'x2' },
    attacks: [
      {
        name: 'Punch',
        cost: { Fighting: 1 },
        damage: 20,
        text: 'Punch',
      },
    ],
  },
  'mega lopunny ex': {
    nameEn: 'Mega Lopunny ex',
    nameTh: 'เมก้ามิมิล็อป ex',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1', 'MEGA', 'ex'],
    energyType: 'Colorless',
    hp: 280,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    evolvesFrom: 'Buneary',
    attacks: [
      {
        name: 'Dazzling Kick',
        cost: { Colorless: 3 },
        damage: 220,
        text: 'This Pokémon heals 30 damage.',
      },
    ],
  },
  'buneary': {
    nameEn: 'Buneary',
    nameTh: 'มิมิโรล',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Double Kick',
        cost: { Colorless: 1 },
        damage: 20,
        text: 'Double Kick',
      },
    ],
  },
  'mega excadrill ex': {
    nameEn: 'Mega Excadrill ex',
    nameTh: 'เมก้าโดริวซึ ex',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1', 'MEGA', 'ex'],
    energyType: 'Metal',
    hp: 320,
    retreatCost: 3,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    evolvesFrom: 'Drilbur',
    attacks: [
      {
        name: 'Drill Break',
        cost: { Metal: 2, Colorless: 1 },
        damage: 250,
        text: 'Discard 1 Energy from this Pokémon.',
      },
    ],
  },
  'drilbur': {
    nameEn: 'Drilbur',
    nameTh: 'โมกุริว',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fighting',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Mud-Slap',
        cost: { Fighting: 1, Colorless: 1 },
        damage: 30,
        text: 'Mud-Slap',
      },
    ],
  },
  'mega skarmory ex': {
    nameEn: 'Mega Skarmory ex',
    nameTh: 'เมก้าแอร์มุโด ex',
    stage: 'Basic',
    subtypes: ['Basic', 'MEGA', 'ex'],
    energyType: 'Metal',
    hp: 270,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    attacks: [
      {
        name: 'Steel Wing',
        cost: { Metal: 2, Colorless: 1 },
        damage: 230,
        text: 'During your opponent\'s next turn, this Pokémon takes 30 less damage from attacks.',
      },
    ],
  },
  'mega absol ex': {
    nameEn: 'Mega Absol ex',
    nameTh: 'เมก้าแอบโซล ex',
    stage: 'Basic',
    subtypes: ['Basic', 'MEGA', 'ex'],
    energyType: 'Darkness',
    hp: 270,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Dark Disaster',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 260,
        text: 'Discard 1 Energy from this Pokémon.',
      },
    ],
  },
  'mega sharpedo ex': {
    nameEn: 'Mega Sharpedo ex',
    nameTh: 'เมก้าซาเมฮาเดอร์ ex',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1', 'MEGA', 'ex'],
    energyType: 'Darkness',
    hp: 270,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Carvanha',
    attacks: [
      {
        name: 'Jaw Crush',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 250,
        text: 'Discard a Special Energy from your opponent\'s Active Pokémon.',
      },
    ],
  },
  'carvanha': {
    nameEn: 'Carvanha',
    nameTh: 'คิบาเนีย',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Darkness',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    attacks: [
      {
        name: 'Chomp',
        cost: { Darkness: 1 },
        damage: 20,
        text: 'Chomp',
      },
    ],
  },
  'mega venusaur ex': {
    nameEn: 'Mega Venusaur ex',
    nameTh: 'เมก้าฟุชิกิบานะ ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'MEGA', 'ex'],
    energyType: 'Grass',
    hp: 340,
    retreatCost: 4,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Ivysaur',
    attacks: [
      {
        name: 'Solar Hammer',
        cost: { Grass: 2, Colorless: 1 },
        damage: 260,
        text: 'Heal 30 damage from this Pokémon.',
      },
    ],
  },
  'bulbasaur': {
    nameEn: 'Bulbasaur',
    nameTh: 'ฟุชิกิดาเนะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 70,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Leech Seed',
        cost: { Grass: 1 },
        damage: 20,
        text: 'Heal 10 damage from this Pokémon.',
      },
    ],
  },
  'ivysaur': {
    nameEn: 'Ivysaur',
    nameTh: 'ฟุชิกิโซ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 100,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Bulbasaur',
    attacks: [
      {
        name: 'Vine Whip',
        cost: { Grass: 2 },
        damage: 50,
        text: 'Vine Whip',
      },
    ],
  },
  'mega meganium ex': {
    nameEn: 'Mega Meganium ex',
    nameTh: 'เมก้าเมกาเนียม ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'MEGA', 'ex'],
    energyType: 'Grass',
    hp: 330,
    retreatCost: 3,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Bayleef',
    attacks: [
      {
        name: 'Aromatherapy Burst',
        cost: { Grass: 2, Colorless: 1 },
        damage: 250,
        text: 'Heal all Special Conditions from all of your Pokémon.',
      },
    ],
  },
  'chikorita': {
    nameEn: 'Chikorita',
    nameTh: 'จิโคริตา',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Tackle',
        cost: { Grass: 1 },
        damage: 10,
        text: 'Tackle',
      },
    ],
  },
  'bayleef': {
    nameEn: 'Bayleef',
    nameTh: 'เบย์ลีฟ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 100,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Chikorita',
    attacks: [
      {
        name: 'Razor Leaf',
        cost: { Grass: 2 },
        damage: 50,
        text: 'Razor Leaf',
      },
    ],
  },
  'meganium': {
    nameEn: 'Meganium',
    nameTh: 'เมกาเนียม',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2'],
    energyType: 'Grass',
    hp: 160,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Bayleef',
    attacks: [
      {
        name: 'Solar Beam',
        cost: { Grass: 2, Colorless: 1 },
        damage: 130,
        text: 'Solar Beam',
      },
    ],
  },
  'cynthia\'s roselia': {
    nameEn: 'Cynthia\'s Roselia',
    nameTh: 'โรเซเลีย <ของชิโรนะ>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Sting',
        cost: { Grass: 1 },
        damage: 20,
        text: 'Sting',
      },
    ],
  },
  'cynthia\'s roserade': {
    nameEn: 'Cynthia\'s Roserade',
    nameTh: 'โรสเรด <ของชิโรนะ>',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 120,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: "Cynthia's Roselia",
    attacks: [
      {
        name: 'Poison Whip',
        cost: { Grass: 1, Colorless: 1 },
        damage: 60,
        text: 'Your opponent\'s Active Pokémon is now Poisoned.',
      },
    ],
  },
  'cynthia\'s spiritomb': {
    nameEn: 'Cynthia\'s Spiritomb',
    nameTh: 'มิคารูเกะ <ของชิโรนะ>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Darkness',
    hp: 80,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Spiteful Shot',
        cost: { Darkness: 1 },
        damage: 40,
        text: 'Spiteful Shot',
      },
    ],
  },
  'marnie\'s grimmsnarl ex': {
    nameEn: 'Marnie\'s Grimmsnarl ex',
    nameTh: 'โอลองเกะ ex <ของแมรี>',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'ex'],
    energyType: 'Darkness',
    hp: 320,
    retreatCost: 3,
    weakness: { type: 'Grass', value: 'x2' },
    evolvesFrom: "Marnie's Morgrem",
    attacks: [
      {
        name: 'Dark Pride',
        cost: { Darkness: 2, Colorless: 1 },
        damage: 240,
        text: 'Discard an Energy from this Pokémon.',
      },
    ],
  },
  'marnie\'s impidimp': {
    nameEn: 'Marnie\'s Impidimp',
    nameTh: 'เบโรบา <ของแมรี>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Darkness',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Bite',
        cost: { Darkness: 1 },
        damage: 10,
        text: 'Bite',
      },
    ],
  },
  'marnie\'s morgrem': {
    nameEn: 'Marnie\'s Morgrem',
    nameTh: 'กิโม <ของแมรี>',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Darkness',
    hp: 90,
    retreatCost: 2,
    weakness: { type: 'Grass', value: 'x2' },
    evolvesFrom: "Marnie's Impidimp",
    attacks: [
      {
        name: 'False Surrender',
        cost: { Darkness: 2 },
        damage: 60,
        text: 'False Surrender',
      },
    ],
  },
  'litwick': {
    nameEn: 'Litwick',
    nameTh: 'ฮิโตโมชิ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fire',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Water', value: 'x2' },
    attacks: [
      {
        name: 'Flickering Flame',
        cost: { Fire: 1 },
        damage: 10,
        text: 'Your opponent\'s Active Pokémon is now Asleep.',
      },
    ],
  },
  'lampent': {
    nameEn: 'Lampent',
    nameTh: 'แลมพูลา',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Fire',
    hp: 80,
    retreatCost: 1,
    weakness: { type: 'Water', value: 'x2' },
    evolvesFrom: 'Litwick',
    attacks: [
      {
        name: 'Combustion',
        cost: { Fire: 2 },
        damage: 50,
        text: 'Combustion',
      },
    ],
  },
  'chandelure': {
    nameEn: 'Chandelure',
    nameTh: 'แชนเดลา',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2'],
    energyType: 'Fire',
    hp: 140,
    retreatCost: 2,
    weakness: { type: 'Water', value: 'x2' },
    evolvesFrom: 'Lampent',
    attacks: [
      {
        name: 'Heat Cyclone',
        cost: { Fire: 2, Colorless: 1 },
        damage: 140,
        text: 'Move an Energy from this Pokémon to 1 of your Benched Pokémon.',
      },
    ],
  },
  'mega chandelure ex': {
    nameEn: 'Mega Chandelure ex',
    nameTh: 'เมก้าแชนเดลา ex',
    stage: 'Stage 2',
    subtypes: ['Stage 2', 'Stage2', 'MEGA', 'ex'],
    energyType: 'Fire',
    hp: 320,
    retreatCost: 2,
    weakness: { type: 'Water', value: 'x2' },
    evolvesFrom: 'Lampent',
    attacks: [
      {
        name: 'Shadow Flame',
        cost: { Fire: 2, Colorless: 1 },
        damage: 260,
        text: 'Discard 1 Energy from this Pokémon.',
      },
    ],
  },
  'psyduck': {
    nameEn: 'Psyduck',
    nameTh: 'โคดัก',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Water',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    attacks: [
      {
        name: 'Headache',
        cost: { Water: 1 },
        damage: 10,
        text: 'Headache',
      },
    ],
  },
  'elgyem': {
    nameEn: 'Elgyem',
    nameTh: 'ลีเกรย์',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Headbutt',
        cost: { Psychic: 1 },
        damage: 20,
        text: 'Headbutt',
      },
    ],
  },
  'bronzor': {
    nameEn: 'Bronzor',
    nameTh: 'โดมิเรอร์',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Metal',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    attacks: [
      {
        name: 'Tackle',
        cost: { Metal: 1 },
        damage: 10,
        text: 'Tackle',
      },
    ],
  },
  'bronzong': {
    nameEn: 'Bronzong',
    nameTh: 'โดทาคุน',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Metal',
    hp: 110,
    retreatCost: 3,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    evolvesFrom: 'Bronzor',
    attacks: [
      {
        name: 'Heavy Impact',
        cost: { Metal: 2, Colorless: 1 },
        damage: 80,
        text: 'Heavy Impact',
      },
    ],
  },
  'makuhita': {
    nameEn: 'Makuhita',
    nameTh: 'มาคุโนชิตะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fighting',
    hp: 80,
    retreatCost: 2,
    weakness: { type: 'Psychic', value: 'x2' },
    attacks: [
      {
        name: 'Slap',
        cost: { Fighting: 1 },
        damage: 20,
        text: 'Slap',
      },
    ],
  },
  'hariyama': {
    nameEn: 'Hariyama',
    nameTh: 'ฮาริเทยามะ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Fighting',
    hp: 140,
    retreatCost: 3,
    weakness: { type: 'Psychic', value: 'x2' },
    evolvesFrom: 'Makuhita',
    attacks: [
      {
        name: 'Arm Thrust',
        cost: { Fighting: 2, Colorless: 1 },
        damage: 120,
        text: 'Arm Thrust',
      },
    ],
  },
  'solrock': {
    nameEn: 'Solrock',
    nameTh: 'โซลร็อก',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fighting',
    hp: 90,
    retreatCost: 1,
    weakness: { type: 'Grass', value: 'x2' },
    attacks: [
      {
        name: 'Spinning Attack',
        cost: { Fighting: 1, Colorless: 1 },
        damage: 50,
        text: 'Spinning Attack',
      },
    ],
  },
  'lunatone': {
    nameEn: 'Lunatone',
    nameTh: 'ลูนาโทน',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 90,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Moon Slash',
        cost: { Psychic: 1, Colorless: 1 },
        damage: 50,
        text: 'Moon Slash',
      },
    ],
  },
  'shuppet': {
    nameEn: 'Shuppet',
    nameTh: 'คาเงะโบสึ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Spooky Shot',
        cost: { Psychic: 1 },
        damage: 20,
        text: 'Spooky Shot',
      },
    ],
  },
  'banette': {
    nameEn: 'Banette',
    nameTh: 'จุปเป็ตตะ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Psychic',
    hp: 100,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Shuppet',
    attacks: [
      {
        name: 'Shadow Bind',
        cost: { Psychic: 2 },
        damage: 70,
        text: 'During your opponent\'s next turn, the Defending Pokémon can\'t retreat.',
      },
    ],
  },
  'poltchageist': {
    nameEn: 'Poltchageist',
    nameTh: 'ฉะเดธ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 30,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Splatter',
        cost: { Grass: 1 },
        damage: 10,
        text: 'Splatter',
      },
    ],
  },
  'sinistcha': {
    nameEn: 'Sinistcha',
    nameTh: 'ยาบาโซฉะ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Poltchageist',
    attacks: [
      {
        name: 'Spill the Tea',
        cost: { Grass: 2 },
        damage: 70,
        text: 'Spill the Tea',
      },
    ],
  },
  'dhelmise': {
    nameEn: 'Dhelmise',
    nameTh: 'ดาดาริน',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 120,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Anchor Horn',
        cost: { Grass: 2, Colorless: 1 },
        damage: 90,
        text: 'Anchor Horn',
      },
    ],
  },
  'celebi': {
    nameEn: 'Celebi',
    nameTh: 'เซเลบี',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Energy Assist',
        cost: { Grass: 1 },
        damage: 20,
        text: 'Attach a Basic Energy card from discard to 1 of your Benched Pokémon.',
      },
    ],
  },
  'tapu bulu': {
    nameEn: 'Tapu Bulu',
    nameTh: 'คาปู บูลูลู',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 130,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Horn Attack',
        cost: { Grass: 2, Colorless: 1 },
        damage: 120,
        text: 'Horn Attack',
      },
    ],
  },
  'toxel': {
    nameEn: 'Toxel',
    nameTh: 'เอเลซัน',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Lightning',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Slight Intrusion',
        cost: { Lightning: 1 },
        damage: 20,
        text: 'This Pokémon does 10 damage to itself.',
      },
    ],
  },
  'toxtricity': {
    nameEn: 'Toxtricity',
    nameTh: 'สตรินเดอร์',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Lightning',
    hp: 130,
    retreatCost: 2,
    weakness: { type: 'Fighting', value: 'x2' },
    evolvesFrom: 'Toxel',
    attacks: [
      {
        name: 'Punk Shock',
        cost: { Lightning: 2, Colorless: 1 },
        damage: 120,
        text: 'Punk Shock',
      },
    ],
  },
  'patrat': {
    nameEn: 'Patrat',
    nameTh: 'มิเนซูมิ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Colorless',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Bite',
        cost: { Colorless: 1 },
        damage: 20,
        text: 'Bite',
      },
    ],
  },
  'moltres': {
    nameEn: 'Moltres',
    nameTh: 'ไฟเยอร์',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fire',
    hp: 120,
    retreatCost: 2,
    weakness: { type: 'Lightning', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Fire Wing',
        cost: { Fire: 2, Colorless: 1 },
        damage: 110,
        text: 'Fire Wing',
      },
    ],
  },
  'stunfisk': {
    nameEn: 'Stunfisk',
    nameTh: 'มักเกียว',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Lightning',
    hp: 110,
    retreatCost: 3,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Zap Cannon',
        cost: { Lightning: 2, Colorless: 1 },
        damage: 80,
        text: 'During your next turn, this Pokémon can\'t attack.',
      },
    ],
  },
  'dwebble': {
    nameEn: 'Dwebble',
    nameTh: 'อิชิซึไม',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 70,
    retreatCost: 2,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Bug Bite',
        cost: { Grass: 1 },
        damage: 10,
        text: 'Bug Bite',
      },
    ],
  },
  'crustle': {
    nameEn: 'Crustle',
    nameTh: 'อิวาพาเลซ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Grass',
    hp: 130,
    retreatCost: 3,
    weakness: { type: 'Fire', value: 'x2' },
    evolvesFrom: 'Dwebble',
    attacks: [
      {
        name: 'Rock Slide',
        cost: { Grass: 2, Colorless: 1 },
        damage: 110,
        text: 'Rock Slide',
      },
    ],
  },
  'slowpoke': {
    nameEn: 'Slowpoke',
    nameTh: 'ยาดง',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 70,
    retreatCost: 2,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    attacks: [
      {
        name: 'Yawn',
        cost: { Colorless: 1 },
        damage: 0,
        text: 'Your opponent\'s Active Pokémon is now Asleep.',
      },
    ],
  },
  'slowking': {
    nameEn: 'Slowking',
    nameTh: 'ยาโดคิง',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Psychic',
    hp: 120,
    retreatCost: 3,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    evolvesFrom: 'Slowpoke',
    attacks: [
      {
        name: 'Seek Answers',
        cost: { Psychic: 1 },
        damage: 0,
        text: 'Search your deck for up to 2 cards and put them into your hand.',
      },
      {
        name: 'Super Psy Bolt',
        cost: { Psychic: 2, Colorless: 1 },
        damage: 100,
        text: 'Super Psy Bolt',
      },
    ],
  },
  'goldeen': {
    nameEn: 'Goldeen',
    nameTh: 'โทซาคินโตะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Water',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Lightning', value: 'x2' },
    attacks: [
      {
        name: 'Flail',
        cost: { Water: 1 },
        damage: 10,
        text: 'Flail',
      },
    ],
  },
  'seaking': {
    nameEn: 'Seaking',
    nameTh: 'อซึมาโอ',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Water',
    hp: 110,
    retreatCost: 2,
    weakness: { type: 'Lightning', value: 'x2' },
    evolvesFrom: 'Goldeen',
    attacks: [
      {
        name: 'Horn Attack',
        cost: { Water: 1, Colorless: 1 },
        damage: 60,
        text: 'Horn Attack',
      },
    ],
  },
  'zeraora': {
    nameEn: 'Zeraora',
    nameTh: 'เซราโอรา',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Lightning',
    hp: 100,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Slash',
        cost: { Colorless: 1 },
        damage: 20,
        text: 'Slash',
      },
      {
        name: 'Wild Charge',
        cost: { Lightning: 2, Colorless: 1 },
        damage: 100,
        text: 'This Pokémon does 20 damage to itself.',
      },
    ],
  },
  'genesect ex': {
    nameEn: 'Genesect ex',
    nameTh: 'เกโนเซ็กท์ ex',
    stage: 'Basic',
    subtypes: ['Basic', 'ex'],
    energyType: 'Metal',
    hp: 220,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    attacks: [
      {
        name: 'Metal Laser',
        cost: { Metal: 2, Colorless: 1 },
        damage: 180,
        text: 'Discard a Special Energy from your opponent\'s Active Pokémon.',
      },
    ],
  },
  enamorus: {
    nameEn: 'Enamorus',
    nameTh: 'เลิฟโทลอส',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 120,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    attacks: [
      {
        name: 'Heart Stamp',
        cost: { Psychic: 1 },
        damage: 30,
        text: 'Heart Stamp',
      },
      {
        name: 'Dazzling Gleam',
        cost: { Psychic: 2, Colorless: 1 },
        damage: 90,
        text: 'Dazzling Gleam',
      },
    ],
  },
  'chien-pao': {
    nameEn: 'Chien-Pao',
    nameTh: 'เป้าเจี้ยน',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Water',
    hp: 120,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    attacks: [
      {
        name: 'Icicle Missile',
        cost: { Water: 1, Colorless: 2 },
        damage: 120,
        text: 'Icicle Missile',
      },
    ],
  },
  genesect: {
    nameEn: 'Genesect',
    nameTh: 'เกโนเซ็กท์',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Metal',
    hp: 110,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    resistance: { type: 'Grass', value: '-30' },
    attacks: [
      {
        name: 'Linear Attack',
        cost: { Metal: 1 },
        damage: 30,
        text: 'This attack does 30 damage to 1 of your opponent\'s Pokémon.',
      },
      {
        name: 'Hyper Beam',
        cost: { Metal: 2, Colorless: 1 },
        damage: 100,
        text: 'Discard an Energy from your opponent\'s Active Pokémon.',
      },
    ],
  },
  dedenne: {
    nameEn: 'Dedenne',
    nameTh: 'เดเด็นเนะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 70,
    retreatCost: 1,
    weakness: { type: 'Metal', value: 'x2' },
    attacks: [
      {
        name: 'Dazzle Dance',
        cost: { Psychic: 1 },
        damage: 20,
        text: 'Your opponent\'s Active Pokémon is now Confused.',
      },
    ],
  },
  shaymin: {
    nameEn: 'Shaymin',
    nameTh: 'เชมิน',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Grass',
    hp: 80,
    retreatCost: 1,
    weakness: { type: 'Fire', value: 'x2' },
    attacks: [
      {
        name: 'Rearrange',
        cost: { Grass: 1 },
        damage: 0,
        text: 'Look at the top 5 cards of your deck and put them back in any order.',
      },
    ],
  },
  'n\'s zekrom': {
    nameEn: "N's Zekrom",
    nameTh: 'เซครอม <ของ N>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Dragon',
    hp: 130,
    retreatCost: 2,
    attacks: [
      {
        name: 'Cross Thunder',
        cost: { Lightning: 1, Colorless: 1 },
        damage: 50,
        text: 'Cross Thunder',
      },
      {
        name: 'Bolt Strike',
        cost: { Lightning: 2, Colorless: 1 },
        damage: 130,
        text: 'This Pokémon does 30 damage to itself.',
      },
    ],
  },
  'n zekrom': {
    nameEn: "N's Zekrom",
    nameTh: 'เซครอม <ของ N>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Dragon',
    hp: 130,
    retreatCost: 2,
    attacks: [
      {
        name: 'Cross Thunder',
        cost: { Lightning: 1, Colorless: 1 },
        damage: 50,
        text: 'Cross Thunder',
      },
      {
        name: 'Bolt Strike',
        cost: { Lightning: 2, Colorless: 1 },
        damage: 130,
        text: 'This Pokémon does 30 damage to itself.',
      },
    ],
  },
  'n\'s darumaka': {
    nameEn: "N's Darumaka",
    nameTh: 'ดารุมักกะ <ของ N>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fire',
    hp: 80,
    retreatCost: 2,
    weakness: { type: 'Water', value: 'x2' },
    attacks: [
      {
        name: 'Tackle',
        cost: { Colorless: 1 },
        damage: 10,
        text: 'Tackle',
      },
      {
        name: 'Combustion',
        cost: { Fire: 2, Colorless: 1 },
        damage: 50,
        text: 'Combustion',
      },
    ],
  },
  'n darumaka': {
    nameEn: "N's Darumaka",
    nameTh: 'ดารุมักกะ <ของ N>',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Fire',
    hp: 80,
    retreatCost: 2,
    weakness: { type: 'Water', value: 'x2' },
    attacks: [
      {
        name: 'Tackle',
        cost: { Colorless: 1 },
        damage: 10,
        text: 'Tackle',
      },
      {
        name: 'Combustion',
        cost: { Fire: 2, Colorless: 1 },
        damage: 50,
        text: 'Combustion',
      },
    ],
  },
  'n\'s darmanitan': {
    nameEn: "N's Darmanitan",
    nameTh: 'ฮิฮิดารุมะ <ของ N>',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Fire',
    hp: 140,
    retreatCost: 3,
    weakness: { type: 'Water', value: 'x2' },
    evolvesFrom: "N's Darumaka",
    attacks: [
      {
        name: 'Fire Punch',
        cost: { Fire: 2 },
        damage: 80,
        text: 'Fire Punch',
      },
      {
        name: 'Flare Blitz',
        cost: { Fire: 3 },
        damage: 160,
        text: 'Discard all Fire Energy from this Pokémon.',
      },
    ],
  },
  'n darmanitan': {
    nameEn: "N's Darmanitan",
    nameTh: 'ฮิฮิดารุมะ <ของ N>',
    stage: 'Stage 1',
    subtypes: ['Stage 1', 'Stage1'],
    energyType: 'Fire',
    hp: 140,
    retreatCost: 3,
    weakness: { type: 'Water', value: 'x2' },
    evolvesFrom: "N's Darumaka",
    attacks: [
      {
        name: 'Fire Punch',
        cost: { Fire: 2 },
        damage: 80,
        text: 'Fire Punch',
      },
      {
        name: 'Flare Blitz',
        cost: { Fire: 3 },
        damage: 160,
        text: 'Discard all Fire Energy from this Pokémon.',
      },
    ],
  },
  spiritomb: {
    nameEn: 'Spiritomb',
    nameTh: 'มิคารูเกะ',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Psychic',
    hp: 60,
    retreatCost: 1,
    weakness: { type: 'Darkness', value: 'x2' },
    resistance: { type: 'Fighting', value: '-30' },
    abilities: [
      {
        name: 'Fettered Cemetery',
        type: 'Ability',
        trigger: 'passive',
        text: 'Basic Pokémon V in play have no Abilities.',
      },
    ],
    attacks: [
      {
        name: 'Fade Out',
        cost: { Colorless: 1 },
        damage: 10,
        text: 'Put this Pokémon and all attached cards into your hand.',
      },
    ],
  },
  pecharunt: {
    nameEn: 'Pecharunt',
    nameTh: 'โมโมวาโร่',
    stage: 'Basic',
    subtypes: ['Basic'],
    energyType: 'Darkness',
    hp: 80,
    retreatCost: 1,
    weakness: { type: 'Fighting', value: 'x2' },
    attacks: [
      {
        name: 'Toxic Chain',
        cost: { Darkness: 1 },
        damage: 20,
        text: 'Your opponent\'s Active Pokémon is now Poisoned.',
      },
    ],
  },
};

export class StandardCardDatabase {
  /**
   * Cleans a name for key matching
   */
  static cleanKey(name: string): string {
    return (name || '')
      .toLowerCase()
      .replace(/<ของ.*?_?>/g, '')
      .replace(/_ของ_?.*$/, '')
      .replace(/'s\s+/i, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Retrieves canonical Pokémon data
   */
  static getPokemon(nameEnOrTh: string): CanonicalPokemon | undefined {
    if (!nameEnOrTh) return undefined;
    const clean = nameEnOrTh.toLowerCase().trim();

    // 1. Exact match
    if (POKEMON_REGISTRY[clean]) return POKEMON_REGISTRY[clean];

    // 2. Scan by nameEn or nameTh
    for (const p of Object.values(POKEMON_REGISTRY)) {
      if (
        p.nameEn.toLowerCase() === clean ||
        p.nameTh.toLowerCase() === clean ||
        clean.includes(p.nameEn.toLowerCase()) ||
        clean.includes(p.nameTh.toLowerCase())
      ) {
        return p;
      }
    }

    return undefined;
  }

  /**
   * Enriches any raw card or instance with official competitive attacks,
   * abilities, correct subtypes, and stats.
   */
  static enrichPokemon<T extends {
    nameEn?: string;
    nameTh?: string;
    subtypes?: string[];
    energyType?: string;
    hp?: number;
    attacks?: CardAttack[];
    abilities?: CardAbility[];
    evolvesFrom?: string;
  }>(card: T): T & {
    subtypes: string[];
    hp: number;
    energyType: string;
    attacks: CardAttack[];
    abilities: CardAbility[];
    evolvesFrom?: string;
  } {
    const canonical = this.getPokemon(card.nameEn || card.nameTh || '');

    if (canonical) {
      return {
        ...card,
        subtypes: Array.from(new Set([...(card.subtypes || []), ...canonical.subtypes])),
        hp: card.hp || canonical.hp,
        energyType: canonical.energyType || card.energyType || 'Colorless',
        attacks: canonical.attacks,
        abilities: canonical.abilities || [],
        evolvesFrom: canonical.evolvesFrom || card.evolvesFrom,
      };
    }

    // Fallback for unindexed Pokémon: provide clean, playable attacks based on stage
    const isEx = card.subtypes?.includes('ex') || (card.nameEn || '').toLowerCase().includes('ex');
    const isStage2 = card.subtypes?.includes('Stage 2') || card.subtypes?.includes('Stage2');
    const isStage1 = card.subtypes?.includes('Stage 1') || card.subtypes?.includes('Stage1');
    const primaryType = card.energyType || 'Colorless';

    const fallbackAttacks: CardAttack[] = [];
    if (isEx) {
      fallbackAttacks.push({
        name: 'Impact Strike',
        cost: { [primaryType]: 2, Colorless: 1 },
        damage: 220,
        text: 'Standard High-Damage Tournament Attack',
      });
    } else if (isStage2) {
      fallbackAttacks.push({
        name: 'Power Strike',
        cost: { [primaryType]: 2 },
        damage: 140,
        text: 'Power Strike',
      });
    } else if (isStage1) {
      fallbackAttacks.push({
        name: 'Quick Strike',
        cost: { [primaryType]: 1, Colorless: 1 },
        damage: 70,
        text: 'Quick Strike',
      });
    } else {
      fallbackAttacks.push({
        name: 'Tackle',
        cost: { Colorless: 1 },
        damage: 20,
        text: 'Tackle',
      });
    }

    return {
      ...card,
      subtypes: card.subtypes || ['Basic'],
      hp: card.hp || (isEx ? 260 : isStage2 ? 150 : isStage1 ? 90 : 70),
      energyType: primaryType,
      attacks: card.attacks && card.attacks.length > 0 ? card.attacks : fallbackAttacks,
      abilities: card.abilities || [],
      evolvesFrom: card.evolvesFrom,
    };
  }

  /**
   * Validates whether attached energies satisfy attack cost
   */
  static canSatisfyCost(attachedEnergies: { energyType?: string }[], cost: AttackCost): boolean {
    if (cost.Free !== undefined) return true;

    const pool = [...attachedEnergies];
    let requiredColorless = 0;

    // 1. Specific Energy costs
    for (const [type, count] of Object.entries(cost)) {
      if (type === 'Colorless') {
        requiredColorless += count;
        continue;
      }
      if (type === 'Free') continue;

      for (let i = 0; i < count; i++) {
        const foundIdx = pool.findIndex((e) => e.energyType === type);
        if (foundIdx === -1) return false;
        pool.splice(foundIdx, 1);
      }
    }

    // 2. Remaining must satisfy Colorless
    return pool.length >= requiredColorless;
  }

  /**
   * Formats attack cost into printable energy symbols
   */
  static formatCostSymbols(cost: AttackCost): string[] {
    if (cost.Free !== undefined) return ['FREE'];
    const symbols: string[] = [];
    for (const [type, count] of Object.entries(cost)) {
      for (let i = 0; i < count; i++) {
        symbols.push(type);
      }
    }
    return symbols;
  }
}
