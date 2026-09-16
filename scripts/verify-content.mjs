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
    /promot(?:ing|ed) the website for 90 days/gi,
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
  // Matched loosely on purpose. What has to survive is the condition, not one
  // phrasing of it. An exact string here failed the first time the sentence
  // was reworded from "Actively promoting…" to "You actively promoted…" on
  // its way into a bullet — a correction, reported as a regression.
  for (const [name, re] of [
    ['the Daily Boost cycle',       /every 24 hours/i],
    ['the 90-day promotion period', /promot(?:ing|ed) the website for 90 days/i],
    ['the three support calls',     /three free support calls/i],
    ['the Boost activation rule',   /24-hour Boost must have been activated at least once/i],
  ]) {
    check(`kept: ${name}`, re.test(everything), true);
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
  // A floor, not an exact count. What this guards against is bold being
  // stripped by a later pass — the run that collapsed whitespace across the
  // knowledge base took the emphasis with it. Content work legitimately adds
  // bold, and an exact number failed twice in a row for that reason alone.
  // 11 after the voice rewrite, 18 after the Start Here guides, 50 once the
  // support and refund routes were bolded wherever they are named.
  check('bold survives in the articles that use it', bolded >= 50, true);
}

/* ============================================================
   No personal data in customer-facing articles.

   Not a style rule. One article was a real customer's support
   ticket pasted verbatim into the public knowledge base — their
   phone number and email address included — and it ranked #1
   for "contact my representative".
   ============================================================ */

console.log('\n=== ARTICLE STRUCTURE');
{
  const { renderArticle } = await import('../js/dom.js');

  check('a bold-only line becomes a heading',
        renderArticle('**Before you start**\nDo this first.'),
        '<h4 class="answer-h">Before you start</h4><p>Do this first.</p>');

  // 187 articles use a lone newline where they mean a new paragraph.
  check('a lone newline separates paragraphs, it is not a <br>',
        renderArticle('First point.\nSecond point.'),
        '<p>First point.</p><p>Second point.</p>');

  check('bullets become a list',
        renderArticle('- One\n- Two'),
        '<ul class="answer-list"><li>One</li><li>Two</li></ul>');

  // 18 blocks introduce a list with a lead line and no blank line after it.
  // Each bullet used to come out as its own paragraph with a dash in front.
  check('a lead line before bullets still gets a list',
        renderArticle('They can help you:\n- One\n- Two'),
        '<p>They can help you:</p>'
        + '<ul class="answer-list"><li>One</li><li>Two</li></ul>');

  check('text after a list closes it rather than joining it',
        renderArticle('- One\n- Two\nThat is all.'),
        '<ul class="answer-list"><li>One</li><li>Two</li></ul><p>That is all.</p>');

  check('a numbered item keeps its continuation line',
        renderArticle('1. Pick a niche\nThis decides the content.'),
        '<ol class="answer-list"><li>Pick a niche<span class="answer-cont"></span>'
        + 'This decides the content.</li></ol>');

  // Blank lines between numbered items split them into separate blocks;
  // without start= every block restarted at 1.
  check('a list split by a blank line keeps counting',
        renderArticle('1. First\n\n2. Second').includes('start="2"'), true);

  check('empty input renders nothing', renderArticle(''), '');

  // Structure must not become a way in for markup.
  check('HTML in an article is still inert',
        renderArticle('<img src=x onerror=alert(1)>'),
        '<p>&lt;img src=x onerror=alert(1)&gt;</p>');
  check('markup cannot ride in on a heading',
        renderArticle('**<script>alert(1)</script>**'),
        '<h4 class="answer-h">&lt;script&gt;alert(1)&lt;/script&gt;</h4>');
  check('nor on a list item',
        renderArticle('- <b>x</b>'),
        '<ul class="answer-list"><li>&lt;b&gt;x&lt;/b&gt;</li></ul>');

  // Nothing in the real corpus should render as an empty block.
  const empties = kb.filter(x => !renderArticle(x.answer).trim());
  check('every article renders to something', empties.length, 0);

  const stray = kb.filter(x => /\*\*/.test(renderArticle(x.answer)));
  check('no ** survives rendering', stray.length, 0);

  const counts = kb.reduce((m, x) => {
    const h = renderArticle(x.answer);
    m.h += (h.match(/<h4/g) || []).length;
    m.ol += (h.match(/<ol/g) || []).length;
    m.ul += (h.match(/<ul/g) || []).length;
    return m;
  }, { h: 0, ol: 0, ul: 0 });
  console.log(`      across the corpus: ${counts.h} headings, ${counts.ol} numbered lists, ${counts.ul} bullet lists`);
}

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
   Start Here cards.

   The seven topic cards used to name a knowledge-base article by
   its exact question text, which meant rewording that article
   silently broke the card. They now open a guide of their own,
   and the check that they point at something real lives with the
   guides above.

   What is left to guard is the old wiring not creeping back: a
   card carrying data-question would be pointing at an article
   again, and open-article is no longer registered by anything.
   ============================================================ */
