# รายงานสรุปการตรวจสอบและปรับปรุง UX/UI ข้ามแพลตฟอร์ม (UX/UI Modernization Handover)

> **Branch:** `feature/ux-ui-audit-and-improvements`  
> **Version:** `v2.78.0`  
> **วันที่บันทึก:** 14 กันยายน 2569  
> **ผู้ดำเนินการ:** Antigravity IDE (AI Coding Assistant)  
> **เกณฑ์การตรวจสอบ:** WebKit Desktop Safari, Mobile Safari (iPhone 14), Chromium Desktop, Mobile Chrome (Pixel 5) ผ่านการทดสอบระดับ E2E อัตโนมัติทั้งหมด 100%

---

## 1. วัตถุประสงค์ & คำสั่งของผู้ใช้
1. ตรวจสอบ UI ทุกหน้าในระบบ (สมุดสะสม, ระบบจัดเด็ค, กระดานแข่งขัน, หน้าจับคู่การ์ด, หน้า Admin)
2. แก้ไขปัญหา UX/UI ให้ดีขึ้นกว่าเดิมในทุกแพลตฟอร์ม (มือถือจอเล็ก 360–430px, แท็บเล็ต/iPad จอขนาดกลาง 768–1024px, คอมพิวเตอร์เดสก์ท็อป)
3. อนุญาตให้ใช้ **WebKit Safari** ในการตรวจสอบและทดสอบ
4. จดบันทึกรายละเอียดอย่างละเอียด เพื่อให้สามารถกลับมาพัฒนาต่อได้ทันทีหากมีงานเพิ่มเติมในวันหลัง

---

## 2. สรุปรายการปรับปรุง (What was done)

### 2.1 ความสอดคล้องของธีมสว่าง/มืด (Light & Dark Theme Parity)
- **ปัญหาเดิม:** หลายหน้าจอ เช่น `CardCollectionModal`, `CardMappingPage`, `DeckEditor`, `DeckViewModal`, `MissingCardsModal`, และ `AdminPage` ใช้คลาสสี `bg-slate-900`, `bg-slate-950`, `text-white` แบบฮาร์ดโค้ด ทำให้ผู้ใช้ที่เปิดโหมดสว่าง (Light Mode) เจอกรอบมืดทึบ ขอบเขตสีไม่เข้ากับธีม และข้อความคอนทราสต์ต่ำ
- **สิ่งที่ปรับปรุง:**
  - **`CardCollectionModal.tsx`**: ปรับแต่ง root backdrop และ dialog เป็น `bg-white/95 dark:bg-slate-900/95`, เส้นขอบ `border-slate-200 dark:border-slate-700/80`, ปรับแท็บ ReMatch, Price Section, Condition counters และปุ่มบันทึกให้สลับสีตามธีมระบบอย่างสมบูรณ์
  - **`DeckManager.tsx`**: แปลงการ์ดเด็คทุกใบเป็น `bg-white dark:bg-slate-900/90`, ปรับ progress bar ความพร้อมการ์ด และปุ่ม quick action ต่างๆ
  - **`DeckEditor.tsx`**: ปรับพื้นหลังเป็น `bg-slate-100 dark:bg-slate-950`, คอนเทนเนอร์รายการการ์ดและแคตตาล็อกเป็น `bg-white dark:bg-slate-900`, รองรับทั้ง Light/Dark
  - **`DeckViewModal.tsx`**: แปลงทั้งโหมด Grid และโหมด List ให้มี Dual Theme รองรับทั้งกลางวันและกลางคืน, ปรับ Badge สถิติการ์ด (โปเกมอน, เทรนเนอร์, พลังงาน) ให้มีสีสันสดใสทั้งสองโหมด
  - **`MissingCardsModal.tsx`**: แปลงการคำนวณการ์ดที่ขาด, Stat Boxes, รายการการ์ด, และแถบการ์ดชุดอื่น (Alternate Printings) ให้แสดงผลสวยงามทั้ง Light และ Dark
  - **`CardMappingPage.tsx`**: ปรับหน้าจัดการการจับคู่การ์ด TH-EN ทั้งหมดให้รองรับ Light Mode (`bg-slate-50 dark:bg-slate-950`, ตารางสลับสีแถวอ่อน-เข้ม)
  - **`AdminPage.tsx`**: ปรับแผงควบคุม Dashboard, KPI Metrics, กราฟ และตารางสถิติผู้ใช้งานให้แสดงผลแบบ Dual Theme 100%

