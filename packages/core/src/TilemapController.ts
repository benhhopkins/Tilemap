import { EventEmitter, Point, Rectangle } from 'pixi.js';
import type { Container, FederatedPointerEvent, PointData } from 'pixi.js';
import type { TilemapView } from './TilemapView';
import type { Size, TileCoord } from './types';
import { WheelStepAccumulator } from './WheelStepAccumulator';
import {
  DEFAULT_ZOOM_LEVELS,
  normalizeZoomLevels,
  snapToZoomLevel,
  stepZoomLevel,
} from './zoomLevels';

/**
 * What {@link TilemapController} needs in order to own wheel input.
 *
 * `app.renderer` provides both members; the demo passes
 * `{ canvas: app.canvas, mapPositionToPoint: ... }`.
 */
export interface WheelZoomHost {
  /** The canvas element the wheel listener is attached to. */
  canvas: HTMLElement;
  /** Converts client coordinates into PixiJS global space, writing into `point`. */
  mapPositionToPoint(point: PointData, clientX: number, clientY: number): void;
}

export interface TilemapControllerOptions {
  /** The map being driven. Must already be a direct child of `surface`. */
  view: TilemapView;
  /**
   * Container that receives pointer input. Its hit area is clipped to
   * `viewport`, so anything drawn beside the map (a menu bar, a HUD) never has
   * to be excluded by hand.
   */
  surface: Container;
  /** Size of the visible map area, in surface-space pixels. */
  viewport: Size;
  /**
   * Allowed zoom factors, ascending. Defaults to {@link DEFAULT_ZOOM_LEVELS}
   * (`[1, 2, 3, 4, 6, 8]`) — integers, so pixel art stays crisp at every stop.
   */
  zoomLevels?: readonly number[];
  /** Starting zoom. Snapped to the nearest level. Defaults to `2`. */
  zoom?: number;
  /**
   * Enables zooming with the wheel and with a trackpad pinch. Requires
   * {@link TilemapControllerOptions.wheelHost}; without it there is nothing to
   * listen on and wheel zooming stays off. Defaults to `true`.
   */
  wheelZoom?: boolean;
  /**
   * Where wheel input comes from — normally built from `app`.
   *
   * The controller attaches its own non-passive `wheel` listener rather than
   * using PixiJS's federated `wheel` event, for two reasons. PixiJS registers
   * its wheel listener as `passive: true`, so `preventDefault()` on a federated
   * wheel event is a no-op and the browser scrolls or pinch-zooms the page
   * instead of the map. And the federated path routes through the event
   * boundary's hit test, which silently drops the first wheel event on a
   * freshly loaded page if the pointer has not moved yet.
   */
  wheelHost?: WheelZoomHost;
  /** Scroll distance, in pixels, per zoom step. Defaults to `40`. */
  wheelThreshold?: number;
  /**
   * How far the pointer may travel during a press and still count as a click
   * rather than a drag, in surface pixels. Defaults to `4`.
   */
  clickSlop?: number;
}

/** Events emitted by {@link TilemapController}. */
export interface TilemapControllerEvents {
  /** A tile was clicked. */
  tileselect: [TileCoord];
  /** The hovered tile changed; `null` when the pointer left the map. */
  tilehover: [TileCoord | null];
  /** The zoom factor changed. */
  zoomchange: [number];
}

/**
 * Pan, zoom and tile picking for a {@link TilemapView}.
 *
 * Input handling is deliberately separate from both the data and the rendering,
 * so an application can swap in its own controls (keyboard, minimap, scripted
 * camera) without forking the view.
 *
 * Every pointer position is resolved with `event.getLocalPosition(...)`, which
 * accounts for the canvas offset, CSS borders, page scroll, device pixel ratio
 * and the current zoom. The 2022 code read raw viewport coordinates off the
 * event instead, which is why selections landed about one tile below the cursor
 * at low zoom and needed a hard-coded `zoom <= 2` workaround.
 */
export class TilemapController extends EventEmitter<TilemapControllerEvents> {
  readonly view: TilemapView;
  readonly surface: Container;

  readonly #zoomLevels: number[];
  readonly #clickSlop: number;
  readonly #wheelHost: WheelZoomHost | undefined;
  readonly #wheelAccumulator: WheelStepAccumulator;

  /** Scratch points, reused so wheel handling allocates nothing per event. */
  readonly #globalPoint = new Point();
  readonly #localPoint = new Point();

  #viewport: Size;
  #zoom: number;

  #selectedTile: TileCoord | null = null;
  #hoveredTile: TileCoord | null = null;

  #dragging = false;
  #dragMoved = 0;
  #pressSurfacePoint: PointData = { x: 0, y: 0 };
  #pressViewPosition: PointData = { x: 0, y: 0 };

