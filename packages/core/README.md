# @pixitilemap/core

Reusable tilemap building blocks for **PixiJS 8** — data, rendering and input as
three independent layers.

```bash
npm install @pixitilemap/core pixi.js
```

`pixi.js` is a peer dependency, so your application controls the version and
only one copy ends up in the bundle.

---

## Usage

```ts
import { Application, Assets } from 'pixi.js';
import {
  LandmassGenerator,
  SpritesheetTerrainAtlas,
  TilemapController,
  TilemapModel,
  TilemapView,
  mulberry32,
} from '@pixitilemap/core';

const app = new Application();
await app.init({ width: 1024, height: 768, antialias: false });
document.body.appendChild(app.canvas);

const sheet = await Assets.load('tiles.json');
const atlas = new SpritesheetTerrainAtlas(sheet, { tileSize: 16 });

const model = new TilemapModel({ width: 128, height: 128 });
const { startLocation } = new LandmassGenerator().generate(model, mulberry32(42));

const view = new TilemapView({ model, atlas });
app.stage.addChild(view);

const controller = new TilemapController({
  view,
  surface: app.stage,
  viewport: { width: 1024, height: 768 },
  zoom: 2,
});

controller.on('tileselect', (tile) => console.log(tile, model.get(tile.x, tile.y)));
if (startLocation) controller.centerOn(startLocation);
```

---

## API

### `TilemapModel`

The grid. Imports nothing from PixiJS, so it runs in Node, in a worker or on a
server.

```ts
new TilemapModel({ width, height, fill? })

model.get(x, y)            // throws RangeError out of bounds
model.tryGet(x, y)         // undefined out of bounds
model.set(x, y, terrain)   // true when the value changed
model.fill(terrain)
model.forEach((x, y, terrain) => {})
model.findTiles(terrain)   // TileCoord[]
model.inBounds(x, y)
model.indexOf(x, y)        // row-major
model.clone()
model.toJSON() / TilemapModel.fromJSON(json)

const off = model.onChange(({ x, y, previous, current }) => {}); off();
```

### `TilemapView extends Container`

```ts
new TilemapView({ model, atlas });

view.tileSize;
view.pixelWidth / view.pixelHeight; // unscaled
view.overlayLayer; // add highlights, units, labels here
view.getTileSprite(x, y);
view.refreshTile(x, y);
view.tileAt(localPoint); // local space -> TileCoord
view.tileToLocal(tile);
```

Subclass and override `protected createTileSprite(x, y, terrain): Sprite` to
change how a tile looks. The view subscribes to the model, so `model.set(...)`
repaints the affected tile on its own.

### `TilemapController extends EventEmitter`

```ts
new TilemapController({
  view, surface, viewport,
  zoom?, minZoom?, maxZoom?, zoomStep?, wheelZoom?, clickSlop?,
})

controller.zoomIn() / zoomOut() / setZoom(zoom, focus?)
controller.centerOn(tile) / centerTile() / constrain()
controller.select(tile)
controller.setViewport({ width, height })
controller.destroy()

controller.on('tileselect', (tile: TileCoord) => {})
controller.on('tilehover',  (tile: TileCoord | null) => {})
controller.on('zoomchange', (zoom: number) => {})
```

`view` must be a direct child of `surface`. The controller sets `eventMode`,
`cursor` and a `hitArea` on `surface`, so anything drawn beside the map never
receives map input. A press that moves no further than `clickSlop` (default 4px)
counts as a click; anything more is a pan.

### `TerrainAtlas`

```ts
interface TerrainAtlas {
  readonly tileSize: number;
  getTexture(terrain: TerrainId): Texture;
}

new SpritesheetTerrainAtlas(sheet, {
  tileSize,
  frameFor?,         // terrain id -> frame name, default String(terrain)
  fallbackTerrain?,  // default 0
  pixelArt?,         // default true -> scaleMode 'nearest'
});

setPixelArtFiltering(textures);   // standalone helper
```

### `TileHighlight extends Graphics`

A one-tile outline, built once and then only repositioned.

```ts
const hl = new TileHighlight({ tileSize: 16, color: 0xffff00, width: 2, inset? , fill?, fillAlpha? });
view.overlayLayer.addChild(hl);
hl.showAt(tile);   // or showAt(null) to hide
```

### Generation

```ts
interface MapGenerator {
  generate(model: TilemapModel, rng: Rng): { startLocation: TileCoord | null };
}

new LandmassGenerator({
  oceanTerrain?, maxLandTerrain?, landmassCount?,
  seedsPerLandmass?, startTerrain?, startOnTerrain?, maxSeedSize?,
}).generate(model, rng);
```

`LandmassGenerator` treats terrain ids as an elevation ladder and only raises a
cell whose terrain is lower than the incoming seed, so `oceanTerrain` must be
the lowest id in use. For a different numbering, write another `MapGenerator`.

### Randomness

```ts
mulberry32(seed); // deterministic: same seed, same map, every run
systemRng; // Math.random()
randomInt(rng, maxExclusive);
```

Every random decision in this package goes through an injected `Rng`. That is
what makes generated maps reproducible and the generator unit-testable.

---

## License

MIT
