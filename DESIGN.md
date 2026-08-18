# Design system — Instrument

> This is scientific equipment, not a dashboard. A deep field, quiet chrome, and data that
> is the only thing allowed to be bright. The luminance IS the measurement.

Normative. Read before changing anything visual, and before asking any model to generate UI
for this repo. It exists because three previous attempts drifted — twice to the generated
mean, once into sterility.

## The one rule

**Chroma belongs to data. Nothing else.**

A colour may appear only if it encodes a measured quantity: a plotted series, a numeric
readout, a live-state indicator, a threshold marker. Chrome — panels, rules, labels, borders,
backgrounds, icons, nav — is achromatic, always. If you are reaching for colour to make
something "pop", stop: that is decoration, and it is what turns an instrument into a neon
dashboard.

The corollary is what makes this work: because chrome is silent, data reads as luminous
without a single glow effect.

## Forbidden, by name

- **Glow of any kind.** No `box-shadow` used as bloom, no `filter: drop-shadow` on data, no
  text-shadow. Brightness comes from the colour against the dark field, never from blur.
- Glassmorphism, `backdrop-filter`, gradient meshes, radial "aurora" backgrounds
- Cream / beige / sand / warm off-white grounds (`#f9f9f7`, `#f4f3ee`); amber / rust /
  terracotta accents (`#b45309`, `#c96442`)
- `#0f172a` slate grounds; purple-to-cyan gradients; neon-on-black as decoration
- Serif display faces; emoji as iconography
- 8px radius and 1px hairline card borders as the default container; three-across feature-card
  grids; 4px coloured left-rule accent bars
- Inter, IBM Plex Sans, Geist, Satoshi
- Entrance animation, hover lift, hover scale
- A spacing scale where every value is a multiple of 8

## Tokens

Declared once in `src/index.css` via `light-dark()`; `tailwind.config.js` colours are
`var(--token)` references. Recharts cannot read custom properties, so chart colours resolve at
runtime through `src/components/chartTheme.js` — never hardcode a hex in a component.

Dark is primary; light is a genuine re-pick ("the same instrument in daylight"), not an
inversion.

| token | light | dark | role |
|---|---|---|---|
| `--field` | `#eaeff4` | `#080d14` | page ground |
| `--surface` | `#ffffff` | `#0e151f` | panel |
| `--raised` | `#f4f7fa` | `#16202c` | nested panel, table zebra |
| `--overlay` | `#ffffff` | `#1c2836` | tooltip, modal |
| `--ink` | `#0a1420` | `#c4d2e3` | readouts, headings |
| `--ink-2` | `#3d4f60` | `#a8bccf` | body |
| `--ink-3` | `#55697d` | `#7d92a8` | mono micro-labels, axis text |
| `--rule` | `#d4dde6` | `#1e2a38` | 1px division |
| `--rule-strong` | `#aebdcc` | `#24384c` | 2px division, active |
| `--control-edge` | `#7f91a3` | `#687d92` | resting edge of an interactive control |
| `--scrim` | `rgb(10 20 32 / .45)` | `rgb(2 5 9 / .66)` | modal backdrop |

Verified WCAG 2.1 — dark: ink 12.7 / ink-2 10.0 / ink-3 6.1 on `--field`; light: ink 16.0 /
ink-2 7.3 / ink-3 4.9. Dark body text (`--ink-2`, 10.0:1) sits inside the 7–12:1 band rather
than at 17–21:1, which halates for readers with astigmatism. `--ink` is for large readouts and
headings; **body copy uses `--ink-2`**.

**A rule that divides is not a rule that affords.** `--rule` and `--rule-strong` are
typographic division — they measure 1.37 / 1.92 light and 1.26 / 1.52 dark on `--surface`, which
is right for paper and nowhere near the 3:1 WCAG 1.4.11 wants to *identify a component*. The
borderless inputs in this system have nothing but their underline at rest, so that underline
comes off `--control-edge` (3.24:1 light, 4.31:1 dark on `--surface`) and never off `--rule`.
Dark `--rule` is also deliberately off `#16202c`: that was byte-identical to `--raised`, so a
1px rule inside a zebra row measured 1.00:1 and did not render at all.

