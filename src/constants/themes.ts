export type ThemeId = 'midnight' | 'pokemon' | 'mystic' | 'pixel';

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  preview: string;

  appBg: string;
  centerBg: string;
  centerBorder: string;
  centerText: string;

  card: string;
  cardEmpty: string;
  cardActive: string;
  cardActiveEmpty: string;
  cardKO: string;
  cardDrag: string;

  cardText: string;
  cardEmptyText: string;
  activeText: string;
  activeEmptyText: string;

  headerOn: string;
  headerOff: string;
  headerNameOn: string;
  headerNameOff: string;
  headerTurnBadge: string;
  headerDot: string;
  headerDotOff: string;
}

// SVG patterns as inline data URIs — no external files needed
const pat = (svg: string, size: string) =>
  `url("data:image/svg+xml,${svg}") repeat center / ${size}`;

// 🌑 Pokéball rings — white outlines on dark
const POKEBALL = pat(
  "%3Csvg xmlns='http://www.w3.org/2000/svg' width='70' height='70'%3E" +
  "%3Ccircle cx='35' cy='35' r='26' fill='none' stroke='white' stroke-width='1.5' opacity='0.1'/%3E" +
  "%3Cline x1='9' y1='35' x2='61' y2='35' stroke='white' stroke-width='1.5' opacity='0.1'/%3E" +
  "%3Ccircle cx='35' cy='35' r='7' fill='none' stroke='white' stroke-width='2' opacity='0.1'/%3E" +
  "%3Ccircle cx='35' cy='35' r='3' fill='white' opacity='0.07'/%3E" +
  "%3C/svg%3E",
  "70px 70px"
);

// ⚡ Lightning bolts — gold on blue (Pikachu-style)
const LIGHTNING = pat(
  "%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='70'%3E" +
  "%3Cpath d='M33 2 L17 37 L28 37 L22 68 L45 27 L32 27 Z' fill='gold' opacity='0.18'/%3E" +
  "%3C/svg%3E",
  "50px 70px"
);

// 🔮 Five-pointed stars — violet on dark purple
const STARS = pat(
  "%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E" +
  "%3Cpath d='M30 6 L33 22 L48 22 L36.5 31 L41 47 L30 38.5 L19 47 L23.5 31 L12 22 L27 22 Z' fill='none' stroke='violet' stroke-width='1.2' opacity='0.22'/%3E" +
  "%3Ccircle cx='5' cy='5' r='1.5' fill='violet' opacity='0.2'/%3E" +
  "%3Ccircle cx='55' cy='55' r='1.5' fill='violet' opacity='0.2'/%3E" +
  "%3C/svg%3E",
  "60px 60px"
);

// 🕹️ Pixel dots — lime on dark green (retro Game Boy)
const PIXELS = pat(
  "%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E" +
  "%3Crect x='8' y='8' width='4' height='4' fill='lime' opacity='0.13'/%3E" +
  "%3C/svg%3E",
  "20px 20px"
);

