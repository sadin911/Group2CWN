import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT_DIR = path.resolve('play_store_assets');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function captureScreenshots(browser, config) {
  const { prefix, width, height, scale, label } = config;
  console.log(`📱 Generating ${label} (${width}x${height})...`);

  const context = await browser.newContext({
    viewport: { width: Math.round(width / scale), height: Math.round(height / scale) },
    deviceScaleFactor: scale,
    hasTouch: true,
  });

  // 1. Collection
  const p1 = await context.newPage();
  await p1.goto('http://localhost:5173/collection', { waitUntil: 'domcontentloaded' });
  await p1.waitForTimeout(2500);
  const s1Path = path.join(OUT_DIR, `${prefix}_1_collection.png`);
  await p1.screenshot({ path: s1Path });
  console.log(`  ✅ Generated ${prefix}_1_collection.png`);

  // 2. Card Inspect Modal
  try {
    const cardEl = p1.locator('[data-testid^="card-item-"], button[aria-label*="การ์ด"], div.cursor-pointer').first();
    await cardEl.click({ timeout: 3000 });
    await p1.waitForTimeout(1500);
  } catch (e) {
    console.log('  Notice: click card fallback');
  }
  const s4Path = path.join(OUT_DIR, `${prefix}_4_card_inspect.png`);
  await p1.screenshot({ path: s4Path });
  console.log(`  ✅ Generated ${prefix}_4_card_inspect.png`);
  await p1.close();

  // 3. Deck Builder
  const p3 = await context.newPage();
  await p3.goto('http://localhost:5173/deck', { waitUntil: 'domcontentloaded' });
  await p3.waitForTimeout(2500);
  const s2Path = path.join(OUT_DIR, `${prefix}_2_deck_builder.png`);
  await p3.screenshot({ path: s2Path });
  console.log(`  ✅ Generated ${prefix}_2_deck_builder.png`);

  // 4. Missing Cards Modal
  try {
    const missingBtn = p3.locator('button:has-text("เช็คการ์ดที่ขาด"), button:has-text("การ์ดที่ขาด")').first();
    if (await missingBtn.isVisible({ timeout: 2000 })) {
      await missingBtn.click();
      await p3.waitForTimeout(1500);
    }
  } catch (e) {
    console.log('  Notice: click missing cards fallback');
  }
  const s3Path = path.join(OUT_DIR, `${prefix}_3_missing_cards.png`);
  await p3.screenshot({ path: s3Path });
  console.log(`  ✅ Generated ${prefix}_3_missing_cards.png`);
  await p3.close();

  await context.close();
}

async function run() {
  const browser = await chromium.launch();

  // 7-Inch Tablet: 1920 x 1080 (16:9, between 320 and 3840 px)
  await captureScreenshots(browser, {
    prefix: 'tablet_7in',
    width: 1920,
    height: 1080,
    scale: 1.5,
    label: '7-inch Tablet Screenshots (1920 x 1080)',
  });

  // 10-Inch Tablet: 2560 x 1440 (16:9, each side >= 1080 px up to 7680 px)
  await captureScreenshots(browser, {
    prefix: 'tablet_10in',
    width: 2560,
    height: 1440,
    scale: 2,
    label: '10-inch Tablet Screenshots (2560 x 1440)',
  });

  await browser.close();
  console.log('🎉 All 7-inch and 10-inch tablet screenshots successfully created!');
}

run().catch(console.error);
