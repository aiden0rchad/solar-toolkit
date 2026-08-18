import { useId } from 'react';
import { Battery, Sun } from 'lucide-react';
import { RAMP_STOPS, rampIndexFor } from './chartTheme';

// =============================================================================
// INSTRUMENT — shared primitives.
//
// The grammar every tool inherits: no boxes, no radius, no shadow, no accent.
// Hierarchy is carried by three rule weights (0.5 / 1 / 2px) and by type size,
// weight and width, the way a bill carries it. Colour arrives only through
// token classes (`bg-surface`, `text-ink-3`, `border-rule-strong`); there is
// never a hex in this file.
// =============================================================================

/**
 * A footnote marker keying a figure to its sidenote in the marginalia rail.
 *
 * `font-variant-position: super` raises the font's REAL superior glyph — both
 * bundled faces keep `sups` — so there is deliberately no `font-size` here:
 * shrinking a superior glyph shrinks something already small, and doing it in
 * some tools and not others made the same symbol two sizes across the app.
 * `<sup>` is not used for the same reason: it synthesises the glyph.
 */
export const Marker = ({ symbol, className = 'ml-0.5' }) =>
  symbol
    ? (
      <span
        className={`select-none font-mono text-ink-3 ${className}`}
        style={{ fontVariantPosition: 'super' }}
        aria-hidden="true"
      >
        {symbol}
      </span>
    )
    : null;

/** Does the caller already own the padding on this element? */
const hasPadding = (className) => /(?:^|\s)-?p[xytrbles]?-/.test(className);

/**
 * SHEET (exported as `Card` — tools import that name).
 *
 * Not a card: no border, no radius, no shadow, no clipping. A sheet is a
 * section of a document, introduced by a 2px `--rule-strong` top rule and given
 * room to breathe. The rule is the only edge it has; the paper around it does
 * the rest of the separating.
 *
 * Padding is a default, not a fixture — a caller that brings its own `p-*`
 * keeps it, because Tailwind's cascade would otherwise decide the winner by
 * scale order rather than by intent.
 */
export const Card = ({ children, className = "" }) => (
  <div
    className={`border-t-2 border-rule-strong bg-surface ${hasPadding(className) ? '' : 'px-6 pb-7 pt-5'} ${className}`}
  >
    {children}
  </div>
);

/**
 * A ruled form field, not a box.
 *
 * The label is a column head (`.eyebrow`); the input is borderless with a
 * single 1px `--control-edge` underneath it, so a stack of fields reads as a
 * ruled form. That underline is the field's whole resting affordance, so it
 * comes off the control weight rather than off `--rule`: `--rule` is
 * typographic division and measures 1.37:1 light / 1.26:1 dark on `--surface`,
 * which identifies nothing. The figure is tabular and right-aligned; the unit
 * sits at the end of that column in Spline Sans Mono at 0.74× in `--ink-3`.
 * `--field` appears only under focus, and the focus ring is the global
 * `--focus` outline.
 *
 * The parse behaviour is load-bearing and unchanged: an empty box yields NaN so
 * a caller can tell "cleared" from 0, the box renders blank while the value is
 * NaN, and clamping stays with the caller's `onBlur`.
 *
 * `tooltip` is a misnomer kept for its callers: the text it carries is an
 * assumption, and assumptions live ON THE PAGE — never in a hover popup and
 * never behind a click. It prints as an 11px `--ink-3` footnote directly under
 * the field, tied to the input by `aria-describedby`, so a reader on a phone,
 * on a keyboard or on a printed sheet gets the same premise a mouse user does.
 */
