/* ============================================================
   The one-time spotlight on the Start Here tab.

   It must be impossible to miss on a first visit, and gone for
   good after one click — a marker that comes back stops being
   a signal.
   ============================================================ */
import { chromium } from 'playwright';

const URL = 'http://localhost:8137/';
let pass = 0, fail = 0;
const failures = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`);
}

const browser = await chromium.launch({ channel: 'msedge' });

const marked = p => p.evaluate(() =>
  !!document.querySelector('.nav[data-view="home"].nav-spotlight'));

async function fresh(opts = {}) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...opts });
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  return p;
}

console.log('=== A FIRST VISIT');
{
  const p = await fresh();
  check('Start Here carries the spotlight', await marked(p), true);
  check('no other nav entry does',
        await p.evaluate(() => document.querySelectorAll('.nav-spotlight').length), 1);

  const look = await p.evaluate(() => {
    const el = document.querySelector('.nav-spotlight');
    const cs = getComputedStyle(el);
    const after = getComputedStyle(el, '::after');
    return {
      animated: cs.animationName !== 'none',
      hasRing: cs.boxShadow !== 'none',
      sweeps: after.animationName !== 'none',
      describedBy: el.getAttribute('aria-describedby'),
    };
  });
  check('it animates, glows and sweeps', {
    animated: look.animated, hasRing: look.hasRing, sweeps: look.sweeps,
  }, { animated: true, hasRing: true, sweeps: true });
  check('screen readers get the hint too', look.describedBy, 'spotlightHint');
  check('the hint element exists',
        await p.evaluate(() =>
          document.getElementById('spotlightHint')?.textContent), 'Recommended starting point');
  await p.close();
}

console.log('\n=== ONE CLICK RETIRES IT FOREVER');
{
  const p = await fresh();
  await p.click('.nav[data-view="home"]');
  await p.waitForTimeout(300);

  check('the marker is gone immediately', await marked(p), false);
  check('and the click still navigated',
        await p.evaluate(() => document.getElementById('home').classList.contains('active')), true);
  check('the choice is stored',
        await p.evaluate(() => localStorage.getItem('abl_start_here_seen')), '1');

  await p.reload();
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  check('it does not come back after a reload', await marked(p), false);

  // Nor after wandering the app.
  await p.click('.nav[data-view="qa"]');
  await p.waitForTimeout(200);
  await p.click('.nav[data-view="home"]');
  await p.waitForTimeout(200);
  check('nor after navigating away and back', await marked(p), false);
  await p.close();
}

console.log('\n=== VISITING OTHER TABS DOES NOT RETIRE IT');
{
  const p = await fresh();
  await p.click('.nav[data-view="qa"]');
  await p.waitForTimeout(250);
  check('still marked after visiting the Support Center', await marked(p), true);
  await p.click('.nav[data-view="guide-live"]');
  await p.waitForTimeout(250);
  check('still marked after visiting a guide', await marked(p), true);
  check('nothing was stored yet',
        await p.evaluate(() => localStorage.getItem('abl_start_here_seen')), null);
  await p.close();
}

console.log('\n=== REDUCED MOTION');
{
  const p = await fresh({ reducedMotion: 'reduce' });
  const m = await p.evaluate(() => {
    const el = document.querySelector('.nav-spotlight');
    return {
      animation: getComputedStyle(el).animationName,
      ring: getComputedStyle(el).boxShadow !== 'none',
      sheen: getComputedStyle(el, '::after').display,
    };
  });
  check('the movement stops', m.animation, 'none');
  check('but the gold ring stays, so the hint is not lost', m.ring, true);
  check('the sweeping sheen is removed', m.sheen, 'none');
  await p.close();
}

console.log('\n=== CONTRAST WHILE MARKED');
for (const scheme of ['light', 'dark']) {
  const p = await fresh({ colorScheme: scheme });
  const ratio = await p.evaluate(() => {
    const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
    const parse = s => s.match(/\d+/g).slice(0, 3).map(Number);
    const el = document.querySelector('.nav-spotlight');
    const cs = getComputedStyle(el);
    const a = lum(parse(cs.color)), b = lum(parse(cs.backgroundColor));
    const hi = Math.max(a, b), lo = Math.min(a, b);
    return +((hi + 0.05) / (lo + 0.05)).toFixed(2);
  });
  console.log(`      ${scheme}: ${ratio}:1`);
  check(`${scheme}: marked label meets AA (4.5:1)`, ratio >= 4.5, true);
  await p.close();
}

await browser.close();
console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (fail) { console.log('FAILURES:'); failures.forEach(f => console.log(' -', f)); process.exit(1); }