### 2.2 ประสบการณ์บนมือถือและขนาดพื้นที่กดสัมผัส (Mobile Touch Targets & Responsive)
- **ปัญหาเดิม:**
  - บนมือถือจอแคบ (360px–430px) แถบหัวเรื่องของสมุดสะสมมีปุ่มแอ็กชันหลายปุ่มพร้อมข้อความยาว ทำให้เบียดและเกิดการตกบรรทัด
  - ปุ่ม Quick Action บนการ์ด เช่น ปุ่ม `+1` และปุ่มติดดาว `Wishlist` ใน `CollectionCardItem.tsx` มีพื้นที่สัมผัสเล็กเกินไป (24-28px) ส่งผลให้กดยากบนหน้าจอสัมผัส
- **สิ่งที่ปรับปรุง:**
  - **`CollectionCardItem.tsx`**: ขยายขนาดปุ่ม Quick `+1` เป็น `w-8 h-8 sm:w-9 sm:h-9` พร้อม `after:-inset-1.5` และปุ่ม Wishlist เป็น `w-7 h-7` พร้อม `after:-inset-2` ทำให้ได้ Touch Target ขนาด 36–44px ตามมาตรฐาน UI/UX Mobile Accessibility
  - **`CollectionHeader.tsx`**: ปรับปุ่มเครื่องมือรอง (นำเข้า, จับคู่, แชร์, ส่งออก) ให้ซ่อนข้อความยาวบนมือถือ (`hidden md:inline`) และแสดงเฉพาะไอคอนที่ชัดเจน ป้องกันแถบเครื่องมือล้นบนหน้าจอโทรศัพท์

### 2.3 การจัดวางบน iPad / แท็บเล็ต (Tablet & Split-Screen Ergonomics)
- **ปัญหาเดิม:** `DeckEditor.tsx` ใช้เงื่อนไขการแบ่งคอลัมน์ซ้ายขวา (รายการในเด็ค vs แคตตาล็อกค้นหา) ที่ breakpoint `xl` (1280px) ทำให้แท็บเล็ตและ iPad แนวนอน (1024px) แสดงผลเป็นคอลัมน์แนวตั้งซ้อนกัน ต้องสลับแท็บไปมา
- **สิ่งที่ปรับปรุง:**
  - ปรับ breakpoint ลงมาที่ `lg` (1024px) เพื่อให้ iPad แนวนอนและจอคอมขนาดกะทัดรัดได้พื้นที่แบบ Split 2 คอลัมน์ ทำงานได้รวดเร็วทันที
  - เพิ่มแถบ **Deck Composition Visualizer** แบบสัดส่วนสี (ม่วง=โปเกมอน, ฟ้า=เทรนเนอร์, ส้ม=พลังงาน) ให้เห็นภาพรวมความสมดุลของเด็คทันที

### 2.4 สถาปัตยกรรมการนำทางและปุ่มลัด (Navigation & Shortcuts)
- **ปัญหาเดิม:** ผู้ใช้เข้าถึงโหมดหลัก เช่น Battle Tracker (⚔️ นับแต้มแข่ง) และ Playmat (🎴 โต๊ะจำลอง) ได้ยาก เพราะถูกซ่อนไว้ในเมนูย่อย
- **สิ่งที่ปรับปรุง:**
  - **`BottomNav.tsx`**: นำเสนอเสาหลักของระบบทั้ง 4 อย่างครบถ้วน (`📚 สมุดสะสม`, `🃏 จัดเด็ค`, `⚔️ นับแต้ม`, `🎴 โต๊ะจำลอง`)
  - **`AppHeaderBar.tsx`**: เพิ่มแท็บลัดบน Desktop สำหรับเข้าถึง นับแต้มแข่ง และ โต๊ะจำลอง ได้โดยตรงในคลิกเดียว
  - **Keyboard Accessibility**: เพิ่ม `window.addEventListener('keydown')` รับปุ่ม `ESC` เพื่อปิด Modal ใน `CardCollectionModal.tsx`, `DeckViewModal.tsx` และ `CardMappingPage.tsx` เพิ่มความสะดวกในการทำงานบนคอมพิวเตอร์

