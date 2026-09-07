/* Confirms (or refutes) the notSolved() escalation bug in the ORIGINAL file.
   Opens the untouched source, runs a search, and inspects what the browser
   actually parsed out of the generated onclick attribute. */
import { chromium } from 'playwright';

const SRC = 'file:///C:/Users/Netan/Downloads/index%20(28).html';

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));

await page.goto(SRC);
await page.click('.nav[data-view="qa"]');
await page.fill('#qSearch', 'how do payouts work');
await page.click('#qaSearchBtn');
await page.waitForSelector('#smartAnswer .answer-card');

const probe = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('#smartAnswer .answer-actions button')];
  const target = btns.find(b => /still need help/i.test(b.textContent));
  if (!target) return { found: false };
  return {
    found: true,
    text: target.textContent.trim(),
    onclickAttr: target.getAttribute('onclick'),
    // Every attribute the parser produced on this element:
    allAttributes: target.getAttributeNames().map(n => [n, target.getAttribute(n)]),
    hasHandler: typeof target.onclick === 'function',
  };
});

console.log('--- generated "No, I still need help" button');
console.log(JSON.stringify(probe, null, 2));

// Does clicking it actually escalate?
const before = await page.evaluate(() => localStorage.getItem('abl_help_failed'));
if (probe.found) {
  await page.click('#smartAnswer .answer-actions button:last-child').catch(() => {});
  await page.waitForTimeout(300);
}
const after = await page.evaluate(() => localStorage.getItem('abl_help_failed'));
const cards = await page.evaluate(() =>
  document.querySelectorAll('#smartAnswer .answer-card').length);

console.log('\n--- effect of clicking it');
console.log('abl_help_failed before :', before);
console.log('abl_help_failed after  :', after);
console.log('answer cards in #smartAnswer (2 = escalation rendered):', cards);
console.log('page errors:', errors.length ? errors : 'none');

const broken = before === after && cards === 1;
console.log('\nVERDICT:', broken
  ? 'CONFIRMED BROKEN — the button does nothing.'
  : 'NOT broken — the button worked.');

await browser.close();
