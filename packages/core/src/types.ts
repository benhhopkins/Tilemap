/** Identifier of a terrain kind. Meaning is defined by the {@link TerrainAtlas} in use. */
export type TerrainId = number;

/** Integer position of a tile inside a {@link TilemapModel}. */
export interface TileCoord {
  readonly x: number;
  readonly y: number;
}

/** Width/height pair in pixels. */
export interface Size {
  readonly width: number;
  readonly height: number;
}
