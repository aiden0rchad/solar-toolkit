# Solar inputs, formulas, and data sources

Data reviewed on 2026-09-04. The browser imports static local modules. Selecting a location does not contact NASA, a utility, a geocoder, or a weather service. Source links open only when the user follows them.

## Scope and profile schema

`src/data/regionalProfiles.js` contains schema version 1. Each profile has an ID, label, state, independent resource ID, kind (`utility`, `planning`, or `manual`), review date, source links, warnings, and a complete set of assumptions:

| Field | Meaning |
| --- | --- |
| `ratePeak`, `rateOffPeak` | Import energy prices in $/kWh |
| `monthlyFixedCharge` | Fixed $/month, charged before and after solar |
| `solarExportRate` | Export credit in $/kWh |
| `inflationRate` | User-selected annual retail-rate escalation, initially 0% |
| `exportCompensation` | Direct net billing or monthly credits with annual expiry |
| `monthlySolarChargePerKw` | Solar-only standby charge in $/DC-kW/month |
| `annualGenerationCapKwh` | Optional modeled annual generation limit; null means unspecified |
| `annualExportCapKwh` | Optional modeled annual export limit; null means unspecified |

Switching presets replaces the entire assumption set, including zero fees and null caps. Copies returned by `getRegionalProfile` do not mutate bundled data. Unknown IDs return the manual profile and an explicit warning. Neither utility coverage nor a tariff is inferred from state, city, or postal code.

## Verified utility starters

These are specific tariff starting points, not a complete utility billing service. Taxes, miscellaneous fees, future tariff changes, actual meter intervals, and interconnection approval still need review.

| Utility / plan | Energy rate | Fixed charge | Solar terms |
| --- | --- | --- | --- |
| New River Light & Power, Boone NC, Schedule R + Net Billing Rider | $0.131448/kWh, comprising $0.032548 distribution + $0.098900 wholesale supply | $14.50/month | Retail energy credits; $5.92/kW/month standby charge; unused credits expire January 1 |
| City of Tallahassee FL, standard single-phase residential + net metering | $0.13279/kWh, comprising $0.09214 non-fuel + $0.04065 fuel | $9.96/month | Retail energy credits; unused credits expire on the installation anniversary; no cash payout |

