import { describe, it, expect } from 'vitest';
import type { CardFlight } from './CardFlightLayer';

describe('CardFlightLayer flight calculation and queue logic', () => {
  it('creates and calculates flight start and end geometry', () => {
    const flight: CardFlight = {
      id: 'flight-1',
      fromX: 100,
      fromY: 500,
      toX: 400,
      toY: 650,
      type: 'DRAW',
      durationMs: 380,
      timestamp: Date.now(),
    };

    expect(flight.fromX).toBe(100);
    expect(flight.toX).toBe(400);
    expect(flight.type).toBe('DRAW');

    const deltaX = flight.toX - flight.fromX;
    const deltaY = flight.toY - flight.fromY;
    expect(deltaX).toBe(300);
    expect(deltaY).toBe(150);
  });

  it('determines card dimensions based on standard 63:88 aspect ratio', () => {
    const computeHeight = (width: number) => Math.round(width * (88 / 63));

    expect(computeHeight(63)).toBe(88);
    expect(computeHeight(68)).toBe(95);
  });

  it('calculates precise targeted hand fan slot trajectory and fan rotation angle', () => {
    // Simulate drawing 3 cards into a hand that already has 2 cards (total: 5 cards)
    const currentHandCount = 2;
    const count = 3;
    const targetTotal = currentHandCount + count; // 5
    const cardWidth = 70;
    const stepX = cardWidth + 8; // 78
    const totalFanWidth = (targetTotal - 1) * stepX + cardWidth;
    const trayCenterX = 720;
    const startX = trayCenterX - totalFanWidth / 2;
    const targetMid = (targetTotal - 1) / 2; // 2

    // Card 0 being drawn (lands in slot 2 - center slot)
    const slot0 = currentHandCount + 0; // 2
    const offset0 = slot0 - targetMid; // 0
    const targetX0 = startX + slot0 * stepX + cardWidth / 2;
    const targetRot0 = offset0 * 2.2;
    expect(targetX0).toBe(trayCenterX);
    expect(targetRot0).toBe(0);

    // Card 1 being drawn (lands in slot 3 - right of center)
    const slot1 = currentHandCount + 1; // 3
    const offset1 = slot1 - targetMid; // +1
    const targetX1 = startX + slot1 * stepX + cardWidth / 2;
    const targetRot1 = offset1 * 2.2;
    expect(targetX1).toBeGreaterThan(trayCenterX);
    expect(targetRot1).toBe(2.2);

    // Card 2 being drawn (lands in slot 4 - far right slot)
    const slot2 = currentHandCount + 2; // 4
    const offset2 = slot2 - targetMid; // +2
    const targetX2 = startX + slot2 * stepX + cardWidth / 2;
    const targetRot2 = offset2 * 2.2;
    expect(targetX2).toBeGreaterThan(targetX1);
    expect(targetRot2).toBe(4.4);
  });
});
