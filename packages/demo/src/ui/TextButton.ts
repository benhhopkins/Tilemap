import { Container, Graphics, Text } from 'pixi.js';
import type { ColorSource, TextStyleOptions } from 'pixi.js';

export interface TextButtonOptions {
  label: string;
  width: number;
  height: number;
  onPress: () => void;
  style?: TextStyleOptions;
  background?: ColorSource;
  backgroundHover?: ColorSource;
  backgroundActive?: ColorSource;
}

/**
 * A small push button: one background, one label, three colours.
 *
 * The 2022 menu allocated a brand new `PIXI.TextStyle` on every `mouseover`,
 * `mouseout`, `mousedown` and `mouseup`, which re-rasterises the glyph texture
 * each time. Here the style is created once and only the background colour
 * changes, so hovering costs nothing.
 */
export class TextButton extends Container {
  readonly #background: Graphics;
  readonly #buttonWidth: number;
  readonly #buttonHeight: number;
  readonly #idleColor: ColorSource;
  readonly #hoverColor: ColorSource;
  readonly #activeColor: ColorSource;
  #pressed = false;

  constructor(options: TextButtonOptions) {
    super({ label: `TextButton(${options.label})` });

    const {
      label,
      width,
      height,
      onPress,
      style,
      background = 0x2f4256,
      backgroundHover = 0x3f5a76,
      backgroundActive = 0x7a4a1c,
    } = options;

    this.#buttonWidth = width;
    this.#buttonHeight = height;
    this.#idleColor = background;
    this.#hoverColor = backgroundHover;
    this.#activeColor = backgroundActive;

    this.#background = new Graphics();
    this.addChild(this.#background);
    this.#paint(background);

    const text = new Text({
      text: label,
      style: {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 22,
        fill: '#ffffff',
        ...style,
      },
    });
    text.anchor.set(0.5);
    text.position.set(width / 2, height / 2);
    this.addChild(text);

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.on('pointerover', () => {
      if (!this.#pressed) {
        this.#paint(this.#hoverColor);
      }
    });
    this.on('pointerout', () => {
      this.#pressed = false;
      this.#paint(this.#idleColor);
    });
    this.on('pointerdown', () => {
      this.#pressed = true;
      this.#paint(this.#activeColor);
    });
    this.on('pointerupoutside', () => {
      this.#pressed = false;
      this.#paint(this.#idleColor);
    });
    this.on('pointerup', () => {
      this.#pressed = false;
      this.#paint(this.#hoverColor);
      onPress();
    });
  }

  #paint(color: ColorSource): void {
    this.#background.clear().roundRect(0, 0, this.#buttonWidth, this.#buttonHeight, 4).fill(color);
  }
}
