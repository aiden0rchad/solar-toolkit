import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INVERTER_EFFICIENCY,
  DEFAULT_INVERTER_STANDBY_W,
  simulateBackup,
  solarAcWatts,
} from './backup';

/** The tool's opening case: a Powerwall carrying the essentials. */
const ESSENTIALS = { batteryKwh: 13.5, loadW: 285 };

describe('simulateBackup', () => {
  it('charges the conversion tax: the battery delivers more than the house receives', () => {
    const { acDemandW, dcDrawW } = simulateBackup(ESSENTIALS);
    // 285 W of appliances + 25 W of inverter = 310 W at the outlets.
    expect(acDemandW).toBe(285 + DEFAULT_INVERTER_STANDBY_W);
    // To deliver 310 W at 94% the battery must give up about 330 W.
    expect(dcDrawW).toBeCloseTo(310 / 0.94, 6);
    expect(dcDrawW).toBeGreaterThan(acDemandW);
  });

  it('runs shorter than the lossless model it replaces', () => {
    // The old model: usable Wh divided by raw appliance watts, no inverter.
    const lossless = Math.floor((13.5 * 1000 * 0.9) / 285);
    const { hours } = simulateBackup(ESSENTIALS);
    expect(hours).not.toBeNull();
    expect(hours).toBeLessThan(lossless);
  });

  it('drains the battery even with every appliance switched off', () => {
    // Standby alone is a real load. A model that returns infinity here is
    // claiming an inverter costs nothing to leave running, which is the whole
    // bug this file exists to fix.
    const idle = simulateBackup({ batteryKwh: 13.5, loadW: 0, horizonHours: 2000 });
    expect(idle.acDemandW).toBe(DEFAULT_INVERTER_STANDBY_W);
    expect(idle.hours).not.toBeNull();
    // 12.15 kWh usable at 25 W drawn through a 94% inverter ≈ 457 h.
    expect(idle.hours).toBeGreaterThan(400);
    expect(idle.hours).toBeLessThan(500);
  });

  it('survives the 96 hour horizon on that idle load, so the sheet still reads 96+', () => {
    expect(simulateBackup({ batteryKwh: 13.5, loadW: 0 }).hours).toBeNull();
  });

  // STRICT inequalities, and the exact runtime pinned below. `toBeLessThanOrEqual`
  // was satisfied by a model that ignored the parameter entirely and returned
  // the same number three times — which is precisely the mutant that matters,
  // since deleting the conversion tax from the loop is how this whole fix gets
  // reverted by accident. The real values are strictly ordered with room to
  // spare, so the weaker assertion bought nothing.
  it('is strictly monotonic in efficiency: a worse inverter always lasts less long', () => {
    const runs = [90, 94, 97].map(e => simulateBackup({ ...ESSENTIALS, inverterEfficiency: e }).hours);
    expect(runs[0]).toBeLessThan(runs[1]);
    expect(runs[1]).toBeLessThan(runs[2]);
  });

  it('is strictly monotonic in standby draw: a thirstier inverter always lasts less long', () => {
    const runs = [0, 25, 80].map(w => simulateBackup({ ...ESSENTIALS, inverterStandbyW: w }).hours);
    expect(runs[0]).toBeGreaterThan(runs[1]);
    expect(runs[1]).toBeGreaterThan(runs[2]);
  });

  it('applies the conversion tax INSIDE the loop, not just to the reported draw', () => {
    // THE REGRESSION GUARD THAT WAS MISSING. `dcDrawW` is computed outside the
    // hour loop, so asserting on it cannot tell whether the loop actually spends
    // energy at `eta`. A mutant that drops `eta` from both branches of the loop
    // while leaving `dcDrawW` correct passed the entire suite and reported 40
    // hours instead of 37 — an 8% overstatement, in the flattering direction.
    // Pinning the exact figure is what catches it; so does dividing twice, which
    // reports 35.
    expect(simulateBackup(ESSENTIALS).hours).toBe(37);
  });

  it('reduces to the lossless case at 100% efficiency and zero standby', () => {
    const { hours } = simulateBackup({
      ...ESSENTIALS, inverterEfficiency: 100, inverterStandbyW: 0,
    });
    expect(hours).toBe(Math.ceil((13.5 * 1000 * 0.9) / 285));
  });

  it('does not tax energy that never entered the battery', () => {
    // THE REGRESSION GUARD for the bug the obvious implementation has. With
    // solar exactly matching demand, the battery should be untouched — not
    // charged a conversion fee in both directions on power that went straight
    // from the array to the fridge.
    const load = 1000;
    const standby = 0;
    // Solar noon on this window: sin(pi/2) = 1, so AC watts = kW * 1000 * clearness.
    const solarKw = load / 1000 / 0.75;
    const { trace } = simulateBackup({
      batteryKwh: 10, loadW: load, inverterStandbyW: standby,
      solarRecharge: true, solarKw,
      startHour: 12, windowStart: 0, windowEnd: 24, clearness: 0.75,
      horizonHours: 1,
    });
    // Hour 1 lands at clock 13; with a 0-24 window peak is at 12, so demand
    // slightly exceeds solar and the battery gives up a little — but nothing
    // like the double-taxed amount, which would be over 12% of the flow.
    const drop = 100 - trace[1].remaining;
    expect(drop).toBeLessThan(1);
  });

  describe('the solar path', () => {
    // The test these replace asserted only that `remaining` never exceeded 100,
    // which the `Math.min(usableWh, ...)` clamp guarantees structurally — it
    // could not fail while the clamp existed. Three separate mutants passed it:
    // surplus charging nothing at all, the `solarRecharge` flag being ignored,
    // and surplus banked at 100% with no charge-side loss. So the toggle, the
    // charge path and its efficiency were all unpinned.
    //
    // The case below is chosen so the battery NEVER SATURATES after hour zero:
    // a day of solar here is worth less than a night of load, so the trace is a
    // declining sawtooth. That matters, because a battery that refills to 100%
    // every afternoon erases whatever happened on the charge path and leaves
    // only the discharge side observable.
    const withSolar = (over = {}) => simulateBackup({
      batteryKwh: 40, loadW: 900, solarRecharge: true, solarKw: 3, horizonHours: 48, ...over,
    });

    it('actually puts charge back: the battery recovers after the first night', () => {
      const { trace } = withSolar();
      const overnightLow = Math.min(...trace.slice(0, 14).map(t => t.remaining));
      const nextAfternoon = Math.max(...trace.slice(14, 26).map(t => t.remaining));
      expect(overnightLow).toBe(64);
      expect(nextAfternoon).toBeGreaterThan(overnightLow);
      // And not by saturating, which would hide the charge path entirely.
      expect(nextAfternoon).toBeLessThan(100);
    });

    it('honours the toggle: the same array does nothing when solar is off', () => {
      expect(withSolar().hours).toBeNull();
      expect(withSolar({ solarRecharge: false }).hours).toBe(37);
    });

    it('charges the conversion tax on the way IN, not only on the way out', () => {
      // Pinned, because this is the one mutant an inequality cannot catch:
      // banking surplus at 100% instead of at `eta` leaves the battery at 67%
      // rather than 65%, and every ordering assertion still holds.
      expect(withSolar().trace.at(-1).remaining).toBe(65);
      expect(withSolar({ inverterEfficiency: 97 }).trace.at(-1).remaining)
        .toBeGreaterThan(withSolar({ inverterEfficiency: 90 }).trace.at(-1).remaining);
    });

    it('never charges past usable capacity', () => {
      const { trace } = simulateBackup({
        batteryKwh: 5, loadW: 100, solarRecharge: true, solarKw: 20, horizonHours: 48,
      });
      expect(Math.max(...trace.map(t => t.remaining))).toBeLessThanOrEqual(100);
    });
  });

  it('returns zero hours for a battery with no usable capacity', () => {
    expect(simulateBackup({ batteryKwh: 0, loadW: 285 }).hours).toBe(0);
    expect(simulateBackup({ batteryKwh: 13.5, loadW: 285, depthOfDischarge: 0 }).hours).toBe(0);
  });

  // A CLEARED FIELD IS NOT A SPEC CHANGE. InputField emits NaN for an empty
  // box and the model re-runs on every keystroke, so these paths are reached by
  // anyone who selects the field and types over it. Asserting only that the
  // result is finite let the fallback be anything at all: inverting the clamp so
  // non-finite returned 100% instead of 50% passed the whole suite, and that is
  // the flattering direction. Both now pin the documented typical value, so
  // clearing a field cannot move the runtime at all.
  it('falls back to the documented efficiency when the field is cleared', () => {
    const cleared = simulateBackup({ ...ESSENTIALS, inverterEfficiency: NaN });
    expect(Number.isFinite(cleared.dcDrawW)).toBe(true);
    expect(cleared.hours).toBe(simulateBackup(ESSENTIALS).hours);
  });

  it('falls back to the documented standby draw when the field is cleared', () => {
    // This is the asymmetry that mattered: a NaN standby used to clamp to 0 W
    // and hand the reader four extra hours for emptying a text box.
    const cleared = simulateBackup({ ...ESSENTIALS, inverterStandbyW: NaN });
    expect(cleared.acDemandW).toBe(285 + DEFAULT_INVERTER_STANDBY_W);
    expect(cleared.hours).toBe(simulateBackup(ESSENTIALS).hours);
  });

  it('defaults are the documented ones', () => {
    expect(DEFAULT_INVERTER_EFFICIENCY).toBe(94);
    expect(DEFAULT_INVERTER_STANDBY_W).toBe(25);
  });
});

describe('solarAcWatts', () => {
  it('makes nothing outside the generation window', () => {
    expect(solarAcWatts({ solarKw: 5, clock: 3 })).toBe(0);
    expect(solarAcWatts({ solarKw: 5, clock: 22 })).toBe(0);
  });

  it('peaks at solar noon and is symmetric about it', () => {
    const noon = solarAcWatts({ solarKw: 5, clock: 13 });
    expect(noon).toBeCloseTo(5 * 1000 * 0.75, 6);
    expect(solarAcWatts({ solarKw: 5, clock: 10 })).toBeCloseTo(solarAcWatts({ solarKw: 5, clock: 16 }), 6);
  });

  it('makes nothing from an array that is not there', () => {
    expect(solarAcWatts({ solarKw: 0, clock: 13 })).toBe(0);
  });
});
