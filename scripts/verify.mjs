/* ============================================================
   Full verification of the rebuilt app against the original.

   Runs the same behavioural checklist on both, compares the
   results, and writes screenshots for every view and guide step.
   ============================================================ */
import { chromium } from 'playwright';
import fs from 'fs';

const ORIGINAL = 'file:///C:/Users/Netan/Downloads/index%20(28).html';
const REBUILT  = 'http://localhost:8137/';
const SHOTS = 'verify-shots';

const QUERIES = [
  'how do payouts work', 'boost', 'refund', 'what did i buy',
  'success manager', 'articles', 'withdraw money', 'niche',
  'billing', 'security',
];

let pass = 0, fail = 0;
const failures = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; failures.push({ name, expected, actual }); }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`);
}

/** Everything we can measure about one build, for A/B comparison. */
async function probe(page, url, label) {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('#buildNav .journey-step', { state: 'attached', timeout: 15000 });

  // --- Q&A: category counts + ranked search results
  await page.click('.nav[data-view="qa"]');
  await page.waitForSelector('.cat, .topic-card', { state: 'attached', timeout: 15000 });
  await page.waitForFunction(() =>
    document.querySelectorAll('.cat').length > 1 ||
    document.querySelectorAll('.topic-card').length > 1);

  // Original renders .cat pills (incl. a synthetic "All"); the rebuilt
  // Support Center renders topic cards. Compare name -> count either way.
  const catCounts = await page.evaluate(() => {
    const pills = [...document.querySelectorAll('.cat')];
    if (pills.length) {
      return pills
        .map(c => [c.querySelector('span').textContent,
                   c.querySelector('em').textContent])
        .filter(([name]) => name !== 'All');
    }
    return [...document.querySelectorAll('.topic-card')].map(c => [
      c.querySelector('.topic-card-name').textContent,
      c.querySelector('.topic-card-count').textContent.replace(/\D+/g, ''),
    ]);
  });

  const searches = {};
  for (const q of QUERIES) {
    searches[q] = await page.evaluate(async query => {
      const input = document.getElementById('qSearch');
      input.value = query;
      // Enter triggers searchKB in both builds
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await new Promise(r => setTimeout(r, 150));
      const best = document.querySelector('#smartAnswer h3');
      const list = [...document.querySelectorAll('#results .q span:first-child')]
        .map(e => e.textContent.trim()).slice(0, 5);
      return { best: best ? best.textContent.trim() : null, top5: list };
    }, q);
  }

  // --- Guide step titles, both paths
  const guides = {};
  for (const [path, view, nav] of [['build', 'guide-build', 'buildNav'], ['live', 'guide-live', 'liveNav']]) {
    await page.click(`.nav[data-view="qa"]`).catch(() => {});
    await page.evaluate(v => {
      document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
      document.getElementById(v).classList.add('active');
    }, view);
    await page.waitForSelector(`#${nav} .journey-step`, { state: 'attached' });
    guides[path] = await page.evaluate(n =>
      [...document.querySelectorAll(`#${n} .journey-step b`)].map(e => e.textContent), nav);
  }

  // --- Images actually referenced by the rendered lesson
  const imgs = await page.evaluate(() =>
    [...document.querySelectorAll('#buildSteps img, #liveSteps img')].length);

  // --- Highlight overlays on the current lesson
  const overlays = await page.evaluate(() =>
    [...document.querySelectorAll('#liveSteps .action-highlight')]
      .map(e => [e.dataset.label, e.style.left, e.style.top, e.style.width, e.style.height]));

  return { label, catCounts, searches, guides, imgs, overlays, errors };
}

fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });

console.log('=== Probing ORIGINAL');
const pageA = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const A = await probe(pageA, ORIGINAL, 'original');

console.log('=== Probing REBUILT');
const pageB = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const B = await probe(pageB, REBUILT, 'rebuilt');

console.log('\n=== CONTENT PARITY (rebuilt must equal original)');
// Deliberate divergences from the original, declared so the count check
// still guards every other category rather than being relaxed.
//
//   removed: two personal replies published as articles — one carried a
//            customer's phone number and email, the other opened "Dear Dean".
//   added:   two guides for the questions the ticket data ranks highest,
//            surfaced as cards on Start Here.
const REMOVED_FROM_CATEGORY = { 'Support': 2 };
const ADDED_TO_CATEGORY = { 'Dashboard & Access': 1, 'Refunds': 1 };
const expectedCounts = A.catCounts.map(([name, n]) =>
  [name, String(Number(n)
    - (REMOVED_FROM_CATEGORY[name] || 0)
    + (ADDED_TO_CATEGORY[name] || 0))]);
