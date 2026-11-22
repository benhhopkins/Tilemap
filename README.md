# PixiJS Tilemap

A zoomable, draggable tilemap built on **PixiJS 8**, split into a reusable core
library and a demo application.

![The demo: a zoomable tilemap with a side panel showing the selected tile, terrain, zoom and map seed](docs/demo.jpg)

---

## Quick start

Requires **Node ≥ 20.19** (22 LTS recommended).

```bash
npm install
npm run dev        # http://localhost:5173
```

Append `?seed=1234` to the URL to reproduce a specific map.

On this machine Node lives inside WSL rather than on Windows — see
[docs/development-setup.md](docs/development-setup.md) for the exact commands.

---

## Layout

```
packages/core/     @pixitilemap/core — the reusable library
packages/demo/     the application that uses it
legacy/            the January 2022 build, kept for reference
docs/              setup, architecture, code review, migration notes
```

### `@pixitilemap/core`

Three layers that can be taken one at a time:

|                        |                                                                |
| ---------------------- | -------------------------------------------------------------- |
| `TilemapModel`         | the grid of terrain ids. No PixiJS import — runs in plain Node |
| `TilemapView`          | a real `Container` subclass that renders a model as sprites    |
| `TilemapController`    | pan, zoom, hover and tile picking on top of a view             |
| `TerrainAtlas`         | maps a terrain id to a texture, so any tileset works           |
| `MapGenerator` / `Rng` | pluggable terrain generation, reproducible from a seed         |

`pixi.js` is a peer dependency, so the host application chooses the version.

See [docs/architecture.md](docs/architecture.md) for the reasoning and
extension points.

---

## Scripts

| Command             | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | demo with hot reload                    |
| `npm test`          | core unit tests                         |
| `npm run typecheck` | type-check both packages                |
| `npm run build`     | build the library, then the demo        |
| `npm run verify`    | format check → typecheck → test → build |

---

## Documentation

- **[Development setup](docs/development-setup.md)** — prerequisites, commands,
  WSL notes, troubleshooting
- **[Architecture](docs/architecture.md)** — how the pieces fit and how to reuse
  them
- **[Code review of the 2022 build](docs/code-review-legacy.md)** — what was
  wrong, measured against the running application
- **[v7 → v8 migration notes](docs/migration-v7-to-v8.md)** — old API beside new

---

## History

The project started as a plain-JavaScript Pixi 1.5 demo and was carried forward
version by version — 2.2.7, 3.0, 4.8.9, 5.3.12, 6.5.8, 7.1.1 — with each round of
breaking changes recorded in the README. That log now lives in
[`legacy/README.md`](legacy/README.md); it is a genuinely useful account of how
much churn the v3–v7 era involved.

In November 2026 the project was rewritten for PixiJS 8.23 in TypeScript, and
restructured around the library/demo split above. The rewrite also fixed four
defects that predated the upgrade: off-by-one tile selection at low zoom, a
misspelled setting that silently disabled nearest-neighbour filtering, a shared
prototype object that made a second map instance impossible, and a map-generation
loop that could hang the tab.

The 2022 code is preserved under [`legacy/`](legacy/) and still runs.

## License

MIT
