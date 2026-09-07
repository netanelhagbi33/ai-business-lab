/* ============================================================
   Remove every promised timeframe for the Success Manager's
   first contact. "within 24-72 hours" and "within the next few
   days" become "soon" — a window the business does not control
   should not be published as a commitment.

   Conservative by construction:

     - No whitespace tidying, no reformatting. A first attempt
       collapsed the indentation of index.html and touched 11
       unrelated articles, because a global tidy ran over any
       string in which a single rule had matched.
     - A field changes only where a rule rewrote a sentence.
     - Two duration mentions are NOT contact promises, and the
       script refuses to write if either is lost: the Daily
       Boost's 24-hour cycle, and the money-back guarantee's
       60 days / three calls, which are conditions the customer
       must meet rather than promises made to them.

   Run:  node scripts/retime-success-manager.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');

/**
 * Ordered, longest first. Each rewrites one contact-timing phrase and
 * nothing else — there is no cleanup pass afterwards.
 */
const RULES = [
  [/ within the next few days, (?:normally|typically|usually) within 24[–—-]72 hours,/g, ' soon'],
  [/, (?:normally|typically|usually) within 24[–—-]72 hours after purchase,/g, ' soon'],
  [/ (?:normally|typically|usually) contact you within 24[–—-]72 hours after your (?:purchase or website setup is completed|website setup or purchase is completed)\./g,
   ' contact you soon.'],
  [/ (?:normally|typically|usually) contact you within 24[–—-]72 hours/g, ' contact you soon'],
  [/ (?:normally|typically|usually) assigned to contact you within 24[–—-]72 hours after your purchase\./g,
   ' assigned to contact you soon.'],
  [/The first contact is (?:normally|typically|usually) expected within 24[–—-]72 hours after purchase\./g,
   'The first contact happens soon.'],
  [/ to contact you within 24[–—-]72 hours after purchase to/g, ' to contact you soon to'],

  // Wrapped in markup, so the plain-text rules never see it.
  [/ within <strong>24[–—-]72 hours<\/strong>/g, ' soon'],

  [/ reach out to you within a few days/g, ' reach out to you soon'],
  [/ (?:typically|normally|usually) reach out within a few days after your purchase/g,
   ' reach out to you soon'],
  [/ contact you within the next few days/g, ' contact you soon'],
  [/ contact you in the next few days/g, ' contact you soon'],

  // The escalation trigger keeps its advice and loses its clock.
  [/If more than 72 hours have passed and you have not been contacted/g,
   'If you have not been contacted yet and would like an update'],

  // Bare leftovers of the same promise.
  [/ within 24[–—-]72 hours after (?:your )?purchase/g, ' soon'],
  [/ within 24[–—-]72 hours/g, ' soon'],
];

/** Duration mentions that are not a contact promise and must survive. */
const MUST_SURVIVE = [
  'every 24 hours',                              // Daily Boost cycle
  'Actively promoting the website for 60 days',  // guarantee condition
  'three free support calls',                    // guarantee condition
];

const retime = text => RULES.reduce((s, [re, to]) => s.replace(re, to), text);

let touched = 0;

/* --- knowledge base --------------------------------------- */
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
kb.forEach((item, i) => {
  const after = retime(item.answer);
  if (after === item.answer) return;
  touched++;
  console.log(`\n[${i}] (${item.category}) ${item.question}`);
  item.answer.split('\n').forEach((line, n) => {
    const now = after.split('\n')[n];
    if (now !== line) {
      console.log(`   -  ${line.trim()}`);
      console.log(`   +  ${now.trim()}`);
    }
  });
  item.answer = after;
});

/* --- markup ----------------------------------------------- */
let html = fs.readFileSync('index.html', 'utf8');
const htmlBefore = html;
html = retime(html)
  // This span existed only to state the window.
  .replace(/^[ \t]*<span>Usually soon\.<\/span>\r?\n/m, '')
  .replace(/^[ \t]*<span>Usually soon after purchase\.<\/span>\r?\n/m, '');

if (html !== htmlBefore) {
  const SUBJ = /Success Manager|first contact|24[–—-]72|few days|Usually/i;
  console.log('\n[index.html]  before:');
  htmlBefore.split('\n').forEach(l => { if (SUBJ.test(l)) console.log(`   -  ${l.trim()}`); });
  console.log('              after:');
  html.split('\n').forEach(l => { if (SUBJ.test(l)) console.log(`   +  ${l.trim()}`); });
}

/* --- guard rails ------------------------------------------ */
const all = JSON.stringify(kb) + html;
const leftovers = all.match(/24[–—-]72|within the next few days|within a few days|in the next few days/gi) || [];
const lost = MUST_SURVIVE.filter(p => !all.includes(p));

console.log(`\n${touched} articles rewritten (of ${kb.length}).`);
console.log('timeframe promises remaining:', leftovers.length ? leftovers : 'none');
console.log('non-promise durations intact:',
            lost.length ? `MISSING -> ${lost.join(' | ')}` : `${MUST_SURVIVE.length}/${MUST_SURVIVE.length}`);

if (leftovers.length || lost.length) {
  console.log('\nNot writing — fix the rules first.');
  process.exit(1);
}

if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  fs.writeFileSync('index.html', html);
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
