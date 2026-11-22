# PixiJS 7.1.1 → 8.23.0 migration notes

What actually changed for _this_ codebase, with the old line beside the new one.
For the complete list see the official
[v8 migration guide](https://pixijs.com/8.x/guides/migrations/v8).

PixiJS 8 still ships a browser global build (`dist/pixi.min.js` defines a global
`PIXI`), so a `<script>`-tag project can upgrade without a bundler. This
repository moved to npm + ESM imports anyway, because that is what makes the
core package reusable and type-checked.

---

## Delivery

| 7.1.1                                                   | 8.23.0 (here)                           |
| ------------------------------------------------------- | --------------------------------------- |
| `<script src="https://pixijs.download/v7.1.1/pixi.js">` | `import { Application } from 'pixi.js'` |
| every symbol under `PIXI.*`                             | named imports, tree-shaken by Vite      |
| no version pinning                                      | `pixi.js` in `package.json` + lockfile  |

---

## Application and renderer

```js
// v7
renderer = PIXI.autoDetectRenderer(800, 600);
stage = new PIXI.Container();
document.body.appendChild(renderer.view);
function animate() {
  requestAnimationFrame(animate);
  renderer.render(stage);
}
```

```ts
// v8
const app = new Application();
await app.init({ width: 800, height: 600, background: '#101820', antialias: false });
host.appendChild(app.canvas);
// no manual rAF loop: Application drives its own ticker
```

- Initialisation is **async** — v8 has to probe for WebGPU before it can decide
  on a renderer. `new Application(options)` no longer configures anything;
  options move into `init()`.
- `renderer.view` / `app.view` → **`app.canvas`**.

## Scale mode (the "crisp pixels" setting)

```js
// v7 — and note this line was misspelled in the original: the real key is
// SCALE_MODE, singular, so nearest filtering was never actually applied
PIXI.settings.SCALE_MODES = PIXI.SCALE_MODES.NEAREST;
```

```ts
// v8 — per texture source, as a string
texture.source.scaleMode = 'nearest';
```

The whole `PIXI.settings` object is gone, and the `SCALE_MODES` enum is replaced
by the string union `'nearest' | 'linear'`. In this repo
`SpritesheetTerrainAtlas` applies it across the sheet via its `pixelArt` option.

## Assets

```js
// v7
PIXI.Assets.load(['tiles.json']).then(onLoaded);
PIXI.Sprite.from('0');
```

```ts
// v8
const sheet = await Assets.load<Spritesheet>('tiles.json');
new Sprite(sheet.textures['0']);
```

`Assets` survived the v7 → v8 jump mostly intact — it was the v4→v5→v6→v7 loader
churn that cost the original author the most time. Two changes do matter:
`Assets.add('alias', 'url')` becomes `Assets.add({ alias, src })`, and
`Texture.from(url)` no longer loads anything; the asset must be loaded first.

Reading textures off the returned `Spritesheet` rather than relying on a global
texture cache is also what lets two tilesets coexist.

## Graphics

```js
// v7
g.lineStyle(2, 0xffff00, 1);
g.beginFill(0x000000, 0);
g.drawRect(x, y, w, h);
g.endFill();
```

```ts
// v8 — shape first, then paint
g.rect(x, y, w, h).fill({ color: 0x000000, alpha: 0 }).stroke({ width: 2, color: 0xffff00 });
```

All the `drawX` methods lost their prefix: `drawRect` → `rect`, `drawCircle` →
`circle`, `drawPolygon` → `poly`, `drawRoundedRect` → `roundRect`, and so on.
"Line" is now "stroke" throughout.

## Text

```js
// v7
new PIXI.Text(
  'Selected Tile: 1',
  new PIXI.TextStyle({ fontFamily: 'Arial', fontSize: '40px', fill: '#FFFFFF' }),
);
```

```ts
// v8
new Text({
  text: 'Selected Tile: 1',
  style: { fontFamily: 'Arial', fontSize: 40, fill: '#ffffff' },
});
```

Positional constructor arguments give way to an options object — the same change
applies to `Mesh`, `NineSliceSprite` (was `NineSlicePlane`), the filters, and
most other classes.

## Containers

- `DisplayObject` is gone; `Container` is the base of everything.
- Leaf nodes (`Sprite`, `Graphics`, `Text`) can no longer have children — wrap
  them in a `Container`.
- `container.name` → `container.label`.
- `getBounds()` returns a `Bounds`; use `.rectangle` for the old `Rectangle`.
- `updateTransform` is gone; use the `onRender` hook.

The legacy pattern below does not survive the jump, and was already wrong in v7
(see [code-review-legacy.md](code-review-legacy.md), P1-b):

```js
// v7, broken by design
Tilemap.prototype = new PIXI.Container();
function Tilemap(w, h) {
  var myObj = new PIXI.Container(this); /* discarded */
}
```

```ts
// v8
export class TilemapView extends Container {
  constructor(options: TilemapViewOptions) {
    super({ label: 'TilemapView' });
  }
}
```

## Interaction

| 7.1.1                                    | 8.23.0                                                        |
| ---------------------------------------- | ------------------------------------------------------------- |
| `obj.interactive = true`                 | `obj.eventMode = 'static'`                                    |
| `obj.buttonMode = true`                  | `obj.cursor = 'pointer'`                                      |
| default `eventMode` was `auto`           | default is now `passive`                                      |
| `mousedown` + `touchstart` + …           | `pointerdown`, `pointermove`, `pointerup`, `pointerupoutside` |
| `evt.data.getLocalPosition(obj)` (v4–v6) | `event.getLocalPosition(obj)`                                 |

The v7 upgrade is where the original author lost the local-position call and
substituted `event.client`, which is what introduced the off-by-a-tile selection
bug. `FederatedPointerEvent.getLocalPosition(container)` is the direct
replacement and does the full transform, not just a canvas offset.

## Ticker

```js
// v7
ticker.add((dt) => {
  sprite.rotation += dt;
});
```

```ts
// v8 — the callback receives the Ticker
app.ticker.add((ticker) => {
  sprite.rotation += ticker.deltaTime;
});
```

---

## Things that were _not_ a v8 problem

Worth separating out, because they looked like upgrade work but were not:

- The off-by-one tile selection — a coordinate-space mistake, present in v7.
- The blurry zoomed tiles — a misspelled settings key, present in v7.
- The broken prototype chain — wrong since the DisplayObjectContainer days; v8
  only makes the consequences louder.
- The potential infinite loop in map generation — pure application logic.

Upgrading alone would have carried all four forward.
