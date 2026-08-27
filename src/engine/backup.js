// =============================================================================
// BACKUP RUNTIME — how long a battery actually carries a house through an
// outage.
//
// WHAT THIS FIXES. The simulation this replaces subtracted appliance watts
// straight off the battery's stored watt-hours, as though the two were the same
// currency. They are not. A battery stores DC; a refrigerator runs on AC; and
// everything between them is an inverter that charges for the conversion and
// draws power just for being switched on. Neither cost was modelled, so every
// runtime the tool printed was optimistic — and optimistic in the direction that
// sells batteries, which is the one direction this project has no business
// erring in.
//
// THE TWO LOSSES, and why the second one matters more than people expect:
//
//   CONVERSION. A hybrid inverter is roughly 94% efficient turning DC into AC.
//   To deliver 285 W to the house it must pull about 303 W from the battery. A
//   6% tax, applied to everything.
//
//   STANDBY. The inverter and its gateway draw power continuously, whether
//   anything is running or not — call it 25 W. Against a heavy load that is
//   noise. Against the essentials-only load this tool opens on, 25 W is nearly
//   9% of the total draw, and over a four-day outage it is about 2.4 kWh: a
//   fifth of a Powerwall, spent on nothing. This is the term that quietly
//   decides whether a small battery lasts three days or two.
//
//   Together they also stand in for something this model does not simulate
//   directly: inverter efficiency falls off badly at very low load fractions. A
//   5 kW inverter serving 285 W is nowhere near its rated 94%. A fixed
//   conversion loss plus a fixed standby draw reproduces that shape closely
//   enough to be honest, which a single efficiency figure alone would not.
//
// THE ENERGY BALANCE IS STRUCK ON THE AC SIDE, which is the only place it can
// be struck without lying. The obvious implementation — convert solar to DC,
// convert load to DC, subtract — reports a deficit even when solar exactly
// covers the load, because it charges the conversion tax twice on energy that
// never entered the battery. So the house is balanced first, and only the
// remainder crosses the battery boundary and pays:
//
//   surplus  ->  soc += surplus * efficiency      (AC into the battery)
//   deficit  ->  soc -= deficit / efficiency      (DC out to the house)
//
// SOLAR IS TREATED AS AC-COUPLED — a PV inverter feeding the backed-up panel,
// which is what a retrofit almost always is. A DC-coupled hybrid would route
// PV through an MPPT charge controller instead and lose about 2% rather than
// 6%, so this is the conservative reading of the two.
//
// DEPTH OF DISCHARGE IS A SEPARATE, EARLIER CUT and is not double counted with
// any of the above: it decides how much of the nameplate is available at all,
// before a single watt-hour is converted.
// =============================================================================

/**
 * Clamp, with an EXPLICIT fallback for input that is not a number at all.
 *
 * The fallback is a parameter rather than `lo` because the honest answer to
 * "what did they mean by this?" differs per field, and defaulting everything to
 * the bottom of its range is only accidentally safe. A blank capacity field
 * means no battery has been stated, so zero is right and the sheet says zero
 * hours, loudly. A blank INVERTER field means nothing of the kind — the
 * inverter is still there. Falling to `lo` there sent efficiency to 50%, which
 * cut the runtime nearly in half mid-keystroke, and sent standby draw to 0 W,
 * which raised it. One alarming, one flattering, both fictions. Both now fall
 * to the documented typical value, so clearing a field costs the reader the
 * precision they had and nothing else.
 */
const clamp = (value, lo, hi, fallback = lo) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};

/** The default simulation horizon, in hours. Four days. */
export const HORIZON_HOURS = 96;

/** Typical hybrid-inverter conversion efficiency, as a percentage. */
export const DEFAULT_INVERTER_EFFICIENCY = 94;

/** Typical continuous self-consumption of an inverter and its gateway, in watts. */
export const DEFAULT_INVERTER_STANDBY_W = 25;

