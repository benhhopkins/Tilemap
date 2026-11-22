/** The parts of a wheel event this accumulator needs. */
export interface WheelDelta {
  deltaY: number;
  /** `0` pixels, `1` lines, `2` pages — see `WheelEvent.deltaMode`. */
  deltaMode: number;
  /** A trackpad pinch arrives as a wheel event with this set. */
  ctrlKey: boolean;
}

export interface WheelStepAccumulatorOptions {
  /** Scroll distance, in normalised pixels, that makes one zoom step. Defaults to `40`. */
  threshold?: number;
  /** Pinch deltas are an order of magnitude smaller than wheel deltas. Defaults to `4`. */
  pinchMultiplier?: number;
  /** A pause longer than this (ms) starts a new gesture. Defaults to `300`. */
  gestureTimeout?: number;
  /** Clock, injectable for tests. Defaults to `Date.now`. */
  now?: () => number;
}

/** One line of scroll, in pixels. */
const PIXELS_PER_LINE = 16;
/** One page of scroll, in pixels. */
const PIXELS_PER_PAGE = 100;

/**
 * Turns a stream of wheel events into discrete zoom steps.
 *
 * Wheel input is wildly inconsistent: a mouse notch is one large event
 * (`deltaY` 100 in Chrome, 3 lines in Firefox), a trackpad swipe is dozens of
 * small ones, and a trackpad pinch is smaller still and flagged with `ctrlKey`.
 * Applying a zoom step per event — which is what the first version of this
 * project did — makes a mouse feel coarse and a trackpad feel uncontrollable.
 *
 * So: normalise every event to pixels, cap what a single event may contribute
 * to one step's worth, and accumulate until a threshold is crossed. One mouse
 * notch becomes exactly one step; a trackpad gesture becomes one step per
 * `threshold` pixels of travel.
 */
export class WheelStepAccumulator {
  readonly #threshold: number;
  readonly #pinchMultiplier: number;
  readonly #gestureTimeout: number;
  readonly #now: () => number;

  #accumulated = 0;
  #lastEventAt = Number.NEGATIVE_INFINITY;

  constructor(options: WheelStepAccumulatorOptions = {}) {
    const { threshold = 40, pinchMultiplier = 4, gestureTimeout = 300, now = Date.now } = options;

    if (threshold <= 0) {
      throw new RangeError(`threshold must be greater than 0, received ${threshold}`);
    }

    this.#threshold = threshold;
    this.#pinchMultiplier = pinchMultiplier;
    this.#gestureTimeout = gestureTimeout;
    this.#now = now;
  }

  /**
   * Feeds one wheel event in.
   *
   * @returns how many zoom steps to apply: positive to zoom in (scroll up or
   * pinch out), negative to zoom out, `0` when the gesture has not travelled
   * far enough yet.
   */
  push(event: WheelDelta): number {
    const timestamp = this.#now();

    if (timestamp - this.#lastEventAt > this.#gestureTimeout) {
      this.#accumulated = 0;
    }

    this.#lastEventAt = timestamp;

    // Scrolling up gives a negative deltaY but should zoom in, so flip the sign
    // here and let the rest of the class think in "zoom-in is positive".
    let delta = -normalizePixels(event.deltaY, event.deltaMode);

    if (event.ctrlKey) {
      delta *= this.#pinchMultiplier;
    }

    // A reversal is a new intent, not something to subtract from built-up travel.
    if (delta !== 0 && Math.sign(delta) !== Math.sign(this.#accumulated)) {
      this.#accumulated = 0;
    }

    // No single event may be worth more than one step, so a 100px mouse notch
    // and a 48px one both land on exactly one step.
    this.#accumulated += clamp(delta, -this.#threshold, this.#threshold);

    const steps = Math.trunc(this.#accumulated / this.#threshold);
    this.#accumulated -= steps * this.#threshold;

    // Math.trunc yields -0 for a small negative travel; normalise it so
    // callers can compare against 0 without surprises.
    return steps === 0 ? 0 : steps;
  }

  /** Forgets any partial travel. */
  reset(): void {
    this.#accumulated = 0;
    this.#lastEventAt = Number.NEGATIVE_INFINITY;
  }
}

/** Converts a wheel delta into pixels, whatever unit the browser reported it in. */
export function normalizePixels(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) {
    return deltaY * PIXELS_PER_LINE;
  }

  if (deltaMode === 2) {
    return deltaY * PIXELS_PER_PAGE;
  }

  return deltaY;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
