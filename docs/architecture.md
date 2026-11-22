# Architecture

The goal of the rewrite was stated as _"inheritance and a high degree of
reuse"_. Concretely that meant three things: a class you can actually subclass,
pieces you can take one at a time, and no hidden dependency on the demo's own
layout.

---

## 1. Layering

```
┌──────────────────────── packages/demo ────────────────────────┐
│  main.ts          boots the Application, wires everything     │
│  ui/MenuBar.ts    side panel (callbacks in, setters out)      │
│  ui/TextButton.ts one reusable button                         │
└───────────────────────────────┬───────────────────────────────┘
                                │ depends on
┌───────────────────────────────▼───────────── packages/core ───┐
│                                                               │
│  INPUT      TilemapController   pan · zoom · picking          │
│                   │ drives                                    │
│  RENDER     TilemapView         Container subclass, sprites   │
│             TileHighlight       one-tile outline              │
│             TerrainAtlas        terrain id → Texture          │
│                   │ reads                                     │
│  DATA       TilemapModel        Uint16Array grid, no PixiJS   │
│             MapGenerator        fills a model                 │
│             Rng                 injectable randomness         │
└───────────────────────────────────────────────────────────────┘
```

Dependencies point **downwards only**. `TilemapModel` imports nothing from
PixiJS; `TilemapView` does not know a controller exists; `TilemapController`
does not know what a menu is.

The 2022 code had the same three concerns, but all three were entangled through
module-level globals, so the arrows pointed in every direction at once.

---

## 2. The pieces

### `TilemapModel` — data

A `Uint16Array` of terrain ids plus a change-notification list. No PixiJS
import, so it runs under plain Node: that is what makes the generator testable
without a browser or a canvas.

```ts
const model = new TilemapModel({ width: 64, height: 50 });
model.set(3, 7, 2);
model.onChange(({ x, y, current }) => console.log(x, y, current));
```

`toJSON()` / `fromJSON()` make a map serialisable, so a server can send one or a
player can save one.

### `TilemapView extends Container` — rendering

A real subclass. You can extend it, and you can create more than one.

Two layers inside: `tileLayer` holds exactly one sprite per cell in the model's
row-major order; `overlayLayer` is yours, for highlights, units, fog, labels.
Keeping them apart is what removes the legacy build's fragile "look up a tile by
its child index" arithmetic.

The extension point is `createTileSprite`:

```ts
class AnimatedTilemapView extends TilemapView {
  protected override createTileSprite(x: number, y: number, terrain: TerrainId) {
    const sprite = super.createTileSprite(x, y, terrain);
    if (terrain === WATER) sprite.tint = 0xcceeff;
    return sprite;
  }
}
```

The view subscribes to the model, so `model.set(...)` repaints the affected tile
on its own — callers never touch sprites directly.

### `TerrainAtlas` — assets

An interface, not a class, so the same view works with any tileset:

```ts
interface TerrainAtlas {
  readonly tileSize: number;
  getTexture(terrain: TerrainId): Texture;
}
```

`SpritesheetTerrainAtlas` is the bundled implementation. Its `frameFor` option
maps a terrain id to a frame name, so a project whose atlas uses
`"grass"` rather than `"2"` supplies a function instead of patching the view.

### `TilemapController` — input and camera

Pan, zoom, hover and selection, emitting `tileselect`, `tilehover` and
`zoomchange`. An application that wants keyboard controls or a scripted camera
writes its own controller against the same view.

Two design points worth stating:

- **Every pointer position goes through `event.getLocalPosition(...)`.** That is
  what makes selection exact regardless of canvas offset, CSS borders, page
  scroll, device pixel ratio or zoom level — the defect the legacy build papered
  over with a hard-coded `if (zoom <= 2) y -= 1`.
- **The controller clips its own input surface.** It sets a `hitArea` on the
  surface container, so a menu bar beside the map simply never receives map
  events. The legacy code compared raw pointer X against a global
  `menuBarWidth` on every event instead.
- **Wheel input bypasses PixiJS's event system entirely.** PixiJS registers its
  `wheel` listener as `passive: true`, so nothing routed through it can call
  `preventDefault()` — the browser wins and scrolls or pinch-zooms the page.
  The federated path also drops the first wheel event on a freshly loaded page,
  because it hit-tests through a boundary that is not warm until the pointer
  moves. So the controller takes a `wheelHost` and attaches its own
  non-passive listener, mapping coordinates through
  `renderer.events.mapPositionToPoint`.
- **Zoom is a ladder of integer factors, and wheel travel is accumulated.**
  Fractional scale makes nearest-neighbour pixel art shimmer, and applying one
  zoom step per wheel event makes a mouse feel coarse and a trackpad
  uncontrollable. See `WheelStepAccumulator` and `zoomLevels`.

### `MapGenerator` and `Rng` — content

```ts
interface MapGenerator {
  generate(model: TilemapModel, rng: Rng): GenerationResult;
}
```

Randomness is injected rather than taken from `Math.random()`. With
`mulberry32(seed)` a map is perfectly reproducible, which is why the generator
can be unit-tested at all, and why the demo accepts `?seed=1234` in its URL.

`LandmassGenerator` keeps the original terrain arithmetic — maps look the same —
with two corrections: the start location is chosen from the list of candidates
rather than by retrying random coordinates in a loop that could never terminate,
and seed size is capped so the factorial recursion cannot run away.

---

## 3. What the demo owns

`packages/demo` holds everything that is _this particular application_ rather
than reusable machinery: the 800×600 stage, the 140px menu, the terrain names,
the colour scheme, the `?seed=` URL contract.

`main.ts` is the only file that knows all of those at once, and it is ~110 lines
including comments. That is the measure of how well the split worked.

---

## 4. Reusing the core elsewhere

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
await app.init({ width: 1024, height: 768 });

const sheet = await Assets.load('my-tiles.json');
const atlas = new SpritesheetTerrainAtlas(sheet, {
  tileSize: 32,
  frameFor: (terrain) => `terrain-${terrain}.png`,
});

const model = new TilemapModel({ width: 128, height: 128 });
new LandmassGenerator().generate(model, mulberry32(42));

const view = new TilemapView({ model, atlas });
app.stage.addChild(view);

const controller = new TilemapController({
  view,
  surface: app.stage,
  viewport: { width: 1024, height: 768 },
});
controller.on('tileselect', (tile) => console.log('picked', tile));
```

`pixi.js` is a **peer** dependency of the core package, not a bundled one, so the
host application decides which PixiJS version is loaded and only one copy ends
up in the bundle.

---

## 5. Deliberate non-goals

- **No ECS, no scene-graph framework.** The three-layer split is enough for a
  tilemap; more structure would cost more than it returns at this size.
- **No culling or chunking yet.** 3 200 sprites is comfortable for PixiJS 8. If
  maps grow past ~50 000 tiles, the places to change are `TilemapView`'s tile
  construction (chunk into tiled render textures) and the render loop. The
  layering above is what makes that a local change.
- **No React/Vue binding.** The controller's event emitter is the integration
  point if one is ever wanted.