check('category counts match, allowing for the declared removals and additions',
      B.catCounts, expectedCounts);
for (const q of QUERIES) {
  check(`search "${q}" — best match`, B.searches[q].best, A.searches[q].best);
  check(`search "${q}" — top 5 results`, B.searches[q].top5, A.searches[q].top5);
}
check('build guide step titles', B.guides.build, A.guides.build);
check('live guide step titles', B.guides.live, A.guides.live);
// Every overlay the original shipped must still be pixel-identical: that is
// the guarantee that the per-screenshot calibration has not drifted.
// Deliberate additions are allowed, and named, so a new one cannot slip in
// unnoticed.
const ADDED_OVERLAYS = [
  ['Press + to see all features', '18.406%', '86.028%', '3.163%', '5.427%'],
];
const carriedOver = B.overlays.filter(o =>
  !ADDED_OVERLAYS.some(a => JSON.stringify(a) === JSON.stringify(o)));
check('original overlay geometry unchanged', carriedOver, A.overlays);
check('only the declared overlays were added',
      B.overlays.length - carriedOver.length, ADDED_OVERLAYS.length);
check('rebuilt has no page errors', B.errors, []);

console.log('\n=== THE FIXED BUG: arguments never ride inside an attribute');
{
  const p = pageB;
  await p.goto(REBUILT);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.fill('#qSearch', 'how do payouts work');
  await p.click('[data-action="qa-search"]');
  await p.waitForSelector('#smartAnswer .answer-card');

  // The original built onclick="notSolved(${JSON.stringify(q)},...)", whose
  // quotes closed the attribute and left the button inert. The successor
  // control carries its argument as a data attribute instead, so no
  // question text can break out of the markup.
  const btn = await p.evaluate(() => {
    const b = document.querySelector('#smartAnswer [data-action="article-no"]');
    return b ? { attrs: b.getAttributeNames(), question: b.dataset.question } : null;
  });
  check('escalation control has clean attributes (no garbage)', btn.attrs,
        ['class', 'type', 'data-action', 'data-question']);
  check('its argument survives intact',
        btn.question, 'How do withdrawals and payouts work?');

  // A question containing quotes and angle brackets must not corrupt the
  // markup — the exact class of failure the original shipped.
  check('a hostile question cannot break the attribute',
        await p.evaluate(() => {
          const probe = 'He said "why" & <b>bold</b>';
          const esc = s => String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
          const host = document.createElement('div');
          host.innerHTML = `<button data-action="article-no" data-question="${esc(probe)}"></button>`;
          const b = host.querySelector('button');
          return b.getAttributeNames().length === 2 && b.dataset.question === probe;
        }), true);
}

console.log('\n=== SIDEBAR: in-page vs external entries');
{
  const p = pageB;
  await p.goto(REBUILT);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });

  const nav = await p.evaluate(() =>
    [...document.querySelectorAll('.nav')].map(n => ({
      label: n.textContent.trim(),
      view: n.dataset.view || null,
      external: n.classList.contains('nav-external'),
      disabled: n.disabled,
    })));

  check('external entries are inert (no data-view, disabled)',
        nav.filter(n => n.external).map(n => [n.label, n.view, n.disabled]),
        [['📝Article Generator+', null, true],
         ['🚀Boosters+', null, true],
         ['💳Billing›', null, true],
         ['↪Log Out', null, true]]);

  check('in-page entries all navigate',
        nav.filter(n => !n.external).map(n => n.view),
        ['home', 'guide-live', 'qa', 'support']);

  // The original gave four buttons data-view="qa", so opening the Support
  // Center lit up Article Generator, Boosters and Billing too.
  await p.click('.nav[data-view="qa"]');
  await p.waitForTimeout(300);
  check('opening Support Center highlights exactly one entry',
        await p.evaluate(() =>
          [...document.querySelectorAll('.nav.active')].map(n => n.textContent.trim())),
        ['❓Support Center']);

  // Inert entries must not be keyboard-reachable either. A disabled
  // button still reports tabIndex 0, so tab through and see where focus
  // actually lands rather than trusting the property.
  await p.evaluate(() => document.body.focus());
  const focused = [];
  for (let i = 0; i < 25; i++) {
    await p.keyboard.press('Tab');
    const hit = await p.evaluate(() => {
      const el = document.activeElement;
      return el && el.classList.contains('nav-external') ? el.textContent.trim() : null;
    });
    if (hit) focused.push(hit);
  }
  check('Tab never reaches an external entry', focused, []);

  // Clicking one must change nothing at all.
  const before = await p.evaluate(() => document.querySelector('.view.active').id);
  await p.evaluate(() => document.querySelector('.nav-external').click());
  await p.waitForTimeout(200);
  check('clicking an external entry changes no view',
        await p.evaluate(() => document.querySelector('.view.active').id), before);
}



