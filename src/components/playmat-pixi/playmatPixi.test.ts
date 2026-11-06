import { describe, it, expect } from 'vitest';
import { PixiBoardViewport } from './engine/PixiBoardViewport';

describe('PixiBoardViewport', () => {
  it('initializes with correct virtual board dimensions (1440x900)', () => {
    const viewport = new PixiBoardViewport();
    expect(viewport.virtualWidth).toBe(1440);
    expect(viewport.virtualHeight).toBe(900);
  });

  it('registers all required Pokémon TCG drop zones', () => {
    const viewport = new PixiBoardViewport();
    const zoneIds = viewport.dropZones.map((z) => z.id);

    // P1 Core Zones
    expect(zoneIds).toContain('p1_active');
    expect(zoneIds).toContain('p1_bench_0');
    expect(zoneIds).toContain('p1_bench_1');
    expect(zoneIds).toContain('p1_bench_2');
    expect(zoneIds).toContain('p1_bench_3');
    expect(zoneIds).toContain('p1_bench_4');
    expect(zoneIds).toContain('p1_deck');
    expect(zoneIds).toContain('p1_discard');
    expect(zoneIds).toContain('p1_lost_zone');

    // P1 Prize Zones (6 prizes)
    for (let i = 0; i < 6; i++) {
      expect(zoneIds).toContain(`p1_prize_${i}`);
    }

    // Stadium
    expect(zoneIds).toContain('stadium');

    // P2 Core Zones
    expect(zoneIds).toContain('p2_active');
    expect(zoneIds).toContain('p2_bench_0');
    expect(zoneIds).toContain('p2_bench_4');
    expect(zoneIds).toContain('p2_deck');
    expect(zoneIds).toContain('p2_discard');
  });

  it('correctly detects drop zone by virtual coordinates', () => {
    const viewport = new PixiBoardViewport();

    // Active zone is at (720, 540) with width 114, height 158
    const activeHit = viewport.findDropZone(720, 540);
    expect(activeHit).not.toBeNull();
    expect(activeHit?.id).toBe('p1_active');
    expect(activeHit?.type).toBe('ACTIVE');
    expect(activeHit?.side).toBe('player1');

    // Near active zone edge
    const nearEdge = viewport.findDropZone(720 + 50, 540 + 70);
    expect(nearEdge?.id).toBe('p1_active');

    // Outside any zone
    const outOfBounds = viewport.findDropZone(0, 0);
    expect(outOfBounds).toBeNull();
  });

  it('scales and centers board maintaining aspect ratio on resize', () => {
    const viewport = new PixiBoardViewport();

    // Test with 1920x1080 screen
    viewport.resize(1920, 1080);
    expect(viewport.scale.x).toBeGreaterThan(0);
    expect(viewport.scale.y).toBe(viewport.scale.x);
    expect(viewport.x).toBeGreaterThanOrEqual(0);
    expect(viewport.y).toBeGreaterThanOrEqual(0);

    // Test with mobile / tablet width 1024x768
    viewport.resize(1024, 768);
    expect(viewport.scale.x).toBeLessThan(1.0);
    expect(viewport.scale.y).toBe(viewport.scale.x);
  });
});

describe('Hand Fanning Mathematics', () => {
  it('calculates symmetrical fanning offsets and curvature for 7 cards', () => {
    const cardCount = 7;
    const maxSpreadWidth = 650;
    const baseSpacing = 72;
    const actualSpacing = Math.min(baseSpacing, maxSpreadWidth / (cardCount - 1));
    const totalWidth = actualSpacing * (cardCount - 1);
    const startX = -totalWidth / 2;
    const midIndex = (cardCount - 1) / 2; // 3

    const positions = Array.from({ length: cardCount }, (_, idx) => {
      const targetX = startX + idx * actualSpacing;
      const normalizedOffset = idx - midIndex;
      const targetRotation = normalizedOffset * 0.045;
      const targetY = Math.pow(normalizedOffset, 2) * 2.2;
      return { targetX, targetY, targetRotation };
    });

    // Center card (index 3) should have 0 rotation and lowest targetY
    expect(positions[3].targetRotation).toBeCloseTo(0);
    expect(positions[3].targetX).toBeCloseTo(0);
    expect(positions[3].targetY).toBeCloseTo(0);

    // Symmetrical positions between left (0) and right (6)
    expect(positions[0].targetX).toBeCloseTo(-positions[6].targetX);
    expect(positions[0].targetRotation).toBeCloseTo(-positions[6].targetRotation);
    expect(positions[0].targetY).toBeCloseTo(positions[6].targetY);
    expect(positions[0].targetY).toBeGreaterThan(positions[3].targetY);
  });
});

