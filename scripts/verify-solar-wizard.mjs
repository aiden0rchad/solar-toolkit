// Run against a dev server or production preview. Uses an existing Playwright installation.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME_PATH=/path/to/chrome QA_BASE=http://127.0.0.1:4183 node scripts/verify-solar-wizard.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.QA_BASE || 'http://127.0.0.1:4183').replace(/\/$/, '');
const output = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'solar-wizard-qa-'));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' });
const errors = [];
const external = new Set();
const attach = page => {
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin) external.add(request.url());
  });
};
const page = await context.newPage();
attach(page);
const wizard = page.getByRole('region', { name: 'Solar savings', exact: true });
const button = name => page.getByRole('button', { name, exact: true });
const field = label => page.getByLabel(label, { exact: true });
const value = async (label, expected) => assert.equal(await field(label).inputValue(), String(expected), label);
const step = async number => {
  await page.getByRole('status').filter({ hasText: `Step ${number} of 4` }).waitFor();
  assert.equal(await page.locator('.solar-wizard-progress [aria-current="step"]').count(), 1);
};
const next = async number => { await button('Continue').click(); await step(number); };
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No page-level horizontal overflow.');
const chooser = async () => {
  await button('Guide me through').waitFor();
  assert.equal(await wizard.getByRole('button').count(), 2, 'The first screen offers two paths only.');
  assert.equal(await page.getByRole('spinbutton').count(), 0, 'No numeric inputs overwhelm the first screen.');
  assert.equal(await page.locator('.solar-wizard-results, .recharts-wrapper').count(), 0, 'No default estimate on the first screen.');
};
const expectBlocked = async (number, message) => {
  await button('Continue').click();
  await step(number);
  const alert = wizard.getByRole('alert');
  await alert.waitFor();
  assert.match(await alert.innerText(), message);
  assert.ok(await alert.evaluate(element => element === document.activeElement), 'Validation moves keyboard focus to its explanation.');
};