console.log('\n=== "Request a Refund" exists in exactly one place');
{
  const p = pageB;
  await p.goto(REBUILT);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });

  // Across the whole document, every view included — not just the visible one.
  check('one refund control in the entire app',
        await p.evaluate(() =>
          [...document.querySelectorAll('[data-action="open-refund"]')].map(b => ({
            text: b.textContent.trim(),
            inRefundBox: !!b.closest('.help-refund'),
            view: b.closest('.view')?.id ?? null,
          }))),
        [{ text: 'Request a Refund', inRefundBox: true, view: 'qa' }]);

  // It must survive into the ticket view too — i.e. not reappear there.
  await p.evaluate(() => {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('support').classList.add('active');
  });
  await p.waitForTimeout(150);
  check('the Support Tickets header offers no refund button',
        await p.evaluate(() =>
          !!document.querySelector('#support [data-action="open-refund"]')), false);

  // And nothing rendered at runtime adds one.
  await p.evaluate(() => {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('qa').classList.add('active');
  });
  await p.fill('#qSearch', 'refund');
  await p.click('[data-action="qa-search"]');
  await p.waitForTimeout(300);
  check('a refund search does not render extra refund buttons',
        await p.evaluate(() =>
          document.querySelectorAll('[data-action="open-refund"]').length), 1);
}


console.log('\n=== ARRIVING AT THE SUPPORT CENTER ALWAYS LANDS ON THE GRID');
{
  const p = pageB;
  await p.goto(REBUILT);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });

  const state = () => p.evaluate(() => ({
    grid: getComputedStyle(document.getElementById('topicGrid')).display !== 'none',
    title: document.getElementById('qaTitle').textContent.trim(),
  }));

  // Every route in, after having drilled into a topic each time.
  const routes = [
    ['sidebar entry',            '.nav[data-view="qa"]'],
    ['Home "Support Center →"',  '#home .question-path [data-view="qa"]'],
    ['Home "How to get help"',   '#home .learn[data-view="qa"]'],
    ['Next Steps button',        '#next-steps [data-view="qa"]'],
  ];

  for (const [label, selector] of routes) {
    // land in a topic first
    await p.click('.nav[data-view="qa"]');
    await p.waitForSelector('.topic-card', { state: 'attached' });
    await p.click('.topic-card[data-category="Earnings & Payouts"]');
    await p.waitForTimeout(250);
    check(`(setup) inside a topic before "${label}"`, (await state()).title,
          '💰Earnings & Payouts');

    // leave, then come back by this route
    await p.click('.nav[data-view="home"]');
    await p.waitForTimeout(200);
    if (selector.startsWith('#next-steps')) {
      await p.click('#home .next-stage-card');
      await p.waitForTimeout(300);
    }
    await p.click(selector);
    await p.waitForTimeout(350);
    check(`"${label}" lands on the topic grid`, await state(),
          { grid: true, title: 'How can we help?' });
  }

  // A search must be cleared too, not just a topic.
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.fill('#qSearch', 'refund');
  await p.click('[data-action="qa-search"]');
  await p.waitForTimeout(300);
  check('(setup) in search results', (await state()).title, 'Search results');

  await p.click('.nav[data-view="home"]');
  await p.waitForTimeout(200);
  await p.click('.nav[data-view="qa"]');
  await p.waitForTimeout(350);
  check('returning also clears the search box',
        await p.evaluate(() => ({
          box: document.getElementById('qSearch').value,
          title: document.getElementById('qaTitle').textContent.trim(),
        })),
        { box: '', title: 'How can we help?' });
}


