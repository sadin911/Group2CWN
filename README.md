<div align="center">

# ⚡ PokéCount Tracker & PokéCollection 📚
### The All-in-One Companion, Collection Vault & Deck Analyzer for Pokémon TCG (Thai & English)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://pokef.tcgcount.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://pokef.tcgcount.com)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://pokef.tcgcount.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge)](https://pokef.tcgcount.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?logo=firebase&logoColor=black&style=for-the-badge)](https://pokef.tcgcount.com)

<br />

## 🚀 [👉 คลิกที่นี่เพื่อเข้าใช้งานแอปพลิเคชันจริง (Launch Live App — pokef.tcgcount.com)](https://pokef.tcgcount.com)

[![Launch App](https://img.shields.io/badge/🌐_เปิดใช้งาน_PokéCount_Tracker-pokef.tcgcount.com-FACC15?style=for-the-badge&labelColor=0F172A)](https://pokef.tcgcount.com)

</div>

---

## ✨ ภาพรวมของผลิตภัณฑ์ (Product Overview)

**PokéCount Tracker** คือ Progressive Web Application (PWA) สำหรับนักสะสมและผู้เล่นการ์ดโปเกมอน (Pokémon TCG) ทั้งภาษาไทยและภาษาอังกฤษ ออกแบบด้วยสถาปัตยกรรม **Offline-First** ผสานกับ **Cloud Firestore Sync** และระบบประมวลผลอัจฉริยะฝั่งไคลเอนต์

### 🌟 ฟีเจอร์หลักที่เปิดใช้งานจริง (Key Production Features)

1. 📚 **คลังข้อมูลการ์ดโปเกมอนภาษาไทยและอังกฤษกว่า 9,554+ ใบ (PokéCollection Vault)**
   - ครอบคลุมตั้งแต่ชุดแรกจนถึงชุดปัจจุบัน พร้อมระบบจับคู่ชื่อการ์ดไทย–อังกฤษอัตโนมัติ
   - ระบบ **Smart Variant Tracking** แยกนับการ์ดธรรมดา (Normal), ฟอยล์ย้อน (Mirror Foil), ฟอยล์ (Holo), และโปรโม (Promo)
   - โหลดภาพการ์ดความละเอียดสูงแบบ WebP ผ่าน **Cloudflare R2 CDN** พร้อมระบบ Fallback อัตโนมัติ

2. 📷 **ระบบนำเข้าข้อมูลอัจฉริยะ (Smart Input: Camera OCR, Thai Voice & Bulk Import)**
   - **Camera OCR Scanner**: สแกนการ์ดจริงผ่านกล้องด้วย Tesseract.js เพื่อค้นหาและเพิ่มเข้าคลังทันที
   - **Thai Voice Recognition**: สั่งเพิ่มการ์ดและระบุจำนวนด้วยเสียงพูดภาษาไทย
   - **Bulk Import / Export**: รองรับการนำเข้าและส่งออกข้อมูลผ่านไฟล์ CSV, Excel (.xlsx), JSON และรหัสเด็ค PTCGL

3. 📖 **สมุดสะสมการ์ด 3 มิติ & วิเคราะห์มูลค่าพอร์ต (3D Virtual Binder & P&L Analytics)**
   - เปิดพลิกดูสมุดสะสมการ์ดในรูปแบบ 3 มิติ (VirtualBinderModal) และสร้างสมุดแยกได้หลายโปรไฟล์
   - บันทึกต้นทุนซื้อจริงเทียบกับราคาตลาด (Market Valuation & P&L Tracking)
   - สร้างลิงก์แชร์สมุดสะสมสาธารณะ (/share/<id>) พร้อม QR Code โดยซ่อนราคาต้นทุนส่วนตัวอัตโนมัติ

4. 🃏 **ระบบจัดเด็คและคำนวณการ์ดที่ยังขาด (Deck Builder & Missing Cards Analyzer)**
   - ตรวจสอบกฎเด็คมาตรฐาน 60 ใบ (จำกัดชื่อซ้ำไม่เกิน 4 ใบ, ACE SPEC ≤ 1, Radiant ≤ 1)
   - คำนวณความน่าจะเป็นในการจั่วการ์ดเปิดมือแรกด้วยสถิติ **Hypergeometric Distribution**
   - เทียบเด็คกับคลังการ์ดที่มีอยู่เพื่อสรุปรายการการ์ดที่ยังขาดและคำนวณงบประมาณที่ต้องซื้อเพิ่ม (ทั้งโหมดตรงชุด Exact และโหมดใช้งานแทนกันได้ Equivalent)

5. ☁️ **การซิงค์ข้อมูลข้ามอุปกรณ์อย่างปลอดภัย (Cloud Sync & Conflict Resolution)**
   - ใช้งานแบบไม่ต้องล็อกอิน (Guest Mode) หรือเชื่อมต่อ **Google Sign-In** เพื่อซิงค์ข้อมูลข้ามคอมพิวเตอร์และมือถือ
   - ระบบตรวจจับการชนกันของข้อมูล (SmartSyncModal), SyncLockManager และระบบป้องกันสมุดที่ลบไปแล้วฟื้นคืนชีพ (Tombstone Guard)

---

## 🛠️ สถาปัตยกรรมและการรับประกันคุณภาพ (Architecture & Quality Assurance)

- **Frontend Stack**: React 19.2, TypeScript 6.0, Vite 8.2, Tailwind CSS v4, Zustand 5, PixiJS
- **Cloud & Infrastructure**: Firebase Authentication, Cloud Firestore, Cloudflare Workers & Cloudflare R2 CDN
- **Automated Verification Suite**:
  - ✅ **531 Unit & Component Tests** (Vitest) ครอบคลุม Store Reducers, Parsers, Calculators และ नियमธุรกิจทั้งหมด
  - ✅ **204 End-to-End Tests** (Playwright) ทดสอบการทำงานจริงบนเบราว์เซอร์ทุก Flow หลัก
  - ✅ **Zero-Error Quality Gates**: ตรวจสอบด้วย oxlint, 	sc -b, itest และ playwright ก่อนขึ้น Production ทุก Release

---

## 👥 สมาชิกกลุ่ม 2 (Group 2 Onsite — Track 4: AI Vibe Code)
1. บิน
2. เก่ง
3. กฤษ
4. สุ
5. แบงค์
6. เจมส์

---

> 🔒 **หมายเหตุเรื่องซอร์สโค้ด (Repository Visibility Notice)**
> เนื่องจาก **PokéCount Tracker** เป็นผลิตภัณฑ์ที่มีการเปิดใช้งานจริงบน Production ([https://pokef.tcgcount.com](https://pokef.tcgcount.com)) ซอร์สโค้ดหลักและประวัติการพัฒนาจึงถูกเก็บรักษาไว้ใน **Private Repository** เพื่อความปลอดภัยของระบบและทรัพย์สินทางปัญญา โดยเปิดหน้า Repository นี้ไว้เป็นหน้าหลักสำหรับเข้าใช้งานแอปพลิเคชันครับ
