/* ============================================================
   Content invariants. No browser — reads data/ and index.html
   directly, so it is fast enough to run on every change.

   Run: node scripts/verify-content.mjs
   ============================================================ */
import fs from 'fs';

const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
const steps = JSON.parse(fs.readFileSync('data/steps.json', 'utf8'));
const cats = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));
const html = fs.readFileSync('index.html', 'utf8');
const everything = JSON.stringify(kb) + JSON.stringify(steps) + html;

let pass = 0, fail = 0;
const failures = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; failures.push(name); }
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}`);
  if (!ok) console.log(`        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`);
}

/* ============================================================
   No promised timeframe for the Success Manager's first contact.
   The business does not control when that call happens, so
   publishing a window creates a commitment and a ticket when it
   slips. "soon" is the agreed wording.
   ============================================================ */
console.log('=== NO CONTACT-TIME PROMISES');
{
  const promises = [
    /24\s*[–—-]\s*72/g,
    /within (?:the next |a )?few days/gi,
    /in the next few days/gi,
    /more than 72 hours have passed/gi,
  ];
  const found = promises.flatMap(re => everything.match(re) || []);
  check('no timeframe promise anywhere in content or markup', found, []);

  // A line may legitimately mention the Success Manager next to a duration —
  // the Daily Boost cycle and the guarantee's terms both do. Strip those
  // known non-promises first; any duration still left on a Success Manager
  // line is a contact deadline that has crept back in.
  const NON_PROMISE = [
    /Continue activating your Daily Boost every 24 hours/gi,
    /Actively promoting the website for 60 days/gi,
    /three free support calls/gi,
    /every 24 hours/gi,
  ];
  const managerLines = kb
    .flatMap(x => x.answer.split('\n'))
    .filter(l => /success manager/i.test(l))
    .map(l => NON_PROMISE.reduce((acc, re) => acc.replace(re, ''), l))
    .filter(l => /\b\d+\s*(hour|day|week)/i.test(l));
  check('no Success Manager line carries a contact deadline', managerLines, []);
}

/* ============================================================
   Durations that are NOT promises must survive. Removing these
   would change what customers are actually entitled to.
   ============================================================ */
console.log('\n=== NON-PROMISE DURATIONS KEPT');
{
  for (const phrase of [
    'every 24 hours',                             // Daily Boost cycle
    'Actively promoting the website for 60 days', // guarantee condition
    'three free support calls',                   // guarantee condition
  ]) {
    check(`kept: "${phrase}"`, everything.includes(phrase), true);
  }
}

/* ============================================================
   Structural invariants the app depends on.
   ============================================================ */
console.log('\n=== STRUCTURE');
{
  check('232 articles', kb.length, 232);
  check('every article has category, question and answer',
        kb.filter(x => !x.category || !x.question || !x.answer).length, 0);

  const catNames = cats.map(c => c.name).sort();
  const used = [...new Set(kb.map(x => x.category))].sort();
  check('every category in kb.json has a topic card', used, catNames);

  const withImages = [...steps.build, ...steps.live];
  check('every guide step has at least one screenshot',
        withImages.filter(s => !s.images || !s.images.length).length, 0);

  const files = new Set(fs.readdirSync('img'));
  const missing = withImages.flatMap(s => s.images).filter(f => !files.has(f));
  check('every referenced screenshot exists', missing, []);
}

/* ============================================================
   **bold** rendering. Tested here rather than in a browser
   because the ordering it depends on — escape first, emphasise
   second — is exactly the kind of thing that regresses quietly.
   ============================================================ */
console.log('\n=== RICH TEXT (**bold**)');
{
  const { richText } = await import('../js/dom.js');

  check('bold is rendered and the asterisks are gone',
        richText('Make sure to **Activate Your Daily Boost** today.'),
        'Make sure to <strong>Activate Your Daily Boost</strong> today.');

  check('several pairs on one line stay separate',
        richText('**One** then **Two**'),
        '<strong>One</strong> then <strong>Two</strong>');

  check('an unmatched ** is left alone rather than mangled',
        richText('5 ** 2 is not bold'), '5 ** 2 is not bold');

  check('emphasis does not run across a line break',
        richText('**start\nend**'), '**start\nend**');

  // The whole reason for the escape-then-emphasise order.
  check('HTML in an article is still inert',
        richText('<img src=x onerror=alert(1)> and <b>tags</b>'),
        '&lt;img src=x onerror=alert(1)&gt; and &lt;b&gt;tags&lt;/b&gt;');

  check('markup cannot be smuggled inside the emphasis',
        richText('**<script>alert(1)</script>**'),
        '<strong>&lt;script&gt;alert(1)&lt;/script&gt;</strong>');

  check('quotes and ampersands still escape',
        richText(`**A & B's "C"**`),
        '<strong>A &amp; B&#39;s &quot;C&quot;</strong>');

  // Every ** in the real content is a matched pair, so none should survive.
  const rendered = kb.map(x => richText(x.answer)).join('\n');
  check('no ** survives rendering of the real articles',
        (rendered.match(/\*\*/g) || []).length, 0);

  const bolded = kb.filter(x => richText(x.answer).includes('<strong>')).length;
  console.log(`      ${bolded} articles render bold text`);
  check('the articles that use bold still do', bolded, 7);
}

console.log('\n=== UNFILLED PLACEHOLDERS (reported, not enforced)');
{
  const placeholder = /\[insert[^\]]*\]/i;
  const hits = kb.filter(x => placeholder.test(x.answer));
  hits.forEach(x => console.log(`  INFO  [${x.category}] ${x.question}`));
  if (!hits.length) console.log('  none left');
  else console.log(`  ${hits.length} articles still show "[insert …]" to customers`);
}

console.log(`\n================ ${pass} passed, ${fail} failed ================`);
if (fail) { console.log('FAILURES:'); failures.forEach(f => console.log(' -', f)); process.exit(1); }
