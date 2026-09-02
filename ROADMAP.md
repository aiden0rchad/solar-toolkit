# SolarPro Toolkit Roadmap

Backlog from early user feedback. Items are ordered by user impact, not effort.

## Product constraints

- Keep the app browser-only and deployable on GitHub Pages.
- Preserve the zero-signup, zero-tracking experience.
- Keep assumptions visible and editable.
- Default to zero external requests. Prefer bundled, cited datasets.
- Treat results as estimates, not quotes, engineering designs, or financial advice.

## P0: Preserve user inputs between tools

Inputs currently reset when a tool unmounts during navigation.

- [ ] Preserve each tool's inputs for the current browser session.
- [ ] Add an explicit **Reset to defaults** action to each tool.
- [ ] Ignore invalid or outdated saved state safely.
- [ ] Decide whether users should be able to opt into persistence across sessions.

Acceptance criteria:

- Custom values remain unchanged after navigating to another tool and back.
- Reload behavior is documented and consistent across tools.
- Reset restores the current version's defaults.
- Tests cover restore, reset, and malformed stored data.

Likely touchpoints: `src/App.jsx`, `src/tools/*.jsx`, and a small shared persistence hook.

## P1: Make the California scope unmistakable

- [ ] Label current results as using California-oriented defaults.
- [ ] Show the selected climate, utility-rate, and export-credit assumptions near results.
- [ ] Warn when a user has not replaced California defaults with local values.
- [ ] Update onboarding and the assumptions panel as regional support expands.

Acceptance criteria:

- A first-time user can tell which location and tariff assumptions drive a result.
- The interface never implies nationwide accuracy from California defaults.

## P1: Add manual solar-system sizing

Keep the current bill-first flow, then add an **Enter a system** mode.

- [ ] Add panel count.
- [ ] Add panel rated wattage in watts.
- [ ] Calculate DC system size: `panel count × panel wattage / 1000`.
- [ ] Add a target bill or annual-energy offset percentage for reverse sizing.
- [ ] Report calculated annual production and achieved usage offset.
- [ ] Keep system losses, orientation, degradation, and clipping assumptions visible.
- [ ] Validate impossible, missing, and extreme values.

Acceptance criteria:

- Users can start from either their bill or known system specifications.
- Changing panel count or wattage updates production, cost, payback, and offset.
- Target offset and achieved offset are clearly distinguished.
- Engine tests cover both sizing paths and boundary values.

Likely touchpoints: `src/tools/SimpleSolarROI.jsx`, `src/engine/solar.js`, and `src/engine/roi.js`.

## P1: Improve EV comparison inputs and break-even reporting

- [x] Extend the ownership horizon beyond 10 years with 15- and 20-year options or a validated custom value.
- [x] Add a custom MPG input alongside the current vehicle presets.
- [x] Apply trade-in value to the financed principal by default instead of treating it as an upfront cash-flow credit.
- [x] Keep financed trade-in equity applied to the loan by default; defer a separate cash-out mode until users request it.
- [x] Recalculate the loan payment, cumulative chart, and break-even month from the applied trade-in treatment.
- [x] Replace **before end-of-ownership settlement** with a plain-language explanation of what the break-even result includes and excludes.
- [x] Make end-of-ownership resale credit and remaining loan payoff visible without distorting the operating cash-flow chart.

Acceptance criteria:

- Users can model ownership periods long enough to compare an EV with a paid-off vehicle.
- Custom MPG immediately updates fuel cost, total ownership cost, and break-even results.
- Applying a trade-in to the loan reduces both principal and monthly payment exactly once.
- The chart's first point and reported break-even month use the same cash-flow treatment.
- Tests cover financed purchases with and without a trade-in, horizons longer than the loan term, and scenarios with no break-even.

Likely touchpoints: `src/tools/EVCalculator.jsx`, `src/engine/ev.js`, and the EV engine tests.

## P2: Introduce regional utility profiles

State alone is not precise enough. Model location, utility, tariff, and interconnection rules separately.

- [ ] Define a versioned regional-profile schema.
- [ ] Separate climate, import rates, fixed charges, export compensation, and escalation.
- [ ] Support utility or tariff-specific generation and export caps where applicable.
- [ ] Attach a source and last-reviewed date to every bundled profile.
- [ ] Let unsupported users enter all relevant values manually.
- [ ] Start with a small verified set of regions before expanding.

Acceptance criteria:

- Switching profiles updates every dependent assumption consistently.
- Caps produce an explained warning instead of silently changing output.
- Every preset exposes its source, date, and editable values.
- Tests prevent one region's assumptions from leaking into another.

Likely touchpoints: `src/data/ratePresets.js`, `src/data/nemRates.js`, `src/engine/solar.js`, and the assumptions UI.

## P2: Compare installation and ownership scenarios

- [ ] Add DIY and turnkey installer scenarios.
- [ ] Break out equipment, labor, permitting, interconnection, tax, and contingency costs.
- [ ] Keep cash and financed ownership calculations distinct.
- [ ] Model recurring maintenance or replacement costs where selected.
- [ ] Consider lease and PPA support separately because their cash flows differ from ownership.
- [ ] Allow side-by-side scenario comparison.

Acceptance criteria:

- DIY and turnkey totals are composed from visible line items.
- Financing applies only to financed costs and uses the displayed terms.
- Comparisons use identical production and utility assumptions unless the user changes them.

## P2: Improve solar-resource modeling without sacrificing privacy

Long-term ROI should use representative irradiance data, not current weather.

- [ ] Replace broad climate presets with validated long-term monthly solar-resource data.
- [ ] Evaluate a bundled region or ZIP lookup that works offline after load.
- [ ] Include dataset source, period, resolution, and update process.
- [ ] Keep manual monthly production or sun-hour entry available.
- [ ] Only consider a live API as an explicit opt-in with clear privacy and failure behavior.

Acceptance criteria:

- Default calculations make no runtime request to a weather or location service.
- Missing location data falls back visibly, never silently.
- Monthly production changes with the selected solar-resource profile.
- Tests cover lookup, fallback, and annual aggregation.

Likely touchpoints: `src/engine/solar.js`, a new static data module, and `src/tools/SimpleSolarROI.jsx`.

## Cross-cutting verification

- [ ] Add regression tests for navigation state.
- [ ] Add calculation fixtures for every supported regional profile.
- [ ] Show new inputs and derived values in the assumptions panel.
- [ ] Check keyboard use, labels, mobile layout, and print output.
- [ ] Confirm the production build still makes zero external requests.
- [ ] Document formulas and data provenance in the repository.

## Decisions before implementation

- [ ] Session-only persistence or optional long-term local persistence?
- [ ] Which utilities or regions should ship first?
- [ ] Which new capabilities belong in the free and Pro experiences?
- [ ] How large can bundled irradiance data become before load time suffers?
- [ ] Should lease and PPA modeling be part of this roadmap or a separate project?
