import { Container, Graphics } from 'pixi.js';

export interface DropZoneInfo {
  id: string;
  label: string;
  side: 'player1' | 'player2' | 'center';
  type: 'ACTIVE' | 'BENCH' | 'DISCARD' | 'LOST_ZONE' | 'DECK' | 'STADIUM' | 'HAND';
  index?: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class PixiBoardViewport extends Container {
  public readonly virtualWidth = 1440;
  public readonly virtualHeight = 900;

  // Visual layers
  private matBackground: Graphics;
  private zoneOutlines: Graphics;
  private highlightGfx: Graphics;
  public zonesContainer: Container;
  public cardsContainer: Container;
  public overlayContainer: Container;

  // Registered Drop Zones
  public dropZones: DropZoneInfo[] = [];

  // Zone click callback (when empty slot or board zone is clicked)
  public onZoneClick?: (zone: DropZoneInfo) => void;

  constructor() {
    super();

    // Layer 0: Mat Background
    this.matBackground = new Graphics();
    this.addChild(this.matBackground);

    // Layer 1: Zone outlines & labels
    this.zoneOutlines = new Graphics();
    this.addChild(this.zoneOutlines);

    // Layer 2: Drop zones highlight
    this.highlightGfx = new Graphics();
    this.addChild(this.highlightGfx);

    // Layer 3: Interactive slot containers
    this.zonesContainer = new Container();
    this.addChild(this.zonesContainer);

    // Layer 4: Board cards
    this.cardsContainer = new Container();
    this.addChild(this.cardsContainer);

    // Layer 5: Overlays & floating drag items
    this.overlayContainer = new Container();
    this.addChild(this.overlayContainer);

    this.setupZones();
    this.drawNeopreneMat();
    this.drawZoneOutlines();
    this.setupInteractiveZones();
  }

  private setupInteractiveZones() {
    this.zonesContainer.removeChildren();

    for (const zone of this.dropZones) {
      const hitBox = new Graphics();
      hitBox
        .roundRect(
          zone.x - zone.width / 2,
          zone.y - zone.height / 2,
          zone.width,
          zone.height,
          8
        )
        .fill({ color: 0xffffff, alpha: 0.001 });

      hitBox.eventMode = 'static';
      hitBox.cursor = 'pointer';
      hitBox.on('pointerdown', (e) => {
        e.stopPropagation();
        this.onZoneClick?.(zone);
      });

      this.zonesContainer.addChild(hitBox);
    }
  }

  private setupZones() {
    this.dropZones = [];

    // --- PLAYER 1 (BOTTOM) ---
    // Active Slot
    this.dropZones.push({
      id: 'p1_active',
      label: 'ตำแหน่งต่อสู้ (Active)',
      side: 'player1',
      type: 'ACTIVE',
      x: 720,
      y: 540,
      width: 114,
      height: 158,
    });

    // Bench Slots (0..4)
    const benchSpacing = 136;
    const benchStartX = 720 - (benchSpacing * 2);
    for (let i = 0; i < 5; i++) {
      this.dropZones.push({
        id: `p1_bench_${i}`,
        label: `ม้านั่ง ${i + 1}`,
        side: 'player1',
        type: 'BENCH',
        index: i,
        x: benchStartX + i * benchSpacing,
        y: 710,
        width: 104,
        height: 144,
      });
    }

    // Deck & Discard & Lost Zone (Right)
    this.dropZones.push({
      id: 'p1_deck',
      label: 'สำรับ (Deck)',
      side: 'player1',
      type: 'DECK',
      x: 1310,
      y: 710,
      width: 104,
      height: 144,
    });

    this.dropZones.push({
      id: 'p1_discard',
      label: 'ตำแหน่งทิ้งการ์ด',
      side: 'player1',
      type: 'DISCARD',
      x: 1310,
      y: 540,
      width: 104,
      height: 144,
    });

    this.dropZones.push({
      id: 'p1_lost_zone',
      label: 'ลอสท์โซน',
      side: 'player1',
      type: 'LOST_ZONE',
      x: 1310,
      y: 380,
      width: 104,
      height: 144,
    });

    // Prizes (Left: 2 columns x 3 rows)
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 2; col++) {
        const prizeIdx = row * 2 + col;
        this.dropZones.push({
          id: `p1_prize_${prizeIdx}`,
          label: `รางวัล ${prizeIdx + 1}`,
          side: 'player1',
          type: 'BENCH', // prize zone container
          index: prizeIdx,
          x: 100 + col * 108,
          y: 490 + row * 110,
          width: 96,
          height: 134,
        });
      }
    }