try {
  await page.goto(`${base}/#/simple-roi`);
  await chooser();
  await noOverflow();
  await page.screenshot({ path: join(output, 'choose-dark.png') });
  const theme = page.getByRole('button', { name: 'Switch to light theme', exact: true });
  if (await theme.count()) {
    await theme.first().click();
    await page.screenshot({ path: join(output, 'choose-light.png') });
    await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).first().click();
  }
  await page.keyboard.press('Tab');
  assert.notEqual(await page.evaluate(() => document.activeElement.tagName), 'BODY', 'Keyboard focus reaches controls.');
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow();
  await page.screenshot({ path: join(output, 'choose-mobile.png') });

  await button('Guide me through').click();
  await step(1);
  await field('Monthly electric bill now').fill('-1');
  await expectBlocked(1, /monthly bill/);
  await field('Monthly electric bill now').fill('333');
  await field('When do you use the most electricity?').selectOption('Summer Peak (AC)');
  await next(2);
  await noOverflow();
  await value('Regional utility example', '');
  await expectBlocked(2, /Choose a regional starting point/);
  await field('Regional utility example').selectOption('manual');
  await value('Electricity price per kWh', 0);
  await value('Solar-resource location', '');
  await expectBlocked(2, /electricity price/);
  await field('Electricity price per kWh').fill('0.25');
  await expectBlocked(2, /monthly values|resource|sunlight/i);
  await field('Regional utility example').selectOption('ca-sacramento-planning');
  await value('Solar-resource location', 'sacramento');
  await next(3);
  await value('Target annual energy offset', 100);
  await button(/^I know the panel details/).click();
  await field('Number of panels').fill('20');
  await field('Panel wattage').fill('400');
  assert.match(await wizard.innerText(), /8\.0 kW/);
  await button('Back').click();
  await step(2);
  await value('Regional utility example', 'ca-sacramento-planning');
  await next(3);
  await value('Number of panels', 20);
  await page.evaluate(() => { location.hash = '#/ev'; });
  await page.getByLabel(/^Your (Current Car MPG|Car's MPG)$/).waitFor();
  await page.evaluate(() => { location.hash = '#/simple-roi'; });
  await step(3);
  await value('Panel wattage', 400);
  await page.reload();
  await step(3);
  await value('Number of panels', 20);
  await noOverflow();
  await page.screenshot({ path: join(output, 'guided-mobile.png') });

  await next(4);
  assert.equal(await field('Estimated system cost').count(), 0, 'Planning cost does not require another numeric input.');
  assert.match(await wizard.innerText(), /\$24,000 at \$3\.00 per watt/);
  await button(/^I have a quote/).click();
  await field('Estimated system cost').fill('24000');
  await field('How would you pay?').selectOption('cash');
  await field('Confirmed incentives / rebates').fill('1000');
  await button('Show my estimate').click();
  await page.getByRole('heading', { name: 'Your first look at solar savings', exact: true }).waitFor();
  assert.equal(await page.locator('.solar-wizard-results > div').count(), 3, 'Summary leads with three metrics.');
  assert.match(await wizard.innerText(), /\$333\/month/);
  assert.match(await wizard.innerText(), /\$23,000 upfront after rebates/);
  assert.match(await wizard.innerText(), /Maintenance and replacements are not included/);
  await noOverflow();
  await page.screenshot({ path: join(output, 'summary-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: join(output, 'summary-desktop.png') });
  const disclosure = page.locator('.solar-wizard-disclosure');
  assert.equal(await disclosure.getAttribute('open'), null, 'Detailed assumptions are initially collapsed.');
  await page.emulateMedia({ media: 'print' });
  assert.ok(await page.getByRole('heading', { name: 'Your first look at solar savings', exact: true }).isVisible(), 'Summary heading prints.');
  assert.ok(await disclosure.getByText(/^System loss /).isVisible(), 'Closed disclosure assumptions print.');
  assert.ok(await disclosure.getByText(/^Confirmed rebates:/).isVisible(), 'Rebates print.');
  await page.pdf({ path: join(output, 'summary-print.pdf'), format: 'A4', printBackground: true });
  await page.screenshot({ path: join(output, 'summary-print.png'), fullPage: true });
  await page.emulateMedia({ media: 'screen' });

  await button('Explore the full calculator').click();
  assert.ok(await page.locator('.solar-full-heading').evaluate(element => element === document.activeElement), 'Switching to the full calculator focuses its heading.');
  await value('Monthly electric bill now', 333);
  await value('Number of panels', 20);
  await value('Panel wattage', 400);
  await value('Estimated system cost', 24000);
  await value('Incentives / rebates', 1000);
  await field('Monthly electric bill now').fill('350');
  await button('Change input mode').click();
  await chooser();
  await button('Guide me through').click();
  await step(4);
  await value('How would you pay?', 'cash');
  await field('How would you pay?').selectOption('loan');
  await button('Show my estimate').click();
  await page.getByRole('heading', { name: 'Your first look at solar savings', exact: true }).waitFor();
  assert.match(await wizard.innerText(), /\$350\/month/);
  assert.match(await wizard.innerText(), /Loan · 7\.99% APR · 25 years/);
  await button('Edit my answers').click();
  await step(1);
  await value('Monthly electric bill now', 350);
  await value('When do you use the most electricity?', 'Summer Peak (AC)');
  await page.getByRole('checkbox', { name: 'Remember inputs on this device' }).check();
  const second = await context.newPage();
  attach(second);
  await second.goto(`${base}/#/simple-roi`);
  await second.getByRole('status').filter({ hasText: 'Step 1 of 4' }).waitFor();
  assert.equal(await second.getByLabel('Monthly electric bill now', { exact: true }).inputValue(), '350', 'Device opt-in restores mode, step, and answers in a new tab.');
  await second.close();
  await page.getByRole('checkbox', { name: 'Remember inputs on this device' }).uncheck();
  await page.getByRole('button', { name: /^Reset .* to defaults$/ }).click();
  await chooser();

  // Safe JSON with invalid wizard fields must fall back without discarding valid sibling inputs.
  await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find(key => key.endsWith(':inputs'));
    const record = JSON.parse(sessionStorage.getItem(key));
    record.tools['simple-roi'] = { monthlyBill: 444, solarExperience: 'unknown', solarWizardStep: 99, solarLocationConfirmed: 'yes' };
    sessionStorage.setItem(key, JSON.stringify(record));
  });
  await page.reload();
  await chooser();
  await button('Guide me through').click();
  await step(1);
  await value('Monthly electric bill now', 444);
  await next(2);
  await value('Regional utility example', '');
  await expectBlocked(2, /Choose a regional starting point/);
  assert.deepEqual(errors, [], 'No uncaught browser errors or console errors.');
  assert.deepEqual([...external], [], 'No third-party runtime requests.');
  console.log(JSON.stringify({ status: 'passed', base, checks: ['two-path entry', 'guided validation', 'explicit region', 'four steps', 'panels and planning price', 'cash and loan', 'summary', 'shared full inputs', 'navigation and reload', 'device opt-in', 'reset', 'malformed wizard state', 'themes', 'mobile', 'keyboard', 'print assumptions', 'network'], output }));
} catch (error) {
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ output, errors, external: [...external] }));
  throw error;
} finally {
  await browser.close();
}