### 2.5 ภาษาไทยเป็นอันดับหนึ่ง (Thai Language Priority - Rule 5)
- **ปัญหาเดิม:** `MiniGameBoard.tsx` มีข้อความปุ่มและโมดอลภาษาอังกฤษปะปน เช่น "Board Theme", "Active", "Turn", "Reset", "Energy", "Support", "Confirm New Game"
- **สิ่งที่ปรับปรุง:**
  - แปลงและรองรับภาษาไทยเป็นหลักทั้งหมดตามกฎ Rule 5:
    - "เลือกธีมกระดาน"
    - "ใช้งานอยู่"
    - "จบเทิร์น"
    - "↺ รีเซ็ต"
    - "⚡ พลังงาน"
    - "★ ซัพพอร์ต"
    - "เริ่มเกมใหม่?"

### 2.6 จัดกลุ่มแท็บหน้า Admin ให้เป็นระเบียบ (Admin Information Architecture)
- **ปัญหาเดิม:** `AdminPage.tsx` มีแถบเมนูแนวนอนยาวติดต่อกันถึง 11 แท็บ ทำให้เลื่อนดูยาก
- **สิ่งที่ปรับปรุง:**
  - จัดระเบียบเป็น 3 กลุ่มหลัก (Level-1 Category):
    1. **📊 สถิติ & กิจกรรม** (Overview, Trends, Event Logs, GA4)
    2. **👥 ผู้ใช้ & ชุมชน** (All Users, Community Sync, Playmat Beta)
    3. **🗃️ จัดการข้อมูลระบบ** (Meta Decks, Mappings, Missing Prices, Rooms)
  - มีแท็บเลเวล 2 ให้เลือกดูเฉพาะกลุ่มที่สนใจ หน้าตาเป็นระเบียบและค้นหาเครื่องมือได้รวดเร็ว

### 2.7 การสนับสนุน WebKit ใน Playwright
- เพิ่มโปรเจกต์ `webkit` (Desktop Safari) และ `mobile-safari` (iPhone 14) ใน [`playwright.config.ts`](playwright.config.ts) ทำให้สามารถรันการทดสอบอัตโนมัติบนเอนจินของ Apple ได้ครบถ้วน

---

## 3. ผลการตรวจสอบคุณภาพ (Quality Gates & Verification)

1. **Linting (`npm run lint`):**
   - 0 errors (ผ่านเกณฑ์เข้มงวดของ oxlint)
2. **TypeScript & Production Build (`npm run build`):**
   - Exit code 0, ผ่านการคอมไพล์ TypeScript และ Vite bundling ทั้ง 30 ก้อนไฟล์
3. **Unit Tests (`npm test`):**
   - ผ่านทั้งหมด 430+ unit tests
4. **Playwright E2E Tests บน WebKit & Safari:**
   - `e2e/deck-builder.spec.ts` (--project=webkit): **9/9 ผ่าน**
   - `e2e/deck-mobile-ux.spec.ts` (--project=mobile-safari): **5/5 ผ่าน**
   - `e2e/top-bar.spec.ts` (--project=webkit): **7/7 ผ่าน** (รวมการทดสอบไม่ล้นที่ 360px)
   - `e2e/card-mapping.spec.ts` (--project=webkit): **3/3 ผ่าน**
   - `e2e/navigation-and-theme.spec.ts` (--project=webkit): **3/3 ผ่าน**

---

## 4. โครงสร้างไฟล์ที่ถูกแก้ไข (Modified Files)
- [`package.json`](package.json) (bumped to 2.78.0)
- [`playwright.config.ts`](playwright.config.ts) (added webkit & mobile-safari)
- [`src/components/collection/CardCollectionModal.tsx`](src/components/collection/CardCollectionModal.tsx)
- [`src/components/collection/CollectionCardItem.tsx`](src/components/collection/CollectionCardItem.tsx)
- [`src/components/collection/CollectionHeader.tsx`](src/components/collection/CollectionHeader.tsx)
- [`src/components/deck/DeckManager.tsx`](src/components/deck/DeckManager.tsx)
- [`src/components/deck/DeckEditor.tsx`](src/components/deck/DeckEditor.tsx)
- [`src/components/deck/DeckViewModal.tsx`](src/components/deck/DeckViewModal.tsx)
- [`src/components/deck/MissingCardsModal.tsx`](src/components/deck/MissingCardsModal.tsx)
- [`src/components/layout/BottomNav.tsx`](src/components/layout/BottomNav.tsx)
- [`src/components/layout/AppHeaderBar.tsx`](src/components/layout/AppHeaderBar.tsx)
- [`src/components/mapping/CardMappingPage.tsx`](src/components/mapping/CardMappingPage.tsx)
- [`src/components/mini/MiniGameBoard.tsx`](src/components/mini/MiniGameBoard.tsx)
- [`src/components/admin/AdminPage.tsx`](src/components/admin/AdminPage.tsx)
- [`AI_LOG.md`](AI_LOG.md)

