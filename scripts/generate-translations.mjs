import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Fetching official Thai <-> English Pokemon species data from Bulbapedia...');
  const url = 'https://bulbapedia.bulbagarden.net/w/api.php?action=parse&page=List_of_Thai_Pok%C3%A9mon_names&prop=wikitext&format=json';
  const res = await fetch(url, { headers: { 'User-Agent': 'PokeTracker/1.0' } });
  const data = await res.json();
  const wikitext = data.parse?.wikitext?.['*'] || '';

  // Regex pattern for {{Lop/foreign|0001|Bulbasaur|th|ฟุชิกิดาเนะ|Fuchikidane}}
  // or {{Lop/foreign|0001|Bulbasaur|...|th|...}}
  const regex = /\{\{Lop\/foreign\|(\d+)\|([^|]+)\|th\|([^|]+)\|/g;
  
  const enToTh = {};
  const thToEn = {};
  const dexList = [];

  let match;
  while ((match = regex.exec(wikitext)) !== null) {
    const dexNo = parseInt(match[1], 10);
    const enName = match[2].trim();
    const thName = match[3].trim();

    enToTh[enName.toLowerCase()] = thName;
    thToEn[thName] = enName;
    dexList.push({ dex: dexNo, en: enName, th: thName });
  }

  console.log(`Parsed ${dexList.length} Pokemon species mappings.`);

  // Essential Thai TCG variations and alternate spellings:
  const aliases = {
    // Rayquaza
    rayquaza: ['เร็คควอซา', 'เรควาซา'],
    // Greninja
    greninja: ['เก็คโคกะ', 'เก็กโควงะ'],
    // Lucario
    lucario: ['ลูคาริโอ', 'ลูกาลิโอ'],
    // Garchomp
    garchomp: ['กาเบรียส', 'กาเบรียล'],
    // Decidueye
    decidueye: ['จูไนเปอร์'],
    // Samurott
    samurott: ['ไดเคนคิ'],
    // Typhlosion
    typhlosion: ['แบ็กฟูน'],
    // Dragonite
    dragonite: ['ไคริว'],
    // Hawlucha
    hawlucha: ['ลูจาบูล'],
    // Heatran
    heatran: ['ฮีดราน', 'ฮีทราน'],
    // Dialga
    dialga: ['ดีอัลกา'],
    // Palkia
    palkia: ['พัลเกีย'],
    // Giratina
    giratina: ['กิราตินา'],
    // Arceus
    arceus: ['อาร์เซอุส'],
    // Darkrai
    darkrai: ['ดาร์คไร', 'ดาร์กไร'],
    // Gengar
    gengar: ['เก็งกา'],
    // Snorlax
    snorlax: ['คาบิกอน'],
    // Eevee
    eevee: ['อีวุย'],
    // Vaporeon
    vaporeon: ['ชาวเวอร์ส'],
    // Jolteon
    jolteon: ['ธันเดอร์ส'],
    // Flareon
    flareon: ['บูสเตอร์'],
    // Espeon
    espeon: ['เอฟี'],
    // Umbreon
    umbreon: ['แบล็กกี'],
    // Leafeon
    leafeon: ['ลีเฟีย'],
    // Glaceon
    glaceon: ['กราเซีย'],
    // Sylveon
    sylveon: ['นิมเฟีย'],
    // Roaring Moon
    "roaring moon": ['จันทร์คำรน'],
    // Iron Valiant
    "iron valiant": ['นักรบเหล็ก'],
    // Iron Hands
    "iron hands": ['แขนเหล็ก'],
    // Iron Leaves
    "iron leaves": ['ใบด่างเหล็ก'],
    // Iron Crown
    "iron crown": ['มงกุฎเหล็ก'],
    // Iron Boulder
    "iron boulder": ['ศิลาเหล็ก'],
    // Iron Jugulis
    "iron jugulis": ['คอนกุเหล็ก'],
    // Iron Moth
    "iron moth": ['พิษปีกเหล็ก'],
    // Iron Thorns
    "iron thorns": ['หนามเหล็ก'],
    // Iron Bundle
    "iron bundle": ['ถุงเหล็ก'],
    // Iron Treads
    "iron treads": ['ล้อเหล็ก'],
    // Walking Wake
    "walking wake": ['คลื่นน้ำกระเพื่อม'],
    // Gouging Fire
    "gouging fire": ['เพลิงกู่ร้อง'],
    // Raging Bolt
    "raging bolt": ['ฟ้าคะนองคลั่ง'],
    // Flutter Mane
    "flutter mane": ['เกศากระพือ'],
    // Scream Tail
    "scream tail": ['หางสะเทือนขวัญ'],
    // Brute Bonnet
    "brute bonnet": ['เห็ดดุร้าย'],
    // Great Tusk
    "great tusk": ['งายักษ์'],
    // Sandy Shocks
    "sandy shocks": ['ขนทราย'],
    // Slither Wing
    "slither wing": ['ปีกคืบคลาน'],
    // Pecharunt
    pecharunt: ['โมโมวาโร่'],
    // Terapagos
    terapagos: ['เทราปากอส'],
    // Ogerpon
    ogerpon: ['โอการ์ปอง'],
    // Bloodmoon Ursaluna
    "bloodmoon  घोषणा": ['กาจิกุมะ พระจันทร์สีเลือด'],
    "ursaluna": ['กาจิกุมะ'],
    // Gholdengo
    gholdengo: ['ซาร์ฟโก'],
    // Gimmighoul
    gimmighoul: ['คอลเลกุเรย์'],
    // Dragapult
    dragapult: ['โดราพัลท์'],
    // Baxcalibur
    baxcalibur: ['เซกิเรฟ'],
    // Pidgeot
    pidgeot: ['พีเจียต', 'พิดเจียต'],
    // Tinkaton
    tinkaton: ['เดคาเนุจัง', 'เดคาเนุ'],
    // Meowscarada
    meowscarada: ['มาสเคอเนีย'],
    // Skeledirge
    skeledirge: ['ลาวด์โบน'],
    // Quaquaval
    quaquaval: ['เวนิวัล'],
  };

  for (const [en, list] of Object.entries(aliases)) {
    enToTh[en.toLowerCase()] = list[0];
    for (const th of list) {
      thToEn[th] = en.charAt(0).toUpperCase() + en.slice(1);
    }
  }

  // Add Special Suffixes and Regional Forms
  const prefixes = [
    { en: 'Mega ', th: 'เมก้า' },
    { en: 'Alolan ', th: 'อโลลา ' },
    { en: 'Galarian ', th: 'กาลาร์ ' },
    { en: 'Hisuian ', th: 'ฮิซุย ' },
    { en: 'Paldean ', th: 'พัลเดีย ' },
    { en: 'Radiant ', th: 'ส่องประกาย ' },
  ];

  // Comprehensive Trainer & Common TCG terms translations (EN -> TH)
  const trainers = {
    // Supporters
    "boss's orders": "คำสั่งของบอส",
    "boss": "คำสั่งของบอส",
    "professor's research": "งานวิจัยของศาสตราจารย์",
    "professor": "งานวิจัยของศาสตราจารย์",
    "iono": "นันจาโม",
    "arven": "เปปเปอร์",
    "colress's experiment": "การทดลองของอาโครมา",
    "colress": "อาโครมา",
    "marnie": "มารีィ",
    "marnie's pride": "ความภาคภูมิใจของมารีィ",
    "cynthia": "ชิโรนะ",
    "cynthia's ambition": "ความทะเยอทะยานของชิโรนะ",
    "serena": "เซเรนา",
    "irida": "ไค",
    "raihan": "คิบานะ",
    "melony": "เมลอน",
    "gardenia's vigor": "ความมีชีวิตชีวาของนาทาเนะ",
    "giovanni's charisma": "เสน่ห์ของซาคากิ",
    "giovanni": "ซาคากิ",
    "erika's invitation": "คำเชิญของเอริกะ",
    "erika": "เอริกะ",
    "penny": "โบทัน",
    "nemona": "เนโม",
    "jacq": "จิเนีย",
    "grusha": "กรูชา",
    "larry": "อาโอกิ",
    "tulip": "ริป",
    "koraidon": "โคไรดอน",
    "miraidon": "มิไรดอน",
    "sada's vitality": "ความมุ่งมั่นของโอลิม",
    "professor sada's vitality": "ความมุ่งมั่นของศาสตราจารย์โอลิม",
    "turo's scenario": "แผนการของทูโร่",
    "professor turo's scenario": "แผนการของศาสตราจารย์ทูโร่",
    "crispin": "อาคามัตสึ",
    "drayton": "คาคิสึบาตะ",
    "kieran": "ซุกุริ",
    "carmine": "เซซีเนีย",
    "lacey": "ทาโร่",
    "briar": "บรัยเออร์",
    "amarys": "เนริเนะ",
    "morty's conviction": "ความเชื่อมั่นของมัตสึบะ",
    "roxanne": "สึสึจิ",
    "judge": "กรรมการตัดสิน",
    "worker": "คนงาน",
    "youngster": "เด็กหนุ่มรุ่นกระทง",
    "lana's aid": "ความช่วยเหลือของซุยเรน",
    "guzma": "กุซมา",
    "n": "เอ็น",
    "lillie's determination": "ปณิธานของลิเลีย",
    "lillie": "ปณิธานของลิเลีย",
    "rosa's encouragement": "กำลังใจจากเม",
    "rosa": "กำลังใจจากเม",
    "iris's fighting spirit": "จิตนักสู้ของไอริส",
    "cynthia's power": "เวทเสริมพลังของชิโรนะ",

    // Items & Balls
    "quick ball": "ควิกบอล",
    "ultra ball": "ไฮเปอร์บอล",
    "nest ball": "เนสท์บอล",
    "level ball": "เลเวลบอล",
    "heavy ball": "เฮฟวี่บอล",
    "hisui heavy ball": "ฮิซุยเฮฟวี่บอล",
    "hisuian heavy ball": "ฮิซุยเฮฟวี่บอล",
    "feather ball": "เฟเธอร์บอล",
    "great ball": "ซูเปอร์บอล",
    "poke ball": "มอนสเตอร์บอล",
    "pokeball": "มอนสเตอร์บอล",
    "master ball": "มาสเตอร์บอล",
    "cherish ball": "เชอริชบอล",
    "buddy-buddy poffin": "โปฟฟินมิตรภาพ",
    "poffin": "โปฟฟิน",
    "rare candy": "ลูกอมประหลาด",
    "candy": "ลูกอมประหลาด",
    "super rod": "คันเบ็ดชั้นยอด",
    "rod": "คันเบ็ด",
    "ordinary rod": "คันเบ็ดธรรมดา",
    "rod max": "คันเบ็ด MAX",
    "switch": "สับเปลี่ยนโปเกมอน",
    "escape rope": "เชือกหลบหนี",
    "rope": "เชือกหลบหนี",
    "switch cart": "รถเข็นสับเปลี่ยน",
    "night stretcher": "เปลหามยามราตรี",
    "stretcher": "เปลหามยามราตรี",
    "rescue stretcher": "เปลพยาบาลฉุกเฉิน",
    "counter catcher": "เคาน์เตอร์แคชเชอร์",
    "prime catcher": "ไพรม์แคชเชอร์",
    "pokemon catcher": "โปเกมอนแคชเชอร์",
    "cross switcher": "ครอสสวิตเชอร์",
    "earthen vessel": "โถดินเผาโบราณ",
    "vessel": "โถดินเผาโบราณ",
    "mirage gate": "เกตมายา",
    "lost vacuum": "ลอสต์สวีปเปอร์",
    "vacuum": "ลอสต์สวีปเปอร์",
    "energy retrieval": "กู้คืนเอนเนอร์จี้",
    "superior energy retrieval": "กู้คืนเอนเนอร์จี้ชั้นยอด",
    "energy search": "ค้นหาเอนเนอร์จี้",
    "energy switch": "สับเปลี่ยนเอนเนอร์จี้",
    "energy recycler": "นำเอนเนอร์จี้กลับมารีไซเคิล",
    "trekking shoes": "รองเท้าเดินป่า",
    "shoes": "รองเท้าเดินป่า",
    "pal pad": "สมุดเพื่อน",
    "pokégear 3.0": "โปเกเกียร์ 3.0",
    "pokegear": "โปเกเกียร์ 3.0",
    "poképad": "โปเกมอนแท็บเล็ต",
    "poké pad": "โปเกมอนแท็บเล็ต",
    "poke pad": "โปเกมอนแท็บเล็ต",
    "pokemon tablet": "โปเกมอนแท็บเล็ต",
    "battle vip pass": "แบทเทิล VIP พาส",
    "vip pass": "แบทเทิล VIP พาส",
    "crushing hammer": "ค้อนสลายพลังงาน",
    "enhanced hammer": "ค้อนดัดแปลง",
    "unfair stamp": "อันแฟร์สแตมป์",
    "special red card": "ใบแดงพิเศษ",
    "red card": "ใบแดงพิเศษ",
    "fog crystal": "ผลึกหมอกควัน",
    "scoop up net": "ตาข่ายเก็บกู้",
    "dark patch": "ดาร์กแพทช์",
    "metal saucer": "จานร่อนโลหะ",
    "electromagnetic radar": "เรดาร์คลื่นแม่เหล็กไฟฟ้า",
    "turbo patch": "เทอร์โบแพทช์",
    "gutsy pickaxe": "อีเตอร์ใจเด็ด",
    "unidentified fossil": "ฟอสซิลที่ยังไม่จำแนก",
    "capturing aroma": "กลิ่นหอมดึงดูดใจ",
    "mesagoza": "เมซาโกซา",
    "artazon": "อาร์ทาซอน",
    "town store": "ทาวน์สโตร์",
    "path to the peak": "ทางขึ้นสู่ยอดเขาหิมะ",
    "temple of sinnoh": "วิหารซินโอ",
    "magma basin": "แอ่งภูเขาไฟลาวา",
    "lost city": "ลอสต์ซิตี้",
    "beach court": "บีชคอร์ท",
    "jamming tower": "จัมมิ่งทาวเวอร์",
    "neutral center": "นิวทรัลเซนเตอร์",
    "grand tree": "ต้นไม้ใหญ่",
    "risky ruins": "ซากปรักอันตราย",
    "dangerous ruins": "ซากปรักอันตราย",
    "ruins": "ซากปรักอันตราย",
    "area zero underdepths": "โพรงถ้ำใหญ่ซีโร่",
    "battle colosseum": "แบตเทิลโคลอสเซียม",
    "gravity mountain": "กราวิตีเมาน์เทน",
    "pokestop": "โปเกสต็อป",
    "collapsed stadium": "สนามกีฬาพังทลาย",
    "lake acuity": "ทะเลสาบเอคิวตี",
    "training court": "เทรนนิงคอร์ท",

    // Basic Energies
    "fire energy": "พลังงานพื้นฐาน[ไฟ]",
    "darkness energy": "พลังงานพื้นฐาน[ความมืด]",
    "dark energy": "พลังงานพื้นฐาน[ความมืด]",
    "psychic energy": "พลังงานพื้นฐาน[พลังจิต]",
    "water energy": "พลังงานพื้นฐาน[น้ำ]",
    "lightning energy": "พลังงานพื้นฐาน[สายฟ้า]",
    "grass energy": "พลังงานพื้นฐาน[หญ้า]",
    "fighting energy": "พลังงานพื้นฐาน[ต่อสู้]",
    "metal energy": "พลังงานพื้นฐาน[โลหะ]",
    "basic fire energy": "พลังงานพื้นฐาน[ไฟ]",
    "basic darkness energy": "พลังงานพื้นฐาน[ความมืด]",
    "basic psychic energy": "พลังงานพื้นฐาน[พลังจิต]",
    "basic water energy": "พลังงานพื้นฐาน[น้ำ]",
    "basic lightning energy": "พลังงานพื้นฐาน[สายฟ้า]",
    "basic grass energy": "พลังงานพื้นฐาน[หญ้า]",
    "basic fighting energy": "พลังงานพื้นฐาน[ต่อสู้]",
    "basic metal energy": "พลังงานพื้นฐาน[โลหะ]",

    // Tools
    "bravery charm": "เครื่องรางความกล้า",
    "charm": "เครื่องรางความกล้า",
    "hero's cape": "ผ้าคลุมของฮีโร่",
    "cape": "ผ้าคลุมของฮีโร่",
    "forest seal stone": "หินตราผนึกแห่งป่า",
    "seal stone": "หินตราผนึกแห่งป่า",
    "sky seal stone": "หินตราผนึกแห่งท้องฟ้า",
    "choice belt": "เข็มขัดแห่งการเลือก",
    "belt": "เข็มขัดแห่งการเลือก",
    "air balloon": "บอลลูนลอยฟ้า",
    "balloon": "บอลลูนลอยฟ้า",
    "float stone": "หินลอยตัว",
    "heavy baton": "ไม้บาตองหนักอึ้ง",
    "baton": "ไม้บาตองหนักอึ้ง",
    "technical machine: evolution": "แมชชีนเทคนิค: การวิวัฒนาการ",
    "technical machine: devolution": "แมชชีนเทคนิค: การคลายวิวัฒนาการ",
    "technical machine: crisis punch": "แมชชีนเทคนิค: ไครซิสพันช์",
    "technical machine: blindside": "แมชชีนเทคนิค: ลอบโจมตี",
    "maximum belt": "แม็กซิมัมเบลท์",
    "reboot pod": "รีบูตพ็อด",
    "survival brace": "สายรัดเอาชีวิตรอด",
    "secret box": "กล่องความลับ",
    "hyper aroma": "ไฮเปอร์อโรมา",
    "sparkling crystal": "สปาร์กลิงคริสตัล",
    "miracle headset": "มิราเคิลเฮดเซ็ต",
    "scramble switch": "สแครมเบิลสวิตช์",
    "precious trolley": "รถเข็นล้ำค่า",
    "brilliant blender": "เครื่องปั่นเจิดจรัส",
    "megaton blower": "โบลเวอร์ล้านตัน",
    "powerglass": "พาวเวอร์กลาส",

    // Special Energies
    "double turbo energy": "ดับเบิลเทอร์โบเอนเนอร์จี้",
    "jet energy": "เจ็ทเอนเนอร์จี้",
    "reversal energy": "รีเวอร์ซอลเอนเนอร์จี้",
    "mist energy": "มิสต์เอนเนอร์จี้",
    "legacy energy": "เลกาซีเอนเนอร์จี้",
    "neo upper energy": "นีโออัปเปอร์เอนเนอร์จี้",
    "boomerang energy": "บูมเมอแรงเอนเนอร์จี้",
    "enriching energy": "เอนริชชิงเอนเนอร์จี้",
    "treasure energy": "เทรเชอร์เอนเนอร์จี้",
    "luminous energy": "ลูมินัสเอนเนอร์จี้",
    "therapeutic energy": "เซราพีติกเอนเนอร์จี้",
    "gift energy": "กิฟต์เอนเนอร์จี้",
    "v guard energy": "V การ์ดเอนเนอร์จี้",
    "rapid strike energy": "เอนเนอร์จี้จู่โจมต่อเนื่อง",
    "single strike energy": "เอนเนอร์จี้จู่โจมครั้งเดียว",
    "fusion strike energy": "เอนเนอร์จี้จู่โจมแบบฟิวชัน",
    "aurora energy": "ออโรราเอนเนอร์จี้",
    "capture energy": "แคปเจอร์เอนเนอร์จี้",
    "speed lightning energy": "เอนเนอร์จี้สปีดสายฟ้า",
    "horror psychic energy": "เอนเนอร์จี้เฮอเรอร์พลังจิต",
    "twin energy": "ทวินเอนเนอร์จี้",
    "powerful colorless energy": "เอนเนอร์จี้พาวเวอร์ฟูลไร้สี",
    "coating metal energy": "เอนเนอร์จี้โคตติ้งโลหะ",
    "wash water energy": "เอนเนอร์จี้วอชน้ำ",
    "aromatic grass energy": "เอนเนอร์จี้อโรมากราส",
    "hide darkness energy": "เอนเนอร์จี้ไฮด์ความมืด",
    "stone fighting energy": "เอนเนอร์จี้สโตนต่อสู้",
    "spiral energy": "เอนเนอร์จี้หมุนวน",
    "impact energy": "เอนเนอร์จี้กระแทก",
    "lucky energy": "ลักกี้เอนเนอร์จี้",
  };

  const outputData = {
    pokemon: enToTh,
    trainers: trainers,
    prefixes: prefixes,
  };

  const outPath = path.join(__dirname, '../src/data/pokemonNameTranslations.json');
  fs.writeFileSync(outPath, JSON.stringify(outputData, null, 2), 'utf8');
  console.log(`Saved translations dictionary to ${outPath} (${Object.keys(enToTh).length} Pokémon, ${Object.keys(trainers).length} Trainers)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
