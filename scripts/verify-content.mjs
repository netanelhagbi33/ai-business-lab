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
  // Back to 232: two personal replies were removed (a customer's phone
  // number and email; another opening "Dear Dean") and two guides added for
  // the questions the ticket data shows people ask most — where the
  // dashboard is, and how the guarantee and refunds work.
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
  // 11 after the voice rewrite. Bold marks the branch headings and the
  // named options in a list — "**Activate your Daily Boost**" — which is
  // what makes a multi-part answer scannable instead of a wall of text.
  check('the articles that use bold still do', bolded, 18);
}

/* ============================================================
   No personal data in customer-facing articles.

   Not a style rule. One article was a real customer's support
   ticket pasted verbatim into the public knowledge base — their
   phone number and email address included — and it ranked #1
   for "contact my representative".
   ============================================================ */
console.log('\n=== NO PERSONAL DATA');
{
  const text = JSON.stringify(kb);
  check('no phone numbers', text.match(/\b\d{3}[-.]\d{3}[-.]\d{4}\b/g) || [], []);
  check('no email addresses',
        (text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [])
          .filter(e => !/example|yoursite|aibusiness-lab/i.test(e)), []);
  check('no agent-template fields in customer text',
        text.match(/\[Your Name\]|\[Your Position\]|\[Customer Name\]/gi) || [], []);
}


/* ============================================================
   No article hijacks a topic search.

   An article that names every category matches every category
   search. "Where can I find the instructions or help section?"
   listed all ten and became the best match for "security",
   ahead of the actual security articles — a broad article
   outranking the specific ones is a search regression, not a
   content one.
   ============================================================ */

/* ============================================================
   No answer states one customer's own choices as fact.

   An article said "which is why only the cooking category was
   chosen" — cooking was that one customer's niche, so every
   other reader was told theirs was cooking too. Same class as
   the balances ("$9.87 in revenue") already removed: a
   conversation kept as an article.

   Questions are exempt. They are the customer's own words and
   are what makes search match their phrasing.
   ============================================================ */
console.log('\n=== NO ANSWER ASSUMES THE READER\'S CHOICES');
{
  const NICHES = /\b(cooking|fishing|outdoors|gardening|golf|yoga|coffee|knitting|camping|hiking)\b/i;
  const offenders = kb
    .filter(x => NICHES.test(x.answer))
    .map(x => `${x.question.slice(0, 50)} -> "${x.answer.match(NICHES)[0]}"`);
  check('no answer names a specific niche as the reader\'s', offenders, []);

  // The same shape, stated about the reader's account rather than in general.
  const asserts = kb
    .filter(x => /\b(your|the) (niche|category|plan) (was|is) (cooking|fishing|the [a-z]+ category)\b/i.test(x.answer))
    .map(x => x.question.slice(0, 60));
  check('no answer asserts what the reader selected', asserts, []);
}


/* ============================================================
   Every Start Here card must point at an article that exists.

   The cards name their target by exact question text. Rewording
   or removing an article silently breaks the card — the reader
   lands on the topic grid instead of the answer, with no error
   anywhere. This catches it in a second, without a browser.
   ============================================================ */
console.log('\n=== START HERE CARD TARGETS');
{
  const decode = s => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const targets = [...html.matchAll(/data-question="([^"]+)"/g)].map(m => decode(m[1]));

  check('cards point at articles', targets.length > 0, true);

  const missing = targets.filter(q => !kb.some(x => x.question === q));
  check('every card target exists in kb.json', missing, []);

  // A card promising an answer that is really a different topic is the
  // same failure, just slower to notice.
  const CARD_SECTION = {
    'Where is my dashboard?': 'Dashboard & Access',
    'How does the money-back guarantee work, and how do I request a refund?': 'Refunds',
    'What are the program details, packages, and pricing?': 'Getting Started',
    'How do I change the niche or product category of my website?': 'Website & Content',
    'Can I change the design after my website is live?': 'Website & Content',
    'Why can’t I log in to my dashboard?': 'Dashboard & Access',
    'How many websites are included in my purchase?': 'Website & Content',
  };
  const wrong = targets
    .filter(q => CARD_SECTION[q])
    .filter(q => kb.find(x => x.question === q).category !== CARD_SECTION[q]);
  check('each card lands in its expected section', wrong, []);

  console.log(`      ${targets.length} cards checked`);
}

console.log('\n=== NO SEARCH HIJACKING');
{
  const SYN = {
    boost: ['booster','traffic','visitors','24 hour','24h','accelerator'],
    earn: ['earning','earnings','revenue','money','income','profit'],
    withdraw: ['withdrawal','payout','payment method','wallet','paypal','wise','bank'],
    site: ['website','business','storefront','domain'],
    build: ['launch','setup','create','onboarding'],
    refund: ['cancel','money back','return'],
    support: ['ticket','callback','call back','human','success manager'],
    article: ['content','products','keywords','niche'],
  // Customers describe a look rather than name a setting — "too dark",
  // "green earthy", "logo swap". Without this group none of those reach
  // the design articles, which is why 114 tickets asked anyway.
  design:   ['colors','colours','color','colour','theme','template','logo','font','layout','appearance','look','dark','bright','style','branding'],
  };
  const norm = s => String(s || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const score = (it, q) => {
    const nq = norm(q); if (!nq) return 0;
    const qt = norm(it.question), t = norm(it.question + ' ' + it.category + ' ' + it.answer);
    let s = 0;
    nq.split(' ').filter(x => x.length > 1).forEach(x => {
      if (t.includes(x)) s += 2; if (qt.includes(x)) s += 5;
    });
    Object.entries(SYN).forEach(([k, a]) => {
      if (nq.includes(k) || a.some(v => nq.includes(v))) {
        if (t.includes(k) || a.some(v => t.includes(v))) s += 6;
      }
    });
    if (qt.includes(nq)) s += 16;
    return s;
  };

  const BROAD = 'Where can I find the instructions or help section?';
  const offenders = [];
  for (const q of ['billing','security','refund','earnings','traffic',
                   'niche','password','payout','boost','domain']) {
    const ranked = kb.map(x => ({ q: x.question, s: score(x, q) }))
      .filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    const pos = ranked.findIndex(x => x.q === BROAD);
    if (pos !== -1 && pos < 5) offenders.push(`"${q}" -> #${pos + 1}`);
  }
  check('the "where are the instructions" article tops no topic search',
        offenders, []);
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
