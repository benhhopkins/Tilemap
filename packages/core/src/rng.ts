/**
 * Minimal random-number source.
 *
 * The core never calls `Math.random()` directly: every random decision goes
 * through an `Rng`, so maps can be reproduced exactly from a seed (useful for
 * tests, bug reports and shared world generation).
 */
export interface Rng {
  /** Returns a float in the half-open interval `[0, 1)`. */
  next(): number;
}

/** An {@link Rng} backed by `Math.random()`. Non-reproducible. */
export const systemRng: Rng = {
  next: () => Math.random(),
};

/**
 * Deterministic 32-bit PRNG (mulberry32). Same seed, same sequence, on every
 * platform and every run.
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;

  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** Returns an integer in `[0, maxExclusive)`. */
export function randomInt(rng: Rng, maxExclusive: number): number {
  return Math.floor(rng.next() * maxExclusive);
}
