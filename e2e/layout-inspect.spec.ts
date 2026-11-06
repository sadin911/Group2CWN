import { test, expect } from '@playwright/test';

test.describe('Inspect Playmat Layout & Overlap', () => {
  test('inspect overlap between hand cards tray and bench on desktop and mobile', async ({ page, isMobile }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    // Draw 7 cards to expand hand
    await page.locator('#btn-setup-draw-7').click();
    await expect(page.locator('#hand-card-0')).toBeVisible({ timeout: 10000 });

    // Place an active and bench cards using quick setup if available
    const quickSetup = page.locator('#btn-quick-setup');
    if (await quickSetup.isVisible()) {
      await quickSetup.click();
      await page.waitForTimeout(500);
    }

    // Ensure hand is expanded
    const handTray = page.locator('#hand-cards-tray');
    await expect(handTray).toBeVisible();

    const metrics = await page.evaluate(() => {
      const bottomZone = document.getElementById('bottom-player-zone')?.getBoundingClientRect();
      const topZone = document.getElementById('top-player-zone')?.getBoundingClientRect();
      const handConsole = document.getElementById('bottom-hand-console')?.getBoundingClientRect();
      const tray = document.getElementById('hand-cards-tray')?.getBoundingClientRect();
      const board = document.getElementById('playmat-v3-board')?.getBoundingClientRect();

      const topActive = document.querySelector('#top-player-zone [data-slot-pos="ACTIVE"]')?.getBoundingClientRect();
      const topBench = document.querySelector('#top-player-zone [data-slot-pos="0"], #top-player-zone #top-bench-0-empty')?.getBoundingClientRect();
      const bottomActive = document.querySelector('#bottom-player-zone [data-slot-pos="ACTIVE"]')?.getBoundingClientRect();
      const bottomBench = document.querySelector('#bottom-player-zone [data-slot-pos="0"], #bottom-player-zone #slot-bench-0-empty')?.getBoundingClientRect();
      const centerZone = document.getElementById('center-board-zone')?.getBoundingClientRect();

      return {
        viewport: { w: window.innerWidth, h: window.innerHeight },
        board,
        topZone,
        bottomZone,
        handConsole,
        tray,
        topActive,
        topBench,
        bottomActive,
        bottomBench,
        centerZone,
      };
    });

    const clearance = metrics.handConsole.top - metrics.bottomZone.bottom;
    console.log(`[Layout Test] Device viewport ${metrics.viewport.w}x${metrics.viewport.h}: Clearance = ${clearance.toFixed(1)}px`, {
      topZoneH: metrics.topZone?.height,
      topBenchH: metrics.topBench?.height,
      topActiveH: metrics.topActive?.height,
      centerZoneH: metrics.centerZone?.height,
      bottomActiveH: metrics.bottomActive?.height,
      bottomBenchH: metrics.bottomBench?.height,
      bottomZoneH: metrics.bottomZone?.height,
      handConsoleH: metrics.handConsole?.height,
      boardH: metrics.board?.height,
    });
    expect(metrics.bottomZone.bottom).toBeLessThan(metrics.handConsole.top);

    // 2. Verify dead space is minimized on desktop (topZone is near top of board, bottomZone near hand console)
    if (!isMobile && metrics.viewport.h >= 900) {
      const topGap = metrics.topZone.top - metrics.board.top;
      console.log(`[Desktop Test] Top Gap = ${topGap.toFixed(1)}px, Clearance = ${clearance.toFixed(1)}px`);
      expect(topGap).toBeLessThan(50);
      expect(clearance).toBeLessThan(80);
    }

    // 3. Verify each bench slot is strictly above hand console
    for (let i = 0; i < 5; i++) {
      const benchSlot = page.locator(`#slot-bench-${i}-empty, [id^="bench-slot-${i}"]`).first();
      if (await benchSlot.isVisible()) {
        const benchBox = await benchSlot.boundingBox();
        if (benchBox) {
          expect(benchBox.y + benchBox.height).toBeLessThan(metrics.handConsole.top);
        }
      }
    }

    // 4. Verify Empty Bench Slot Aspect Ratio matches standard card ratio (63/88 = 0.716)
    const emptyBench = page.locator('#slot-bench-4-empty, #slot-bench-3-empty, #slot-bench-2-empty').first();
    if (await emptyBench.isVisible()) {
      const emptyBox = await emptyBench.boundingBox();
      if (emptyBox) {
        const ratio = emptyBox.width / emptyBox.height;
        console.log(`[Bench Slot Ratio] ${emptyBox.width.toFixed(1)}x${emptyBox.height.toFixed(1)} -> ratio: ${ratio.toFixed(3)} (target: 0.716)`);
        expect(ratio).toBeGreaterThanOrEqual(0.65);
        expect(ratio).toBeLessThanOrEqual(0.78);
      }
    }

    // 5. Verify Quick Zoom Button behavior
    const quickZoomBtn = page.locator('#bottom-player-zone #btn-quick-zoom-active');
    if (isMobile) {
      // On mobile, quick zoom button must be hidden
      await expect(quickZoomBtn).toBeHidden();
    } else {
      // On desktop, hover active card, click 🔍, verify it opens CardImagePreviewModal (not PokemonActionModal)
      const activeCard = page.locator('#bottom-player-zone #slot-active-card');
      if (await activeCard.isVisible()) {
        await activeCard.hover();
        await expect(quickZoomBtn).toBeVisible();
        await quickZoomBtn.click();
        
        // Assert CardImagePreviewModal opens
        await expect(page.locator('#card-image-preview-modal')).toBeVisible();
        // Assert PokemonActionModal does NOT open
        await expect(page.locator('#pokemon-action-modal')).toBeHidden();

        // Close preview modal
        await page.locator('#btn-close-card-preview').click();
        await expect(page.locator('#card-image-preview-modal')).toBeHidden();
      }
    }

    // 6. Verify Top Active and Bottom Active are aligned in the exact same column (X-axis offset <= 1.5px)
    const topActive = page.locator('#top-player-zone [data-slot-pos="ACTIVE"]').first();
    const bottomActive = page.locator('#bottom-player-zone [data-slot-pos="ACTIVE"]').first();
    if (await topActive.isVisible() && await bottomActive.isVisible()) {
      const topBox = await topActive.boundingBox();
      const bottomBox = await bottomActive.boundingBox();
      if (topBox && bottomBox) {
        const topCenterX = topBox.x + topBox.width / 2;
        const bottomCenterX = bottomBox.x + bottomBox.width / 2;
        const xOffset = Math.abs(topCenterX - bottomCenterX);
        console.log(`[Active Alignment] Top CenterX=${topCenterX.toFixed(1)}, Bottom CenterX=${bottomCenterX.toFixed(1)}, Offset=${xOffset.toFixed(2)}px`);
        expect(xOffset).toBeLessThanOrEqual(1.5);
      }
    }
  });

  test('verify 1080p desktop playmat layout eliminates top, bottom, and center divider dead space', async ({ page, isMobile }) => {
    if (isMobile) return;
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    const layout = await page.evaluate(() => {
      const board = document.getElementById('playmat-v3-board')?.getBoundingClientRect();
      const topZone = document.getElementById('top-player-zone')?.getBoundingClientRect();
      const bottomZone = document.getElementById('bottom-player-zone')?.getBoundingClientRect();
      const centerBoard = document.getElementById('center-board-zone')?.getBoundingClientRect();
      const handConsole = document.getElementById('bottom-hand-console')?.getBoundingClientRect();

      return {
        boardTop: board?.top || 0,
        boardBottom: board?.bottom || 0,
        topZoneTop: topZone?.top || 0,
        topZoneBottom: topZone?.bottom || 0,
        centerBoardTop: centerBoard?.top || 0,
        centerBoardBottom: centerBoard?.bottom || 0,
        bottomZoneTop: bottomZone?.top || 0,
        bottomZoneBottom: bottomZone?.bottom || 0,
        handConsoleTop: handConsole?.top || 0,
      };
    });

    const upperCenterGap = layout.centerBoardTop - layout.topZoneBottom;
    const lowerCenterGap = layout.bottomZoneTop - layout.centerBoardBottom;
    const clearance = layout.handConsoleTop - layout.bottomZoneBottom;

    console.log(`[1080p Desktop Layout] Upper center gap = ${upperCenterGap.toFixed(1)}px, Lower center gap = ${lowerCenterGap.toFixed(1)}px, Hand clearance = ${clearance.toFixed(1)}px`);

    // Verify upper red bar is eliminated (Top Active row and Center Divider are snug)
    expect(upperCenterGap).toBeLessThanOrEqual(25);
    // Verify lower red bar is eliminated (Center Divider and Bottom Active row are snug)
    expect(lowerCenterGap).toBeLessThanOrEqual(25);
    // Verify clearance above hand console
    expect(clearance).toBeGreaterThan(0);

    // Verify Active alignment on 1080p
    const topActive = page.locator('#top-player-zone [data-slot-pos="ACTIVE"]').first();
    const bottomActive = page.locator('#bottom-player-zone [data-slot-pos="ACTIVE"]').first();
    const topBox = await topActive.boundingBox();
    const bottomBox = await bottomActive.boundingBox();
    if (topBox && bottomBox) {
      const xOffset = Math.abs((topBox.x + topBox.width / 2) - (bottomBox.x + bottomBox.width / 2));
      expect(xOffset).toBeLessThanOrEqual(1.5);
    }
  });

  test('verify MacBook and Laptop screens eliminate both bottom dead space and center divider gaps', async ({ page, isMobile }) => {
    if (isMobile) return;

    const laptopResolutions = [
      { name: '1280x800 (13-inch MacBook Air)', width: 1280, height: 800 },
      { name: '1440x900 (15-inch MacBook Air)', width: 1440, height: 900 },
      { name: '1512x982 (14-inch MacBook Pro)', width: 1512, height: 982 },
    ];

    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    for (const res of laptopResolutions) {
      await page.setViewportSize({ width: res.width, height: res.height });
      await page.waitForTimeout(400);

      const layout = await page.evaluate(() => {
        const board = document.getElementById('playmat-v3-board')?.getBoundingClientRect();
        const topZone = document.getElementById('top-player-zone')?.getBoundingClientRect();
        const bottomZone = document.getElementById('bottom-player-zone')?.getBoundingClientRect();
        const centerBoard = document.getElementById('center-board-zone')?.getBoundingClientRect();
        const handConsole = document.getElementById('bottom-hand-console')?.getBoundingClientRect();

        return {
          boardTop: board?.top || 0,
          boardBottom: board?.bottom || 0,
          topZoneTop: topZone?.top || 0,
          topZoneBottom: topZone?.bottom || 0,
          centerBoardTop: centerBoard?.top || 0,
          centerBoardBottom: centerBoard?.bottom || 0,
          bottomZoneTop: bottomZone?.top || 0,
          bottomZoneBottom: bottomZone?.bottom || 0,
          handConsoleTop: handConsole?.top || 0,
        };
      });

      const upperCenterGap = layout.centerBoardTop - layout.topZoneBottom;
      const lowerCenterGap = layout.bottomZoneTop - layout.centerBoardBottom;
      const clearance = layout.handConsoleTop - layout.bottomZoneBottom;

      console.log(`[Laptop Layout - ${res.name}] Upper=${upperCenterGap.toFixed(1)}px, Lower=${lowerCenterGap.toFixed(1)}px, BottomClearance=${clearance.toFixed(1)}px`);

      // 1. Neither Case 1 (bottom gap > 35px) nor Case 2 (center gaps > 20px) should happen
      expect(upperCenterGap).toBeLessThanOrEqual(20);
      expect(lowerCenterGap).toBeLessThanOrEqual(20);
      expect(clearance).toBeGreaterThanOrEqual(0);
      expect(clearance).toBeLessThanOrEqual(35);

      // 2. Active alignment
      const topActive = page.locator('#top-player-zone [data-slot-pos="ACTIVE"]').first();
      const bottomActive = page.locator('#bottom-player-zone [data-slot-pos="ACTIVE"]').first();
      const topBox = await topActive.boundingBox();
      const bottomBox = await bottomActive.boundingBox();
      if (topBox && bottomBox) {
        const xOffset = Math.abs((topBox.x + topBox.width / 2) - (bottomBox.x + bottomBox.width / 2));
        expect(xOffset).toBeLessThanOrEqual(1.5);
      }
    }
  });

  test('verify 2K and 4K resolution scaling and Active alignment', async ({ page, isMobile }) => {
    if (isMobile) return;

    // Test 2K (2560x1440)
    await page.setViewportSize({ width: 2560, height: 1440 });
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    const qhdActive = page.locator('#bottom-player-zone [data-slot-pos="ACTIVE"]').first();
    const qhdActiveBox = await qhdActive.boundingBox();
    expect(qhdActiveBox).not.toBeNull();
    if (qhdActiveBox) {
      console.log(`[2K QHD Active Card] ${qhdActiveBox.width.toFixed(1)}x${qhdActiveBox.height.toFixed(1)}px`);
      expect(qhdActiveBox.height).toBeGreaterThanOrEqual(170);
    }

    const qhdTopActive = page.locator('#top-player-zone [data-slot-pos="ACTIVE"]').first();
    const qhdTopBox = await qhdTopActive.boundingBox();
    if (qhdTopBox && qhdActiveBox) {
      const xOffset = Math.abs((qhdTopBox.x + qhdTopBox.width / 2) - (qhdActiveBox.x + qhdActiveBox.width / 2));
      console.log(`[2K QHD Alignment Offset] ${xOffset.toFixed(2)}px`);
      expect(xOffset).toBeLessThanOrEqual(1.5);
    }

    // Test 4K (3840x2160)
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.waitForTimeout(300);

    const uhdActive = page.locator('#bottom-player-zone [data-slot-pos="ACTIVE"]').first();
    const uhdActiveBox = await uhdActive.boundingBox();
    expect(uhdActiveBox).not.toBeNull();
    if (uhdActiveBox) {
      console.log(`[4K UHD Active Card] ${uhdActiveBox.width.toFixed(1)}x${uhdActiveBox.height.toFixed(1)}px`);
      expect(uhdActiveBox.height).toBeGreaterThanOrEqual(250);
    }

    const uhdTopActive = page.locator('#top-player-zone [data-slot-pos="ACTIVE"]').first();
    const uhdTopBox = await uhdTopActive.boundingBox();
    if (uhdTopBox && uhdActiveBox) {
      const xOffset = Math.abs((uhdTopBox.x + uhdTopBox.width / 2) - (uhdActiveBox.x + uhdActiveBox.width / 2));
      console.log(`[4K UHD Alignment Offset] ${xOffset.toFixed(2)}px`);
      expect(xOffset).toBeLessThanOrEqual(1.5);
    }
  });

  test('verify bench cards have snug shoulder-to-shoulder spacing without wide gaps', async ({ page, isMobile }) => {
    await page.goto('/playmat-v3');
    await expect(page.locator('#playmat-v3-container')).toBeVisible({ timeout: 15000 });

    const benchGaps = await page.evaluate(() => {
      const getRowGaps = (selectorPrefix) => {
        const slots = [];
        for (let i = 0; i < 5; i++) {
          const el = document.querySelector(selectorPrefix(i));
          if (el) slots.push(el.getBoundingClientRect());
        }
        const gaps = [];
        for (let i = 0; i < slots.length - 1; i++) {
          gaps.push(slots[i + 1].left - slots[i].right);
        }
        return { slots, gaps };
      };

      const top = getRowGaps((i) => `#top-player-zone [data-slot-pos="${i}"], #top-player-zone #top-bench-${i}-empty`);
      const bottom = getRowGaps((i) => `#bottom-player-zone [data-slot-pos="${i}"], #bottom-player-zone #slot-bench-${i}-empty`);
      const stadium = document.querySelector('[data-stadium-zone]')?.getBoundingClientRect();
      const bottomActive = document.querySelector('#bottom-player-zone [data-slot-pos="ACTIVE"]')?.getBoundingClientRect();

      return {
        topGaps: top.gaps,
        bottomGaps: bottom.gaps,
        topBounds: top.slots.length === 5 ? { left: top.slots[0].left, right: top.slots[4].right } : null,
        bottomBounds: bottom.slots.length === 5 ? { left: bottom.slots[0].left, right: bottom.slots[4].right } : null,
        stadiumRight: stadium?.right || 0,
        bottomActiveLeft: bottomActive?.left || 0,
      };
    });

    console.log(`[Bench Gaps Test] Mobile=${isMobile}, Bottom Gaps:`, benchGaps.bottomGaps.map(g => g.toFixed(1) + 'px').join(', '));

    // Bench gaps must be snug (<= 10px on desktop, <= 6px on mobile), never wide columns (e.g. 100px+)
    const maxAllowedGap = isMobile ? 6 : 10;
    for (const gap of benchGaps.bottomGaps) {
      expect(gap).toBeLessThanOrEqual(maxAllowedGap);
      expect(gap).toBeGreaterThanOrEqual(1);
    }
    for (const gap of benchGaps.topGaps) {
      expect(gap).toBeLessThanOrEqual(maxAllowedGap);
      expect(gap).toBeGreaterThanOrEqual(1);
    }

    // Top Bench and Bottom Bench boundaries must be aligned within 2px
    if (benchGaps.topBounds && benchGaps.bottomBounds) {
      expect(Math.abs(benchGaps.topBounds.left - benchGaps.bottomBounds.left)).toBeLessThanOrEqual(2);
      expect(Math.abs(benchGaps.topBounds.right - benchGaps.bottomBounds.right)).toBeLessThanOrEqual(2);
    }

    // Stadium must never overlap Active card
    if (benchGaps.stadiumRight > 0 && benchGaps.bottomActiveLeft > 0) {
      expect(benchGaps.bottomActiveLeft - benchGaps.stadiumRight).toBeGreaterThanOrEqual(10);
    }
  });
});


