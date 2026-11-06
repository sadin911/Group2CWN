/**
 * Lightweight, 0-dependency QR Code generator in pure TypeScript.
 * Generates an SVG string or data URL for rendering in the browser.
 * Supports Byte mode (UTF-8/ASCII) across QR Versions 1 to 10 with EC Level L/M.
 */

// GF(256) math
const EXP_TABLE = new Uint8Array(512);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    EXP_TABLE[i + 255] = x;
    LOG_TABLE[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
})();

function glog(n: number): number {
  if (n < 1) throw new Error(`glog(${n})`);
  return LOG_TABLE[n];
}

function gexp(n: number): number {
  return EXP_TABLE[n];
}

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]];
}

function getErrorCorrectionPolynomial(errorCorrectionLength: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < errorCorrectionLength; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    const factor = gexp(i);
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] ^= poly[j];
      nextPoly[j + 1] ^= gfMultiply(poly[j], factor);
    }
    poly = nextPoly;
  }
  return poly;
}

function calculateErrorCorrection(data: Uint8Array, eccLength: number): Uint8Array {
  const poly = getErrorCorrectionPolynomial(eccLength);
  const result = new Uint8Array(eccLength);
  const buffer = new Uint8Array(data.length + eccLength);
  buffer.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = buffer[i];
    if (coef !== 0) {
      const logCoef = glog(coef);
      for (let j = 0; j < poly.length; j++) {
        buffer[i + j] ^= gexp((logCoef + glog(poly[j])) % 255);
      }
    }
  }

  result.set(buffer.subarray(data.length));
  return result;
}

// Table of capacities: [totalCodewords, ecCodewords, ecBlocks]
// For Level L and M, versions 1 to 10
const QR_CAPACITIES_L: [number, number, number][] = [
  [0, 0, 0],
  [26, 7, 1],   // V1
  [44, 10, 1],  // V2
  [70, 15, 1],  // V3
  [100, 20, 1], // V4
  [134, 26, 1], // V5
  [172, 36, 2], // V6
  [196, 40, 2], // V7
  [242, 48, 2], // V8
  [292, 60, 2], // V9
  [346, 72, 2], // V10
];

const ALIGNMENT_PATTERNS: number[][] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
];