  constructor(options: TilemapControllerOptions) {
    super();

    const {
      view,
      surface,
      viewport,
      zoomLevels = DEFAULT_ZOOM_LEVELS,
      zoom = 2,
      wheelZoom = true,
      wheelHost,
      wheelThreshold = 40,
      clickSlop = 4,
    } = options;

    if (view.parent !== surface) {
      throw new Error('TilemapController requires `view` to be a direct child of `surface`');
    }

    this.view = view;
    this.surface = surface;
    this.#viewport = viewport;
    this.#zoomLevels = normalizeZoomLevels(zoomLevels);
    this.#clickSlop = clickSlop;
    this.#wheelHost = wheelZoom ? wheelHost : undefined;
    this.#wheelAccumulator = new WheelStepAccumulator({ threshold: wheelThreshold });
    this.#zoom = snapToZoomLevel(this.#zoomLevels, zoom);

    this.view.scale.set(this.#zoom);

    surface.eventMode = 'static';
    surface.hitArea = new Rectangle(0, 0, viewport.width, viewport.height);
    surface.cursor = 'grab';

    // One unified pointer stream covers mouse, touch and pen. The 2022 code
    // wired eight separate mouse*/touch* handlers for the same three gestures.
    surface.on('pointerdown', this.#onPointerDown);
    surface.on('pointermove', this.#onPointerMove);
    surface.on('pointerup', this.#onPointerUp);
    surface.on('pointerupoutside', this.#onPointerUp);
    surface.on('pointerleave', this.#onPointerLeave);

    // Non-passive, so preventDefault() actually stops the page scrolling and
    // stops a trackpad pinch zooming the browser.
    this.#wheelHost?.canvas.addEventListener('wheel', this.#onWheel, { passive: false });

    this.constrain();
  }

  get zoom(): number {
    return this.#zoom;
  }

  /** The allowed zoom factors, ascending. */
  get zoomLevels(): readonly number[] {
    return this.#zoomLevels;
  }

  get minZoom(): number {
    return this.#zoomLevels[0] as number;
  }

  get maxZoom(): number {
    return this.#zoomLevels[this.#zoomLevels.length - 1] as number;
  }

  get selectedTile(): TileCoord | null {
    return this.#selectedTile;
  }

  get hoveredTile(): TileCoord | null {
    return this.#hoveredTile;
  }

  get viewport(): Size {
    return this.#viewport;
  }

  /** Updates the visible area after the canvas is resized. */
  setViewport(viewport: Size): void {
    this.#viewport = viewport;
    this.surface.hitArea = new Rectangle(0, 0, viewport.width, viewport.height);
    this.constrain();
  }

  /** Selects a tile programmatically and emits `tileselect`. */
  select(tile: TileCoord): void {
    if (!this.view.model.inBounds(tile.x, tile.y)) {
      return;
    }

    this.#selectedTile = tile;
    this.emit('tileselect', tile);
  }

  /** Moves one stop up the zoom ladder, keeping the viewport centre fixed. */
  zoomIn(): void {
    this.#zoomBySteps(1);
  }

  /** Moves one stop down the zoom ladder, keeping the viewport centre fixed. */
  zoomOut(): void {
    this.#zoomBySteps(-1);
  }

  /**
   * Sets the zoom factor, snapped to the nearest allowed level.
   *
   * Rescales around the viewport centre, so the camera stays put. Pass `focus`
   * to centre on a tile afterwards.
   */
  setZoom(zoom: number, focus?: TileCoord): void {
    const next = snapToZoomLevel(this.#zoomLevels, zoom);

    if (next !== this.#zoom) {
      this.#applyZoom(next, this.#viewportCenter());
    }

    if (focus) {
      this.centerOn(focus);
    }
  }

  /** Centres the viewport on a tile, then re-applies the bounds constraint. */
  centerOn(tile: TileCoord): void {
    const { tileSize } = this.view;

    this.view.position.set(
      this.#viewport.width / 2 - (tile.x + 0.5) * tileSize * this.#zoom,
      this.#viewport.height / 2 - (tile.y + 0.5) * tileSize * this.#zoom,
    );
    this.constrain();
  }

  /** The tile currently under the centre of the viewport. */
  centerTile(): TileCoord {
    const { tileSize } = this.view;

    return {
      x: Math.floor((this.#viewport.width / 2 - this.view.position.x) / (tileSize * this.#zoom)),
      y: Math.floor((this.#viewport.height / 2 - this.view.position.y) / (tileSize * this.#zoom)),
    };
  }

  /**
   * Keeps the map inside the viewport: clamped to the edges when it is larger
   * than the viewport, centred when it is smaller.
   */
  constrain(): void {
    const contentWidth = this.view.pixelWidth * this.#zoom;
    const contentHeight = this.view.pixelHeight * this.#zoom;

    this.view.position.set(
      axisConstrain(this.view.position.x, contentWidth, this.#viewport.width),
      axisConstrain(this.view.position.y, contentHeight, this.#viewport.height),
    );
  }

  /** Detaches every listener. Does not destroy the view. */
  destroy(): void {
    this.surface.off('pointerdown', this.#onPointerDown);
    this.surface.off('pointermove', this.#onPointerMove);
    this.surface.off('pointerup', this.#onPointerUp);
    this.surface.off('pointerupoutside', this.#onPointerUp);
    this.surface.off('pointerleave', this.#onPointerLeave);

    this.#wheelHost?.canvas.removeEventListener('wheel', this.#onWheel);

    this.removeAllListeners();
  }

  /**
   * Rescales around a fixed point in surface space.
   *
   * The maths runs off `view.position` and the current zoom rather than
   * `getLocalPosition`, because the view's world transform is only recomputed
   * at render time — reading it back inside the same frame as a scale change
   * yields the previous frame's value.
   */
  #applyZoom(next: number, surfaceAnchor: PointData): void {
    const viewX = (surfaceAnchor.x - this.view.position.x) / this.#zoom;
    const viewY = (surfaceAnchor.y - this.view.position.y) / this.#zoom;

    this.#zoom = next;
    this.view.scale.set(next);
    this.view.position.set(surfaceAnchor.x - viewX * next, surfaceAnchor.y - viewY * next);
    this.constrain();
    this.emit('zoomchange', next);
  }

  #zoomBySteps(steps: number, surfaceAnchor?: PointData): void {
    const next = stepZoomLevel(this.#zoomLevels, this.#zoom, steps);

    if (next === this.#zoom) {
      return;
    }

    this.#applyZoom(next, surfaceAnchor ?? this.#viewportCenter());
  }

  #viewportCenter(): PointData {
    return { x: this.#viewport.width / 2, y: this.#viewport.height / 2 };
  }

  #onPointerDown = (event: FederatedPointerEvent): void => {
    const surfacePoint = event.getLocalPosition(this.surface);

    this.#dragging = true;
    this.#dragMoved = 0;
    this.#pressSurfacePoint = { x: surfacePoint.x, y: surfacePoint.y };
    this.#pressViewPosition = { x: this.view.position.x, y: this.view.position.y };
    this.surface.cursor = 'grabbing';
  };

  #onPointerMove = (event: FederatedPointerEvent): void => {
    if (this.#dragging) {
      const surfacePoint = event.getLocalPosition(this.surface);
      const dx = surfacePoint.x - this.#pressSurfacePoint.x;
      const dy = surfacePoint.y - this.#pressSurfacePoint.y;

      this.#dragMoved = Math.max(this.#dragMoved, Math.hypot(dx, dy));
      this.view.position.set(this.#pressViewPosition.x + dx, this.#pressViewPosition.y + dy);
      this.constrain();
      return;
    }

    this.#setHovered(this.#tileUnder(event));
  };

  #onPointerUp = (event: FederatedPointerEvent): void => {
    if (!this.#dragging) {
      return;
    }

    this.#dragging = false;
    this.surface.cursor = 'grab';

    // A press that barely moved is a click, not a drag.
    if (this.#dragMoved <= this.#clickSlop) {
      const tile = this.#tileUnder(event);

      if (tile) {
        this.select(tile);
      }
    }
  };

  #onPointerLeave = (): void => {
    this.#setHovered(null);
  };

  #onWheel = (event: WheelEvent): void => {
    const host = this.#wheelHost;

    if (!host) {
      return;
    }

    // The canvas belongs to the map, so the page never scrolls under it —
    // whether or not this particular event ends up changing the zoom.
    event.preventDefault();

    host.mapPositionToPoint(this.#globalPoint, event.clientX, event.clientY);
    const surfacePoint = this.surface.toLocal(this.#globalPoint, undefined, this.#localPoint);

    if (!this.#insideViewport(surfacePoint)) {
      return;
    }

    const steps = this.#wheelAccumulator.push(event);

    if (steps !== 0) {
      this.#zoomBySteps(steps, surfacePoint);
    }
  };

  #insideViewport(point: PointData): boolean {
    return (
      point.x >= 0 &&
      point.y >= 0 &&
      point.x <= this.#viewport.width &&
      point.y <= this.#viewport.height
    );
  }

  #tileUnder(event: FederatedPointerEvent): TileCoord | null {
    const tile = this.view.tileAt(event.getLocalPosition(this.view));
    return this.view.model.inBounds(tile.x, tile.y) ? tile : null;
  }

  #setHovered(tile: TileCoord | null): void {
    const current = this.#hoveredTile;

    if (current?.x === tile?.x && current?.y === tile?.y) {
      return;
    }

    this.#hoveredTile = tile;
    this.emit('tilehover', tile);
  }
}

/** Clamps one axis: pinned to the edges when larger than the viewport, centred when smaller. */
function axisConstrain(position: number, contentSize: number, viewportSize: number): number {
  if (contentSize <= viewportSize) {
    return (viewportSize - contentSize) / 2;
  }

  return Math.min(Math.max(position, viewportSize - contentSize), 0);
}
