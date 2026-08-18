// Instrument — Recharts styling, resolved at RUNTIME from computed style.
//
// Recharts takes literal colour props (`stroke="#35d3ff"`); it cannot read a CSS
// custom property. A hex written in this file would therefore become a second
// source of truth the instant the theme flips — the chart would keep its light
// colours on a dark ground. So nothing here is a literal colour: every value is
// read from `getComputedStyle(document.documentElement)` and re-read when the
// theme changes. src/index.css owns colour; this file only observes it.
//
// The exported prop bundles are `let` bindings on purpose. ES module bindings
// are live, so a re-render after a theme change picks up the new values even in
// a component that has not migrated to `useChartTokens()` yet.

import { useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { DARK_QUERY } from '../theme/useTheme';

const canUseDom = typeof window !== 'undefined' && typeof document !== 'undefined';

// --- token read --------------------------------------------------------------

/**
 * CSS custom property -> key on the resolved token object. Instrument base
 * tokens only — one property per key, so nothing is read twice. Several older
 * keys are two names for one token (chart grid IS `--rule`, the axis baseline
 * IS `--rule-strong`); those are derived in `deriveAliases` below rather than
 * probed a second time.
 */
const TOKEN_MAP = {
  // data — the only chroma
  '--d-solar': 'proposed',
  '--d-grid': 'baselineStroke',
  '--d-third': 'third',
  '--d-good': 'good',
  '--d-bad': 'bad',
  // data — the irradiance ramp, low irradiance to high. Six ordinal stops;
  // `deriveAliases` gathers them into `ramp` so a consumer indexes an array
  // instead of six keys.
  '--ir-0': 'ir0',
  '--ir-1': 'ir1',
  '--ir-2': 'ir2',
  '--ir-3': 'ir3',
  '--ir-4': 'ir4',
  '--ir-5': 'ir5',
  // chrome — achromatic, always
  '--field': 'field',
  '--surface': 'surface',
  '--raised': 'raised',
  '--overlay': 'overlay',
  '--ink': 'ink',
  '--ink-2': 'ink2',
  '--ink-3': 'ink3',
  '--rule': 'rule',
  '--rule-strong': 'ruleStrong',
  // the one non-colour token
  '--wash-opacity': 'washOpacity',
};

/**
 * Keys that are a second name for a token already resolved above. Kept so the
 * builders and the legacy exports below need no rename; they are the
 * compatibility layer of src/index.css, expressed in JS.
 */
function deriveAliases(t) {
  t.grid = t.rule; //           gridlines
  t.axis = t.ruleStrong; //     axis baseline
  t.hair = t.rule; //           the old sub-1px weight
  t.ruleHeavy = t.ruleStrong; // the 2px weight
  t.baselineFill = t.baselineStroke; // --d-grid; the baseline carries no fill
  t.mark = t.bad; //            the struck-row rule
  t.sunken = t.raised;
  t.paper = t.field;
  // The sequential scale as an array, low -> high. Built here rather than
  // probed a seventh time: these are the same six values already resolved.
  t.ramp = [t.ir0, t.ir1, t.ir2, t.ir3, t.ir4, t.ir5];
  return t;
}

let cache = null;

/**
 * VERIFIED IN CHROME, and the reason this file is shaped the way it is:
 * `getComputedStyle(root).getPropertyValue('--d-solar')` returns the literal
 * string `"light-dark(#0b6f96,#35d3ff)"`. Unregistered custom properties are
 * substitution values — `light-dark()` inside one is not resolved until it lands
 * in a real property, so the raw read is useless as a Recharts `stroke`.
 *
 * So tokens that are still functions get resolved the only way a page can ask
 * the engine what a colour actually is: assign `color: var(--token)` to an
 * attached element and read the computed value back. That resolves against the
 * computed `color-scheme`, which is what the reader is actually looking at —
 * both the explicit `data-theme` override and the system preference. One hidden
 * host, all probes appended before any read, so it costs a single style recalc.
 */
function resolveViaProbe(properties) {
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden;pointer-events:none';

  const probes = properties.map(({ property, numeric }) => {
    const span = document.createElement('span');
    if (numeric) span.style.opacity = `var(${property})`;
    else span.style.color = `var(${property})`;
    host.appendChild(span);
    return span;
  });

  (document.body || document.documentElement).appendChild(host);
  const values = probes.map((span, i) => {
    const computed = getComputedStyle(span);
    return properties[i].numeric ? computed.opacity : computed.color;
  });
  host.remove();
  return values;
}

/**
 * Every chart token as resolved for the theme currently on screen. Memoised —
 * this touches style recalc and a chart would otherwise call it per render — and
 * invalidated by the theme watcher below, so the identity is stable between
 * theme changes and therefore safe as a `useSyncExternalStore` snapshot.
 */
export function readChartTokens() {
  if (cache) return cache;
  if (!canUseDom) {
    // No document to read. There is nothing truthful to return, and inventing a
    // palette here is precisely the second source of truth this file exists to
    // prevent. The app is client-only; this branch is defensive.
    cache = deriveAliases(
      Object.fromEntries(Object.values(TOKEN_MAP).map((key) => [key, ''])),
    );
    cache.washOpacity = 0.12;
    return cache;
  }

  const style = getComputedStyle(document.documentElement);
  const tokens = {};
  const pending = [];

  for (const [property, key] of Object.entries(TOKEN_MAP)) {
    const raw = style.getPropertyValue(property).trim();
    // A plain literal (`0.12`, or a hex from the print block) needs no probe.
    if (raw && !raw.includes('light-dark(') && !raw.includes('var(')) {
      tokens[key] = raw;
    } else {
      pending.push({ property, key, numeric: property === '--wash-opacity' });
    }
  }

  if (pending.length) {
    const resolved = resolveViaProbe(pending);
    pending.forEach(({ key }, i) => {
      tokens[key] = resolved[i];
    });
  }

  const wash = Number.parseFloat(tokens.washOpacity);
  tokens.washOpacity = Number.isFinite(wash) ? wash : 0.12;
  cache = deriveAliases(tokens);
  return cache;
}

// --- theme watching ----------------------------------------------------------

const listeners = new Set();

function invalidate() {
  cache = null;
  rebuild(readChartTokens());
  for (const listener of listeners) listener();
}

/**
 * Print is always the light theme (src/index.css pins the tokens), but a chart
 * is not reachable from CSS: Recharts writes `stroke` and `fill` onto the SVG as
 * presentation attributes, resolved when the component last rendered. A
 * consultant printing from dark mode would otherwise get the dark strokes on the
 * light sheet — #35d3ff on #ffffff is 1.8:1, well under the 3:1 a series owes
 * its own surface.
 *
 * So the attribute the probe reads is flipped for the duration of the print and
 * restored afterwards. The MutationObserver above would notice, but it fires on
 * a microtask and React would schedule the re-render asynchronously — Chrome
 * paints the print document straight after this handler returns. `flushSync`
 * makes the re-render happen before the snapshot is taken.
 */
let themeBeforePrint;

function forceLightForPrint() {
  const root = document.documentElement;
  themeBeforePrint = 'theme' in root.dataset ? root.dataset.theme : null;
  if (themeBeforePrint === 'light') return;
  root.dataset.theme = 'light';
  flushSync(invalidate);
}

function restoreAfterPrint() {
  if (themeBeforePrint === undefined) return;
  const root = document.documentElement;
  if (themeBeforePrint === null) delete root.dataset.theme;
  else root.dataset.theme = themeBeforePrint;
  themeBeforePrint = undefined;
  flushSync(invalidate);
}

if (canUseDom) {
  // The explicit override: ThemeProvider stamps `data-theme` on <html>.
  new MutationObserver(invalidate).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
  // The system preference, which moves without touching the attribute.
  window.matchMedia(DARK_QUERY).addEventListener('change', invalidate);
  // The printed sheet, which is light whatever is on screen.
  window.addEventListener('beforeprint', forceLightForPrint);
  window.addEventListener('afterprint', restoreAfterPrint);
}

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Live chart tokens. Re-renders the caller when the theme changes. */
export function useChartTokens() {
  return useSyncExternalStore(subscribe, readChartTokens, readChartTokens);
}

// --- series roles ------------------------------------------------------------

/**
 * Entity-stable, never repainted by filters or series count. Hue is the entity,
 * not the rank: --d-solar is always the proposed system and --d-grid is always
 * the do-nothing case, in every chart in the app. These are the only chroma the
 * interface is allowed; the chrome around them is achromatic, which is what
 * makes them read as luminous without a single glow effect.
 */
export const SERIES_ROLES = Object.freeze({
  proposed: 'solar / battery / EV / the proposed system',
  baseline: 'utility / grid import / do-nothing / the gas car',
  third: 'rare; only on a chart that carries a legend',
});

// --- the irradiance ramp -----------------------------------------------------

/**
 * Stops in the sequential scale. Six, and that is the resolution of the
 * instrument: the scale is ORDINAL, not continuous.
 */
export const RAMP_STOPS = 6;

/**
 * Position (0..1) -> stop index, STEPPED to the nearest stop and never
 * interpolated.
 *
 * Interpolating would be the obvious "improvement" and it is wrong here: the
 * six stops were measured — each clears 3:1 against its own page and holds
 * >=1.20 luminance separation from its neighbours — and a mixed colour between
 * two of them was verified against nothing. A stepped scale also stays
 * readable: six bands a reader can count and match to a legend, rather than a
 * continuous wash where no two cells are quite comparable.
 *
 * Out-of-range and non-finite positions clamp rather than throw; a chart asked
 * to paint a bad number should paint an end stop, not disappear.
 */
export function rampIndexAt(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(1, Math.max(0, n)) * (RAMP_STOPS - 1));
}

