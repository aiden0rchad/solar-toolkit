// =============================================================================
// THE NEM GLOSSARY.
//
// Every term the three explainers use without stopping to define. The pages
// were written for someone who already knew what a non-bypassable charge was,
// which is close to nobody outside the industry — and the whole point of these
// pages is that a homeowner should be able to hold their own against a salesman
// who does know.
//
// `eras` names the pages a term appears on. A term is defined on the page that
// uses it and nowhere else, so no page carries a definition for a mechanism it
// never mentions.
// =============================================================================

/** @type {{ term: string, expands?: string, body: string, eras: string[] }[]} */
export const GLOSSARY = [
  {
    term: 'NEM',
    expands: 'Net Energy Metering',
    body: 'The rules governing what your utility pays you for solar power you send back to the grid. It is not a subsidy and not a cheque in the post; it is a credit against what you buy, settled on your bill.',
    eras: ['nem1', 'nem2', 'nem3'],
  },
  {
    term: 'Import',
    body: 'A kilowatt-hour you buy from the grid, because your panels are not making enough right now. What you pay for it is the import rate.',
    eras: ['nem1', 'nem2', 'nem3'],
  },
  {
    term: 'Export',
    body: 'A kilowatt-hour your panels made that your house did not use, so it went out to the grid. What you are credited for it is the export rate. Under NEM 3.0 that credit is a different number from the import rate, and much smaller.',
    eras: ['nem1', 'nem2', 'nem3'],
  },
  {
    term: 'Self-consumption',
    body: 'Solar your house uses the moment it is made, without the grid touching it. It is worth the full import rate you did not have to pay, which under NEM 3.0 makes it worth roughly ten times an export. This is the number a battery exists to raise.',
    eras: ['nem1', 'nem2', 'nem3'],
  },
  {
    term: 'True-up',
    body: 'The annual reckoning. Through the year your credits and charges accumulate; once a year the utility settles the balance and bills you for whatever is left. A monthly bill of almost nothing does not mean a year of almost nothing.',
    eras: ['nem1', 'nem2', 'nem3'],
  },
  {
    term: 'Grandfathering',
    body: 'Staying on the rules that applied when your system switched on, rather than the rules in force now. NEM 1.0 and 2.0 customers keep their original terms for 20 years from interconnection. Significantly enlarging a system can end that protection, so check before adding panels.',
    eras: ['nem1', 'nem2'],
  },
  {
    term: 'Interconnection',
    body: 'The date your system was formally permitted to connect to the grid. Not the date you signed, not the date the panels went up. It is the date that decides which NEM era you are in, and it is the one to get in writing.',
    eras: ['nem1', 'nem2', 'nem3'],
  },
  {
    term: 'Tiered rate',
    body: 'Pricing where the first block of kilowatt-hours each month is cheap and everything past it costs more. The clock is irrelevant; only the running total matters. This is what most NEM 1.0 customers were on.',
    eras: ['nem1'],
  },
  {
    term: 'TOU',
    expands: 'Time-of-Use',
    body: 'Pricing where a kilowatt-hour costs different amounts at different hours. In California the expensive window is generally 4pm to 9pm, when the sun is going down and demand is not. Under time-of-use, when you use power matters as much as how much.',
    eras: ['nem2', 'nem3'],
  },
  {
    term: 'Peak / off-peak',
    body: 'The expensive window and everything else. On the rates modelled here, peak is 4pm to 9pm. A load you can move outside that window — a dishwasher, an EV charger, a pool pump — is money you keep.',
    eras: ['nem2', 'nem3'],
  },
  {
    term: 'NBC',
    expands: 'Non-Bypassable Charges',
    body: 'A few cents on every kilowatt-hour you import, funding public-purpose programs, the wildfire fund and nuclear decommissioning. They ride on imports and cannot be netted away by exporting, which is why even a NEM 2.0 system that produced everything it used still had a bill.',
    eras: ['nem2', 'nem3'],
  },
  {
    term: 'ACC',
    expands: 'Avoided Cost Calculator',
    body: 'The CPUC model that sets NEM 3.0 export credits. It pays you what the grid saves by not having to generate that kilowatt-hour itself. At noon, when California already has more solar than it can use, that saving is close to nothing. After sunset it is a great deal more.',
    eras: ['nem3'],
  },
  {
    term: 'Fixed charges',
    body: 'What you pay for being connected at all, before a single kilowatt-hour. Solar cannot remove them, no matter how much you generate, and a payback estimate that assumes your bill goes to zero has quietly ignored them.',
    eras: ['nem1', 'nem2', 'nem3'],
  },
];

/** The terms defined on one era's page, in the order above. */
export const glossaryFor = (era) => GLOSSARY.filter(entry => entry.eras.includes(era));
