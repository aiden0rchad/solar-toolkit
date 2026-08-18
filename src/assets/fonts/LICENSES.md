# Bundled font licenses

Both faces are subset from their upstream variable sources with all required OpenType
layout features preserved (`pyftsubset --layout-features=...`). Google Fonts' CSS-API
subsets strip features such as `tnum` and `zero`; this project must not use those builds.

## Archivo — `archivo-latin.woff2`
Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)
SIL Open Font License 1.1. Axes: `wght` 100–900, `wdth` 62–125.
Features retained: ccmp, locl, kern, liga, tnum, lnum, onum, pnum, zero, case, frac,
numr, dnom, sups, subs, ordn.

## Spline Sans Mono — `spline-mono-latin.woff2`
Copyright 2022 The Spline Sans Mono Project Authors (https://github.com/SorkinType/SplineSansMono)
SIL Open Font License 1.1. Axis: `wght` 300–700.
Features retained: ccmp, locl, kern, zero, frac, numr, dnom, sups, subs.
Monospace, so its figures are inherently tabular and it needs no `tnum`.
