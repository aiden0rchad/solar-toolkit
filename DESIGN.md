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
| `--rule` | `#d4dde6` | `#16202c` | 1px division |
| `--rule-strong` | `#aebdcc` | `#24384c` | 2px division, active |
| `--scrim` | `rgb(10 20 32 / .45)` | `rgb(2 5 9 / .66)` | modal backdrop |

Verified WCAG 2.1 — dark: ink 17.2 / ink-2 10.0 / ink-3 6.1 on `--field`; light: ink 16.0 /
ink-2 7.3 / ink-3 4.9. Dark body text (`--ink-2`, 10.0:1) sits inside the 7–12:1 band rather
than at 17–21:1, which halates for readers with astigmatism. `--ink` is for large readouts and
headings; **body copy uses `--ink-2`**.

## Data colours — the only chroma in the system

Entity mapping is fixed app-wide and never repainted by filter or series count.

| token | light | dark | always means |
|---|---|---|---|
| `--d-solar` | `#0b6f96` | `#35d3ff` | solar · battery · EV · the proposed system |
| `--d-grid` | `#c2410c` | `#ff8a5c` | utility · grid import · doing nothing · the gas car |
| `--d-third` | `#6d28d9` | `#b98cff` | export credit / rare third series (legend required) |
| `--d-good` | `#047857` | `#38e08c` | positive delta, live/OK state |
| `--d-bad` | `#b91c1c` | `#ff6b6b` | negative delta, expired/void state |

All clear 3:1 against every surface in both themes (light 4.5–7.1; dark 6.6–11.3).

**Redundant encoding is mandatory** — `--d-solar` is a 2px solid stroke with a 12% (light) /
18% (dark) wash; `--d-grid` is 1.5px dashed with no fill. The chart must survive greyscale,
print and colour-vision deficiency without relying on hue.

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

Scale is bi-modal: functional 10 / 11 / 12 / 13 / 15 / 17; readout run 26 / 34 / 48 / 64.
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
- Accessibility: 4.5:1 text, 3:1 for large text and every data colour against its own surface.
  Never rely on hue alone — pair every colour with a label, a dash pattern or a position.
- **Print forces the light theme** — pin `color-scheme: light` and the light tokens in
  `@media print`.
- **`src/engine/` and `src/data/` are byte-identical.** Visual work never touches the math.
