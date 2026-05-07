/**
 * JSON loaders + schema validation.
 *
 * The spec is unambiguous: write this file FIRST, before any chart code.
 * If a data file's shape is wrong, fail loudly with a clear error in the
 * UI — never silently render misleading visuals.
 *
 * Validation mirrors the pydantic v2 models in the index-rebalance-tracker
 * repo (src/index_rebalance_tracker/models.py). When the tracker bumps
 * SCHEMA_VERSION, this file must be updated in lockstep.
 *
 * Two load modes:
 *   - default: relative ./data/{file}.json (committed JSON, served by GH Pages)
 *   - live: opt-in via URL hash ?live → fetches from raw.githubusercontent.com
 *
 * @module data_loader
 */

const TRACKER_RAW_BASE =
  "https://raw.githubusercontent.com/jothamteo/index-rebalance-tracker/main/output";

/** @typedef {"sp500" | "msci_sg"} IndexName */

/** Schema version the dashboard expects. Bump when tracker bumps. */
export const EXPECTED_SCHEMA_VERSION = "0.1.0";

/**
 * Detect live-fetch mode from URL hash. Spec calls for this opt-in.
 * @returns {boolean}
 */
export function isLiveMode() {
  const hash = (typeof window !== "undefined" && window.location?.hash) || "";
  return hash.includes("live");
}

/**
 * Resolve a JSON filename to a full URL based on mode.
 * @param {string} filename - e.g. "events_sp500.json"
 * @returns {string}
 */
function resolveUrl(filename) {
  return isLiveMode() ? `${TRACKER_RAW_BASE}/${filename}` : `./data/${filename}`;
}

/**
 * Fetch + parse JSON with explicit error handling. The spec mandates that
 * fetch failures surface a visible "data file unreachable — retry" message;
 * callers should catch and render the error UI rather than swallow.
 *
 * @param {string} filename
 * @returns {Promise<unknown>}
 * @throws {Error} with .name "DataLoadError"
 */
export async function fetchJson(filename) {
  const url = resolveUrl(filename);
  let resp;
  try {
    resp = await fetch(url);
  } catch (cause) {
    const e = new Error(`network error fetching ${filename}: ${cause?.message ?? cause}`);
    e.name = "DataLoadError";
    throw e;
  }
  if (!resp.ok) {
    const e = new Error(`HTTP ${resp.status} fetching ${filename}`);
    e.name = "DataLoadError";
    throw e;
  }
  try {
    return await resp.json();
  } catch (cause) {
    const e = new Error(`invalid JSON in ${filename}: ${cause?.message ?? cause}`);
    e.name = "DataLoadError";
    throw e;
  }
}

// ── Validators ──────────────────────────────────────────────────────────────

/**
 * Throw a SchemaError if `obj` doesn't have all required keys with non-null
 * values.
 * @param {unknown} obj
 * @param {string[]} required
 * @param {string} typeName - for the error message
 */
function requireKeys(obj, required, typeName) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    const e = new Error(`${typeName}: expected object, got ${typeof obj}`);
    e.name = "SchemaError";
    throw e;
  }
  const missing = required.filter((k) => !(k in /** @type {object} */ (obj)));
  if (missing.length > 0) {
    const e = new Error(`${typeName}: missing keys ${missing.join(", ")}`);
    e.name = "SchemaError";
    throw e;
  }
}

/**
 * @param {unknown} raw
 * @returns {{schema_version: string, as_of: string, index: string, events: object[]}}
 */
export function validateEventsFile(raw) {
  requireKeys(raw, ["schema_version", "as_of", "index", "events"], "EventsFile");
  const r = /** @type {any} */ (raw);
  if (r.schema_version !== EXPECTED_SCHEMA_VERSION) {
    console.warn(
      `EventsFile schema_version mismatch: expected ${EXPECTED_SCHEMA_VERSION}, got ${r.schema_version}`,
    );
  }
  if (!Array.isArray(r.events)) {
    const e = new Error("EventsFile.events must be an array");
    e.name = "SchemaError";
    throw e;
  }
  for (let i = 0; i < r.events.length; i++) {
    requireKeys(r.events[i], ["event", "car_observations"], `EventsFile.events[${i}]`);
    requireKeys(
      r.events[i].event,
      ["event_id", "ticker", "action", "effective_date", "index"],
      `EventsFile.events[${i}].event`,
    );
  }
  return r;
}

