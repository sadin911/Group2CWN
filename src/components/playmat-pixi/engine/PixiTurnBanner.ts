import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export class PixiTurnBanner {
  public root: Container;
  private bannerGfx: Graphics;
  private labelText: Text;
  private subText: Text;
  private isActive = false;
  private elapsedMs = 0;
  private readonly totalDurationMs = 800;
  private width = 1440;
  private height = 900;
  private isMyTurn = true;

  constructor(parent: Container) {
    this.root = new Container();
    this.root.eventMode = 'none';
    this.root.visible = false;
    parent.addChild(this.root);

    this.bannerGfx = new Graphics();
    this.root.addChild(this.bannerGfx);

    const titleStyle = new TextStyle({
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: 32,
      fontWeight: '900',
      fill: '#ffffff',
      stroke: { color: '#000000', width: 4 },
      dropShadow: {
        color: '#000000',
        alpha: 0.9,
        blur: 6,
        distance: 2,
      },
    });

    const subStyle = new TextStyle({
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      fontSize: 14,
      fontWeight: '800',
      fill: '#fbbf24',
      stroke: { color: '#000000', width: 2 },
      letterSpacing: 3,
    });

    this.labelText = new Text({ text: 'เทิร์นของคุณ', style: titleStyle });
    this.labelText.anchor.set(0.5, 0.5);
    this.root.addChild(this.labelText);

    this.subText = new Text({ text: 'YOUR TURN', style: subStyle });
    this.subText.anchor.set(0.5, 0.5);
    this.root.addChild(this.subText);
  }

  public setDimensions(w: number, h: number): void {
    this.width = w;
    this.height = h;
  }

  /**
   * Trigger a fast 800ms broadcast turn transition banner
   */
  public trigger(isMyTurn: boolean, turnNumber?: number): void {
    this.isMyTurn = isMyTurn;
    this.isActive = true;
    this.elapsedMs = 0;
    this.root.visible = true;

    const mainTitle = isMyTurn ? 'เทิร์นของคุณ' : 'เทิร์นของฝ่ายตรงข้าม';
    const subTitle = isMyTurn
      ? `YOUR TURN • เทิร์นที่ ${turnNumber || 1}`
      : `OPPONENT'S TURN • เทิร์นที่ ${turnNumber || 1}`;

    this.labelText.text = mainTitle;
    this.subText.text = subTitle;

    // Reposition to center Y
    this.root.y = this.height / 2;
  }

  public update(deltaMs: number): void {
    if (!this.isActive) return;

    this.elapsedMs += deltaMs;
    const progress = Math.min(1, this.elapsedMs / this.totalDurationMs);

    let curX = this.width / 2;
    let alpha = 1;

    // Phase 1: Slide In & Pop (0 - 220ms)
    let scale = 1;
    if (this.elapsedMs < 220) {
      const p = this.elapsedMs / 220;
      const ease = 1 - Math.pow(1 - p, 3);
      curX = -260 + (this.width / 2 + 260) * ease;
      alpha = ease;
      scale = 1.15 - 0.15 * ease;
    }
    // Phase 2: Majestic Hold in Center (220 - 640ms)
    else if (this.elapsedMs < 640) {
      curX = this.width / 2;
      alpha = 1;
      scale = 1;
    }
    // Phase 3: Fast Velocity Exit (640 - 820ms)
    else {
      const p = (this.elapsedMs - 640) / 180;
      const ease = Math.pow(p, 2.5);
      curX = this.width / 2 + (this.width / 2 + 300) * ease;
      alpha = Math.max(0, 1 - p);
      scale = 1 - 0.1 * ease;
    }

    this.root.alpha = alpha;
    this.root.scale.set(scale);

    // Redraw high-impact tournament banner ribbon
    const primaryColor = this.isMyTurn ? 0x10b981 : 0x6366f1;
    const glowColor = this.isMyTurn ? 0x34d399 : 0x818cf8;
    const accentGold = 0xfbbf24;

    this.bannerGfx.clear();

    // 1. Outer Championship Volumetric Glow
    this.bannerGfx
      .ellipse(curX, 0, 320, 48)
      .fill({ color: glowColor, alpha: 0.18 * alpha });

    // 2. High-Tech Angled Tournament Chevron Ribbon
    this.bannerGfx
      .poly([
        { x: curX - 290, y: -42 },
        { x: curX + 270, y: -42 },
        { x: curX + 290, y: 0 },
        { x: curX + 270, y: 42 },
        { x: curX - 290, y: 42 },
        { x: curX - 270, y: 0 },
      ])
      .fill({ color: 0x030712, alpha: 0.94 * alpha })
      .stroke({ color: glowColor, width: 2.5, alpha: alpha });

    // 3. Dual Edge Accent Chevrons
    this.bannerGfx
      .poly([
        { x: curX - 280, y: -36 },
        { x: curX - 264, y: -36 },
        { x: curX - 248, y: 0 },
        { x: curX - 264, y: 36 },
        { x: curX - 280, y: 36 },
        { x: curX - 264, y: 0 },
      ])
      .fill({ color: primaryColor, alpha: alpha * 0.9 })
      .poly([
        { x: curX + 264, y: -36 },
        { x: curX + 280, y: -36 },
        { x: curX + 264, y: 0 },
        { x: curX + 280, y: 36 },
        { x: curX + 264, y: 36 },
        { x: curX + 248, y: 0 },
      ])
      .fill({ color: primaryColor, alpha: alpha * 0.9 });

    // 4. Center Gold Divider Laser Line
    this.bannerGfx
      .moveTo(curX - 160, 4)
      .lineTo(curX + 160, 4)
      .stroke({ color: accentGold, width: 1.5, alpha: alpha * 0.75 })
      .circle(curX, 4, 3)
      .fill({ color: 0xffffff, alpha });

    // Center text positions
    this.labelText.position.set(curX, -14);
    this.subText.position.set(curX, 20);

    if (progress >= 1) {
      this.isActive = false;
      this.root.visible = false;
      this.root.scale.set(1);
    }
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public destroy(): void {
    this.bannerGfx.destroy();
    this.labelText.destroy();
    this.subText.destroy();
    this.root.destroy({ children: true });
  }
}
