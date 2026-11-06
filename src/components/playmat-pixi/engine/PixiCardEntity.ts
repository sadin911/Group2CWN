import { Container, Graphics, Sprite, Text, Assets, Texture, FederatedPointerEvent } from 'pixi.js';
import type { CardInstance } from '../../../engine/types';
import type { TabletopPokemonSlot } from '../../playmat-v3/types';
import { resolveCardImageUrl } from '../../../utils/cardImage';

export interface CardDragEvent {
  entity: PixiCardEntity;
  globalX: number;
  globalY: number;
  localX: number;
  localY: number;
}

export class PixiCardEntity extends Container {
  public cardData: CardInstance;
  public slotData?: TabletopPokemonSlot | null;
  public isFacedown: boolean = false;
  public isDragging: boolean = false;
  public isHovered: boolean = false;

  // Visual sub-elements
  private shadowGfx: Graphics;
  private cardContainer: Container;
  private cardBackGfx: Graphics;
  private frontSprite: Sprite | null = null;
  private borderGfx: Graphics;
  private damageBadge: Container | null = null;
  private energyBadge: Container | null = null;
  private toolBadge: Container | null = null;
  private statusBadgesContainer: Container | null = null;
  private selectionGlow: Graphics;

  // Geometry
  public readonly cardWidth: number;
  public readonly cardHeight: number;
  public readonly cornerRadius: number = 8;

  // Animation & Physics state
  public targetX: number = 0;
  public targetY: number = 0;
  public targetRotation: number = 0;
  public targetScale: number = 1;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastDragX: number = 0;
  private dragVelocityX: number = 0;

  // Callbacks
  public onCardClick?: (entity: PixiCardEntity) => void;
  public onCardDragStart?: (event: CardDragEvent) => void;
  public onCardDragMove?: (event: CardDragEvent) => void;
  public onCardDragEnd?: (event: CardDragEvent) => void;

  constructor(
    card: CardInstance,
    options: {
      width?: number;
      height?: number;
      isFacedown?: boolean;
      slot?: TabletopPokemonSlot | null;
    } = {}
  ) {
    super();

    this.cardData = card;
    this.slotData = options.slot;
    this.isFacedown = options.isFacedown ?? Boolean(card.isFacedown || options.slot?.isFacedown);
    this.cardWidth = options.width || 110;
    this.cardHeight = options.height || 154;

    // Center pivot for intuitive rotations and scaling
    this.pivot.set(this.cardWidth / 2, this.cardHeight / 2);

    // 1. Shadow underneath
    this.shadowGfx = new Graphics();
    this.drawShadow(false);
    this.addChild(this.shadowGfx);

    // 2. Card body container (holds front, back, border, badges)
    this.cardContainer = new Container();
    this.addChild(this.cardContainer);

    // 3. Card Back (Stylized Pokéball motif)
    this.cardBackGfx = new Graphics();
    this.drawCardBack();
    this.cardContainer.addChild(this.cardBackGfx);

    // 4. Border & Foil Glow
    this.borderGfx = new Graphics();
    this.drawBorder();
    this.cardContainer.addChild(this.borderGfx);

    // 5. Selection / Hover Glow
    this.selectionGlow = new Graphics();
    this.selectionGlow.visible = false;
    this.cardContainer.addChild(this.selectionGlow);

    // 6. Interactive Setup
    this.eventMode = 'static';
    this.cursor = 'grab';

    this.setupInteraction();

    // 7. Load texture if not facedown
    if (!this.isFacedown) {
      this.loadFrontTexture();
    } else {
      this.cardBackGfx.visible = true;
    }

    // 8. Update Slot Badges (HP, damage, energies)
    this.updateSlotDetails(this.slotData);
  }

  private drawShadow(isElevated: boolean) {
    this.shadowGfx.clear();
    const offsetY = isElevated ? 14 : 4;
    const blurAlpha = isElevated ? 0.35 : 0.2;
    const expand = isElevated ? 4 : 1;

    this.shadowGfx
      .roundRect(-expand, offsetY - expand, this.cardWidth + expand * 2, this.cardHeight + expand * 2, this.cornerRadius + 2)
      .fill({ color: 0x000000, alpha: blurAlpha });
  }

