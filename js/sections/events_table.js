/**
 * Per-event sortable, paginated table with click-to-expand drilldown.
 *
 * Columns:
 *   ticker · action (add/delete pill) · announcement · effective ·
 *   pre-CAR · main-CAR (market) · main-CAR (sector-matched) · post-CAR
 *
 * Row click → expand row with a 4-point step chart of cumulative CAR
 * through this single event's windows. Two series (market, sector_matched)
 * if both available.
 *
 * Filters: ticker substring search + cohort-year dropdown.
 *
 * @module sections/events_table
 */

import { PALETTE, PLOTLY_CONFIG, baseLayout } from "../plotly_theme.js";
import { fmtDate, fmtPct } from "../utils/format.js";

const PAGE_SIZE = 50;

/** Window labels in chronological order. */
const WINDOW_PRE = "[T-A-5, T-A-1]";
const WINDOW_MAIN = "[T-A, T-E-1]";
const WINDOW_POST = "[T-E, T-E+5]";

/**
 * @typedef {object} TableData
 * @property {object} events  — validated EventsFile
 * @property {string} indexLabel
 */

/** Module-scoped state — reset on every render() call. */
let state = {
  /** @type {object[]} */ rows: [],
  sortKey: "effective_date",
  sortDir: /** @type {"asc"|"desc"} */ ("desc"),
  page: 0,
  search: "",
  yearFilter: /** @type {number|null} */ (null),
  /** @type {Set<string>} */ expanded: new Set(),
  containerId: "",
};

/**
 * Flatten events into row objects with the values we need for sort/filter/render.
 * @param {object[]} events
 */
function flatten(events) {
  return events.map((ev) => {
    const carBy = (model, window_label) => {
      const o = (ev.car_observations || []).find(
        (x) => x.model === model && x.window_label === window_label,
      );
      return o ? o.car : null;
    };
    const e = ev.event;
    return {
      event_id: e.event_id,
      ticker: e.ticker,
      action: e.action,
      announcement_date: e.announcement_date,
      effective_date: e.effective_date,
      year: e.effective_date ? Number(e.effective_date.slice(0, 4)) : null,
      pre_market: carBy("market", WINDOW_PRE),
      main_market: carBy("market", WINDOW_MAIN),
      post_market: carBy("market", WINDOW_POST),
      main_sector: carBy("sector_matched", WINDOW_MAIN),
      raw: ev,
    };
  });
}

/**
 * @param {string} containerId
 * @param {TableData} data
 */
export function render(containerId, data) {
  state = {
    rows: flatten(data.events.events || []),
    sortKey: "effective_date",
    sortDir: "desc",
    page: 0,
    search: "",
    yearFilter: null,
    expanded: new Set(),
    containerId,
  };
  rerender();
}

