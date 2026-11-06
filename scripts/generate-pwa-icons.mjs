import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');

// Create a high quality 512x512 SVG Pokéball icon with Masterball / PokéCount purple-indigo glow aesthetic
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#1e1b4b" />
      <stop offset="60%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#030712" />
    </radialGradient>

    <!-- Pokéball Top Half Gradient (Vibrant Royal Purple to Indigo) -->
    <linearGradient id="topBallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#a855f7" />
      <stop offset="50%" stop-color="#7c3aed" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>

    <!-- Pokéball Bottom Half Gradient (Platinum White to Slate) -->
    <linearGradient id="botBallGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="65%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#94a3b8" />
    </linearGradient>

    <!-- Master Ball Accent Wings (Cyan/Magenta glow) -->
    <linearGradient id="wingGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>

    <linearGradient id="wingGradRight" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>

    <!-- Center Button Gradient -->
    <radialGradient id="btnGrad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="70%" stop-color="#e2e8f0" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </radialGradient>

    <!-- Cyan Glow Center Ring -->
    <radialGradient id="cyanGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="60%" stop-color="#0ea5e9" />
      <stop offset="100%" stop-color="#0284c7" />
    </radialGradient>

    <!-- Drop Shadow Filter -->
    <filter id="ballShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.6"/>
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#7c3aed" flood-opacity="0.4"/>
    </filter>

    <filter id="centerGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Squircle / Rounded Background for app icon -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  
  <!-- Subtle Border Glow -->
  <rect width="508" height="508" x="2" y="2" rx="110" fill="none" stroke="#6366f1" stroke-width="3" stroke-opacity="0.3" />

  <!-- Ball Group with Drop Shadow -->
  <g filter="url(#ballShadow)">
    <!-- Main Outer Ball Shell (R=170 at center 256, 256) -->
    <circle cx="256" cy="256" r="170" fill="#0f172a" stroke="#1e1b4b" stroke-width="4" />

    <!-- Top Half (Purple/Indigo) -->
    <path d="M 86 256 A 170 170 0 0 1 426 256 Z" fill="url(#topBallGrad)" />

    <!-- Master Ball Pink Accent Orbs/Puffs on Top -->
    <ellipse cx="160" cy="180" rx="36" ry="24" transform="rotate(-25 160 180)" fill="url(#wingGradLeft)" opacity="0.9" />
    <ellipse cx="352" cy="180" rx="36" ry="24" transform="rotate(25 352 180)" fill="url(#wingGradRight)" opacity="0.9" />

    <!-- "M" or PokéCount Signature Logo mark on top -->
    <path d="M 226 145 L 244 195 L 256 165 L 268 195 L 286 145" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="0.95" />

    <!-- Bottom Half (White/Slate) -->
    <path d="M 86 256 A 170 170 0 0 0 426 256 Z" fill="url(#botBallGrad)" />

    <!-- Center Black Dividing Band -->
    <rect x="86" y="242" width="340" height="28" fill="#0f172a" />

    <!-- Outer Center Ring (Black/Navy) -->
    <circle cx="256" cy="256" r="58" fill="#0f172a" stroke="#1e1b4b" stroke-width="3" />

    <!-- Glowing Cyan Accent Ring -->
    <circle cx="256" cy="256" r="44" fill="url(#cyanGlow)" filter="url(#centerGlow)" opacity="0.9" />

    <!-- Inner Core Button (Pure White/Silver Metallic) -->
    <circle cx="256" cy="256" r="30" fill="url(#btnGrad)" stroke="#0f172a" stroke-width="4" />

    <!-- Button Highlight Flare -->
    <ellipse cx="248" cy="248" rx="8" ry="5" transform="rotate(-30 248 248)" fill="#ffffff" opacity="0.8" />
    
    <!-- Top Shell Gloss Reflection Arc -->
    <path d="M 120 220 A 150 150 0 0 1 392 220" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.25" />
  </g>
</svg>`;

async function generate() {
  const svgBuffer = Buffer.from(svgIcon);

  // 1. Save standard SVG icon
  fs.writeFileSync(path.join(publicDir, 'pwa-icon.svg'), svgIcon);
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgIcon);

  // 2. Generate 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('Created pwa-512x512.png');

  // 3. Generate 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('Created pwa-192x192.png');

  // 4. Generate 180x180 Apple Touch Icon PNG
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 5. Generate Maskable Icon 512x512 (with safe zone padding)
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#0f172a" />
    <g transform="translate(51.2, 51.2) scale(0.8)">
      ${svgIcon.replace(/<svg[^>]*>/, '').replace(/<\/svg>/, '')}
    </g>
  </svg>`;

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'maskable-icon-512x512.png'));
  console.log('Created maskable-icon-512x512.png');

  // 6. Generate 64x64 favicon PNG
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'pwa-64x64.png'));
  console.log('Created pwa-64x64.png');
}

generate().catch(console.error);