## Data colours — the only chroma in the system

Entity mapping is fixed app-wide and never repainted by filter or series count.

| token | light | dark | always means |
|---|---|---|---|
| `--d-solar` | `#0b6f96` | `#35d3ff` | solar · battery · EV · the proposed system |
| `--d-grid` | `#c2410c` | `#ff8a5c` | utility · grid import · doing nothing · the gas car |
| `--d-third` | `#6d28d9` | `#b98cff` | export credit / rare third series (legend required) |
| `--d-good` | `#047857` | `#38e08c` | positive delta, live/OK state |
| `--d-bad` | `#b91c1c` | `#ff6b6b` | negative delta, expired/void state |

All clear 3:1 against every surface in both themes. Light spans 4.5–7.1 (floor: `--d-grid` on
`--field`); dark spans 5.4–11.3 (floor: `--d-bad` on `--overlay`, which is the worst dark ground
in the system and the one to measure a new data colour against; ceiling: `--d-good` on
`--field`).

**Redundant encoding is mandatory** — `--d-solar` is a 2px solid stroke with a 12% (light) /
18% (dark) wash; `--d-grid` is 1.5px dashed with no fill. The chart must survive greyscale,
print and colour-vision deficiency without relying on hue.

## The irradiance ramp — the one sequential scale

Six ordinal stops, low irradiance to high, for encoding a **measured quantity** wherever one is
shown: a month cell, a chart band, a readout taking its hue from its own magnitude. Both themes
walk one hue path (violet → blue → teal → green → olive/citron) so they tell the same story;
light runs pale→deep because the page is pale, dark runs deep→bright because the field is dark.

Stops are **stepped, never interpolated**. Consumers go to the nearest stop (`rampIndexFor` in
`chartTheme.js`) because the six were measured and a colour mixed between two of them was
verified against nothing. Six is also the resolution a reader can count against a legend.

The ramp has **two series, because a fill and a foreground owe different contrast**:

| stop | fill `--ir-N` light / dark | foreground `--ir-t-N` light / dark |
|---|---|---|
| 0 | `#af97d8` / `#7a6ee0` | `#7e6d9d` / `#8074eb` |
| 1 | `#508ad6` / `#3f8fdd` | `#4171b1` / `#3f8fdd` |
| 2 | `#0c8390` / `#17b0b8` | `#0a7682` / `#17b0b8` |
| 3 | `#1c763a` / `#4fd07a` | `#1c763a` / `#4fd07a` |
| 4 | `#3f6211` / `#b9e05a` | `#3f6211` / `#b9e05a` |
| 5 | `#5a4907` / `#f2f08a` | `#5a4907` / `#f2f08a` |

**Fills** (`bg-ir-N`, `fill-ir-N`) carry the strip, the bands and the legend swatches. Measured
on `--surface`, light runs 2.55 / 3.53 / 4.50 / 5.67 / 7.08 / 8.78 and dark runs 4.48 / 5.40 /
6.93 / 9.28 / 12.11 / 15.37; adjacent stops hold ≥1.20 luminance separation, so the ramp never
reads as one blob. **Light `--ir-0` is the one exception to the 3:1 floor below** — 2.55:1 on
`--surface`, 2.20:1 on `--field`. It is the sequential low end and the accepted convention for
"near zero", and it is only ever reached in a place that is redundantly encoded three ways over:
every `MonthStrip` cell carries a `title` with its figure, a visually-hidden table carries all
twelve, and the mono row beneath names the low and the peak in calendar order. No reader is ever
asked to pull a quantity out of that hue alone.

**Foregrounds** (`text-ir-t-N`, reached only through `toneForValue`) ink a figure from its own
magnitude. A figure is text, and text owes 4.5:1 at any size in this scale, so the three stops
that failed as type were re-pitched: light 4.60 / 4.97 / 5.35 / 5.67 / 7.08 / 8.78 and dark 4.90
/ 5.40 / 6.93 / 9.28 / 12.11 / 15.37, all measured on `--surface`, which is the sheet every
toned figure sits on. The light low end is compressed relative to the fill series — hue carries
the separation there — and that is affordable because the tone on a readout is redundant by
construction: the figure states the value, always.

