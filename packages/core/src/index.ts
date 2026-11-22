/**
 * `@pixitilemap/core` — reusable tilemap building blocks for PixiJS 8.
 *
 * The package is split along one axis: *data*, *rendering*, *input*.
 *
 * - {@link TilemapModel} holds terrain and nothing else. No PixiJS import, so
 *   it runs in Node, in a worker or on a server.
 * - {@link TilemapView} turns a model into sprites. Subclass it, or override
 *   `createTileSprite`, to change how a tile looks.
 * - {@link TilemapController} adds pan, zoom and tile picking on top of a view.
 * - {@link TerrainAtlas} decides which texture a terrain id gets, so the same
 *   view works with any tileset.
 * - {@link MapGenerator} produces terrain; {@link LandmassGenerator} is one
 *   implementation, driven by an injectable {@link Rng} for reproducibility.
 *
 * Nothing here reads a global variable or assumes a particular DOM layout.
 */

export { TilemapModel } from './TilemapModel';
export type {
  TilemapModelOptions,
  TilemapModelJSON,
  TileChange,
  TileChangeListener,
} from './TilemapModel';

export { TilemapView } from './TilemapView';
export type { TilemapViewOptions } from './TilemapView';

export { TilemapController } from './TilemapController';
export type {
  TilemapControllerOptions,
  TilemapControllerEvents,
  WheelZoomHost,
} from './TilemapController';

export { WheelStepAccumulator, normalizePixels } from './WheelStepAccumulator';
export type { WheelDelta, WheelStepAccumulatorOptions } from './WheelStepAccumulator';

export {
  DEFAULT_ZOOM_LEVELS,
  normalizeZoomLevels,
  nearestZoomIndex,
  snapToZoomLevel,
  stepZoomLevel,
} from './zoomLevels';

export { SpritesheetTerrainAtlas, setPixelArtFiltering } from './TerrainAtlas';
export type { TerrainAtlas, SpritesheetTerrainAtlasOptions } from './TerrainAtlas';

export { TileHighlight } from './TileHighlight';
export type { TileHighlightOptions } from './TileHighlight';

export { LandmassGenerator } from './generators/LandmassGenerator';
export type { LandmassGeneratorOptions } from './generators/LandmassGenerator';
export type { MapGenerator, GenerationResult } from './generators/MapGenerator';

export { mulberry32, systemRng, randomInt } from './rng';
export type { Rng } from './rng';

export type { TerrainId, TileCoord, Size } from './types';
