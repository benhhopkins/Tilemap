# Code review — the 2022 build

Reviewed on 2026-11-22, against commit `7ffd3ad` (`master`), the state the project
had been left in since January 2022.

Everything below was checked against the application actually running, not read off
the source alone: the legacy build was served over HTTP and inspected live in a
browser. Measured values are quoted as measured.

---

## 1. Starting point

|                           |                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| Files                     | `index.html`, `main.js`, `tilemap.js`, `menu.js`, `tiles.json`, `tiles.png`, `pixi.dev.js` |
| Lines of application code | ~290                                                                                       |
| PixiJS                    | 7.1.1, loaded from `pixijs.download` as a global `<script>`                                |
| jQuery                    | 3.6.3, used for exactly one call (`$("#demo").append(...)`)                                |
| Build tooling             | none                                                                                       |
| Tests                     | none                                                                                       |
| Dependency manifest       | none                                                                                       |

**It still runs.** The v7.1.1 CDN build is still served, the page loads, and the
map is drawn. There is no emergency here — but also no safety net, because
nothing is pinned, typed or tested.

Unmerged work exists on `origin/fix/selectile` (2 commits) that never reached
`master`. See finding P1-a for the root cause it patches, and
[appendix 5](#5--appendix--audit-of-originfixselectile) for a measured audit of
the branch and its disposition.

---

## 2. Findings

Severity: **P1** blocks the upgrade or is a user-visible defect · **P2** real
cost, not blocking · **P3** tidiness.

### P1-a — Pointer coordinates are read in the wrong coordinate space

`tilemap.js` reads `evt.client.x` / `evt.client.y`, which are **browser viewport**
coordinates, and uses them as if they were coordinates inside the map.

```js
// tilemap.js:40-46 (legacy)
if (evt.client.x > menuBarWidth) {
  this.mousePressPoint[0] = evt.client.x - this.position.x;
  ...
  this.selectTile(Math.floor(this.mousePressPoint[0] / (this.tileSize * this.zoom)), ...)
}
```

The canvas is not at the viewport origin. Measured on the running page, the
drawing surface starts at viewport **(5, 21)** — 5px from the canvas's CSS
border, 21px from that border plus the default `<p>` margin that `index.html`
inherits. Every selection therefore lands 5px right and 21px below the pointer.

At zoom 4 and 8 a 21px error is a fraction of a tile and goes unnoticed. At zoom 1
a tile is 16px, so the error is **more than a full tile**, consistently.

This is the root cause of the bug that `origin/fix/selectile` tries to patch:

```js
// origin/fix/selectile
if (this_ptr.zoom <= 2 && selY > 0) selY -= 1; // "a fix for small zoomlevel 1,2"
```

That branch adjusts **only Y**, and **only at zoom ≤ 2** — which matches the
measurement exactly (the X error of 5px is under one tile even at zoom 1, the Y
error of 21px is not). It treats the symptom. It also breaks the moment the page
layout changes, the window is scrolled, the canvas is moved, or the device pixel
ratio is not 1.

**Do not merge that branch.** The correct fix is to let the scene graph do the
conversion: `event.getLocalPosition(container)` resolves a pointer position into
a container's own space, accounting for canvas offset, borders, scroll, DPR and
the current zoom in one step.

### P1-b — The inheritance model is broken

```js
// tilemap.js:1-5 and menu.js:1-6 (legacy)
Tilemap.prototype = new PIXI.Container();
Tilemap.prototype.constructor = Tilemap;

function Tilemap(width, height) {
  var myObj = new PIXI.Container(this);   // result discarded
  ...
}
```

Two separate problems:

1. **A single `Container` instance is the prototype.** Every `Tilemap` created
   would share that one container's `children` array, `transform`, `position`
   and `scale`. Verified on the running page: `children` and `scale` are _not_
   own properties of the tilemap object — they resolve through the prototype.
   The demo gets away with it only because it creates exactly one instance.
   A second map, or a subclass, corrupts the first.
2. **`new PIXI.Container(this)` does nothing.** It builds a throwaway container
   and discards it. The `Tilemap` object is never actually constructed as a
   `Container`; it merely borrows one's properties by lookup.

This is the single biggest obstacle to the stated goal of "inheritance and
reusability", and it is also what the v8 upgrade would break hardest on: v8
containers do more constructor-time setup, and borrowing a foreign instance's
internals is no longer survivable.

### P1-c — Modules communicate through global variables

`main.js` declares `stage`, `renderer`, `renderWidth`, `renderHeight`, `tilemap`,
`menu`, `menuBarWidth` as globals. The coupling runs **both ways**:

- `menu.js:27` calls `tilemap.zoomIn`
- `tilemap.js:155` writes `menu.selectedTileText.text = ...`
- `tilemap.js:185-196` reads `renderWidth`, `renderHeight`, `menuBarWidth`

So the map cannot be used without the menu, the menu cannot be used without the
map, and neither can be used without `main.js` having run first. Nothing here is
reusable in another project, and nothing is testable in isolation.

### P1-d — `generateMap` can hang the tab

```js
// tilemap.js:120-131 (legacy)
var found = false;
while (!found) {
  var x = ..., y = ...;
  if (this.getTile(x, y).terrain == 2) { ...; found = true; }
}
```

If the generator happens to produce no grassland at all — small maps, a tweaked
`landmassCount`, bad luck — this loop never ends and the browser tab freezes with
no error. Note that `origin/fix/selectile` _lowers_ the landmass counts from
25/12 to 10/9, which moves it closer to that cliff.

### P2-a — The "crisp pixels" setting never worked

```js
// main.js:13 (legacy)
PIXI.settings.SCALE_MODES = PIXI.SCALE_MODES.NEAREST;
```

The property is `SCALE_MODE`, singular. The line assigns to a key PixiJS never
reads. Verified on the running page: `PIXI.settings.SCALE_MODE` was still `1`
(`LINEAR`) and the actual tile texture's `scaleMode` was `1`. The zoomed-in tiles
in the 2022 build are visibly blurred — the opposite of the comment's intent.

### P2-b — Highlights are re-tessellated on every mouse move

`Tilemap.prototype.mouseMove` calls `clear()`, `lineStyle()`, `beginFill()`,
`drawRect()`, `endFill()` on every single move event, for a rectangle whose shape
never changes — only its position does. The same pattern applies to the selection
outline.

### P2-c — A new `TextStyle` per hover event

`menu.js` constructs `new PIXI.TextStyle({...})` inside `mouseover`, `mouseout`,
`mousedown`, `mouseup` and `mouseupoutside` — five allocation sites per button,
each forcing the label's glyph texture to be re-rasterised, to change one colour.

### P2-d — Eight input handlers for three gestures

`mousedown`/`touchstart`, `mouseup`/`mouseupoutside`/`touchend`/`touchendoutside`,
`mousemove`/`touchmove`. PixiJS's federated events deliver `pointer*` for mouse,
touch and pen alike, so three handlers cover all of it.

### P2-e — Tile lookup depends on child-array ordering

```js
Tilemap.prototype.getTile = function (x, y) {
  return this.getChildAt(x * this.tilesHeight + y);
};
```

Tiles, the selection graphic and the hover graphic all live in the _same_
children array. The lookup works only because the two graphics happen to be
appended after all 3 200 tiles. Verified: `children.length` is 3 202. Adding any
child, in any order, anywhere else silently returns the wrong tile.

Note also that the indexing is column-major (`x * tilesHeight + y`) while the
generation loop walks `i` then `j` — correct, but only by coincidence of the two
matching.

### P2-f — Render loop never idles

```js
function animate() {
  requestAnimationFrame(animate);
  renderer.render(stage);
}
```

The scene is static between interactions, but the full 3 200-sprite scene is
re-submitted every frame forever.

### P2-g — Recursive growth is factorial

`spawnLandmass(size, ...)` loops `size` times and recurses with `size - 1`, so
cost is `O(size!)`. At the shipped `size ≤ 6` that is ~720 calls per seed and
fine. Raising `seedsPerLandmass` a little makes it explode with no guard.

### P3-a — jQuery for one line

`index.html` pulls 90 KB of jQuery to run `$("#demo").append(...)`. One
`appendChild` replaces it.

### P3-b — 400 KB of dead vendored code

`pixi.dev.js` is PixiJS **1.5.1**, compiled 2014-02-13, still committed. The
project's own README says it is no longer used.

### P3-c — Invalid font size

```js
{ fontSize: "10p", fontFamily: " Arial", ... }   // menu.js:22
```

`"10p"` is not a valid CSS size, and `" Arial"` has a stray leading space.
Verified: the label renders at a fallback height of 12px.

### P3-d — No dependency manifest, no lockfile, no pinning

PixiJS comes from a URL, jQuery from a CDN. There is no `package.json`, so there
is nothing to install, nothing to pin, and no way to reproduce the build.

---

## 3. What this means for the upgrade

The v7 → v8 jump is real work, but it is **not** the hard part. Roughly, v8
requires: async `app.init()`, `app.canvas` instead of `app.view`, the new
`Graphics` fill/stroke API, options-object constructors, string scale modes, and
`Assets` as the only loader. That is mechanical.

The hard part is P1-b and P1-c. A straight port would carry the broken prototype
chain and the global coupling into v8 — and v8 is _less_ tolerant of the former
than v7 was. Upgrading and restructuring are cheaper done together than in
sequence, because the restructure removes most of the code the upgrade would
otherwise have to touch twice.

See [architecture.md](architecture.md) for the structure that was adopted, and
[migration-v7-to-v8.md](migration-v7-to-v8.md) for the API-level mapping.

---

## 4. Verification notes

How the measurements above were obtained, so they can be reproduced:

1. Serve the legacy files and open `index.html`.
2. In the console, `document.querySelector('canvas').getBoundingClientRect()`
   gives the canvas offset; add the 5px CSS border for the drawing surface
   origin. Measured: rect `(0, 16)`, surface `(5, 21)`.
3. `PIXI.settings.SCALE_MODE` and
   `tilemap.getChildAt(0).texture.baseTexture.scaleMode` both read `1` (linear).
4. `Object.prototype.hasOwnProperty.call(tilemap, 'children')` returns `false`,
   confirming the shared-prototype problem.
5. `tilemap.children.length` is `3202` against `64 × 50 = 3200` tiles.

The legacy build is preserved under [`legacy/`](../legacy/) and can still be run
for comparison — see that folder's README.

---

## 5. Appendix — audit of `origin/fix/selectile`

A second clone of the repository at that branch was served and measured, because
the branch was described as carrying a real fix that never landed.

### What it actually is

|                         |                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Position vs `master`    | **2 ahead, 2 behind** (not 7 ahead)                                                |
| Merge base              | `3f208f5` · 2023-01-23 · _Merge pull request #2 from hardwarelayer/upgrade/v7_     |
| Branch commits          | `66a9008`, `c85bab1` — both 2023-01-26; the second only removes a `console.log`    |
| `master` since the base | `f94c9f8` _refactor code_ + merge `7ffd3ad`, both 2023-01-28                       |
| Files changed           | `tilemap.js` only, +15 −6                                                          |
| Trial merge today       | `git merge-tree origin/master origin/fix/selectile` → **CONFLICT in `tilemap.js`** |

The conflict is unavoidable: `master`'s later refactor turned the free functions
`mouse_down` / `mouse_move` into `Tilemap.prototype` methods, rewriting exactly
the lines the branch edits. (The handler extraction is therefore _not_ the
branch's work — the free functions were already in the merge base.)

Net content, all of it:

1. `if (this_ptr.zoom <= 2 && selY > 0) selY -= 1;` in `mouse_down`
2. the same line in `mouse_move`, for the hover outline
3. landmass generation lowered from `j<25 / i<12` to `j<10 / i<9`

### Does the patch work?

Measured on the branch build itself — surface origin `(5, 21)`, 16px tiles —
by driving the handlers directly across the viewport and comparing the selected
tile against the geometrically correct one.

Y axis, 598 pointer rows per zoom level:

| zoom | tile size | true Y error | `master` wrong | `fix/selectile` wrong |
| ---: | --------: | -----------: | -------------: | --------------------: |
|    1 |      16px | 1.3125 tiles |          100 % |            **31.8 %** |
|    2 |      32px |  0.656 tiles |         66.7 % |            **33.3 %** |
|    4 |      64px |  0.328 tiles |         35.1 % |    35.1 % (untouched) |
|    8 |     128px |  0.164 tiles |         17.6 % |    17.6 % (untouched) |

So the patch is a real, partial improvement at zoom 1 and 2 — it removes the
whole-tile part of the error and leaves the fractional remainder. It does not
fix the bug: roughly a third of all clicks still land on the wrong row.

Full 2-D sweep, 18 600 pointer positions per zoom level on the branch build,
counting any wrong tile (X or Y):

| zoom | wrong tile | of which X | of which Y |
| ---: | ---------: | ---------: | ---------: |
|    1 |     53.6 % |     32.3 % |     31.5 % |
|    2 |     44.2 % |     16.1 % |     33.5 % |
|    4 |     40.6 % |      8.6 % |     35.0 % |
|    8 |     20.2 % |      3.2 % |     17.5 % |

The X error — 5px from the canvas's CSS border — is never addressed at all.

### Why it cannot be kept

The `-1` is calibrated to one page layout. Removing the default `<p>` margin
from `index.html`, which moves the drawing surface from y=21 to y=5 and changes
nothing else, flips the patch from help to harm:

| zoom | `master` wrong | `fix/selectile` wrong |
| ---: | -------------: | --------------------: |
|    1 |         31.8 % |            **68.2 %** |
|    2 |         15.9 % |            **84.1 %** |

Any CSS change, page scroll, window resize with a centred canvas, or a device
pixel ratio other than 1 has the same effect.

### Disposition

- **Do not merge.** It conflicts with `master`, it is layout-calibrated, and it
  treats a symptom the rewrite removes at the source.
- The root cause is fixed properly in `TilemapController`, which converts every
  pointer position with `event.getLocalPosition(...)`. Verified exact — zero
  error — at zoom 1, 2 and 8 with a deliberately offset canvas (`index.html` in
  `packages/demo` keeps a 24px margin and a 5px border on purpose).
- The generator tweak is preserved as configuration rather than as an edit:
  `new LandmassGenerator({ landmassCount: 10, seedsPerLandmass: 9 })` reproduces
  the branch's sparser maps, and the defaults (`25` / `12`) match `master`.
  `maxSeedSize` additionally bounds the factorial recursion that made the
  original counts expensive — the likely reason they were lowered.
- Nothing on the branch is unique after that, so it can be deleted once its
  intent is recorded here.
