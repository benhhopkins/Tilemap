/**
 * Zoom is a short list of allowed factors rather than a free-floating number.
 *
 * For pixel art that is not a limitation but the point: a fractional scale
 * makes nearest-neighbour sampling render some tile rows one device pixel
 * taller than their neighbours, which shimmers as the map moves. Integer
 * factors keep every tile identical.
 *
 * The default ladder is `[1, 2, 3, 4, 6, 8]` — six stops instead of the four
 * that doubling gives, so a wheel gesture has somewhere to land between 2x and
 * 4x.
 */
export const DEFAULT_ZOOM_LEVELS: readonly number[] = [1, 2, 3, 4, 6, 8];

/** Validates and normalises a zoom ladder: finite, positive, ascending, no duplicates. */
export function normalizeZoomLevels(levels: readonly number[]): number[] {
  if (levels.length === 0) {
    throw new RangeError('zoomLevels must contain at least one level');
  }

  for (const level of levels) {
    if (!Number.isFinite(level) || level <= 0) {
      throw new RangeError(`zoom levels must be finite and greater than 0, received ${level}`);
    }
  }

  return [...new Set(levels)].sort((a, b) => a - b);
}

/** Index of the level closest to `zoom`; ties go to the lower level. */
export function nearestZoomIndex(levels: readonly number[], zoom: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < levels.length; i++) {
    const distance = Math.abs((levels[i] as number) - zoom);

    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/** The level closest to `zoom`. */
export function snapToZoomLevel(levels: readonly number[], zoom: number): number {
  return levels[nearestZoomIndex(levels, zoom)] as number;
}

/**
 * Moves `steps` stops along the ladder from whichever level is closest to
 * `zoom`, clamped at both ends.
 */
export function stepZoomLevel(levels: readonly number[], zoom: number, steps: number): number {
  const from = nearestZoomIndex(levels, zoom);
  const to = Math.min(Math.max(from + steps, 0), levels.length - 1);

  return levels[to] as number;
}
