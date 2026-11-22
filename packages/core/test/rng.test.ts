import { describe, expect, it } from 'vitest';
import { mulberry32, randomInt, systemRng } from '../src/rng';

describe('mulberry32', () => {
  it('repeats its sequence for a given seed', () => {
    const a = mulberry32(2026);
    const b = mulberry32(2026);
    const first = Array.from({ length: 16 }, () => a.next());
    const second = Array.from({ length: 16 }, () => b.next());

    expect(second).toEqual(first);
  });

  it('diverges for different seeds', () => {
    expect(mulberry32(1).next()).not.toBe(mulberry32(2).next());
  });

  it('stays inside [0, 1)', () => {
    const rng = mulberry32(7);

    for (let i = 0; i < 2000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomInt', () => {
  it('stays inside [0, maxExclusive)', () => {
    const rng = mulberry32(13);

    for (let i = 0; i < 2000; i++) {
      const value = randomInt(rng, 10);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(10);
    }
  });

  it('covers the whole range', () => {
    const rng = mulberry32(21);
    const seen = new Set<number>();

    for (let i = 0; i < 500; i++) {
      seen.add(randomInt(rng, 4));
    }

    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });
});

describe('systemRng', () => {
  it('returns values inside [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const value = systemRng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
