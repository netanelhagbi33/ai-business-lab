/* ============================================================
   The ticket-deflection funnel.

   A ticket must be reachable ONLY from inside an article, after
   two different articles have been marked unhelpful — or after
   a search that returned nothing. Refunds bypass everything.
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

async function fresh() {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto(URL);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  return p;
}

const ticketFormOpen = p => p.evaluate(() => !!document.querySelector('#modal.show #tMessage'));
const ticketButtons  = p => p.evaluate(() =>
  [...document.querySelectorAll('[data-action="open-ticket"]')]
    .filter(b => b.offsetParent !== null).length);

/* ============ 1. No entry points before earning one ============ */
console.log('=== A FRESH USER CANNOT REACH THE TICKET FORM');
{
  const p = await fresh();

  check('Support Tickets tab is hidden with no tickets',
        await p.evaluate(() => document.querySelector('.nav[data-view="support"]').hidden), true);

  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  check('no ticket button on the Support Center landing', await ticketButtons(p), 0);

  await p.click('.topic-card[data-category="Earnings & Payouts"]');
  await p.waitForTimeout(250);
  check('no ticket button in a topic listing', await ticketButtons(p), 0);

  // The old build unlocked instantly for anyone who had never searched:
  //   const unlocked = failedAnswers >= 2 || !q;
  check('no ticket form reachable at all yet', await ticketFormOpen(p), false);
  await p.close();
}

/* ============ 2. One unhelpful article is not enough ============ */
console.log('\n=== ONE UNHELPFUL ARTICLE IS NOT ENOUGH');
{
  const p = await fresh();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.click('.topic-card[data-category="Earnings & Payouts"]');
  await p.waitForTimeout(250);

  await p.click('#results .qa:nth-child(1) .q');
  await p.waitForTimeout(200);
  check('an opened article asks whether it helped',
        await p.evaluate(() => !!document.querySelector('#results .qa.open .article-feedback')), true);

  await p.click('#results .qa.open [data-action="article-no"]');
  await p.waitForTimeout(250);
  check('after 1 "No" there is still no ticket button', await ticketButtons(p), 0);
  check('the user is told to try one more',
        await p.evaluate(() =>
          /one more/i.test(document.querySelector('.article-outcome-box').textContent)), true);
  // Publishing "one more and you get a ticket" turns the gate into a
  // two-click formality.
  check('but the unlock rule is not spelled out',
        await p.evaluate(() =>
          /will be able to open|two articles|open a support ticket/i
            .test(document.querySelector('.article-outcome-box').textContent)), false);
  check('one attempt recorded',
        await p.evaluate(() => JSON.parse(localStorage.getItem('abl_help_unhelpful')).length), 1);

  // Re-opening an article you already rejected shows what you said rather
  // than asking again — so the same article can never be counted twice.
  await p.click('#results .qa:nth-child(1) .q');   // close
  await p.click('#results .qa:nth-child(1) .q');   // reopen
  await p.waitForTimeout(200);
  check('a rejected article re-opens in its answered state',
        await p.evaluate(() => {
          const fb = document.querySelector('#results .qa.open .article-feedback');
          return {
            asksAgain: !fb.querySelector('.article-feedback-actions').hidden,
            label: fb.querySelector('.article-feedback-q').textContent,
          };
        }),
        { asksAgain: false, label: 'You said this did not solve it.' });

  // The same must hold after a fresh render, not just in the same DOM node.
  await p.click('[data-action="qa-home"]');
  await p.waitForTimeout(200);
  await p.click('.topic-card[data-category="Earnings & Payouts"]');
  await p.waitForTimeout(250);
  await p.click('#results .qa:nth-child(1) .q');
  await p.waitForTimeout(200);
  check('and still after the list is re-rendered',
        await p.evaluate(() =>
          document.querySelector('#results .qa.open .article-feedback-actions').hidden), true);
  check('one attempt still recorded',
        await p.evaluate(() => JSON.parse(localStorage.getItem('abl_help_unhelpful')).length), 1);
  check('still no ticket button', await ticketButtons(p), 0);
  await p.close();
}

/* ============ 3. Two different articles unlock it ============ */
console.log('\n=== TWO DIFFERENT UNHELPFUL ARTICLES UNLOCK THE TICKET');
{
  const p = await fresh();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.click('.topic-card[data-category="Earnings & Payouts"]');
  await p.waitForTimeout(250);

  for (const n of [1, 2]) {
    await p.click(`#results .qa:nth-child(${n}) .q`);
    await p.waitForTimeout(200);
    await p.click(`#results .qa:nth-child(${n}) [data-action="article-no"]`);
    await p.waitForTimeout(250);
  }

  check('two attempts recorded',
        await p.evaluate(() => JSON.parse(localStorage.getItem('abl_help_unhelpful')).length), 2);
  check('the ticket button now appears inside the article', await ticketButtons(p), 1);

  await p.click('[data-action="open-ticket"]');
  await p.waitForSelector('#modal.show #tMessage');
  check('the form opens', await ticketFormOpen(p), true);

  const prefill = await p.evaluate(() => document.getElementById('tMessage').value);
  check('the form is prefilled with what was already tried',
        /did not solve it/i.test(prefill) && prefill.split('•').length === 3, true);
  await p.close();
}