    // --- CENTER BOARD ---
    this.dropZones.push({
      id: 'stadium',
      label: 'การ์ดสเตเดียม',
      side: 'center',
      type: 'STADIUM',
      x: 380,
      y: 450,
      width: 114,
      height: 158,
    });

    // --- PLAYER 2 (TOP / OPPONENT) ---
    this.dropZones.push({
      id: 'p2_active',
      label: 'Active คู่แข่ง',
      side: 'player2',
      type: 'ACTIVE',
      x: 720,
      y: 360,
      width: 114,
      height: 158,
    });

    for (let i = 0; i < 5; i++) {
      this.dropZones.push({
        id: `p2_bench_${i}`,
        label: `ม้านั่งคู่แข่ง ${i + 1}`,
        side: 'player2',
        type: 'BENCH',
        index: i,
        x: benchStartX + i * benchSpacing,
        y: 190,
        width: 104,
        height: 144,
      });
    }

    this.dropZones.push({
      id: 'p2_deck',
      label: 'สำรับคู่แข่ง',
      side: 'player2',
      type: 'DECK',
      x: 1310,
      y: 190,
      width: 104,
      height: 144,
    });

    this.dropZones.push({
      id: 'p2_discard',
      label: 'การ์ดทิ้งคู่แข่ง',
      side: 'player2',
      type: 'DISCARD',
      x: 1310,
      y: 360,
      width: 104,
      height: 144,
    });
  }

  private drawNeopreneMat() {
    this.matBackground.clear();

    // 1. Base Dark Slate Neoprene Tabletop
    this.matBackground
      .roundRect(16, 16, this.virtualWidth - 32, this.virtualHeight - 32, 24)
      .fill({ color: 0x090d16 })
      .stroke({ width: 3, color: 0x1e293b });

    // 2. Subtle Stitched Border
    this.matBackground
      .roundRect(26, 26, this.virtualWidth - 52, this.virtualHeight - 52, 18)
      .stroke({ width: 1.5, color: 0x334155, alpha: 0.6 });

    // 3. Center Horizontal Division Line
    this.matBackground
      .moveTo(50, 450)
      .lineTo(this.virtualWidth - 50, 450)
      .stroke({ width: 2, color: 0x1e293b, alpha: 0.8 });

    // 4. Center Logo / Pokéball Watermark on Mat
    const cx = 720;
    const cy = 450;
    this.matBackground
      .circle(cx, cy, 120)
      .stroke({ width: 1.5, color: 0x1e293b, alpha: 0.4 });
  }

  private drawZoneOutlines() {
    this.zoneOutlines.clear();

    for (const zone of this.dropZones) {
      const isP1 = zone.side === 'player1';
      const isCenter = zone.side === 'center';
      const slotColor = isCenter ? 0x065f46 : (isP1 ? 0x1e293b : 0x1e1b4b);
      const strokeColor = isCenter ? 0x10b981 : (isP1 ? 0x38bdf8 : 0x818cf8);

      // Card slot outline
      this.zoneOutlines
        .roundRect(
          zone.x - zone.width / 2,
          zone.y - zone.height / 2,
          zone.width,
          zone.height,
          8
        )
        .fill({ color: slotColor, alpha: 0.35 })
        .stroke({ width: 1.5, color: strokeColor, alpha: 0.45 });
    }
  }

  public highlightZone(zoneId: string | null, color = 0x34d399) {
    this.highlightGfx.clear();
    if (!zoneId) return;

    const zone = this.dropZones.find((z) => z.id === zoneId);
    if (!zone) return;

    this.highlightGfx
      .roundRect(
        zone.x - zone.width / 2 - 4,
        zone.y - zone.height / 2 - 4,
        zone.width + 8,
        zone.height + 8,
        10
      )
      .fill({ color, alpha: 0.22 })
      .stroke({ width: 3, color, alpha: 0.95 });
  }

  public findDropZone(worldX: number, worldY: number): DropZoneInfo | null {
    for (const zone of this.dropZones) {
      const minX = zone.x - zone.width / 2;
      const maxX = zone.x + zone.width / 2;
      const minY = zone.y - zone.height / 2;
      const maxY = zone.y + zone.height / 2;

      if (worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY) {
        return zone;
      }
    }
    return null;
  }

  public resize(screenWidth: number, screenHeight: number) {
    // Maintain 16:10 / 16:9 aspect ratio and center on screen
    const scale = Math.min(
      (screenWidth - 16) / this.virtualWidth,
      (screenHeight - 80) / this.virtualHeight
    );

    this.scale.set(scale);
    this.x = (screenWidth - this.virtualWidth * scale) / 2;
    this.y = (screenHeight - this.virtualHeight * scale) / 2 + 10;
  }
}
