/**
 * Pokemon TCG Thai Language Translator Utility
 * Translates supertypes, subtypes, stages, game mechanics, Pokemon names,
 * attack names, and ability names to standard Thai terminology.
 */

import translations from '../data/pokemonNameTranslations.json';

const pokemonMap: Record<string, string> = translations.pokemon || {};
const trainerMap: Record<string, string> = translations.trainers || {};
const prefixList: { en: string; th: string }[] = (translations as any).prefixes || [];

export const SUPERTYPE_THAI: Record<string, string> = {
  Pokemon: 'โปเกมอน',
  Trainer: 'เทรนเนอร์',
  Energy: 'พลังงาน',
};

export const SUBTYPE_THAI: Record<string, string> = {
  Basic: 'พื้นฐาน',
  'Stage 1': 'ร่าง 1',
  'Stage 2': 'ร่าง 2',
  Supporter: 'ซัพพอร์ตเตอร์',
  Item: 'ไอเท็ม',
  Stadium: 'สเตเดียม',
  'Pokemon Tool': 'ไอเท็มติดโปเกมอน',
  'Pokémon Tool': 'ไอเท็มติดโปเกมอน',
  Tool: 'ไอเท็มติดโปเกมอน',
  'Special Energy': 'พลังงานพิเศษ',
  'Basic Energy': 'พลังงานพื้นฐาน',
  Technical: 'แมชชีนเทคนิค',
  'Technical Machine': 'แมชชีนเทคนิค',
  Ancient: 'โบราณ (Ancient)',
  Future: 'อนาคต (Future)',
  ex: 'ex',
  V: 'V',
  VMAX: 'VMAX',
  VSTAR: 'VSTAR',
  'ACE SPEC': 'ACE SPEC',
  Radiant: 'เปล่งประกาย (Radiant)',
  Tera: 'เทรัสตัล (Tera)',
};

export const STAGE_THAI: Record<string, string> = {
  Basic: 'โปเกมอนพื้นฐาน',
  'Stage 1': 'โปเกมอนร่าง 1',
  'Stage 2': 'โปเกมอนร่าง 2',
  VMAX: 'โปเกมอน VMAX',
  VSTAR: 'โปเกมอน VSTAR',
};

export const ENERGY_TYPE_THAI: Record<string, string> = {
  Grass: 'หญ้า',
  Fire: 'ไฟ',
  Water: 'น้ำ',
  Lightning: 'สายฟ้า',
  Psychic: 'พลังจิต',
  Fighting: 'ต่อสู้',
  Darkness: 'ความมืด',
  Metal: 'โลหะ',
  Dragon: 'มังกร',
  Colorless: 'ไร้สี',
};

/**
 * Standard format Ability names in Thai
 */
