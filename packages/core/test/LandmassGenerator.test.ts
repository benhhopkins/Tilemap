import { describe, expect, it } from 'vitest';
import { LandmassGenerator } from '../src/generators/LandmassGenerator';
import { TilemapModel } from '../src/TilemapModel';
import { mulberry32 } from '../src/rng';

function generate(seed: number, width = 32, height = 24) {
  const model = new TilemapModel({ width, height });
  const result = new LandmassGenerator().generate(model, mulberry32(seed));
  return { model, result };
}

describe('LandmassGenerator', () => {
  it('produces the same map for the same seed', () => {
    const a = generate(1234);
    const b = generate(1234);

    expect(b.model.toJSON().cells).toEqual(a.model.toJSON().cells);
    expect(b.result.startLocation).toEqual(a.result.startLocation);
  });

  it('produces different maps for different seeds', () => {
    const a = generate(1);
    const b = generate(2);

    expect(b.model.toJSON().cells).not.toEqual(a.model.toJSON().cells);
  });

  it('keeps every cell within the configured terrain range', () => {
    const { model } = generate(99);
    const startTerrain = 5;

    model.forEach((_x, _y, terrain) => {
      expect(terrain === startTerrain || (terrain >= 0 && terrain <= 4)).toBe(true);
    });
  });

  it('writes the start terrain at the reported start location', () => {
    const { model, result } = generate(7);

    expect(result.startLocation).not.toBeNull();
    const start = result.startLocation!;
    expect(model.get(start.x, start.y)).toBe(5);
  });

  it('grows some land rather than leaving an empty ocean', () => {
    const { model } = generate(42);

    expect(model.findTiles(0).length).toBeLessThan(model.size);
  });

  it('reports a null start location instead of looping forever when none can be placed', () => {
    // No land is grown, so no tile ever reaches the `startOnTerrain` value.
    // The 2022 code spun in `while (!found)` here and froze the tab.
    const model = new TilemapModel({ width: 8, height: 8 });
    const generator = new LandmassGenerator({ landmassCount: 0, seedsPerLandmass: 0 });

    const result = generator.generate(model, mulberry32(5));

    expect(result.startLocation).toBeNull();
    expect(model.findTiles(0).length).toBe(model.size);
  });

  it('honours custom terrain ids', () => {
    const model = new TilemapModel({ width: 24, height: 24 });
    const generator = new LandmassGenerator({
      maxLandTerrain: 3,
      startOnTerrain: 2,
      startTerrain: 20,
    });

    const result = generator.generate(model, mulberry32(3));

    model.forEach((_x, _y, terrain) => {
      expect(terrain === 20 || (terrain >= 0 && terrain <= 3)).toBe(true);
    });

    expect(result.startLocation).not.toBeNull();
    const start = result.startLocation!;
    expect(model.get(start.x, start.y)).toBe(20);
  });

  it('caps seed size so growth cannot explode factorially', () => {
    const model = new TilemapModel({ width: 16, height: 16 });
    const generator = new LandmassGenerator({
      landmassCount: 1,
      seedsPerLandmass: 40,
      maxSeedSize: 4,
    });

    const started = Date.now();
    generator.generate(model, mulberry32(11));

    expect(Date.now() - started).toBeLessThan(2000);
  });
});
