import { describe, expect, it } from 'vitest';
import { WheelStepAccumulator, normalizePixels } from '../src/WheelStepAccumulator';

/** A clock the tests drive by hand. */
function fakeClock(start = 1000) {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

function wheel(deltaY: number, options: { deltaMode?: number; ctrlKey?: boolean } = {}) {
  return { deltaY, deltaMode: options.deltaMode ?? 0, ctrlKey: options.ctrlKey ?? false };
}

describe('normalizePixels', () => {
  it('passes pixel deltas through', () => {
    expect(normalizePixels(100, 0)).toBe(100);
  });

  it('converts line and page deltas', () => {
    expect(normalizePixels(3, 1)).toBe(48);
    expect(normalizePixels(2, 2)).toBe(200);
  });
});

describe('WheelStepAccumulator', () => {
  it('rejects a non-positive threshold', () => {
    expect(() => new WheelStepAccumulator({ threshold: 0 })).toThrow(RangeError);
  });

  it('turns one Chrome mouse notch into exactly one step', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ now: clock.now });

    // Chrome reports 100px per notch; without the per-event cap that would be
    // 2.5 steps and the zoom would leap.
    expect(acc.push(wheel(-100))).toBe(1);
    clock.advance(16);
    expect(acc.push(wheel(-100))).toBe(1);
  });

  it('turns one Firefox mouse notch into exactly one step', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ now: clock.now });

    // Firefox reports 3 lines = 48px.
    expect(acc.push(wheel(-3, { deltaMode: 1 }))).toBe(1);
  });

  it('zooms in when scrolling up and out when scrolling down', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ now: clock.now });

    expect(acc.push(wheel(-100))).toBe(1);
    clock.advance(16);
    expect(acc.push(wheel(100))).toBe(-1);
  });

  it('accumulates small trackpad deltas instead of stepping per event', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ threshold: 40, now: clock.now });
    const steps: number[] = [];

    // A trackpad swipe: many small events in quick succession.
    for (let i = 0; i < 10; i++) {
      steps.push(acc.push(wheel(-8)));
      clock.advance(10);
    }

    // 10 x 8px = 80px of travel = exactly two steps, not ten.
    expect(steps.filter((s) => s !== 0)).toEqual([1, 1]);
    expect(steps.reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('amplifies a trackpad pinch, which reports much smaller deltas', () => {
    const clock = fakeClock();
    const plain = new WheelStepAccumulator({ now: clock.now });
    const pinch = new WheelStepAccumulator({ now: clock.now });

    // The same tiny delta, repeated: 15px of travel as a scroll, which is
    // below the 40px threshold, but 60px once the pinch multiplier applies.
    let plainSteps = 0;
    let pinchSteps = 0;

    for (let i = 0; i < 6; i++) {
      plainSteps += plain.push(wheel(-2.5));
      pinchSteps += pinch.push(wheel(-2.5, { ctrlKey: true }));
      clock.advance(10);
    }

    expect(plainSteps).toBe(0);
    expect(pinchSteps).toBe(1);
  });

  it('drops built-up travel when the direction reverses', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ threshold: 40, now: clock.now });

    acc.push(wheel(-30)); // 30px towards zooming in, no step yet
    clock.advance(10);

    // Reversing should not need 30px of "undo" first.
    expect(acc.push(wheel(30))).toBe(0);
    clock.advance(10);
    expect(acc.push(wheel(30))).toBe(-1);
  });

  it('forgets partial travel after a pause', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ threshold: 40, gestureTimeout: 300, now: clock.now });

    acc.push(wheel(-30));
    clock.advance(500);

    // A new gesture starts from zero, so 30px is not enough on its own.
    expect(acc.push(wheel(-30))).toBe(0);
  });

  it('keeps partial travel within one gesture', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ threshold: 40, gestureTimeout: 300, now: clock.now });

    expect(acc.push(wheel(-30))).toBe(0);
    clock.advance(50);
    expect(acc.push(wheel(-30))).toBe(1);
  });

  it('resets on demand', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ threshold: 40, now: clock.now });

    acc.push(wheel(-30));
    acc.reset();
    clock.advance(10);

    expect(acc.push(wheel(-30))).toBe(0);
  });

  it('ignores zero deltas', () => {
    const clock = fakeClock();
    const acc = new WheelStepAccumulator({ now: clock.now });

    expect(acc.push(wheel(0))).toBe(0);
  });
});