export const ABILITY_NAME_THAI: Record<string, string> = {
  'Recon Directive': 'คำสั่งสอดแนม',
  'Infernal Reign': 'การครอบงำแห่งเพลิงนรก',
  'Quick Search': 'ค้นหาด่วน',
  'Teal Dance': 'ระบำเขียวขจี',
  'Tandem Unit': 'แทนเดมยูนิต',
  'Fleet-Footed': 'ฝีเท้าคล่องแคล่ว',
  'Concealed Cards': 'การ์ดที่ซ่อนเร้น',
  'Flip the Script': 'พลิกสถานการณ์',
  'Adrena-Brain': 'อะดรีนาเบรน',
  'Run Away Draw': 'จั่วหนีเอาตัวรอด',
  'Restart': 'รีสตาร์ต',
  'Instant Charge': 'ชาร์จทันใจ',
  'Cursed Blast': 'ระเบิดสาปแช่ง',
  'Subjugating Chains': 'โซ่ตรวนสะกดจิต',
  'Attract Customer': 'เรียกลูกค้า',
  'Industrious Incisors': 'ฟันหน้าขยันแทะ',
  'Metal Maker': 'ผู้สร้างโลหะ',
  'Jeweled Hunt': 'ล่าอัญมณี',
  'Ripening Charge': 'ชาร์จผลสุก',
  'Freezing Shroud': 'ผ้าคลุมเยือกแข็ง',
  'Seasoned Skill': 'ทักษะเจนศึก',
  'Skylight': 'แสงแห่งฟากฟ้า',
  'Fairy Zone': 'แฟรี่โซน',
  'Rapid Vernier': 'เวอร์เนียร์ฉับไว',
  'Cobalt Command': 'คำสั่งโคบอลต์',
  'Midnight Fluttering': 'โบยบินยามราตรี',
  'Flower Selecting': 'คัดเลือกดอกไม้',
  'Toxic Powder': 'ผงพิษร้าย',
  'Curly Wall': 'กำแพงขดตัว',
  'Boom Boom Groove': 'จังหวะตูมตาม',
  'Spherical Shield': 'โล่ทรงกลม',
  'Plasma Cancellation': 'ตัดสัญญาณพลาสมา',
  'Fettered Cemetery': 'สุสานพันธนาการ',
  'Abyssal Hand': 'หัตถ์อเวจี',
  'Intrepid Sword': 'ดาบผู้กล้า',
  'Shadowy Concealment': 'ซ่อนเงา',
  'Starbirth': 'สตาร์เบิร์ธ',
  'Star Chronos': 'สตาร์โครนอส',
  'Star Requiem': 'สตาร์เรควีเอ็ม',
  'Star Portal': 'สตาร์พอร์ทัล',
  'Apex Pulse': 'ชีพจรจุดสูงสุด',
  'Overload': 'โอเวอร์โหลด',
};

/**
 * Standard format Attack names in Thai
 */
