# LAB 3 · System Design (`DESIGN.md` — Architecture · Use Case · Flowchart · ERD · Sequence)

> ออกแบบระบบครบทั้ง 5 มุมมองตามแนวทางบทเรียนที่ 04 สำหรับ **`PokéCount Tracker`** โดยอ้างอิงจาก [`USER-STORIES.md`](USER-STORIES.md) และ [`REQUIREMENTS.md`](REQUIREMENTS.md)

---

## 1. สถาปัตยกรรมระบบ (`System Architecture Diagram`)

```mermaid
flowchart TB
    subgraph Client["Client Browser / Mobile PWA (375px & Desktop)"]
        UI["React 19 + Tailwind UI\n(/th, /en, Collection, Deck, Battle, Share)"]
        Zustand["Zustand Local State\n(collectionStore, deckStore, gameStore, authStore)"]
        IDB["localStorage / IndexedDB\n(Offline Cache & Guest Mode Storage)"]
    end

    subgraph Server["PokéCount API & Sync Engine"]
        Guard["Auth & Cloud-Write Guard\n(Block Guest Writes, Check RBAC)"]
        Val["TCG Rule & Pricing Engine\n(60-Card Validator, THB Ratio, Partner Quote)"]
        Sync["Optimistic Revision & Tombstone Engine\n(syncRevision + deletedBinderIds)"]
        Sanitizer["Privacy & PDPA Sanitizer\n(Strip costPrice, Mask 13-digit Tax ID)"]
    end

    subgraph Storage["Persistence & CDN Layer"]
        DB[("Firestore / Relational Store\nusers, binders, cards, shared_collections")]
        CDN[("Cloudflare R2 Image CDN\n9,554+ Thai & 6,700+ EN Card WebP")]
    end

    UI <--> Zustand
    Zustand <--> IDB
    UI <-->|HTTPS JSON API| Guard
    Guard --> Val
    Guard --> Sync
    Guard --> Sanitizer
    Val --> DB
    Sync --> DB
    Sanitizer --> DB
    UI -->|Lazy Load 60 cards/page| CDN
```

---

## 2. แผนภาพกรณีการใช้งาน (`Use Case Diagram`)

```mermaid
flowchart LR
    Guest["👤 น้องข้าวปั้น (Guest / Tabletop Battler)"]
    Col["💼 คุณภูมิ (Whale Collector)"]
    Play["🏆 น้องมีน (Competitive Meta Player)"]
    Expat["🌏 Mr. Kenji (Expat EN User)"]
    Admin["🛡️ คุณซาดิน (Admin / Owner)"]

    subgraph PokeCount["ระบบ PokéCount Tracker"]
        UC1("นับการ์ด 0..99 ตาม Smart Variant & จัดการสมุด 1..10 เล่ม")
        UC2("คำนวณราคาตลาดไทย THB & แชร์ลิงก์ pk_xxxxxxxx (ไร้ costPrice)")
        UC3("จัดเด็ค 60 ใบ & ตรวจกฎ 4 ใบ / ACE SPEC / Radiant")
        UC4("คำนวณการ์ดที่ขาด & เทียบโหมดคำนวณ Equivalent vs Exact Mode")
        UC5("คำนวณดาเมจกระดานแข่ง (Active vs Bench) & จบเทิร์น Checkup")
        UC6("ซิงค์สมุดสะสมข้ามอุปกรณ์ & ป้องกันสมุดผีด้วย Tombstone")
        UC7("อนุมัติคู่การ์ดไทย-อังกฤษในหน้า /admin")
    end

    Guest --> UC5
    Guest --> UC1
    Col --> UC1
    Col --> UC2
    Col --> UC6
    Play --> UC3
    Play --> UC4
    Expat --> UC3
    Admin --> UC7
```

---

## 3. ผังงานการคำนวณการคำนวณการ์ดที่ขาดร้านพาร์ทเนอร์และคูปอง (`Pricing & Discount Flowchart`)