  private drawCardBack() {
    this.cardBackGfx.clear();

    // Dark indigo gradient base
    this.cardBackGfx
      .roundRect(0, 0, this.cardWidth, this.cardHeight, this.cornerRadius)
      .fill({ color: 0x0f172a })
      .stroke({ width: 2, color: 0x38bdf8, alpha: 0.8 });

    // Inner patterned border
    this.cardBackGfx
      .roundRect(4, 4, this.cardWidth - 8, this.cardHeight - 8, this.cornerRadius - 2)
      .fill({ color: 0x1e1b4b })
      .stroke({ width: 1.5, color: 0x6366f1, alpha: 0.6 });

    // Central Pokéball emblem
    const cx = this.cardWidth / 2;
    const cy = this.cardHeight / 2;
    const radius = Math.min(this.cardWidth, this.cardHeight) * 0.22;

    // Outer ring
    this.cardBackGfx
      .circle(cx, cy, radius)
      .fill({ color: 0x312e81 })
      .stroke({ width: 2, color: 0x67e8f9 });

    // Top half red
    this.cardBackGfx
      .arc(cx, cy, radius - 2, Math.PI, 0, false)
      .fill({ color: 0xef4444 });

    // Bottom half white
    this.cardBackGfx
      .arc(cx, cy, radius - 2, 0, Math.PI, false)
      .fill({ color: 0xf8fafc });

    // Center divider & button
    this.cardBackGfx
      .rect(cx - radius, cy - 2, radius * 2, 4)
      .fill({ color: 0x0f172a });

    this.cardBackGfx
      .circle(cx, cy, radius * 0.38)
      .fill({ color: 0xffffff })
      .stroke({ width: 2, color: 0x0f172a });

    this.cardBackGfx
      .circle(cx, cy, radius * 0.16)
      .fill({ color: 0x0f172a });
  }

  private drawBorder() {
    this.borderGfx.clear();
    const rarity = (this.cardData as any).rarityCode || (this.cardData as any).rarity || '';
    const isSpecial = ['AR', 'SAR', 'SR', 'UR', 'ACE_SPEC'].includes(rarity);

    const borderColor = isSpecial ? 0xf59e0b : 0x475569;
    const borderWidth = isSpecial ? 2 : 1;
    const borderAlpha = isSpecial ? 0.9 : 0.5;

    this.borderGfx
      .roundRect(0, 0, this.cardWidth, this.cardHeight, this.cornerRadius)
      .stroke({ width: borderWidth, color: borderColor, alpha: borderAlpha });
  }

  public async loadFrontTexture() {
    try {
      const rawUrl = this.cardData.imageUrlHigh || this.cardData.imageUrl;
      const resolvedUrl = resolveCardImageUrl(rawUrl, false);

      let texture: Texture;
      try {
        texture = await Assets.load(resolvedUrl);
      } catch {
        texture = Texture.WHITE;
      }

      if (this.frontSprite) {
        this.frontSprite.texture = texture;
      } else {
        this.frontSprite = new Sprite(texture);
        this.frontSprite.width = this.cardWidth;
        this.frontSprite.height = this.cardHeight;

        // Mask with rounded rectangle
        const maskGfx = new Graphics();
        maskGfx.roundRect(0, 0, this.cardWidth, this.cardHeight, this.cornerRadius).fill({ color: 0xffffff });
        this.frontSprite.mask = maskGfx;
        this.cardContainer.addChild(maskGfx);
        this.cardContainer.addChildAt(this.frontSprite, 0);
      }

      // Hide back when front is loaded and card is face up
      this.cardBackGfx.visible = this.isFacedown;
    } catch (err) {
      const cName = (this.cardData as any).nameTh || (this.cardData as any).nameEn || 'Card';
      console.warn(`[PixiCardEntity] Texture load failed for ${cName}:`, err);
    }
  }

