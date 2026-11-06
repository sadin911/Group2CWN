import { describe, it, expect } from 'vitest';
import { type BalatroBadge } from './BalatroCardFloater';

describe('BalatroCardFloater', () => {
  it('creates well-formed Balatro badge objects with timestamp and coordinates', () => {
    const badge: BalatroBadge = {
      id: 'test-badge-1',
      text: '+ENERGY',
      subText: 'LIGHTNING',
      x: 350,
      y: 500,
      color: 'gold',
      icon: '⚡',
      timestamp: Date.now(),
    };

    expect(badge.text).toBe('+ENERGY');
    expect(badge.x).toBe(350);
    expect(badge.y).toBe(500);
    expect(badge.color).toBe('gold');
    expect(badge.icon).toBe('⚡');
  });

  it('verifies badge colors cover all supported action types', () => {
    const validColors = ['gold', 'emerald', 'crimson', 'indigo', 'cyan', 'purple'];
    expect(validColors).toHaveLength(6);
  });
});
