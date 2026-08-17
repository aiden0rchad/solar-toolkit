// Daylight — single source of truth for Recharts styling.
// Nothing in src/tools should hardcode a chart color, tick size or tooltip style;
// import from here instead. Values mirror the CSS custom properties in src/index.css.

// --- tokens -----------------------------------------------------------------

export const INK = '#0b0b0b';
export const INK_2 = '#52514e';
export const INK_3 = '#6f6c67';
export const LINE = '#e4e2dd';
export const GRID = '#e1e0d9';
export const BASELINE = '#c3c2b7';
export const SURFACE = '#ffffff';
export const ACCENT = '#b45309';
export const GOOD = '#006300';
export const BAD = '#d03b3b';

// Series assignment is entity-stable app-wide and never repainted by filters or
// series count: blue is always the protagonist (solar / proposed / EV / battery),
// orange is always the cost baseline (utility / do-nothing / gas). Aqua is a rare
// third series and may only be used on a chart that carries a legend.
export const SERIES = {
  solar: '#2a78d6',
  grid: '#eb6834',
  third: '#1baf7a',
};

// --- chrome -----------------------------------------------------------------

/** CartesianGrid stroke. Solid hairline — dashes are reserved for annotations. */
export const gridStroke = GRID;
/** Axis line / baseline stroke. */
export const axisStroke = BASELINE;

/** Spread onto <CartesianGrid />. Horizontal only, solid, no dasharray. */
export const gridProps = {
  stroke: GRID,
  vertical: false,
  horizontal: true,
};

/** Axis tick text: 11px ink-3, tabular figures so digits align down the column. */
export const axisTick = { fontSize: 11, fill: INK_3, className: 'tnum' };

/** Spread onto <XAxis />. Baseline rule, no tick marks. */
export const xAxisProps = {
  stroke: BASELINE,
  tickLine: false,
  axisLine: { stroke: BASELINE },
  tick: axisTick,
};

/** Spread onto <YAxis />. No axis line at all, no tick marks. */
export const yAxisProps = {
  stroke: BASELINE,
  tickLine: false,
  axisLine: false,
  tick: axisTick,
};

// --- tooltip ----------------------------------------------------------------

/** Spread onto <Tooltip /> on line/area charts. */
export const chartTooltip = {
  contentStyle: {
    background: SURFACE,
    border: `1px solid ${LINE}`,
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(11,11,11,0.08)',
    padding: '8px 10px',
    fontSize: 12,
    color: INK_2,
  },
  labelStyle: { color: INK, fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: INK_2, fontSize: 12, padding: 0 },
  cursor: { stroke: BASELINE, strokeWidth: 1 },
};

/** Same tooltip, bar-chart cursor (a faint wash instead of a line). */
export const barTooltip = {
  ...chartTooltip,
  cursor: { fill: 'rgba(11,11,11,0.04)' },
};

/**
 * Legacy export name. There is no dark theme any more; this is the light tooltip
 * above. Nothing in this repo imports it — it is retained because the Pro build
 * (solar-toolkit-pro) re-adds tools that still reference `darkTooltip`.
 * Prefer `chartTooltip` in new code.
 */
export const darkTooltip = chartTooltip;

// --- legend -----------------------------------------------------------------

/**
 * Spread onto <Legend />. Required on every chart with 2+ series; single-series
 * charts get no legend (the title names the series).
 */
export const legendProps = {
  align: 'right',
  verticalAlign: 'top',
  iconType: 'square',
  iconSize: 8,
  wrapperStyle: { fontSize: 12, color: INK_2, paddingBottom: 12, lineHeight: '16px' },
};

// --- marks ------------------------------------------------------------------

/** Spread onto <Line />: 2px, round caps, no dots. */
export const lineProps = {
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  dot: false,
  activeDot: { r: 4, strokeWidth: 2, stroke: SURFACE },
};

/** Areas are a 10% wash of the series hue — never a gradient, never a block. */
export const areaFillOpacity = 0.1;

/** Spread onto <Area />. Pass fill/stroke as the series color. */
export const areaProps = {
  ...lineProps,
  fillOpacity: areaFillOpacity,
};

/** End-of-line dot for the story series: filled series color, 2px white ring. */
export const endDot = (color) => ({ r: 4, fill: color, stroke: SURFACE, strokeWidth: 2 });

/** Spread onto <Bar />: max 24px thick, 4px rounded at the data end. */
export const barProps = { maxBarSize: 24, radius: [4, 4, 0, 0] };

/** Spread onto <BarChart /> — keeps a white gap between touching bars. */
export const barChartProps = { barGap: 2, barCategoryGap: '28%' };

// --- annotations ------------------------------------------------------------

/** Spread onto an annotation <ReferenceLine />. Dashed = annotation, always. */
export const annotationLine = {
  stroke: INK_3,
  strokeWidth: 1,
  strokeDasharray: '3 3',
};

/** Label style for the annotation above. */
export const annotationLabel = { fontSize: 11, fill: INK_3 };

// --- formatters -------------------------------------------------------------

/**
 * Axis tick formatter: clean rounded money, e.g. 160000 -> "$160k", -2500 -> "-$2.5k".
 */
export const currencyTick = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 999_500) {
    const m = abs / 1_000_000;
    return `${sign}$${m >= 10 ? Math.round(m) : Math.round(m * 10) / 10}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}$${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  }
  return `${sign}$${Math.round(abs)}`;
};

/** Tooltip/value formatter: whole dollars with separators, e.g. "$1,234". */
export const currencyValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString()}`;
};
