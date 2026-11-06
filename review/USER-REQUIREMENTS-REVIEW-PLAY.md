# บทละครเวทีจำลอง: การประชุมทบทวนความต้องการและตรวจสอบระบบจริง (User Review & Requirements Sign-off)
## โปรเจกต์: PokéCount Tracker (ฉบับ Production & Cloudflare Edge)

> **บริบทของฉาก (Context & Setting)**:
> ห้องประชุมทีมพัฒนา PokéCount Tracker ณ อาคารสำนักงานใหญ่ 
> ผู้มีส่วนได้ส่วนเสียหลักจากการใช้งานจริง (ผู้พัฒนา, จัดเด็คแข่งขัน, นักสะสมการ์ดหายาก, ผู้เล่นต่างชาติ, และทีม QA) 
> มานั่งรีวิวฟังก์ชันจริงของระบบ **ที่ไม่มีฟีเจอร์เกินจริง (ไม่แต่งเรื่องระบบสั่งซื้อหน้าร้านหรือคูปองส่วนลดที่ไม่มีในโค้ด)**
> ทุกประเด็นอิงจากประวัติการพัฒนาจริง: ระบบจัดเด็ค 60 ใบ, คำนวณการ์ดที่ขาด (Missing Cards Shopping List), ระบบสมุดสะสม, Realtime Sync, และความปลอดภัย Zero Secret Leak
> 
> **ผู้ร่วมประชุม (Personas)**:
> 1. **คุณซาดิน (Sadin)** — *Product Owner & Lead Developer*
> 2. **คุณอาร์ต (Art)** — *Official Head Judge & Tournament Organizer* (กรรมการควบคุมระเบียบการแข่งขัน TCG)
> 3. **คุณภูมิ (Poom)** — *Whale Collector & High-End Investor* (นักสะสมการ์ดมูลค่าสูง ดูแลพอร์ตสมุดสะสม)
> 4. **น้องมีน (Meen)** — *Competitive Meta Player* (ผู้เล่นสายทัวร์นาเมนต์ นำเข้าเด็คจาก PTCGL/Limitless)
> 5. **Mr. Kenji Sato** — *Expat Player & International Collector* (ผู้เล่นต่างชาติ ค้นหาการ์ดไทย-อังกฤษ)
> 6. **พี่นก (Nok) & คุณณัฐ (Nat)** — *Independent QA & System Auditor* (ทีมตรวจสอบคุณภาพระบบและ E2E)

---

### 🎬 องก์ที่ 1: ตรวจสอบความปลอดภัยข้อมูลส่วนบุคคล (Zero Cost Price Leakage)

*(คุณภูมินั่งเปิดหน้าจอแชร์สมุดสะสมบน iPad Pro)*

**คุณภูมิ (Whale Collector):** 
"คุณซาดินครับ เรื่องแรกที่ผมต้องการให้คอนเฟิร์มก่อนเริ่มปล่อยเวอร์ชันนี้ คือเรื่อง **ลิงก์แชร์สมุดสะสมสาธารณะ (`/share/:id`)**
ผมเป็นนักสะสม ในสมุดสะสมผมมีการจดราคาต้นทุนที่รับซื้อมาจริง (`costPrice`) และบันทึกโน้ตส่วนตัว (`privateNotes`) เอาไว้ทุกใบ 
ในอดีต (Incident v2.33.0) เคยมีปัญหาว่าหน้าเว็บไม่แสดงคำว่าต้นทุนก็จริง แต่พอส่อง Network tab ใน DevTools กลับพบว่าตัวแอปส่งฟิลด์ `costPrice` หลุดไปใน JSON payload ด้วย! ตอนนี้ในโค้ดแก้เรื่องนี้ขาดหรือยังครับ?"

**คุณซาดิน (Product Owner):** 
"แก้ขาด 100% แล้วครับคุณภูมิ! ใน [`src/services/sharedCollectionService.ts`](file:///Users/sadin/Project/HR/CWN2026_pokecount_sabai_edition/src/services/sharedCollectionService.ts) เราทำ Data Sanitization ก่อนจะเขียนลง Firestore หรือส่งออก:
```typescript
// สกัดเฉพาะข้อมูลสาธารณะ ตัด costPrice และ privateNotes ทิ้งเด็ดขาด
const sanitizedCards = cards.map(({ costPrice, customPrice, privateNotes, ...publicCard }) => publicCard);
```
และในชุดทดสอบ Unit test `sharedCollectionService.test.ts` รวมถึง E2E test `share-collection.spec.ts` เราตรวจ assertion ลงลึกถึงระดับ Network response ว่าไม่มีฟิลด์ต้นทุนหลุดออกมาแน่นอนครับ"

**พี่นก (QA Auditor):** 
"ผลการรัน E2E ยืนยันตรงกันค่ะ ตัว Payload ของ Shared Binder มีเฉพาะรหัสการ์ด, ชื่อ, รูปภาพ, และจำนวนการ์ด ไม่พบ Key ที่เกี่ยวกับต้นทุนเลยค่ะ"

---

