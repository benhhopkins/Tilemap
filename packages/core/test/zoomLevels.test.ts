import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ZOOM_LEVELS,
  nearestZoomIndex,
  normalizeZoomLevels,
  snapToZoomLevel,
  stepZoomLevel,
} from '../src/zoomLevels';

describe('normalizeZoomLevels', () => {
  it('sorts and de-duplicates', () => {
    expect(normalizeZoomLevels([4, 1, 2, 4])).toEqual([1, 2, 4]);
  });

  it('rejects an empty ladder', () => {
    expect(() => normalizeZoomLevels([])).toThrow(RangeError);
  });

  it('rejects non-positive and non-finite levels', () => {
    expect(() => normalizeZoomLevels([1, 0])).toThrow(RangeError);
    expect(() => normalizeZoomLevels([1, -2])).toThrow(RangeError);
    expect(() => normalizeZoomLevels([1, Number.NaN])).toThrow(RangeError);
    expect(() => normalizeZoomLevels([1, Number.POSITIVE_INFINITY])).toThrow(RangeError);
  });

  it('keeps the default ladder to whole numbers, so pixel art stays crisp', () => {
    for (const level of DEFAULT_ZOOM_LEVELS) {
      expect(Number.isInteger(level)).toBe(true);
    }
  });
});

describe('snapToZoomLevel', () => {
  const levels = [1, 2, 3, 4, 6, 8];

  it('returns the closest level', () => {
    expect(snapToZoomLevel(levels, 3.4)).toBe(3);
    expect(snapToZoomLevel(levels, 3.6)).toBe(4);
    expect(snapToZoomLevel(levels, 5)).toBe(4);
    expect(snapToZoomLevel(levels, 7)).toBe(6);
  });

  it('clamps outside the ladder', () => {
    expect(snapToZoomLevel(levels, 0.1)).toBe(1);
    expect(snapToZoomLevel(levels, 1000)).toBe(8);
  });

  it('breaks ties towards the lower level', () => {
    expect(nearestZoomIndex(levels, 5)).toBe(3);
    expect(snapToZoomLevel(levels, 5)).toBe(4);
  });
});

describe('stepZoomLevel', () => {
  const levels = [1, 2, 3, 4, 6, 8];

  it('moves one stop at a time', () => {
    expect(stepZoomLevel(levels, 2, 1)).toBe(3);
    expect(stepZoomLevel(levels, 4, -1)).toBe(3);
  });

  it('moves several stops at once', () => {
    expect(stepZoomLevel(levels, 1, 3)).toBe(4);
    expect(stepZoomLevel(levels, 8, -2)).toBe(4);
    expect(stepZoomLevel(levels, 8, -3)).toBe(3);
  });

  it('clamps at both ends instead of wrapping', () => {
    expect(stepZoomLevel(levels, 8, 5)).toBe(8);
    expect(stepZoomLevel(levels, 1, -5)).toBe(1);
  });

  it('starts from the nearest level when the current zoom is off-ladder', () => {
    expect(stepZoomLevel(levels, 3.4, 1)).toBe(4);
  });

  it('is a no-op for zero steps', () => {
    expect(stepZoomLevel(levels, 3, 0)).toBe(3);
  });
});
