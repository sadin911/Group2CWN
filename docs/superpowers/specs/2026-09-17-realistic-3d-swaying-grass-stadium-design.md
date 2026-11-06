# Design Specification: Realistic 3D Swaying Grass Championship Stadium

**Date**: 2026-09-17  
**Author**: Antigravity  
**Status**: Pending Review  
**Branch**: `feature/playmat-new-engine`  

---

## 1. Overview & Goal

The user requested a genuinely **3D realistic grass stadium** where the grass is alive, waving, and swaying in the stadium wind (*"อยากได้สวยงามแบบ 3d realistic เลยแพ นึกออกไหม แบบสนามหญ้า สมจริง โบกสะบัด สวยงาม"*).

The goal of this design is to deliver a **AAA-tier Hybrid Realistic Championship Stadium** featuring:
1. **Dynamic Wind Wave Turf**: A photorealistic 3D grass turf surface where rolling wind gusts create shimmering light reflections across bent grass blades under floodlights.
2. **Procedural 3D Swaying Grass Blade Clusters**: Physical clusters of individual grass blades along touchlines, sidelines, and perimeter edges that physically bend and sway in the stadium breeze using Bezier physics.
3. **Atmospheric Floodlight Dew & Pollen Motes**: Micro-particles floating through halogen floodlight beams.
4. **1:1 Board Midline Precision**: Perfectly centered onto `#center-board-zone`.
5. **Zero Performance Impact**: 60fps hardware-accelerated WebGL with 0 GC overhead.

---

## 2. Architecture & Components

```
+-------------------------------------------------------------------------+
|                        PixiTabletopVfxLayer                             |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                   PixiStadiumSpotlight (Background)               |  |
|  |                                                                   |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  | 1. Atmospheric Floodlight Beams & Grandstands               |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  | 2. Realistic 3D Bermuda Grass Base (8 Mowed Stripes)        |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  | 3. Dynamic WebGL Wind Wave Shimmer Layer                   |  |  |
|  |  |    - Rolling wind gusts across pitch (sin/cosine wave math) |  |  |
|  |  |    - Dynamic specular reflection on blade surface           |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  | 4. Official White Chalk Lines & Painted Turf Pokéball Crest  |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  | 5. Procedural Swaying 3D Grass Blade Clusters              |  |  |
|  |  |    - 120+ organic grass tufts (sidelines, technical boxes)  |  |  |
|  |  |    - Bending quadratic Bezier curves with wind inertia      |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  |  | 6. Atmospheric Dew / Pollen Spore Floating Motes            |  |  |
|  |  +-------------------------------------------------------------+  |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                     PixiTurnBanner & Combat VFX                   |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 3. Technical Details

### 3.1 Wind Wave Vector Field on Grass Turf
- Wind vector: travels at an angle across the pitch (from top-left `(-0.7, -0.3)` to bottom-right).
- Variable wind speed: baseline gentle breeze (`speed = 0.03`) with occasional undulating gust impulses (`gustFactor = sin(t * 0.4) * 0.35 + 0.65`).
- Surface Shimmer:
  - 8 perspective strips are rendered with gradient depth.
  - A dynamic lighting wave overlay modulates brightness by `±8%` in rolling bands across the grass, mimicking how real stadium turf changes sheen when grass blades bend under moving wind.

### 3.2 Procedural 3D Swaying Grass Blade Clusters
- Placed along:
  - Left & Right touchline fringes (`x = 100-140` and `x = 1300-1340`).
  - Top & Bottom bench dugout boundaries (`y = 150-180` and `y = 720-750`).
  - Active Box corners and perimeter concrete curb.
- Structure of each blade:
  - Base: anchored at `(x0, y0)`.
  - Blade height: 12px to 28px depending on perspective `y` position (closer to camera = taller).
  - Tapering polygon or quadratic Bezier curve with color gradient (dark emerald base `0x153e1a` to golden-green sunlit tip `0x4ade80`).
  - Tip displacement:
    ```typescript
    const windDisplacement = Math.sin(time * 2.5 + x0 * 0.01 + y0 * 0.015) * gustPower * (height * 0.45);
    const tipX = x0 + windDisplacement;
    const tipY = y0 - height + Math.abs(windDisplacement) * 0.15; // natural dip when bent
    ```

### 3.3 Atmospheric Floodlight Motes
- 35 lightweight floating spore/dew particles.
- Drift smoothly with wind vectors through the 4 floodlight beams.
- Alpha modulates based on distance to floodlight focal points, creating realistic illuminated stadium air.

---

## 4. Performance & Memory Budget

- **Draw Calls**: All swaying blades batched into a single dynamic `Graphics` context cleared and redrawn per frame.
- **Garbage Collection**: Reuses fixed arrays of blade definitions; 0 allocations per frame.
- **FPS Target**: Rock-solid 60 FPS on WebGL/WebGPU.
- **Fallbacks**: If WebGL context is lost or constrained, gracefully stays stable with base pitch.

---

## 5. Verification Plan

1. **Visual Quality**: Verify realistic natural grass appearance, noticeable wind sway along sidelines, and rolling shimmer waves across the pitch.
2. **Automated E2E Tests**: Playwright WebKit test suite (`e2e/playmat-pixi-engine.spec.ts` & `e2e/playmat-bench-expansion.spec.ts`).
3. **Unit Tests**: Full Vitest test suite (`npm test`).
4. **Linting & Build**: `npm run lint` and `npm run build`.
