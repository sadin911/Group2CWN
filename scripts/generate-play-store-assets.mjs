import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('play_store_assets');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. Copy App Icon 512x512
const iconSource = path.resolve('public/pwa-512x512.png');
const iconDest = path.join(OUT_DIR, 'app_icon_512x512.png');
if (fs.existsSync(iconSource)) {
  fs.copyFileSync(iconSource, iconDest);
  console.log('✅ Copied app_icon_512x512.png');
}

async function run() {
  const browser = await chromium.launch();

  // --- 2. Generate Feature Graphic (1024 x 500) ---
  console.log('🎨 Generating Feature Graphic (1024 x 500)...');
  const fgPage = await browser.newPage({
    viewport: { width: 1024, height: 500 },
    deviceScaleFactor: 1,
  });

  const featureGraphicHtml = `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;600;700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Prompt', sans-serif; }
    body {
      width: 1024px;
      height: 500px;
      background: radial-gradient(circle at 75% 30%, #1e1b4b 0%, #0f172a 50%, #020617 100%);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 60px;
      position: relative;
      overflow: hidden;
    }
    /* Glow Orbs */
    .glow-amber {
      position: absolute;
      width: 450px;
      height: 450px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0) 70%);
      top: -100px;
      right: 150px;
      pointer-events: none;
    }
    .glow-blue {
      position: absolute;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 70%);
      bottom: -100px;
      left: 200px;
      pointer-events: none;
    }
    /* Left Content */
    .left-content {
      z-index: 2;
      max-width: 540px;
    }
    .brand-tag {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(245, 158, 11, 0.12);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      color: #fbbf24;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }
    .brand-title {
      font-size: 46px;
      font-weight: 900;
      line-height: 1.1;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #ffffff 30%, #fde68a 70%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 18px;
      font-weight: 600;
      color: #94a3b8;
      line-height: 1.4;
      margin-bottom: 24px;
    }
    .feature-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .pill {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #e2e8f0;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    /* Right Mockup */
    .right-mockup {
      z-index: 2;
      position: relative;
      width: 380px;
      height: 420px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-preview {
      width: 170px;
      height: 240px;
      border-radius: 14px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
      border: 2px solid rgba(255,255,255,0.2);
      position: absolute;
      background-size: cover;
      background-position: center;
      transition: all 0.3s ease;
    }
    .card-1 {
      transform: rotate(-12deg) translate(-70px, -20px);
      background: linear-gradient(135deg, #f59e0b, #b45309);
      border-color: rgba(251, 191, 36, 0.6);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 12px;
    }
    .card-2 {
      transform: rotate(14deg) translate(80px, 30px);
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      border-color: rgba(96, 165, 250, 0.6);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 12px;
    }
    .card-center {
      transform: rotate(0deg) scale(1.15);
      z-index: 5;
      background: linear-gradient(135deg, #1e1b4b, #312e81);
      border: 3px solid rgba(245, 158, 11, 0.8);
      box-shadow: 0 25px 50px -12px rgba(245, 158, 11, 0.35);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-around;
      padding: 16px;
    }
  </style>
</head>
<body>
  <div class="glow-amber"></div>
  <div class="glow-blue"></div>

  <div class="left-content">
    <div class="brand-tag">⚡ THAI POKÉMON TCG COMPANION</div>
    <h1 class="brand-title">PokeCount Tracker</h1>
    <p class="brand-subtitle">สมุดสะสมการ์ดโปเกมอนไทย & ระบบจัดเด็คอัจฉริยะ<br>เช็คการ์ดที่ขาด และฐานข้อมูลครบทุกชุดกว่า 9,600+ ใบ</p>
    
    <div class="feature-pills">
      <div class="pill"><span>📚</span> สมุดสะสมแยกฟอยล์</div>
      <div class="pill"><span>🃏</span> จัดเด็ค 60 ใบตามกฎ</div>
      <div class="pill"><span>🔍</span> เช็คการ์ดที่ขาดทันที</div>
      <div class="pill"><span>☁️</span> บันทึก Cloud ฟรี</div>
    </div>
  </div>

  <div class="right-mockup">
    <div class="card-preview card-1">
      <div style="font-size: 32px; margin-bottom: 6px;">🔥</div>
      <div style="font-size: 13px; font-weight: 800; color: #fff;">สมุดสะสมการ์ด</div>
      <div style="font-size: 10px; color: #fef08a; margin-top: 4px;">9,600+ ใบทุกชุด</div>
    </div>
    <div class="card-preview card-2">
      <div style="font-size: 32px; margin-bottom: 6px;">⚡</div>
      <div style="font-size: 13px; font-weight: 800; color: #fff;">จัดเด็คแข่ง</div>
      <div style="font-size: 10px; color: #bfdbfe; margin-top: 4px;">Standard / Expanded</div>
    </div>
    <div class="card-preview card-center">
      <img src="http://localhost:5173/pwa-192x192.png?v=3" style="width: 64px; height: 64px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
      <div style="text-align: center;">
        <div style="font-size: 14px; font-weight: 900; color: #fff;">PokeCount</div>
        <div style="font-size: 11px; font-weight: 700; color: #fbbf24; margin-top: 2px;">เวอร์ชัน 2.75</div>
      </div>
      <div style="padding: 4px 10px; background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; border-radius: 6px; font-size: 10px; font-weight: 700; color: #fef08a;">
        ✓ ภาษาไทย 100%
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await fgPage.setContent(featureGraphicHtml, { waitUntil: 'load' });
  await fgPage.waitForTimeout(500);
  const fgPath = path.join(OUT_DIR, 'feature_graphic_1024x500.png');
  await fgPage.screenshot({ path: fgPath });
  console.log('✅ Generated feature_graphic_1024x500.png');
  await fgPage.close();

  // --- 3. Generate 5 Phone Screenshots (1080 x 1920) ---
  console.log('📱 Generating 5 Phone Screenshots (1080 x 1920)...');
  const phoneContext = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  // Screenshot 1: Collection Binder
  const p1 = await phoneContext.newPage();
  await p1.goto('http://localhost:5173/collection', { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(3000);
  const s1Path = path.join(OUT_DIR, 'phone_screenshot_1_collection.png');
  await p1.screenshot({ path: s1Path });
  console.log('✅ Generated phone_screenshot_1_collection.png');

  // Screenshot 2: Card Inspect Modal
  // Click first card in grid to open inspect modal
  try {
    const cardEl = p1.locator('[data-testid^="card-item-"], button[aria-label*="การ์ด"], div.cursor-pointer').first();
    await cardEl.click({ timeout: 4000 });
    await p1.waitForTimeout(1500);
  } catch (err) {
    console.log('Could not click card, will capture current modal/view');
  }
  const s2Path = path.join(OUT_DIR, 'phone_screenshot_2_card_detail.png');
  await p1.screenshot({ path: s2Path });
  console.log('✅ Generated phone_screenshot_2_card_detail.png');
  await p1.close();

  // Screenshot 3: Deck Builder
  const p3 = await phoneContext.newPage();
  await p3.goto('http://localhost:5173/deck', { waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(3000);
  const s3Path = path.join(OUT_DIR, 'phone_screenshot_3_deck_builder.png');
  await p3.screenshot({ path: s3Path });
  console.log('✅ Generated phone_screenshot_3_deck_builder.png');

  // Screenshot 4: Missing Cards Check or Deck Inspection
  try {
    const missingBtn = p3.locator('button:has-text("เช็คการ์ดที่ขาด"), button:has-text("การ์ดที่ขาด")').first();
    if (await missingBtn.isVisible({ timeout: 2000 })) {
      await missingBtn.click();
      await p3.waitForTimeout(1500);
    }
  } catch (err) {
    console.log('Missing cards button not directly clicked, taking view screenshot');
  }
  const s4Path = path.join(OUT_DIR, 'phone_screenshot_4_missing_cards.png');
  await p3.screenshot({ path: s4Path });
  console.log('✅ Generated phone_screenshot_4_missing_cards.png');
  await p3.close();

  // Screenshot 5: Set Catalog & Filters
  const p5 = await phoneContext.newPage();
  await p5.goto('http://localhost:5173/collection', { waitUntil: 'domcontentloaded' });
  await p5.waitForTimeout(2000);
  try {
    // Open expansion set dropdown or search
    const searchInput = p5.locator('input[type="search"], input[placeholder*="ค้นหา"]').first();
    if (await searchInput.isVisible({ timeout: 2000 })) {
      await searchInput.fill('ลิซาร์ดอน');
      await p5.waitForTimeout(1500);
    }
  } catch (err) {
    console.log('Search input interaction fallback');
  }
  const s5Path = path.join(OUT_DIR, 'phone_screenshot_5_search_filters.png');
  await p5.screenshot({ path: s5Path });
  console.log('✅ Generated phone_screenshot_5_search_filters.png');
  await p5.close();

  // --- 4. Tablet Screenshots (Optional but helpful: 1920 x 1200) ---
  console.log('📱 Generating Tablet Screenshots...');
  const tabletContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1.5,
  });
  const t1 = await tabletContext.newPage();
  await t1.goto('http://localhost:5173/collection', { waitUntil: 'domcontentloaded' });
  await t1.waitForTimeout(2500);
  const t1Path = path.join(OUT_DIR, 'tablet_screenshot_1_collection.png');
  await t1.screenshot({ path: t1Path });
  console.log('✅ Generated tablet_screenshot_1_collection.png');

  const t2 = await tabletContext.newPage();
  await t2.goto('http://localhost:5173/deck', { waitUntil: 'domcontentloaded' });
  await t2.waitForTimeout(2500);
  const t2Path = path.join(OUT_DIR, 'tablet_screenshot_2_deck.png');
  await t2.screenshot({ path: t2Path });
  console.log('✅ Generated tablet_screenshot_2_deck.png');
  await t2.close();
  await t1.close();

  await browser.close();
  console.log('🎉 All Play Store assets generated successfully in play_store_assets/ !');
}

run().catch(console.error);