**A ramp stop is never chrome.** Behind a panel, under a heading or inside an icon it is the
same violation a `--d-*` colour there would be. And a fill stop is never a foreground: nothing
in the app writes `text-ir-N`.

## Typography

Two self-hosted OFL variable faces, subset with features preserved (see
`src/assets/fonts/LICENSES.md`). Never use a Google Fonts CSS-API build — those strip `tnum`
and `zero`, which is how an earlier build shipped an inert `.tnum` class.

- **Archivo** (`wght` 100–900, `wdth` 62–125) — readouts and headings. The width axis is the
  second voice: condensed (62–75) heavy for large figures.
- **Spline Sans Mono** (`wght` 300–700) — every micro-label, unit, axis tick and status string.
  Mono is the instrument's voice; it carries far more of the interface here than in a normal
  app.

Micro-labels are the signature: 9–10px, weight 600, uppercase, `+0.14em`, `--ink-3`,
`font-feature-settings: 'case' 1`. They label every readout, panel and axis, the way silkscreen
labels a faceplate.

Scale is bi-modal: functional 10 / 11 / 12 / 13 / 15 / 17 / 22 — 10 is the floor, and it is the
size the `.eyebrow` signature is set at — and a readout run of 28 / 40 / 56.
Line-height falls as size rises. Figures are `lining-nums tabular-nums` with `'zero' 1`
(slashed zero); prose (`p`, `li`) overrides to `oldstyle-nums proportional-nums`.

## Structure

- **Every screen leads with data, never with prose.** The landing page opens on a live plot
  with real readouts — not a headline over empty space. If a view has nothing to plot yet, it
  plots the default case.
- **Readout blocks**: a mono micro-label above, a large Archivo-condensed figure, and its unit
  in mono at 0.4× in `--ink-3`. Grouped in ruled clusters, never in cards.
- Panels are flat `--surface` fields separated by 1px `--rule`. No borders around containers,
  no radius above 2px, no shadow except the one modal.
- Split pane on every calculator: inputs sticky left, results live right.
- A 44px sticky context bar carries the premises the numbers depend on.
- Assumptions live on the page in a marginalia rail — **never in a tooltip**.
- The 25-year projection is a real `<table>`: `border-collapse: collapse`, 28px rows, cell
  padding `0.125em 0.5em 0.25em 0.5em`, right-aligned tabular figures, TOTAL row inverted.
- **Density is a feature.** This is an instrument for people who read numbers. Do not pad it
  out with whitespace to look calm.

## The signature: the struck row

Any line item that is zero **because of a real-world fact** is printed, not omitted, then
struck with a 1px `--d-bad` rule, with the reason in mono alongside:

> Federal tax credit (IRC 25D) · $0 · expired for installs after 2025-12-31

The dead credit is visibly zeroed rather than silently absent — the brand claim rendered as
typography instead of copy.

## Non-negotiables

- **Zero external requests.** Fonts self-hosted; no CDN, no remote images.
  `grep -r "googleapis\|gstatic" dist/` must return nothing.
- **No new runtime dependencies.** Plots, sparklines and indicators are inline SVG.
- Accessibility: 4.5:1 text, 3:1 for large text and every data colour against its own surface,
  and 3:1 for anything that identifies a control or its state. The one written exception is
  light `--ir-0` as a *fill*; see the ramp section, which states why and bounds where it can be
  reached. Never rely on hue alone — pair every colour with a label, a dash pattern or a
  position, and never signal a selected row by background wash alone.
- **Print forces the light theme** — pin `color-scheme: light` and the light tokens in
  `@media print`.
- **The marginalia rail prints.** Every footnote marker on every sheet is answered there, and
  `StruckRow` drops its visible reason to `sr-only` as soon as it is given a marker — so a rail
  hidden from the sheet prints struck figures whose asterisks point at nothing, and takes the
  assumptions off the one artefact `@media print` exists to serve.
- **`src/engine/` and `src/data/` are byte-identical.** Visual work never touches the math.