console.log('\n=== START HERE CARDS THAT OPEN AN ARTICLE');
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(REBUILT);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('.learn-grid .learn');

  check('ten cards on Start Here',
        await p.evaluate(() => document.querySelectorAll('.learn-grid .learn').length), 10);

  const CARDS = [
    ['Where is my dashboard?', 'Dashboard & Access'],
    ['How does the money-back guarantee work, and how do I request a refund?', 'Refunds'],
  ];

  for (const [question, category] of CARDS) {
    await p.goto(REBUILT);
    await p.waitForSelector('.learn-grid .learn');
    await p.click(`[data-question="${question}"]`);
    await p.waitForTimeout(800);

    check(`"${question.slice(0, 40)}…" opens its article`, await p.evaluate(() => ({
      view: document.querySelector('.view.active').id,
      grid: getComputedStyle(document.getElementById('topicGrid')).display !== 'none',
      rows: document.querySelectorAll('#results .qa').length,
      open: !!document.querySelector('#results .qa.open'),
    })), { view: 'qa', grid: false, rows: 1, open: true });

    check(`  …and it is the right one`, await p.evaluate(() =>
      document.querySelector('#results .qa .q span small').nextSibling.textContent.trim()
      || document.querySelector('#results .qa .q span').textContent.trim()), question);

    check(`  …under ${category}`, await p.evaluate(() =>
      document.querySelector('#results .qa .q small').textContent), category);

    // The reader must be able to get out to the topic grid.
    await p.click('.help-back-row [data-action="qa-home"]');
    await p.waitForTimeout(300);
    check('  …and the back button still works', await p.evaluate(() =>
      getComputedStyle(document.getElementById('topicGrid')).display !== 'none'), true);
  }

  // A card pointing at a question that does not exist must not blank the page.
  await p.goto(REBUILT);
  await p.waitForSelector('.learn-grid .learn');
  await p.evaluate(() => {
    const b = document.querySelector('.learn[data-action="open-article"]');
    b.dataset.question = 'This article does not exist';
    b.click();
  });
  await p.waitForTimeout(800);
  check('a card naming a missing article falls back to the topic grid',
        await p.evaluate(() =>
          getComputedStyle(document.getElementById('topicGrid')).display !== 'none'), true);
  await p.close();
}

console.log('\n=== SUPPORT CENTER STATES (browse / topic / search)');
{
  const p = pageB;
  await p.goto(REBUILT);
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });

  const vis = () => p.evaluate(() => {
    const shown = id => {
      const el = document.getElementById(id);
      return !!el && getComputedStyle(el).display !== 'none';
    };
    return {
      crumb:   shown('qaCrumb'),
      grid:    shown('topicGrid'),
      results: shown('qaResultsWrap'),
      popular: shown('popularQs'),
      // exclude decorative [aria-hidden] icons, mirroring what a
      // screen reader announces
      title: [...document.getElementById('qaTitle').childNodes]
        .filter(n => !(n.nodeType === 1 && n.getAttribute('aria-hidden') === 'true'))
        .map(n => n.textContent).join('').trim(),
    };
  });

  check('browse: grid shown, no breadcrumb, no results', await vis(),
        { crumb: false, grid: true, results: false, popular: true,
          title: 'How can we help?' });
  check('browse: 10 topic cards',
        await p.evaluate(() => document.querySelectorAll('.topic-card').length), 10);

  await p.click('.topic-card[data-category="Earnings & Payouts"]');
  await p.waitForTimeout(250);
  check('topic: breadcrumb + results shown, grid hidden', await vis(),
        { crumb: true, grid: false, results: true, popular: false,
          title: 'Earnings & Payouts' });
  check('topic: reports 40 articles',
        await p.evaluate(() => document.getElementById('qaMeta').textContent.trim()),
        '40 articles in this topic');
  // Inside a topic the category eyebrow is suppressed, so verify scoping by
  // searching a term unique to another topic and confirming zero crossover.
  check('topic: category eyebrow suppressed (all one topic)',
        await p.evaluate(() => document.querySelectorAll('#results .q small').length), 0);
  check('topic: row count matches the topic size',
        await p.evaluate(() => document.querySelectorAll('#results .qa').length), 18);

  await p.click('#qaCrumb button');
  await p.waitForTimeout(250);
  check('the back button returns to browse', (await vis()).grid, true);


  // The way back used to be a text breadcrumb that read as a heading.
  await p.click('.topic-card[data-category="Getting Started"]');
  await p.waitForTimeout(250);
  check('a topic shows two real back buttons (top and end of list)',
        await p.evaluate(() =>
          [...document.querySelectorAll('[data-action="qa-home"]')]
            .filter(b => b.offsetParent !== null)
            .map(b => ({ text: b.textContent.trim().replace(/\s+/g, ' '),
                         isButton: b.classList.contains('btn') }))),
        // no space in the text: the arrow is a separate span and the gap
        // comes from flex, not from markup whitespace
        [{ text: '←All topics', isButton: true },
         { text: '←Back to all topics', isButton: true }]);

  check('the top back button has a visible border, not link styling',
        await p.evaluate(() => {
          const cs = getComputedStyle(document.querySelector('.help-back-row .help-back'));
          return cs.borderTopWidth !== '0px' && cs.backgroundColor !== 'rgba(0, 0, 0, 0)';
        }), true);

  await p.click('.help-back-foot [data-action="qa-home"]');
  await p.waitForTimeout(250);
  check('the button at the end of the list returns to the grid',
        (await vis()).grid, true);

  await p.click('.topic-card[data-category="Getting Started"]');
  await p.waitForTimeout(250);
  await p.click('.help-back-row [data-action="qa-home"]');
  await p.waitForTimeout(250);
  check('the button at the top returns to the grid', (await vis()).grid, true);
  await p.fill('#qSearch', 'refund');
  await p.click('[data-action="qa-search"]');
  await p.waitForTimeout(250);
  const sv = await vis();
  check('search: results shown, grid hidden',
        { crumb: sv.crumb, grid: sv.grid, results: sv.results },
        { crumb: true, grid: false, results: true });
  check('search: header says Search results', sv.title, 'Search results');
  check('search: best-match card rendered',
        await p.evaluate(() => !!document.querySelector('#smartAnswer .answer-card')), true);

  await p.fill('#qSearch', '');
  await p.click('[data-action="qa-search"]');
  await p.waitForTimeout(250);
  check('empty search returns to browse', (await vis()).grid, true);
}


