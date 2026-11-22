import type { TilemapModel } from '../TilemapModel';
import { randomInt, type Rng } from '../rng';
import type { TerrainId } from '../types';
import type { GenerationResult, MapGenerator } from './MapGenerator';

export interface LandmassGeneratorOptions {
  /**
   * Terrain the map is flooded with before land is grown. Defaults to `0`.
   *
   * This algorithm treats terrain ids as an elevation ladder and only raises a
   * cell whose current terrain is *lower* than the incoming seed size, so
   * `oceanTerrain` must be the lowest id in use. Give a tileset with a
   * different numbering its own {@link MapGenerator} rather than remapping ids
   * here.
   */
  oceanTerrain?: TerrainId;
  /** Highest land terrain a cell may be raised to. Defaults to `4`. */
  maxLandTerrain?: TerrainId;
  /** How many landmass clusters to grow. Defaults to `25`. */
  landmassCount?: number;
  /** How many seeds each cluster drops. Defaults to `12`. */
  seedsPerLandmass?: number;
  /** Terrain written at the chosen start location. Defaults to `5`. */
  startTerrain?: TerrainId;
  /** Terrain the start location must be placed on. Defaults to `2`. */
  startOnTerrain?: TerrainId;
  /**
   * Hard ceiling on seed size. Growth is `O(size!)`, so this guard keeps a
   * mis-tuned `seedsPerLandmass` from freezing the tab. Defaults to `8`.
   */
  maxSeedSize?: number;
}

/**
 * Grows blobs of land in an ocean, then marks one grassland tile as the start.
 *
 * Port of the 2022 `Tilemap.generateMap` / `spawnLandmass` pair, with the same
 * terrain arithmetic so maps still look the same, plus three corrections:
 *
 * 1. It writes into a {@link TilemapModel} instead of adding and removing
 *    thousands of sprites while generating.
 * 2. Randomness comes from an injected {@link Rng}, so a map is reproducible.
 * 3. The start location is picked from the list of candidates. The original
 *    retried random coordinates in a `while (!found)` loop that never
 *    terminates when no grassland exists.
 */
export class LandmassGenerator implements MapGenerator {
  readonly #oceanTerrain: TerrainId;
  readonly #maxLandTerrain: TerrainId;
  readonly #landmassCount: number;
  readonly #seedsPerLandmass: number;
  readonly #startTerrain: TerrainId;
  readonly #startOnTerrain: TerrainId;
  readonly #maxSeedSize: number;

  constructor(options: LandmassGeneratorOptions = {}) {
    const {
      oceanTerrain = 0,
      maxLandTerrain = 4,
      landmassCount = 25,
      seedsPerLandmass = 12,
      startTerrain = 5,
      startOnTerrain = 2,
      maxSeedSize = 8,
    } = options;

    this.#oceanTerrain = oceanTerrain;
    this.#maxLandTerrain = maxLandTerrain;
    this.#landmassCount = landmassCount;
    this.#seedsPerLandmass = seedsPerLandmass;
    this.#startTerrain = startTerrain;
    this.#startOnTerrain = startOnTerrain;
    this.#maxSeedSize = maxSeedSize;
  }

  generate(model: TilemapModel, rng: Rng): GenerationResult {
    model.fill(this.#oceanTerrain);

    for (let cluster = 0; cluster < this.#landmassCount; cluster++) {
      for (let seed = 0; seed < this.#seedsPerLandmass; seed++) {
        const size = Math.min(Math.floor(seed / 2) + 1, this.#maxSeedSize);

        this.#grow(model, rng, size, randomInt(rng, model.width), randomInt(rng, model.height));
      }
    }

    return { startLocation: this.#placeStart(model, rng) };
  }

  #grow(model: TilemapModel, rng: Rng, size: number, rawX: number, rawY: number): void {
    if (size <= 0) {
      return;
    }

    const x = clamp(rawX, 0, model.width - 1);
    const y = clamp(rawY, 0, model.height - 1);

    if (model.get(x, y) < size) {
      const raised = Math.min(
        this.#maxLandTerrain,
        Math.max(1, Math.floor(size / (rng.next() + 0.9))),
      );
      model.set(x, y, raised);
    }

    for (let i = 0; i < size; i++) {
      const dx = randomInt(rng, 3) - 1;
      const dy = randomInt(rng, 3) - 1;

      this.#grow(model, rng, size - 1, x + dx, y + dy);
    }
  }

  #placeStart(model: TilemapModel, rng: Rng) {
    const candidates = model.findTiles(this.#startOnTerrain);

    if (candidates.length === 0) {
      return null;
    }

    const chosen = candidates[randomInt(rng, candidates.length)];

    if (!chosen) {
      return null;
    }

    model.set(chosen.x, chosen.y, this.#startTerrain);
    return chosen;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
