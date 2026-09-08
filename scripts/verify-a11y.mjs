/* ============================================================
   Accessibility + handler-coverage checks.

   1. Every data-action in the DOM resolves to a registered
      handler (the replacement for 32 inline onclick attributes).
   2. Keyboard-only operation of each view.
   3. WCAG AA contrast for text against its actual background,
      in light and dark.
   ============================================================ */
import { chromium } from 'playwright';

const URL = 'http://localhost:8137/';
let pass = 0, fail = 0;
const failures = [];

function check(name, ok, detail) {
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok && detail !== undefined) console.log('        ' + JSON.stringify(detail, null, 2).slice(0, 1400));
}

/* --- Contrast maths (WCAG 2.x relative luminance) --------- */
const CONTRAST = `
  function srgb(c){ c/=255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
  function lum(rgb){ const [r,g,b]=rgb; return 0.2126*srgb(r)+0.7152*srgb(g)+0.0722*srgb(b); }
  function parse(s){ const m = s.match(/rgba?\\(([^)]+)\\)/); if(!m) return null;
    const p = m[1].split(',').map(x=>parseFloat(x));
    return { rgb: p.slice(0,3), a: p.length > 3 ? p[3] : 1 }; }
  function bgOf(el){
    let n = el;
    while (n && n !== document.documentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c && c.a > 0.95) return c.rgb;
      n = n.parentElement;
    }
    return [255,255,255];
  }
  function ratio(fg, bg){ const a = lum(fg), b = lum(bg);
    const hi = Math.max(a,b), lo = Math.min(a,b); return (hi + 0.05) / (lo + 0.05); }
`;

async function contrastReport(page) {
  return page.evaluate(new Function(CONTRAST + `
    const out = [];
    const nodes = [...document.querySelectorAll('.view.active *')].filter(el => {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
      const txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      return txt;
    });
    for (const el of nodes) {
      const cs = getComputedStyle(el);
      const fg = parse(cs.color); if (!fg) continue;
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (size >= 18.66 && bold);
      const need = large ? 3 : 4.5;
      const r = ratio(fg.rgb, bgOf(el));
      if (r < need) out.push({
        text: el.textContent.trim().slice(0, 45),
        cls: el.className && el.className.toString().slice(0, 40),
        color: cs.color, size: cs.fontSize, ratio: +r.toFixed(2), need
      });
    }
    return out;
  `));
}

const browser = await chromium.launch({ channel: 'msedge' });

/* ============ 1. Handler coverage ============ */
console.log('=== HANDLER COVERAGE (replacing 32 inline onclick)');
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await p.click('.nav[data-view="qa"]');
  await p.waitForFunction(() => document.querySelectorAll('.topic-card').length > 1);
  await p.fill('#qSearch', 'refund');
  await p.click('[data-action="qa-search"]');
  await p.waitForSelector('#smartAnswer .answer-card');

  const found = await p.evaluate(() =>
    [...new Set([...document.querySelectorAll('[data-action]')].map(e => e.dataset.action))].sort());
  console.log('  action names present in the DOM:', found.join(', '));

  // No inline handlers survive anywhere.
  const inline = await p.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter(e => e.getAttributeNames().some(n => n.startsWith('on')))
      .map(e => e.tagName + '[' + e.getAttributeNames().filter(n => n.startsWith('on')).join() + ']'));
  check('zero inline on* handlers remain', inline.length === 0, inline);

  // Clicking every action must not produce a "no handler" warning.
  const warnings = [];
  p.on('console', m => { if (/no handler registered/.test(m.text())) warnings.push(m.text()); });
  for (const a of found) {
    const el = await p.$(`.view.active [data-action="${a}"], #modal [data-action="${a}"]`);
    if (el) await el.evaluate(n => n.click()).catch(() => {});
  }
  await p.waitForTimeout(400);
  check('every action name has a registered handler', warnings.length === 0, warnings);
  await p.close();
}

