<div align="center">

# ⚡ PokéCount Tracker & PokéCollection 📚
### The All-in-One Companion & Collection Vault for Tabletop Card Games

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white&style=for-the-badge)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?logo=firebase&logoColor=black&style=for-the-badge)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<br />

**[🌐 เข้าใช้งานเว็บไซต์ (Cloudflare Production)](https://pokef.tcgcount.com)** • 
**[📚 สมุดสะสมการ์ด (PokéCollection)](https://pokef.tcgcount.com/collection)** • 
**[📑 เอกสารทบทวนความต้องการ (User Requirement Review)](./review/USER-REQUIREMENTS-REVIEW-PLAY.md)**

> 🪄 โหมด Disney Lorcana ถูกแยกออกไปเป็นโปรเจกต์อิสระแล้ว →
> **[LorcanaCountTracker](https://github.com/sadin911/LorcanaCountTracker)**

</div>

---

## 📖 สารบัญ (Table of Contents)
- [✨ ภาพรวมของโปรเจกต์ (Overview)](#-ภาพรวมของโปรเจกต์-overview)
- [🌟 ฟีเจอร์หลัก (Key Features)](#-ฟีเจอร์หลัก-key-features)
  - [1. 📚 PokéCollection Tracker (ระบบสมุดสะสมการ์ดโปเกมอนภาษาไทย)](#1--pokécollection-tracker-ระบบสมุดสะสมการ์ดโปเกมอนภาษาไทย)
  - [2. ☁️ Google Authentication & Firestore Cloud Sync](#2-️-google-authentication--firestore-cloud-sync)
  - [3. 🎮 Pokémon TCG Battle Companion (กระดานนับแต้มแข่งการ์ด)](#3--pokémon-tcg-battle-companion-กระดานนับแต้มแข่งการ์ด)
  - [4. 🎲 Shared Tabletop Tools (เครื่องมือเสริมการเล่น)](#4--shared-tabletop-tools-เครื่องมือเสริมการเล่น)
- [🏗️ โครงสร้างสถาปัตยกรรมและเทคโนโลยี (Architecture & Tech Stack)](#️-โครงสร้างสถาปัตยกรรมและเทคโนโลยี-architecture--tech-stack)
- [📁 โครงสร้างโปรเจกต์ (Project Directory)](#-โครงสร้างโปรเจกต์-project-directory)
- [💻 การติดตั้งและรันในเครื่อง (Local Setup & Development)](#-การติดตั้งและรันในเครื่อง-local-setup--development)
- [🌐 การตั้งค่า GitHub Pages & Single Page Routing](#-การตั้งค่า-github-pages--single-page-routing)
- [📄 ใบอนุญาต (License)](#-ใบอนุญาต-license)

---

## ✨ ภาพรวมของโปรเจกต์ (Overview)

**PokéCount Tracker** เป็น Progressive Web Application สำหรับผู้เล่นและนักสะสมการ์ดเกม โดยรวม 2 ฟังก์ชันหลักไว้ในที่เดียว:
1. **PokéCollection Tracker**: สมุดสะสมการ์ดโปเกมอนภาษาไทยอย่างเป็นทางการกว่า **9,600+ ใบ** พร้อมรูปภาพความละเอียดสูง รองรับการบันทึกแยกประเภทฟอยล์ (Normal, Holo, Reverse Foil, Promo), ระบบค้นหาตามชื่อชุด/ชื่อการ์ด, เช็คราคาการ์ด และการเชื่อมต่อ **Cloud Firestore Sync** ผ่าน **Google Login**
2. **PokéDeck Builder & Missing Cards**: ระบบจัดเด็คการ์ด 60 ใบตามกฎการแข่งขัน พร้อมฟังก์ชันตรวจสอบการ์ดที่ยังขาดในคอลเลกชัน วิเคราะห์สัดส่วนเด็ค และทดลองสุ่มการ์ดเปิดมือแรก (Test Hand)

---

## 🌟 ฟีเจอร์หลัก (Key Features)

### 1. 📚 PokéCollection Tracker (ระบบสมุดสะสมการ์ดโปเกมอนภาษาไทย)
* **ฐานข้อมูลการ์ดภาษาไทยครบครัน 9,554+ รายการ**: ครอบคลุมตั้งแต่ Series A, Sun & Moon, Sword & Shield, Scarlet & Violet (SV1–SV9) รวมถึงชุดพิเศษ Mega Evolution และการ์ดโปรโมทั้งหมด
* **คลาวด์รูปภาพการ์ดแบบ WebP**: โหลดเร็ว ลื่นไหล ผ่าน Cloudflare R2 CDN พร้อมระบบ Automatic Fallback ไปยัง Official Asia CDN
* **ระบบตรวจจับเวอร์ชันการ์ดอัจฉริยะ (Smart Variant System)**:
  * การ์ดระดับสูง (ex, VMAX, VSTAR, SAR, UR, MUR, AR): แสดงเฉพาะตัวนับฟอยล์พิเศษ
  * การ์ดชุดหลักทั่วไป: แยกนับแบบ **⚪ ธรรมดา (Normal)**, **🌟 รีเวิร์ส/มิลเลอร์ (Mirror Foil)** และ **✨ ฟอยล์ (Holo)**
  * การ์ดโปรโม: แสดงเฉพาะแบบ **🎁 Promo**
* **ระบบค้นหาแบบครอบคลุม (Multi-Search)**: ค้นหาได้ทั้ง **ชื่อการ์ดภาษาไทย**, **เลขการ์ด**, **รหัสชุด (เช่น SV1a, MA2, SC1a)**, และ **ชื่อชุดภาษาไทย (เช่น อัคคีสีคราม, ทริปเปิลบีต, ซอร์ด แอนด์ ชีลด์)**
* **ระบบกรองข้อมูลแบบละเอียด**: กรองตามชุดการ์ด (Expansion Sets 80+ ชุด), ธาตุพลังงาน (Energy Types), หมวดหมู่การ์ด (Pokemon, Trainer, Energy), ระดับการวิวัฒนาการ (Basic, Stage 1, Stage 2), และสถานะ (มีแล้ว, ยังไม่มี, Wishlist, ซ้ำ)
* **ระบบเลื่อนโหลดอัตโนมัติ (Infinite Scroll)**: โหลดการ์ดทีละ 60 ใบด้วย `IntersectionObserver` ลื่นไหลไม่กระตุก
* **การจัดการหลายสมุดสะสม (Multi-Binder Profiles)**: สร้างสมุดสะสมได้หลายเล่มพร้อมเลือกไอคอนอิโมจิ (เช่น สมุดสะสมหลัก, การ์ดสำหรับแลกเปลี่ยน, การ์ดเด็คแข่ง)
* **สำรองและกู้คืนข้อมูล (JSON Backup & Import)**: Export/Import คอลเลกชันเป็นไฟล์ JSON หรือคัดลอกลงคลิปบอร์ดได้ตลอดเวลา

---

### 2. ☁️ Google Authentication & Firestore Cloud Sync
* **One-Click Google Sign-In**: เข้าสู่ระบบด้วยบัญชี Google ผ่าน Popup ปลอดภัยและรวดเร็ว
* **Real-time NoSQL Cloud Storage**: ซิงค์ข้อมูลการ์ดทั้งหมดลง Firebase Cloud Firestore อัตโนมัติ (`users/{uid}/binders/{binderId}`)
* **Data Isolation (แยกข้อมูลชัดเจน)**:
  * **Guest Mode**: ผู้ใช้ทั่วไปบันทึกลง LocalStorage เครื่องตัวเองทันทีโดยไม่ต้องล็อกอิน
  * **User Mode**: เมื่อล็อกอิน ระบบจะโหลดและซิงค์การ์ดของบัญชี Google นั้น และเมื่อ Logout หน้าจอจะสลับกลับเป็น Guest Mode ที่สะอาด ไม่ทิ้งข้อมูลค้างไว้
* **Cross-Device Support**: สะสมบนคอมพิวเตอร์ แล้วเปิดตรวจเช็กการ์ดที่ขาดบนมือถือตอนไปงานแข่งหรือร้านการ์ดได้ทันที

---

### 3. 🎮 Pokémon TCG Battle Companion (กระดานนับแต้มแข่งการ์ด)
* **ตัวนับดาเมจ (Damage Counters)**: แตะเพื่อ +10 / −10, กดค้างเพื่อเพิ่ม/ลดต่อเนื่อง, ปุ่มลัด +30 / +60 / +90
* **พรีเซ็ต HP & ระบบตรวจจับ KO**: เลือกค่า HP มาตรฐาน (30–340) หรือพิมพ์กำหนดเอง ช่องการ์ดจะเปลี่ยนเป็นสีแดงพร้อมเตือน "KO!" เมื่อดาเมจถึงกำหนด
* **เมนูวิวัฒนาการ 1-Tap (Evolution Modal)**: ค้นหาสายวิวัฒนาการภาษาไทยที่เชื่อมโยงกันอย่างแม่นยำ กดเปลี่ยนเป็นการ์ดร่างพัฒนาได้ในสัมผัสเดียว
* **ตัวนับการ์ดรางวัล (Prize Cards)**: แทร็กเกอร์ 6 จุดสำหรับทั้งสองฝ่าย แตะเพื่ออัปเดตแบบ Real-time
* **เครื่องมือแทร็กสถานะผิดปกติ (Status Conditions)**: ติดพิษ (Poisoned), ไฟไหม้ (Burned), หลับ (Asleep), ชา (Paralyzed), สับสน (Confused) พร้อมคำนวณดาเมจและทอยเหรียญรักษาอัตโนมัติเมื่อกดจบเทิร์น (End Turn)
* **ตัวนับพลังงาน (Energy Tracker)**: แทร็กประเภทพลังงานครบทั้ง 10 ธาตุ
* **สลับตำแหน่งการ์ด (Card Swap)**: แตะหรือลากการ์ดเพื่อสลับตำแหน่งระหว่าง Active Slot และ Bench Slot ได้อิสระ

---

### 4. 🎲 Shared Tabletop Tools (เครื่องมือเสริมการเล่น)
* **3D Animated Coin Flip**: ทอยเหรียญ 3 มิติ แสดงผลหัว (Heads) / ก้อย (Tails)
* **3D Animated Dice Roller**: ทอยลูกเต๋า 6 หน้า (d6) แบบแอนิเมชัน
* **Game Reset**: กล่องข้อความยืนยันก่อนเริ่มเกมใหม่ เพื่อป้องกันการกดพลาด

---

## 🏗️ โครงสร้างสถาปัตยกรรมและเทคโนโลยี (Architecture & Tech Stack)

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Vite)                       │
│  React 18  •  TypeScript  •  Tailwind CSS v4  •  Zustand    │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
        Google Auth Token                Card Image URLs
               ▼                               ▼
┌─────────────────────────────┐  ┌─────────────────────────────┐
│      Firebase Services      │  │        Cloud Storage        │
│  • Google Authentication    │  │  • Cloudflare R2 WebP CDN   │
│  • Cloud Firestore (NoSQL)  │  │  • Pokemon Asia Official CDN│
└─────────────────────────────┘  └─────────────────────────────┘
```

| หมวดหมู่ | เทคโนโลยีที่เลือกใช้ | รายละเอียดการใช้งาน |
|---|---|---|
| **Core Framework** | React 18 + Vite 8 | Single Page Application ประสิทธิภาพสูง โหลดเร็ว |
| **Language** | TypeScript | Type Safety ควบคุม Data Model ของการ์ดและ State |
| **Styling** | Tailwind CSS v4 + Vanilla CSS | ออกแบบ UI สไตล์ Dark Theme, Glassmorphism, Micro-animations |
| **State Management** | Zustand (with Persist) | จัดการ Global State สำหรับ Battle Board และ Collection Store |
| **Authentication** | Firebase Auth (Google Provider) | ระบบ Login with Google แบบ One-Click Popup |
| **Database** | Firebase Cloud Firestore (NoSQL) | จัดเก็บ Collection และ Binder Cards แยกตาม Google UID |
| **Media & Assets** | Cloudflare R2 + Official CDN | โฮสต์รูปภาพการ์ด WebP 9,546 ภาพ โหลดเร็วทั่วโลก |
| **CI/CD & Hosting** | GitHub Pages + GitHub Actions | Automated Build & Deploy พร้อม SPA 404 Redirect Handler |

---

## 📁 โครงสร้างโปรเจกต์ (Project Directory)

```
PokeCountTracker/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions Workflow สำหรับ Deploy ขึ้น Pages
├── public/
│   ├── 404.html                    # SPA Redirect Handler สำหรับ GitHub Pages
│   └── favicon.svg                 # ไอคอนเว็บไซต์
├── src/
│   ├── components/
│   │   ├── collection/             # คอมโพเนนต์ระบบสมุดสะสมการ์ด
│   │   │   ├── CollectionTracker.tsx       # หน้ารวมระบบสะสม (Main View)
│   │   │   ├── CollectionHeader.tsx        # Header, Profile Selector, Google Login
│   │   │   ├── CollectionFilterBar.tsx     # ช่องค้นหา, ฟิลเตอร์ชุด, ธาตุ, หมวดหมู่
│   │   │   ├── CollectionGridView.tsx      # Infinite Scroll Card Grid
│   │   │   ├── CollectionCardItem.tsx      # การ์ดแต่ละใบ + Badge จำนวนและ Wishlist
│   │   │   ├── CardCollectionModal.tsx     # หน้าต่างจัดการจำนวนการ์ด & สภาพการ์ด
│   │   │   ├── ProfileManagerModal.tsx     # หน้าต่างจัดการสมุดสะสม (Multi-Profiles)
│   │   │   └── CollectionBackupModal.tsx   # หน้าต่าง Export / Import ข้อมูล JSON
│   │   ├── mini/                   # คอมโพเนนต์กระดานแข่ง Pokémon Mini Card Board
│   │   ├── pokemon/                # พรีเซ็ต HP, การจำลองวิวัฒนาการ, ซูมรูปการ์ด
│   │   └── tools/                  # เหรียญทอย 3D, ลูกเต๋า 3D
│   ├── data/
│   │   ├── pokemonNames.json       # ฐานข้อมูลการ์ดภาษาไทย 9,554 รายการ
│   │   └── evolutionLines.json     # ดัชนีสายวิวัฒนาการการ์ดโปเกมอนภาษาไทย
│   ├── store/
│   │   ├── authStore.ts            # Zustand Store สำหรับ Firebase Auth & User Session
│   │   ├── collectionStore.ts      # Zustand Store + Cloud Firestore Sync
│   │   ├── gameStore.ts            # Zustand Store สำหรับกระดานแข่งโปเกมอน
│   ├── types/
│   │   ├── collection.ts           # Type definitions สำหรับคอลเลกชันและการ์ด
│   │   └── game.ts                 # Type definitions สำหรับกระดานแข่งขัน
│   ├── utils/
│   │   ├── cardImage.ts            # ฟังก์ชันจัดการ Image URL และ CDN Fallbacks
│   │   └── firebase.ts             # การตั้งค่า Firebase Client SDK
│   ├── App.tsx                     # Main App Routing (/, /collection, /deck, /battle)
│   └── index.css                   # Global Design System & Fullscreen Overrides
└── scripts/
    └── download-all-card-images.mjs # สคริปต์ดาวน์โหลดรูปภาพการ์ดจาก Cloudflare R2
```

---

## 💻 การติดตั้งและรันในเครื่อง (Local Setup & Development)

### 1. โคลนโปรเจกต์และติดตั้ง Dependencies
```bash
git clone https://github.com/sadin911/PokeCountTracker.git
cd PokeCountTracker
npm install
```

### 2. รัน Dev Server
```bash
npm run dev
```
เปิดบราวเซอร์ไปที่: `http://localhost:5173/PokeCountTracker/`

### 3. ตรวจสอบการ Build สำหรับ Production
```bash
npm run build
```

---

## 🌐 การตั้งค่า GitHub Pages & Single Page Routing

เนื่องจาก GitHub Pages เป็น Static Hosting การเข้าถึง Deep Link URL โดยตรง (เช่น `/collection` หรือ `/deck`) จะถูกดักจับผ่าน `public/404.html` ซึ่งจะส่งคำขอไปยัง `index.html` เพื่อให้ React Router / State จัดการโหลดหน้าเว็บที่ถูกต้องโดยอัตโนมัติ

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้เผยแพร่ภายใต้ใบอนุญาต **MIT License** ดูรายละเอียดเพิ่มเติมได้ที่ไฟล์ [LICENSE](LICENSE)

<br />

<div align="center">
  <sub>Developed with ❤️ for the Pokémon TCG Community</sub>
</div>
