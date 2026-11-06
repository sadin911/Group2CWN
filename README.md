# บท 04 (PokéCount Tracker Edition) · จากการฟังพหุแหล่งข้อมูล สู่แผนทดสอบและการพิสูจน์ครบ LAB 0–13

> **Repository แยกเฉพาะตามแนวทางบทเรียนที่ 04 (`04_sabai-spa-web-and-testplan-from-interview`)**:
> ใช้เว็บจริง **`PokéCount Tracker` (`https://poke.tcgcount.com`, `v2.44.0`)** เป็นโครงหลักแทนร้านสปา พร้อมยกระดับชุดข้อมูลต้นทางของการสัมภาษณ์เป็น **Multi-Source Interview Hub 6 รูปแบบ (`SRC-01` ถึง `SRC-06`)** และจัดทำเอกสารส่งอาจารย์ครบทุกขั้นตอนตั้งแต่ **LAB 1 ถึง LAB 13**

---

## 🌟 ไฮไลต์พิเศษ: Multi-Source Interview Hub (6 รูปแบบหลักฐานชั้นต้นใน `interview/`)

เพื่อให้ได้คะแนนสูงสุดตามที่อาจารย์ต้องการ เราไม่ได้มีแค่ไฟล์สัมภาษณ์ไฟล์เดียว แต่รวบรวมหลักฐานชั้นต้น **6 รูปแบบที่แตกต่างกัน** มาใช้ทำ **Cross-Source Triangulation** (จับจุดที่ข้อมูลพูดขัดกันเอง `CONF-01..04` แล้วส่งให้เจ้าของระบบยืนยันใน `OWNER-ANSWERS.md`):

| รหัสแหล่งข้อมูล | ไฟล์ใน Repository | รูปแบบข้อมูล (Modality) | รายละเอียดความว้าวของข้อมูล |
|---|---|---|---|
| **`SRC-01`** | [`interview/sources/01-field-interview-transcript.md`](interview/sources/01-field-interview-transcript.md) | 🎙️ **ถอดเทปสัมภาษณ์สดภาคสนามพร้อม Timestamp** | ถอดคำพูดคำต่อคำจากงานแข่ง Regional Mega Bangna ครบ **7 Personas** (คุณซาดิน Owner, คุณอาร์ต Head Judge, คุณภูมิ Whale Collector, น้องมีน Meta Player, Mr. Kenji Expat, น้องข้าวปั้น Junior Battler, เฮียหมง ร้านการ์ดพาร์ทเนอร์) |
| **`SRC-02`** | [`interview/sources/02-line-discord-bug-thread.md`](interview/sources/02-line-discord-bug-thread.md) | 💬 **แชตกลุ่ม LINE OpenChat & Discord `#bug-reports`** | บันทึกแชตแจ้งบั๊กจริงจากผู้เล่นไทย เรื่องสมุดที่ลบแล้วฟื้นคืนชีพ (`Zombie Binder`), ข้อมูลโหมด Guest ไหลปนตอน Logout, และการปิดบังเลขผู้เสียภาษี PDPA |
| **`SRC-03`** | [`interview/sources/03-partner-pricing-sheet.csv`](interview/sources/03-partner-pricing-sheet.csv) | 📊 **ตาราง CSV ราคาตลาดและตัวคูณความหายาก** | ตารางจริงจากร้านพาร์ทเนอร์ (`tcgplayer_usd`, `fx_rate_thb = 34.00`, `thai_price_ratio = 0.60 / 0.85 / 1.10`, และตัวอย่างการปัดเศษ `.50` ของ `SV3-125 = ฿468`) |
| **`SRC-04`** | [`interview/sources/04-tournament-deckcheck-rules.md`](interview/sources/04-tournament-deckcheck-rules.md) | 📜 **ระเบียบกรรมการตรวจเด็คงานแข่ง Regional** | กฎเหล็ก `TR-DECK-01..06` (เด็ค 60 ใบ, Basic $\ge 1$, ชื่อไทยซ้ำ $\le 4$ ยกเว้น Basic Energy, `ACE SPEC <= 1`, `Radiant <= 1`) และสูตรดาเมจ `ACTIVE` vs `BENCH` |
| **`SRC-05`** | [`interview/sources/05-incident-postmortems-v2.md`](interview/sources/05-incident-postmortems-v2.md) | 🚨 **รายงาน Incident Post-Mortem (`v2.33.0` & `v2.42.1`)** | บันทึกวิศวกรรมจากเหตุการณ์จริงเรื่อง `costPrice` รั่วในลิงก์แชร์ `pk_xxxxxxxx` และกลไก `deletedBinderIds` Tombstone |
| **`SRC-06`** | [`interview/sources/06-user-survey-analytics.json`](interview/sources/06-user-survey-analytics.json) | 📈 **ผลสำรวจนักสะสมไทย 120 คน (JSON Telemetry)** | ข้อมูลสถิติความต้องการฟีเจอร์ Missing Cards (`84.2%`) และสัดส่วนผู้ใช้จอมือถือ `375px` (`88.5%`) |
| **สังเคราะห์รอบ 1** | [`interview/INTERVIEW.md`](interview/INTERVIEW.md) | 🧭 **สรุปสัมภาษณ์รอบแรก + ตารางจับคู่ความขัดแย้ง** | สังเคราะห์เสียงสะท้อนทั้ง 7 กลุ่ม และตาราง `Cross-Source Conflict Matrix` (`CONF-01..04`) |
| **คำตอบรอบ 2** | [`interview/OWNER-ANSWERS.md`](interview/OWNER-ANSWERS.md) | ✅ **เจ้าของระบบตอบกลับและยืนยันข้อมูลจริง** | ตารางการ์ดมาตรฐาน 10 ใบ, คำตอบชี้ขาด `CONF-01..04`, บัญชีทดสอบ `U01–U07`, และประเด็นที่เปิดให้ทีมตั้งสมมติฐาน `⚠️A-01..03` |

