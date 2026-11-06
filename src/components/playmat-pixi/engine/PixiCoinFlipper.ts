import { Container, Graphics, Text } from 'pixi.js';
import { Sound } from '../../../engine/pixi/SoundEffects';

export class PixiCoinFlipper extends Container {
  private coinShadow: Graphics;
  private coinBody: Container;
  private coinHeadsGfx: Graphics;
  private coinTailsGfx: Graphics;
  private resultBanner: Container;
  private bannerBg: Graphics;
  private bannerText: Text;

  public isFlipping = false;
  private coinRadius = 32;
  private animFrameId: number | null = null;
  private bannerTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();

    // 1. Shadow underneath
    this.coinShadow = new Graphics();
    this.drawShadow(1);
    this.addChild(this.coinShadow);

    // 2. Coin Body Container
    this.coinBody = new Container();
    this.addChild(this.coinBody);

    // 3. Heads graphic (Pokéball styling)
    this.coinHeadsGfx = new Graphics();
    this.drawHeads();
    this.coinBody.addChild(this.coinHeadsGfx);

    // 4. Tails graphic (Silver lightning badge)
    this.coinTailsGfx = new Graphics();
    this.drawTails();
    this.coinTailsGfx.visible = false;
    this.coinBody.addChild(this.coinTailsGfx);

    // 5. Result Banner
    this.resultBanner = new Container();
    this.resultBanner.visible = false;

    this.bannerBg = new Graphics();
    this.bannerText = new Text({
      text: 'HEADS',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: '900',
        fill: '#ffffff',
        stroke: { width: 2.5, color: '#0f172a' },
      },
    });

    this.resultBanner.addChild(this.bannerBg);
    this.resultBanner.addChild(this.bannerText);
    this.resultBanner.position.set(0, 42);
    this.addChild(this.resultBanner);

    // Interactive
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', () => {
      if (!this.isFlipping) {
        this.flip();
      }
    });
  }

  private drawShadow(scale: number) {
    this.coinShadow.clear();
    const rx = this.coinRadius * scale * 1.1;
    const ry = (this.coinRadius * 0.38) * scale;
    this.coinShadow
      .ellipse(0, 10, rx, ry)
      .fill({ color: 0x000000, alpha: 0.35 * (1.2 - scale * 0.4) });
  }

  private drawHeads() {
    this.coinHeadsGfx.clear();
    const r = this.coinRadius;

    // Metallic gold rim
    this.coinHeadsGfx
      .circle(0, 0, r)
      .fill({ color: 0xf59e0b })
      .stroke({ width: 3, color: 0xfef08a });

    // Inner red top
    this.coinHeadsGfx
      .arc(0, 0, r - 3, Math.PI, 0, false)
      .fill({ color: 0xef4444 });

    // Inner white bottom
    this.coinHeadsGfx
      .arc(0, 0, r - 3, 0, Math.PI, false)
      .fill({ color: 0xf8fafc });

    // Center divider & button
    this.coinHeadsGfx
      .rect(-r + 3, -2, (r - 3) * 2, 4)
      .fill({ color: 0x1e293b });

    this.coinHeadsGfx
      .circle(0, 0, r * 0.32)
      .fill({ color: 0xffffff })
      .stroke({ width: 2, color: 0x1e293b });

    this.coinHeadsGfx
      .circle(0, 0, r * 0.14)
      .fill({ color: 0x1e293b });
  }

  private drawTails() {
    this.coinTailsGfx.clear();
    const r = this.coinRadius;

    // Metallic silver/cyan rim
    this.coinTailsGfx
      .circle(0, 0, r)
      .fill({ color: 0x64748b })
      .stroke({ width: 3, color: 0xe2e8f0 });

    // Inner star motif
    this.coinTailsGfx
      .circle(0, 0, r - 3)
      .fill({ color: 0x1e293b });

    // Center icon
    this.coinTailsGfx
      .poly([0, -16, 12, 0, 0, 16, -12, 0])
      .fill({ color: 0x38bdf8 })
      .stroke({ width: 1.5, color: 0xffffff });
  }

  public flip(presetResult?: 'HEADS' | 'TAILS', onComplete?: (result: 'HEADS' | 'TAILS') => void) {
    if (this.isFlipping) return;
    this.isFlipping = true;
    this.resultBanner.visible = false;

    const finalResult = presetResult || (Math.random() >= 0.5 ? 'HEADS' : 'TAILS');
    Sound.playCardFlip();

    const duration = 1200; // 1.2s
    const startTime = performance.now();
    const apexHeight = 140;

    const animate = (now: number) => {
      if (!this.coinBody || this.destroyed) {
        this.isFlipping = false;
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Parabolic jump arc: 4 * progress * (1 - progress) peaks at progress = 0.5
      const arc = 4 * progress * (1 - progress);
      this.coinBody.y = -arc * apexHeight;

      // Shadow scales inversely with height
      const shadowScale = 1 - arc * 0.45;
      this.drawShadow(shadowScale);

      // Spin rotation (3D vertical squash)
      const spinRotations = 10;
      const currentAngle = progress * Math.PI * 2 * spinRotations;
      const cosVal = Math.cos(currentAngle);

      this.coinBody.scale.y = Math.abs(cosVal);
      const isHeadsFacing = cosVal >= 0;

      if (progress < 0.95) {
        this.coinHeadsGfx.visible = isHeadsFacing;
        this.coinTailsGfx.visible = !isHeadsFacing;
      } else {
        // Force final face
        this.coinHeadsGfx.visible = finalResult === 'HEADS';
        this.coinTailsGfx.visible = finalResult === 'TAILS';
      }

      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(animate);
      } else {
        this.animFrameId = null;
        this.isFlipping = false;
        this.coinBody.y = 0;
        this.coinBody.scale.y = 1;
        this.drawShadow(1);
        this.showResultBanner(finalResult);
        onComplete?.(finalResult);
      }
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  private showResultBanner(result: 'HEADS' | 'TAILS') {
    if (this.destroyed) return;
    const isHeads = result === 'HEADS';
    this.bannerText.text = isHeads ? '🪙 หัว (HEADS)' : '🪙 ก้อย (TAILS)';

    const bw = this.bannerText.width + 20;
    const bh = 24;

    this.bannerBg.clear();
    this.bannerBg
      .roundRect(-bw / 2, -bh / 2, bw, bh, 8)
      .fill({ color: isHeads ? 0x065f46 : 0x1e293b, alpha: 0.95 })
      .stroke({ width: 1.5, color: isHeads ? 0x34d399 : 0x94a3b8 });

    this.bannerText.position.set(-this.bannerText.width / 2, -this.bannerText.height / 2);
    this.resultBanner.visible = true;

    // Auto dismiss banner after 3.5s
    if (this.bannerTimeoutId !== null) {
      clearTimeout(this.bannerTimeoutId);
    }
    this.bannerTimeoutId = setTimeout(() => {
      if (!this.destroyed && this.resultBanner) {
        this.resultBanner.visible = false;
      }
      this.bannerTimeoutId = null;
    }, 3500);
  }

  public override destroy(options?: any) {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.bannerTimeoutId !== null) {
      clearTimeout(this.bannerTimeoutId);
      this.bannerTimeoutId = null;
    }
    super.destroy(options);
  }
}
