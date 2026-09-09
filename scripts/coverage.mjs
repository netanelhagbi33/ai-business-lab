/* ============================================================
   Coverage gap analysis.

   Feed it real customer tickets; it runs each one through the
   Support Center's ACTUAL search — same norm(), same synonym
   table, same scoring as js/qa.js — and reports whether a
   customer asking that would have found an answer.

   Usage:
     node scripts/coverage.mjs tickets.txt     (one ticket per line)
     node scripts/coverage.mjs tickets.json    ([] of strings, or
                                                [{subject|question|title}])

   Buckets:
     COVERED    strong match, the article is almost certainly the answer
     WEAK       something matched, but not convincingly — the customer
                may well have given up and opened a ticket anyway
     MISSING    no match at all. In the live app this now unlocks a
                support ticket immediately, so every MISSING is a
                guaranteed ticket.
   ============================================================ */
import fs from 'fs';
import path from 'path';

const KB = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
const CATS = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));

/* --- verbatim from js/qa.js ------------------------------- */
const SYNONYMS = {
  boost:    ['booster', 'traffic', 'visitors', '24 hour', '24h', 'accelerator'],
  earn:     ['earning', 'earnings', 'revenue', 'money', 'income', 'profit'],
  withdraw: ['withdrawal', 'payout', 'payment method', 'wallet', 'paypal', 'wise', 'bank'],
  site:     ['website', 'business', 'storefront', 'domain'],
  build:    ['launch', 'setup', 'create', 'onboarding'],
  refund:   ['cancel', 'money back', 'return'],
  support:  ['ticket', 'callback', 'call back', 'human', 'success manager'],
  article:  ['content', 'products', 'keywords', 'niche'],
  design:   ['colors', 'colours', 'color', 'colour', 'theme', 'template',
             'logo', 'font', 'layout', 'appearance', 'look', 'dark',
             'bright', 'style', 'branding'],
};

const norm = s => String(s || '').toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

function score(item, q) {
  const nq = norm(q);
  if (!nq) return 0;
  const qtxt = norm(item.question);
  const txt = norm(item.question + ' ' + item.category + ' ' + item.answer);
  const terms = nq.split(' ').filter(x => x.length > 1);
  let s = 0;
  terms.forEach(t => { if (txt.includes(t)) s += 2; if (qtxt.includes(t)) s += 5; });
  Object.entries(SYNONYMS).forEach(([k, arr]) => {
    if (nq.includes(k) || arr.some(a => nq.includes(a))) {
      if (txt.includes(k) || arr.some(a => txt.includes(a))) s += 6;
    }
  });
  if (qtxt.includes(nq)) s += 16;
  return s;
}

/**
 * A high raw score can come from a long ticket sharing common words with a
 * long answer, so normalise by how many of the ticket's own words the top
 * article actually covers.
 */
function classify(ticket) {
  const ranked = KB.map(x => ({ ...x, _s: score(x, ticket) }))
    .filter(x => x._s > 0).sort((a, b) => b._s - a._s);

  if (!ranked.length) return { bucket: 'MISSING', top: null, score: 0, overlap: 0 };

  const top = ranked[0];
  const terms = norm(ticket).split(' ').filter(w => w.length > 3);
  const topTxt = norm(top.question + ' ' + top.answer);
  const overlap = terms.length
    ? terms.filter(t => topTxt.includes(t)).length / terms.length
    : 0;

  // Question-title hits are what actually convince a customer.
  const titleHit = norm(top.question).includes(norm(ticket))
    || overlap >= 0.75;

  const bucket = (top._s >= 30 && overlap >= 0.5) || titleHit ? 'COVERED'
               : 'WEAK';
  return { bucket, top, score: top._s, overlap, runnerUp: ranked[1] || null };
}

/* --- input ------------------------------------------------ */
const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/coverage.mjs <tickets.txt|tickets.json>');
  process.exit(1);
}

let tickets;
const raw = fs.readFileSync(file, 'utf8');
if (path.extname(file) === '.json') {
  const parsed = JSON.parse(raw);
  tickets = parsed.map(t =>
    typeof t === 'string' ? t : (t.subject || t.question || t.title || t.message || ''));
} else {
  tickets = raw.split('\n');
}
tickets = tickets.map(t => t.trim()).filter(Boolean);

/* --- report ----------------------------------------------- */
const results = tickets.map(t => ({ ticket: t, ...classify(t) }));
const by = b => results.filter(r => r.bucket === b);

const pct = n => `${Math.round(n / results.length * 100)}%`;
console.log(`\n${results.length} tickets analysed against ${KB.length} articles\n`);
console.log(`  COVERED   ${String(by('COVERED').length).padStart(4)}  ${pct(by('COVERED').length).padStart(4)}   the Support Center answers this`);
console.log(`  WEAK      ${String(by('WEAK').length).padStart(4)}  ${pct(by('WEAK').length).padStart(4)}   something matched, but not convincingly`);
console.log(`  MISSING   ${String(by('MISSING').length).padStart(4)}  ${pct(by('MISSING').length).padStart(4)}   nothing matched — an immediate ticket`);

for (const bucket of ['MISSING', 'WEAK']) {
  const rows = by(bucket);
  if (!rows.length) continue;
  console.log(`\n${'='.repeat(64)}\n${bucket} (${rows.length})\n${'='.repeat(64)}`);
  rows.forEach(r => {
    console.log(`\n  "${r.ticket.slice(0, 110)}"`);
    if (r.top) {
      console.log(`      closest: [${r.score}, ${Math.round(r.overlap * 100)}% overlap] `
                + `[${r.top.category}] ${r.top.question.slice(0, 80)}`);
    } else {
      console.log('      closest: nothing at all');
    }
  });
}

/* Which topics the gaps cluster in — where to write new articles. */
const gapCats = {};
[...by('MISSING'), ...by('WEAK')].forEach(r => {
  const c = r.top ? r.top.category : '(no match)';
  gapCats[c] = (gapCats[c] || 0) + 1;
});
if (Object.keys(gapCats).length) {
  console.log(`\n${'='.repeat(64)}\nWHERE THE GAPS CLUSTER\n${'='.repeat(64)}`);
  Object.entries(gapCats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    const have = KB.filter(x => x.category === c).length;
    const icon = (CATS.find(x => x.name === c) || {}).icon || '  ';
    console.log(`  ${icon} ${c.padEnd(24)} ${String(n).padStart(3)} unanswered   (${have} articles today)`);
  });
}

console.log();