export const ATTACK_NAME_THAI: Record<string, string> = {
  'Jet Headbutt': 'เจ็ตเฮดบัต',
  'Phantom Dive': 'แฟนทอมไดฟ์',
  'Headbutt': 'เฮดบัต',
  'Petty Grudge': 'ความแค้นเล็กน้อย',
  'Bite': 'กัด',
  'Burning Darkness': 'ความมืดที่แผดเผา',
  'Combustion': 'เผาไหม้',
  'Scratch': 'ข่วน',
  'Blustery Wind': 'ลมพัดแรง',
  'Flap': 'กระพือปีก',
  'Gust': 'ลมกระโชก',
  'Burst Roar': 'คำรามกึกก้อง',
  'Bellowing Thunder': 'อัสนีบาตคำราม',
  'Myriad Leaf Shower': 'ห่าฝนหมื่นใบไม้',
  'Frenzied Gouging': 'ขวิดคลั่ง',
  'Calamity Storm': 'พายุวิบัติ',
  'Arm Press': 'อาร์มเพรส',
  'Amp You Very Much': 'แอมป์ยูเวรี่มัช',
  'Photon Kinesis': 'โฟตอนคิเนซิส',
  'Lightning Rondo': 'ไลท์นิ่งรอนโด',
  'Blizzard Rondo': 'บลิซซาร์ดรอนโด',
  'Moonlight Shuriken': 'ชูริเคนแสงจันทร์',
  'Shinobi Slash': 'ดาบนินจาฟัน',
  'Mirage Barrage': 'มิราจแบร์ราจ',
  'Water Drip': 'หยดน้ำ',
  'Flock': 'รวมฝูง',
  'Flip the Script': 'พลิกเกม',
  'Cruel Arrow': 'ศรเหี้ยมเกรียม',
  'Mind Bend': 'ดัดกระแสจิต',
  'Tail Smack': 'ฟาดหาง',
  'Dig': 'มุดดิน',
  'Genome Hacking': 'แฮ็กจีโนม',
  'Scrap Short': 'ช็อตเศษเหล็ก',
  'Shadow Bind': 'ผูกมัดเงา',
  'Will-O-Wisp': 'ลูกไฟวิญญาณ',
  'Collect': 'สะสม',
  'Errand Running': 'วิ่งทำธุระ',
  'Pay Day': 'เก็บเงิน',
  'Slash': 'ฟัน',
  'Irritating Burst': 'ระเบิดกวนประสาท',
  'Surf': 'โต้คลื่น',
  'Tail Smash': 'ทุบหาง',
  'Rollout': 'กลิ้งตัว',
  'Beam': 'ลำแสง',
  'Dig Claws': 'กรงเล็บขุด',
  'Meteor Mash': 'หมัดดาวตก',
  'Luster Blast': 'รัสเทอร์บลาสต์',
  'Speed Wing': 'ปีกความเร็วสูง',
  'Silent Wing': 'ปีกเงียบงัน',
  'Syrup Storm': 'พายุไซรัป',
  'Syrup Bomb': 'ระเบิดไซรัป',
  'Find a Friend': 'หาเพื่อน',
  'Dragon Dive': 'มังกรดิ่งพสุธา',
  'Night Burst': 'ระเบิดราตรี',
  'Frost Smash': 'ฟรอสต์สแมช',
  'Powder Snow': 'หิมะโปรย',
  'Mind Jack': 'มายด์แจ็ค',
  'Dimensional Hand': 'หัตถ์มิติ',
  'Teleportation': 'เทเลพอร์ต',
  'Psyshot': 'ไซช็อต',
  'Blood Moon': 'จันทราสีเลือด',
  'Infinity Blade': 'ดาบไร้ขอบเขต',
  'Full Moon Miracle': 'ปาฏิหาริย์จันทร์เพ็ญ',
  'Sob': 'สะอึกสะอื้น',
  'Torrential Pump': 'ปั๊มน้ำเชี่ยวกราก',
  'Prismatic Edge': 'คมปริซึม',
  'Twin Shotel': 'ดาบคู่โชเทล',
  'Hex Hurl': 'ขว้างคำสาป',
  'Spinning Attack': 'โจมตีหมุนวน',
  'Rampaging Hammer': 'ค้อนคลั่ง',
  'Splitting Beam': 'ลำแสงผ่าซีก',
  'Kaiser Tackle': 'ไกเซอร์แทเคิล',
  'Boundless Power': 'พลังไร้ขีดจำกัด',
  'Beat': 'ทุบ',
  'Branch Poke': 'ทิ่มกิ่งไม้',
  'Psychic': 'พลังจิต',
  'Jealousy': 'ความริษยา',
  'Flame Surge': 'เปลวเพลิงถาโถม',
  'Trifrost': 'ไตรฟรอสต์',
  'Corrosive Suction': 'ดูดกลืนกัดกร่อน',
  'Dark Cutter': 'ดาร์กคัตเตอร์',
  'Comet Punch': 'หมัดดาวหาง',
  'Magnum Punch': 'แม็กนั่มพันช์',
  'Aura Smash': 'ออร่าสแมช',
  'Punch': 'ต่อย',
  'Dazzling Kick': 'เตะแพรวพราว',
  'Double Kick': 'เตะสองจังหวะ',
  'Drill Break': 'สว่านทำลายล้าง',
  'Mud-Slap': 'ตบโคลน',
  'Steel Wing': 'ปีกเหล็กกล้า',
  'Dark Disaster': 'มหันตภัยความมืด',
  'Jaw Crush': 'บดขยี้ด้วยขากรรไกร',
  'Chomp': 'งับ',
  'Solar Hammer': 'ค้อนสุริยัน',
  'Leech Seed': 'เมล็ดกาฝาก',
  'Vine Whip': 'แส้เถาวัลย์',
  'Aromatherapy Burst': 'ระเบิดอโรมาเธอราพี',
  'Tackle': 'พุ่งชน',
  'Razor Leaf': 'ใบมีดใบไม้',
  'Solar Beam': 'ลำแสงสุริยะ',
  'Sting': 'ต่อยเหล็กใน',
  'Poison Whip': 'แส้พิษ',
  'Spiteful Shot': 'กระสุนอาฆาต',
  'Dark Pride': 'ศักดิ์ศรีความมืด',
  'False Surrender': 'ยอมจำนนลวง',
  'Flickering Flame': 'เปลวไฟวูบวาบ',
  'Heat Cyclone': 'ไซโคลนความร้อน',
  'Shadow Flame': 'เปลวไฟเงา',
  'Headache': 'ปวดศีรษะ',
  'Heavy Impact': 'กระแทกหนักหน่วง',
  'Slap': 'ตบ',
  'Arm Thrust': 'แทงแขน',
  'Moon Slash': 'ดาบจันทรา',
  'Spooky Shot': 'กระสุนหลอน',
  'Splatter': 'สาดกระจาย',
  'Spill the Tea': 'ชงชาร้อน',
  'Anchor Horn': 'เขาสมอเรือ',
  'Energy Assist': 'ช่วยส่งพลังงาน',
  'Horn Attack': 'โจมตีด้วยเขา',
  'Slight Intrusion': 'บุกรุกเล็กน้อย',
  'Punk Shock': 'พังก์ช็อค',
  'Fire Wing': 'ปีกเพลิง',
  'Zap Cannon': 'ปืนใหญ่อัสนี',
  'Bug Bite': 'แมลงกัด',
  'Rock Slide': 'หินถล่ม',
  'Yawn': 'หาว',
  'Seek Answers': 'แสวงหาคำตอบ',
  'Super Psy Bolt': 'ซูเปอร์ไซโบลต์',
  'Flail': 'ดิ้นรน',
  'Wild Charge': 'พุ่งชนบ้าระห่ำ',
  'Metal Laser': 'เลเซอร์โลหะ',
  'Heart Stamp': 'ประทับตราหัวใจ',
  'Dazzling Gleam': 'ประกายแสงเจิดจ้า',
  'Icicle Missile': 'ขีปนาวุธน้ำแข็ง',
  'Linear Attack': 'โจมตีเป็นเส้นตรง',
  'Hyper Beam': 'ไฮเปอร์บีม',
  'Dazzle Dance': 'ระบำแพรวพราว',
  'Rearrange': 'จัดเรียงใหม่',
  'Cross Thunder': 'ครอสธันเดอร์',
  'Bolt Strike': 'โบลต์สไตรค์',
  'Fire Punch': 'หมัดเพลิง',
  'Flare Blitz': 'เฟลร์บลิทซ์',
  'Fade Out': 'เลือนหาย',
  'Toxic Chain': 'โซ่พิษ',
};

