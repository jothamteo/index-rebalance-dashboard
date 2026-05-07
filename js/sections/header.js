/**
 * Header section: title, as-of timestamp, theme toggle, index selector,
 * methodology + GitHub links.
 *
 * @module sections/header
 */

import { fmtTimestamp } from "../utils/format.js";

/**
 * @typedef {object} HeaderData
 * @property {string} asOf - ISO timestamp from the loaded data
 * @property {"sp500"|"msci_sg"} index
 * @property {(newIndex: "sp500"|"msci_sg") => void} onIndexChange
 */

/**
 * @param {string} containerId
 * @param {HeaderData} data
 */
export function render(containerId, data) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const indexLabel = data.index === "sp500" ? "S&P 500" : "MSCI Singapore";

  el.innerHTML = `
    <div class="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
      <h1 class="text-xl font-bold tracking-tight text-zinc-100">
        Index Rebalance Dashboard
      </h1>
      <span class="text-zinc-500 text-sm font-mono hidden md:inline">·</span>
      <div class="flex items-center gap-2">
        <label for="index-selector" class="text-zinc-500 text-xs font-mono uppercase tracking-wider">index</label>
        <select id="index-selector"
          class="bg-zinc-800 text-zinc-100 px-2.5 py-1 rounded font-mono text-xs border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
          <option value="sp500" ${data.index === "sp500" ? "selected" : ""}>S&P 500</option>
          <option value="msci_sg" ${data.index === "msci_sg" ? "selected" : ""}>MSCI Singapore</option>
        </select>
      </div>
      <div class="flex-1"></div>
      <span class="font-mono text-xs text-zinc-400" title="Snapshot timestamp from the tracker output">
        as of ${fmtTimestamp(data.asOf)}
      </span>
      <a href="https://github.com/jothamteo/index-rebalance-dashboard"
         class="text-zinc-400 hover:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
        GitHub
      </a>
      <a href="https://github.com/jothamteo/index-rebalance-tracker"
         class="text-zinc-400 hover:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
        Tracker
      </a>
      <a href="docs/methodology.html"
         class="text-zinc-400 hover:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 rounded">
        Methodology
      </a>
    </div>
    <div class="px-6 pb-2 text-xs text-zinc-600 max-w-7xl mx-auto" data-context-banner></div>
  `;

  const selector = document.getElementById("index-selector");
  if (selector) {
    selector.addEventListener("change", (e) => {
      const v = /** @type {HTMLSelectElement} */ (e.target).value;
      if (v === "sp500" || v === "msci_sg") data.onIndexChange(v);
    });
  }

  // Honest banner for MSCI SG — its free-data path produces sparse output
  const banner = el.querySelector("[data-context-banner]");
  if (banner && data.index === "msci_sg") {
    banner.textContent =
      "MSCI Singapore tab — free-data scraper produces no ticker-level events; production deployment requires paid MSCI subscription. See methodology §6.4.";
  }
}