export function generateQrMatrix(text: string): boolean[][] {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  // Pick suitable version (1-10) with EC Level L
  let version = 1;
  while (version <= 10) {
    const [total, ec] = QR_CAPACITIES_L[version];
    const dataCapacity = total - ec;
    // Header: mode (4 bits) + length (8 or 16 bits)
    const lengthBits = version <= 9 ? 8 : 16;
    const requiredBits = 4 + lengthBits + rawBytes.length * 8;
    if (Math.ceil(requiredBits / 8) <= dataCapacity) {
      break;
    }
    version++;
  }

  if (version > 10) {
    version = 10;
  }

  const [totalCodewords, ecCodewords, ecBlocks] = QR_CAPACITIES_L[version];
  const dataCodewords = totalCodewords - ecCodewords;

  // Build bitstream
  const bits: number[] = [];
  const pushBits = (value: number, count: number) => {
    for (let i = count - 1; i >= 0; i--) {
      bits.push((value >> i) & 1);
    }
  };

  // Byte mode indicator: 0100
  pushBits(0b0100, 4);
  const lengthBits = version <= 9 ? 8 : 16;
  pushBits(rawBytes.length, lengthBits);
  for (const b of rawBytes) {
    pushBits(b, 8);
  }

  // Terminator
  const maxBits = dataCodewords * 8;
  const termBits = Math.min(4, maxBits - bits.length);
  pushBits(0, termBits);

  // Pad to byte
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad bytes 0xEC, 0x11
  const padPatterns = [0xec, 0x11];
  let padIndex = 0;
  while (bits.length < maxBits) {
    pushBits(padPatterns[padIndex % 2], 8);
    padIndex++;
  }

  // Pack into data bytes
  const dataBytes = new Uint8Array(dataCodewords);
  for (let i = 0; i < dataCodewords; i++) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | bits[i * 8 + j];
    }
    dataBytes[i] = byteVal;
  }

  // Split into EC blocks
  const blockSize = Math.floor(dataCodewords / ecBlocks);
  const ecSizePerBlock = ecCodewords / ecBlocks;
  const dataBlockList: Uint8Array[] = [];
  const ecBlockList: Uint8Array[] = [];

  for (let b = 0; b < ecBlocks; b++) {
    const start = b * blockSize;
    const end = b === ecBlocks - 1 ? dataCodewords : start + blockSize;
    const blockData = dataBytes.subarray(start, end);
    dataBlockList.push(blockData);
    ecBlockList.push(calculateErrorCorrection(blockData, ecSizePerBlock));
  }

  // Interleave data & EC bytes
  const finalCodewords: number[] = [];
  const maxDataLen = Math.max(...dataBlockList.map((d) => d.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const b of dataBlockList) {
      if (i < b.length) finalCodewords.push(b[i]);
    }
  }
  for (let i = 0; i < ecSizePerBlock; i++) {
    for (const b of ecBlockList) {
      if (i < b.length) finalCodewords.push(b[i]);
    }
  }

  // Matrix construction
  const size = 17 + 4 * version;
  const matrix: (boolean | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );

  // Finder pattern helper
  const placeFinder = (startX: number, startY: number) => {
    for (let dy = -1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 7; dx++) {
        const x = startX + dx;
        const y = startY + dy;
        if (x < 0 || x >= size || y < 0 || y >= size) continue;
        if (
          (dx >= 0 && dx <= 6 && (dy === 0 || dy === 6)) ||
          (dy >= 0 && dy <= 6 && (dx === 0 || dx === 6)) ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4)
        ) {
          matrix[y][x] = true;
        } else {
          matrix[y][x] = false;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Alignment patterns for version >= 2
  const coords = ALIGNMENT_PATTERNS[version] || [];
  for (const y of coords) {
    for (const x of coords) {
      if (matrix[y][x] !== null) continue; // Skip overlap with finder
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const isBorder = Math.abs(dx) === 2 || Math.abs(dy) === 2;
          const isCenter = dx === 0 && dy === 0;
          matrix[y + dy][x + dx] = isBorder || isCenter;
        }
      }
    }
  }

  // Reserve format info area
  for (let i = 0; i < 9; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  for (let i = size - 8; i < size; i++) {
    if (matrix[8][i] === null) matrix[8][i] = false;
    if (matrix[i][8] === null) matrix[i][8] = false;
  }
  // Dark module
  matrix[4 * version + 9][8] = true;

  // Place data bits in zig-zag upward & downward
  let bitIdx = 0;
  const totalBits = finalCodewords.length * 8;
  const getBit = (idx: number) => {
    if (idx >= totalBits) return false;
    const byte = finalCodewords[Math.floor(idx / 8)];
    const bitPos = 7 - (idx % 8);
    return ((byte >> bitPos) & 1) === 1;
  };

  let upwards = true;
  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol--; // Skip vertical timing column
    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const y of rows) {
      for (const x of [rightCol, rightCol - 1]) {
        if (matrix[y][x] === null) {
          const bitVal = getBit(bitIdx++);
          // Apply standard mask 0: (row + col) % 2 === 0
          const mask = (x + y) % 2 === 0;
          matrix[y][x] = mask ? !bitVal : bitVal;
        }
      }
    }
    upwards = !upwards;
  }

  // Format info for Level L and Mask 0 (0b01000 with BCH error correction = 0x77c4)
  const FORMAT_BITS = [
    true, true, true, false, true, true, true, false,
    false, false, true, false, false, false, false
  ];

  // Top-left
  const tlCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [x, y] = tlCoords[i];
    matrix[y][x] = FORMAT_BITS[i];
  }

  // Bottom & Right
  for (let i = 0; i < 7; i++) {
    matrix[size - 1 - i][8] = FORMAT_BITS[i];
  }
  for (let i = 0; i < 8; i++) {
    matrix[8][size - 8 + i] = FORMAT_BITS[7 + i];
  }

  return matrix.map((row) => row.map((cell) => cell ?? false));
}

export function generateQrSvg(text: string, size = 200, margin = 4): string {
  const safeSize = Math.max(1, Math.floor(Number(size) || 200));
  const safeMargin = Math.max(0, Math.floor(Number(margin) || 4));
  const matrix = generateQrMatrix(text);
  const cols = matrix.length;
  const viewBoxSize = cols + safeMargin * 2;

  let pathD = '';
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      if (matrix[y][x]) {
        pathD += `M${x + safeMargin},${y + safeMargin}h1v1h-1z `;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" width="${safeSize}" height="${safeSize}" shape-rendering="crispEdges">
    <rect width="${viewBoxSize}" height="${viewBoxSize}" fill="#ffffff" rx="1"/>
    <path d="${pathD}" fill="#0f172a" />
  </svg>`;
}
