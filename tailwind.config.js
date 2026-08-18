/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Radius is 0 here, everywhere, absolutely. Replacing (not extending) the
    // scale removes `rounded-sm/md/lg/xl/full` from the build entirely, so a
    // stray rounded-* class cannot silently reintroduce a card corner.
    borderRadius: {
      none: '0',
      DEFAULT: '0',
    },
    extend: {
      fontFamily: {
        sans: ['Archivo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Spline Sans Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      // Every colour is a `var(--token)` reference: CSS owns colour, so no
      // component markup changes when the theme flips. Never a hex here.
      colors: {
        // === INSTRUMENT ====================================================
        // Chrome — achromatic, always.
        field: 'var(--field)', //   page ground
        surface: 'var(--surface)', // panel
        raised: 'var(--raised)', //  nested panel, table zebra
        overlay: 'var(--overlay)', // tooltip, modal
        ink: {
          DEFAULT: 'var(--ink)', // readouts, headings
          2: 'var(--ink-2)', //     body
          3: 'var(--ink-3)', //     mono micro-labels, axis text
        },
        rule: {
          DEFAULT: 'var(--rule)', //     1px division
          strong: 'var(--rule-strong)', // 2px division, active
        },
        // The resting edge of an interactive control — NOT a division. 3:1 on
        // --surface in both themes, which --rule is not and is not meant to be.
        'control-edge': 'var(--control-edge)',
        scrim: 'var(--scrim)', // modal backdrop

        // Data — the ONLY chroma in the system. Entity-stable, never
        // repainted by filter or series count. DOM swatches only; charts
        // resolve these at runtime via src/components/chartTheme.js.
        'd-solar': 'var(--d-solar)', // solar · battery · EV · proposed
        'd-grid': 'var(--d-grid)', //   utility · grid import · do nothing
        'd-third': 'var(--d-third)', // export credit / rare third series
        'd-good': 'var(--d-good)', //   positive delta, live/OK
        'd-bad': 'var(--d-bad)', //     negative delta, expired/void

        // The irradiance ramp — the system's one SEQUENTIAL scale, and the
        // only other chroma allowed. Six ordinal stops, low -> high, for a
        // measured quantity: a month cell, a chart band, a readout tinted by
        // its own magnitude. Never on chrome — a ramp stop behind a panel or
        // under a heading is the same violation an accent colour there would
        // be. Stops are ordinal: consumers step to the nearest, never
        // interpolate.
        //
        // TWO SERIES, because a fill and a foreground owe different contrast.
        // `ir-N` is the FILL scale — `bg-ir-3`, `fill-ir-2` — and its pale low
        // end is the sanctioned sequential convention. `ir-t-N` is the
        // FOREGROUND scale: the same hue path re-pitched so every stop clears
        // 4.5:1 on --surface, and the only one a figure may wear. Write
        // `text-ir-t-N`, never `text-ir-N`; the mapping lives once, in
        // `toneForValue` (src/components/ui.jsx).
        'ir-0': 'var(--ir-0)', // lowest fill
        'ir-1': 'var(--ir-1)',
        'ir-2': 'var(--ir-2)',
        'ir-3': 'var(--ir-3)',
        'ir-4': 'var(--ir-4)',
        'ir-5': 'var(--ir-5)', // highest fill
        'ir-t-0': 'var(--ir-t-0)', // lowest foreground
        'ir-t-1': 'var(--ir-t-1)',
        'ir-t-2': 'var(--ir-t-2)',
        'ir-t-3': 'var(--ir-t-3)',
        'ir-t-4': 'var(--ir-t-4)',
        'ir-t-5': 'var(--ir-t-5)', // highest foreground
      },
    },
  },
  plugins: [],
}