### 🎬 องก์ที่ 2: วิกฤตสมุดผีคืนชีพ (Zombie Binder & Concurrency Control)

*(คุณณัฐ ฝ่าย Architecture เปิดสไลด์เรื่อง Cloud Sync และ Local-First)*

**คุณณัฐ (System Auditor):** 
"ประเด็นถัดมาที่เคยเกิดขึ้นใน `SRC-02` คือกรณีที่ผู้ใช้งานลบสมุดสะสมในเครื่องหนึ่ง แต่พอเปิดแอปในอีกเครื่องที่ค้างหน้าจอไว้ ข้อมูลสมุดที่ลบไปแล้วกลับถูก sync ย้อนกลับขึ้น Cloud กลายเป็น **Zombie Binder** กู้ตัวเองกลับมาทับข้อมูลใหม่ คุณซาดินแก้ปัญหาการชนกันนี้อย่างไรครับ?"

**คุณซาดิน (Product Owner):** 
"เราแก้ด้วย 2 กลไกหลักใน [`src/store/collectionStore.ts`](file:///Users/sadin/Project/HR/CWN2026_pokecount_sabai_edition/src/store/collectionStore.ts) ครับ:
1. **ระบบ Tombstone (`deletedBinderIds`)**: เมื่อผู้ใช้สั่งลบสมุด รหัสสมุดจะถูกบันทึกเป็น Tombstone หากเครื่องอื่นต่อเน็ตเข้ามา sync จะต้องตรวจเช็ครายชื่อใน `deletedBinderIds` ก่อนเสมอ หากพบว่าสมุดใดอยู่ในรายการที่ถูกลบไปแล้ว ให้ลบออกจากเครื่องนั้นทันที ห้ามดันกลับขึ้น Cloud
2. **Reconciliation Guard**: ควบคุมการเขียน Cloud ในระดับ Store หากล็อกอินโหมด Guest หรือยังไม่ผ่านการ Authenticate จะบล็อกการยิง Cloud Write เป็น 0 (`cloudWrites = 0`) เพื่อไม่ให้ข้อมูลท้องถิ่นไหลปนกับผู้ใช้จริง"

**คุณณัฐ (System Auditor):** 
"ทดสอบผ่าน `collectionStore.syncReconcile.test.ts` และ `collectionStore.cloudGuard.test.ts` แล้ว ผลการจำลองลบสมุดข้ามอุปกรณ์ไม่เกิดการคืนชีพของสมุดผีอีกต่อไปครับ"

---

### 🎬 องก์ที่ 3: ระบบตรวจกติกาเด็ค 60 ใบ (Deck Validator Rules)

*(คุณอาร์ต Head Judge กางหน้าระเบียบ Tournament Rules บนโต๊ะ)*

**คุณอาร์ต (Head Judge):** 
"ในทัวร์นาเมนต์แข่งขัน กฎการตรวจเด็คเข้มงวดมาก ตัว Deck Validator ในหน้า `/deck` ช่วยป้องกันไม่ให้ผู้เล่นจัดเด็คผิดกติกาได้อย่างไรบ้าง?"

**คุณซาดิน (Product Owner):** 
"ระบบตรวจจับกติกาแบบ Real-time อยู่ใน [`src/utils/deckCalculator.ts`](file:///Users/sadin/Project/HR/CWN2026_pokecount_sabai_edition/src/utils/deckCalculator.ts) โดยมีเงื่อนไขบังคับดังนี้:
1. **การ์ดต้องครบ 60 ใบพอดี**: ขาดแม้แต่ใบเดียว (เช่น 59 ใบ) หรือเกิน (61 ใบ) ระบบจะแสดงสถานะเด็คไม่สมบูรณ์
2. **ต้องมี Basic Pokémon อย่างน้อย 1 ใบ**: ป้องกันเด็คที่ไม่มีตัวลงเทิร์นแรก
3. **กฎชื่อซ้ำไม่เกิน 4 ใบ (Rule of Four)**: นับรวมตามชื่อการ์ด แม้จะต่างชุดหรือต่างภาพประกอบก็ห้ามเกิน 4 ใบ (ยกเว้น Basic Energy ที่ใส่ได้ไม่จำกัด)
4. **ACE SPEC Limit**: เด็คใส่การ์ดที่มี Tag หรือ Rarity เป็น `ACE SPEC` ได้สูงสุดเพียง **1 ใบต่อเด็ค** เท่านั้น
5. **Radiant Pokémon Limit**: ใส่โปเกมอนประกายแสง (Radiant) ได้สูงสุด **1 ตัวต่อเด็ค**"

**น้องมีน (Competitive Meta Player):** 
"หนูลองใช้ฟังก์ชัน Import ลิสต์เด็คจาก PTCGL Text Format ผ่าน `ptcglDeckParser.ts` แล้วค่ะ ถ้าเผลอใส่การ์ดผิดกฎ หรือใส่ ACE SPEC ซ้ำ 2 ใบ ระบบจะมี Badge สีแดงเตือนทันที และคลิกดูรายละเอียดได้เลยว่าผิดกฎข้อไหน ทำให้จัดเด็คได้อย่างมั่นใจก่อนส่ง Deck List ให้ Judge ค่ะ"