export const THEMES: Record<ThemeId, Theme> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    emoji: '🌑',
    preview: 'linear-gradient(135deg, #030712 0%, #1e3a5f 100%)',

    appBg: `${POKEBALL}, #030712`,
    centerBg: 'bg-gray-900/50',
    centerBorder: 'border-gray-700/50',
    centerText: 'text-gray-500',

    card: 'bg-gray-800/70 border-gray-600 hover:border-gray-500',
    cardEmpty: 'bg-gray-800/30 border-gray-700/50 border-dashed hover:border-gray-600',
    cardActive: 'bg-gray-800/80 border-blue-500/50 ring-1 ring-blue-500/20',
    cardActiveEmpty: 'bg-gray-800/30 border-blue-500/30 border-dashed',
    cardKO: 'bg-red-950/60 border-red-700',
    cardDrag: 'bg-blue-900/40 border-blue-400 ring-2 ring-blue-400',

    cardText: 'text-gray-200',
    cardEmptyText: 'text-gray-600',
    activeText: 'text-blue-200',
    activeEmptyText: 'text-blue-500/60',

    headerOn: 'bg-blue-900/40 border border-blue-600/50',
    headerOff: 'bg-gray-800/50 border border-gray-700/50',
    headerNameOn: 'text-blue-300',
    headerNameOff: 'text-gray-300',
    headerTurnBadge: 'text-blue-400',
    headerDot: 'bg-blue-400',
    headerDotOff: 'bg-gray-600',
  },

  pokemon: {
    id: 'pokemon',
    name: 'Pokémon',
    emoji: '⚡',
    preview: 'linear-gradient(135deg, #1565C0 0%, #FFCB05 100%)',

    appBg: `${LIGHTNING}, linear-gradient(180deg, #0D47A1 0%, #1565C0 45%, #0D47A1 100%)`,
    centerBg: 'bg-sky-800/70',
    centerBorder: 'border-yellow-500/40',
    centerText: 'text-sky-300',

    card: 'bg-sky-900/65 border-sky-500/40 hover:border-sky-300/60',
    cardEmpty: 'bg-sky-950/40 border-sky-600/30 border-dashed hover:border-sky-400/50',
    cardActive: 'bg-yellow-900/55 border-yellow-400/65 ring-1 ring-yellow-400/25',
    cardActiveEmpty: 'bg-yellow-950/30 border-yellow-600/30 border-dashed',
    cardKO: 'bg-red-950/70 border-red-500',
    cardDrag: 'bg-sky-700/55 border-sky-200 ring-2 ring-sky-200',

    cardText: 'text-sky-100',
    cardEmptyText: 'text-sky-500/70',
    activeText: 'text-yellow-200',
    activeEmptyText: 'text-yellow-500/60',

    headerOn: 'bg-yellow-900/55 border border-yellow-500/55',
    headerOff: 'bg-sky-900/55 border border-sky-700/50',
    headerNameOn: 'text-yellow-300',
    headerNameOff: 'text-sky-200',
    headerTurnBadge: 'text-yellow-400',
    headerDot: 'bg-yellow-400',
    headerDotOff: 'bg-sky-700',
  },

  mystic: {
    id: 'mystic',
    name: 'Mystic',
    emoji: '🔮',
    preview: 'linear-gradient(135deg, #0D0820 0%, #7C3AED 100%)',

    appBg: `${STARS}, linear-gradient(180deg, #0D0820 0%, #180A38 50%, #0D0820 100%)`,
    centerBg: 'bg-violet-950/60',
    centerBorder: 'border-violet-600/40',
    centerText: 'text-violet-400',

    card: 'bg-violet-950/65 border-violet-500/40 hover:border-violet-400/65',
    cardEmpty: 'bg-violet-950/30 border-violet-600/30 border-dashed hover:border-violet-500/45',
    cardActive: 'bg-fuchsia-950/60 border-fuchsia-400/65 ring-1 ring-fuchsia-400/20',
    cardActiveEmpty: 'bg-fuchsia-950/25 border-fuchsia-600/30 border-dashed',
    cardKO: 'bg-red-950/70 border-red-500',
    cardDrag: 'bg-violet-700/45 border-violet-300 ring-2 ring-violet-300',

    cardText: 'text-violet-100',
    cardEmptyText: 'text-violet-600/70',
    activeText: 'text-fuchsia-200',
    activeEmptyText: 'text-fuchsia-500/60',

    headerOn: 'bg-fuchsia-950/55 border border-fuchsia-500/55',
    headerOff: 'bg-violet-950/55 border border-violet-700/50',
    headerNameOn: 'text-fuchsia-300',
    headerNameOff: 'text-violet-200',
    headerTurnBadge: 'text-fuchsia-400',
    headerDot: 'bg-fuchsia-400',
    headerDotOff: 'bg-violet-800',
  },

  pixel: {
    id: 'pixel',
    name: 'Pixel',
    emoji: '🕹️',
    preview: 'linear-gradient(135deg, #052e16 0%, #166534 100%)',

    appBg: `${PIXELS}, linear-gradient(180deg, #052e16 0%, #14532d 100%)`,
    centerBg: 'bg-green-950/60',
    centerBorder: 'border-green-700/50',
    centerText: 'text-green-500',

    card: 'bg-green-950/65 border-green-700/50 hover:border-green-500/65',
    cardEmpty: 'bg-green-950/30 border-green-800/40 border-dashed hover:border-green-700/50',
    cardActive: 'bg-emerald-950/60 border-emerald-400/65 ring-1 ring-emerald-400/20',
    cardActiveEmpty: 'bg-emerald-950/25 border-emerald-700/30 border-dashed',
    cardKO: 'bg-red-950/70 border-red-500',
    cardDrag: 'bg-green-700/45 border-green-300 ring-2 ring-green-300',

    cardText: 'text-green-100',
    cardEmptyText: 'text-green-700/70',
    activeText: 'text-emerald-200',
    activeEmptyText: 'text-emerald-600/60',

    headerOn: 'bg-emerald-950/55 border border-emerald-500/55',
    headerOff: 'bg-green-950/55 border border-green-800/50',
    headerNameOn: 'text-emerald-300',
    headerNameOff: 'text-green-300',
    headerTurnBadge: 'text-emerald-400',
    headerDot: 'bg-emerald-400',
    headerDotOff: 'bg-green-800',
  },
};

export const THEME_ORDER: ThemeId[] = ['midnight', 'pokemon', 'mystic', 'pixel'];
