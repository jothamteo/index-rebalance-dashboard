/**
 * Shared Plotly layout + colors. Spec: define once, apply to every chart.
 *
 * Palette matches deribit-options-dashboard for project coherence:
 *   teal #14B8A6 — additions / positive / primary
 *   rose #F43F5E — deletions / negative
 *   amber #FACC15 — fits / annotations
 *   zinc-400 #A1A1AA — neutral / control
 *   bg #18181b — chart area
 *
 * @module plotly_theme
 */

export const PALETTE = {
  teal: "#14B8A6",
  rose: "#F43F5E",
  amber: "#FACC15",
  zincTxt: "#e4e4e7",
  zincSub: "#a1a1aa",
  zincGrid: "#27272a",
  zincZero: "#3f3f46",
  bg: "#18181b",
};

/** Default config for every chart on the dashboard. */
export const PLOTLY_CONFIG = {
  displayModeBar: false,
  responsive: true,
};

/**
 * Base layout. Spread into per-chart layout overrides.
 * @returns {object}
 */
export function baseLayout() {
  return {
    paper_bgcolor: PALETTE.bg,
    plot_bgcolor: PALETTE.bg,
    font: {
      color: PALETTE.zincTxt,
      family: "ui-monospace, 'SF Mono', monospace",
      size: 11,
    },
    margin: { t: 30, r: 24, b: 50, l: 64 },
    xaxis: {
      gridcolor: PALETTE.zincGrid,
      zerolinecolor: PALETTE.zincZero,
      color: PALETTE.zincTxt,
    },
    yaxis: {
      gridcolor: PALETTE.zincGrid,
      zerolinecolor: PALETTE.zincZero,
      color: PALETTE.zincTxt,
    },
    showlegend: true,
    legend: {
      bgcolor: "rgba(0,0,0,0)",
      bordercolor: PALETTE.zincGrid,
      borderwidth: 1,
      font: { color: PALETTE.zincTxt, size: 10 },
    },
  };
}

/**
 * Add an "as-of" + data-source attribution annotation to a layout.
 * Spec: every chart gets a data-source line at the bottom.
 *
 * @param {object} layout - the layout to mutate (returned for chaining)
 * @param {string} sourceText - e.g. "data: index-rebalance-tracker · 234 events"
 * @returns {object}
 */
export function withSourceAttribution(layout, sourceText) {
  layout.annotations = layout.annotations || [];
  layout.annotations.push({
    text: sourceText,
    x: 1,
    xref: "paper",
    y: -0.18,
    yref: "paper",
    xanchor: "right",
    yanchor: "top",
    showarrow: false,
    font: { size: 9, color: "#52525b" },
  });
  return layout;
}