/* ============ 2. Keyboard operation ============ */
console.log('\n=== KEYBOARD');
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });

  // Tab until the sidebar "Support Center" button has focus, then Enter.
  let reached = false;
  for (let i = 0; i < 40 && !reached; i++) {
    await p.keyboard.press('Tab');
    reached = await p.evaluate(() => {
      const el = document.activeElement;
      // the label sits next to an emoji <span class="ico">, so match the button itself
      return !!el && el.classList.contains('nav')
        && el.dataset.view === 'qa' && !el.dataset.query;
    });
  }
  check('sidebar nav is reachable by Tab', reached);

  const ring = await p.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return cs.boxShadow !== 'none' || cs.outlineStyle !== 'none';
  });
  check('focused element shows a visible focus ring', ring);

  await p.keyboard.press('Enter');
  await p.waitForTimeout(600);
  check('Enter activates it (Support Center opened)',
        await p.evaluate(() => document.getElementById('qa').classList.contains('active')));

  // The Home "what happens next" card is a div with role=button.
  await p.goto(URL);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await p.focus('.next-stage-card');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(500);
  check('role=button card responds to Enter',
        await p.evaluate(() => document.getElementById('next-steps').classList.contains('active')));

  // Escape closes the zoom modal — the original had no keyboard exit.
  await p.goto(URL);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await p.evaluate(() => {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('guide-live').classList.add('active');
  });
  await p.click('#liveSteps .journey-shot img');
  await p.waitForSelector('#modal.show');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  check('Escape closes the image modal',
        await p.evaluate(() => !document.getElementById('modal').classList.contains('show')));

  // Q&A accordions are real buttons with aria-expanded.
  await p.goto(URL);
  await p.click('.nav[data-view="qa"]');
  await p.waitForFunction(() => document.querySelectorAll('.topic-card').length > 1);
  await p.click('.topic-card');   // drill into a topic to get article rows
  await p.waitForFunction(() => document.querySelectorAll('.qa').length > 0);
  await p.focus('.qa .q');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  check('answer accordion toggles by keyboard and reports aria-expanded',
        await p.evaluate(() => document.querySelector('.qa .q').getAttribute('aria-expanded') === 'true'));
  await p.close();
}

/* ============ 3. Contrast ============ */

console.log('\n=== FEEDBACK BUTTON HOVER');
for (const scheme of ['light', 'dark']) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.click('.topic-card[data-category="Support"]');
  await p.waitForTimeout(300);
  await p.click('#results .qa:nth-child(1) .q');
  await p.waitForTimeout(300);

  const read = async action => {
    await p.hover(`#results .qa.open [data-action="${action}"]`);
    await p.waitForTimeout(200);
    return p.evaluate(a => {
      const srgb = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
      const parse = s => s.match(/\d+/g).slice(0, 3).map(Number);
      const el = document.querySelector(`#results .qa.open [data-action="${a}"]`);
      const cs = getComputedStyle(el);
      const f = lum(parse(cs.color)), b = lum(parse(cs.backgroundColor));
      const hi = Math.max(f, b), lo = Math.min(f, b);
      return { hue: parse(cs.backgroundColor), ratio: +((hi + 0.05) / (lo + 0.05)).toFixed(2) };
    }, action);
  };

  const yes = await read('article-yes');
  const no = await read('article-no');

  // Green leans green, red leans red — checked on the channel, not by name,
  // so a token change that inverts them cannot pass.
  check(`${scheme}: "Yes" hovers green`, yes.hue[1] >= Math.max(yes.hue[0], yes.hue[2]), true);
  check(`${scheme}: "No" hovers red`, no.hue[0] > no.hue[1] && no.hue[0] > no.hue[2], true);

  // The tint must not make the label harder to read than it was at rest.
  check(`${scheme}: "Yes" label still meets AA while hovered`, yes.ratio >= 4.5, true);
  check(`${scheme}: "No" label still meets AA while hovered`, no.ratio >= 4.5, true);
  console.log(`      ${scheme}: yes ${yes.ratio}:1, no ${no.ratio}:1`);
  await p.close();
}

console.log('\n=== CONTRAST (WCAG AA)');
for (const scheme of ['light', 'dark']) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  await p.goto(URL);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await p.click('.nav[data-view="qa"]');
  await p.waitForFunction(() => document.querySelectorAll('.topic-card').length > 1);

  for (const view of ['home', 'guide-live', 'qa', 'next-steps', 'support']) {
    await p.evaluate(id => {
      document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }, view);
    await p.waitForTimeout(150);
    const bad = await contrastReport(p);
    check(`${scheme} / ${view}: all text meets AA`, bad.length === 0, bad);
  }
  await p.close();
}

await browser.close();
console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (fail) { console.log('FAILURES:'); failures.forEach(f => console.log(' -', f)); process.exit(1); }