  public setFacedown(facedown: boolean, animated = true) {
    if (this.isFacedown === facedown) return;
    this.isFacedown = facedown;

    if (!animated) {
      this.cardBackGfx.visible = facedown;
      if (this.frontSprite) this.frontSprite.visible = !facedown;
      if (!facedown && !this.frontSprite) this.loadFrontTexture();
      return;
    }

    // 3D Flip animation using scale.x compression
    const startScaleX = this.scale.x;
    let progress = 0;
    const step = () => {
      progress += 0.12;
      if (progress < 0.5) {
        this.scale.x = startScaleX * (1 - progress * 2);
      } else if (progress < 1) {
        this.cardBackGfx.visible = facedown;
        if (this.frontSprite) this.frontSprite.visible = !facedown;
        if (!facedown && !this.frontSprite) this.loadFrontTexture();
        this.scale.x = startScaleX * ((progress - 0.5) * 2);
      } else {
        this.scale.x = startScaleX;
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  public updateSlotDetails(slot?: TabletopPokemonSlot | null) {
    this.slotData = slot;

    // Damage badge
    if (this.damageBadge) {
      this.cardContainer.removeChild(this.damageBadge);
      this.damageBadge.destroy({ children: true });
      this.damageBadge = null;
    }

    if (slot && slot.damage > 0) {
      this.damageBadge = new Container();
      const badgeBg = new Graphics();
      const damageText = new Text({
        text: `-${slot.damage}`,
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 12,
          fontWeight: '900',
          fill: '#ffffff',
          stroke: { width: 3, color: '#450a0a' },
        },
      });

      const bw = Math.max(38, damageText.width + 12);
      const bh = 20;

      badgeBg
        .roundRect(0, 0, bw, bh, 6)
        .fill({ color: 0xdc2626 })
        .stroke({ width: 1.5, color: 0xfca5a5 });

      damageText.position.set((bw - damageText.width) / 2, (bh - damageText.height) / 2);

      this.damageBadge.addChild(badgeBg);
      this.damageBadge.addChild(damageText);
      this.damageBadge.position.set(this.cardWidth - bw - 4, 4);
      this.cardContainer.addChild(this.damageBadge);
    }

    // Energy badge
    if (this.energyBadge) {
      this.cardContainer.removeChild(this.energyBadge);
      this.energyBadge.destroy({ children: true });
      this.energyBadge = null;
    }

    if (slot && slot.attachedEnergies && slot.attachedEnergies.length > 0) {
      this.energyBadge = new Container();
      const energyBg = new Graphics();
      const count = slot.attachedEnergies.length;
      const energyText = new Text({
        text: `⚡ ×${count}`,
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 11,
          fontWeight: 'bold',
          fill: '#fef08a',
          stroke: { width: 2, color: '#713f12' },
        },
      });

      const ew = energyText.width + 10;
      const eh = 18;

      energyBg
        .roundRect(0, 0, ew, eh, 6)
        .fill({ color: 0x1e293b, alpha: 0.9 })
        .stroke({ width: 1.5, color: 0xfacc15, alpha: 0.8 });

      energyText.position.set((ew - energyText.width) / 2, (eh - energyText.height) / 2);

      this.energyBadge.addChild(energyBg);
      this.energyBadge.addChild(energyText);
      this.energyBadge.position.set(4, this.cardHeight - eh - 4);
      this.cardContainer.addChild(this.energyBadge);
    }

    // Tool badge
    if (this.toolBadge) {
      this.cardContainer.removeChild(this.toolBadge);
      this.toolBadge.destroy({ children: true });
      this.toolBadge = null;
    }

    if (slot && slot.attachedTool) {
      this.toolBadge = new Container();
      const toolBg = new Graphics();
      const toolText = new Text({
        text: '🔧 TOOL',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 9,
          fontWeight: '900',
          fill: '#a7f3d0',
          stroke: { width: 2, color: '#064e3b' },
        },
      });

      const tw = toolText.width + 8;
      const th = 16;
      toolBg
        .roundRect(0, 0, tw, th, 4)
        .fill({ color: 0x064e3b, alpha: 0.9 })
        .stroke({ width: 1, color: 0x34d399 });

      toolText.position.set((tw - toolText.width) / 2, (th - toolText.height) / 2);
      this.toolBadge.addChild(toolBg);
      this.toolBadge.addChild(toolText);
      this.toolBadge.position.set(4, 4);
      this.cardContainer.addChild(this.toolBadge);
    }

    // Special condition badges (Poison, Burn, Sleep, Paralyze, Confuse)
    if (this.statusBadgesContainer) {
      this.cardContainer.removeChild(this.statusBadgesContainer);
      this.statusBadgesContainer.destroy({ children: true });
      this.statusBadgesContainer = null;
    }

    if (slot && slot.specialConditions && slot.specialConditions.length > 0) {
      this.statusBadgesContainer = new Container();
      const icons: Record<string, { label: string; color: number; stroke: number }> = {
        POISONED: { label: '☠️ พิษ', color: 0x581c87, stroke: 0xc084fc },
        BURNED: { label: '🔥 ไหม้', color: 0x7c2d12, stroke: 0xfb923c },
        ASLEEP: { label: '💤 หลับ', color: 0x1e3a8a, stroke: 0x60a5fa },
        PARALYZED: { label: '⚡ ชา', color: 0x713f12, stroke: 0xfacc15 },
        CONFUSED: { label: '🌀 สับสน', color: 0x701a75, stroke: 0xf472b6 },
      };

      let startX = 4;
      slot.specialConditions.forEach((cond) => {
        const info = icons[cond];
        if (!info) return;

        const badge = new Container();
        const bg = new Graphics();
        const txt = new Text({
          text: info.label,
          style: {
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: 9,
            fontWeight: 'bold',
            fill: '#ffffff',
          },
        });
        const bw = txt.width + 6;
        const bh = 15;
        bg.roundRect(0, 0, bw, bh, 4).fill({ color: info.color, alpha: 0.9 }).stroke({ width: 1, color: info.stroke });
        txt.position.set((bw - txt.width) / 2, (bh - txt.height) / 2);
        badge.addChild(bg);
        badge.addChild(txt);
        badge.position.set(startX, 24);
        startX += bw + 3;
        this.statusBadgesContainer!.addChild(badge);
      });

      this.cardContainer.addChild(this.statusBadgesContainer);
    }
  }