/** Position (0..1) -> resolved colour for the theme on screen. */
export function rampAt(t, tokenSet) {
  return (tokenSet ?? readChartTokens()).ramp[rampIndexAt(t)];
}

/**
 * Value in a domain -> stop index.
 *
 * A domain of zero width (twelve identical months, a single reading) resolves
 * to mid-scale, not to the low end: nothing here is near zero, there is
 * simply no variation to encode, and painting a flat series at the low end
 * would state a measurement the data does not contain. An inverted domain
 * (min > max) reverses the ramp, which is what a caller asking for it means.
 */
export function rampIndexFor(value, min, max) {
  const v = Number(value);
  const lo = Number(min);
  const hi = Number(max);
  if (!Number.isFinite(v) || !Number.isFinite(lo) || !Number.isFinite(hi)) {
    return rampIndexAt(0.5);
  }
  if (hi === lo) return rampIndexAt(0.5);
  return rampIndexAt((v - lo) / (hi - lo));
}

/** Value in a domain -> resolved colour. The convenience wrapper. */
export function rampFor(value, min, max, tokenSet) {
  return (tokenSet ?? readChartTokens()).ramp[rampIndexFor(value, min, max)];
}

// --- builders ----------------------------------------------------------------
// Each takes a token set so a component can build props for a snapshot it
// already holds; each has a live module-level binding below for convenience.