export const InputField = ({ label, value, onChange, onBlur, unit, step = "0.1", tooltip, min = 0, disabled = false, readOnly = false }) => {
  // Generated id ties the label to the input — without it every numeric field in the
  // app is announced as an unlabelled spin button.
  const id = useId();
  const noteId = `${id}-note`;
  return (
    <div className={`mb-4 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <label htmlFor={id} className="eyebrow mb-1 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          value={isNaN(value) ? '' : value}
          onChange={(e) => {
            if (!readOnly) {
              const val = e.target.value;
              onChange(val === '' ? NaN : parseFloat(val));
            }
          }}
          onBlur={onBlur}
          min={min}
          disabled={disabled || readOnly}
          readOnly={readOnly}
          aria-describedby={tooltip ? noteId : undefined}
          style={{
            fontSize: 'var(--size-15)',
            lineHeight: 'var(--lh-15)',
            letterSpacing: 'var(--track-15)',
            paddingRight: unit ? `${unit.length * 0.46 + 0.5}rem` : undefined,
          }}
          className={`tnum h-9 w-full border-0 border-b border-control-edge bg-transparent pb-1 pl-0 pt-1 text-right font-sans text-ink [appearance:textfield] focus:bg-field [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${readOnly ? 'cursor-not-allowed text-ink-3' : ''}`}
          step={step}
        />
        {unit && (
          <span
            className="pointer-events-none absolute bottom-1.5 right-0 font-mono text-ink-3"
            style={{ fontSize: 'calc(var(--size-15) * 0.74)', lineHeight: 1 }}
          >
            {unit}
          </span>
        )}
      </div>
      {tooltip && (
        <p
          id={noteId}
          className="mt-1 max-w-[46em] text-ink-3"
          style={{ fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' }}
        >
          {tooltip}
        </p>
      )}
    </div>
  );
};

/**
 * Two named alternatives, set as a ruled index rather than a segmented pill.
 * The chosen one carries the 2px rule; the other carries none.
 */
export const ProposalSelector = ({ mode, setMode }) => (
  <div className="mb-6 flex gap-8 border-b-[0.5px] border-rule">
    <button
      onClick={() => setMode('new')}
      className={`eyebrow -mb-px flex items-center gap-1.5 border-b-2 bg-transparent px-0 pb-2 pt-1 ${mode === 'new'
        ? 'border-rule-strong text-ink'
        : 'border-transparent text-ink-3 hover:text-ink-2'
        }`}
    >
      <Sun size={13} aria-hidden="true" /> New Solar + Battery
    </button>
    <button
      onClick={() => setMode('retrofit')}
      className={`eyebrow -mb-px flex items-center gap-1.5 border-b-2 bg-transparent px-0 pb-2 pt-1 ${mode === 'retrofit'
        ? 'border-rule-strong text-ink'
        : 'border-transparent text-ink-3 hover:text-ink-2'
        }`}
    >
      <Battery size={13} aria-hidden="true" /> Add Battery to Solar
    </button>
  </div>
);

/** One entry in a ruled index of views. Selected carries the 2px rule. */
export const ChartTab = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`eyebrow -mb-px border-b-2 bg-transparent px-0 pb-2 pt-1 ${active
      ? 'border-rule-strong text-ink'
      : 'border-transparent text-ink-3 hover:text-ink-2'
      }`}
  >
    {label}
  </button>
);

/**
 * A numbered figure caption — `Fig. 3 — Winter production`. Sits above the
 * chart it names, so a figure is never orphaned from its number when a reader
 * follows a footnote marker up from the marginalia rail.
 *
 * `number` is the figure number; the caption is `caption` or children.
 */
export const Figure = ({ number, caption, children, className = "" }) => (
  <div
    className={`text-ink-3 ${className}`}
    style={{ fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' }}
  >
    <span className="font-mono font-medium">Fig.&nbsp;{number}</span>
    <span aria-hidden="true"> — </span>
    {caption ?? children}
  </div>
);

/**
 * THE SIGNATURE.
 *
 * A line item that is zero because of a real-world fact is printed, then
 * visibly zeroed — never silently absent. The figure keeps its ink and takes a
 * 1px `--d-bad` rule straight through it: the STRIKE is the disclosure marker,
 * and it is the only chroma this row is allowed. It is permitted because it is
 * doing an auditor's job, not a decorative one.
 *
 * The reason is prose, therefore chrome, therefore achromatic — Spline Sans
 * Mono in `--ink-3`. It used to wear `--d-bad`, which put the alarm colour on
 * strings like "bought with cash — nothing is financed": a neutral fact about
 * the configuration, not a void state. Chroma belongs to data and nothing else,
 * and the strike above already says the zero is deliberate.
 *
 * `reason` takes a node as well as a string, so a caller whose reason really is
 * a void state — "expired for installs after 2025-12-31" — can ink that clause
 * `--d-bad` itself. Per-row, because only the caller knows which it has.
 *
 * The reason belongs in the margin rail. Pass a `marker` and the struck figure
 * carries the symbol while the caller prints the reason as a sidenote keyed to
 * it; the reason then stays on the row for a screen reader, which has no margin
 * to glance at and cannot hear a line-through. Without a marker — in a tool that
 * renders no rail — it prints under the figure instead. Either way it is
 * printed: this row exists to say why a zero is a zero.
 */
export const StruckRow = ({ label, value, reason, marker, className = "" }) => (
  <div className={`border-b-[0.5px] border-rule py-1.5 ${className}`}>
    <div className="flex items-baseline justify-between gap-4">
      <span
        className="text-ink-2"
        style={{ fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' }}
      >
        {label}
      </span>
      <span
        className="tnum flex-none text-ink"
        style={{ fontSize: 'var(--size-13)', lineHeight: 'var(--lh-13)', letterSpacing: 'var(--track-13)' }}
      >
        <span
          style={{
            textDecorationLine: 'line-through',
            textDecorationColor: 'var(--d-bad)',
            textDecorationThickness: '1px',
            textDecorationSkipInk: 'none',
          }}
        >
          {value}
        </span>
        <Marker symbol={marker} />
      </span>
    </div>
    {reason && (marker
      ? <span className="sr-only">{reason}</span>
      : (
        <div
          className="mt-0.5 font-mono text-ink-3"
          style={{ fontSize: 'var(--size-11)', lineHeight: 'var(--lh-11)', letterSpacing: 'var(--track-11)' }}
        >
          {reason}
        </div>
      ))}
  </div>
);

/**
 * The counterfoil tear — what separates "your numbers" from "our assumptions".
 *
 * Hand-set, not generated: the dash rhythm below is an explicit uneven sequence
 * and the path itself wanders a few tenths of a pixel up and down, because a
 * real perforation is punched by a machine with slop in it. `border-style:
 * dashed` would give a perfectly even rhythm, which is exactly the tell this
 * avoids. `non-scaling-stroke` keeps the rhythm in screen units, so stretching
 * the separator across a wider column does not stretch the punches with it.
 */
export const Perforation = ({ className = "", label = "Assumptions follow" }) => (
  <div className={`w-full text-rule ${className}`} role="separator" aria-label={label}>
    <svg
      width="100%"
      height="5"
      viewBox="0 0 1200 5"
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
      className="block w-full"
    >
      <path
        d="M0 2.6 L118 2.2 L241 2.9 L367 2.4 L488 3.1 L613 2.3 L742 2.8 L861 2.2 L984 2.9 L1103 2.4 L1200 2.7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="butt"
        strokeDasharray="7 4 5 5 9 3 6 6 4 5 8 4 5 7 6 3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  </div>
);

// =============================================================================
// THE IRRADIANCE RAMP
//
// The system's one sequential scale, and the second — and last — sanctioned use
// of chroma: a ramp stop may encode a MEASURED QUANTITY wherever a quantity is
// shown. It stays off the chrome. A ramp stop behind a panel, under a heading or
// inside an icon is the same violation an accent colour there would be.
//
// The class lists below are written out in full because they have to be: the
// Tailwind scanner reads source text, so `bg-ir-${i}` compiles to nothing and
// the strip would render as twelve transparent cells. Stepping lives once, in
// chartTheme's `rampIndexFor`, so the DOM cells and the SVG bands land on the
// same stop for the same number.
// =============================================================================

/** Stop index -> FILL token class. Literal strings; see above. */
const RAMP_BG = ['bg-ir-0', 'bg-ir-1', 'bg-ir-2', 'bg-ir-3', 'bg-ir-4', 'bg-ir-5'];

/**
 * Stop index -> FOREGROUND token class, and a different series from the fills
 * above on purpose.
 *
 * A fill is allowed the pale sequential low end: the strip carrying it is
 * redundantly encoded three ways (a title per cell, the sr-only table, the
 * LOW/PEAK marks), so no reader has to pull a quantity out of the hue. A figure
 * inked with a ramp stop is TEXT, and text owes 4.5:1 whatever size it is set
 * at — which light `--ir-0` (2.55:1 on `--surface`), light `--ir-1` (3.53:1)
 * and dark `--ir-0` (4.48:1) do not clear. `--ir-t-*` is the same hue path
 * re-pitched until every stop does; see the block in src/index.css for the
 * measurements. Nothing outside this array writes `text-ir-N`.
 */
const RAMP_TEXT = [
  'text-ir-t-0',
  'text-ir-t-1',
  'text-ir-t-2',
  'text-ir-t-3',
  'text-ir-t-4',
  'text-ir-t-5',
];

/**
 * A readout takes its hue from its own magnitude: `toneForValue(kwh, 0, peak)`
 * returns the ramp token class for the figure. For the FIGURE only — never for
 * the micro-label above it or the unit beside it, which are chrome.
 *
 * Returns a class, not a colour, so CSS keeps ownership of the value and the
 * readout re-tints on a theme flip without React hearing about it. It returns
 * the FOREGROUND series, so the answer is safe at any size in the scale — a
 * 13px line item as much as a 56px hero figure.
 */
export const toneForValue = (value, min, max) => RAMP_TEXT[rampIndexFor(value, min, max)];

const MONTH_LABELS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

/** Cell titles and the screen-reader table read the same figures. */
const readValue = (value) =>
  Number.isFinite(Number(value))
    ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
    : '—';

/**
 * MONTH STRIP — twelve months of production as twelve ramp cells, and the
 * densest element in the system: a year of seasonal shape in one 40px band.
 *
 * Each cell is stepped to the nearest ramp stop across the twelve, so the strip
 * encodes SHAPE — which months carry the year — rather than absolute output.
 * The scale is relative by design; the caption is where a caller states the
 * units and the total.
 *
 * It must be readable without colour, three ways over: every cell carries a
 * `title` with its month and figure, a visually-hidden table carries all twelve
 * for a screen reader, and the mono row beneath names the two extremes in
 * calendar order — so the low and the peak survive greyscale, a photocopier and
 * colour-vision deficiency, which is what the ramp owes any reader who cannot
 * separate its stops by hue.
 *
 * The 2px gaps are `--field` showing through, not margins: the page ground is
 * what separates the cells, the same way it separates every other sheet here.
 */
export const MonthStrip = ({ values, labels = MONTH_LABELS, caption, className = '' }) => {
  const cells = Array.from({ length: 12 }, (_, i) => Number(values?.[i]));
  const finite = cells.filter(Number.isFinite);
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 0;

  // Marked in calendar order, so the row reads left to right with the strip.
  // Deduped: a flat year has one cell that is both, and printing "LOW" and
  // "PEAK" on the same month would claim a variation that is not there.
  const marks = [
    { index: cells.indexOf(min), text: 'LOW' },
    { index: cells.indexOf(max), text: 'PEAK' },
  ]
    .filter(({ index }) => index >= 0)
    .filter(({ index }, i, all) => all.findIndex((m) => m.index === index) === i)
    .sort((a, b) => a.index - b.index);

  return (
    <figure className={`m-0 ${className}`}>
      <div className="flex gap-[2px] bg-field" aria-hidden="true">
        {cells.map((value, i) => (
          <div
            key={i}
            title={`${labels[i]} · ${readValue(value)}`}
            className={`h-10 flex-1 ${RAMP_BG[rampIndexFor(value, min, max)]}`}
          />
        ))}
      </div>

      {marks.length > 0 && (
        // One slot per cell, mirroring the strip's own flex geometry, so a mark
        // sits under the month it names. A `justify-between` row would push the
        // first mark to the far left and the second to the far right whatever
        // their real positions — which printed "JUL · PEAK" under January.
        // Labels are wider than a twelfth of the strip, so they are allowed to
        // overflow their slot rather than wrap or clip; the end slots align
        // inward so neither runs off the figure.
        <div className="mt-1 flex gap-[2px]" aria-hidden="true">
          {cells.map((_, i) => {
            const mark = marks.find((m) => m.index === i);
            return (
              <span key={i} className="min-w-0 flex-1">
                {mark && (
                  <span
                    className={`eyebrow block whitespace-nowrap ${
                      i <= 1 ? 'text-left' : i >= 10 ? 'text-right' : 'text-center'
                    }`}
                  >
                    {labels[i]} · {mark.text}
                  </span>
                )}
              </span>
            );
          })}
        </div>
      )}

      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {cells.map((value, i) => (
            <tr key={i}>
              <th scope="row">{labels[i]}</th>
              <td>{readValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {caption && (
        <figcaption
          className="mt-1.5 text-ink-3"
          style={{
            fontSize: 'var(--size-11)',
            lineHeight: 'var(--lh-11)',
            letterSpacing: 'var(--track-11)',
          }}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

/**
 * The key to the strip: six swatches between two mono labels. Six, because the
 * scale has six stops and a reader can count them — that is the whole argument
 * for a stepped ramp over a continuous wash.
 *
 * `low` / `high` are micro-labels, so a caller names what the ends actually
 * measure ("0 kWh" / "PEAK MONTH") rather than inheriting a generic pair.
 */
export const RampLegend = ({ low = 'LOW', high = 'HIGH', className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <span className="eyebrow">{low}</span>
    <div className="flex gap-[2px] bg-field" aria-hidden="true">
      {Array.from({ length: RAMP_STOPS }, (_, i) => (
        <span key={i} className={`block h-2 w-3 ${RAMP_BG[i]}`} />
      ))}
    </div>
    <span className="eyebrow">{high}</span>
  </div>
);
