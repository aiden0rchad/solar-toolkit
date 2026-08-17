#!/usr/bin/env node
// Regenerate the README hero and store screenshots.
//
//   npm run build && npm run preview -- --port 4190
//   node scripts/capture.mjs
//
// Drives headless Chrome over the DevTools Protocol rather than Chrome's one-shot
// `--screenshot` flag: that flag fires at load, before Recharts finishes animating,
// and `--virtual-time-budget` freezes the animation at frame zero instead. CDP lets
// us navigate, wait for the charts to settle, and only then capture.
//
// Pro-tool shots are NOT available from this repository — ConsultWizard, ROICalculator
// and ProposalGenerator live only in the private Pro repo. Capture those there.

import { writeFileSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import process from 'node:process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9222;
const BASE = process.env.CAPTURE_BASE ?? 'http://localhost:4190';
const OUT = 'docs/media';
const SETTLE_MS = 3500; // Recharts entrance animation is ~1.5s; leave margin.

const SHOTS = [
  { hash: '#/home', file: 'landing.png', width: 1280, height: 800 },
  { hash: '#/simple-roi', file: 'simple-roi.png', width: 1280, height: 800 },
  { hash: '#/blackout', file: 'blackout.png', width: 1280, height: 800 },
  { hash: '#/ev', file: 'ev-switch.png', width: 1280, height: 800 },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, label, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch { await sleep(500); }
  }
  throw new Error(`timed out waiting for ${label}`);
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let id = 0;
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  });
  const ready = new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', rej);
  });
  const send = (method, params = {}) => new Promise(res => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  return { ws, ready, send };
}

const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/solar-toolkit-capture-profile', 'about:blank',
], { stdio: 'ignore' });

try {
  await waitFor(() => fetch(`http://localhost:${PORT}/json/version`).then(r => r.json()), 'chrome');
  await waitFor(() => fetch(BASE).then(r => { if (!r.ok) throw new Error('not up'); }), `preview server at ${BASE}`);

  const targets = await (await fetch(`http://localhost:${PORT}/json`)).json();
  const page = targets.find(t => t.type === 'page');
  if (!page) throw new Error('no page target');

  const { ws, ready, send } = connect(page.webSocketDebuggerUrl);
  await ready;
  await send('Page.enable');
  await send('Runtime.enable');

  mkdirSync(OUT, { recursive: true });

  for (const shot of SHOTS) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: shot.width, height: shot.height, deviceScaleFactor: 2, mobile: false,
    });
    // Cache-bust the query so each navigation is a real document load.
    await send('Page.navigate', { url: `${BASE}/?shot=${shot.file}${shot.hash}` });
    await sleep(SETTLE_MS);
    const { result } = await send('Page.captureScreenshot', { format: 'png' });
    if (!result?.data) { console.error(`FAILED ${shot.file}`); continue; }
    writeFileSync(`${OUT}/${shot.file}`, Buffer.from(result.data, 'base64'));
    console.log(`captured ${OUT}/${shot.file} (${shot.width}x${shot.height} @2x)`);
  }
  ws.close();
} finally {
  chrome.kill();
}