/** Axis tick text: 11px ink-3, tabular figures so digits align down the column. */
export const axisTickOf = (t) => ({ fontSize: 11, fill: t.ink3, className: 'tnum' });

/** <CartesianGrid />. Horizontal only, SOLID hairline — dashed means annotation. */
export const gridPropsOf = (t) => ({
  stroke: t.grid,
  strokeDasharray: '0',
  vertical: false,
  horizontal: true,
});

/** <XAxis />. A baseline rule, no tick marks. */
export const xAxisPropsOf = (t) => ({
  stroke: t.axis,
  tickLine: false,
  axisLine: { stroke: t.axis },
  tick: axisTickOf(t),
});

/** <YAxis />. Figures sit in a right-hand column, as on a bill. No axis line. */
export const yAxisPropsOf = (t) => ({
  orientation: 'right',
  stroke: t.axis,
  tickLine: false,
  axisLine: false,
  tick: axisTickOf(t),
});

/**
 * <Tooltip />. A small floating sheet on --overlay: introduced by the same 2px
 * `--rule-heavy` every other sheet is introduced by, and carrying no border on
 * its other three sides, because containers here have no borders.
 */
export const tooltipPropsOf = (t) => ({
  contentStyle: {
    background: t.overlay,
    border: 0,
    borderTop: `2px solid ${t.ruleHeavy}`,
    borderRadius: 0,
    boxShadow: 'none',
    padding: '6px 9px 7px',
    fontSize: 12,
    color: t.ink2,
  },
  labelStyle: { color: t.ink, fontWeight: 600, marginBottom: 3 },
  itemStyle: { color: t.ink2, fontSize: 12, padding: 0 },
  cursor: { stroke: t.axis, strokeWidth: 1 },
});

