import { Container, Graphics } from 'pixi.js';

export interface Particle {
  gfx: Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  scale: number;
  scaleSpeed: number;
  rotation: number;
  rotationSpeed: number;
  color: number;
  type: 'ember' | 'bubble' | 'leaf' | 'spark' | 'cosmic' | 'trail' | 'shockwave';
  radius?: number;
  maxRadius?: number;
}

export interface SlashEffect {
  gfx: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  progress: number;
  speed: number;
  color: number;
}

export class PixiParticleSystem {
  public root: Container;
  public particles: Particle[] = [];
  public slashes: SlashEffect[] = [];
  
  // Screen shake properties
  public isShaking = false;
  private shakeIntensity = 0;
  private shakeEndTime = 0;
  private targetToShake: Container | null = null;
  private originalTargetPos = { x: 0, y: 0 };

  // Arena dimensions
  public width = 1440;
  public height = 900;

  constructor(parent: Container, targetToShake?: Container) {
    this.root = new Container();
    this.root.eventMode = 'none';
    parent.addChild(this.root);
    this.targetToShake = targetToShake || null;
    if (this.targetToShake) {
      this.originalTargetPos = { x: this.targetToShake.x, y: this.targetToShake.y };
    }
  }

  public setDimensions(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  public get particleCount(): number {
    return this.particles.length + this.slashes.length;
  }

  /**
   * Emit interactive pointer stardust trail
   */
  public emitTrail(x: number, y: number, color = 0xf59e0b) {
    if (this.particles.length >= 250) return; // Limit pool for high performance

    const gfx = new Graphics();
    const size = Math.random() * 4 + 2;
    gfx.circle(0, 0, size).fill({ color, alpha: 0.85 });
    gfx.position.set(x, y);
    this.root.addChild(gfx);

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 1.5 + 0.5;

    this.particles.push({
      gfx,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      alpha: 0.9,
      decay: Math.random() * 0.03 + 0.02,
      scale: 1,
      scaleSpeed: -0.015,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      color,
      type: 'trail',
    });
  }

  /**
   * Emit Balatro-style celebratory multi-colored star sparks / chip confetti on card slam
   */
  public emitBalatroSparks(x: number, y: number, primaryColor = 0xf59e0b, count = 16) {
    const rainbowColors = [0xf59e0b, 0x10b981, 0x38bdf8, 0xec4899, 0xa855f7, 0xfbbf24, 0xffffff];

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 300) break;

      const gfx = new Graphics();
      const color = i === 0 ? primaryColor : rainbowColors[i % rainbowColors.length];
      const size = Math.random() * 3.5 + 2.5;

      // Draw diamond / star spark
      gfx
        .poly([
          { x: 0, y: -size * 1.5 },
          { x: size * 0.8, y: 0 },
          { x: 0, y: size * 1.5 },
          { x: -size * 0.8, y: 0 },
        ])
        .fill({ color, alpha: 0.95 });

      gfx.position.set(x, y);
      this.root.addChild(gfx);

      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 4.5 + 2.0;

      this.particles.push({
        gfx,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        alpha: 1.0,
        decay: Math.random() * 0.03 + 0.025,
        scale: 1.2,
        scaleSpeed: -0.02,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        color,
        type: 'spark',
      });
    }
  }

  /**
   * Emit type-based elemental ambient aura particles
   * energyType: 'R' (Fire), 'W' (Water), 'L' (Lightning), 'G' (Grass), 'P' (Psychic), 'D' (Dark), 'M' (Metal), 'N' (Dragon)
   */
  public emitElemental(energyType: string, x: number, y: number, count = 2) {
    const typeUpper = (energyType || '').toUpperCase();

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= 300) break;

      const gfx = new Graphics();
      let color = 0xf59e0b;
      let particleType: Particle['type'] = 'spark';
      let vx = (Math.random() - 0.5) * 1.2;
      let vy = -Math.random() * 1.8 - 0.5;
      let decay = 0.015;
      let size = 3.5;

      switch (typeUpper) {
        case 'R':
        case 'FIRE':
          color = Math.random() > 0.4 ? 0xef4444 : 0xf97316;
          particleType = 'ember';
          size = Math.random() * 3 + 2;
          vy = -Math.random() * 2.2 - 1.0;
          vx = (Math.random() - 0.5) * 1.8;
          decay = 0.018;
          gfx.circle(0, 0, size).fill({ color, alpha: 0.9 });
          break;

        case 'W':
        case 'WATER':
          color = Math.random() > 0.3 ? 0x38bdf8 : 0x0284c7;
          particleType = 'bubble';
          size = Math.random() * 5 + 3;
          vy = -Math.random() * 1.5 - 0.8;
          vx = Math.sin(Date.now() / 100) * 0.6;
          decay = 0.012;
          gfx.circle(0, 0, size).stroke({ width: 1.2, color: 0xffffff, alpha: 0.8 }).fill({ color, alpha: 0.35 });
          break;

        case 'L':
        case 'LIGHTNING':
          color = Math.random() > 0.3 ? 0xfacc15 : 0x38bdf8;
          particleType = 'spark';
          size = Math.random() * 4 + 2;
          vx = (Math.random() - 0.5) * 3.5;
          vy = (Math.random() - 0.5) * 3.5;
          decay = 0.035;
          gfx.rect(-size / 2, -size / 2, size, size).fill({ color, alpha: 0.95 });
          break;

        case 'G':
        case 'GRASS':
          color = Math.random() > 0.4 ? 0x22c55e : 0x10b981;
          particleType = 'leaf';
          size = Math.random() * 4 + 3;
          vx = Math.sin(Date.now() / 200 + i) * 1.2 + 0.5;
          vy = -Math.random() * 1.2 - 0.3;
          decay = 0.014;
          gfx.ellipse(0, 0, size, size * 0.5).fill({ color, alpha: 0.85 });
          break;

        case 'P':
        case 'PSYCHIC':
          color = Math.random() > 0.3 ? 0xa855f7 : 0xec4899;
          particleType = 'cosmic';
          size = Math.random() * 4 + 2;
          const angle = Math.random() * Math.PI * 2;
          vx = Math.cos(angle) * 1.2;
          vy = Math.sin(angle) * 1.2 - 0.5;
          decay = 0.016;
          gfx.star(0, 0, 4, size, size * 0.4).fill({ color, alpha: 0.9 });
          break;

        case 'D':
        case 'DARKNESS':
          color = Math.random() > 0.5 ? 0x475569 : 0x3b0764;
          particleType = 'cosmic';
          size = Math.random() * 6 + 3;
          vx = (Math.random() - 0.5) * 0.8;
          vy = -Math.random() * 1.2 - 0.2;
          decay = 0.02;
          gfx.circle(0, 0, size).fill({ color, alpha: 0.65 });
          break;

        case 'M':
        case 'METAL':
          color = 0xe2e8f0;
          particleType = 'spark';
          size = Math.random() * 3 + 2;
          vx = (Math.random() - 0.5) * 1.5;
          vy = -Math.random() * 1.5 - 0.5;
          decay = 0.025;
          gfx.star(0, 0, 4, size, size * 0.3).fill({ color, alpha: 0.9 });
          break;

        case 'N':
        case 'DRAGON':
        default:
          color = 0xf59e0b;
          particleType = 'spark';
          size = Math.random() * 4 + 2;
          vx = (Math.random() - 0.5) * 2.0;
          vy = -Math.random() * 1.8 - 0.5;
          decay = 0.02;
          gfx.circle(0, 0, size).fill({ color, alpha: 0.85 });
          break;
      }

      const spawnX = x + (Math.random() - 0.5) * 40;
      const spawnY = y + (Math.random() - 0.5) * 30;
      gfx.position.set(spawnX, spawnY);
      this.root.addChild(gfx);

      this.particles.push({
        gfx,
        x: spawnX,
        y: spawnY,
        vx,
        vy,
        alpha: 0.9,
        decay,
        scale: 1,
        scaleSpeed: -0.008,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.08,
        color,
        type: particleType,
      });
    }
  }

  /**
   * Emit High-Speed Combat Slashing Energy Beam from Attacker to Defender
   */
  public emitSlash(fromX: number, fromY: number, toX: number, toY: number, color = 0x38bdf8) {
    const gfx = new Graphics();
    this.root.addChild(gfx);

    this.slashes.push({
      gfx,
      fromX,
      fromY,
      toX,
      toY,
      progress: 0,
      speed: 0.065, // ~15 frames to reach target
      color,
    });
  }

  /**
   * Emit expanding impact shockwave ring
   */
  public emitShockwave(x: number, y: number, color = 0xef4444, maxRadius = 140) {
    const gfx = new Graphics();
    this.root.addChild(gfx);

    this.particles.push({
      gfx,
      x,
      y,
      vx: 0,
      vy: 0,
      alpha: 0.95,
      decay: 0.035,
      scale: 1,
      scaleSpeed: 0,
      rotation: 0,
      rotationSpeed: 0,
      color,
      type: 'shockwave',
      radius: 10,
      maxRadius,
    });
  }

  /**
   * Emit celebratory stardust shockwaves and elemental sparks when turn starts
   */
  public emitCelebration(isMyTurn: boolean) {
    const mainColor = isMyTurn ? 0x10b981 : 0x6366f1;
    this.emitShockwave(720, 450, mainColor, 130);
    this.emitElemental(isMyTurn ? 'L' : 'P', 660, 450, 6);
    this.emitElemental(isMyTurn ? 'G' : 'W', 780, 450, 6);
  }

  /**
   * Trigger intense screen shake for heavy damage or critical KO
   */
  public triggerScreenShake(intensity = 8, durationMs = 350) {
    if (this.targetToShake) {
      this.originalTargetPos = { x: this.targetToShake.x, y: this.targetToShake.y };
    }
    this.isShaking = true;
    this.shakeIntensity = intensity;
    this.shakeEndTime = Date.now() + durationMs;
  }

  /**
   * Per-frame update loop (called by Pixi Ticker at 60 FPS)
   */
  public update(deltaRatio = 1.0) {
    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'shockwave') {
        p.radius = (p.radius || 10) + (p.maxRadius! - (p.radius || 10)) * 0.15 * deltaRatio;
        p.alpha -= p.decay * deltaRatio;

        p.gfx.clear();
        p.gfx
          .circle(0, 0, p.radius)
          .stroke({ width: Math.max(1, (1 - p.radius / p.maxRadius!) * 6), color: p.color, alpha: Math.max(0, p.alpha) });
        p.gfx.position.set(p.x, p.y);

        if (p.alpha <= 0 || p.radius >= p.maxRadius! * 0.95) {
          p.gfx.destroy();
          this.particles.splice(i, 1);
        }
        continue;
      }

      // Normal physics particles
      p.x += p.vx * deltaRatio;
      p.y += p.vy * deltaRatio;
      p.alpha -= p.decay * deltaRatio;
      p.scale = Math.max(0, p.scale + p.scaleSpeed * deltaRatio);
      p.rotation += p.rotationSpeed * deltaRatio;

      p.gfx.position.set(p.x, p.y);
      p.gfx.alpha = Math.max(0, p.alpha);
      p.gfx.scale.set(p.scale);
      p.gfx.rotation = p.rotation;

      if (p.alpha <= 0 || p.scale <= 0.05) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }

    // 2. Update Slashes
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      const s = this.slashes[i];
      s.progress += s.speed * deltaRatio;

      const currX = s.fromX + (s.toX - s.fromX) * Math.min(1, s.progress);
      const currY = s.fromY + (s.toY - s.fromY) * Math.min(1, s.progress);

      const trailProgress = Math.max(0, s.progress - 0.25);
      const tailX = s.fromX + (s.toX - s.fromX) * trailProgress;
      const tailY = s.fromY + (s.toY - s.fromY) * trailProgress;

      s.gfx.clear();
      s.gfx
        .moveTo(tailX, tailY)
        .lineTo(currX, currY)
        .stroke({ width: 6, color: 0xffffff, alpha: 0.95 })
        .stroke({ width: 14, color: s.color, alpha: 0.55 });

      if (s.progress >= 1.0) {
        // Target reached -> burst impact shockwave & sparks
        this.emitShockwave(s.toX, s.toY, s.color, 110);
        for (let k = 0; k < 12; k++) {
          this.emitTrail(s.toX, s.toY, s.color);
        }
        s.gfx.destroy();
        this.slashes.splice(i, 1);
      }
    }

    // 3. Screen Shake logic
    if (this.isShaking && this.targetToShake) {
      if (Date.now() < this.shakeEndTime) {
        const decay = (this.shakeEndTime - Date.now()) / 350;
        const currentIntensity = this.shakeIntensity * Math.max(0, decay);
        const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
        const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
        this.targetToShake.x = this.originalTargetPos.x + offsetX;
        this.targetToShake.y = this.originalTargetPos.y + offsetY;
      } else {
        this.isShaking = false;
        this.targetToShake.x = this.originalTargetPos.x;
        this.targetToShake.y = this.originalTargetPos.y;
      }
    }
  }

  public clear() {
    for (const p of this.particles) {
      p.gfx.destroy();
    }
    this.particles = [];

    for (const s of this.slashes) {
      s.gfx.destroy();
    }
    this.slashes = [];
  }

  public destroy() {
    this.clear();
    this.root.destroy({ children: true });
  }
}
