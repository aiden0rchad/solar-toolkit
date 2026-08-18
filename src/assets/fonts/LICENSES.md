# Bundled font licenses

Both faces are subset from their upstream variable sources with the required OpenType layout
features preserved (`pyftsubset --layout-features=...`). Google Fonts' CSS-API builds strip
features such as `tnum`; this project must not use those builds.

## Public Sans — `public-sans-latin.woff2`
Copyright the Public Sans Project Authors (https://github.com/uswds/public-sans)
SIL Open Font License 1.1. Axis: `wght` 100–900.
Features retained: ccmp, locl, kern, liga, calt, tnum, lnum, onum, pnum, frac, numr, dnom,
sups, subs, ordn, ss01.

`ss01` substitutes an alternate `g` and a tailed `l`. The tailed `l` is enabled globally: it
disambiguates `l` from `1` and `I`, which matters in a product that is mostly figures.

**Neither face has a `zero` feature**, so there is no slashed zero available and the design
system must not ask for one. Verified with fontTools, not assumed — an earlier build shipped a
`.tnum` class against a font with no `tnum`, and it silently did nothing.

## Roboto Mono — `roboto-mono-latin.woff2`
Copyright the Roboto Mono Project Authors (https://github.com/googlefonts/RobotoMono)
Apache License 2.0. Axis: `wght` 100–700.
Monospace, so its figures are inherently tabular and it needs no `tnum`.