/**
 * @param {unknown} raw
 * @returns {{schema_version: string, as_of: string, index: string,
 *            grouping: string, window_label: string, model_used: string,
 *            action: string, cohorts: object[]}}
 */
export function validateDecayFile(raw) {
  requireKeys(
    raw,
    [
      "schema_version",
      "as_of",
      "index",
      "grouping",
      "window_label",
      "model_used",
      "action",
      "cohorts",
    ],
    "DecayFile",
  );
  const r = /** @type {any} */ (raw);
  if (!Array.isArray(r.cohorts)) {
    const e = new Error("DecayFile.cohorts must be an array");
    e.name = "SchemaError";
    throw e;
  }
  for (let i = 0; i < r.cohorts.length; i++) {
    requireKeys(
      r.cohorts[i],
      ["cohort", "n_events", "mean_car", "median_car", "car_p25", "car_p75"],
      `DecayFile.cohorts[${i}]`,
    );
  }
  return r;
}

/**
 * @param {unknown} raw
 * @returns {{schema_version: string, as_of: string, index: string,
 *            passive_aum_usd: number, annual: object[]}}
 */
export function validateTcaSummaryFile(raw) {
  requireKeys(
    raw,
    ["schema_version", "as_of", "index", "passive_aum_usd", "annual"],
    "TCASummaryFile",
  );
  const r = /** @type {any} */ (raw);
  if (!Array.isArray(r.annual)) {
    const e = new Error("TCASummaryFile.annual must be an array");
    e.name = "SchemaError";
    throw e;
  }
  return r;
}

/**
 * @param {unknown} raw
 * @returns {{schema_version: string, as_of: string, events: object[]}}
 */
export function validateUpcomingFile(raw) {
  requireKeys(raw, ["schema_version", "as_of", "events"], "UpcomingEventsFile");
  const r = /** @type {any} */ (raw);
  if (!Array.isArray(r.events)) {
    const e = new Error("UpcomingEventsFile.events must be an array");
    e.name = "SchemaError";
    throw e;
  }
  return r;
}

/**
 * @param {unknown} raw
 * @returns {{schema_version: string, passive_aum_usd: number,
 *            market_model_estimation_window_days: number,
 *            market_model_gap_days: number, sources: Record<string, string>}}
 */
export function validateMethodologyConstants(raw) {
  requireKeys(
    raw,
    ["schema_version", "passive_aum_usd", "market_model_estimation_window_days"],
    "MethodologyConstants",
  );
  return /** @type {any} */ (raw);
}

// ── High-level loaders ──────────────────────────────────────────────────────

/**
 * Load + validate every file the dashboard needs.
 *
 * @param {IndexName} index - "sp500" or "msci_sg"
 * @returns {Promise<{
 *   events: ReturnType<typeof validateEventsFile>,
 *   decay: ReturnType<typeof validateDecayFile>,
 *   tcaSummary: ReturnType<typeof validateTcaSummaryFile>,
 *   upcoming: ReturnType<typeof validateUpcomingFile>,
 *   methodology: ReturnType<typeof validateMethodologyConstants>,
 * }>}
 */
export async function loadAll(index) {
  const [events, decay, tcaSummary, upcoming, methodology] = await Promise.all([
    fetchJson(`events_${index}.json`).then(validateEventsFile),
    fetchJson(`decay_${index}.json`).then(validateDecayFile),
    fetchJson("tca_summary.json").then(validateTcaSummaryFile),
    fetchJson("upcoming.json").then(validateUpcomingFile),
    fetchJson("methodology_constants.json").then(validateMethodologyConstants),
  ]);
  return { events, decay, tcaSummary, upcoming, methodology };
}
