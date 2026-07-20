#!/usr/bin/env node
/**
 * verify.js — screenshot every beat of the film at a phone viewport, run a
 * scroll jank test, and record a short teaser clip.
 *
 * Mechanical only: it drives the page and reports; judging the screenshots is
 * Claude's job (Stage 5). Requires: Node 18+, `npm i puppeteer-core` in the
 * build folder, Google Chrome (or Chromium) installed, ffmpeg for the teaser.
 *
 * Usage:
 *   node verify.js <url-or-index.html> [--beats 24] [--out verify/] [--no-teaser]
 *
 * Outputs (in --out):
 *   beats/beat-NN.png   one screenshot per beat, top to bottom
 *   jank.json           frame timing during a scripted scroll (+ pass/fail)
 *   teaser.mp4          ~15s portrait scroll-through, ready to post
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// puppeteer-core is installed in the build folder, not next to this script,
// so resolve from the working directory first.
let puppeteer;
try { puppeteer = require(require.resolve('puppeteer-core', { paths: [process.cwd(), __dirname] })); }
catch { console.error('puppeteer-core not installed. Run: npm i puppeteer-core (in the build folder)'); process.exit(1); }

const args = process.argv.slice(2);
const target = args.find(a => !a.startsWith('--'));
if (!target) { console.error('usage: node verify.js <url-or-index.html> [--beats N] [--out dir] [--no-teaser]'); process.exit(2); }
const flag = (name, dflt) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : dflt; };
const BEATS = parseInt(flag('beats', '24'), 10);
const OUT = flag('out', 'verify');
const TEASER = !args.includes('--no-teaser');

const url = /^https?:\/\//.test(target) ? target : 'file://' + path.resolve(target);
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium',
    '/usr/bin/chromium-browser', '/opt/pw-browsers/chromium',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  for (const c of candidates) { try { if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; } catch {} }
  console.error('Chrome not found. Set CHROME_PATH to your Chrome binary.'); process.exit(1);
}

(async () => {
  fs.mkdirSync(path.join(OUT, 'beats'), { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=2'],
  });
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

  console.log('loading ' + url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1500)); // let preloader/fonts settle

  const scrollH = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (scrollH <= 0) console.warn('WARNING: page has no scroll range — is the film section rendering?');

  // 1. Beat screenshots, top to bottom.
  console.log(`capturing ${BEATS} beats over ${scrollH}px of scroll...`);
  for (let i = 0; i < BEATS; i++) {
    const y = Math.round(scrollH * (i / (BEATS - 1)));
    await page.evaluate(t => scrollTo(0, t), y);
    await new Promise(r => setTimeout(r, 400)); // let the lerp settle
    await page.screenshot({ path: path.join(OUT, 'beats', `beat-${String(i).padStart(2, '0')}.png`) });
  }

  // 2. Jank test: measure rAF frame gaps during a continuous scripted scroll.
  console.log('running jank test...');
  await page.evaluate(() => scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 600));
  const jank = await page.evaluate(async (total) => {
    const gaps = [];
    let last = performance.now(), done = false;
    (function measure(t) { gaps.push(t - last); last = t; if (!done) requestAnimationFrame(measure); })(last);
    const DURATION = 8000, start = performance.now();
    await new Promise(res => {
      (function step() {
        const p = Math.min(1, (performance.now() - start) / DURATION);
        scrollTo(0, total * p);
        if (p < 1) requestAnimationFrame(step); else { done = true; res(); }
      })();
    });
    gaps.shift();
    const budget = 1000 / 60 * 1.5; // >25ms ≈ dropped frame at 60Hz
    const dropped = gaps.filter(g => g > budget).length;
    const worst = Math.max(...gaps);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return { frames: gaps.length, droppedFrames: dropped, droppedPct: +(100 * dropped / gaps.length).toFixed(1),
             avgFrameMs: +avg.toFixed(2), worstFrameMs: +worst.toFixed(1) };
  }, scrollH);
  jank.pass = jank.droppedPct <= 5;
  fs.writeFileSync(path.join(OUT, 'jank.json'), JSON.stringify(jank, null, 2));
  console.log(`jank: ${jank.droppedPct}% dropped (${jank.droppedFrames}/${jank.frames}), worst ${jank.worstFrameMs}ms — ${jank.pass ? 'PASS' : 'FAIL (fix before shipping; see engine.md performance law)'}`);

  // 3. Teaser: frame-capture a full scroll-through and stitch with ffmpeg.
  if (TEASER) {
    console.log('recording teaser...');
    const framesDir = path.join(OUT, 'teaser-frames');
    fs.mkdirSync(framesDir, { recursive: true });
    await page.evaluate(() => scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 800));
    const TEASER_SECONDS = 15, FPS = 24, N = TEASER_SECONDS * FPS;
    for (let i = 0; i < N; i++) {
      const p = i / (N - 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // easeInOut scroll feel
      await page.evaluate(t => scrollTo(0, t), Math.round(scrollH * eased));
      await new Promise(r => setTimeout(r, 25));
      await page.screenshot({ path: path.join(framesDir, `f-${String(i).padStart(4, '0')}.png`) });
    }
    try {
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS),
        '-i', path.join(framesDir, 'f-%04d.png'),
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart',
        path.join(OUT, 'teaser.mp4')]);
      fs.rmSync(framesDir, { recursive: true, force: true });
      console.log('teaser: ' + path.join(OUT, 'teaser.mp4'));
    } catch {
      console.warn('ffmpeg failed or missing — teaser frames left in ' + framesDir);
    }
  }

  await browser.close();
  console.log(`done. Review every image in ${path.join(OUT, 'beats')}/ before calling the build finished.`);
  if (!jank.pass) process.exit(4);
})().catch(e => { console.error(e); process.exit(1); });