---

## 🗺️ แผนที่ไฟล์ส่งอาจารย์ครบทุก LAB (ตามโครงบทเรียนที่ 04 เป๊ะ)

| ช่วง | LAB | ทำอะไร | ไฟล์ที่ได้ใน Repo นี้ |
|---|:---:|---|---|
| 🟢 **ฟังร้าน (Multi-Source)** | **LAB 1** | ฟังพหุแหล่งข้อมูล 6 รูปแบบ → User Stories 24 ข้อ + คำถามกลับ `Q1–Q10` | [`USER-STORIES.md`](USER-STORIES.md) |
| | **LAB 2** | เจ้าของตอบกลับ → `FR-01..24`, `BR-01..20` (ค่าขอบ 3 ค่า), `NFR-01..06`, สมมติฐาน `⚠️A-01..03` | [`REQUIREMENTS.md`](REQUIREMENTS.md) |
| | **LAB 3** | ⭐ System Design ครบ 5 แผนภาพ: Architecture · Use Case · Flowchart · ERD · Sequence | [`DESIGN.md`](DESIGN.md) |
| | **LAB 4** | ข้อมูลทดสอบ (`U01–U07`, `E01–E45`, `M01–M08`) + Subagent อิสระคำนวณเลขซ้ำ | [`TEST-DATA.md`](TEST-DATA.md) |
| 🟡 **เชื่อมเว็บจริง** | **LAB 5–6** | ใบสั่งงานเชื่อมเว็บอ้างอิง `PokéCount Tracker` และสัญญา API ทดสอบ | [`BUILD-PROMPT.md`](BUILD-PROMPT.md) |
| 🔵 **สำรวจขนาน** | **LAB 7** | เทียบ 3 ทาง (`[D]` vs `[A]` vs `[O]`) + แบ่ง 6 Charters (`C1–C6`) | [`CHARTERS.md`](CHARTERS.md) |
| | **LAB 8** | Subagent 6 ตัวสำรวจพร้อมกันครบทุกโมดูล | [`exploration/c1.md`](exploration/c1.md) ถึง [`exploration/c6.md`](exploration/c6.md) |
| | **LAB 9** | รวมผลสำรวจ + ผู้ตัดสินความเสี่ยงอิสระจัดลำดับ `P1 / P2` | [`EXPLORATION.md`](EXPLORATION.md) |
| 🟠 **เขียนและรีวิวแผน** | **LAB 10** | แผนการทดสอบละเอียด 30 ข้อ (`TC-COL-01` ถึง `TC-SEC-05`) แบ่ง 6 สาย Writer (`5.1–5.6`) | [`TEST-PLAN.md`](TEST-PLAN.md) และ [`plan/`](plan/) |
| | **LAB 11** | ผู้รีวิวอิสระตรวจแผน คิดเงินใหม่เอง และแก้จุดเสี่ยง False Pass | [`PLAN-REVIEW.md`](PLAN-REVIEW.md) |
| 🟣 **พิสูจน์และล่าบั๊ก** | **LAB 12** | รายงานผลรัน E2E เปรียบเทียบรอบปกติ (`30/30`) กับรอบฝังบั๊ก (`25/30`) | [`e2e/index.html`](e2e/index.html) และ [`e2e/test-report/compare.json`](e2e/test-report/compare.json) |
| | **LAB 13** | ล่าบั๊กปริศนา `BUG_MODE=1` จับได้ครบ 3/3 ตัว (`BUG-1..3`) + วิเคราะห์ Oracle `[D]/[R]` vs `[O]` | [`BUG-HUNT.md`](BUG-HUNT.md) |
| 📊 **รายงานรวม HTML** | **Report** | รายงานสรุปฉบับสวยงามเปิดอ่านในเบราว์เซอร์ได้ทันที | [`REPORT.html`](REPORT.html) |
