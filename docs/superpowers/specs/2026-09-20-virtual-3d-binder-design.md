# Design Specification: Virtual 3D Realistic Card Binder (สมุดสะสมการ์ด 3D เสมือนจริง)

**Date**: 2026-09-20  
**Author**: Antigravity  
**Status**: Ready for Review  
**Branch**: `feature/virtual-3d-binder`  

---

## 1. Overview & Goal

The user requested shifting focus from gameplay to the **Collection / Collector side** of Pokémon TCG by building a **Virtual 3D Realistic Card Binder (สมุดสะสมการ์ด 3D เสมือนจริง)**:
- Realistic leather covers, metal binder rings, and sleeve customization.
- Smooth page-turning physics and interactive 3D card tilt with holographic foil sheen.
- Dual organization modes:
  1. **Auto-Set Binder**: Automatically ordered by set collector numbers with transparent ghost silhouettes for missing cards.
  2. **Custom Showcase Binder**: User-created themed binders (e.g. SAR Showcase, Charizard Shrine) with freeform drag-and-drop card placement.
- Seamless view toggle in the Collection tab between **Grid View** and **3D Binder View**.

---

## 2. Architecture & Data Model

### 2.1 State & Storage (`collectionStore.ts` / `customBinderStore.ts`)

```typescript
export interface BinderSlotItem {
  cardId: string;           // e.g. "sv6-130"
  instanceId?: string;       // Unique instance ID if mapped to specific inventory item
  variant?: string;          // "normal" | "holo" | "reverseHolo" | "pokeball" | "masterball"
  notes?: string;
}

export interface BinderPage {
  pageNumber: number;        // 1-indexed
  slots: (BinderSlotItem | null)[]; // null represents an empty pocket
}

export interface CustomBinder {
  id: string;
  name: string;              // e.g. "ลิซาร์ดอน & ไฟเออร์ คอลเลกชัน"
  description?: string;
  coverStyle: 'leather-black' | 'leather-brown' | 'leather-burgundy' | 'pokeball-red' | 'ultra-ball';
  sleeveColor: 'clear' | 'matte-black' | 'matte-white' | 'holographic' | 'gold-foil' | 'royal-blue';
  pocketLayout: '4-pocket' | '9-pocket' | '12-pocket';
  pages: BinderPage[];
  createdAt: number;
  updatedAt: number;
}
```

### 2.2 Dual Binder Modes
1. **Auto-Set Mode (`auto-set`)**:
   - Computes pages on-the-fly from the currently selected set in `collectionStore`.
   - Cards are ordered strictly by collector number (`number`).
   - Cards owned by user are rendered with full artwork and variant badges.
   - Unowned cards are rendered as semi-transparent silhouettes (`opacity-25`) displaying card number and Thai/English name, acting as a visual checklist for set completion.
2. **Custom Binder Mode (`custom`)**:
   - User creates and manages arbitrary binders with custom names and covers.
   - Pockets can be filled by dragging from a slide-out drawer or clicking an empty pocket to open a card picker.

---

## 3. Visual & Interaction Design

