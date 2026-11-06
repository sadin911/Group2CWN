import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export interface CombatProjectile {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  durationMs: number;
  elapsedMs: number;
  color: number;
  onHit?: () => void;
}

export interface DamageFloater {
  text: Text;
  x: number;
  y: number;
  progress: number;
  durationMs: number;
  elapsedMs: number;
  vy: number;
}

export class PixiCombatVfx {
  public root: Container;
  private projectiles: CombatProjectile[] = [];
  private floaters: DamageFloater[] = [];

  constructor(parent: Container) {
    this.root = new Container();
    this.root.eventMode = 'none';
    parent.addChild(this.root);
  }

  /**
   * Fast 200ms high-speed energy projectile beam from attacker to defender
   */
  public triggerProjectile(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color = 0xef4444,
    onHit?: () => void
  ): void {
    const gfx = new Graphics();
    this.root.addChild(gfx);

    this.projectiles.push({
      gfx,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      durationMs: 200,
      elapsedMs: 0,
      color,
      onHit,
    });
  }

  /**
   * Floating damage number text that pops up with bounce and drifts upward
   */
  public triggerDamageFloater(x: number, y: number, damage: number): void {
    const isHeavy = damage >= 120;
    const style = new TextStyle({
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: isHeavy ? 36 : 28,
      fontWeight: '900',
      fill: isHeavy ? '#ff2a5f' : '#f59e0b',
      stroke: { color: '#000000', width: 4 },
      dropShadow: {
        color: '#000000',
        alpha: 0.8,
        blur: 4,
        distance: 2,
      },
    });

    const text = new Text({
      text: `-${damage}`,
      style,
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(x, y - 20);
    text.scale.set(1.6);
    this.root.addChild(text);

    this.floaters.push({
      text,
      x,
      y: y - 20,
      progress: 0,
      durationMs: 1000,
      elapsedMs: 0,
      vy: -1.2,
    });
  }

  public update(deltaMs: number): void {
    // 1. Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.elapsedMs += deltaMs;
      proj.progress = Math.min(1, proj.elapsedMs / proj.durationMs);

      // Fast linear or ease-in progression
      const ease = Math.pow(proj.progress, 1.2);
      const curX = proj.fromX + (proj.toX - proj.fromX) * ease;
      const arc = Math.sin(proj.progress * Math.PI) * -20;
      const curY = proj.fromY + (proj.toY - proj.fromY) * ease + arc;

      proj.gfx.clear();
      // Main bolt
      proj.gfx
        .circle(curX, curY, 9)
        .fill({ color: proj.color, alpha: 1 })
        .circle(curX, curY, 16)
        .fill({ color: 0xffffff, alpha: 0.4 });

      // Trailing tail
      const tailX = curX - (proj.toX - proj.fromX) * 0.12;
      const tailY = curY - (proj.toY - proj.fromY) * 0.12;
      proj.gfx
        .moveTo(curX, curY)
        .lineTo(tailX, tailY)
        .stroke({ color: proj.color, width: 6, alpha: 0.7 });

      if (proj.progress >= 1) {
        proj.onHit?.();
        this.root.removeChild(proj.gfx);
        proj.gfx.destroy();
        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Damage Floaters
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const floater = this.floaters[i];
      floater.elapsedMs += deltaMs;
      floater.progress = Math.min(1, floater.elapsedMs / floater.durationMs);

      // Pop down to 1.0 scale quickly in first 150ms
      if (floater.elapsedMs < 150) {
        const pop = 1.6 - (floater.elapsedMs / 150) * 0.6;
        floater.text.scale.set(pop);
      } else {
        floater.text.scale.set(1.0);
      }

      // Drift upward with gravity deceleration
      floater.y += floater.vy;
      floater.text.position.set(floater.x, floater.y);

      // Fade out in last 30% of duration
      if (floater.progress > 0.7) {
        floater.text.alpha = (1 - floater.progress) / 0.3;
      }

      if (floater.progress >= 1) {
        this.root.removeChild(floater.text);
        floater.text.destroy();
        this.floaters.splice(i, 1);
      }
    }
  }

  public getActiveCount(): number {
    return this.projectiles.length + this.floaters.length;
  }

  public destroy(): void {
    this.projectiles.forEach((p) => p.gfx.destroy());
    this.projectiles = [];
    this.floaters.forEach((f) => f.text.destroy());
    this.floaters = [];
    this.root.destroy({ children: true });
  }
}