/**
 * Solar output at a given hour, in AC watts.
 *
 * A half-sine across the generation window rather than a flat fraction of
 * nameplate: an array makes nothing at 7am, peaks at solar noon and makes
 * nothing again at dusk, and a model that pays a house its average output at
 * midnight is not modelling an outage.
 */
export const solarAcWatts = ({ solarKw, clock, windowStart = 7, windowEnd = 19, clearness = 0.75 }) => {
  const kw = Number(solarKw);
  if (!Number.isFinite(kw) || kw <= 0) return 0;
  if (clock < windowStart || clock > windowEnd) return 0;
  const span = windowEnd - windowStart;
  if (span <= 0) return 0;
  return kw * 1000 * clearness * Math.sin(Math.PI * (clock - windowStart) / span);
};

/**
 * Run the outage.
 *
 * Returns `{ hours, trace, avgSolarW, acDemandW, usableWh, dcDrawW }`, where
 * `hours` is the hour the battery is exhausted or `null` if it survives the
 * horizon, and `dcDrawW` is what the battery actually delivers to sustain the
 * house with no solar — the figure that makes the two losses visible.
 */
export const simulateBackup = ({
  batteryKwh,
  loadW,
  depthOfDischarge = 90,
  inverterEfficiency = DEFAULT_INVERTER_EFFICIENCY,
  inverterStandbyW = DEFAULT_INVERTER_STANDBY_W,
  solarRecharge = false,
  solarKw = 0,
  horizonHours = HORIZON_HOURS,
  startHour = 18,
  windowStart = 7,
  windowEnd = 19,
  clearness = 0.75,
}) => {
  // Efficiency floors at 50%: below that the figure is a typo rather than an
  // inverter, and dividing by it would print a runtime nobody should act on.
  const eta = clamp(inverterEfficiency, 50, 100, DEFAULT_INVERTER_EFFICIENCY) / 100;
  const standbyW = clamp(inverterStandbyW, 0, 1000, DEFAULT_INVERTER_STANDBY_W);
  const usableWh = clamp(batteryKwh, 0, 1e6, 0) * 1000 * (clamp(depthOfDischarge, 0, 100, 90) / 100);

  // THE HOUSE'S TOTAL AC DEMAND. The inverter's own draw is part of it: it is
  // running because the outage is happening, so it is load like any other.
  const acDemandW = clamp(loadW, 0, 1e7, 0) + standbyW;
  // What the battery must supply, on its own side of the inverter, to meet that
  // demand unaided. Reported so the sheet can show the loss rather than bury it.
  const dcDrawW = acDemandW / eta;

  const empty = { hours: 0, trace: [{ hour: 0, remaining: 0 }], avgSolarW: 0, acDemandW, usableWh, dcDrawW };
  if (usableWh <= 0) return empty;

  let soc = usableWh;
  const trace = [{ hour: 0, remaining: 100 }];
  let solarWhTotal = 0;

  for (let h = 1; h <= horizonHours; h++) {
    const clock = (startHour + h) % 24;
    const solarW = solarRecharge
      ? solarAcWatts({ solarKw, clock, windowStart, windowEnd, clearness })
      : 0;
    solarWhTotal += solarW;

    // Balance the house first; only what is left over crosses the inverter.
    if (solarW >= acDemandW) {
      soc = Math.min(usableWh, soc + (solarW - acDemandW) * eta);
    } else {
      soc -= (acDemandW - solarW) / eta;
    }

    trace.push({ hour: h, remaining: Math.max(0, Math.round((soc / usableWh) * 100)) });
    if (soc <= 0) {
      return { hours: h, trace, avgSolarW: solarWhTotal / h, acDemandW, usableWh, dcDrawW };
    }
  }

  return { hours: null, trace, avgSolarW: solarWhTotal / horizonHours, acDemandW, usableWh, dcDrawW };
};
