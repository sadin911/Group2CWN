import { describe, it, expect } from 'vitest';
import { calculateBalatroTilt } from './useBalatroCardTilt';

describe('calculateBalatroTilt', () => {
  const rect = { left: 100, top: 100, width: 200, height: 300 };

  it('calculates zero tilt when cursor is perfectly centered', () => {
    // Center is (left + width/2, top + height/2) = (200, 250)
    const res = calculateBalatroTilt(200, 250, rect, 14);

    expect(res.rx).toBeCloseTo(0);
    expect(res.ry).toBeCloseTo(0);
    expect(res.px).toBeCloseTo(50);
    expect(res.py).toBeCloseTo(50);
  });

  it('calculates positive rotation Y and negative rotation X at bottom-right corner', () => {
    // Bottom-right corner (300, 400) -> normX = 1, normY = 1
    const res = calculateBalatroTilt(300, 400, rect, 14);

    expect(res.ry).toBeCloseTo(14); // tilts right
    expect(res.rx).toBeCloseTo(-14); // tilts down
    expect(res.px).toBeCloseTo(100);
    expect(res.py).toBeCloseTo(100);
  });

  it('calculates negative rotation Y and positive rotation X at top-left corner', () => {
    // Top-left corner (100, 100) -> normX = -1, normY = -1
    const res = calculateBalatroTilt(100, 100, rect, 14);

    expect(res.ry).toBeCloseTo(-14); // tilts left
    expect(res.rx).toBeCloseTo(14); // tilts up
    expect(res.px).toBeCloseTo(0);
    expect(res.py).toBeCloseTo(0);
  });

  it('clamps coordinates strictly within normalized [-maxTilt, +maxTilt] bounds when cursor overshoots', () => {
    // Cursor far outside (1000, -500)
    const res = calculateBalatroTilt(1000, -500, rect, 14);

    expect(res.ry).toBe(14);
    expect(res.rx).toBe(14);
    expect(res.px).toBe(100);
    expect(res.py).toBe(0);
  });

  it('safely handles zero width or height rect', () => {
    const res = calculateBalatroTilt(150, 150, { left: 0, top: 0, width: 0, height: 0 }, 14);
    expect(res.rx).toBe(0);
    expect(res.ry).toBe(0);
    expect(res.px).toBe(50);
    expect(res.py).toBe(50);
  });
});
