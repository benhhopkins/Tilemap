import type { TerrainId, TileCoord } from './types';

export interface TilemapModelOptions {
  /** Number of tile columns. Must be a positive integer. */
  width: number;
  /** Number of tile rows. Must be a positive integer. */
  height: number;
  /** Terrain every cell starts as. Defaults to `0`. */
  fill?: TerrainId;
}

/** Emitted whenever a cell's terrain actually changes value. */
export interface TileChange {
  readonly x: number;
  readonly y: number;
  readonly previous: TerrainId;
  readonly current: TerrainId;
}

export type TileChangeListener = (change: TileChange) => void;

/** Serialised form produced by {@link TilemapModel.toJSON}. */
export interface TilemapModelJSON {
  width: number;
  height: number;
  /** Row-major list of terrain ids, length `width * height`. */
  cells: number[];
}

/**
 * The tilemap's data layer: a grid of terrain ids and nothing else.
 *
 * This class deliberately knows nothing about PixiJS, rendering, input or the
 * DOM. That is what makes it testable in plain Node and reusable on a server,
 * in a worker, or behind a different renderer. {@link TilemapView} is the only
 * piece that turns this data into sprites.
 *
 * Storage is a single `Uint16Array`, so a 64x50 map costs 6.4 KB rather than
 * thousands of objects.
 */
export class TilemapModel {
  readonly width: number;
  readonly height: number;

  readonly #cells: Uint16Array;
  readonly #listeners = new Set<TileChangeListener>();

  constructor(options: TilemapModelOptions) {
    const { width, height, fill = 0 } = options;

    assertPositiveInteger(width, 'width');
    assertPositiveInteger(height, 'height');

    this.width = width;
    this.height = height;
    this.#cells = new Uint16Array(width * height);

    if (fill !== 0) {
      this.#cells.fill(fill);
    }
  }

  /** Total number of cells. */
  get size(): number {
    return this.width * this.height;
  }

  /** Row-major index of a tile. Exposed so subclasses can share the layout. */
  indexOf(x: number, y: number): number {
    return y * this.width + x;
  }

  inBounds(x: number, y: number): boolean {
    return (
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      x >= 0 &&
      y >= 0 &&
      x < this.width &&
      y < this.height
    );
  }

  /** Reads a cell. Throws `RangeError` when out of bounds — use {@link tryGet} to probe. */
  get(x: number, y: number): TerrainId {
    if (!this.inBounds(x, y)) {
      throw new RangeError(`Tile (${x}, ${y}) is outside a ${this.width}x${this.height} map`);
    }
    return this.#cells[this.indexOf(x, y)] as TerrainId;
  }

  /** Reads a cell, or `undefined` when out of bounds. */
  tryGet(x: number, y: number): TerrainId | undefined {
    return this.inBounds(x, y) ? (this.#cells[this.indexOf(x, y)] as TerrainId) : undefined;
  }

  /**
   * Writes a cell and notifies listeners.
   *
   * @returns `true` when the value actually changed; `false` when it was
   * already that terrain or the coordinates are out of bounds.
   */
  set(x: number, y: number, terrain: TerrainId): boolean {
    if (!this.inBounds(x, y)) {
      return false;
    }

    const index = this.indexOf(x, y);
    const previous = this.#cells[index] as TerrainId;

    if (previous === terrain) {
      return false;
    }

    this.#cells[index] = terrain;
    this.#emit({ x, y, previous, current: terrain });
    return true;
  }

  /** Overwrites every cell. Listeners are notified once per changed cell. */
  fill(terrain: TerrainId): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.set(x, y, terrain);
      }
    }
  }

  /** Visits every cell in row-major order. */
  forEach(visit: (x: number, y: number, terrain: TerrainId) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        visit(x, y, this.#cells[this.indexOf(x, y)] as TerrainId);
      }
    }
  }

  /** Collects every tile whose terrain matches `terrain`. */
  findTiles(terrain: TerrainId): TileCoord[] {
    const found: TileCoord[] = [];
    this.forEach((x, y, value) => {
      if (value === terrain) {
        found.push({ x, y });
      }
    });
    return found;
  }

  /**
   * Subscribes to cell changes.
   *
   * @returns an unsubscribe function — call it to detach the listener.
   */
  onChange(listener: TileChangeListener): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  clone(): TilemapModel {
    const copy = new TilemapModel({ width: this.width, height: this.height });
    copy.#cells.set(this.#cells);
    return copy;
  }

  toJSON(): TilemapModelJSON {
    return {
      width: this.width,
      height: this.height,
      cells: Array.from(this.#cells),
    };
  }

  static fromJSON(json: TilemapModelJSON): TilemapModel {
    const model = new TilemapModel({ width: json.width, height: json.height });

    if (json.cells.length !== model.size) {
      throw new RangeError(
        `Expected ${model.size} cells for a ${json.width}x${json.height} map, received ${json.cells.length}`,
      );
    }

    model.#cells.set(json.cells);
    return model;
  }

  #emit(change: TileChange): void {
    for (const listener of this.#listeners) {
      listener(change);
    }
  }
}

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer, received ${value}`);
  }
}
