// =============================================================================
// NEM RATE PROFILES — representative California residential shapes.
//
// WHAT THESE ARE. One import price and one export credit for each hour of a
// day, in dollars per kWh, for each of the three net-metering eras. They are
// REPRESENTATIVE, not a tariff sheet: real prices vary by utility, by rate
// schedule, by season and — under NEM 3.0 — by the hour of the specific day.
// Every page that plots them says so on the page.
//
// WHY HOURLY. The explainers used to carry three rows each. Three rows can
// state that exports are worth less than imports; they cannot show the SHAPE,
// and under NEM 3.0 the shape is the entire argument. An export credit that is
// near zero at noon and roughly ten times that at 7pm is why a battery pays for
// itself — a fact three rows structurally cannot contain.
//
// SOURCES, in the sense of what these shapes are modelled on:
//   NEM 1.0  Flat tiered residential pricing with exports credited at the full
//            retail rate. A kWh sent out was worth exactly a kWh brought back.
//   NEM 2.0  A time-of-use schedule in the shape of PG&E E-TOU-C / SCE TOU-D:
//            a 4pm-9pm peak, everything else off-peak. Exports still credited
//            near retail, less non-bypassable charges of roughly 2.5c/kWh.
//   NEM 3.0  The same time-of-use import side, escalated. The export side is no
//            longer tied to retail at all: it follows the CPUC Avoided Cost
//            Calculator, which values a kWh at what the grid saves by not
//            generating it. That collapses midday, when California has more
//            solar than it can use, and spikes after sunset.
//
// The ACC column is an annual-average shape. Real ACC values swing far wider —
// a September evening can pay several times the figure here, a mild spring one
// far less. The average is the honest thing to plot on a page whose job is to
// explain the mechanism rather than to price a specific install.
// =============================================================================

/** 4pm-9pm, the peak window both time-of-use eras charge on. Hours 16-20. */
const isPeakHour = (hour) => hour >= 16 && hour <= 20;

/** `[{ hour, importRate, exportRate }]` for a 24-hour day. */
const dayOf = (rateAt) => Array.from({ length: 24 }, (_, hour) => ({ hour, ...rateAt(hour) }));

// --- NEM 1.0 -----------------------------------------------------------------
// Flat, and symmetric. The grid was a battery with no losses and no clock.

const NEM1_RETAIL = 0.20;

export const NEM1_DAY = dayOf(() => ({
  importRate: NEM1_RETAIL,
  exportRate: NEM1_RETAIL,
}));

// --- NEM 2.0 -----------------------------------------------------------------
// Time-of-use arrives on both sides at once, so the symmetry mostly survives:
// a kWh exported at 5pm was credited at the 5pm price. What broke the 1-for-1
// swap was not the clock but the non-bypassable charges, which ride on every
// imported kWh and cannot be netted away by exporting.

const NEM2_OFF_PEAK = 0.35;
const NEM2_PEAK = 0.50;

/** Non-bypassable charges: public-purpose programs, wildfire fund, nuclear
 *  decommissioning. Small, and the reason NEM 2.0 never quite reached zero. */
export const NEM2_NBC = 0.025;

export const NEM2_DAY = dayOf((hour) => {
  const importRate = isPeakHour(hour) ? NEM2_PEAK : NEM2_OFF_PEAK;
  return { importRate, exportRate: Number((importRate - NEM2_NBC).toFixed(3)) };
});

// --- NEM 3.0 -----------------------------------------------------------------
// The import side is still a clock. The export side is a different instrument
// entirely, and the two no longer have anything to do with each other.

const NEM3_OFF_PEAK = 0.35;
const NEM3_PEAK = 0.58;

/**
 * The avoided-cost export credit, hour by hour, as an annual average.
 *
 * Read the shape, not the digits: a trough through the middle of the day, when
 * California's grid is saturated with solar and one more exported kWh displaces
 * almost nothing, and a hard peak from 6pm to 8pm, after the sun has gone and
 * the state is still using power. This is the curve a battery is paid to move
 * energy along.
 */
const NEM3_EXPORT_BY_HOUR = [
  0.050, 0.048, 0.046, 0.045, 0.046, 0.050, // 00-05
  0.052, 0.045, 0.040, 0.035, 0.030, 0.028, // 06-11
  0.028, 0.030, 0.035, 0.050, 0.090, 0.160, // 12-17
  0.280, 0.350, 0.220, 0.100, 0.070, 0.060, // 18-23
];

export const NEM3_DAY = dayOf((hour) => ({
  importRate: isPeakHour(hour) ? NEM3_PEAK : NEM3_OFF_PEAK,
  exportRate: NEM3_EXPORT_BY_HOUR[hour],
}));

// --- cross-era comparison ----------------------------------------------------

/**
 * The noon hour, across all three eras — the single comparison every one of the
 * three pages carries, so a reader who lands on any of them sees where that era
 * sits rather than only what it does.
 *
 * Noon and not the evening peak, deliberately: noon is when a roof without a
 * battery is actually exporting. It is the hour the policy change is aimed at,
 * and the hour where the three eras differ most.
 */
export const NOON_EXPORT_BY_ERA = [
  { era: 'NEM 1.0', exportRate: NEM1_DAY[12].exportRate, importRate: NEM1_DAY[12].importRate },
  { era: 'NEM 2.0', exportRate: NEM2_DAY[12].exportRate, importRate: NEM2_DAY[12].importRate },
  { era: 'NEM 3.0', exportRate: NEM3_DAY[12].exportRate, importRate: NEM3_DAY[12].importRate },
];

/** `14` -> `2PM`; `0` -> `12AM`. Used for axis ticks and table row heads. */
export const hourLabel = (hour) => {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? 'AM' : 'PM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
};
