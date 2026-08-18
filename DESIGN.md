# Design system — Counterfoil

> A counterfoil is the stub of a cheque: the part you keep, the record of what happened.
> This product is the honest counterpart to the document the customer already holds — their
> utility bill. So it is built like one: safety paper, ruled line items, a right-aligned
> figure column, footnotes, no boxes.

This file is normative. Read it before changing anything visual, and before asking any model
to generate UI for this repo. It exists because two previous redesigns drifted to the
statistical middle of generated UI, and prose briefs alone select a region of that same
distribution — exclusion has to be written down by name.

## The one rule

**There is no accent colour.** Emphasis is weight, size, and rule-weight. Links are underlined
ink. The single chromatic mark in the interface, `--mark`, is rationed to exactly one job:
marking a disclosure. Auditor's red pen. If red appears on anything that is not a disclosure,
that is a bug, not a style choice.

## Forbidden, by name

Do not reintroduce any of these, in any repo that shares this system:

- Cream / beige / sand / parchment / warm off-white page grounds — `#f9f9f7`, `#f4f3ee`,
  `#faf9f5`, `#fdfcfa` and their neighbours
- Amber / rust / terracotta / clay / burnt-orange accents — `#b45309`, `#c96442`, `#d97757`
- Serif display faces; tracked-out letterspaced subheads used decoratively
- 8px border radius. Radius is **0** here, everywhere, absolutely
- 1px hairline borders drawn around cards; cards themselves; three-across feature-card grids
- 4px coloured left-rule accent bars
- Inter, IBM Plex Sans, Geist, Satoshi
- `#0f172a` (or any slate-900 ground) plus one neon accent; glassmorphism; gradient meshes;
  glow shadows; entrance animations; hover lift
- Emoji used as iconography
- A spacing scale where every value is a multiple of 8 — that regularity is itself a tell

Rationale: the first of these lists is the catalogued "AI aesthetic" (beige grounds, orange
accents, serif type); the rest are the shadcn/Vercel default shape. A design a reader
recognises as "the AI default" fails this project on its own terms, because the product's
entire claim is that it is not generic and not selling anything.

## Tokens

Defined once in `src/index.css` using `light-dark()`, consumed everywhere through
`var(--token)`. `tailwind.config.js` colours are `var(--token)` references, so CSS owns all
colour and no component markup changes when the theme flips. Recharts cannot read CSS custom
properties, so chart colours resolve at runtime from computed style — never hardcode a hex in
a component.

| token | light | dark | role |
|---|---|---|---|
| `--paper` | `#ecf6f0` | `#091516` | page ground (safety paper / ink-well) |
| `--surface` | `#f7fdf9` | `#121f21` | sheet |
| `--field` | `#e1ede5` | `#0d1a1c` | inputs |
| `--sunken` | `#d7e4db` | — | wells, table zebra |
| `--raised` | — | `#1a292b` | dark elevation |
| `--overlay` | `#ffffff` | `#233234` | tooltips, modals (floats above plot) |
| `--ink` | `#0d2527` | `#d2dad5` | figures, headings (ink-teal, never black) |
| `--ink-2` | `#445b5d` | `#adb9b5` | body |
| `--ink-3` | `#516669` | `#92a19c` | footnotes, axis text |
| `--hair` | `#d7e3df` | `#273732` | 0.5px rule |
| `--rule` | `#b1c2bd` | `#3d4f4a` | 1px rule |
| `--rule-heavy` | `#0d2527` | `#80908b` | 2px rule |
| `--chart-grid` | `#dae5e1` | `#23312d` | gridlines |
| `--baseline` | `#91a39d` | `#485a54` | axis baseline |
| `--mark` | `#b91c1e` | `#f67a6e` | **disclosure only** |
| `--mark-wash` | `#ffe8e5` | `#44231f` | disclosure ground |
| `--good` | `#00674d` | `#6dcdab` | positive delta |
| `--bad` | `#b12c2e` | `#ed8079` | negative delta |
| `--selection` | `#edddb5` | `#4a3b13` | text selection |
| `--focus` | `#b91c1e` | `#f67a6e` | focus ring |
| `--wash-opacity` | `0.12` | `0.18` | chart area fills |

Dark is **re-picked, not inverted**: surfaces are the ink hue at low lightness (an ink-well
ground, not slate), five elevation steps ~4 lightness points apart, and text sits in the
7–12:1 band — never 15–21:1, which halates for readers with astigmatism.

## Chart series — entity-stable, never repainted