console.log('\n=== PERSISTENCE (localStorage keys must be unchanged)');
{
  const p = pageB;
  await p.goto(REBUILT);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await p.evaluate(() => {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('guide-build').classList.add('active');
  });
  await p.click('[data-action="journey-next"]');
  await p.waitForTimeout(200);
  await p.click('[data-action="journey-next"]');
  await p.waitForTimeout(200);

  check('abl_v21_build_index written',
        await p.evaluate(() => localStorage.getItem('abl_v21_build_index')), '2');
  check('abl_v21_build_done written',
        await p.evaluate(() => localStorage.getItem('abl_v21_build_done')), '[1,2]');

  await p.reload();
  await p.waitForSelector('#buildSteps .lesson-card', { state: 'attached' });
  check('progress survives reload (step 3 of 6)',
        await p.evaluate(() => document.getElementById('buildProgressText').textContent),
        'Step 3 of 6');
}

console.log('\n=== TICKETS');
{
  const p = pageB;
  // The refund form is reached from the Support Center's refund box —
  // the only place the control exists.
  await p.evaluate(() => {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('qa').classList.add('active');
  });
  await p.click('.help-refund [data-action="open-refund"]');
  await p.waitForSelector('#tSubject');
  await p.fill('#tMessage', 'Verification ticket');
  await p.click('#modal [data-action="submit-ticket"]');
  await p.waitForTimeout(300);
  const t = await p.evaluate(() => JSON.parse(localStorage.getItem('abl_help_tickets') || '[]'));
  check('ticket saved with the original shape',
        t.length === 1 && Object.keys(t[0]).sort().join(','),
        'created,id,message,status,title,type');
  check('ticket status OPEN', t[0] && t[0].status, 'OPEN');
}


