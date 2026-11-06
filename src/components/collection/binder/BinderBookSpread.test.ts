import { describe, it, expect } from 'vitest';
import {
  getCoverThemeStyles,
  getPocketGridClass,
  getPageSpreadIndices,
  calculateFlipParams,
} from './binderUtils';

describe('BinderBookSpread helpers in binderUtils', () => {
  describe('getCoverThemeStyles', () => {
    it('returns valid styles for black-leather', () => {
      const style = getCoverThemeStyles('black-leather');
      expect(style.coverClass).toContain('via-neutral-950');
      expect(style.ringColor).toBe('silver');
    });

    it('returns gold rings for brown-leather and burgundy-leather', () => {
      expect(getCoverThemeStyles('brown-leather').ringColor).toBe('gold');
      expect(getCoverThemeStyles('burgundy-leather').ringColor).toBe('gold');
    });

    it('returns pokeball styling with accent border', () => {
      const style = getCoverThemeStyles('pokeball');
      expect(style.accentClass).toBeDefined();
      expect(style.ringColor).toBe('silver');
    });
  });

  describe('getPocketGridClass', () => {
    it('returns 2-column, 2-row grid for 4-pocket layout', () => {
      const cls = getPocketGridClass(4);
      expect(cls).toContain('grid-cols-2');
      expect(cls).toContain('grid-rows-2');
    });

    it('returns 3-column, 3-row grid for 9-pocket layout', () => {
      const cls = getPocketGridClass(9);
      expect(cls).toContain('grid-cols-3');
      expect(cls).toContain('grid-rows-3');
    });

    it('returns 3-column, 4-row grid for 12-pocket portrait layout by default', () => {
      const cls = getPocketGridClass(12);
      expect(cls).toContain('grid-cols-3');
      expect(cls).toContain('grid-rows-4');
    });

    it('returns 4-column, 3-row grid when explicitly specified for 12-pocket landscape', () => {
      const cls = getPocketGridClass(12, 4, 3);
      expect(cls).toContain('grid-cols-4');
      expect(cls).toContain('grid-rows-3');
    });

    it('returns 4-column, 4-row grid for 16-pocket layout', () => {
      const cls = getPocketGridClass(16);
      expect(cls).toContain('grid-cols-4');
      expect(cls).toContain('grid-rows-4');
    });
  });

  describe('getPageSpreadIndices', () => {
    it('returns paired pages for 2-page desktop spread', () => {
      // 0 -> left: 0 (page 1), right: 1 (page 2)
      const spread0 = getPageSpreadIndices(0, 10, true);
      expect(spread0.leftIndex).toBe(0);
      expect(spread0.rightIndex).toBe(1);

      // 2 -> left: 2 (page 3), right: 3 (page 4)
      const spread2 = getPageSpreadIndices(2, 10, true);
      expect(spread2.leftIndex).toBe(2);
      expect(spread2.rightIndex).toBe(3);

      // If total pages is odd (e.g. 5) and on page 4 (5th page): rightIndex should be null
      const spreadLast = getPageSpreadIndices(4, 5, true);
      expect(spreadLast.leftIndex).toBe(4);
      expect(spreadLast.rightIndex).toBeNull();
    });

    it('returns single page for mobile view', () => {
      const mobile0 = getPageSpreadIndices(0, 10, false);
      expect(mobile0.leftIndex).toBe(0);
      expect(mobile0.rightIndex).toBeNull();

      const mobile1 = getPageSpreadIndices(1, 10, false);
      expect(mobile1.leftIndex).toBe(1);
      expect(mobile1.rightIndex).toBeNull();
    });
  });

  describe('calculateFlipParams', () => {
    it('returns left-anchored -180deg rotation for next page on desktop', () => {
      const params = calculateFlipParams('next', true);
      expect(params.transformOrigin).toBe('left center');
      expect(params.rotateYStart).toBe(0);
      expect(params.rotateYEnd).toBe(-180);
      expect(params.turnSide).toBe('right');
    });

    it('returns right-anchored +180deg rotation for prev page on desktop', () => {
      const params = calculateFlipParams('prev', true);
      expect(params.transformOrigin).toBe('right center');
      expect(params.rotateYStart).toBe(0);
      expect(params.rotateYEnd).toBe(180);
      expect(params.turnSide).toBe('left');
    });

    it('returns appropriate parameters for mobile swipe flip', () => {
      const nextMobile = calculateFlipParams('next', false);
      expect(nextMobile.rotateYEnd).toBe(-180);

      const prevMobile = calculateFlipParams('prev', false);
      expect(prevMobile.rotateYStart).toBe(-180);
      expect(prevMobile.rotateYEnd).toBe(0);
    });
  });
});