console.log('\n=== START HERE CARD TARGETS');
{
  const byQuestion = [...html.matchAll(/data-question="([^"]+)"/g)].map(m => m[1]);
  check('no card points at an article by its title', byQuestion, []);
  check('the retired open-article action is gone from the markup',
        /data-action="open-article"/.test(html), false);

  const cards = [...html.matchAll(/data-guide="([^"]+)"/g)].map(m => m[1]);
  check('seven topic cards', cards.length, 7);
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

/* ============================================================
   No article teaches the route we replaced.

   Support runs one way now: the Support Center, the article, and
   only once the answers have run out does a ticket appear. 45 of
   the 232 articles still told customers to open a "Support tab in
   the left-side menu", offered "the AI Assistant, Support, or a
   Support Ticket" as three channels to pick between, or simply
   said to open a ticket. An article that sends someone to a tab
   that does not exist is worse than no article.

   Two articles keep "left-side menu" on purpose: they name the
   product's real Boosters and Billing entries, which are not ours
   and have not moved.
   ============================================================ */
console.log('\n=== NO ARTICLE TEACHES THE OLD SUPPORT ROUTE');
{
  const KEEP = ['Why is the Boosters section missing from my dashboard?',
                'Where can I see what I purchased?'];
  const OLD = [
    [/\bSupport tab\b/i,                              'names a "Support tab"'],
    // "open Support Tickets" and "open the Support Center" are the new
    // destinations, so they are excluded rather than matched.
    [/\bOpen(?:ing)? Support(?! Tickets| Center)\b/i, 'says "open Support"'],
    [/\bopen(?:ing)? a Support Ticket\b/i,            'tells the reader to open a ticket'],
    [/\bcreate a new ticket\b/i,                      'tells the reader to create a ticket'],
    [/\bAI Assistant, Support\b/i,                    'offers the old channel list'],
    [/\bthrough Support\b/i,                          'says "through Support"'],
    [/\bcontact Support\b/i,                          'says "contact Support"'],
    [/\bsupport chat bubble\b/i,                      'points at the chat bubble'],
  ];
  const offenders = [];
  for (const a of kb) {
    if (KEEP.includes(a.question)) continue;
    for (const [re, why] of OLD) {
      if (re.test(a.answer)) offenders.push(`[${a.category}] ${a.question.slice(0, 44)} — ${why}`);
    }
  }
  check('no article sends customers down the replaced route', offenders, []);

  // The threshold stays unpublished. An article that states it turns the
  // gate into two deliberate clicks.
  const published = kb.filter(a => /\b(two|2) articles\b/i.test(a.answer))
                      .map(a => a.question.slice(0, 44));
  check('no article publishes how many attempts unlock a ticket', published, []);

  // The refund bypass has exactly one entry point, so an article that names
  // the button has to say where it is. Matched case-sensitively: "Request a
  // Refund" is the button, "request a refund" is just the English for it.
  const wrongPlace = kb
    .filter(a => a.answer.includes('Request a Refund'))
    .filter(a => !a.answer.includes('Looking for a refund?'))
    .map(a => a.question.slice(0, 44));
  check('every article naming the Request a Refund button says where it is',
        wrongPlace, []);
}

/* ============================================================
   An article that asks for details says where they go.

   "Please provide: the email address used for the purchase, the
   name of the product…" and then nothing — no destination. That is
   a support agent's half of a conversation kept as an article, and
   28 of them were in here. Worse, several promised "we will submit
   the request for you", which stopped being true when refunds moved
   to the Request a Refund button.
   ============================================================ */
console.log('\n=== A REQUEST FOR DETAILS NAMES ITS DESTINATION');
{
  const ASK = /please provide|provide the following|provide us with|provide the Support Team with/i;
  const DEST = /Support Center|Support Tickets|Support Team|Request a Refund/;
  const orphan = kb.filter(a => ASK.test(a.answer) && !DEST.test(a.answer))
                   .map(a => `[${a.category}] ${a.question.slice(0, 40)}`);
  check('no article asks for details with nowhere to send them', orphan, []);

  // A Refunds article is either about getting a refund, which means the
  // button, or about following one already sent, which means the tab.
  const noRoute = kb
    .filter(a => a.category === 'Refunds')
    .filter(a => !/Request a Refund/.test(a.answer) && !/Support Tickets/.test(a.answer))
    .map(a => a.question.slice(0, 46));
  check('every Refunds article names a destination', noRoute, []);

  const filedForYou = kb
    .filter(a => /we will submit the request for you|start the process right away/i.test(a.answer))
    .map(a => a.question.slice(0, 46));
  check('no article claims somebody else files the request', filedForYou, []);

  // An answer wrapped end to end in straight quotes is a pasted agent reply.
  // One of them told the reader their refund request had been received when
  // nothing had been sent.
  const pasted = kb.filter(a => /^"[\s\S]*"$/.test(a.answer.trim()))
                   .map(a => a.question.slice(0, 46));
  check('no answer is a pasted agent reply', pasted, []);

  // Both timed rules are 90 days: the window for asking for a refund, and the
  // 200% guarantee's promotion condition. The knowledge base said 60 in
  // seventeen places. That is a number customers plan around — someone on day
  // 75 would have read that they had already missed it.
  const stale = kb
    .filter(a => /\b60[\s-]days?\b/.test(a.answer))
    .map(a => `[${a.category}] ${a.question.slice(0, 36)}`);
  check('no 60-day rule left anywhere', stale, []);
  check('articles state the 90-day window',
        kb.filter(a => /\b90[\s-]days?\b/.test(a.answer)).length >= 10, true);

  // Security wording that must not be softened away by a later pass.
  check('no article asks a customer to send a password',
        kb.filter(a => /send us the new password/i.test(a.answer)).length, 0);
  for (const warning of ['Do not send us your password',
                         'Never send us your full card number']) {
    check(`kept the warning: "${warning}"`,
          kb.some(a => a.answer.includes(warning)), true);
  }
}

/* ============================================================
   A list is written as a list.

   67 blocks introduced a list with a colon and then wrote the
   items as bare lines. renderArticle gives each line its own <p>,
   so a four-point checklist read as four unrelated sentences and
   nothing showed that they belonged together — or that there were
   four of them.

   The renderer cannot infer this: a bare line after a colon is
   genuinely either a list item or the paragraph the colon
   introduces. The source has to say which.
   ============================================================ */
console.log('\n=== LISTS ARE WRITTEN AS LISTS');
{
  // Matches scripts/fix-lists.mjs. A run of these after a colon is a list
  // that lost its markers.
  const RESUMES = /^(If|Once|After|When|Please note|You can also|We will|We can|There (is|are)|As a result|The Support Team)\b/;
  const isItem = l =>
    l.length <= 130 && !/^[-•*]\s|^\d+[.)]\s/.test(l) && !l.endsWith(':')
    && !/[.!?]\s+\S/.test(l) && !RESUMES.test(l);

  const unmarked = [];
  for (const a of kb) {
    for (const block of a.answer.split(/\n\s*\n/)) {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length - 2; i++) {
        if (!lines[i].endsWith(':')) continue;
        let k = i + 1, n = 0;
        while (k < lines.length && isItem(lines[k])) { n++; k++; }
        if (n >= 3) unmarked.push(`[${a.category}] ${a.question.slice(0, 40)}`);
      }
    }
  }
  check('no colon is followed by an unmarked list', unmarked, []);

  // "…shown on the website dashboard; or" — an item that stops mid-sentence
  // reads as unfinished, which is how this was spotted.
  const dangling = [];
  for (const a of kb) {
    for (const l of a.answer.split('\n').map(s => s.trim())) {
      if (/^[-•*]\s/.test(l) && /\b(or|and)$/.test(l)) {
        dangling.push(`[${a.category}] ${a.question.slice(0, 36)}`);
      }
    }
  }
  check('no list item ends on a dangling "or" or "and"', dangling, []);

  // Two answers opened mid-word — "ou can open the withdrawal section…".
  const lowerStart = kb.filter(a => /^[a-z]/.test(a.answer.trim()))
                       .map(a => `[${a.category}] ${a.question.slice(0, 40)}`);
  check('no answer opens with a lowercase letter', lowerStart, []);

  const lists = kb.reduce((n, a) =>
    n + a.answer.split('\n').filter(l => /^\s*(-|\d+\.)\s/.test(l)).length, 0);
  console.log(`      ${lists} list items across the knowledge base`);
}