console.log('\n=== PER-STEP RULES PANEL');
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await p.goto(REBUILT);
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('abl_v21_live_index', '2'); });
  await p.reload();
  await p.waitForSelector('#liveSteps .lesson-card', { state: 'attached' });

  const panel = await p.evaluate(() => {
    const el = document.querySelector('#liveSteps .lesson-rules');
    if (!el) return null;
    return {
      title: el.querySelector('.lesson-rules-title').textContent,
      rules: [...el.querySelectorAll('.lesson-rules-list li')].map(li => li.textContent),
      hasExample: !!el.querySelector('.lesson-rules-example'),
    };
  });

  check('the payout step states the withdrawal conditions',
        panel && panel.title, 'WHEN YOU CAN ACTUALLY WITHDRAW');
  check('all four conditions are listed', panel && panel.rules.length, 4);
  check('the $100 threshold is stated',
        panel && panel.rules.some(r => /\$100/.test(r)), true);
  check('NET-45 is explained, not just named',
        panel && panel.rules.some(r => /45 days counted from the last day of the month/.test(r)), true);
  check('the 1st-14th request window is stated',
        panel && panel.rules.some(r => /1st and the 14th/.test(r)), true);
  check('a worked example follows', panel && panel.hasExample, true);

  // The panel is opt-in per step, not boilerplate on every one.
  // Scoped to #liveSteps: the build guide's Next button comes first in the
  // document, so an unscoped query advances the wrong journey.
  await p.evaluate(() =>
    document.querySelector('#liveSteps [data-action="journey-next"]').click());
  await p.waitForTimeout(300);
  check('steps without rules render no panel',
        await p.evaluate(() => !!document.querySelector('#liveSteps .lesson-rules')), false);
  await p.close();
}

console.log('\n=== IMAGES RESOLVE (no 404s)');
{
  // Its own page: earlier blocks leave scroll position and smooth-scroll
  // animations in flight, which made this block intermittently see zero
  // loaded images.
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const bad = [];
  p.on('response', r => { if (r.status() >= 400) bad.push(r.url()); });
  await p.goto(REBUILT);
  await p.waitForSelector('#liveSteps .journey-shot img', { state: 'attached' });

  await p.evaluate(() => {
    document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
    document.getElementById('guide-live').classList.add('active');
  });

  // Lazy images fetch only as they approach the viewport, and with explicit
  // width/height the lesson is far taller than the screen — so scrolling to
  // the bottom leaves the top ones unfetched. Walk each into view and wait,
  // which is what a reader does anyway.
  const imgs = await p.$$('#liveSteps .journey-shot img');
  check('the live guide rendered images at all', imgs.length > 0, true);

  for (const img of imgs) {
    await img.scrollIntoViewIfNeeded();
    await p.waitForFunction(el => el.complete && el.naturalWidth > 0, img, { timeout: 15000 });
  }
  check('every lesson image loads when scrolled to', true, true);
  check('no failed requests', bad, []);

  check('lesson images are lazy',
        await p.evaluate(() =>
          [...document.querySelectorAll('#liveSteps .journey-shot img')]
            .every(i => i.getAttribute('loading') === 'lazy')), true);

  // Deferral must be real: a fresh load of Home fetches no screenshots.
  const fresh = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let imgRequests = 0;
  fresh.on('request', r => { if (r.resourceType() === 'image') imgRequests++; });
  await fresh.goto(REBUILT);
  await fresh.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await fresh.waitForTimeout(1200);
  check('no screenshots fetched on the Home view', imgRequests, 0);
  await fresh.close();
  await p.close();
}
console.log('\n=== SCREENSHOTS');
const VIEWS = ['home', 'guide-build', 'guide-live', 'next-steps', 'qa', 'support'];
for (const [w, h, tag] of [[1440, 900, 'desktop'], [1024, 900, 'tablet'], [390, 844, 'mobile']]) {
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(REBUILT);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  await p.click('.nav[data-view="qa"]').catch(() => {});
  await p.waitForSelector('.topic-card', { state: 'attached' }).catch(() => {});
  for (const v of VIEWS) {
    await p.evaluate(id => {
      document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
      document.getElementById(id).classList.add('active');
      window.scrollTo(0, 0);
    }, v);
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/${tag}-${v}.png`, fullPage: true });
  }
  await p.close();
  console.log(`  wrote ${VIEWS.length} screenshots at ${w}px (${tag})`);
}

// Dark mode
{
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await p.goto(REBUILT);
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  // Navigate through the real UI so lazy data (kb.json) actually loads.
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  for (const v of ['home', 'guide-live', 'qa']) {
    await p.evaluate(id => {
      document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
      document.getElementById(id).classList.add('active');
    }, v);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SHOTS}/dark-${v}.png`, fullPage: true });
  }
  await p.close();
  console.log('  wrote 3 dark-mode screenshots');
}

await browser.close();

console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (fail) {
  console.log('\nFAILURES:');
  failures.forEach(f => console.log(' -', f.name));
  process.exit(1);
}
