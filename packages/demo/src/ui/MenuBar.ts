import { Container, Graphics, Text } from 'pixi.js';
import type { TileCoord } from '@pixitilemap/core';
import { TextButton } from './TextButton';

export interface MenuBarOptions {
  width: number;
  height: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRegenerate: () => void;
}

/** Human-readable names for the terrain ids in `tiles.json`. */
const TERRAIN_NAMES: Record<number, string> = {
  0: 'Ocean',
  1: 'Shore',
  2: 'Grassland',
  3: 'Hills',
  4: 'Mountains',
  5: 'Outpost',
  6: 'Village',
  7: 'City',
  8: 'Farms',
  9: 'Mine',
};

/**
 * The demo's side panel.
 *
 * It talks to the map only through the callbacks it is given and the setters it
 * exposes. The 2022 version reached straight into module-level globals in both
 * directions — `menu.js` called `tilemap.zoomIn`, and `tilemap.js` wrote into
 * `menu.selectedTileText.text`, so neither file could be used without the
 * other.
 */
export class MenuBar extends Container {
  readonly #selectionValue: Text;
  readonly #terrainValue: Text;
  readonly #zoomValue: Text;
  readonly #seedValue: Text;

  constructor(options: MenuBarOptions) {
    super({ label: 'MenuBar' });

    const { width, height, onZoomIn, onZoomOut, onRegenerate } = options;

    const background = new Graphics()
      .rect(0, 0, width - 4, height)
      .fill(0x203040)
      .rect(width - 4, 0, 4, height)
      .fill(0xa08000);
    this.addChild(background);

    // The panel sits beside the map, not on top of it, so it needs no
    // interaction of its own beyond its buttons.
    this.eventMode = 'static';

    const buttonSize = 40;
    const gap = 8;
    const margin = 12;

    const zoomOut = new TextButton({
      label: '−',
      width: buttonSize,
      height: buttonSize,
      onPress: onZoomOut,
    });
    zoomOut.position.set(margin, margin);

    const zoomIn = new TextButton({
      label: '+',
      width: buttonSize,
      height: buttonSize,
      onPress: onZoomIn,
    });
    zoomIn.position.set(margin + buttonSize + gap, margin);

    const regenerate = new TextButton({
      label: 'New map',
      width: width - margin * 2 - 4,
      height: 30,
      style: { fontSize: 14 },
      onPress: onRegenerate,
    });
    regenerate.position.set(margin, margin + buttonSize + gap);

    this.addChild(zoomOut, zoomIn, regenerate);

    let y = margin + buttonSize + gap + 30 + 20;
    const addRow = (caption: string): Text => {
      this.addChild(this.#createLabel(caption, margin, y));
      const value = this.#createValue(margin, y + 14);
      this.addChild(value);
      y += 42;
      return value;
    };

    this.#selectionValue = addRow('SELECTED TILE');
    this.#terrainValue = addRow('TERRAIN');
    this.#zoomValue = addRow('ZOOM');
    this.#seedValue = addRow('SEED');

    const hint = new Text({
      text: 'Drag to pan\nScroll to zoom\nClick to select',
      style: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 11,
        fill: '#7f94a8',
        lineHeight: 16,
      },
    });
    hint.position.set(margin, height - 64);
    this.addChild(hint);
  }

  setSelection(tile: TileCoord | null, terrain: number | null): void {
    this.#selectionValue.text = tile ? `${tile.x}, ${tile.y}` : '—';
    this.#terrainValue.text =
      terrain === null ? '—' : (TERRAIN_NAMES[terrain] ?? `Terrain ${terrain}`);
  }

  setZoom(zoom: number): void {
    this.#zoomValue.text = `${zoom}×`;
  }

  setSeed(seed: number): void {
    this.#seedValue.text = String(seed);
  }

  #createLabel(text: string, x: number, y: number): Text {
    const label = new Text({
      text,
      style: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 9,
        fill: '#7f94a8',
        letterSpacing: 1,
      },
    });
    label.position.set(x, y);
    return label;
  }

  #createValue(x: number, y: number): Text {
    const value = new Text({
      text: '—',
      style: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 15,
        fill: '#ffffff',
      },
    });
    value.position.set(x, y);
    return value;
  }
}