  public setHighlight(active: boolean, color = 0x38bdf8) {
    this.selectionGlow.clear();
    this.selectionGlow.visible = active;
    if (active) {
      this.selectionGlow
        .roundRect(-3, -3, this.cardWidth + 6, this.cardHeight + 6, this.cornerRadius + 2)
        .stroke({ width: 3, color, alpha: 0.9 });
    }
  }

  private setupInteraction() {
    let hasMoved = false;

    this.on('pointerover', () => {
      if (this.isDragging) return;
      this.isHovered = true;
      this.drawShadow(true);
      this.setHighlight(true, 0x38bdf8);
    });

    this.on('pointerout', () => {
      if (this.isDragging) return;
      this.isHovered = false;
      this.drawShadow(false);
      this.setHighlight(false);
      this.skew.x = 0;
    });

    this.on('pointerdown', (e: FederatedPointerEvent) => {
      this.isDragging = true;
      hasMoved = false;
      this.cursor = 'grabbing';
      this.drawShadow(true);

      if (!this.parent) return;
      const parentPos = this.parent.toLocal(e.global);
      this.dragStartX = parentPos.x - this.x;
      this.dragStartY = parentPos.y - this.y;
      this.lastDragX = e.global.x;
      this.dragVelocityX = 0;

      // Bring to front of parent container
      this.parent.addChild(this);

      this.onCardDragStart?.({
        entity: this,
        globalX: e.global.x,
        globalY: e.global.y,
        localX: this.x,
        localY: this.y,
      });
    });

    this.on('globalpointermove', (e: FederatedPointerEvent) => {
      if (!this.isDragging) return;

      if (!this.parent) return;
      const parentPos = this.parent.toLocal(e.global);
      const newX = parentPos.x - this.dragStartX;
      const newY = parentPos.y - this.dragStartY;

      if (Math.abs(newX - this.x) > 3 || Math.abs(newY - this.y) > 3) {
        hasMoved = true;
      }

      // Calculate horizontal velocity for natural card tilt
      const dx = e.global.x - this.lastDragX;
      this.lastDragX = e.global.x;
      this.dragVelocityX = this.dragVelocityX * 0.7 + dx * 0.3;

      // Apply inertial card tilt physics
      const maxSkew = 0.18;
      const targetSkew = Math.max(-maxSkew, Math.min(maxSkew, -this.dragVelocityX * 0.008));
      this.skew.x = targetSkew;
      this.rotation = targetSkew * 0.6;

      this.x = newX;
      this.y = newY;

      this.onCardDragMove?.({
        entity: this,
        globalX: e.global.x,
        globalY: e.global.y,
        localX: this.x,
        localY: this.y,
      });
    });

    const onPointerUp = (e: FederatedPointerEvent) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.cursor = 'grab';
      this.drawShadow(this.isHovered);

      // Spring tilt back to zero
      this.skew.x = 0;
      this.rotation = 0;

      this.onCardDragEnd?.({
        entity: this,
        globalX: e.global.x,
        globalY: e.global.y,
        localX: this.x,
        localY: this.y,
      });

      if (!hasMoved) {
        this.onCardClick?.(this);
      }
    };

    this.on('pointerup', onPointerUp);
    this.on('pointerupoutside', onPointerUp);
  }

  public springTo(targetX: number, targetY: number, targetRotation = 0, onComplete?: () => void) {
    this.targetX = targetX;
    this.targetY = targetY;
    this.targetRotation = targetRotation;

    let frames = 0;
    const animate = () => {
      frames++;
      this.x += (this.targetX - this.x) * 0.25;
      this.y += (this.targetY - this.y) * 0.25;
      this.rotation += (this.targetRotation - this.rotation) * 0.25;

      const dist = Math.hypot(this.targetX - this.x, this.targetY - this.y);
      if (dist < 0.5 && Math.abs(this.targetRotation - this.rotation) < 0.01) {
        this.x = this.targetX;
        this.y = this.targetY;
        this.rotation = this.targetRotation;
        onComplete?.();
        return;
      }

      if (frames < 45) {
        requestAnimationFrame(animate);
      } else {
        this.x = this.targetX;
        this.y = this.targetY;
        this.rotation = this.targetRotation;
        onComplete?.();
      }
    };
    requestAnimationFrame(animate);
  }
}
