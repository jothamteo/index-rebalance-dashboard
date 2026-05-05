/**
 * Pure-JS statistics helpers used for client-side aggregation.
 * Everything here is testable in isolation.
 *
 * @module utils/stats
 */

/**
 * Sample mean. Returns NaN on empty input.
 * @param {number[]} xs
 * @returns {number}
 */
export function mean(xs) {
  if (!xs.length) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

/**
 * Sample standard deviation (Bessel-corrected, n-1).
 * @param {number[]} xs
 * @returns {number}
 */
export function stdev(xs) {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  let s = 0;
  for (const x of xs) {
    const d = x - m;
    s += d * d;
  }
  return Math.sqrt(s / (xs.length - 1));
}

/**
 * Standard error of the mean = stdev / √n.
 * @param {number[]} xs
 * @returns {number}
 */
export function sem(xs) {
  if (xs.length < 2) return NaN;
  return stdev(xs) / Math.sqrt(xs.length);
}

/**
 * Sample percentile (linear interpolation, type 7 — matches numpy default).
 * @param {number[]} xs
 * @param {number} p - in [0, 1]; e.g. 0.5 for median
 * @returns {number}
 */
export function percentile(xs, p) {
  if (!xs.length) return NaN;
  if (p < 0 || p > 1) return NaN;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/**
 * Median = percentile(0.5).
 * @param {number[]} xs
 * @returns {number}
 */
export function median(xs) {
  return percentile(xs, 0.5);
}

/**
 * Group an array of records by a key function.
 * @template T, K
 * @param {T[]} items
 * @param {(item: T) => K} keyFn
 * @returns {Map<K, T[]>}
 */
export function groupBy(items, keyFn) {
  const out = new Map();
  for (const item of items) {
    const k = keyFn(item);
    const arr = out.get(k);
    if (arr) arr.push(item);
    else out.set(k, [item]);
  }
  return out;
}
