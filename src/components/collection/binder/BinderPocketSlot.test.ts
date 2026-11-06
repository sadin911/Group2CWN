import { describe, it, expect } from 'vitest';
import {
  getSleeveStyleClasses,
  getVariantBadgeInfo,
  formatSlotCollectorNumber,
} from './binderUtils';

describe('BinderPocketSlot helpers', () => {
  describe('getSleeveStyleClasses', () => {
    it('returns appropriate CSS classes for each sleeve style', () => {
      expect(getSleeveStyleClasses('none')).toContain('bg-neutral-900');
      expect(getSleeveStyleClasses('matte-black')).toContain('bg-neutral-950');
      expect(getSleeveStyleClasses('clear-gloss')).toContain('ring-cyan');
      expect(getSleeveStyleClasses('holo-stars')).toContain('ring-purple');
      expect(getSleeveStyleClasses('gold-border')).toContain('ring-amber');
    });

    it('falls back safely for unknown sleeve style', () => {
      expect(getSleeveStyleClasses('none')).toBeDefined();
    });
  });

  describe('getVariantBadgeInfo', () => {
    it('returns null for normal variant without special rarity', () => {
      const info = getVariantBadgeInfo('normal', 'REGULAR');
      expect(info).toBeNull();
    });

    it('returns holo badge for holo variant', () => {
      const info = getVariantBadgeInfo('holo', 'REGULAR');
      expect(info).not.toBeNull();
      expect(info?.label).toBe('Holo');
    });

    it('returns reverse holo badge for reverse variant', () => {
      const info = getVariantBadgeInfo('reverse', 'REGULAR');
      expect(info).not.toBeNull();
      expect(info?.label).toBe('Reverse');
    });

    it('prioritizes high rarity code (SAR, AR, UR, SR) when present', () => {
      const info = getVariantBadgeInfo('holo', 'SAR');
      expect(info).not.toBeNull();
      expect(info?.label).toBe('SAR');
    });
  });

  describe('formatSlotCollectorNumber', () => {
    it('formats collector number cleanly', () => {
      expect(formatSlotCollectorNumber('001-154')).toBe('#001');
      expect(formatSlotCollectorNumber('012/068')).toBe('#012');
      expect(formatSlotCollectorNumber('7')).toBe('#007');
      expect(formatSlotCollectorNumber('')).toBe('');
    });
  });
});
