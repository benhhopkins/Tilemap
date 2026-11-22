import { Graphics } from 'pixi.js';
import type { ColorSource } from 'pixi.js';
import type { TileCoord } from './types';

export interface TileHighlightOptions {
  /** Edge length of one tile, in local (unscaled) pixels. */
  tileSize: number;
  /** Outline colour. Defaults to white. */
  color?: ColorSource;
  /** Outline thickness in local pixels. Defaults to `1`. */
  width?: number;
  /** Shrinks the outline inside the tile, in local pixels. Defaults to `0`. */
  inset?: number;
  /** Optional fill drawn under the outline. */
  fill?: ColorSource;
  /** Opacity of the optional fill. Defaults to `0`. */
  fillAlpha?: number;
}

/**
 * A one-tile outline that is drawn once and then merely repositioned.
 *
 * The 2022 code cleared and re-tessellated its highlight `Graphics` on every
 * single `mousemove`. Here the geometry is built in the constructor and every
 * later update is a position assignment, which costs nothing.
 */
export class TileHighlight extends Graphics {
  readonly #tileSize: number;

  constructor(options: TileHighlightOptions) {
    super({ label: 'TileHighlight' });

    const { tileSize, color = 0xffffff, width = 1, inset = 0, fill, fillAlpha = 0 } = options;

    this.#tileSize = tileSize;

    const size = tileSize - inset * 2;
    this.rect(inset, inset, size, size);

    if (fill !== undefined && fillAlpha > 0) {
      this.fill({ color: fill, alpha: fillAlpha });
      this.rect(inset, inset, size, size);
    }

    this.stroke({ width, color, alignment: 0.5 });
    this.visible = false;
  }

  /** Moves the outline onto a tile, or hides it when given `null`. */
  showAt(tile: TileCoord | null): void {
    if (!tile) {
      this.visible = false;
      return;
    }

    this.visible = true;
    this.position.set(tile.x * this.#tileSize, tile.y * this.#tileSize);
  }
}
