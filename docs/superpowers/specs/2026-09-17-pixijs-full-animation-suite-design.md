# PixiJS v8 Hardware-Accelerated Animation Suite & Enhanced UI Design

## 1. Overview
This design document defines the high-performance GPU animation and visual effects enhancements for the Pokémon TCG Playmat using **PixiJS v8**. It delivers a tournament-grade visual presentation (combat projectile bursts, floating damage numbers with physics bounce, energy attachment orbs, card deal arcs, turn banners, and holographic card sheen) while maintaining 100% gameplay logic, multiplayer synchronization, and responsive DOM interaction parity.

---

## 2. Architecture & Layering

The system adopts a **Layered Hybrid WebGL Architecture**:
```
┌─────────────────────────────────────────────────────────┐
│ DOM Layer (React)                                       │
│ - High-DPI typography & Thai card text                   │
│ - Responsive slot layout & Pointer / Drag event triggers│
│ - Action sheets, Modals, History drawer, Dock controls  │
├─────────────────────────────────────────────────────────┤
│ PixiJS v8 WebGL VFX Overlay Layer                        │
│ - Combat Projectiles, Impact Bursts, Floating Damage    │
│ - Card Draw Bezier Arcs & Energy Attachment Spirals     │
│ - Cinematic "YOUR TURN / เทิร์นของคุณ" Banner            │
│ - Holographic Foil Light Sweeps on Active Pokémon       │
│ - GPU Particle System & Dual Stadium Floodlights        │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Core Subsystems

### 3.1 Combat VFX & Floating Damage Engine (`PixiCombatVfx.ts`)
- **Energy Projectile**: High-velocity glowing plasma bolt launched from attacking Pokémon to defending Pokémon along a dynamic Bezier vector.
- **Impact Explosion**: Multi-ring particle burst, radial flash, and expanding shockwave ring on impact.
- **Floating Damage Numbers (`PixiDamageFloater`)**:
  - Rendered via PixiJS Text / Graphics with glowing drop-shadow.
  - Initial scale explosion (`scale: 1.8 -> 1.0`) with upward velocity and elastic bounce settling.
  - Alpha fadeout after 1200ms.
- **Screen Shake Judder**: Dynamic camera shake on attacks dealing >= 120 damage.

### 3.2 Cinematic Turn Banner (`PixiTurnBanner.ts`)
- Triggered whenever `state.currentTurn` changes.
- Displays a horizontal radiant banner across the center of the tabletop:
  - Gold / Indigo gradient ribbon with particle sparks.
  - Bold Thai typography: **"เทิร์นของคุณ (YOUR TURN)"** หรือ **"เทิร์นของฝ่ายตรงข้าม (OPPONENT'S TURN)"**.
  - Fast slide-in from left, subtle float in center (600ms), and energetic slide-out to right.

### 3.3 Card Flight & Energy Attachment VFX (`PixiCardFlight.ts`)
- **Card Draw Arc**: Trailing stardust path curving from the Deck stack to the player's Hand when a card is drawn.
- **Energy Attachment**: Glowing orb of the matching elemental color spiraling into the target Pokémon card with a soft chime flash.

### 3.4 Active Holo Foil Shimmer (`PixiHoloShimmer.ts`)
- Diagonal specular beam sweeping across the surface of the Active Pokémon cards every 4 seconds.
- Multi-color iridescent sheen for ex / Ultra Rare / Special Illustration cards.

### 3.5 HUD & Diagnostics
- Maintained at bottom-left corner with low visual intrusion:
  - `⚡ PIXI {fps} FPS • {count} Particles • [VFX: ON/OFF]`
  - One-click toggle allowing users to disable particle animations on low-power devices.

---

## 4. Quality & Compatibility Gates
- **Thai Language Priority**: All user-facing text (e.g. turn banner, action logs, damage notifications) prioritizes Thai text according to repository rules.
- **Performance Budget**: Particle pool cap of 300 active particles to guarantee solid 60 FPS on mobile and low-spec laptops.
- **Automated Verification**:
  - Unit tests covering all animation lifecycle methods and math calculations.
  - Playwright E2E tests running on WebKit validating turn transitions, combat animations, and multiplayer sync.