`--s-proposed` is always solar / battery / EV / the proposed system.
`--s-baseline` is always utility / grid import / do-nothing / the gas car.
`--s-third` is rare and requires a legend.

| | light | dark |
|---|---|---|
| `--s-proposed` | `#006465` | `#76d5d5` |
| `--s-baseline` (fill) | `#a5856a` | `#937760` |
| `--s-baseline-stroke` | `#816246` | — |
| `--s-third` | `#411f6a` | `#ae92e0` |

The clean thing is chromatic; the purchased thing is deliberately muddy, so saturation carries
the argument before the legend does. **Redundant encoding is mandatory**: proposed is a 2px
solid stroke with a wash, baseline is 1.5px dashed with no fill — the chart must survive
greyscale, a photocopier and colour-vision deficiency without relying on hue.

## Typography

Two self-hosted OFL variable faces, subset with features preserved (see
`src/assets/fonts/LICENSES.md`). **Never** use a Google Fonts CSS-API build: those strip
`tnum` and `zero`, which is exactly how a previous build shipped an inert `.tnum` class.

- **Archivo** (`wght` 100–900, `wdth` 62–125) — the width axis is the second voice.
- **Spline Sans Mono** (`wght` 300–700) — units, currency symbols, footnote reasons.

Scale is bi-modal, never even steps: functional band 11 / 12 / 13 / 15 / 17 / 22; display run
28 / 40 / 56. Line-height falls as size rises (1.50 at 13–15 → 1.05 at 56). Tracking is a
curve, shipped as tokens: `−0.0223 + 0.185·e^(−0.1745·px)` (crosses zero at ~12.1px).

Figures: `font-variant-numeric: lining-nums tabular-nums` globally with `'zero' 1` (slashed
zero); prose (`p`, `li`) overrides to `oldstyle-nums proportional-nums`. Units are Spline Sans
Mono at 0.74× the figure size in `--ink-3`, once per column, never repeated per row. Footnote
markers use `font-variant-position: super`, not `<sup>`. Footnote order is the Economist's:
`* † ‡ § ** †† ‡‡ §§`.

## Structure

No sidebar. No cards. No radius. Containers have **no borders** — only horizontal rules at
three genuinely different weights (0.5 / 1 / 2px) doing hierarchical work the way a bill does.

- Top masthead; tool list as a horizontal ruled index.
- 44px sticky context bar carrying system size, annual usage, blended rate and assumption-set
  name, so figures are never orphaned from their premises.
- Page grid `minmax(0,1fr) 22rem`; the outer column is a marginalia rail holding assumption
  sidenotes keyed to figures by footnote marker. Assumptions live on the page — **never in a
  tooltip**.
- Every calculator is a split pane: inputs left and sticky, results right and live.
- The 25-year projection is a real `<table>`: `border-collapse: collapse`, header rule 0.5px
  at full ink, row rules 0.3px at 50%, cell padding `0.125em 0.5em 0.25em 0.5em`
  (asymmetric — optical centring is not geometric centring), row height locked to 28px with
  type fitted inside it. TOTAL row solid-filled with inverted text.
- Numbered sections `01/02/03`; numbered figure captions (`Fig. 3 — Winter production`).

## The signature: the struck row

Any line item that is zero **because of a real-world fact** is printed, not omitted, then
struck through with a 1px `--mark` rule across the figure, with the reason in the margin rail:

> Federal tax credit (IRC 25D) · $0 · expired for installs after 2025-12-31

The dead credit is present and visibly zeroed rather than silently absent. That is the brand
claim rendered as typography instead of copy, and it is the one thing a competitor cannot copy
without also adopting the honesty.

Paired with the **counterfoil tear**: a hand-drawn perforation (an SVG path with an irregular,
hand-set dash rhythm and slight vertical jitter — not `border-style: dashed`) separating "your
numbers" from "our assumptions".

## Non-negotiables

- **Zero external requests.** All fonts self-hosted. No CDN, no Google Fonts link, no remote
  images. `grep -r "googleapis\|gstatic" dist/` must return nothing.
- **No new runtime dependencies.** Hatches, perforations and sparklines are inline SVG.
- **Accessibility:** design to APCA and OKLCH lightness bands, verify against WCAG 2.1.
  Text 4.5:1; large text and every chart series against its own surface 3:1. Do not optimise
  for WCAG 2 in dark mode — it overstates the contrast of dark colours.
- **Print forces the light theme** — pin `color-scheme: light` and the light tokens in
  `@media print`, or a consultant printing from dark mode gets an unreadable sheet.
- **`src/engine/` is byte-identical.** Visual work never touches the math.
