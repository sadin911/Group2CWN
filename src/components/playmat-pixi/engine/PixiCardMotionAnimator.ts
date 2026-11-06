import { Container, Graphics } from 'pixi.js';

export interface FlyingCard {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  durationMs: number;
  elapsedMs: number;
  color: number;
}

export interface PlacementRipple {
  gfx: Graphics;
  x: number;
  y: number;
  progress: number;
  durationMs: number;
  elapsedMs: number;
  color: number;
}

export interface ShuffleFlutter {
  container: Container;
  deckX: number;
  deckY: number;
  progress: number;
  durationMs: number;
  elapsedMs: number;
  cards: Graphics[];
}

export interface RepositionSwoop {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  durationMs: number;
  elapsedMs: number;
}

export class PixiCardMotionAnimator {
  public root: Container;
  private flyingCards: FlyingCard[] = [];
  private placementRipples: PlacementRipple[] = [];
  private shuffleFlutters: ShuffleFlutter[] = [];
  private repositionSwoops: RepositionSwoop[] = [];

  constructor(parent: Container) {
    this.root = new Container();
    this.root.eventMode = 'none';
    parent.addChild(this.root);
  }

  /**
   * Fast 180ms placement impact ripple when a card lands on Active or Bench
   */
  public triggerPlacement(x: number, y: number, color = 0x60a5fa): void {
    const gfx = new Graphics();
    this.root.addChild(gfx);

    this.placementRipples.push({
      gfx,
      x,
      y,
      progress: 0,
      durationMs: 180,
      elapsedMs: 0,
      color,
    });
  }

  /**
   * Fast 200ms flight glide when drawing a card from Deck to Hand tray
   */
  public triggerDraw(fromX: number, fromY: number, toX: number, toY: number, color = 0x38bdf8): void {
    const gfx = new Graphics();
    this.root.addChild(gfx);

    this.flyingCards.push({
      gfx,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      durationMs: 200,
      elapsedMs: 0,
      color,
    });
  }

  /**
   * Fast 220ms swoop glide when switching / retreating / swapping Pokémon
   */
  public triggerSwap(fromX: number, fromY: number, toX: number, toY: number): void {
    const gfx = new Graphics();
    this.root.addChild(gfx);

    this.repositionSwoops.push({
      gfx,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      durationMs: 220,
      elapsedMs: 0,
    });
  }

  /**
   * Fast 280ms riffle & flutter sequence of stacked card sprites on the Deck stack
   */
  public triggerDeckShuffle(deckX: number, deckY: number): void {
    const container = new Container();
    container.position.set(deckX, deckY);
    this.root.addChild(container);

    const cards: Graphics[] = [];
    // 3 interleaved card layers
    for (let i = 0; i < 3; i++) {
      const cardGfx = new Graphics();
      cardGfx
        .roundRect(-24, -34, 48, 68, 4)
        .fill({ color: 0x1e293b, alpha: 0.9 })
        .stroke({ color: 0x64748b, width: 1.5 });
      container.addChild(cardGfx);
      cards.push(cardGfx);
    }

    this.shuffleFlutters.push({
      container,
      deckX,
      deckY,
      progress: 0,
      durationMs: 280,
      elapsedMs: 0,
      cards,
    });
  }

