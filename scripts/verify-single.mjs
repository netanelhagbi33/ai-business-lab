/* ============================================================
   The single-file build, exercised in a real browser.

   scripts/build-single.mjs rewrites imports, swaps two functions
   and inlines 3.7 MB of screenshots. None of that is visible in a
   diff, so the only honest check is to load the built file and
   walk the flows the team will walk: the guide with its images,
   a search, an article, and the ticket funnel end to end.

   It loads dist/standalone.html rather than dist/review.html.
   review.html is body-only — the host supplies the <head> — and a
   browser left to guess the charset turns every em dash into
   mojibake, which would fail the title check for a reason that has
   nothing to do with the build.

   Needs the local server running.
   Run: node scripts/build-single.mjs && node scripts/verify-single.mjs
   ============================================================ */
import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'msedge' });
const p = await b.newPage({ viewport:{width:1280,height:900} });

const errors = [];
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
p.on('pageerror', e => errors.push('PAGEERROR ' + e.message));

let pass = 0, fail = 0;
const chk = (ok, m, extra='') => { ok ? pass++ : fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${m}${extra && !ok ? '  ' + extra : ''}`); };

// Defaults to the built file; pass a URL to check a deployed copy instead.
const TARGET = process.argv[2] || 'http://localhost:8137/dist/standalone.html';
const bundled = /standalone\.html|review\.html/.test(TARGET);
console.log('checking ' + TARGET + (bundled ? '  (single-file build)' : '  (served site)'));
console.log('');
await p.goto(TARGET);
await p.waitForSelector('.sidebar');
await p.waitForTimeout(800);

chk(await p.title() === 'AI Business Lab — Start Here', 'title survived the build');
chk(await p.locator('.nav[data-view="home"]').count() === 1, 'sidebar rendered');
chk(await p.locator('.nav[data-view="support"]').isHidden(), 'Support Tickets hidden with no ticket');
chk(await p.locator('.learn').count() === 10, 'all ten Start Here cards',
    String(await p.locator('.learn').count()));
chk(await p.locator('.spotlight, .spot-ring, [class*="spotlight"]').count() > 0, 'spotlight marker present');

// --- guide with images -----------------------------------
await p.click('.nav[data-view="guide-live"]');
await p.waitForSelector('#liveSteps .lesson-card');
for (let i = 0; i < 8; i++) {
  await p.evaluate(() => document.querySelector('#liveSteps [data-action="journey-next"]').click());
  await p.waitForTimeout(80);
}
chk((await p.textContent('#liveSteps h2')).includes('Support Center'), 'reached rewritten step 9');
await p.evaluate(async () => {
  for (const i of document.querySelectorAll('#liveSteps .journey-gallery img')) {
    i.loading = 'eager'; i.scrollIntoView({ block:'center' });
    await new Promise(r => setTimeout(r, 200));
  }
});
await p.waitForTimeout(600);
const imgs = await p.evaluate(() => [...document.querySelectorAll('#liveSteps .journey-gallery img')]
  .map(i => ({ data: i.src.startsWith('data:image/png'), ok: i.complete && i.naturalWidth > 0 })));
chk(imgs.length === 3, 'step 9 has three screenshots', String(imgs.length));
// Only the single-file build inlines them; a served site has real files,
// and both are correct.
if (bundled) chk(imgs.every(i => i.data), 'every screenshot is an inline data URI');
else chk(imgs.every(i => !i.data), 'screenshots are served as files, not inlined');
chk(imgs.every(i => i.ok), 'every screenshot decoded');
chk(await p.locator('#liveSteps .action-highlight').count() === 3, 'the three markers rendered');

// --- a Start Here guide, and the way back ----------------
// The block above leaves the app on the Dashboard guide, where the Start
// Here cards are in an inactive view and therefore not clickable.
await p.click('.nav[data-view="home"]');
await p.waitForSelector('.learn[data-guide="guarantee"]');
await p.click('.learn[data-guide="guarantee"]');
await p.waitForSelector('#topic-guide.active .guide-body', { timeout: 20000 }).catch(() => {});
chk(await p.locator('#topic-guide.active .guide-body').count() === 1, 'a Start Here card opens its guide');
chk((await p.textContent('#topic-guide h1').catch(() => '')).includes('Guarantee'),
    'the guide that opened is the one the card named');
chk((await p.textContent('#topic-guide').catch(() => '')).includes('24-hour Boost'),
    'the guide carries its own content, not an article');
await p.click('#topic-guide .help-back-row [data-view="home"]');
await p.waitForTimeout(300);
chk(await p.evaluate(() => document.querySelector('.view.active')?.id) === 'home',
    'the back button returns to Start Here');

// --- Support Center --------------------------------------
await p.click('.nav[data-view="qa"]');
await p.waitForSelector('#qSearch');
await p.waitForFunction(() => document.querySelectorAll('.topic-card').length === 10,
                        null, { timeout: 20000 }).catch(() => {});
chk(await p.locator('.topic-card').count() === 10, 'ten topic cards');
chk(await p.locator('[data-action="open-refund"]').count() === 1, 'one Request a Refund button');

await p.click('#qSearch');
await p.type('#qSearch', 'how do I request a refund', { delay: 4 });
await p.press('#qSearch', 'Enter');
await p.waitForSelector('.answer-card');
const best = await p.textContent('.answer-card h3');
chk(/refund/i.test(best), 'search returned a refund article', best);
const blocks = await p.evaluate(() =>
  [...document.querySelector('.answer-card .answer-full').children].map(c => c.tagName.toLowerCase()));
chk(blocks.includes('p'), 'the article rendered as real blocks', blocks.join(' '));
chk(!(await p.textContent('.answer-card .answer-full')).includes('**'), 'no ** left unrendered');
chk((await p.textContent('.answer-card .answer-full')).includes('90 days'), 'shows the 90-day window');

// --- the deflection funnel -------------------------------
await p.click('.answer-card [data-action="article-no"]');
await p.waitForTimeout(250);
const first = await p.textContent('.article-outcome-box');
chk(/one more/i.test(first), 'one unhelpful article does not unlock a ticket', first.slice(0,60));

await p.fill('#qSearch', '');
await p.click('#qSearch');
await p.type('#qSearch', 'how long does a support ticket take', { delay: 4 });
await p.press('#qSearch', 'Enter');
await p.waitForSelector('.answer-card [data-action="article-no"]');
await p.click('.answer-card [data-action="article-no"]');
await p.waitForTimeout(250);
chk(await p.locator('[data-action="open-ticket"]').count() === 1, 'the second unlocks the ticket');

await p.click('[data-action="open-ticket"]');
await p.waitForSelector('.ticket-modal');
chk(true, 'the ticket form opens');
await p.click('[data-action="submit-ticket"]');
await p.waitForTimeout(400);
chk(await p.locator('.nav[data-view="support"]').isVisible(), 'Support Tickets appears once a ticket exists');

console.log(`\nconsole errors: ${errors.length}`);
errors.slice(0, 5).forEach(e => console.log('   ' + e.slice(0, 140)));
console.log(`\n================ ${pass} passed, ${fail} failed ================`);
await p.close(); await b.close();
process.exit(fail || errors.length ? 1 : 0);