/* ============================================================
   The Success Manager is a role, and reads as one.

   The customer is told to expect one, to wait for their call, and
   to take some requests to them rather than to Support. Two plain
   words in the middle of a sentence do not carry that.

   Article titles are excluded: they render through esc(), not
   richText, so asterisks there would appear on screen as
   asterisks.
   ============================================================ */
console.log('\n=== SUCCESS MANAGER READS AS A ROLE');
{
  const PHRASE = /\bSuccess Managers?\b/;
  const unbolded = [];
  for (const a of kb) {
    for (const l of a.answer.split('\n')) {
      // Strip the bold spans; anything left is an occurrence in plain text.
      if (PHRASE.test(l.replace(/\*\*[^*\n]+\*\*/g, ''))) {
        unbolded.push(`[${a.category}] ${a.question.slice(0, 38)}`);
      }
    }
  }
  check('every mention in an answer is emphasised', unbolded, []);

  // Markers come in pairs. A line with two bold spans is four of them and is
  // fine; an odd count means an opener lost its closer.
  const odd = [];
  for (const a of kb) {
    for (const l of a.answer.split('\n')) {
      if (((l.match(/\*\*/g) || []).length) % 2 !== 0) {
        odd.push(`[${a.category}] ${a.question.slice(0, 38)}`);
      }
    }
  }
  check('every line closes the emphasis it opens', odd, []);

  check('the markup carries it too',
        /<strong>Success Manager<\/strong>/.test(html), true);
}