/** Re-render the table preserving state. */
function rerender() {
  const el = document.getElementById(state.containerId);
  if (!el) return;
  if (state.rows.length === 0) {
    el.innerHTML = `<div class="text-zinc-500 font-mono text-sm p-4">no events to display</div>`;
    return;
  }

  const filtered = filterAndSort(state.rows);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (state.page >= totalPages) state.page = totalPages - 1;
  const pageRows = filtered.slice(state.page * PAGE_SIZE, (state.page + 1) * PAGE_SIZE);

  const years = Array.from(new Set(state.rows.map((r) => r.year))).filter(
    (y) => y != null,
  ).sort((a, b) => b - a);

  el.innerHTML = `
    <div class="flex flex-wrap items-center gap-3 mb-3 font-mono text-xs">
      <input id="ev-search" type="text" placeholder="ticker…" value="${escapeAttr(state.search)}"
        class="bg-zinc-800 text-zinc-100 px-3 py-1.5 rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500 w-40" />
      <select id="ev-year"
        class="bg-zinc-800 text-zinc-100 px-2.5 py-1.5 rounded border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
        <option value="">all years</option>
        ${years.map((y) => `<option value="${y}" ${state.yearFilter === y ? "selected" : ""}>${y}</option>`).join("")}
      </select>
      <span class="text-zinc-500">${filtered.length} of ${state.rows.length} events</span>
      <div class="flex-1"></div>
      <button id="ev-prev" ${state.page === 0 ? "disabled" : ""}
        class="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-100 px-2.5 py-1.5 rounded border border-zinc-700">prev</button>
      <span class="text-zinc-400">${state.page + 1} / ${totalPages}</span>
      <button id="ev-next" ${state.page === totalPages - 1 ? "disabled" : ""}
        class="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-100 px-2.5 py-1.5 rounded border border-zinc-700">next</button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm font-mono">
        <thead class="text-zinc-400 border-b border-zinc-800 select-none">
          <tr>
            ${headerCell("ticker", "Ticker", "text-left")}
            ${headerCell("action", "Action", "text-left")}
            ${headerCell("announcement_date", "Announce", "text-left")}
            ${headerCell("effective_date", "Effective", "text-left")}
            ${headerCell("pre_market", "Pre", "text-right")}
            ${headerCell("main_market", "Main (M)", "text-right")}
            ${headerCell("main_sector", "Main (S)", "text-right")}
            ${headerCell("post_market", "Post", "text-right")}
          </tr>
        </thead>
        <tbody id="ev-tbody"></tbody>
      </table>
    </div>
  `;

  const tbody = el.querySelector("#ev-tbody");
  if (!tbody) return;

  for (const r of pageRows) {
    const tr = document.createElement("tr");
    tr.className = "border-b border-zinc-900 hover:bg-zinc-800/40 cursor-pointer";
    tr.dataset.eventId = r.event_id;
    tr.innerHTML = `
      <td class="py-1.5 px-2 text-zinc-100 font-bold">${r.ticker}</td>
      <td class="py-1.5 px-2">${actionPill(r.action)}</td>
      <td class="py-1.5 px-2 text-zinc-400">${fmtDate(r.announcement_date)}</td>
      <td class="py-1.5 px-2 text-zinc-300">${fmtDate(r.effective_date)}</td>
      ${pctCell(r.pre_market)}
      ${pctCell(r.main_market)}
      ${pctCell(r.main_sector)}
      ${pctCell(r.post_market)}
    `;
    tbody.appendChild(tr);

    if (state.expanded.has(r.event_id)) {
      tbody.appendChild(buildDetailRow(r));
    }
  }

  // Wire interactivity
  el.querySelector("#ev-search")?.addEventListener("input", (e) => {
    state.search = /** @type {HTMLInputElement} */ (e.target).value.trim().toUpperCase();
    state.page = 0;
    rerender();
  });
  el.querySelector("#ev-year")?.addEventListener("change", (e) => {
    const v = /** @type {HTMLSelectElement} */ (e.target).value;
    state.yearFilter = v ? Number(v) : null;
    state.page = 0;
    rerender();
  });
  el.querySelector("#ev-prev")?.addEventListener("click", () => {
    if (state.page > 0) {
      state.page -= 1;
      rerender();
    }
  });
  el.querySelector("#ev-next")?.addEventListener("click", () => {
    if (state.page < totalPages - 1) {
      state.page += 1;
      rerender();
    }
  });
  el.querySelectorAll("[data-sortkey]").forEach((th) => {
    th.addEventListener("click", () => {
      const k = /** @type {HTMLElement} */ (th).dataset.sortkey;
      if (!k) return;
      if (state.sortKey === k) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = k;
        state.sortDir = "asc";
      }
      rerender();
    });
  });
  tbody.querySelectorAll("tr[data-event-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const id = /** @type {HTMLElement} */ (tr).dataset.eventId;
      if (!id) return;
      if (state.expanded.has(id)) state.expanded.delete(id);
      else state.expanded.add(id);
      rerender();
    });
  });
}

/**
 * @param {string} key
 * @param {string} label
 * @param {string} align
 */
function headerCell(key, label, align) {
  const arrow = state.sortKey === key ? (state.sortDir === "asc" ? " ▲" : " ▼") : "";
  return `<th data-sortkey="${key}" class="${align} py-2 px-2 cursor-pointer hover:text-zinc-100">${label}${arrow}</th>`;
}

/** @param {"add"|"delete"} action */
function actionPill(action) {
  if (action === "add") {
    return `<span class="bg-teal-900/50 text-teal-300 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">add</span>`;
  }
  return `<span class="bg-rose-900/50 text-rose-300 text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wider">del</span>`;
}

/** @param {number | null} v */
function pctCell(v) {
  if (v == null || !Number.isFinite(v)) {
    return `<td class="py-1.5 px-2 text-right text-zinc-600">—</td>`;
  }
  const color = v > 0.005 ? "text-teal-400" : v < -0.005 ? "text-rose-400" : "text-zinc-300";
  return `<td class="py-1.5 px-2 text-right ${color}">${fmtPct(v)}</td>`;
}

