// Browser regression check. Run against a local dev or production preview server.
// PLAYWRIGHT_MODULE may point at an existing Playwright installation; no runtime dependency is added.
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { REGIONAL_PROFILES } from '../src/data/regionalProfiles.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_BASE || 'http://127.0.0.1:4173';
const output = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'solar-roadmap-qa-'));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
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
if (process.env.QA_UNLOCK_PRO === '1') {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Test entitlement override is local-only.');
  await context.route('**/src/entitlement/EntitlementProvider.jsx', async route => {
    const response = await route.fetch();
    const source = await response.text();
    assert.match(source, /isPro:\s*false/);
    await route.fulfill({ response, body: source.replace(/isPro:\s*false/, 'isPro: true') });
  });
}
const navigate = async hash => {
  await page.evaluate(next => { window.location.hash = next; }, `#/${hash}`);
};
const field = label => page.getByLabel(label === 'Your Current Car MPG' ? /^Your (Current Car MPG|Car's MPG)$/ : label, { exact: true });
const checkValue = async (label, expected) => assert.equal(await field(label).inputValue(), String(expected), label);

try {
  await page.goto(`${base}/#/simple-roi`);
  await page.getByRole('button', { name: 'Let me plug in all my numbers', exact: true }).click();
  await field('Monthly electric bill now').waitFor();
  await field('Monthly electric bill now').fill('321');
  await navigate('ev');
  await field('Your Current Car MPG').fill('17.5');
  // A hidden desktop tooltip must not stretch the page after a mobile resize.
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.locator('.ev-tco-chart .recharts-bar-rectangle path').last().hover();
  await page.mouse.move(0, 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.documentElement.scrollWidth <= innerWidth + 1);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await navigate('simple-roi');
  await checkValue('Monthly electric bill now', 321);
  await page.reload();
  await field('Monthly electric bill now').waitFor();
  await checkValue('Monthly electric bill now', 321);
  await navigate('ev');
  await checkValue('Your Current Car MPG', 17.5);
  await navigate('simple-roi');
  await page.getByRole('button', { name: /^Reset .* to defaults$/ }).click();
  await page.getByRole('button', { name: 'Let me plug in all my numbers', exact: true }).click();
  await checkValue('Monthly electric bill now', 250);

  await field('Monthly electric bill now').fill('345');
  await page.getByRole('checkbox', { name: 'Remember inputs on this device' }).check();
  const second = await context.newPage();
  attach(second);
  await second.goto(`${base}/#/simple-roi`);
  await second.getByLabel('Monthly electric bill now', { exact: true }).waitFor();
  assert.equal(await second.getByLabel('Monthly electric bill now', { exact: true }).inputValue(), '345', 'Device opt-in restores in a new tab.');
  await second.close();
  await page.getByRole('checkbox', { name: 'Remember inputs on this device' }).uncheck();

  await field('Regional utility example').selectOption('nc-boone-nrlp');
  await checkValue('Peak electricity rate', 0.131448);
  await checkValue('Monthly solar capacity charge', 5.92);
  await field('Regional utility example').selectOption('fl-tallahassee');
  await checkValue('Monthly solar capacity charge', 0);
  await checkValue('Monthly fixed charge', 9.96);
  await field('Regional utility example').selectOption('az-phoenix-planning');
  await checkValue('Peak electricity rate', REGIONAL_PROFILES.find(profile => profile.id === 'az-phoenix-planning').assumptions.ratePeak);
  await checkValue('Export credit rate', 0);

  await page.getByRole('button', { name: 'Enter a system', exact: true }).click();
  await field('Number of panels').fill('20');
  const originalCost = await field('Estimated system cost').inputValue();
  await field('Estimated system cost').fill('-1');
  assert.match(await page.getByRole('alert').first().innerText(), /cost/i);
  await field('Estimated system cost').fill(originalCost);
  await field(/^Annual generation cap/).fill('500');
  assert.match(await page.locator('body').innerText(), /500 kWh in year one/);
  await field(/^Annual generation cap/).fill('');
  await field('Panel wattage').fill('400');
  await page.getByRole('checkbox', { name: 'Enter my own 12 monthly solar-resource values' }).check();
  await field('Manual resource units').selectOption('ac');
  for (const month of ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) await field(`${month} resource`).fill('4');
  assert.match(await page.locator('body').innerText(), /11,680/);
  await field('Number of panels').fill('-1');
  assert.match(await page.getByRole('alert').first().innerText(), /Panel count/);
  await field('Number of panels').fill('20');
  await field('DIY payment method').selectOption('loan');
  await field('DIY amount financed').fill('5000');
  await field('DIY loan APR').fill('6');
  await field('DIY loan term').fill('5');
  await field('DIY annual maintenance').fill('100');
  await field('DIY replacement budget').fill('2000');
  await field('DIY replacement year').fill('12');
  assert.equal(await page.getByRole('alert').count(), 0);
  await navigate('ev');
  await navigate('simple-roi');
  await checkValue('Number of panels', 20);
  await checkValue('DIY amount financed', 5000);
  await page.screenshot({ path: join(output, 'solar-desktop.png') });
  await page.locator('.installation-comparison').screenshot({ path: join(output, 'installation-comparison.png') });

  await field('Regional utility example').selectOption('manual');
  await field('Peak electricity rate').fill('0.25');
  await field('Off-peak electricity rate').fill('0.25');
  await page.getByRole('checkbox', { name: 'Enter my own 12 monthly solar-resource values' }).check();
  for (const month of ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) await field(`${month} resource`).fill('4');
  await page.reload();
  await checkValue('Regional utility example', 'manual');
  await checkValue('Jan resource', 4);
  await checkValue('Peak electricity rate', 0.25);
  assert.equal(await page.getByRole('alert').count(), 0, 'Manual region and monthly data survive reload.');

  // Unknown/corrupt persisted records cannot crash the application or restore bad inputs.
  await page.evaluate(() => {
    for (const key of Object.keys(sessionStorage).filter(key => key.endsWith(':inputs'))) sessionStorage.setItem(key, '{bad json');
  });
  await page.reload();
  await page.getByRole('button', { name: 'Let me plug in all my numbers', exact: true }).click();
  await field('Monthly electric bill now').waitFor();
  await checkValue('Monthly electric bill now', 250);

  if (process.env.QA_UNLOCK_PRO === '1') {
    for (const tool of ['calculator', 'consult']) {
      await navigate(tool);
      await field('Regional utility example').selectOption('nc-boone-nrlp');
      await checkValue('Monthly solar capacity charge', 5.92);
      assert.equal(await page.getByRole('alert').count(), 0, `${tool} has no validation error at default inputs.`);
      await page.screenshot({ path: join(output, `pro-${tool}.png`) });
    }
    await navigate('simple-roi');
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: join(output, 'solar-mobile.png') });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'No page-level horizontal overflow on mobile.');
  await page.keyboard.press('Tab');
  assert.notEqual(await page.evaluate(() => document.activeElement.tagName), 'BODY', 'Keyboard focus reaches controls.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ media: 'print' });
  assert.ok(await page.getByRole('heading', { name: 'Is solar worth it for me?', exact: true }).isVisible(), 'Calculator heading prints.');
  assert.ok(await field('DIY annual maintenance').isVisible(), 'Maintenance assumptions print even without opening a disclosure.');
  await page.pdf({ path: join(output, 'solar-print.pdf'), format: 'A4', printBackground: true });
  await page.screenshot({ path: join(output, 'solar-print.png') });
  assert.deepEqual(errors, [], 'No uncaught browser errors.');
  assert.deepEqual([...external], [], 'No third-party runtime requests.');
  console.log(JSON.stringify({ status: 'passed', base, proConsultants: process.env.QA_UNLOCK_PRO === '1', checks: ['navigation', 'reload', 'reset', 'device opt-in', 'malformed storage', 'regional isolation', 'panel sizing', 'manual resource', 'validation', 'installation finance', 'mobile', 'keyboard', 'print', 'network'], output }));
} catch (error) {
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ output, errors, external: [...external] }));
  throw error;
} finally {
  await browser.close();
}