---

### 🎬 องก์ที่ 4: การคำนวณการ์ดที่ยังขาด (Missing Cards Calculator & Shopping List)

*(น้องมีน เปิดหน้าต่าง Missing Cards Modal ในระบบเด็ค)*

**น้องมีน (Competitive Meta Player):** 
"ฟีเจอร์ที่หนูชอบมากที่สุดคือ **Missing Cards Calculator** ค่ะ แต่หนูอยากให้รีวิว Requirement ตรงนี้นิดนึง เรื่องโหมดการคำนวณแบบ **Equivalent (ชื่อเดียวกันนับแทนกันได้)** กับ **Exact (ตรงชุด/ตรงภาพ)**"

**คุณซาดิน (Product Owner):** 
"ใช่ครับ ใน [`src/components/deck/MissingCardsModal.tsx`](file:///Users/sadin/Project/HR/CWN2026_pokecount_sabai_edition/src/components/deck/MissingCardsModal.tsx) และ `deckCalculator.ts` เราออกแบบเพื่อตอบโจทย์ผู้เล่นจริง 2 กลุ่ม:
- **โหมด Equivalent (สำหรับสายแข่ง)**: ถ้าเด็คใส่การ์ด เช่น *'คำสั่งของบอส'* จากชุดล่าสุด แต่ในสมุดสะสมผู้ใช้มีการ์ดชื่อเดียวกันจากชุดเก่าอยู่แล้ว ระบบจะนับว่า **มีแล้ว** ไม่นับเป็นการ์ดขาด ช่วยประหยัดเงินผู้เล่น
- **โหมด Exact (สำหรับนักสะสม/ผู้เล่นที่ต้องการภาพตรงเป๊ะ)**: ระบบจะเช็คเทียบกับ `cardCode` ตรงชุดเท่านั้น ถ้าไม่ตรงชุดจะนับว่ายังขาด
- **ฟังก์ชัน Export Shopping List Text**: ผู้ใช้สามารถกดปุ่ม *'คัดลอกรายการการ์ดที่ขาด'* เพื่อนำข้อความสรุปจำนวนที่ขาดและชื่อการ์ดภาษาไทยไปโพสต์หาของในกลุ่มหรือส่งให้เพื่อนดูได้ทันทีด้วยปุ่มเดียว โดยระบบจะจัดกลุ่มโปเกมอน, เทรนเนอร์, และพลังงานให้อย่างสวยงามครับ"

**คุณภูมิ (Whale Collector):** 
"ระบบไม่จำเป็นต้องมีตะกร้าสั่งซื้อในเว็บให้วุ่นวายครับ ผู้เล่นการ์ดส่วนใหญ่ต้องการแค่รายการสรุปชัดเจนว่าขาดใบไหน กี่ใบ แล้วกดก็อปปี้ไปดีลต่อในคอมมูนิตี้ แบบนี้ตอบโจทย์ตรงการใช้งานจริงที่สุดแล้วครับ!"

---

### 🎬 องก์ที่ 5: ค้นหาการ์ดข้ามภาษา (Thai-English Card Mapping) และการ Deploy บน Cloudflare Edge

*(Mr. Kenji Sato ยกมือขึ้นถาม)*

**Mr. Kenji Sato:** 
"As an expat player, I often copy decklists from English tournament sites like LimitlessTCG. How does the system map English names to Thai cards accurately?"

**คุณซาดิน (Product Owner):** 
"We built a multi-signal card matching engine in [`src/utils/thaiEnglishCardMatcher.ts`](file:///Users/sadin/Project/HR/CWN2026_pokecount_sabai_edition/src/utils/thaiEnglishCardMatcher.ts) that uses:
1. Exact Set Code and Card Number alignment
2. Baseline dictionary mapping
3. PHash image perceptual hashing to match artworks between Thai and English printings
This allows players to import PTCGL English exports directly and have them automatically resolve to the corresponding Thai cards!"

**พี่นก (QA Auditor):** 
"และสำหรับการ Deploy ตัวโปรเจกต์นี้ทำงานบน **Cloudflare Workers & Static Assets** ภายใต้ Subdomain [https://pokef.tcgcount.com](https://pokef.tcgcount.com):
- แคชหน้าเว็บและ PWA Service Worker ครบถ้วน
- สัญญาณความเร็ว HTTP 200 OK เสี้ยววินาที
- รองรับขนาดหน้าจอมือถือมาตรฐาน 375px อย่างสมบูรณ์
- รัน Vitest ผ่านทั้งหมด **551/551 tests**

ทางทีม QA และตัวแทนผู้ใช้งานขอสรุปอนุมัติ (Sign-off) ความต้องการระบบตามการทำงานจริงของ PokéCount Tracker ได้เลยค่ะ!"

*(ทุกคนในที่ประชุมเห็นชอบและเซ็นอนุมัติปิดการประชุมอย่างเป็นเอกฉันท์)*
