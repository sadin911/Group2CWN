# Source 05 · รายงานสรุปเหตุการณ์บั๊กใน Production (Incident Post-Mortem Reports `v2.33.0` & `v2.42.1`)

- **รหัสแหล่งข้อมูล**: `SRC-05-INCIDENT-POSTMORTEMS`
- **รูปแบบข้อมูล**: Engineering Post-Mortem Memo จาก `/Users/sadin/Project/PokeCountTracker/HANDOVER.md`
- **ผู้จัดทำ**: ทีมวิศวกรรม `PokéCount Tracker`

---

## Incident #1 (`INC-2026-v2.33.0`): ข้อมูลราคาต้นทุนส่วนตัว (`costPrice`) รั่วไหลในลิงก์แชร์สาธารณะ (`pk_xxxxxxxx`)

- **อาการที่พบ**: เมื่อผู้ใช้กดสร้างลิงก์แชร์สมุดสะสมสาธารณะ (`POST /api/share/snapshot`) ระบบคัดลอก Object ของการ์ดทั้งก้อนจาก `collectionStore` ลงคอลเลกชัน `shared_collections` บน Firestore โดยลืมลบฟิลด์ `costPrice`, `customPrice`, และ `privateNotes`
- **ผลกระทบ**: ผู้ที่เปิดลิงก์ `https://poke.tcgcount.com/s/pk_xxxxxxxx` แล้วกดดู Network Payload ใน DevTools จะเห็นราคาต้นทุนที่เจ้าของสมุดซื้อการ์ดมาจริงทุกใบ
- **การแก้ไขและกฎทดสอบถาวร (`BR-05`)**:
  - ต้องกรอง (`strip`) ฟิลด์ `costPrice`, `customPrice`, และ `privateNotes` ออก 100% ก่อนบันทึกและก่อนส่งออกทาง API แชร์สาธารณะ

---

## Incident #2 (`INC-2026-v2.42.1`): สมุดสะสมที่ลบไปแล้วฟื้นคืนชีพข้ามอุปกรณ์ (`Zombie Binder Resurrection`)

- **อาการที่พบ**: ผู้ใช้ล็อกอินบัญชีเดียวกันบน 2 อุปกรณ์ (อุปกรณ์ A ลบสมุด `B-02` ทิ้ง ส่วนอุปกรณ์ B เพิ่งกลับมาออนไลน์และส่งข้อมูลสมุด `B-02` ที่ค้างอยู่ในเครื่องขึ้น Cloud) ระบบ Merge แบบเดิมเห็นว่า `B-02` ไม่มีใน Cloud จึงสร้าง `B-02` กลับขึ้นมาใหม่
- **การแก้ไขและกฎทดสอบถาวร (`BR-15`)**:
  - เพิ่มอาร์เรย์ `deletedBinderIds` (Tombstone Registry) ผูกกับบัญชีผู้ใช้ และตรวจ `expectedRevision` (`syncRevision`)
  - หากคำขอซิงค์พยายามเขียนข้อมูลลงสมุดที่อยู่ใน `deletedBinderIds` ต้องปฏิเสธด้วย `409 BINDER_TOMBSTONED` ทันที