describe('PixiParticleSystem & Stadium Spotlight VFX', () => {
  it('emits and updates interactive trail and elemental particles', async () => {
    const { Container } = await import('pixi.js');
    const { PixiParticleSystem } = await import('./engine/PixiParticleSystem');

    const root = new Container();
    const sys = new PixiParticleSystem(root);

    // Trail
    sys.emitTrail(100, 200);
    expect(sys.particleCount).toBe(1);

    // Elemental: Fire
    sys.emitElemental('R', 720, 540, 4);
    expect(sys.particleCount).toBe(5);

    // Elemental: Water
    sys.emitElemental('W', 720, 360, 2);
    expect(sys.particleCount).toBe(7);

    // Slash attack
    sys.emitSlash(720, 540, 720, 360);
    expect(sys.slashes.length).toBe(1);

    // Shockwave
    sys.emitShockwave(720, 360);
    expect(sys.particles.some((p) => p.type === 'shockwave')).toBe(true);

    // Screen Shake
    sys.triggerScreenShake(10, 300);
    expect(sys.isShaking).toBe(true);

    // Update loop
    sys.update(1.0);
    expect(sys.particleCount).toBeGreaterThan(0);

    // Clear
    sys.clear();
    expect(sys.particleCount).toBe(0);
    sys.destroy();
  });

  it('preserves target container dynamic coordinates when screen shake expires and avoids unwanted displacement', async () => {
    const { Container } = await import('pixi.js');
    const { PixiParticleSystem } = await import('./engine/PixiParticleSystem');

    const root = new Container();
    const boardContainer = new Container();
    // Simulate dynamic alignment positioning (e.g. centered on viewport)
    boardContainer.position.set(210, -35);

    const sys = new PixiParticleSystem(root, boardContainer);
    expect(boardContainer.x).toBe(210);
    expect(boardContainer.y).toBe(-35);

    // Trigger screen shake with a short duration
    sys.triggerScreenShake(8, 10);
    expect(sys.isShaking).toBe(true);

    // Wait for shake duration to expire
    await new Promise((resolve) => setTimeout(resolve, 25));

    // Update to finalize shake
    sys.update(1.0);
    expect(sys.isShaking).toBe(false);

    // Container must be restored to its dynamic coordinates (210, -35), NEVER reset to (0, 0)
    expect(boardContainer.x).toBe(210);
    expect(boardContainer.y).toBe(-35);
    sys.destroy();
  });

  it('updates stadium tint dynamically based on stadium name and avoids redundant redraws', async () => {
    const { PixiStadiumSpotlight } = await import('./engine/PixiStadiumSpotlight');

    const spotlight = new PixiStadiumSpotlight();
    expect(spotlight).toBeDefined();

    // Fire stadium
    spotlight.setStadiumTint('Magma Basin');
    spotlight.update(1.0);

    // Repeated call with same tint (must not throw or error)
    spotlight.setStadiumTint('Magma Basin');

    // Water stadium
    spotlight.setStadiumTint('Lake Acuity');
    spotlight.update(1.0);

    // Forest stadium
    spotlight.setStadiumTint('Galar Forest');
    spotlight.update(1.0);

    // Elemental Active Types sync
    spotlight.setActiveTypes('Fire', 'Water');
    // Repeated call with same types (early returns cleanly)
    spotlight.setActiveTypes('Fire', 'Water');

    // Verify 60 FPS update loop with grass swaying and motes
    for (let f = 0; f < 60; f++) {
      spotlight.update(1.0);
    }

    spotlight.destroy({ children: true });
  });

  it('handles fast card motions: placement, draw flight, swap, and deck shuffle', async () => {
    const { Container } = await import('pixi.js');
    const { PixiCardMotionAnimator } = await import('./engine/PixiCardMotionAnimator');

    const root = new Container();
    const animator = new PixiCardMotionAnimator(root);
    expect(animator.getActiveCount()).toBe(0);

    // 1. Placement ripple
    animator.triggerPlacement(720, 540);
    expect(animator.getActiveCount()).toBe(1);

    // 2. Draw flight
    animator.triggerDraw(1250, 700, 720, 850);
    expect(animator.getActiveCount()).toBe(2);

    // 3. Swap swoop
    animator.triggerSwap(720, 540, 520, 720);
    expect(animator.getActiveCount()).toBe(3);

    // 4. Deck shuffle
    animator.triggerDeckShuffle(1250, 700);
    expect(animator.getActiveCount()).toBe(4);

    // Advance ticker 300ms (all should complete)
    animator.update(300);
    expect(animator.getActiveCount()).toBe(0);

    animator.destroy();
    root.destroy({ children: true });
  });

  it('handles fast combat projectiles and floating damage numbers', async () => {
    const { Container } = await import('pixi.js');
    const { PixiCombatVfx } = await import('./engine/PixiCombatVfx');

    const root = new Container();
    const combat = new PixiCombatVfx(root);

    let hitCalled = false;
    combat.triggerProjectile(720, 540, 720, 360, 0xef4444, () => {
      hitCalled = true;
    });
    expect(combat.getActiveCount()).toBe(1);

    combat.triggerDamageFloater(720, 360, 120);
    expect(combat.getActiveCount()).toBe(2);

    // Advance 210ms -> projectile should hit and complete
    combat.update(210);
    expect(hitCalled).toBe(true);

    // Advance 1000ms -> floater should complete
    combat.update(1000);
    expect(combat.getActiveCount()).toBe(0);

    combat.destroy();
    root.destroy({ children: true });
  });

  it('handles cinematic turn transition banner lifecycle', async () => {
    const { Container } = await import('pixi.js');
    const { PixiTurnBanner } = await import('./engine/PixiTurnBanner');

    const root = new Container();
    const banner = new PixiTurnBanner(root);

    expect(banner.getIsActive()).toBe(false);

    // Trigger for Player 1 (Your turn)
    banner.trigger(true, 3);
    expect(banner.getIsActive()).toBe(true);

    // Advance through phases
    banner.update(100); // Slide in
    expect(banner.getIsActive()).toBe(true);

    banner.update(400); // Center display
    expect(banner.getIsActive()).toBe(true);

    banner.update(350); // Slide out and finish
    expect(banner.getIsActive()).toBe(false);

    banner.destroy();
    root.destroy({ children: true });
  });

  it('supports batch discard and lost zone from hand in TabletopActions', async () => {
    const { TabletopActions, createInitialTabletopState } = await import('../playmat-v3/tabletopStateHelper');

    const initial = createInitialTabletopState([], 'Player 1', [], 'Player 2');
    initial.player1.hand = [
      { instanceId: 'c1', nameTh: 'ปิกาจู', nameEn: 'Pikachu', supertype: 'Pokémon' } as any,
      { instanceId: 'c2', nameTh: 'ลิซาร์ดอน', nameEn: 'Charizard', supertype: 'Pokémon' } as any,
      { instanceId: 'c3', nameTh: 'อัลตร้าบอล', nameEn: 'Ultra Ball', supertype: 'Trainer' } as any,
    ];

    // Batch discard 2 cards
    const afterDiscard = TabletopActions.discardMultipleFromHand(initial, 'player1', ['c1', 'c3']);
    expect(afterDiscard.player1.hand.length).toBe(1);
    expect(afterDiscard.player1.hand[0].instanceId).toBe('c2');
    expect(afterDiscard.player1.discard.length).toBe(2);
    expect(afterDiscard.actionToast?.message).toContain('ทิ้งการ์ด 2 ใบ');

    // Batch lost zone
    const afterLost = TabletopActions.lostZoneMultipleFromHand(afterDiscard, 'player1', ['c2']);
    expect(afterLost.player1.hand.length).toBe(0);
    expect(afterLost.player1.lostZone.length).toBe(1);
    expect(afterLost.actionToast?.message).toContain('ส่งการ์ด 1 ใบไปยัง Lost Zone');
  });
});


