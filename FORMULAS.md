# Calculation methods and limits

These are planning estimates in nominal dollars. They are not a utility bill audit, a roof design, an installer quote, or a forecast. See [DATA_SOURCES.md](DATA_SOURCES.md) for datasets, tariff sources, review dates, and the update process.

## Solar sizing

- Annual usage from an average bill: `(monthly bill − monthly fixed charge) × 12 / blended energy rate`.
- Blended rate: `peak rate × peak-use share + off-peak rate × (1 − peak-use share)`.
- Known system: `panel count × panel watts / 1000 = kW DC`.
- Bill-first system: `annual usage × (target energy offset percent / 100) / annual production per kW`.
- Annual production: `sum(monthly daily AC factor × days in month × kW DC)`.
- Achieved energy offset: `annual solar generation / annual usage × 100`.

Bill-first sizing assumes the entered bill is representative of the whole year. Tiered tariffs, unusual seasonal bills, and fixed charges embedded in an all-in average price can bias the inferred usage. Pro accepts usage directly. Energy offset is not bill offset or self-sufficiency: timing, battery losses, export value, and fixed charges still matter.

## Solar resource and losses

The bundled city profiles use long-term monthly mean global horizontal irradiation. The conversion to approximate AC production is:

`GHI × (1 − system loss percent / 100) × orientation multiplier × (1 − clipping loss percent / 100)`

The default orientation multiplier of 1 retains horizontal-reference irradiation. It is not a south-facing roof simulation. This deliberately simple model does not calculate tilt, azimuth, temperature, shading geometry, snow, or instantaneous inverter clipping. The user can change the multipliers or enter a site's estimated monthly AC production factors instead. AC factors already include these adjustments, so the calculator does not apply them again.

Manual values are 12 monthly **daily averages**, either peak sun hours (`kWh/m²/day`) or AC yield (`kWh/kW DC/day`). They are not monthly totals. No weather, address, or geolocation API is called by the app.

Year 1 uses the entered production and rates. Later years apply panel degradation, battery degradation, and rate escalation once per elapsed year. Month lengths use a 365-day representative year. Seasonal load weights are normalized using month lengths so annual consumption remains `daily usage × 365`.

## Utility bills and export limits

The daily dispatch model divides load into peak and off-peak periods. It assumes 15% of solar generation occurs in the peak period. A battery charges from available off-peak solar surplus, respects usable capacity and round-trip efficiency, and discharges against the peak deficit. Optional arbitrage charges from the grid only when the entered rates justify the losses. This two-period approximation does not reproduce hourly dispatch or a utility-specific time schedule.

- Net billing values exported energy at the entered export credit; that credit does not escalate with retail import prices.
- Annual net metering carries monetary energy credits forward month by month. Fixed charges and solar capacity charges remain payable. Unused credits expire without payment at the end of the modeled credit year. The provided flat-rate profiles make monetary and energy banking equivalent within that year; manual time-of-use rates remain an approximation.
- Net-metering export values escalate alongside retail rates. The starting tariff and its source remain visible and editable.
- An annual generation cap scales all months proportionally. It is an annual-energy approximation, not an inverter kW limit.
- An annual credited-export cap is consumed in calendar order. Further surplus receives no compensation; warnings state the affected energy. It does not establish interconnection eligibility or simulate an instantaneous export-power limit.

The small bundled utility set is intentional. State-average planning profiles are explicitly labeled as proxies, not tariffs. Their zero fixed/export values are placeholders to replace from a bill and interconnection agreement. Regional selection replaces the entire rate/limit set to prevent a prior region's assumptions leaking into the next.

## Installation and financing comparisons

DIY and installer scenarios share the same production, battery, usage, and utility assumptions. Installation cost is the sum of equipment, labor, permitting, interconnection, tax, and contingency. Initial equipment/labor allowances are editable planning assumptions, not price data. Unedited equipment and labor scale with system size; entered dollar overrides stay fixed.

Confirmed incentives reduce installation cost, up to the cost itself. Cash is paid at installation. For a loan:

`upfront payment = net installation cost − financed amount`

For monthly interest `r` and number of payments `n`, the payment is `principal × r / (1 − (1 + r)^(-n))`. At zero interest it is `principal / n`. Each month adds interest on the outstanding principal, then subtracts the payment, capped at the remaining payoff. Principal is counted once. The final payment can be smaller. The engine uses a numerically stable form near zero interest.

Annual maintenance starts in year 1 and follows its own entered escalator. The optional replacement budget is charged once in the selected year, in that year's dollars. Missing maintenance, replacement, tax, and contingency budgets stay zero and are disclosed rather than guessed. No terminal resale value is assumed for a solar installation.

Scenario break-even is the first modeled year in which spending plus remaining loan debt is no greater than utility-only spending and remains so through year 25. A future replacement can therefore postpone break-even. The main solar calculator interpolates within the year of a sustained crossing; its retrofit mode compares against keeping the existing solar system and contract, while a new installation compares against utility-only spending. Values are not discounted to present value. Lease and PPA acquisition contracts are a separate future feature; the existing Pro retrofit tool's old-PPA payments are not a new lease/PPA acquisition comparison.

## Persistence and verification

[PERSISTENCE.md](PERSISTENCE.md) describes tab/session behavior, local-device opt-in, migration, reset, schema validation, and storage failures. Calculator inputs never leave the browser.

Run `npm test`, `npm run lint`, and `npm run build` in each repository. Engine fixtures cover sizing modes, monthly aggregation, profile isolation, caps, billing, loan boundaries, and installation costs. Storage tests cover restore/reset and malformed data.

`scripts/verify-roadmap.mjs` exercises the actual browser flows, including navigation, reload, reset, device opt-in, malformed saved data, regional switching, panel sizing, manual resource values, invalid inputs, installation financing, mobile overflow, keyboard focus, print, and third-party network requests. It requires an existing Playwright installation and a running dev or production-preview server. Set `QA_BASE`, optionally `PLAYWRIGHT_MODULE` and `CHROME_PATH`. Screenshots and a PDF go to a temporary directory or `QA_OUTPUT`.

`QA_UNLOCK_PRO=1` is a browser-test-only override against a local Vite server. It substitutes the entitlement module only inside the isolated test browser. It is never a production unlock, license system, or deployment setting.
