import type { TilemapModel } from '../TilemapModel';
import type { Rng } from '../rng';
import type { TileCoord } from '../types';

/** What a generator reports back after filling a model. */
export interface GenerationResult {
  /**
   * Where the player/camera should start, or `null` when the generator could
   * not place one. Callers must handle `null` rather than assume success.
   */
  startLocation: TileCoord | null;
}

/**
 * Fills a {@link TilemapModel} with terrain.
 *
 * Generation is an interface rather than a method on the model, so a project
 * can supply heightmap-based, hand-authored or server-sent maps while reusing
 * everything else in this package.
 */
export interface MapGenerator {
  generate(model: TilemapModel, rng: Rng): GenerationResult;
}