  /**
   * Update all animations on each Pixi ticker frame
   */
  public update(deltaMs: number): void {
    // 1. Placement Ripples
    for (let i = this.placementRipples.length - 1; i >= 0; i--) {
      const rip = this.placementRipples[i];
      rip.elapsedMs += deltaMs;
      rip.progress = Math.min(1, rip.elapsedMs / rip.durationMs);

      // Fast ease-out: 1 - (1 - p)^2
      const ease = 1 - Math.pow(1 - rip.progress, 2);
      const radius = 20 + ease * 40;
      const alpha = Math.max(0, 1 - ease);

      rip.gfx.clear();
      rip.gfx
        .circle(rip.x, rip.y, radius)
        .stroke({ color: rip.color, width: Math.max(1, (1 - ease) * 3), alpha });

      // Corner accent sparks
      const cornerOffset = 30 + ease * 15;
      rip.gfx
        .circle(rip.x - cornerOffset, rip.y - cornerOffset, 2 * (1 - ease))
        .fill({ color: rip.color, alpha })
        .circle(rip.x + cornerOffset, rip.y - cornerOffset, 2 * (1 - ease))
        .fill({ color: rip.color, alpha })
        .circle(rip.x - cornerOffset, rip.y + cornerOffset, 2 * (1 - ease))
        .fill({ color: rip.color, alpha })
        .circle(rip.x + cornerOffset, rip.y + cornerOffset, 2 * (1 - ease))
        .fill({ color: rip.color, alpha });

      if (rip.progress >= 1) {
        this.root.removeChild(rip.gfx);
        rip.gfx.destroy();
        this.placementRipples.splice(i, 1);
      }
    }

    // 2. Flying Draw Cards
    for (let i = this.flyingCards.length - 1; i >= 0; i--) {
      const flight = this.flyingCards[i];
      flight.elapsedMs += deltaMs;
      flight.progress = Math.min(1, flight.elapsedMs / flight.durationMs);

      // Ease out cubic: 1 - (1 - p)^3
      const ease = 1 - Math.pow(1 - flight.progress, 3);
      const curX = flight.fromX + (flight.toX - flight.fromX) * ease;
      // Slight vertical arc
      const arcHeight = Math.sin(flight.progress * Math.PI) * -35;
      const curY = flight.fromY + (flight.toY - flight.fromY) * ease + arcHeight;
      const rotation = (1 - ease) * -0.2;
      const alpha = flight.progress > 0.85 ? (1 - flight.progress) / 0.15 : 1;

      flight.gfx.clear();
      flight.gfx.position.set(curX, curY);
      flight.gfx.rotation = rotation;

      // Luminous Stardust Spark Glide (clean, elegant light beam instead of an opaque ghost box)
      flight.gfx
        .circle(0, 0, 4.5)
        .fill({ color: flight.color, alpha: alpha * 0.9 })
        .circle(0, 0, 9)
        .fill({ color: 0xffffff, alpha: alpha * 0.4 });

      // Delicate trailing stardust motes
      const trailDx = (flight.fromX - curX) * 0.15;
      const trailDy = (flight.fromY - curY) * 0.15;
      flight.gfx
        .circle(trailDx, trailDy, 3)
        .fill({ color: flight.color, alpha: alpha * 0.5 })
        .circle(trailDx * 2, trailDy * 2, 2)
        .fill({ color: 0xfbbf24, alpha: alpha * 0.3 });

      if (flight.progress >= 1) {
        this.root.removeChild(flight.gfx);
        flight.gfx.destroy();
        this.flyingCards.splice(i, 1);
      }
    }

    // 3. Reposition / Swap Swoops
    for (let i = this.repositionSwoops.length - 1; i >= 0; i--) {
      const swoop = this.repositionSwoops[i];
      swoop.elapsedMs += deltaMs;
      swoop.progress = Math.min(1, swoop.elapsedMs / swoop.durationMs);

      const ease = 1 - Math.pow(1 - swoop.progress, 3);
      const curX = swoop.fromX + (swoop.toX - swoop.fromX) * ease;
      const arc = Math.sin(swoop.progress * Math.PI) * -30;
      const curY = swoop.fromY + (swoop.toY - swoop.fromY) * ease + arc;
      const alpha = Math.sin(swoop.progress * Math.PI);

      swoop.gfx.clear();
      // Glowing motion trail
      swoop.gfx
        .circle(curX, curY, 8 * alpha)
        .fill({ color: 0x38bdf8, alpha: alpha * 0.8 })
        .circle(curX, curY, 14 * alpha)
        .fill({ color: 0x60a5fa, alpha: alpha * 0.3 });

      if (swoop.progress >= 1) {
        this.root.removeChild(swoop.gfx);
        swoop.gfx.destroy();
        this.repositionSwoops.splice(i, 1);
      }
    }

    // 4. Deck Shuffle Flutter
    for (let i = this.shuffleFlutters.length - 1; i >= 0; i--) {
      const flutter = this.shuffleFlutters[i];
      flutter.elapsedMs += deltaMs;
      flutter.progress = Math.min(1, flutter.elapsedMs / flutter.durationMs);

      // Oscillating riffle flutter
      const cycle = Math.sin(flutter.progress * Math.PI * 4);
      const spread = (1 - flutter.progress) * 16;

      if (flutter.cards[0]) {
        flutter.cards[0].position.set(-cycle * spread, -Math.abs(cycle) * 4);
        flutter.cards[0].rotation = -cycle * 0.08;
      }
      if (flutter.cards[1]) {
        flutter.cards[1].position.set(0, Math.abs(cycle) * 2);
      }
      if (flutter.cards[2]) {
        flutter.cards[2].position.set(cycle * spread, -Math.abs(cycle) * 4);
        flutter.cards[2].rotation = cycle * 0.08;
      }

      if (flutter.progress >= 1) {
        this.root.removeChild(flutter.container);
        flutter.container.destroy({ children: true });
        this.shuffleFlutters.splice(i, 1);
      }
    }
  }

  public getActiveCount(): number {
    return (
      this.placementRipples.length +
      this.flyingCards.length +
      this.repositionSwoops.length +
      this.shuffleFlutters.length
    );
  }

  public destroy(): void {
    this.placementRipples.forEach((r) => r.gfx.destroy());
    this.placementRipples = [];
    this.flyingCards.forEach((f) => f.gfx.destroy());
    this.flyingCards = [];
    this.repositionSwoops.forEach((s) => s.gfx.destroy());
    this.repositionSwoops = [];
    this.shuffleFlutters.forEach((sf) => sf.container.destroy({ children: true }));
    this.shuffleFlutters = [];
    this.root.destroy({ children: true });
  }
}
