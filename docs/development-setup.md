# Local development setup

Everything you need to run, test and build this repository on your own machine.

---

## 1. Prerequisites

| Tool    | Version                         | Why                                                        |
| ------- | ------------------------------- | ---------------------------------------------------------- |
| Node.js | **≥ 20.19**, 22 LTS recommended | Vite 6 and Vitest 2 both require it                        |
| npm     | ≥ 10 (ships with Node)          | workspaces are used, so no extra package manager is needed |
| Git     | any recent version              | —                                                          |

`.nvmrc` pins Node 22 for anyone using `nvm`/`fnm`.

There is **no global install step** — no `pixi.js` download, no CDN script tag,
no vendored library in the repo. Everything comes from `npm install`.

### This machine: Node lives in WSL, not Windows

On the development machine this project was set up on, Node is installed inside
**WSL (Ubuntu)** and is _not_ on the Windows `PATH`:

```
wsl:     node v22.23.1, npm 11.17.0
windows: node not found
```

So run every npm command through WSL, from the Linux-side path of the repo:

```bash
wsl
cd /mnt/c/HomeWorking/911/repos/PixiJSTilemap
npm install
npm run dev
```

Or in a single line from PowerShell:

```powershell
wsl bash -lc "cd /mnt/c/HomeWorking/911/repos/PixiJSTilemap && npm run dev"
```

If you would rather work natively on Windows, install Node there
(`winget install OpenJS.NodeJS.LTS`), delete `node_modules/`, and re-run
`npm install` from PowerShell. Do **not** share one `node_modules/` between
Windows and WSL: esbuild, rollup and friends install platform-specific binaries,
and a tree installed by one side will fail to start on the other.

---

## 2. Install

```bash
npm install
```

This installs the root dev tools and both workspace packages in one pass.
`packages/demo` depends on `@pixitilemap/core` through the npm workspace, so
there is nothing to link by hand.

> **Expected warning.** npm 11 prints
> `npm warn allow-scripts … esbuild (postinstall: node install.js)`.
> You can ignore it here: the prebuilt esbuild binary arrives through the
> `@esbuild/<platform>` optional dependency, and Vite/Vitest both start fine
> without the postinstall step. Verify with
> `node_modules/.bin/vite --version`.

---

## 3. Everyday commands

Run these from the repository root.

| Command                | What it does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | Starts the demo on <http://localhost:5173> with hot reload            |
| `npm test`             | Runs the core unit tests once                                         |
| `npm run test:watch`   | Re-runs tests on change                                               |
| `npm run typecheck`    | Type-checks both packages, emitting nothing                           |
| `npm run build`        | Builds the core library, then the demo bundle                         |
| `npm run preview`      | Serves the built demo bundle                                          |
| `npm run format`       | Rewrites files with Prettier                                          |
| `npm run format:check` | Fails if anything is unformatted                                      |
| `npm run verify`       | format:check → typecheck → test → build. **Run this before pushing.** |

The dev server reads the core package **straight from `packages/core/src`** (via
a Vite alias and a matching `tsconfig` path), so editing the library hot-reloads
the demo with no rebuild. Only `npm run build` goes through
`packages/core/dist`.

### Hot reload from `/mnt/c` under WSL

WSL reaches the Windows filesystem over 9p/drvfs, where inotify events never
fire — so Vite's watcher sees nothing and hot reload silently stops working.
Set the polling flag:

```bash
VITE_USE_POLLING=1 npm run dev
```

(`packages/demo/vite.config.ts` reads that variable; polling is off by default
so native filesystems keep their faster watcher.)

---

## 4. Running the old build side by side

The January 2022 code is preserved under [`legacy/`](../legacy/) and still runs.
It needs no Node at all — any static server will do:

```powershell
python -m http.server 8123 --directory C:\HomeWorking\911\repos\PixiJSTilemap\legacy
```

Then open <http://localhost:8123/index.html>. Useful for comparing behaviour
while the rewrite is reviewed. See [`legacy/README.md`](../legacy/README.md).

---

## 5. Editor setup

`.editorconfig` and `.prettierrc.json` are committed, so indentation, line
endings and formatting are consistent for everyone.

For VS Code, `.vscode/extensions.json` recommends the Prettier and ESLint-free
minimum: Prettier for formatting and the built-in TypeScript server for types.
Open the repository root (not a sub-package) so the workspace `tsconfig` paths
resolve.

Line endings are forced to **LF** by `.editorconfig`. Git on Windows may still be
configured with `core.autocrlf=true`; if you see whole files show up as modified
after a checkout, that is why.

---

## 6. Browser requirements

PixiJS 8 picks WebGPU when the browser offers it and falls back to WebGL 2.
Any current Chrome, Edge, Firefox or Safari works. There is no WebGL 1 fallback
in v8 — if you must support very old browsers, that is a reason to stay on v7,
not a configuration switch.

---

## 7. Troubleshooting

**`Cannot find module 'node:path'` during typecheck**
`@types/node` is missing — re-run `npm install` at the root.

**Port 5173 already in use**
The dev server is configured with `strictPort`, so it fails instead of silently
moving. Stop the other process, or run `npm run dev -- --port 5174`.

**A blank canvas and no error**
Check the browser console. The demo logs
`Failed to start the tilemap demo` with the underlying error when
initialisation throws; the most common cause is `tiles.json` not being reachable
from `packages/demo/public/`.

**Tests pass but the build fails**
`npm test` runs against `packages/core/src`; the build additionally emits type
declarations through `packages/core/tsconfig.build.json`, which is stricter about
what can be exported. Run `npm run verify` to catch this before pushing.
