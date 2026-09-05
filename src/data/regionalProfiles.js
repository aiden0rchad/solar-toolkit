export const DEFAULT_REGIONAL_PROFILE_ID = 'ca-sacramento-planning';

// Every profile supplies every tariff field, including explicit absence of a cap.
// A profile is a starting point, never a substitute for an interconnection offer.
const baseAssumptions = {
  monthlyFixedCharge: 0, solarExportRate: 0, inflationRate: 0,
  annualGenerationCapKwh: null, annualExportCapKwh: null,
  exportCompensation: 'net-billing', monthlySolarChargePerKw: 0,
};
const eiaSource = { label: 'EIA Table 5.6.A, June 2026 residential average (released August 26)', url: 'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a' };
const planningWarnings = [
  'State-average all-in electricity price is a planning proxy, not a utility tariff. Replace it with your marginal energy rates before relying on savings.',
  'Fixed charge and export credit are zero placeholders; no generation/export limit has been assumed. Enter your bill and interconnection terms. Avoid counting fixed charges twice in the all-in proxy.',
  'Rate escalation is a user assumption, initially 0%, not a forecast.',
];

export const REGIONAL_PROFILES = [
  { id: 'ca-sacramento-planning', label: 'Sacramento, CA · state-average planning only', state: 'CA', resourceId: 'sacramento', kind: 'planning', assumptions: { ratePeak: 0.3474, rateOffPeak: 0.3474 }, sources: [eiaSource], warnings: ['California defaults are selected. They do not describe another state or a particular California utility.', ...planningWarnings] },
  { id: 'az-phoenix-planning', label: 'Phoenix, AZ · state-average planning only', state: 'AZ', resourceId: 'phoenix', kind: 'planning', assumptions: { ratePeak: 0.1518, rateOffPeak: 0.1518 }, sources: [eiaSource], warnings: planningWarnings },
  { id: 'ma-boston-planning', label: 'Boston, MA · state-average planning only', state: 'MA', resourceId: 'boston', kind: 'planning', assumptions: { ratePeak: 0.2961, rateOffPeak: 0.2961 }, sources: [eiaSource], warnings: planningWarnings },
  {
    id: 'nc-boone-nrlp', label: 'Boone, NC · NRLP Schedule R + Net Billing Rider', state: 'NC', resourceId: 'boone', kind: 'utility',
    assumptions: { ratePeak: 0.131448, rateOffPeak: 0.131448, monthlyFixedCharge: 14.50, solarExportRate: 0.131448, exportCompensation: 'annual-net-metering', monthlySolarChargePerKw: 5.92 },
    sources: [
      { label: 'NRLP rates effective March 1, 2026', url: 'https://nrlp.appstate.edu/services/rate-schedule/' },
      { label: 'NRLP customer-owned generation and credit expiry', url: 'https://nrlp.appstate.edu/services/customer-owned-generation/' },
    ],
    warnings: [
      'NRLP residential import rate combines $0.032548 distribution and $0.098900 supply per kWh. Taxes and miscellaneous bill charges are excluded.',
      'Retail energy credits carry forward month by month and expire January 1; unused credits have no cash value. Solar adds a $5.92/kW monthly standby charge, modeled using entered DC size; confirm the billed design capacity with NRLP.',
      'Contact NRLP for interconnection approval, especially systems over 20 kW. No automatic generation or export restriction is assumed. Future rate escalation starts at 0%.',
    ],
  },
  {
    id: 'fl-tallahassee', label: 'Tallahassee, FL · residential standard + net metering', state: 'FL', resourceId: 'tallahassee', kind: 'utility',
    assumptions: { ratePeak: 0.13279, rateOffPeak: 0.13279, monthlyFixedCharge: 9.96, solarExportRate: 0.13279, exportCompensation: 'annual-net-metering' },
    sources: [
      { label: 'Tallahassee standard residential rates', url: 'https://www.talgov.com/you/you-account-plans-index' },
      { label: 'Tallahassee net-metering terms', url: 'https://us-selfservice.talgov.com/you/you-products-home-solar-net-metering' },
    ],
    warnings: [
      'Single-phase rate combines $0.09214 energy and $0.04065 fuel per kWh plus $9.96/month. Fuel adjustments, taxes, and other fees can change the actual bill.',
      'Retail credits carry forward and expire on your interconnection anniversary without payout. This estimate uses a January–December credit year; adjust with your utility for a different anniversary.',
      'Published net-metering terms cover approved systems up to 100 kW. Eligibility is not a production cap. No automatic generation/export restriction is assumed; escalation starts at 0%.',
    ],
  },
  { id: 'manual', label: 'Other location / manual tariff', state: null, resourceId: null, kind: 'manual', assumptions: { ratePeak: 0, rateOffPeak: 0 }, sources: [{ label: 'User-entered bill and interconnection terms', url: null }], warnings: ['Enter your local energy rates, fixed charge, export terms, and monthly resource data or select a representative city. No location is inferred.'] },
].map(profile => ({ ...profile, version: 1, reviewedAt: '2026-09-04', assumptions: { ...baseAssumptions, ...profile.assumptions } }));

export function getRegionalProfile(id) {
  const found = REGIONAL_PROFILES.find(profile => profile.id === id);
  const profile = found || REGIONAL_PROFILES.find(profile => profile.id === 'manual');
  return {
    profile: { ...profile, assumptions: { ...profile.assumptions }, sources: profile.sources.map(source => ({ ...source })), warnings: [...profile.warnings] },
    warnings: [...(!found ? ['Unknown regional profile. Manual inputs are required; California defaults were not substituted.'] : []), ...profile.warnings],
  };
}
