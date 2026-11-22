# Legacy build (January 2022, PixiJS 7.1.1)

This folder is the project exactly as it stood from January 2022 until the
November 2026 rewrite. It is kept for reference and for side-by-side
comparison; it is not built, tested or type-checked, and it is not part of the
npm workspace.

## Running it

No Node required — it loads PixiJS and jQuery from CDNs:

```powershell
python -m http.server 8123 --directory C:\HomeWorking\911\repos\PixiJSTilemap\legacy
```

Then open <http://localhost:8123/index.html>.

## Known defects

Measured against this running build; see
[../docs/code-review-legacy.md](../docs/code-review-legacy.md) for the detail.

- Tile selection lands about one tile below the pointer at zoom 1–2, because
  pointer events are read in browser-viewport coordinates.
- Zoomed-in tiles are blurred: `PIXI.settings.SCALE_MODES` is a misspelling of
  `SCALE_MODE`, so nearest-neighbour filtering was never applied.
- `Tilemap.prototype = new PIXI.Container()` makes a single container instance
  the shared prototype, so a second map instance is not possible.
- Map generation can spin forever in `while (!found)` when no grassland exists.

`pixi.dev.js` (PixiJS 1.5.1, 2014, 400 KB) was removed from this folder during
the rewrite — the original README already noted it was unused. It remains in git
history.

---

## Original upgrade log

Preserved verbatim from the 2022 README, because it is a useful account of what
each PixiJS major version cost.

> Basic zoomable, draggable tilemap using Pixi.js
>
> To use jQuery to add the Pixi canvas to a page:
>
> `$("#demo").append(Main("", 800, 600));`
>
> Replace `""` with any path if the sprite resources aren't in the current
> directory, and 800x600 with the desired size.

### TienTN changes

#### 2022/01/22

Upgraded jquery to 3.6.3 (no problem)

from v1.5.1 to pixijs 2.2.7 (no problem)

From pixijs v3, they have massive changes every major version: 3,4,5,6,7. My
target is to reach to latest version 7.1

from v2.2.7 to v3.0.0

- pixijs no longer use old Loader from v3, change to new Loader

from v3.0.0 to v4.8.9

- the `loader.onComplete.add` only available from v4.8.8
- no longer `requestAnimFrame` -> use `requestAnimationFrame`
- `data.getLocalPosition`: `data.constructor.toString()` -> InteractionEvent.
  pixijs now has `PIXI.InteractionData` with `getLocalPosition`. I've found out
  that they have moved InteractionData into the `.data` object inside event, so
  I changed it accordingly.
- *Deprecation:* You do not need to use a PIXI Stage any more, you can simply
  render any container. So I changed the Stage in main.js from `PIXI.Stage` to
  `PIXI.Container`.
- pending issue in v4.8.9: text style property 'font' is now deprecated, please
  use 'fontFamily', 'fontSize', 'fontStyle', 'fontVariant' and 'fontWeight'.

Dev note: Note that we include pixi.js directly, not import, so every class use
must go under `PIXI.*` — e.g. `PIXI.TextStyle`. It may cause some issues if we
include this in another project which uses modules. About `pixi.dev.js`: I have
stopped using it, because I want to link it directly from PIXI's server.

#### 2022/01/23

From v4.8.9 to v5.3.12 — this version is a bigger change from v4 so I sought
some help in the
[v5 migration guide](https://github.com/pixijs/pixijs/wiki/v5-Migration-Guide),
but actually it doesn't help because they missed a lot of changes in that
document.

*My changes:*

- Frames loading mechanism changed: `Sprite.from` did not work. From v5 pixi
  changed to resource-loader, which uses a dictionary instead of an array for
  frames, so I changed the JSON format accordingly. I still keep the
  `file_name` field for easier referencing. The result is much faster thanks to
  the new render engine.
- `button.setStyle is not a function` — button is a Text object, so I changed
  all `button.setStyle()` to `button.style = ...`, and the new TextStyle
  structure with `fontFamily`/`fontSize` tags.
- *Deprecations fixed:* `PIXI.loader` moved to `PIXI.Loader.shared`;
  `PIXI.Sprite.fromFrame` deprecated, use `PIXI.Sprite.from`.

From v5.3.12 to v6.5.8 — the loader mechanism changed again; loaders are being
replaced with Assets. In v6 Assets is only an opt-in package, so I had to
rethink the v6 upgrade (it still works, with a deprecated-loader warning).

From v6.5.8 to v7.1.1 — see the
[v7 migration guide](https://github.com/pixijs/pixijs/wiki/v7-Migration-Guide).
Now Assets is inside PIXI so I can use it.

- `Uncaught TypeError: Class constructor Container cannot be invoked without 'new'`
  — changed `PIXI.Container.call(this)` to `new PIXI.Container(this)`.
- Migration guide: replaces InteractionManager with EventSystem. I changed
  `mouse***` events to the new `obj.on('event', function (data))` mechanism.
- But this led to another problem, because the `data` parameter is now a
  `FederatedMouseEvent`, not an InteractionEvent, so we can't use
  `data.data.getLocalPosition` any more. I changed the code to use
  FederatedMouse/PointerEvent and used `event.client` to replace the old
  `getLocalPosition`.

> The last bullet is the origin of the off-by-one selection bug. The correct
> replacement for `data.data.getLocalPosition(obj)` in v7+ is
> `event.getLocalPosition(obj)`, which still exists — `event.client` is a
> browser-viewport coordinate and is not equivalent.
