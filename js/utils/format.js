/**
 * Formatting helpers for percentages, basis points, dates, and dollar amounts.
 * Numbers are mono-spaced and right-aligned in tables per the visual spec.
 *
 * @module utils/format
 */

/**
 * Format a decimal as a percentage with sign + N decimals.
 * @param {number} x - e.g. 0.0125 for 1.25%
 * @param {number} [digits=2]
 * @returns {string}
 */
export function fmtPct(x, digits = 2) {
  if (!Number.isFinite(x)) return "—";
  const sign = x > 0 ? "+" : "";
  return `${sign}${(x * 100).toFixed(digits)}%`;
}

/**
 * Format a decimal as basis points (1 bp = 0.0001).
 * @param {number} x
 * @param {number} [digits=1]
 * @returns {string}
 */
export function fmtBps(x, digits = 1) {
  if (!Number.isFinite(x)) return "—";
  return `${(x * 10_000).toFixed(digits)} bps`;
}

/**
 * Format a number that's already in bps (e.g. straight from TCA output).
 * @param {number} bps
 * @param {number} [digits=1]
 * @returns {string}
 */
export function fmtBpsDirect(bps, digits = 1) {
  if (!Number.isFinite(bps)) return "—";
  return `${bps.toFixed(digits)} bps`;
}

/**
 * Format a USD amount with K/M/B/T suffix.
 * @param {number} x
 * @returns {string}
 */
export function fmtUsd(x) {
  if (!Number.isFinite(x)) return "—";
  const abs = Math.abs(x);
  const sign = x < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

/**
 * Format an integer with thousands separators.
 * @param {number} n
 * @returns {string}
 */
export function fmtInt(n) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Format an ISO-ish date string for display (YYYY-MM-DD).
 * @param {string} iso
 * @returns {string}
 */
export function fmtDate(iso) {
  if (!iso || typeof iso !== "string") return "—";
  return iso.slice(0, 10);
}

/**
 * Format a UTC ISO timestamp as "YYYY-MM-DD HH:MM UTC".
 * @param {string} iso
 * @returns {string}
 */
export function fmtTimestamp(iso) {
  if (!iso || typeof iso !== "string") return "—";
  return iso.replace("T", " ").slice(0, 16) + " UTC";
}
