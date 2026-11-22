import { describe, expect, it, vi } from 'vitest';
import { TilemapModel } from '../src/TilemapModel';

describe('TilemapModel', () => {
  it('rejects non-positive dimensions', () => {
    expect(() => new TilemapModel({ width: 0, height: 4 })).toThrow(RangeError);
    expect(() => new TilemapModel({ width: 4, height: -1 })).toThrow(RangeError);
    expect(() => new TilemapModel({ width: 1.5, height: 4 })).toThrow(RangeError);
  });

  it('starts filled with the requested terrain', () => {
    const model = new TilemapModel({ width: 3, height: 2, fill: 7 });

    expect(model.size).toBe(6);
    model.forEach((_x, _y, terrain) => expect(terrain).toBe(7));
  });

  it('reports bounds without throwing, and throws on out-of-range reads', () => {
    const model = new TilemapModel({ width: 2, height: 2 });

    expect(model.inBounds(1, 1)).toBe(true);
    expect(model.inBounds(2, 0)).toBe(false);
    expect(model.inBounds(-1, 0)).toBe(false);
    expect(model.tryGet(2, 0)).toBeUndefined();
    expect(() => model.get(2, 0)).toThrow(RangeError);
  });

  it('uses a row-major layout that round-trips through indexOf', () => {
    const model = new TilemapModel({ width: 4, height: 3 });

    expect(model.indexOf(0, 0)).toBe(0);
    expect(model.indexOf(3, 0)).toBe(3);
    expect(model.indexOf(0, 1)).toBe(4);
    expect(model.indexOf(3, 2)).toBe(11);
  });

  it('only reports a change when the value actually differs', () => {
    const model = new TilemapModel({ width: 2, height: 2 });
    const listener = vi.fn();
    model.onChange(listener);

    expect(model.set(1, 1, 3)).toBe(true);
    expect(model.set(1, 1, 3)).toBe(false);
    expect(model.set(9, 9, 3)).toBe(false);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ x: 1, y: 1, previous: 0, current: 3 });
  });

  it('stops notifying after unsubscribe', () => {
    const model = new TilemapModel({ width: 2, height: 2 });
    const listener = vi.fn();
    const unsubscribe = model.onChange(listener);

    model.set(0, 0, 1);
    unsubscribe();
    model.set(0, 1, 1);

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('finds every tile of a terrain', () => {
    const model = new TilemapModel({ width: 3, height: 3 });
    model.set(0, 0, 2);
    model.set(2, 1, 2);

    expect(model.findTiles(2)).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ]);
    expect(model.findTiles(9)).toEqual([]);
  });

  it('clones without sharing storage', () => {
    const model = new TilemapModel({ width: 2, height: 2 });
    model.set(0, 0, 5);

    const copy = model.clone();
    copy.set(1, 1, 6);

    expect(copy.get(0, 0)).toBe(5);
    expect(model.get(1, 1)).toBe(0);
  });

  it('round-trips through JSON', () => {
    const model = new TilemapModel({ width: 3, height: 2 });
    model.set(2, 1, 4);

    const restored = TilemapModel.fromJSON(JSON.parse(JSON.stringify(model)));

    expect(restored.width).toBe(3);
    expect(restored.height).toBe(2);
    expect(restored.get(2, 1)).toBe(4);
  });

  it('rejects JSON whose cell count does not match its dimensions', () => {
    expect(() => TilemapModel.fromJSON({ width: 2, height: 2, cells: [1, 2, 3] })).toThrow(
      RangeError,
    );
  });
});
