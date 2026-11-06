/**
 * Aggregates card ownership across every user's binders into
 * `community_stats/ownership`.
 *
 * Run with: npm run community:sync
 *
 * This must use the Admin SDK. It reads `binders` as a collection group across
 * all users, which the Firestore rules deny to client SDKs on purpose — no
 * signed-in user should be able to read another user's binder. The Admin SDK
 * authenticates with a service account and bypasses rules.
 *
 * A client-SDK version of this script existed and was removed: it stopped
 * working when the rules were tightened, and making it work again would have
 * meant opening every binder to every signed-in user. Do not reintroduce one.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Find service account file in project root
function findServiceAccountKey() {
  const files = fs.readdirSync(rootDir);
  for (const file of files) {
    if (
      (file.startsWith('serviceAccount') ||
        file.startsWith('pokecount-tracker') ||
        file.includes('firebase-adminsdk')) &&
      file.endsWith('.json')
    ) {
      return path.join(rootDir, file);
    }
  }
  return null;
}

const keyPath = findServiceAccountKey();

if (!keyPath) {
  console.error('\n❌ ไม่พบไฟล์ Service Account Key ในโฟลเดอร์โปรเจกต์!');
  console.error('👉 กรุณาดาวน์โหลดไฟล์ Key จาก Firebase Console:');
  console.error('   https://console.firebase.google.com/project/pokecount-tracker/settings/serviceaccounts/adminsdk');
  console.error('   แล้วนำมาวางในโฟลเดอร์หลักของโปรเจกต์ (เช่น ตั้งชื่อว่า serviceAccountKey.json)\n');
  process.exit(1);
}

console.log(`🔑 กำลังโหลด Service Account Key จาก: ${path.basename(keyPath)}`);

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: 'pokecount-tracker',
});

const auth = getAuth(app);
const db = getFirestore(app);

async function runCommunitySync() {
  console.log('🚀 เริ่มต้นการดึงและรวบรวมข้อมูลจาก Firebase...\n');

  try {
    // 1. ดึงรายชื่อ User ทั้งหมดจาก Firebase Authentication
    console.log('👥 [1/3] กำลังดึงรายชื่อผู้ใช้จาก Firebase Authentication...');
    const userRecords = [];
    let pageToken;
    do {
      const listUsersResult = await auth.listUsers(1000, pageToken);
      userRecords.push(...listUsersResult.users);
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    console.log(`   ➔ พบ User ใน Firebase Auth ทั้งหมด: ${userRecords.length} คน`);

    // 2. ดึง Binders ทั้งหมดจาก Firestore (Collection Group 'binders')
    console.log('📦 [2/3] กำลังดึงสมุดสะสมการ์ด (Binders) ทั้งหมดจาก Firestore...');
    const bindersSnap = await db.collectionGroup('binders').get();
    console.log(`   ➔ พบ Binder ทั้งหมด: ${bindersSnap.size} เล่ม`);

    // 3. รวมสถิติการครอบครองการ์ดแต่ละใบ
    const allUsersSet = new Set(userRecords.map((u) => u.uid));
    const cardOwnersMap = new Map(); // cardId -> Set of unique userIds

    bindersSnap.forEach((docSnap) => {
      const pathSegments = docSnap.ref.path.split('/');
      // Path format: users/{userId}/binders/{binderId}
      const userId = pathSegments[1];
      if (userId) {
        allUsersSet.add(userId);
      }

      const data = docSnap.data();
      const cards = data?.cards || {};

      for (const [cardId, cardEntry] of Object.entries(cards)) {
        if (!cardEntry) continue;
        const variants = cardEntry.variants || {};
        const count = Object.values(variants).reduce((sum, n) => sum + (Number(n) || 0), 0);

        if (count > 0 && userId) {
          if (!cardOwnersMap.has(cardId)) {
            cardOwnersMap.set(cardId, new Set());
          }
          cardOwnersMap.get(cardId).add(userId);
        }
      }
    });

    const totalUsers = Math.max(1, allUsersSet.size);
    const cardOwners = {};

    cardOwnersMap.forEach((userSet, cardId) => {
      cardOwners[cardId] = userSet.size;
    });

    const payload = {
      totalUsers,
      cardOwners,
      lastUpdatedAt: Date.now(),
    };

    console.log('\n📊 [3/3] สรุปผลสถิติที่รวบรวมได้:');
    console.log(`   - 👤 จำนวนผู้ใช้จริงทั้งหมด (Total Users): ${totalUsers} คน`);
    console.log(`   - 🎴 จำนวนการ์ดที่มีผู้ครอบครองแล้ว: ${Object.keys(cardOwners).length.toLocaleString()} ใบ`);

    // 4. บันทึกลง Firestore 'community_stats/ownership'
    console.log('\n💾 กำลังอัปเดตสถิติขึ้น Firestore (`community_stats/ownership`)...');
    await db.doc('community_stats/ownership').set(payload);
    console.log('   ✅ อัปเดต Firestore สำเร็จ!');

    // 5. บันทึกสำเนาลง src/data/communityStatsDefault.json
    const defaultJsonPath = path.join(rootDir, 'src', 'data', 'communityStatsDefault.json');
    fs.writeFileSync(defaultJsonPath, JSON.stringify(payload, null, 2), 'utf8');
    console.log(`   ✅ อัปเดตไฟล์เริ่มต้น ${path.basename(defaultJsonPath)} สำเร็จ!`);

    // 6. ซิงค์รายชื่อ User ทั้งหมดจาก Firebase Auth ลง Firestore collection 'users'
    console.log('\n👥 กำลังซิงค์ข้อมูลผู้ใช้ทั้งหมดลง Firestore (`users` collection)...');
    const batch = db.batch();
    for (const u of userRecords) {
      const userRef = db.collection('users').doc(u.uid);
      batch.set(
        userRef,
        {
          uid: u.uid,
          email: u.email || null,
          displayName: u.displayName || null,
          photoURL: u.photoURL || null,
          lastLoginAt: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime).getTime() : Date.now(),
          createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).getTime() : Date.now(),
        },
        { merge: true }
      );
    }
    await batch.commit();
    console.log(`   ✅ ซิงค์ผู้ใช้ลง Firestore สำเร็จ: ${userRecords.length} บัญชี!`);

    console.log('\n🎉 เสร็จสิ้นกระบวนการทั้งหมดเรียบร้อยแล้ว!');
    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  }
}

runCommunitySync();