---

## 5. แผนการสำหรับวันถัดไป / สิ่งที่สามารถทำต่อได้ (Roadmap for Next Session)
1. **PWA Gesture Navigation:** พิจารณาเพิ่ม Swipe to close modal หรือ pull-to-refresh บนหน้ารายการเด็ค
2. **Animation Micro-interactions:** ปรับ framer-motion หรือ CSS transitions ขณะสลับแท็บ Admin ให้มีความลื่นไหลระดับ 60fps
3. **Merge to Main:** รวมโค้ดจาก `feature/ux-ui-audit-and-improvements` เข้าสู่ `main` เมื่อพร้อมปล่อยเวอร์ชัน Production

---

## 6. การแก้ปัญหารูปการ์ดหาย & เสริมความแข็งแกร่งระบบรูปภาพ (Card Image Multi-Tier Fallback - v2.78.1)
- **สาเหตุที่ตรวจพบ (Root Causes):**
  1. โฟลเดอร์ `public/card-images/MA6/` (ชุดเสริม "30th CELEBRATION") ขาดหายไปในเครื่อง local dev (การ์ด staple อย่าง ไฮเปอร์บอล และพลังงานพื้นฐาน [ไฟ, จิต, มืด] อ้างอิงชุด MA6) ทำให้เรียก local asset แล้วเจอ 404
  2. ใน `DeckSearchModal.tsx`, `DiscardAndLostZoneModal.tsx`, `TopCardsViewerModal.tsx`, `HandCardMenuModal.tsx`, `HandToDeckModal.tsx`, `CenterBoardZone.tsx`, `TabletopPokemonCard.tsx`, `TabletopDeckSelectorModal.tsx` และ `PlaymatV3Canvas.tsx` ไม่มี `onError` handler เมื่อรูปโหลดไม่ติดจึงแสดงไอคอนรูปแตกของเบราว์เซอร์
  3. ฟังก์ชัน `handleCardImageError` เดิมรับเฉพาะ path แบบ string เมื่อหลายคอมโพเนนต์ส่ง card object มา ทำให้ `cleanPath` กลายเป็น `"[object Object]"` ส่งผลให้ fallback fail
- **การแก้ไขที่ดำเนินการ (Resolution & Hardening):**
  1. ดาวน์โหลดรูปภาพการ์ดชุด `MA6` ครบทั้งหมด 199/199 ใบลงใน `public/card-images/MA6/` พร้อมใช้งานแบบออฟไลน์
  2. ปรับปรุง `handleCardImageError` และ `resolveCardImageUrl` ใน [`src/utils/cardImage.ts`](src/utils/cardImage.ts):
     - รองรับทั้ง `string`, `card object`, หรือแม้ไม่ส่ง parameter ก็ดึง path จาก `target.src` อัตโนมัติ
     - ลำดับ Fallback 5 ขั้นแบบไร้รอยต่อ: Local 404 -> Cloudflare R2 CDN -> Asia Official CDN -> Energy Counterparts (SCE/S8a) -> SVG Placeholder
     - ป้องกัน Infinite error loop ด้วย `data-final-error="true"`
  3. ติดตั้ง `onError={(e) => handleCardImageError(e, card)}` ในทุกจุดแสดงการ์ดของ Playmat V3
  4. เพิ่มชุดทดสอบ Unit tests 9 ข้อใน `src/utils/cardImage.test.ts` และ E2E automated test ใน `e2e/card-images-fallback.spec.ts` ผ่าน 100% บน Chromium, WebKit, และ Mobile