function cleanString(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[-.:_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Translates an English card name (Pokemon or Trainer) to Thai
 */
export function translatePokemonName(nameEn?: string): string {
  if (!nameEn) return '';
  if (/[ก-๙]/.test(nameEn)) return nameEn;

  // Exact / cleaned match
  const clean = cleanString(nameEn);
  if (pokemonMap[clean]) return pokemonMap[clean];
  if (trainerMap[clean]) return trainerMap[clean];

  // Suffix matching (e.g. ' ex', ' VSTAR', ' VMAX', ' V')
  const suffixes = [
    { regex: /\s+ex$/i, th: ' ex' },
    { regex: /\s+vstar$/i, th: ' VSTAR' },
    { regex: /\s+vmax$/i, th: ' VMAX' },
    { regex: /\s+v-union$/i, th: ' V-UNION' },
    { regex: /\s+v$/i, th: ' V' },
    { regex: /\s+\(radiant\)$/i, th: ' (ส่องประกาย)' },
    { regex: /\s+\(tera\)$/i, th: ' (เทรัสตัล)' },
  ];

  for (const s of suffixes) {
    if (s.regex.test(nameEn)) {
      const base = nameEn.replace(s.regex, '').trim();
      const baseClean = cleanString(base);
      const translatedBase = pokemonMap[baseClean] || trainerMap[baseClean];
      if (translatedBase) return translatedBase + s.th;
    }
  }

  // Prefix matching
  for (const p of prefixList) {
    if (nameEn.toLowerCase().startsWith(p.en.toLowerCase())) {
      const rest = nameEn.slice(p.en.length).trim();
      const restClean = cleanString(rest);
      const translatedRest = pokemonMap[restClean] || trainerMap[restClean];
      if (translatedRest) return p.th + translatedRest;
    }
  }

  return nameEn;
}

export function translateSupertype(supertype?: string): string {
  if (!supertype) return 'โปเกมอน';
  return SUPERTYPE_THAI[supertype] || supertype;
}

export function translateSubtype(subtype?: string): string {
  if (!subtype) return '';
  return SUBTYPE_THAI[subtype] || subtype;
}

export function translateSubtypes(subtypes?: string[]): string[] {
  if (!subtypes || subtypes.length === 0) return [];
  return subtypes.map((s) => translateSubtype(s));
}

export function translateStage(stage?: string): string {
  if (!stage) return 'โปเกมอนพื้นฐาน';
  return STAGE_THAI[stage] || stage;
}

export function translateEnergyType(type?: string): string {
  if (!type) return 'ไร้สี';
  return ENERGY_TYPE_THAI[type] || type;
}

/**
 * Gets attack display name, strictly prioritizing Thai
 */
export function getAttackDisplayName(
  attack?: { nameTh?: string; name?: string; nameEn?: string } | string | null
): string {
  if (!attack) return 'ท่าโจมตี';
  if (typeof attack === 'string') {
    return ATTACK_NAME_THAI[attack] || attack;
  }
  if (attack.nameTh && attack.nameTh.trim()) {
    return attack.nameTh.trim();
  }
  const lookupKey = attack.name || attack.nameEn || '';
  if (lookupKey && ATTACK_NAME_THAI[lookupKey]) {
    return ATTACK_NAME_THAI[lookupKey];
  }
  return lookupKey || 'ท่าโจมตี';
}

/**
 * Gets ability display name, strictly prioritizing Thai
 */
export function getAbilityDisplayName(
  ability?: { nameTh?: string; name?: string; nameEn?: string } | string | null
): string {
  if (!ability) return 'ความสามารถ';
  if (typeof ability === 'string') {
    return ABILITY_NAME_THAI[ability] || ability;
  }
  if (ability.nameTh && ability.nameTh.trim()) {
    return ability.nameTh.trim();
  }
  const lookupKey = ability.name || ability.nameEn || '';
  if (lookupKey && ABILITY_NAME_THAI[lookupKey]) {
    return ABILITY_NAME_THAI[lookupKey];
  }
  return lookupKey || 'ความสามารถ';
}

/**
 * Gets card display name with mandatory Thai priority.
 * 1. Checks card.nameTh
 * 2. Checks card.name (if contains Thai)
 * 3. Translates card.nameEn to Thai via official database
 * 4. Translates card.name to Thai
 * 5. Falls back to card.name or card.nameEn
 */
export function getCardDisplayName(
  card?: { nameTh?: string; nameEn?: string; name?: string } | null
): string {
  if (!card) return 'การ์ด';
  if (card.nameTh && card.nameTh.trim()) {
    return card.nameTh.trim();
  }
  if (card.name && /[ก-๙]/.test(card.name)) {
    return card.name.trim();
  }
  if (card.nameEn) {
    const translated = translatePokemonName(card.nameEn);
    if (translated && /[ก-๙]/.test(translated)) {
      return translated;
    }
  }
  if (card.name) {
    const translated = translatePokemonName(card.name);
    if (translated && /[ก-๙]/.test(translated)) {
      return translated;
    }
  }
  return card.name || card.nameEn || 'การ์ด';
}
