// Uses an existing Playwright installation; does not open the donation/payment page.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROME_PATH=/path/to/chrome QA_BASE=http://127.0.0.1:4183 node scripts/verify-sidebar-support.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = (process.env.QA_BASE || 'http://127.0.0.1:4183').replace(/\/$/, '');
const destination = 'https://www.buymeacoffee.com/aiden0rchad';
const output = process.env.QA_OUTPUT || mkdtempSync(join(tmpdir(), 'sidebar-support-qa-'));
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
const page = await context.newPage();
const errors = [];
const external = new Set();
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('request', request => {
  if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(base).origin) external.add(request.url());
});
const links = page.locator(`a[href="${destination}"]`);
const support = links.locator('visible=true');
const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'No horizontal page overflow.');
const inViewport = async () => {
  const box = await support.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, 'Support link is reachable inside the viewport.');
  return box;
};
const checkLink = async () => {
  assert.equal(await support.count(), 1, 'Exactly one support link is visible.');
  assert.match(await support.innerText(), /Buy me a coffee/);
  assert.equal(await support.getAttribute('target'), '_blank');
  const rel = (await support.getAttribute('rel') || '').split(/\s+/);
  assert.ok(rel.includes('noopener') && rel.includes('noreferrer'), 'External link protects the opener and referrer.');
  assert.ok(await page.getByText('Support future development and testing.', { exact: true }).locator('visible=true').isVisible());
  await support.scrollIntoViewIfNeeded();
  return inViewport();
};
const keyboardFocus = async () => {
  await support.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  assert.ok(await support.evaluate(element => {
    const style = getComputedStyle(element);
    return element === document.activeElement && element.matches(':focus-visible') && ((parseFloat(style.outlineWidth) > 0 && style.outlineStyle !== 'none') || style.boxShadow !== 'none');
  }), 'Keyboard navigation reaches support with a visible focus indicator.');
};
const printHidden = async () => {
  await page.emulateMedia({ media: 'print' });
  for (const link of await links.all()) assert.equal(await link.isVisible(), false, 'Support is omitted from print.');
  await page.emulateMedia({ media: 'screen' });
};

try {
  await page.goto(`${base}/#/simple-roi`);
  await page.getByRole('button', { name: 'Guide me through', exact: true }).waitFor();
  const desktop = await checkLink();
  assert.ok(desktop.x < 260 && desktop.y > 650, 'Desktop support sits at the bottom of the left sidebar.');
  await noOverflow();
  await keyboardFocus();
  await page.screenshot({ path: join(output, 'desktop-dark.png') });
  await printHidden();
  const lightToggle = page.getByRole('button', { name: 'Switch to light theme', exact: true }).locator('visible=true');
  if (await lightToggle.count()) {
    await lightToggle.click();
    await checkLink();
    await page.screenshot({ path: join(output, 'desktop-light.png') });
    await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).locator('visible=true').click();
  }

  await page.locator('nav:visible').getByRole('button', { name: 'EV Switch', exact: true }).click();
  await page.getByLabel(/^Your (Current Car MPG|Car's MPG)$/).waitFor();
  await checkLink();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await inViewport();
  await page.setViewportSize({ width: 1440, height: 500 });
  await checkLink();
  await page.locator('nav:visible').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await inViewport();
  await noOverflow();
  await page.screenshot({ path: join(output, 'desktop-short.png') });

  await page.locator('nav:visible').getByRole('button', { name: /^Solar Savings(?: \(Simple\))?$/ }).click();
  await page.getByRole('button', { name: 'Guide me through', exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  await checkLink();
  await noOverflow();
  await keyboardFocus();
  await page.screenshot({ path: join(output, 'mobile.png') });
  await printHidden();
  if (await menu.isVisible()) {
    await page.keyboard.press('Escape');
    assert.equal(await support.count(), 0, 'Closing the menu hides its support link.');
    await menu.click();
    await checkLink();
  }
  assert.deepEqual(errors, [], 'No uncaught browser or console errors.');
  assert.deepEqual([...external], [], 'No external runtime scripts, images, or requests.');
  console.log(JSON.stringify({ status: 'passed', base, checks: ['sidebar placement', 'calculator navigation', 'short desktop', 'mobile', 'keyboard focus', 'print hidden', 'safe external link', 'no external runtime requests'], output }));
} catch (error) {
  await page.screenshot({ path: join(output, 'failure.png'), fullPage: true }).catch(() => {});
  console.error(JSON.stringify({ output, errors, external: [...external] }));
  throw error;
} finally {
  await browser.close();
}
