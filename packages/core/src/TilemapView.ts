import { Container, Sprite } from 'pixi.js';
import type { DestroyOptions, PointData } from 'pixi.js';
import type { TerrainAtlas } from './TerrainAtlas';
import type { TilemapModel } from './TilemapModel';
import type { TerrainId, TileCoord } from './types';

export interface TilemapViewOptions {
  /** The data this view renders. The view subscribes to its changes. */
  model: TilemapModel;
  /** Supplies a texture per terrain id. */
  atlas: TerrainAtlas;
}

/**
 * Renders a {@link TilemapModel} as a grid of sprites.
 *
 * Real `extends Container` inheritance — the 2022 code assigned a single shared
 * `new PIXI.Container()` to `Tilemap.prototype`, so every instance mutated the
 * *same* transform and children array. Subclassing here is safe, and the
 * {@link createTileSprite} hook is the intended extension point for animated
 * tiles, tinting, per-terrain anchors and so on.
 *
 * Tiles live in their own `tileLayer`; anything drawn on top (selection
 * outlines, units, fog) belongs in `overlayLayer`. Keeping them apart is what
 * removes the old index arithmetic, where tile lookup by child index silently
 * depended on the overlay graphics being added last.
 */
export class TilemapView extends Container {
  readonly model: TilemapModel;
  readonly atlas: TerrainAtlas;
  readonly tileSize: number;

  /** Holds one sprite per tile, in the model's row-major order. */
  protected readonly tileLayer: Container;
  /** Free layer above the tiles, for highlights and other decorations. */
  readonly overlayLayer: Container;

  readonly #sprites: Sprite[];
  readonly #unsubscribe: () => void;

  constructor(options: TilemapViewOptions) {
    super({ label: 'TilemapView' });

    const { model, atlas } = options;

    this.model = model;
    this.atlas = atlas;
    this.tileSize = atlas.tileSize;

    this.tileLayer = new Container({ label: 'tiles' });
    this.overlayLayer = new Container({ label: 'overlay' });
    this.addChild(this.tileLayer, this.overlayLayer);

    this.#sprites = new Array<Sprite>(model.size);
    model.forEach((x, y, terrain) => {
      const sprite = this.createTileSprite(x, y, terrain);
      this.#sprites[model.indexOf(x, y)] = sprite;
      this.tileLayer.addChild(sprite);
    });

    this.#unsubscribe = model.onChange((change) => {
      this.refreshTile(change.x, change.y);
    });
  }

  /** Map width in local (unscaled) pixels. */
  get pixelWidth(): number {
    return this.model.width * this.tileSize;
  }

  /** Map height in local (unscaled) pixels. */
  get pixelHeight(): number {
    return this.model.height * this.tileSize;
  }

  /**
   * Builds the sprite for one tile. Override to customise appearance; call
   * `super.createTileSprite(...)` to start from the default sprite.
   */
  protected createTileSprite(x: number, y: number, terrain: TerrainId): Sprite {
    const sprite = new Sprite(this.atlas.getTexture(terrain));
    sprite.position.set(x * this.tileSize, y * this.tileSize);
    return sprite;
  }

  getTileSprite(x: number, y: number): Sprite | undefined {
    return this.model.inBounds(x, y) ? this.#sprites[this.model.indexOf(x, y)] : undefined;
  }

  /** Re-reads one cell from the model and updates its sprite's texture. */
  refreshTile(x: number, y: number): void {
    const sprite = this.getTileSprite(x, y);

    if (!sprite) {
      return;
    }

    sprite.texture = this.atlas.getTexture(this.model.get(x, y));
  }

  /** Converts a point in this container's local space into tile coordinates. */
  tileAt(local: PointData): TileCoord {
    return {
      x: Math.floor(local.x / this.tileSize),
      y: Math.floor(local.y / this.tileSize),
    };
  }

  /** Top-left corner of a tile, in this container's local space. */
  tileToLocal(tile: TileCoord): PointData {
    return { x: tile.x * this.tileSize, y: tile.y * this.tileSize };
  }

  override destroy(options?: DestroyOptions): void {
    this.#unsubscribe();
    super.destroy(options);
  }
}
