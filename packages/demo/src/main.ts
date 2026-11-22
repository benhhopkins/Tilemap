import { Application, Assets, Container, Graphics } from 'pixi.js';
import type { Spritesheet } from 'pixi.js';
import {
  LandmassGenerator,
  SpritesheetTerrainAtlas,
  TileHighlight,
  TilemapController,
  TilemapModel,
  TilemapView,
  mulberry32,
} from '@pixitilemap/core';
import { MenuBar } from './ui/MenuBar';

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 600;
const MENU_WIDTH = 140;
const TILE_SIZE = 16;
const MAP_WIDTH = 64;
const MAP_HEIGHT = 50;
const INITIAL_ZOOM = 2;
const FOCUS_ZOOM = 4;

/** Reads `?seed=` so a map can be reproduced from its URL, or rolls a new one. */
function readSeed(): number {
  const fromUrl = new URLSearchParams(window.location.search).get('seed');
  const parsed = fromUrl === null ? Number.NaN : Number(fromUrl);

  return Number.isFinite(parsed) ? parsed >>> 0 : (Math.random() * 0xffffffff) >>> 0;
}

async function main(): Promise<void> {
  const host = document.querySelector<HTMLDivElement>('#app');

  if (!host) {
    throw new Error('Missing #app host element');
  }

  // PixiJS 8 initialises asynchronously, because picking between WebGPU and
  // WebGL is itself async. `new Application(options)` from v7 no longer works.
  const app = new Application();
  await app.init({
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    background: '#101820',
    antialias: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  host.appendChild(app.canvas);

  const sheet = await Assets.load<Spritesheet>('tiles.json');
  const atlas = new SpritesheetTerrainAtlas(sheet, { tileSize: TILE_SIZE, pixelArt: true });

  const viewport = { width: STAGE_WIDTH - MENU_WIDTH, height: STAGE_HEIGHT };

  const model = new TilemapModel({ width: MAP_WIDTH, height: MAP_HEIGHT });
  const view = new TilemapView({ model, atlas });

  // Everything map-related lives inside `surface`, which starts where the menu
  // ends and is clipped to the viewport. That is what keeps the map from
  // drawing or reacting under the panel; the 2022 code compared raw pointer
  // coordinates against a global `menuBarWidth` on every event instead.
  const surface = new Container({ label: 'viewport', x: MENU_WIDTH });
  surface.addChild(view);

  const clip = new Graphics().rect(0, 0, viewport.width, viewport.height).fill(0xffffff);
  surface.addChild(clip);
  surface.mask = clip;

  const controller = new TilemapController({
    view,
    surface,
    viewport,
    zoom: INITIAL_ZOOM,
    // The controller owns wheel input directly: PixiJS's own wheel listener is
    // passive, so it cannot stop the browser zooming the page instead.
    wheelHost: {
      canvas: app.canvas as HTMLCanvasElement,
      mapPositionToPoint: (point, clientX, clientY) =>
        app.renderer.events.mapPositionToPoint(point, clientX, clientY),
    },
  });

  const hoverHighlight = new TileHighlight({
    tileSize: TILE_SIZE,
    color: 0xffffff,
    width: 1,
    inset: 0.5,
  });
  const selectionHighlight = new TileHighlight({ tileSize: TILE_SIZE, color: 0xffff00, width: 2 });
  view.overlayLayer.addChild(hoverHighlight, selectionHighlight);

  const menu = new MenuBar({
    width: MENU_WIDTH,
    height: STAGE_HEIGHT,
    onZoomIn: () => controller.zoomIn(),
    onZoomOut: () => controller.zoomOut(),
    onRegenerate: () => {
      const seed = (Math.random() * 0xffffffff) >>> 0;
      const url = new URL(window.location.href);
      url.searchParams.set('seed', String(seed));
      window.location.assign(url);
    },
  });

  app.stage.addChild(surface, menu);

  controller.on('tilehover', (tile) => hoverHighlight.showAt(tile));
  controller.on('tileselect', (tile) => {
    selectionHighlight.showAt(tile);
    menu.setSelection(tile, model.get(tile.x, tile.y));
  });
  controller.on('zoomchange', (zoom) => menu.setZoom(zoom));

  const seed = readSeed();
  const { startLocation } = new LandmassGenerator().generate(model, mulberry32(seed));

  menu.setSeed(seed);
  menu.setZoom(controller.zoom);

  if (startLocation) {
    controller.select(startLocation);
    controller.setZoom(FOCUS_ZOOM, startLocation);
  } else {
    controller.centerOn({ x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) });
  }

  // Handy while developing against the running page.
  Object.assign(window, { __tilemap: { app, model, view, controller, seed } });
}

main().catch((error: unknown) => {
  console.error('Failed to start the tilemap demo', error);
});
