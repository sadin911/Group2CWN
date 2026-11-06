<div align="center">

# ⚡ PokéCount Tracker & PokéCollection 📚
### The All-in-One Collection Vault, Deck Builder & Companion for Pokémon TCG (Thai & Global)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?logo=firebase&logoColor=black&style=for-the-badge)](https://firebase.google.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_Static-F38020?logo=cloudflare&logoColor=white&style=for-the-badge)](https://workers.cloudflare.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white&style=for-the-badge)](https://pokef.tcgcount.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br />

**[🌐 เข้าใช้งานเว็บไซต์ทางการ (Cloudflare Production)](https://pokef.tcgcount.com)** • 
**[📚 สมุดสะสมการ์ด (PokéCollection)](https://pokef.tcgcount.com/collection)** • 
**[🃏 ระบบจัดการเด็ค (Deck Builder)](https://pokef.tcgcount.com/deck)** • 
**[📑 เอกสารสรุปความต้องการ (Requirements)](./REQUIREMENTS.md)**

> 🪄 หมายเหตุ: โหมด Disney Lorcana ได้ถูกแยกออกไปเป็นโปรเจกต์อิสระแล้ว →
> **[LorcanaCountTracker](https://github.com/sadin911/LorcanaCountTracker)**

</div>

---

## 📖 สารบัญ (Table of Contents)

1. [✨ ภาพรวมของโปรเจกต์ (Overview)](#-ภาพรวมของโปรเจกต์-overview)
2. [🌟 ฟีเจอร์หลักแบบละเอียด (In-Depth Features)](#-ฟีเจอร์หลักแบบละเอียด-in-depth-features)
   - [2.1 📚 PokéCollection Tracker (สมุดสะสมการ์ดโปเกมอนภาษาไทย)](#21--pokécollection-tracker-สมุดสะสมการ์ดโปเกมอนภาษาไทย)
   - [2.2 🃏 PokéDeck Builder & Meta Decks Hub (ระบบจัดเด็คและเมต้า)](#22--pokédeck-builder--meta-decks-hub-ระบบจัดเด็คและเมต้า)
   - [2.3 🔍 AI & Smart Input Tools (OCR, เสียง, บาร์โค้ด และ Text Import)](#23--ai--smart-input-tools-ocr-เสียง-บาร์โค้ด-และ-text-import)
   - [2.4 ☁️ Cloud Sync, Multi-Binder & Share Collection](#24-️-cloud-sync-multi-binder--share-collection)
   - [2.5 💰 Live Price Tracking & Market Value (เช็คราคาและการประเมินมูลค่า)](#25--live-price-tracking--market-value-เช็คราคาและการประเมินมูลค่า)
   - [2.6 🔄 Cross-Language Thai-English Card Mapping](#26--cross-language-thai-english-card-mapping)
3. [🏗️ สถาปัตยกรรมระบบและเทคโนโลยี (Architecture & Tech Stack)](#️-สถาปัตยกรรมระบบและเทคโนโลยี-architecture--tech-stack)
4. [📁 โครงสร้างโปรเจกต์ (Project Directory)](#-โครงสร้างโปรเจกต์-project-directory)
5. [💻 การติดตั้งและพัฒนาในเครื่อง (Local Setup & Development)](#-การติดตั้งและพัฒนาในเครื่อง-local-setup--development)
6. [🧪 การทดสอบระบบ (Testing & Quality Assurance)](#-การทดสอบระบบ-testing--quality-assurance)
7. [🚀 การ Build และ Deploy สู่ Production (Cloudflare Workers)](#-การ-build-และ-deploy-สู่-production-cloudflare-workers)
8. [🤝 กฎการพัฒนาและการมีส่วนร่วม (Guidelines & Cross-Agent Rules)](#-กฎการพัฒนาและการมีส่วนร่วม-guidelines--cross-agent-rules)
9. [📄 ใบอนุญาต (License)](#-ใบอนุญาต-license)

---

## ✨ ภาพรวมของโปรเจกต์ (Overview)

**PokéCount Tracker & PokéCollection** เป็น Progressive Web Application (PWA) ระดับมืออาชีพที่สร้างขึ้นสำหรับผู้เล่น นักสะสม และกรรมการตัดสินโปเกมอนการ์ดเกม (Pokémon TCG) โดยเฉพาะในชุมชนผู้เล่นการ์ดภาษาไทยและระดับสากล

ระบบผสานรวมฐานข้อมูลการ์ดภาษาไทยอย่างเป็นทางการกว่า **9,600+ ใบ** พร้อมรูปภาพความละเอียดสูง โหลดเร็วผ่าน CDN และระบบซิงค์ข้อมูลคลาวด์แบบ Real-time โดยมุ่งเน้นแก้ปัญหาสำคัญ 3 ประการ:
1. **การบันทึกคอลเลกชันที่ซับซ้อน**: รองรับการแยกนับประเภทฟอยล์จริง (Normal, Mirror/Reverse Holo, Holo, Promo, Special Illustration Rare ฯลฯ) พร้อมระบบคำนวณมูลค่าการ์ดตามราคากลาง
2. **การจัดเด็คและตรวจสอบการ์ดที่ยังขาด (Missing Cards Analysis)**: ตรวจสอบเด็ค 60 ใบเทียบกับสมุดสะสมเพื่อสรุปว่ายังขาดการ์ดใบใด ต้องหาเพิ่มกี่ใบ พร้อมฟังก์ชันแมปการ์ดระหว่างเวอร์ชันภาษาไทยและสากล
3. **การอำนวยความสะดวกด้วย AI และ OCR**: สแกนการ์ดจริงผ่านกล้องมือถือ, นำเข้ารายการการ์ดด้วยเสียงพูดภาษาไทย, หรือวางข้อความสเปรดชีตเพื่อบันทึกการ์ดทีละร้อยใบได้ทันที

---

## 🌟 ฟีเจอร์หลักแบบละเอียด (In-Depth Features)

### 2.1 📚 PokéCollection Tracker (สมุดสะสมการ์ดโปเกมอนภาษาไทย)

* **ฐานข้อมูลการ์ดภาษาไทยครบวงจร 9,600+ รายการ**:
  * รวบรวมตั้งแต่ยุคแรก First Gen, Sun & Moon, Sword & Shield, จนถึงยุคปัจจุบัน Scarlet & Violet (SV1–SV9, และชุดย่อยทุกชุด)
  * ครอบคลุมชุดพิเศษ Mega Evolution, กล่องพรีเมียม (Premium Trainer Box), การ์ดโปรโมงานแข่ง (Gym Event Promo, Championship Series)
* **คลาวด์รูปภาพการ์ดแบบ WebP ผ่าน Cloudflare R2**:
  * โหลดภาพความคมชัดสูงอย่างรวดเร็ว รองรับระบบ Responsive Lazy Load
  * มีระบบ **Automatic Fallback Hierarchy**: Cloudflare R2 WebP CDN ➔ Pokemon Asia Official CDN เพื่อการันตีว่ารูปภาพแสดงผลได้ 100% ไม่สะดุด
* **ระบบจำแนกประเภทฟอยล์อัจฉริยะ (Smart Variant System)**:
  * การ์ดระดับสูง (Ultra Rare, SAR, UR, MUR, AR, ex, VMAX, VSTAR): แสดงเฉพาะตัวนับฟอยล์พิเศษ
  * การ์ดชุดหลักทั่วไป: แยกนับตามสภาพจริง **⚪ ธรรมดา (Normal)**, **🌟 รีเวิร์ส/มิลเลอร์ (Mirror Foil)** และ **✨ ฟอยล์ (Holo)**
  * การ์ดโปรโม: จัดเข้าหมวด **🎁 Promo Foil**
* **ระบบค้นหาและกรองระดับสูง (Advanced Multi-Search & Filters)**:
  * ค้นหาได้จาก: ชื่อการ์ดภาษาไทย, เลขการ์ด (Card Number), รหัสชุด (Set Code เช่น SV1a, MA2, SC1a, SV9), และชื่อชุดภาษาไทย
  * กรองตาม Expansion Sets มากกว่า 80+ ชุด
  * กรองตามธาตุพลังงาน (Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Colorless)
  * กรองตามชนิดการ์ด (Pokémon, Trainer: Item/Supporter/Stadium/Tool, Special Energy, Basic Energy)
  * กรองตามสถานะการครอบครอง: มีแล้ว (Owned), ยังไม่มี (Missing), ในรายการอยากได้ (Wishlist), และการ์ดซ้ำ (Duplicates)
* **การแสดงผลแบบเสมือนจริง (Virtual Binder View)**:
  * เลือกระหว่างมุมมอง **Grid View (การ์ดเรียง)** หรือ **Binder View (แฟ้มสะสม 9 ช่อง / 4 ช่องต่อหน้า)** ให้ความรู้สึกเหมือนเปิดสมุดสะสมการ์ดของจริง

---

### 2.2 🃏 PokéDeck Builder & Meta Decks Hub (ระบบจัดเด็คและเมต้า)

* **เครื่องมือจัดเด็คมาตรฐาน 60 ใบ**:
  * ระบบตรวจสอบกฎกติกาการแข่งขัน (Deck Rules Validator): จำกัดการ์ดชื่อซ้ำไม่เกิน 4 ใบ, การ์ด Radiant ไม่เกิน 1 ใบ, การ์ด ACE SPEC ไม่เกิน 1 ใบ
  * แสดงสัดส่วนเด็ค: อัตราส่วน Pokémon / Trainer / Energy แบบ Visual Graph
* **ระบบวิเคราะห์การ์ดที่ขาด (Missing Cards Analyzer)**:
  * ตรวจสอบเด็คเทียบกับสมุดสะสมที่เลือกแบบ 1-Click
  * ระบุชัดเจนว่ามีครบกี่ใบ ขาดอีกกี่ใบ พร้อมสรุปงบประมาณราคาประเมินที่ต้องใช้ในการซื้อการ์ดที่ขาด
* **Meta Decks Hub & Tournament Imports**:
  * ดึงเด็คเมต้าชั้นนำระดับโลกและในประเทศ (เช่น Limitless TCG)
  * รองรับการ Import/Export รายชื่อเด็คในฟอร์แมตมาตรฐานสากล (PTCGL Export Format / Pokemon TCG Live) ทั้งภาษาไทยและภาษาอังกฤษ
* **จำลองการจั่วการ์ดเปิดเกม (Test Hand Simulator)**:
  * สุ่มแจกการ์ด 7 ใบแรก ตรวจสอบการมีการ์ด Basic Pokémon บนมือ และทดลองจั่วการ์ดเทิร์นถัดไปเพื่อซ้อมออกการ์ด

---

### 2.3 🔍 AI & Smart Input Tools (OCR, เสียง, บาร์โค้ด และ Text Import)

* **Card Camera Scanner (Tesseract.js OCR)**:
  * ใช้กล้องสมาร์ตโฟนหรือเว็บแคมส่องไปที่มุมการ์ดเพื่ออ่านเลขการ์ดและรหัสชุด (Set ID & Collector Number)
  * ค้นหาและบันทึกการ์ดเข้าคอลเลกชันได้ทันทีโดยไม่ต้องพิมพ์
* **Voice Collector Tab (ระบบบันทึกด้วยเสียงพูดภาษาไทย)**:
  * พูดชื่อการ์ด เช่น *"พิคาชู 2 ใบ"* หรือ *"ลิซาร์ดอน อีเอกซ์ ฟอยล์"* ระบบจะแปลงเสียงเป็นข้อความและจับคู่เข้าสู่คลังการ์ดอัตโนมัติ
* **Bulk Text & Spreadsheet Import**:
  * รองรับการก๊อปปี้รายการการ์ดจาก Excel, Google Sheets, หรือไฟล์ Text มาวางเพื่อบันทึกเพิ่มการ์ดจำนวนมากในคลิกเดียว

---

### 2.4 ☁️ Cloud Sync, Multi-Binder & Share Collection

* **Firebase Authentication (One-Click Google Sign-In)**:
  * เข้าสู่ระบบด้วยบัญชี Google อย่างปลอดภัยผ่าน Popup หรือ Redirect
* **Cloud Firestore Real-time Sync**:
  * บันทึกข้อมูลแบบ NoSQL แยกรายบัญชี (`users/{uid}/binders/{binderId}`)
  * ซิงค์ข้อมูลข้ามอุปกรณ์อัตโนมัติ (แท็บเล็ต, สมาร์ตโฟน, โน้ตบุ๊ก)
* **ระบบแยกโหมดข้อมูล (Guest vs. Authenticated User)**:
  * **Guest Mode**: ผู้ใช้ทั่วไปใช้งานได้ทันทีโดยไม่ต้องล็อกอิน ข้อมูลถูกเก็บไว้ใน `LocalStorage` ในเครื่อง
  * **User Mode**: เมื่อล็อกอิน ข้อมูลจะถูกเชื่อมต่อและสำรองบน Cloud ทันที เมื่อ Logout หน้าจอจะสลับกลับเป็น Guest Mode ที่สะอาด ไม่ปะปนข้อมูลส่วนตัว
* **Multi-Binder Profiles**:
  * สร้างสมุดสะสมได้หลายเล่มแยกอิสระ เช่น *"สมุดสะสมชุดหลัก"*, *"การ์ดสำหรับแลกเปลี่ยน (Trade Binder)"*, *"คลังการ์ดระดับสูง (High Rare Vault)"*
* **Share Collection Link**:
  * สร้างลิงก์สาธารณะ (Read-only) เพื่อแชร์สมุดสะสมหรือคลังการ์ดเทรดให้เพื่อนหรือคนในกลุ่มดูผ่านลิงก์ `https://pokef.tcgcount.com/share/{shareId}`

---

### 2.5 💰 Live Price Tracking & Market Value (เช็คราคาและการประเมินมูลค่า)

* **การประเมินราคากลางตลาดการ์ด**:
  * เชื่อมโยงราคากลางจากตลาดการ์ดทั้งภาษาไทยและอิงฐานข้อมูลสากล
  * มีระบบคำนวณมูลค่ารวมทั้งสมุดสะสม (Total Binder Value) และมูลค่าเด็ค
* **คัดกรองการ์ดมูลค่าสูง**:
  * ฟิลเตอร์ดูการ์ดที่มีมูลค่าสูงสุดในคอลเลกชัน จัดอันดับ Top Value Cards เพื่อช่วยในการตัดสินใจดูแลรักษาหรือส่งเกรดการ์ด

---

### 2.6 🔄 Cross-Language Thai-English Card Mapping

* **Community Card Mapping System**:
  * ระบบจับคู่การ์ดภาษาไทยกับฐานข้อมูลการ์ดภาษาอังกฤษ เพื่อให้ผู้เล่นที่นำเข้าลิสต์เด็คภาษาอังกฤษ (PTCGL format) สามารถแปลงเป็นการ์ดภาษาไทยในคอลเลกชันได้อย่างแม่นยำ
* **Cloud Approved Mappings & Mapping Studio**:
  * ชุมชนสามารถช่วยกันเสนอคู่การ์ดผ่าน Card Mapping Studio และระบบจะดาวน์โหลด Mapping ที่ผ่านการตรวจสอบมาใช้ในแอปพลิเคชันโดยอัตโนมัติ

---

## 🏗️ สถาปัตยกรรมระบบและเทคโนโลยี (Architecture & Tech Stack)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Frontend Client (Vite Single Page App)                    │
│      React 19.2  •  TypeScript 6.0  •  Tailwind CSS v4.3  •  Zustand 5      │
└──────────────┬───────────────────────────────┬──────────────────────────────┘
               │                               │
       Google OAuth Token               Card Images & Static Assets
               ▼                               ▼
┌─────────────────────────────┐  ┌────────────────────────────────────────────┐
│      Firebase Platform      │  │        Global Edge Infrastructure          │
│  • Firebase Authentication  │  │  • Cloudflare Workers Static Assets (SPA)  │
│  • Cloud Firestore (NoSQL)  │  │  • Cloudflare R2 WebP CDN                  │
│  • Security Rules & Indexes │  │  • Pokemon Asia Official Fallback CDN      │
└─────────────────────────────┘  └────────────────────────────────────────────┘
```

| เลเยอร์ / หมวดหมู่ | เทคโนโลยีที่เลือกใช้ | รายละเอียดบทบาทและการทำงาน |
|---|---|---|
| **Core Framework** | React 19.2 + Vite 8.2 | Single Page Application ประสิทธิภาพสูง พร้อม Lazy-Loaded Route Splitting |
| **Language** | TypeScript 6.0 | กำหนด Type ป้องกันข้อผิดพลาดของ Card Data Models และ Game State |
| **Styling** | Tailwind CSS v4.3 + CSS Variables | โมเดิร์นดีไซน์ รองรับทั้ง Dark / Light Theme, Glassmorphism, Responsive Mobile-First |
| **State Management** | Zustand 5.0 (with Persist Middleware) | จัดการ Global State สำหรับสมุดสะสม, เด็ค, ธีม และการตั้งค่าระบบ |
| **Authentication** | Firebase Authentication | รองรับการเข้าสู่ระบบผ่าน Google Provider |
| **Cloud Database** | Cloud Firestore | ฐานข้อมูล NoSQL แบบ Real-time เก็บคอลเลกชันและ Binder แยกตาม Google UID |
| **AI / Machine Learning** | Tesseract.js (Client OCR) | ประมวลผล Image Recognition เพื่อสแกนเลขการ์ดโดยตรงบนเบราว์เซอร์ |
| **Deployment / CDN** | Cloudflare Workers & R2 | โฮสต์เว็บ SPA ประสิทธิภาพสูงผ่าน `wrangler.jsonc` พร้อมจัดเก็บรูปภาพการ์ด WebP |
| **Quality & Testing** | Vitest 4 + Playwright 1.62 + Oxlint | Unit Testing สำหรับคำนวณเด็ค, E2E Testing สำหรับ User Flow, และ Linter ความเร็วสูง |

---

## 📁 โครงสร้างโปรเจกต์ (Project Directory)

```
Group2CWN/
├── .github/workflows/          # CI/CD Workflows และ Cloudflare Builds
├── dist/                       # Production Build Output (พร้อมเสิร์ฟบน Cloudflare)
├── e2e/                        # Playwright End-to-End Test Suites
│   ├── collection.spec.ts      # การทดสอบการจัดการสมุดสะสมและการ์ด
│   ├── deck-manager.spec.ts    # การทดสอบระบบสร้างเด็คและเช็คการ์ดที่ขาด
│   └── navigation.spec.ts      # การทดสอบการสลับหน้าและเส้นทาง URL
├── public/                     # Static Public Assets (PWA Icons, Manifest, 404 Handler)
├── scripts/                    # สคริปต์จัดการข้อมูล รูปภาพ และ Firebase Indexes
│   ├── fetch-pokemon-prices.mjs      # สคริปต์อัปเดตราคาการ์ด
│   ├── sync-community-stats-admin.mjs # สคริปต์ซิงค์ข้อมูลสถิติชุมชน
│   └── download-all-card-images.mjs  # สคริปต์ดาวน์โหลดรูปภาพขึ้น R2
├── src/
│   ├── components/
│   │   ├── admin/              # หน้าแอดมินสำหรับตรวจทานการจับคู่การ์ด
│   │   ├── collection/         # คอมโพเนนต์ระบบสมุดสะสม (Grid, Filter, Scanner, Binder)
│   │   ├── deck/               # คอมโพเนนต์สร้างเด็ค (Editor, Missing Cards, Meta Hub)
│   │   ├── mapping/            # หน้าต่างจับคู่การ์ดภาษาไทย-อังกฤษ
│   │   ├── layout/             # Navigation Bar ด้านล่างสำหรับมือถือ (BottomNav)
│   │   └── common/             # UI Components ส่วนกลาง (Modals, Buttons, Alerts)
│   ├── data/
│   │   ├── pokemonNames.json   # ฐานข้อมูลการ์ดภาษาไทยกว่า 9,600+ รายการ
│   │   └── evolutionLines.json # ฐานข้อมูลสายวิวัฒนาการ
│   ├── hooks/                  # Custom React Hooks (เช่น useCloudForegroundSync)
│   ├── services/               # API & Firebase Services (Pairing, Cloud Sync)
│   ├── store/                  # Zustand Global Stores (auth, collection, deck, pricing)
│   ├── types/                  # TypeScript Data Types & Interfaces
│   ├── utils/                  # Helper Utilities (Card Matching, Formatters, Analytics)
│   ├── App.tsx                 # Route Controller & View Dispatcher
│   ├── index.css               # Global Theme & Tailwind Design System
│   └── main.tsx                # Application Entry Point
├── firestore.rules             # กฎความปลอดภัย Firestore Security Rules
├── playwright.config.ts        # การตั้งค่า Playwright E2E Testing
├── vite.config.ts              # การตั้งค่า Vite และ Tailwind CSS Plugin
└── wrangler.jsonc              # การตั้งค่า Cloudflare Workers Static Assets
```

---

## 💻 การติดตั้งและพัฒนาในเครื่อง (Local Setup & Development)

### 1. ความต้องการของระบบ (Prerequisites)
- **Node.js**: เวอร์ชัน `>= 20.0.0`
- **npm**: เวอร์ชัน `>= 10.0.0`

### 2. ติดตั้ง Dependencies
```bash
# โคลนโปรเจกต์
git clone https://github.com/sadin911/Group2CWN.git
cd Group2CWN

# ติดตั้งแพ็กเกจ
npm install
```

### 3. รัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: `http://localhost:5173/`

### 4. รันคำสั่งตรวจสอบโค้ดและ Typecheck
```bash
# รัน Linter ความเร็วสูงด้วย Oxlint
npm run lint

# รัน Typecheck และทดสอบ Build
npm run build
```

---

## 🧪 การทดสอบระบบ (Testing & Quality Assurance)

โปรเจกต์นี้ใช้การทดสอบอัตโนมัติแบบครอบคลุมทั้ง Unit Test และ End-to-End (E2E) Test:

### การทดสอบ Unit Test (Vitest)
```bash
npm test
```

### การทดสอบ End-to-End Test (Playwright)
```bash
# รัน E2E Tests ทั้งหมดในโหมด Headless
npm run test:e2e

# รัน E2E Tests พร้อมหน้าต่าง UI แบบ Interactive
npm run test:e2e:ui

# รัน E2E Tests แบบเปิดหน้าต่างเบราว์เซอร์จริง (Headed)
npm run test:e2e:headed
```

---

## 🚀 การ Build และ Deploy สู่ Production (Cloudflare Workers)

โปรเจกต์นี้ผสานรวมกับ **Cloudflare CI (Workers Builds)** เพื่อส่งมอบแอปพลิเคชันอย่างรวดเร็วและปลอดภัยระดับ Edge:

1. **การ Build Production Bundle**:
   ```bash
   npm run build
   ```
   ผลลัพธ์จะถูกสร้างลงโฟลเดอร์ `dist/`

2. **การ Deploy ขึ้น Cloudflare Workers**:
   Cloudflare CI จะอ่านการตั้งค่าจาก [`wrangler.jsonc`](wrangler.jsonc):
   ```jsonc
   {
     "name": "pokecounttracker",
     "compatibility_date": "2024-09-23",
     "assets": {
       "directory": "./dist",
       "not_found_handling": "single-page-application"
     }
   }
   ```
   > ⚠️ **ข้อควรระวัง**: ห้ามลบไฟล์ `wrangler.jsonc` เนื่องจากเป็นตัวควบคุมการเสิร์ฟไฟล์ SPA และป้องกันข้อผิดพลาด 404 เมื่อผู้ใช้เข้าถึง URL ภายใน

---

## 🤝 กฎการพัฒนาและการมีส่วนร่วม (Guidelines & Cross-Agent Rules)

สำหรับผู้พัฒนาและ AI Assistants (Claude Code, Antigravity IDE, Gemini CLI, Cursor, Copilot) ที่ร่วมพัฒนาโปรเจกต์นี้ ต้องปฏิบัติตามกฎมาตรฐานใน [`AGENTS.md`](AGENTS.md) อย่างเคร่งครัด:

1. **Mandatory Version Bump & Git Tag on Deploy**:
   - เมื่อขึ้นเวอร์ชันใหม่ ต้องอัปเดต `"version"` ใน [`package.json`](package.json)
   - บันทึกการเปลี่ยนแปลงใน [`AI_LOG.md`](AI_LOG.md) ก่อน Commit
   - ทำ **Single Atomic Commit** ร่วมกันระหว่างโค้ด, package.json และ AI_LOG.md
   - สร้าง Annotated Git Tag เช่น `v3.4.3` และ Push ไปยัง Repository
2. **Thai Language Priority for UI Display**:
   - ข้อความบนหน้าจอผู้ใช้ เช่น ชื่อการ์ด, ชื่อท่าโจมตี, และความสามารถ ต้องให้ความสำคัญกับภาษาไทยเป็นอันดับแรก (`card.nameTh || card.name`)
3. **Automated E2E Verification Only**:
   - ตรวจสอบความถูกต้องของหน้าเว็บและฟังก์ชันผ่าน Playwright E2E เท่านั้น หลีกเลี่ยงการจับภาพหน้าจอแบบแมนนวล

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้เผยแพร่ภายใต้ใบอนุญาต **MIT License** — สามารถนำไปใช้ ปรับปรุง และพัฒนาต่อได้อย่างอิสระ ดูรายละเอียดเพิ่มเติมได้ที่ไฟล์ [LICENSE](LICENSE)

<br />

<div align="center">
  <sub>Developed with ❤️ for the Pokémon TCG Community Worldwide</sub>
</div>
