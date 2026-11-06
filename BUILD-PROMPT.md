# LAB 5 · ใบสั่งงานสำหรับสร้าง/เชื่อมเว็บอ้างอิง (`BUILD-PROMPT.md`)

> ใบสั่งงานฉบับสมบูรณ์ที่สรุปจาก [`USER-STORIES.md`](USER-STORIES.md), [`REQUIREMENTS.md`](REQUIREMENTS.md), [`DESIGN.md`](DESIGN.md), และ [`TEST-DATA.md`](TEST-DATA.md) สำหรับใช้ตรวจสอบเว็บจริง **`PokéCount Tracker` (`/Users/sadin/Project/PokeCountTracker`, `https://poke.tcgcount.com`)** โดยไม่ต้องสร้างเว็บใหม่ทับระบบ Production

---

## 1. เป้าหมายและขอบเขตของระบบอ้างอิง (`System Under Test`)

- **ระบบต้นแบบจริง**: `PokéCount Tracker v2.44.0` (`/Users/sadin/Project/PokeCountTracker`)
- **เส้นทางหน้าเว็บหลัก (`Routes`)**:
  - `/th` และ `/en` — หน้าหลักคลังการ์ดโปเกมอนไทย 9,554+ ใบ (โหลดทีละ `60` ใบ) พร้อมตัวสลับสมุดสะสม (`1..10` เล่ม) และปุ่มนับจำนวนตาม `Smart Variant System` (`0..99` ใบ)
  - `/th/decks` — หน้าจัดเด็ค 60 ใบ พร้อมตัวตรวจกติกา (`DeckValidator`: 60 ใบ, Basic $\ge 1$, ชื่อไทยซ้ำ $\le 4$ ยกเว้น Basic Energy, `ACE SPEC <= 1`, `Radiant <= 1`), นำเข้าเด็ค PTCGL, และคำนวณรายการการ์ดที่ขาด `Missing Cards` + การคำนวณแบบ Equivalent
  - `/th/battle` — หน้ากระดานแข่ง `Battle Companion` (`maxHp 30..340`, โจมตีแยก `ACTIVE` vs `BENCH`, จบเทิร์น `Checkup` พิษ `+10` / ไฟไหม้ `+20`, วิวัฒนาการ/ถอยล้างสถานะ)
  - `/th/share/:shareId` — หน้าลิงก์แชร์สมุดสะสมสาธารณะรหัส `pk_xxxxxxxx` (แสดงมูลค่าตลาดรวมโดยไม่มี `costPrice`, `customPrice`, `privateNotes`)
  - `/th/admin` — หน้าผู้ดูแลระบบ (เฉพาะ `owner@pokecount.test`) สำหรับอนุมัติคู่การ์ดไทย-อังกฤษ

---

## 2. สัญญา API และแผงควบคุมสำหรับงานทดสอบ (`Test Control Endpoints`)

1. `POST /api/test/reset` — รีเซ็ตข้อมูลกลับสู่ Seed Data (`U01–U07`, การ์ด 10 รายการหลัก, `syncRevision` ตั้งต้น)
2. `POST /api/test/lock` — ล็อกนาฬิกาของระบบไว้ที่ `2026-06-15T10:00:00+07:00`
3. `PATCH /api/binders/:binderId/cards/:cardId` — อัปเดตจำนวนการ์ด (`normal`, `mirror`, `holo` ในช่วง `0..99`) พร้อมตรวจ `expectedRevision` และ `Smart Variant`
4. `POST /api/binders` และ `DELETE /api/binders/:binderId` — สร้าง/ลบสมุดสะสมภายใต้โควตา `1..10` เล่ม พร้อมบันทึก `deletedBinderIds`
5. `POST /api/share/snapshot` และ `GET /api/share/:shareId` — สร้างและดึง Snapshot สาธารณะที่ตัด `costPrice` ออก 100%
6. `POST /api/decks/validate` — ตรวจกติกาเด็ค 60 ใบ
7. `POST /api/decks/missing-quote` — คำนวณการ์ดที่ขาดและเปรียบเทียบการคำนวณการ์ดที่ขาด `PARTNER_10PCT` vs `Exact Mode` พร้อมปิดบังรหัสการ์ดสองภาษา 13 หลัก
8. `POST /api/battle/attack`, `POST /api/battle/checkup`, `POST /api/battle/evolve-or-retreat` — คำนวณดาเมจและสถานะบนกระดานแข่ง

---

## 3. สวิตช์จำลองบั๊กปริศนาสำหรับการฝึกตรวจจับใน LAB 13 (`BUG_MODE=1`)

เพื่อให้เหมือนกับบทเรียนที่ 04 ของอาจารย์ เมื่อเปิดโหมด `BUG_MODE=1` ระบบจำลองจะมีบั๊กที่ซ่อนอยู่ 3 ตัว (หมวดเงิน/ราคา · หมวดกติกาเด็ค/ขอบเขต · หมวดกระดานแข่ง/ซิงค์) ซึ่งหน้าจอจะแสดงตัวเลขที่ดูกลมกลืนกันจนถ้าเทสเตอร์ลอกค่าจากหน้าจอ (`[O]`) มาเป็น Expected Result จะไม่มีวันจับบั๊กได้ ต้องใช้ค่าที่คำนวณจาก `[D]` และ `[R]` ใน `TEST-DATA.md` เท่านั้นจึงจะจับได้ครบ 3 ตัว!