```
+---------------------------------------------------------------------------------------+
|  Top Controls: [ ⊞ ตารางปกติ ] [ 📖 สมุดสะสม 3D ]  |  เลือกชุด/สมุด  | ⚙️ แต่งสมุด  | 🔍 ซูม  |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   +---------------------------------+  RINGS  +---------------------------------+     |
|   |         LEFT PAGE SHEET         |  ( o )  |        RIGHT PAGE SHEET         |     |
|   |  +-----+   +-----+   +-----+    |  ( o )  |  +-----+   +-----+   +-----+    |     |
|   |  |  1  |   |  2  |   |  3  |    |  ( o )  |  | 10  |   | 11  |   | 12  |    |     |
|   |  +-----+   +-----+   +-----+    |  ( o )  |  +-----+   +-----+   +-----+    |     |
|   |  +-----+   +-----+   +-----+    |  ( o )  |  | 13  |   | 14  |   | 15  |    |     |
|   |  |  4  |   |  5  |   |  6  |    |  ( o )  |  +-----+   +-----+   +-----+    |     |
|   |  +-----+   +-----+   +-----+    |  ( o )  |  | 16  |   | 17  |   | 18  |    |     |
|   |  +-----+   +-----+   +-----+    |  ( o )  |  +-----+   +-----+   +-----+    |     |
|   |  |  7  |   |  8  |   |  9  |    |  ( o )  |  | 19  |   | 20  |   | 21  |    |     |
|   |  +-----+   +-----+   +-----+    |  ( o )  |  +-----+   +-----+   +-----+    |     |
|   |             หน้า 1               |  SPINE  |              หน้า 2             |     |
|   +---------------------------------+         +---------------------------------+     |
|  <<< แผ่นซ้าย (Page Stacks Depth)                 แผ่นขวา (Page Stacks Depth) >>>    |
+---------------------------------------------------------------------------------------+
|  Bottom Bar: [ ◀ หน้าก่อนหน้า ]  [  หน้า 1-2 / 16  ]  [ หน้าถัดไป ▶ ]  (Swipe / Slider) |
+---------------------------------------------------------------------------------------+
```

### 3.1 Book Spread Layout (Desktop vs Mobile)
- **Desktop (PC / Tablet Landscape)**:
  - 2-Page Spread: Left Page + Right Page displayed side-by-side with genuine center spine shadow and 3D metal rings.
  - Page stack edges simulate book thickness corresponding to remaining pages.
- **Mobile (Smartphones)**:
  - Single-Page View (2x2 or 3x3 grid) with responsive card proportions.
  - Swipe left/right gesture turning pages smoothly.

### 3.2 Pocket Layer Hierarchy (Inside Each Slot)
1. **Binder Page Backing**: Textured archival black/white backing sheet with welded seam borders.
2. **Inner Sleeve**: Colored backing matching user's selected sleeve style (Matte Black, Holographic, Gold Foil, etc.).
3. **Card Artwork**: High-resolution image (with Balatro 3D interactive tilt on hover).
4. **Plastic Pocket Overlay**: Semi-reflective clear plastic sheen (`backdrop-filter: brightness(1.02)`) with a top-loading opening slit effect.
5. **Foil / Shimmer Glint**: Polychrome dynamic lighting sheen reacting to mouse motion.

### 3.3 Page Turning Animation
- CSS 3D transform (`perspective(1400px)` + `rotateY`) with realistic drop-shadow casting across the adjacent page during turn.
- Turn duration: 320ms with cubic-bezier ease-out.
- Keyboard shortcuts: `ArrowLeft` / `ArrowRight` or `A` / `D`.

---

## 4. Component Structure

- `src/components/collection/binder/Virtual3DBinderView.tsx`: Main container hosting the 3D book canvas, navigation headers, and toolbar.
- `src/components/collection/binder/BinderBookSpread.tsx`: 3D book spread container, leather cover styling, spine, and metal binder rings.
- `src/components/collection/binder/BinderPageSheet.tsx`: Individual binder page holding grid slots, page numbering, and turn animations.
- `src/components/collection/binder/BinderPocketSlot.tsx`: Single card pocket with sleeve, plastic sheen, foil effect, and click/drag handlers.
- `src/components/collection/binder/BinderSettingsModal.tsx`: Customization modal for cover materials, sleeve styles, and pocket configurations.
- `src/components/collection/binder/BinderCardPickerDrawer.tsx`: Drawer for adding cards into custom binder pockets.

---

## 5. Automated Verification & Quality Gates

1. **Unit Tests (`vitest`)**:
   - Binder page pagination calculations (e.g. 18 cards per spread in 9-pocket mode).
   - Auto-set missing card silhouette generation.
   - Custom binder CRUD operations and persistence.
2. **Automated E2E Tests (`playwright`)**:
   - `e2e/virtual-3d-binder.spec.ts`:
     - Toggle between Grid View and 3D Binder View.
     - Verify page turn forward and backward.
     - Verify card click opens `CardImagePreviewModal`.
     - Customize binder cover & sleeve color.
3. **Lint & Build**:
   - `npm run lint` with 0 errors.
   - `npm run build` with 0 errors.