NRLP sources: [rates effective March 1, 2026](https://nrlp.appstate.edu/services/rate-schedule/) and [customer-owned generation](https://nrlp.appstate.edu/services/customer-owned-generation/). The $5.92 fee is applied to entered DC system size; confirm the system capacity used on the actual interconnection agreement. NRLP asks customers with systems over 20 kW to contact it; this is not represented as an automatic energy curtailment rule.

Tallahassee sources: [current rate page](https://www.talgov.com/you/you-account-plans-index) and [net-metering terms](https://us-selfservice.talgov.com/you/you-products-home-solar-net-metering). The current rate HTML was retrieved directly on the review date because search caches retained an older fuel rate. Published net-metering terms describe approved systems up to 100 kW. This eligibility threshold is not a generation or export cap. The model uses January–December credit accounting for every profile, so Tallahassee users with another anniversary have a timing approximation.

Net-metering credits are carried forward month by month within each modeled year, then discarded. Later credits do not reimburse earlier paid bills. Energy credits never pay fixed charges or solar standby fees. Retail-linked export prices escalate with retail prices; direct net-billing export prices stay constant. The displayed monthly bill is the annual total divided by 12, not an individual monthly bill forecast.

## State-average planning proxies

The Sacramento, Phoenix, and Boston planning profiles pair local resource data with the respective **state residential average price**, not a city or utility tariff. [EIA Electric Power Monthly Table 5.6.A](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a), June 2026 data released August 26, reports California 34.74, Arizona 15.18, and Massachusetts 29.61 cents/kWh. These are all-in historical averages and cannot identify the marginal rate avoided by solar.

Fixed charges and export compensation start at zero placeholders. Users must replace the average with their own marginal energy rates and enter fixed/export terms, without counting charges twice. Escalation is 0%, a planning choice rather than a prediction. The selected California proxy is labeled explicitly. Manual mode starts with no inferred rates or solar resource.

## Long-term solar-resource bundle

`src/data/solarResources.js` records 12 monthly daily-average `ALLSKY_SFC_SW_DWN` values in kWh/m²/day for each representative city. They were obtained from the NASA POWER climatology point API v2.9.7 on 2026-09-04. The returned source is `SYN1DEG` and its header identifies the climatological period as January 2001 through December 2020.

| Resource | Requested latitude | Requested longitude |
| --- | --- | --- |
| Sacramento | 38.5816 | -121.4944 |
| Phoenix | 33.4484 | -112.0740 |
| Boston | 42.3601 | -71.0589 |
| Boone | 36.2168 | -81.6746 |
| Tallahassee | 30.4383 | -84.2807 |

[NASA POWER climatology API](https://power.larc.nasa.gov/docs/services/api/temporal/climatology/) describes the service. [NASA's source methodology](https://power.larc.nasa.gov/docs/methodology/energy-fluxes/) specifies a 1° latitude by 1° longitude radiation grid and satellite/model-based estimates. Each resource contains the exact reproducible API request URL. GHI is irradiation on a **horizontal** surface, not rooftop plane-of-array irradiation and not measured AC production. A city selection does not verify that a home, utility territory, or roof shares those conditions.

The bundle deliberately uses five representative locations rather than claiming accurate nationwide ZIP coverage. Unsupported locations must select a representative resource explicitly or provide manual monthly data. No silent resource fallback is performed. The irradiance and regional-profile source modules together are kept below 50 KB uncompressed. A live API is not included; any future live lookup requires an explicit privacy choice and a documented failure path.

### Update process

1. Retrieve the exact `sourceUrl` stored on each resource. Check successful status, `ALLSKY_SFC_SW_DWN` units, climatology period, source, and API version. Reject missing months and the NASA fill value `-999`.
2. Review JAN–DEC values against the response before updating the static array. Keep the requested location, source, units, period, resolution, and review date together. NASA's separately supplied `ANN` can differ slightly from a 365-day weighted sum, so use the monthly series consistently.
3. Read current utility tariff and solar-credit pages directly, including standby fees and expiry rules. EIA's current table changes monthly; record its data month and release date. Never silently reinterpret an old saved profile when a schema change makes it incompatible.
4. Bump a profile's version when meanings change. Run the resource, regional, ROI, and installation tests, inspect changed results, and verify the static bundle remains within budget. Data updates are reviewed repository changes, not runtime requests.

## Production and sizing formulas

For resource or manual sun-hour mode:

```text
monthly AC factor (kWh/kW/day)
  = monthly daily resource × orientationFactor
    × (1 - systemLossPct / 100) × (1 - clippingLossPct / 100)
monthly energy = DC kW × monthly AC factor × days in month
annual energy = sum(monthly energy)
```

Defaults are 14% aggregate system losses, orientation factor 1, clipping loss 0%, and panel degradation 0.5%/year. These are editable screening assumptions, not values supplied or validated by NASA. Orientation 1 leaves horizontal irradiation unchanged. A scalar orientation adjustment is not a tilt/azimuth model. Clipping is a user-supplied aggregate loss, not an hourly inverter calculation. Temperature, snow, local obstruction, horizon shading, roof geometry, inverter loading, and weather variability are not separately modeled. Use roof-specific output from an engineering tool as manual AC data when available.

Manual AC data is daily kWh per installed DC kW for each month. Divide a monthly AC production estimate by its DC kW and that month's day count before entering it. System, orientation, and clipping adjustments are **not applied again** to manual AC values. All 12 finite values are required, each from 0 to 24; physical adjustments and resulting values are validated. Zero annual resource cannot be used for reverse sizing.

```text
DC size = panel count × panel rated watts / 1000
bill-derived annual usage = (average monthly bill - fixed monthly charge) / blended energy rate × 12
reverse-sized DC kW = annual usage × target annual-energy offset / 100 / annual kWh per DC kW
achieved energy offset (%) = annual production / annual usage × 100
```

Panel count is integral (1–2,500), panel wattage is 1–1,000 W, direct DC size is 0–2,500 kW, and target energy offset is 0–200%. Results over 50 kW prompt eligibility review. Energy offset is not bill offset or self-sufficiency: exported generation can have lower value, while fixed charges remain payable. Reverse sizing uses a continuous kW estimate; a real installer must round to available panel sizes and verify roof limits.

The first operating year uses entered prices and undegraded production. From year 2 onward, production multiplies by `(1 - panelDegradationPct / 100)^(year - 1)` and import rates by `(1 + inflationRate / 100)^(year - 1)`. Years use the same non-leap 365-day calendar. Seasonal household load shapes are normalized by day count so annual usage remains `dailyUsage × 365`.

Generation caps proportionally reduce all months to the entered annual kWh ceiling, with curtailment reported. Export caps instead curtail surplus after the annual export budget is reached, preserving self-consumption. They are energy-budget approximations, not instantaneous kW limits or automatically inferred tariff rules. No bundled profile invents such caps; users enter terms from their own agreement.

The battery/TOU engine retains its simplified two-period representative-day model: 15% of daily solar is assigned to the peak period, solar surplus charges the battery, and round-trip losses constrain discharge. Peak timing is illustrative, not an hourly tariff reconstruction. Legacy `SUN_PROFILES` remain only for old callers and are now labeled unverified illustrative arrays. New sizing paths use sourced resources or explicit manual values.

## Ownership and financing

Net system cost is gross purchase price minus entered incentives, floored at zero. No incentive eligibility is inferred. Cash is charged once at year 0. Financing applies to net cost or an explicitly smaller financed portion; the remaining amount is upfront cash. Monthly amortization uses the entered APR and term, including exact zero and near-zero APR handling. Payment and balance stop at payoff. Existing solar loans use an editable APR (legacy default 5%) and actual stated payment; a warning reports non-amortizing payments. Existing PPA escalation remains a separate contract cash flow.

`annualUtilityBillProposed` and `annualBillGridOnly` expose unrounded utility totals for installation comparisons. `annualLoanPayment`, `annualLoanInterest`, `remainingLoanBalance`, and `upfrontCost` make ownership accounting inspectable. Cumulative economic cost counts principal once and adds interest; liability uses remaining debt plus cash already spent. New solar is compared with utility-only costs; a retrofit is compared with keeping the existing solar and its existing loan/PPA. Existing contract costs common to both retrofit paths cancel. End-of-year rows summarize that operating year's actual payments.

`src/engine/installation.js` provides the cash/financed DIY-versus-turnkey comparison with itemized expenses, upkeep, and replacements. Shared production and utility inputs feed both scenarios. Lease and new PPA comparisons are a separate contract model, not approximated as ownership.

Solar payback reports the first crossover that remains at or below the comparison cost through the 25-year horizon. Earlier temporary savings do not count if they reverse later. Equality counts as break-even, including a zero-cost case that stays equal or favorable from installation. The solar helper linearly interpolates between annual points; this is an estimate, not an exact monthly date. Installation comparisons report the first sustained whole year. Neither result promises savings beyond the modeled horizon.

## Verification

Run `npm test -- src/engine/solar.test.js src/engine/roi.test.js src/engine/installation.test.js`. Fixtures cover every profile, isolated preset values, monthly aggregation, missing data, manual AC loss handling, both sizing paths, input boundaries, base-year timing, generation/export caps, chronological credit expiry, solar standby charges, cash accounting, partial financing, and monthly loan payoff.
