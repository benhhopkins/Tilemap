import type { Spritesheet, Texture } from 'pixi.js';
import type { TerrainId } from './types';

/**
 * Maps a terrain id onto the texture that represents it.
 *
 * Keeping this behind an interface is what lets a different project reuse
 * {@link TilemapView} with its own artwork, its own frame-naming convention or
 * even procedurally generated textures — without touching the view.
 */
export interface TerrainAtlas {
  /** Edge length of one tile, in texture pixels. */
  readonly tileSize: number;
  /** Texture for a terrain id. Implementations must always return a texture. */
  getTexture(terrain: TerrainId): Texture;
}

export interface SpritesheetTerrainAtlasOptions {
  /** Edge length of one tile, in texture pixels. */
  tileSize: number;
  /**
   * Translates a terrain id into a spritesheet frame name.
   * Defaults to `String(terrain)`, matching `tiles.json`.
   */
  frameFor?: (terrain: TerrainId) => string;
  /** Terrain used when a frame is missing. Defaults to `0`. */
  fallbackTerrain?: TerrainId;
  /**
   * Switches every texture in the sheet to nearest-neighbour sampling, so
   * zoomed-in pixel art stays crisp instead of blurring. Defaults to `true`.
   */
  pixelArt?: boolean;
}

/** A {@link TerrainAtlas} backed by a PixiJS {@link Spritesheet}. */
export class SpritesheetTerrainAtlas implements TerrainAtlas {
  readonly tileSize: number;

  readonly #textures: Record<string, Texture>;
  readonly #frameFor: (terrain: TerrainId) => string;
  readonly #fallback: Texture;

  constructor(sheet: Spritesheet, options: SpritesheetTerrainAtlasOptions) {
    const {
      tileSize,
      frameFor = (terrain) => String(terrain),
      fallbackTerrain = 0,
      pixelArt = true,
    } = options;

    this.tileSize = tileSize;
    this.#textures = sheet.textures as Record<string, Texture>;
    this.#frameFor = frameFor;

    if (pixelArt) {
      setPixelArtFiltering(Object.values(this.#textures));
    }

    const fallback = this.#textures[frameFor(fallbackTerrain)];

    if (!fallback) {
      throw new Error(
        `Spritesheet has no frame "${frameFor(fallbackTerrain)}" to use as the fallback terrain. ` +
          `Available frames: ${Object.keys(this.#textures).join(', ')}`,
      );
    }

    this.#fallback = fallback;
  }

  getTexture(terrain: TerrainId): Texture {
    return this.#textures[this.#frameFor(terrain)] ?? this.#fallback;
  }

  /** Frame names the atlas can resolve. Handy for validating a generator's output. */
  get frameNames(): string[] {
    return Object.keys(this.#textures);
  }
}

/**
 * Switches textures to nearest-neighbour sampling.
 *
 * In PixiJS 8 this is a per-texture-source string, replacing v7's global
 * `PIXI.settings.SCALE_MODE` / `SCALE_MODES.NEAREST` enum.
 */
export function setPixelArtFiltering(textures: Iterable<Texture>): void {
  for (const texture of textures) {
    texture.source.scaleMode = 'nearest';
  }
}