/* ============ 4. "Yes" ends the flow ============ */
console.log('\n=== SAYING AN ARTICLE HELPED');
{
  const p = await fresh();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.click('.topic-card[data-category="Support"]');
  await p.waitForTimeout(250);
  await p.click('#results .qa:nth-child(1) .q');
  await p.waitForTimeout(200);
  await p.click('#results .qa.open [data-action="article-yes"]');
  await p.waitForTimeout(250);

  check('a confirmation replaces the buttons',
        await p.evaluate(() =>
          !!document.querySelector('.article-outcome-box.solved')), true);
  check('"Yes" records no failed attempt',
        await p.evaluate(() => localStorage.getItem('abl_help_unhelpful')), null);
  check('no ticket button', await ticketButtons(p), 0);
  await p.close();
}

/* ============ 5. Zero results unlocks immediately ============ */
console.log('\n=== A SEARCH WITH NO RESULTS');
{
  const p = await fresh();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.fill('#qSearch', 'zzzqqxx wvvbbn');
  await p.click('[data-action="qa-search"]');
  await p.waitForTimeout(300);

  check('the no-match card offers a ticket straight away', await ticketButtons(p), 1);
  check('no-results flag stored',
        await p.evaluate(() => localStorage.getItem('abl_help_no_results')), '1');

  await p.click('[data-action="open-ticket"]');
  await p.waitForSelector('#modal.show #tMessage');
  check('prefill says the Support Center had nothing',
        await p.evaluate(() => /returned no matching/i.test(document.getElementById('tMessage').value)),
        true);
  await p.close();
}

/* ============ 6. Submitting resets the gate ============ */
console.log('\n=== AFTER SUBMITTING A TICKET');
{
  const p = await fresh();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.fill('#qSearch', 'zzzqqxx wvvbbn');
  await p.click('[data-action="qa-search"]');
  await p.waitForTimeout(300);
  await p.click('[data-action="open-ticket"]');
  await p.waitForSelector('#modal.show #tMessage');
  await p.fill('#tMessage', 'My payout is stuck and nothing explains it.');
  await p.click('#modal [data-action="submit-ticket"]');
  await p.waitForTimeout(400);

  check('the Support Tickets tab appears',
        await p.evaluate(() => document.querySelector('.nav[data-view="support"]').hidden), false);
  check('it shows the open-ticket count',
        await p.evaluate(() => {
          const b = document.querySelector('.nav[data-view="support"] .navplus');
          return b.hidden ? null : b.textContent;
        }), '1');
  check('the ticket view is showing',
        await p.evaluate(() => document.getElementById('support').classList.contains('active')), true);
  check('the ticket is listed',
        await p.evaluate(() => document.querySelectorAll('#tickets .ticket').length), 1);

  check('the gate is reset for the next ticket',
        await p.evaluate(() => [
          localStorage.getItem('abl_help_unhelpful'),
          localStorage.getItem('abl_help_no_results'),
        ]), ['[]', '0']);

  check('no ticket button anywhere in the tickets view', await ticketButtons(p), 0);

  // And it stays visible after a reload.
  await p.reload();
  await p.waitForSelector('#buildNav .journey-step', { state: 'attached' });
  check('the tab survives a reload',
        await p.evaluate(() => document.querySelector('.nav[data-view="support"]').hidden), false);
  await p.close();
}

/* ============ 7. Refunds bypass the gate ============ */
console.log('\n=== REFUND REQUESTS BYPASS THE FUNNEL');
{
  const p = await fresh();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.click('#qa [data-action="open-refund"]');
  await p.waitForSelector('#modal.show #tMessage');
  check('a refund form opens with no attempts made', await ticketFormOpen(p), true);
  check('it is a refund, not a support ticket',
        await p.evaluate(() => document.querySelector('.ticket-modal h2').textContent), 'Refund Request');
  await p.close();
}

/* ============ 8. Legacy users keep their unlocked state ============ */
console.log('\n=== USERS ALREADY PAST THE OLD GATE');
{
  const p = await fresh();
  await p.evaluate(() => localStorage.setItem('abl_help_failed', '2'));
  await p.reload();
  await p.click('.nav[data-view="qa"]');
  await p.waitForSelector('.topic-card', { state: 'attached' });
  await p.click('.topic-card[data-category="Refunds"]');
  await p.waitForTimeout(250);
  await p.click('#results .qa:nth-child(1) .q');
  await p.waitForTimeout(200);
  await p.click('#results .qa.open [data-action="article-no"]');
  await p.waitForTimeout(250);
  check('an already-unlocked user is not sent back through the funnel',
        await ticketButtons(p), 1);
  await p.close();
}

await browser.close();
console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (fail) { console.log('FAILURES:'); failures.forEach(f => console.log(' -', f)); process.exit(1); }