```mermaid
flowchart TD
    Start(["เริ่มคำนวณรายการการ์ดที่ขาด Missing Cards"]) --> CalcMissing["สำหรับแต่ละใบในเด็ค:\nmissingQty = max(0, neededQty - ownedInBinder)"]
    CalcMissing --> Gross["คำนวณยอดรวมก่อนลด:\ngrossMissingThb = Σ (missingQty × round(usd × 34.0 × thaiPriceRatio))"]
    Gross --> Check1000{"grossMissingThb >= 1,000 THB?"}
    Check1000 -- ใช่ --> P10["partnerDiscount = round(grossMissingThb × 0.10)"]
    Check1000 -- ไม่ใช่ --> P0["partnerDiscount = 0"]
    P10 --> CheckCoupon{"กรอกโหมด Exact\nและ grossMissingThb >= 1,500?"}
    P0 --> CheckCoupon
    CheckCoupon -- ใช่ --> C150["couponDiscount = 150"]
    CheckCoupon -- ไม่ใช่ --> C0["couponDiscount = 0"]
    C150 --> Compare{"partnerDiscount >= couponDiscount?"}
    C0 --> Compare
    Compare -- "ใช่ (รวมกรณีเท่ากันที่ 1,500฿)" --> UsePartner["เลือก PARTNER_10PCT\nappliedDiscount = partnerDiscount"]
    Compare -- ไม่ใช่ --> UseCoupon["เลือก COUPON_Exact Mode\nappliedDiscount = 150"]
    UsePartner --> Net["netTotalThb = grossMissingThb - appliedDiscount"]
    UseCoupon --> Net
    Net --> End(["คืนค่า JSON Quote พร้อม Masked Tax ID"])
```

---

## 4. แผนภาพความสัมพันธ์ของข้อมูล (`Entity-Relationship Diagram — ERD`)

```mermaid
erDiagram
    USER_ACCOUNT ||--o{ BINDER : "owns (1..10 binders)"
    USER_ACCOUNT ||--o{ TOMBSTONE_BINDER : "tracks deletedBinderIds"
    BINDER ||--o{ BINDER_ITEM : "contains"
    CARD_CATALOG ||--o{ BINDER_ITEM : "referenced by"
    USER_ACCOUNT ||--o{ DECK : "builds"
    DECK ||--o{ DECK_SLOT : "has (total 60 cards)"
    CARD_CATALOG ||--o{ DECK_SLOT : "used in"
    BINDER ||--o{ SHARED_SNAPSHOT : "publishes as pk_xxxxxxxx"

    USER_ACCOUNT {
        string userId PK
        string email
        string role "GUEST | MEMBER | ADMIN"
        int syncRevision
        string maskedTaxId
    }
    BINDER {
        string binderId PK
        string userId FK
        string name
        datetime updatedAt
    }
    TOMBSTONE_BINDER {
        string userId PK, FK
        string deletedBinderId PK
        datetime deletedAt
    }
    CARD_CATALOG {
        string cardId PK
        string nameTh
        string nameEn
        string rarity "C|U|R|RR|AR|SR|SAR|UR|MUR|ACE_SPEC|R_RADIANT|BASIC_ENERGY"
        float usdPrice
        float thaiPriceRatio
        int marketPriceThb
        boolean isBasicPokemon
        boolean isBasicEnergy
        boolean isAceSpec
        boolean isRadiant
    }
    BINDER_ITEM {
        string binderId PK, FK
        string cardId PK, FK
        int normalQty "0..99"
        int mirrorQty "0..99"
        int holoQty "0..99"
        int costPriceThb "Private Only"
        string privateNotes "Private Only"
    }
    SHARED_SNAPSHOT {
        string shareId PK "pk_xxxxxxxx"
        string binderId FK
        int totalMarketValueThb
        json sanitizedItems "NO costPrice / privateNotes"
    }
```

---

## 5. แผนภาพลำดับการทำงานและป้องกัน Race Condition (`Sequence Diagram — Cross-Device Tombstone Sync`)

```mermaid
sequenceDiagram
    actor DevA as "อุปกรณ์ A (iPad คุณภูมิ)"
    actor DevB as "อุปกรณ์ B (มือถือเพิ่งต่อเน็ต)"
    participant API as "PokéCount Sync API"
    participant DB as "Firestore / State Store"

    DevA->>API: DELETE /api/binders/B-02 (expectedRevision: 5)
    API->>DB: ลบ B-02 + เพิ่ม "B-02" ลง deletedBinderIds + syncRevision = 6
    DB-->>API: OK (syncRevision: 6, deletedBinderIds: ["B-02"])
    API-->>DevA: 200 OK

    Note over DevB,API: อุปกรณ์ B เพิ่งออนไลน์ พยายามส่งข้อมูลสมุด B-02 ที่ค้างในเครื่องกลับมา
    DevB->>API: POST /api/sync/binders (binderId: "B-02", expectedRevision: 5)
    API->>DB: ตรวจพบ "B-02" อยู่ใน deletedBinderIds!
    DB-->>API: Tombstone Match!
    API-->>DevB: 409 Conflict (code: "BINDER_TOMBSTONED")
    Note over DevB: ลบ B-02 ออกจากเครื่อง B ทันที สมุดผีไม่ฟื้นคืนชีพ!
```
