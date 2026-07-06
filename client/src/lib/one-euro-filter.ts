// One-Euro filter — TypeScript port of majorSignL/utils/one_euro_filter.py
// Low-compute adaptive smoothing for noisy landmark streams. Cheap enough to run
// per-coordinate on every landmark, every frame.

function alpha(cutoff: number, freq: number): number {
  const te = 1.0 / freq;
  const tau = 1.0 / (2 * Math.PI * cutoff);
  return 1.0 / (1.0 + tau / te);
}

/** Scalar One-Euro filter. */
export class OneEuroFilter {
  private freq: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev = 0;

  constructor(freq = 30, minCutoff = 1.0, beta = 0.0, dCutoff = 1.0) {
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  setFreq(freq: number) {
    if (freq > 0) this.freq = freq;
  }

  filter(x: number): number {
    if (this.xPrev === null) {
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }
    let dx = (x - this.xPrev) * this.freq;
    const aD = alpha(this.dCutoff, this.freq);
    dx = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dx;

    const cutoff = this.minCutoff + this.beta * Math.abs(dx);
    const a = alpha(cutoff, this.freq);
    const xFiltered = a * x + (1 - a) * this.xPrev;
    this.xPrev = xFiltered;
    return xFiltered;
  }
}

export interface Vec3 { x: number; y: number; z: number; visibility?: number }

/**
 * Smooths a whole set of {x,y,z} landmarks, keyed by a stable prefix.
 * Lazily creates 3 scalar filters per landmark. Matches the majorSignL settings
 * (min_cutoff 0.5, beta 0.1) which favour stability over responsiveness.
 */
export class LandmarkSmoother {
  private filters = new Map<string, OneEuroFilter>();
  private freq: number;
  private minCutoff: number;
  private beta: number;

  constructor(freq = 30, minCutoff = 0.5, beta = 0.1) {
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
  }

  setFreq(freq: number) {
    this.freq = freq;
    this.filters.forEach((f) => f.setFreq(freq));
  }

  private get(key: string): OneEuroFilter {
    let f = this.filters.get(key);
    if (!f) {
      f = new OneEuroFilter(this.freq, this.minCutoff, this.beta, 1.0);
      this.filters.set(key, f);
    }
    return f;
  }

  smooth<T extends Vec3>(prefix: string, landmarks: T[] | undefined | null): T[] | null {
    if (!landmarks) return null;
    return landmarks.map((lm, i) => ({
      ...lm,
      x: this.get(`${prefix}_${i}_x`).filter(lm.x),
      y: this.get(`${prefix}_${i}_y`).filter(lm.y),
      z: this.get(`${prefix}_${i}_z`).filter(lm.z),
    }));
  }

  reset() {
    this.filters.clear();
  }
}
