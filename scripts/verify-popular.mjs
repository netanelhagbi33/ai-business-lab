/* ============================================================
   Every "Popular:" chip must land on the article it promises.

   A chip runs a real search. If one returns nothing, the
   no-match card now offers a support ticket straight away —
   a popular-question chip that routes to a ticket is the exact
   opposite of what the Support Center is for.

   This checks each chip against the live app: results exist,
   and the best match is the intended article.
   ============================================================ */
import { chromium } from 'playwright';

const URL = 'http://localhost:8137/';

/** chip label -> the article its search must surface first */
const EXPECTED = {
  'I am new. What should I do first?':
    'I am new. What should I do first?',
  'What exactly did I buy?':
    'What exactly did I buy?',
  'How does traffic become revenue?':
    'How does traffic become revenue?',
  'How do withdrawals and payouts work?':
    'How do withdrawals and payouts work?',
  'What is the Free Traffic Boost?':
    'What is the Free Traffic Boost?',
  'When will my Success Manager contact me?':
    'When will my Success Manager contact me?',
  'How do I request a refund?':
    'How do I request a refund?',
  'How does the 200% refund work?':
    'Does the money-back guarantee provide a 100% or 200% refund?',
};

let pass = 0, fail = 0;
const failures = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`);
}

const browser = await chromium.launch({ channel: 'msedge' });
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(URL);
await p.evaluate(() => localStorage.clear());
await p.reload();
await p.click('.nav[data-view="qa"]');
await p.waitForSelector('.topic-card', { state: 'attached' });

const chips = await p.evaluate(() =>
  [...document.querySelectorAll('.popular-qs button')].map(b => b.dataset.q));

console.log(`=== ${chips.length} POPULAR CHIPS`);
check('the rendered chips are exactly the configured list', chips, Object.keys(EXPECTED));

for (const chip of chips) {
  await p.evaluate(() => {
    document.getElementById('qSearch').value = '';
    document.querySelector('[data-action="qa-home"]').click();
  });
  await p.waitForTimeout(150);
  await p.click(`.popular-qs button[data-q="${chip.replace(/"/g, '\\"')}"]`);
  await p.waitForTimeout(250);

  const result = await p.evaluate(() => {
    const card = document.querySelector('#smartAnswer .answer-card');
    return {
      best: card ? card.querySelector('h3').textContent.trim() : null,
      noMatch: !!(card && /NO CLOSE MATCH/.test(card.textContent)),
      offersTicket: !!document.querySelector('#smartAnswer [data-action="open-ticket"]'),
    };
  });

  check(`"${chip}"`, {
    best: result.best,
    noMatch: result.noMatch,
    offersTicket: result.offersTicket,
  }, {
    best: EXPECTED[chip],
    noMatch: false,
    offersTicket: false,
  });
}

// A chip must never be the shortest path to a support agent.
check('no chip left the user with a ticket button',
      await p.evaluate(() => localStorage.getItem('abl_help_no_results')), null);

await browser.close();
console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (fail) { console.log('FAILURES:'); failures.forEach(f => console.log(' -', f)); process.exit(1); }