/* ============================================================
   The Start Here guides.

   Seven cards open one of these instead of a Support Center
   article. They are kept out of kb.json on purpose: a guide that
   covers a whole topic matches every search about that topic and
   would outrank the specific article the search was looking for.

   They are customer-facing text, so every rule the knowledge base
   is held to applies to them as well.
   ============================================================ */
console.log('\n=== START HERE GUIDES');
{
  const guides = JSON.parse(fs.readFileSync('data/guides.json', 'utf8'));
  const { renderArticle } = await import('../js/dom.js');
  const all = JSON.stringify(guides);

  check('seven guides', guides.length, 7);
  check('every id is distinct', new Set(guides.map(g => g.id)).size, guides.length);
  check('none is missing a field',
        guides.filter(g => !(g.id && g.icon && g.title && g.blurb && g.body)).length, 0);

  // A card that names a guide which is not there leaves the reader nowhere.
  const wanted = [...html.matchAll(/data-guide="([^"]+)"/g)].map(m => m[1]);
  check('every card points at a guide that exists',
        wanted.filter(id => !guides.some(g => g.id === id)), []);
  check('every guide is reachable from a card',
        guides.filter(g => !wanted.includes(g.id)).map(g => g.id), []);

  // They are kept out of the knowledge base, which is what stops them
  // outranking the articles they were written from.
  check('no guide has been copied into the knowledge base',
        guides.filter(g => kb.some(a => a.answer === g.body)).map(g => g.id), []);

  const rendered = guides.map(g => renderArticle(g.body)).join('');
  check('no ** survives rendering', (rendered.match(/\*\*/g) || []).length, 0);
  check('no bullet is left as a paragraph', /<p>[-•*] /.test(rendered), false);
  check('every emphasis marker is paired',
        guides.filter(g => ((g.body.match(/\*\*/g) || []).length) % 2 !== 0).map(g => g.id), []);

  // The same content rules as the knowledge base.
  check('no stale 60-day rule', /\b60[\s-]days?\b/.test(all), false);
  check('the ticket threshold stays unpublished', /\b(two|2) articles\b/i.test(all), false);
  check('no guide tells the reader to open a ticket',
        /\bopen a (support )?ticket\b/i.test(all), false);
  check('no contact-time promise', /24\s*[–—-]\s*72/.test(all), false);
  check('no personal data',
        /@(gmail|yahoo)\.com|\b\d{3}-\d{3}-\d{4}\b/.test(all), false);
  check('Success Manager is emphasised throughout',
        guides.filter(g => /\bSuccess Managers?\b/.test(g.body.replace(/\*\*[^*\n]+\*\*/g, '')))
              .map(g => g.id), []);

  // Each guide names the articles it was written from, so a source that is
  // renamed or removed shows up here rather than rotting quietly.
  const orphan = guides.flatMap(g =>
    (g.sources || []).filter(s => !kb.some(a => a.question === s)).map(s => `${g.id}: ${s}`));
  check('every named source article still exists', orphan, []);
}

/* ============================================================
   The 200% guarantee states every condition it depends on.
   ============================================================ */
console.log('\n=== THE 200% GUARANTEE');
{
  const g200 = kb.filter(a => /200%/.test(a.answer) && /eligibility requirements/i.test(a.answer));
  check('three articles describe it', g200.length, 3);
  check('every one states the Boost requirement',
        g200.filter(a => /free 24-hour Boost must have been activated at least once/.test(a.answer)).length,
        g200.length);
  check('every one states the 90-day promotion condition',
        g200.filter(a => /promoted the website for 90 days/.test(a.answer)).length, g200.length);
  check('every one states the three support calls',
        g200.filter(a => /three free support calls/.test(a.answer)).length, g200.length);
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
