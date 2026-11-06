import { Container } from 'pixi.js';
import { PixiCardEntity, type CardDragEvent } from './PixiCardEntity';
import type { CardInstance } from '../../../engine/types';

export class PixiHandContainer extends Container {
  public cards: PixiCardEntity[] = [];
  public isFacedown: boolean = false;
  private hoveredIndex: number | null = null;

  public onCardClick?: (entity: PixiCardEntity, index: number) => void;
  public onCardDragStart?: (event: CardDragEvent, index: number) => void;
  public onCardDragMove?: (event: CardDragEvent, index: number) => void;
  public onCardDragEnd?: (event: CardDragEvent, index: number) => void;

  constructor(options: { isFacedown?: boolean } = {}) {
    super();
    this.isFacedown = options.isFacedown ?? false;
  }

  public setHandCards(cardInstances: CardInstance[], isFacedown = this.isFacedown) {
    this.isFacedown = isFacedown;

    // Clear existing cards
    for (const card of this.cards) {
      this.removeChild(card);
      card.destroy();
    }
    this.cards = [];

    // Create new card entities
    cardInstances.forEach((c, idx) => {
      const entity = new PixiCardEntity(c, {
        width: 100,
        height: 140,
        isFacedown: this.isFacedown,
      });

      entity.onCardClick = (e) => this.onCardClick?.(e, idx);

      entity.onCardDragStart = (e) => {
        this.onCardDragStart?.(e, idx);
      };

      entity.onCardDragMove = (e) => {
        this.onCardDragMove?.(e, idx);
      };

      entity.onCardDragEnd = (e) => {
        this.onCardDragEnd?.(e, idx);
        this.realignCards(true);
      };

      // Hover expansion
      entity.on('pointerover', () => {
        if (entity.isDragging) return;
        this.hoveredIndex = idx;
        this.realignCards(true);
      });

      entity.on('pointerout', () => {
        if (entity.isDragging) return;
        if (this.hoveredIndex === idx) {
          this.hoveredIndex = null;
          this.realignCards(true);
        }
      });

      this.cards.push(entity);
      this.addChild(entity);
    });

    this.realignCards(false);
  }

  public realignCards(animated = true) {
    const count = this.cards.length;
    if (count === 0) return;

    const maxSpreadWidth = 650;
    const baseSpacing = 72;
    const actualSpacing = count > 1 ? Math.min(baseSpacing, maxSpreadWidth / (count - 1)) : 0;
    const totalWidth = actualSpacing * (count - 1);
    const startX = -totalWidth / 2;

    const midIndex = (count - 1) / 2;

    this.cards.forEach((card, idx) => {
      if (card.isDragging) return;

      const isHovered = this.hoveredIndex === idx;
      const distFromHover = this.hoveredIndex !== null ? idx - this.hoveredIndex : 0;

      // Base fanning calculations
      let targetX = startX + idx * actualSpacing;
      const normalizedOffset = (idx - midIndex);
      let targetRotation = normalizedOffset * 0.045; // Subtle arc tilt
      let targetY = Math.pow(normalizedOffset, 2) * 2.2; // Arc curve elevation

      // Hover adjustment (lifts up and parts neighbors)
      if (isHovered) {
        targetY -= 36;
        targetRotation = 0;
        card.scale.set(1.12);
        // Bring hovered card to front of hand
        this.addChild(card);
      } else {
        card.scale.set(1.0);
        if (this.hoveredIndex !== null) {
          if (distFromHover > 0) targetX += 16;
          if (distFromHover < 0) targetX -= 16;
        }
      }

      if (animated) {
        card.springTo(targetX, targetY, targetRotation);
      } else {
        card.position.set(targetX, targetY);
        card.rotation = targetRotation;
      }
    });
  }
}