/** @param {string} s */
function escapeAttr(s) {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Apply search + year filter and sort the rows.
 * @param {object[]} rows
 */
function filterAndSort(rows) {
  let out = rows;
  if (state.search) {
    out = out.filter((r) => r.ticker.includes(state.search));
  }
  if (state.yearFilter != null) {
    out = out.filter((r) => r.year === state.yearFilter);
  }
  const dir = state.sortDir === "asc" ? 1 : -1;
  out = [...out].sort((a, b) => {
    const av = a[state.sortKey];
    const bv = b[state.sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1; // nulls last
    if (bv == null) return -1;
    if (typeof av === "string") return av.localeCompare(bv) * dir;
    return ((av) - (bv)) * dir;
  });
  return out;
}

/**
 * Build the expanded detail row with a 4-point step chart of THIS event's
 * cumulative CAR through the windows.
 * @param {object} r
 * @returns {HTMLTableRowElement}
 */
function buildDetailRow(r) {
  const tr = document.createElement("tr");
  tr.className = "border-b border-zinc-900 bg-zinc-950";
  tr.innerHTML = `
    <td colspan="8" class="px-4 py-4">
      <div class="grid md:grid-cols-2 gap-4">
        <div>
          <div class="text-zinc-300 font-bold mb-1">${r.ticker} · ${r.action} · ${fmtDate(r.effective_date)}</div>
          <div class="text-xs text-zinc-500 space-y-1">
            <div>event_id: <span class="text-zinc-400">${r.event_id}</span></div>
            <div>announced: ${fmtDate(r.announcement_date)} (approximated as T-E − 5 calendar days)</div>
            <div>reason: <span class="text-zinc-400">${escapeText(r.raw.event.reason || "—")}</span></div>
          </div>
        </div>
        <div class="h-56" id="detail-chart-${r.event_id}"></div>
      </div>
    </td>
  `;
  // Defer Plotly render until after the row is in the DOM
  setTimeout(() => renderDetailChart(r), 0);
  return tr;
}

/** @param {string} s */
function escapeText(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** @param {object} r */
function renderDetailChart(r) {
  const id = `detail-chart-${r.event_id}`;
  const el = document.getElementById(id);
  if (!el) return;

  const series = (model) => {
    const wins = (r.raw.car_observations || []).filter((o) => o.model === model);
    const get = (lab) => wins.find((o) => o.window_label === lab)?.car ?? null;
    const pre = get(WINDOW_PRE);
    const main = get(WINDOW_MAIN);
    const post = get(WINDOW_POST);
    const cum = [0];
    const days = [-5];
    if (Number.isFinite(pre)) {
      cum.push((cum.at(-1) ?? 0) + pre);
      days.push(-1);
    }
    if (Number.isFinite(main)) {
      cum.push((cum.at(-1) ?? 0) + main);
      days.push(5);
    }
    if (Number.isFinite(post)) {
      cum.push((cum.at(-1) ?? 0) + post);
      days.push(10);
    }
    return { days, cum };
  };

  const m = series("market");
  const s = series("sector_matched");

  const traces = [
    {
      x: m.days,
      y: m.cum,
      type: "scatter",
      mode: "lines+markers",
      line: { color: PALETTE.teal, width: 2, shape: "linear" },
      marker: { color: PALETTE.teal, size: 6 },
      name: "market",
      hovertemplate: "day %{x}<br>cum CAR=%{y:+.2%}<extra></extra>",
    },
  ];
  if (s.days.length > 1) {
    traces.push({
      x: s.days,
      y: s.cum,
      type: "scatter",
      mode: "lines+markers",
      line: { color: PALETTE.rose, width: 2, shape: "linear" },
      marker: { color: PALETTE.rose, size: 6 },
      name: "sector",
      hovertemplate: "day %{x}<br>cum CAR=%{y:+.2%}<extra></extra>",
    });
  }
  const layout = baseLayout();
  layout.margin = { t: 16, r: 12, b: 36, l: 50 };
  layout.xaxis.tickmode = "array";
  layout.xaxis.tickvals = [-5, -1, 5, 10];
  layout.xaxis.ticktext = ["T-A-5", "T-A-1", "T-E-1", "T-E+5"];
  layout.yaxis.tickformat = "+.1%";
  layout.yaxis.title = { text: "cum CAR", font: { size: 9 } };
  layout.shapes = [
    {
      type: "line",
      x0: -5,
      x1: 10,
      y0: 0,
      y1: 0,
      line: { color: PALETTE.zincSub, width: 1, dash: "dot" },
    },
  ];
  layout.showlegend = true;
  layout.legend = { x: 0, y: 1.15, orientation: "h", font: { size: 9 } };

  Plotly.react(el, traces, layout, PLOTLY_CONFIG);
}