/** Same tooltip with a bar cursor: a faint wash of the sheet, not a line. */
export const barTooltipPropsOf = (t) => ({
  ...tooltipPropsOf(t),
  cursor: { fill: t.hair, fillOpacity: 0.55 },
});

/** <Legend />. Required on any chart with 2+ series; text never wears a hue. */
export const legendPropsOf = (t) => ({
  align: 'right',
  verticalAlign: 'top',
  iconType: 'square',
  iconSize: 8,
  wrapperStyle: { fontSize: 12, color: t.ink2, paddingBottom: 12, lineHeight: '16px' },
});

/**
 * The proposed system: 2px SOLID stroke with a wash.
 * Paired with `baselineLine`, the encoding is redundant — weight, dash and fill
 * all differ — so the chart survives greyscale, a photocopier and colour-vision
 * deficiency without relying on hue.
 *
 * `isAnimationActive: false` everywhere below: nothing in this interface enters,
 * and a series that grows in on mount — and again on every keystroke in the
 * inputs — is an entrance animation by another name.
 */
export const proposedLineOf = (t) => ({
  stroke: t.proposed,
  strokeWidth: 2,
  isAnimationActive: false,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: t.proposed,
  fillOpacity: t.washOpacity,
  dot: false,
  activeDot: { r: 3.5, strokeWidth: 1, stroke: t.surface, fill: t.proposed },
});

/** The do-nothing baseline: 1.5px DASHED, NO fill. */
export const baselineLineOf = (t) => ({
  stroke: t.baselineStroke,
  strokeWidth: 1.5,
  isAnimationActive: false,
  strokeDasharray: '5 3',
  strokeLinecap: 'butt',
  fill: 'none',
  fillOpacity: 0,
  dot: false,
  activeDot: { r: 3.5, strokeWidth: 1, stroke: t.surface, fill: t.baselineStroke },
});

/** A plain line in the same idiom: 2px, no dots, no fill. Pass the stroke. */
export const linePropsOf = () => ({
  strokeWidth: 2,
  isAnimationActive: false,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  dot: false,
});

/** Annotation <ReferenceLine />. Dashed hairline in ink-3 — annotation, always. */
export const annotationLineOf = (t) => ({
  stroke: t.ink3,
  strokeWidth: 1,
  strokeDasharray: '3 3',
});

/** Label for the annotation above. */
export const annotationLabelOf = (t) => ({ fontSize: 11, fill: t.ink3 });

/** <Bar />. Radius is 0 here, everywhere, absolutely. */
export const barPropsOf = () => ({ maxBarSize: 24, radius: 0, isAnimationActive: false });

/** End-of-line dot: filled series colour, ringed in the sheet it sits on. */
export const endDot = (color) => ({
  r: 3.5,
  fill: color,
  stroke: readChartTokens().surface,
  strokeWidth: 2,
});

// --- live bindings -----------------------------------------------------------
// Reassigned by `invalidate()` on every theme change.

export let tokens = readChartTokens();

export let axisTick = axisTickOf(tokens);
export let gridProps = gridPropsOf(tokens);
export let xAxisProps = xAxisPropsOf(tokens);
export let yAxisProps = yAxisPropsOf(tokens);
export let tooltipProps = tooltipPropsOf(tokens);
export let barTooltipProps = barTooltipPropsOf(tokens);
export let legendProps = legendPropsOf(tokens);
export let proposedLine = proposedLineOf(tokens);
export let baselineLine = baselineLineOf(tokens);
export let lineProps = linePropsOf(tokens);
export let annotationLine = annotationLineOf(tokens);
export let annotationLabel = annotationLabelOf(tokens);
export let barProps = barPropsOf(tokens);

/**
 * Series colours by role. `solar` / `grid` are the legacy names for
 * `proposed` / `baseline`; both point at the same tokens.
 */
export let SERIES = seriesOf(tokens);

