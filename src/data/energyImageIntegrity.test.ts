import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pokemonCards from './pokemonNames.json';
import { CardTemplates } from '../engine/data/StandardCardCatalog';

describe('Energy Card Image Integrity', () => {
  it('verifies TH-5207 (Water Energy in SVAW) has water image and official URL', async () => {
    const card = pokemonCards.find((c) => c.id === 'TH-5207');
    expect(card).toBeDefined();
    expect(card?.name).toBe('พลังงานพื้นฐาน[น้ำ]');
    expect(card?.officialImageUrl).toBe('https://asia.pokemon-card.com/th/card-img/th00005208.png');

    const relPath = decodeURIComponent((card?.imageUrl || '').replace(/^\/PokeCountTracker/, ''));
    const fullPath = path.join(process.cwd(), 'public', relPath);
    expect(fs.existsSync(fullPath)).toBe(true);

    const { data, info } = await sharp(fullPath).resize(20, 20).raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0;
    const count = data.length / info.channels;
    for (let i = 0; i < data.length; i += info.channels) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Water Energy must be blue: B > R + 30 and B > G
    expect(b).toBeGreaterThan(r + 30);
    expect(b).toBeGreaterThan(g);
  });

  it('verifies TH-5208 (Psychic Energy in SVAW) has psychic image and official URL', async () => {
    const card = pokemonCards.find((c) => c.id === 'TH-5208');
    expect(card).toBeDefined();
    expect(card?.name).toBe('พลังงานพื้นฐาน[พลังจิต]');
    expect(card?.officialImageUrl).toBe('https://asia.pokemon-card.com/th/card-img/th00005207.png');

    const relPath = decodeURIComponent((card?.imageUrl || '').replace(/^\/PokeCountTracker/, ''));
    const fullPath = path.join(process.cwd(), 'public', relPath);
    expect(fs.existsSync(fullPath)).toBe(true);

    const { data, info } = await sharp(fullPath).resize(20, 20).raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0;
    const count = data.length / info.channels;
    for (let i = 0; i < data.length; i += info.channels) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Psychic Energy must be purple: R > 140, B > 140, G < R - 20
    expect(r).toBeGreaterThan(140);
    expect(b).toBeGreaterThan(140);
    expect(g).toBeLessThan(r - 20);
  });

  it('verifies TH-5182 (Grass Energy in SVAM) has grass image and official URL', async () => {
    const card = pokemonCards.find((c) => c.id === 'TH-5182');
    expect(card).toBeDefined();
    expect(card?.name).toBe('พลังงานพื้นฐาน[หญ้า]');
    expect(card?.officialImageUrl).toBe('https://asia.pokemon-card.com/th/card-img/th00005183.png');

    const relPath = decodeURIComponent((card?.imageUrl || '').replace(/^\/PokeCountTracker/, ''));
    const fullPath = path.join(process.cwd(), 'public', relPath);
    expect(fs.existsSync(fullPath)).toBe(true);

    const { data, info } = await sharp(fullPath).resize(20, 20).raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0;
    const count = data.length / info.channels;
    for (let i = 0; i < data.length; i += info.channels) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Grass Energy must be green: G > R + 20 and G > B + 20
    expect(g).toBeGreaterThan(r + 20);
    expect(g).toBeGreaterThan(b + 20);
  });

  it('verifies TH-5183 (Fighting Energy in SVAM) has fighting image and official URL', async () => {
    const card = pokemonCards.find((c) => c.id === 'TH-5183');
    expect(card).toBeDefined();
    expect(card?.name).toBe('พลังงานพื้นฐาน[ต่อสู้]');
    expect(card?.officialImageUrl).toBe('https://asia.pokemon-card.com/th/card-img/th00005182.png');

    const relPath = decodeURIComponent((card?.imageUrl || '').replace(/^\/PokeCountTracker/, ''));
    const fullPath = path.join(process.cwd(), 'public', relPath);
    expect(fs.existsSync(fullPath)).toBe(true);

    const { data, info } = await sharp(fullPath).resize(20, 20).raw().toBuffer({ resolveWithObject: true });
    let r = 0, g = 0, b = 0;
    const count = data.length / info.channels;
    for (let i = 0; i < data.length; i += info.channels) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);

    // Fighting Energy must be brown/orange: R > 160, G > 90, B < 80
    expect(r).toBeGreaterThan(160);
    expect(g).toBeGreaterThan(90);
    expect(b).toBeLessThan(80);
  });

  it('verifies StandardCardCatalog basic energies have valid local files on disk', () => {
    const energies = [
      CardTemplates.BasicFireEnergy,
      CardTemplates.BasicLightningEnergy,
      CardTemplates.BasicDarknessEnergy,
      CardTemplates.BasicWaterEnergy,
      CardTemplates.BasicGrassEnergy,
      CardTemplates.BasicPsychicEnergy,
    ];

    for (const energy of energies) {
      expect(energy.imageUrl).toBeDefined();
      const localPath = path.join(process.cwd(), 'public', energy.imageUrl || '');
      expect(fs.existsSync(localPath)).toBe(true);
    }
  });
});
