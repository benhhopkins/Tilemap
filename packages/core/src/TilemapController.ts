import { EventEmitter, Rectangle } from 'pixi.js';
import type { Container, FederatedPointerEvent, FederatedWheelEvent, PointData } from 'pixi.js';
import type { TilemapView } from './TilemapView';
import type { Size, TileCoord } from './types';

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
  /** Starting zoom factor. Defaults to `2`. */
  zoom?: number;
  /** Lower zoom bound. Defaults to `1`. */
  minZoom?: number;
  /** Upper zoom bound. Defaults to `8`. */
  maxZoom?: number;
  /** Multiplier applied by {@link TilemapController.zoomIn}. Defaults to `2`. */
  zoomStep?: number;
  /** Enables zooming with the mouse wheel, anchored at the cursor. Defaults to `true`. */
  wheelZoom?: boolean;
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

  #viewport: Size;
  #zoom: number;
  readonly #minZoom: number;
  readonly #maxZoom: number;
  readonly #zoomStep: number;
  readonly #clickSlop: number;
  readonly #wheelZoom: boolean;

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
      zoom = 2,
      minZoom = 1,
      maxZoom = 8,
      zoomStep = 2,
      wheelZoom = true,
      clickSlop = 4,
    } = options;

    if (view.parent !== surface) {
      throw new Error('TilemapController requires `view` to be a direct child of `surface`');
    }

    this.view = view;
    this.surface = surface;
    this.#viewport = viewport;
    this.#minZoom = minZoom;
    this.#maxZoom = maxZoom;
    this.#zoomStep = zoomStep;
    this.#wheelZoom = wheelZoom;
    this.#clickSlop = clickSlop;
    this.#zoom = clamp(zoom, minZoom, maxZoom);

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

    if (wheelZoom) {
      surface.on('wheel', this.#onWheel);
    }

    this.constrain();
  }

  get zoom(): number {
    return this.#zoom;
  }

  get minZoom(): number {
    return this.#minZoom;
  }

  get maxZoom(): number {
    return this.#maxZoom;
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

  zoomIn(): void {
    this.setZoom(this.#zoom * this.#zoomStep);
  }

  zoomOut(): void {
    this.setZoom(this.#zoom / this.#zoomStep);
  }

  /**
   * Sets the zoom factor, keeping `focus` under the viewport centre.
   * Defaults to focusing the selected tile, falling back to whatever tile is
   * currently centred, so zooming never teleports the camera.
   */
  setZoom(zoom: number, focus?: TileCoord): void {
    const next = clamp(zoom, this.#minZoom, this.#maxZoom);

    if (next === this.#zoom) {
      return;
    }

    const anchor = focus ?? this.#selectedTile ?? this.centerTile();

    this.#zoom = next;
    this.view.scale.set(next);
    this.centerOn(anchor);
    this.emit('zoomchange', next);
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

    if (this.#wheelZoom) {
      this.surface.off('wheel', this.#onWheel);
    }

    this.removeAllListeners();
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

  #onWheel = (event: FederatedWheelEvent): void => {
    const direction = event.deltaY < 0 ? this.#zoomStep : 1 / this.#zoomStep;
    const next = clamp(this.#zoom * direction, this.#minZoom, this.#maxZoom);

    if (next === this.#zoom) {
      return;
    }

    // Keep the tile under the cursor pinned while the scale changes.
    const viewPoint = event.getLocalPosition(this.view);
    const surfacePoint = event.getLocalPosition(this.surface);

    this.#zoom = next;
    this.view.scale.set(next);
    this.view.position.set(
      surfacePoint.x - viewPoint.x * next,
      surfacePoint.y - viewPoint.y * next,
    );
    this.constrain();
    this.emit('zoomchange', next);
  };

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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Clamps one axis: pinned to the edges when larger than the viewport, centred when smaller. */
function axisConstrain(position: number, contentSize: number, viewportSize: number): number {
  if (contentSize <= viewportSize) {
    return (viewportSize - contentSize) / 2;
  }

  return Math.min(Math.max(position, viewportSize - contentSize), 0);
}