function seriesOf(t) {
  return {
    proposed: t.proposed,
    baseline: t.baselineStroke,
    baselineFill: t.baselineFill,
    third: t.third,
    // legacy aliases
    solar: t.proposed,
    grid: t.baselineStroke,
  };
}

// Legacy scalar names, kept live so nothing breaks mid-flight.
export let INK = tokens.ink;
export let INK_2 = tokens.ink2;
export let INK_3 = tokens.ink3;
export let GRID = tokens.grid;
export let BASELINE = tokens.axis;
export let SURFACE = tokens.surface;
export let OVERLAY = tokens.overlay;
export let HAIR = tokens.hair;
export let RULE = tokens.rule;
export let MARK = tokens.mark;
export let LINE = tokens.rule;
export let gridStroke = tokens.grid;
export let axisStroke = tokens.axis;
export let areaFillOpacity = tokens.washOpacity;
/** Legacy tooltip names. `darkTooltip` predates the token system. */
export let chartTooltip = tooltipProps;
export let barTooltip = barTooltipProps;
export let darkTooltip = tooltipProps;
/** Legacy <Area /> bundle. Prefer `proposedLine` / `baselineLine`. */
export let areaProps = { ...linePropsOf(tokens), fillOpacity: tokens.washOpacity };

function rebuild(t) {
  tokens = t;

  axisTick = axisTickOf(t);
  gridProps = gridPropsOf(t);
  xAxisProps = xAxisPropsOf(t);
  yAxisProps = yAxisPropsOf(t);
  tooltipProps = tooltipPropsOf(t);
  barTooltipProps = barTooltipPropsOf(t);
  legendProps = legendPropsOf(t);
  proposedLine = proposedLineOf(t);
  baselineLine = baselineLineOf(t);
  lineProps = linePropsOf(t);
  annotationLine = annotationLineOf(t);
  annotationLabel = annotationLabelOf(t);
  barProps = barPropsOf(t);

  SERIES = seriesOf(t);

  INK = t.ink;
  INK_2 = t.ink2;
  INK_3 = t.ink3;
  GRID = t.grid;
  BASELINE = t.axis;
  SURFACE = t.surface;
  OVERLAY = t.overlay;
  HAIR = t.hair;
  RULE = t.rule;
  MARK = t.mark;
  LINE = t.rule;
  gridStroke = t.grid;
  axisStroke = t.axis;
  areaFillOpacity = t.washOpacity;
  chartTooltip = tooltipProps;
  barTooltip = barTooltipProps;
  darkTooltip = tooltipProps;
  areaProps = { ...linePropsOf(t), fillOpacity: t.washOpacity };
}

/**
 * Everything a chart needs for the theme on screen, re-resolved when it flips.
 * Components should prefer this over the module bindings.
 */
export function useChartTheme() {
  const t = useChartTokens();
  return {
    tokens: t,
    series: seriesOf(t),
    // The sequential scale, resolved for the theme on screen. `rampAt` /
    // `rampFor` are bound to this snapshot so a chart cannot paint one band
    // from the old theme mid-flip.
    ramp: t.ramp,
    rampAt: (position) => rampAt(position, t),
    rampFor: (value, min, max) => rampFor(value, min, max, t),
    gridProps: gridPropsOf(t),
    xAxisProps: xAxisPropsOf(t),
    yAxisProps: yAxisPropsOf(t),
    tooltipProps: tooltipPropsOf(t),
    barTooltipProps: barTooltipPropsOf(t),
    legendProps: legendPropsOf(t),
    proposedLine: proposedLineOf(t),
    baselineLine: baselineLineOf(t),
    lineProps: linePropsOf(t),
    annotationLine: annotationLineOf(t),
    annotationLabel: annotationLabelOf(t),
    barProps: barPropsOf(t),
  };
}

// --- formatters --------------------------------------------------------------
// Pure; no colour, no theme.

/** Axis ticks: rounded money, e.g. 160000 -> "$160k", -2500 -> "-$2.5k". */
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

/** Tooltip values: whole dollars with separators, e.g. "$1,234". */
export const currencyValue = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString()}`;
};

/** <BarChart /> spacing — keeps a gap of paper between touching bars. */
export const barChartProps = { barGap: 2, barCategoryGap: '28%' };
