/**
 * Decay-of-the-index-effect chart — the project's HEADLINE.
 *
 * Spec mandate: build first, polish end-to-end. Lead with what the data
 * actually says — if recent CARs are near zero, that IS the finding.
 *
 * Renders mean CAR per cohort with IQR shading. Annotation lines:
 *   - 0% baseline (zero abnormal return — the null)
 *   - Petajisto (2011) 8.8% baseline for SP500 1990–2005
 *
 * Data source attribution baked into the chart itself.
 *
 * @module sections/decay_chart
 */

import { PALETTE, PLOTLY_CONFIG, baseLayout, withSourceAttribution } from "../plotly_theme.js";

/**
 * @typedef {object} DecayChartData
 * @property {object} decay  — validated DecayFile from data_loader
 * @property {string} indexLabel  — "S&P 500" | "MSCI Singapore"
 */

/**
 * @param {string} containerId
 * @param {DecayChartData} data
 */
export function render(containerId, data) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const cohorts = data.decay.cohorts || [];

  if (cohorts.length === 0) {
    el.innerHTML = `
      <div class="h-96 flex flex-col items-center justify-center gap-2 text-zinc-500 font-mono text-sm">
        <div class="text-lg text-zinc-300">no decay data</div>
        <div>For ${data.indexLabel}, the tracker found no events to aggregate.</div>
        <div class="text-xs text-zinc-600">See methodology §6.4 for the MSCI Singapore caveat.</div>
      </div>
    `;
    return;
  }

  const x = cohorts.map((c) => c.cohort);
  const y = cohorts.map((c) => c.mean_car);
  const p25 = cohorts.map((c) => c.car_p25);
  const p75 = cohorts.map((c) => c.car_p75);
  const n = cohorts.map((c) => c.n_events);

  // Build the IQR shaded band as upper + lower with fill.
  const iqrUpper = {
    x,
    y: p75,
    type: "scatter",
    mode: "lines",
    line: { color: "rgba(0,0,0,0)" },
    showlegend: false,
    hoverinfo: "skip",
  };
  const iqrLower = {
    x,
    y: p25,
    type: "scatter",
    mode: "lines",
    fill: "tonexty",
    fillcolor: "rgba(20, 184, 166, 0.18)",
    line: { color: "rgba(0,0,0,0)" },
    name: "IQR (p25–p75)",
    hoverinfo: "skip",
  };
  const meanLine = {
    x,
    y,
    type: "scatter",
    mode: "lines+markers",
    line: { color: PALETTE.teal, width: 2 },
    marker: { color: PALETTE.teal, size: 8 },
    name: "mean CAR (additions)",
    customdata: n,
    hovertemplate:
      "<b>cohort %{x}</b><br>mean CAR=%{y:+.2%}<br>n=%{customdata}<extra></extra>",
  };

  const layout = baseLayout();
  layout.title = {
    text: `${data.indexLabel} addition CAR by year cohort   <span style="color:${PALETTE.zincSub};font-size:10px">[T-A, T-E-1] window · market model</span>`,
    font: { size: 13, color: PALETTE.zincTxt },
    x: 0.05,
  };
  layout.xaxis.title = { text: "cohort year", font: { size: 11 } };
  layout.yaxis.title = { text: "cumulative abnormal return", font: { size: 11 } };
  layout.yaxis.tickformat = "+.1%";
  layout.shapes = [
    // zero baseline
    {
      type: "line",
      x0: x[0],
      x1: x[x.length - 1],
      y0: 0,
      y1: 0,
      line: { color: PALETTE.zincSub, width: 1, dash: "dot" },
    },
    // Petajisto baseline
    {
      type: "line",
      x0: x[0],
      x1: x[x.length - 1],
      y0: 0.088,
      y1: 0.088,
      line: { color: PALETTE.amber, width: 1, dash: "dash" },
    },
  ];
  layout.annotations = [
    {
      x: x[x.length - 1],
      y: 0.088,
      xanchor: "right",
      yanchor: "bottom",
      text: "Petajisto 2011 baseline (8.8%, 1990–2005)",
      showarrow: false,
      font: { color: PALETTE.amber, size: 9 },
    },
  ];

  const totalEvents = n.reduce((a, b) => a + b, 0);
  withSourceAttribution(
    layout,
    `data: index-rebalance-tracker · ${data.indexLabel} additions · ${totalEvents} events · ${cohorts[0].cohort}–${cohorts[cohorts.length - 1].cohort}`,
  );

  Plotly.react(el, [iqrUpper, iqrLower, meanLine], layout, PLOTLY_CONFIG);
}
