import { describe, it, expect } from 'vitest';
import { generateQrMatrix, generateQrSvg } from './qrCode';

describe('qrCode utility', () => {
  it('generates a valid square matrix for standard text', () => {
    const matrix = generateQrMatrix('https://pokecount.app/?playmat=PK-1234&role=p1');
    expect(matrix.length).toBeGreaterThan(20);
    expect(matrix[0].length).toBe(matrix.length);
  });

  it('generates an SVG string containing path and rect tags', () => {
    const svg = generateQrSvg('https://pokecount.app/?playmat=PK-1234&role=p2&pin=9999', 240);
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="240"');
    expect(svg).toContain('<path');
    expect(svg).toContain('</svg>');
  });
});
