/* ============================================================
   "Success Manager" in bold, everywhere it is read.

   It is a role, and the customer is told to expect one, to wait
   for their call, and to take some requests to them rather than
   to Support. It should read as a name, not as two ordinary
   words in a sentence.

   97 occurrences in the knowledge base, 8 in the markup. Four
   places are deliberately left alone:

   · Article titles. They are rendered with esc(), not richText,
     so asterisks there would appear on screen as asterisks. One
     of them also writes it lowercase — "What time can I expect my
     success manager to contact me?" — which is worth fixing but
     is a retitle, not a formatting change, so it is reported here
     rather than done quietly.

   · Text already inside a **bold** span. Nesting produces
     "**Through your **Success Manager**...**", which the emphasis
     pattern cannot parse and which would leave stray asterisks in
     front of a customer.

   · Headings and the <b>/<strong>/eyebrow labels in the markup.
     They are already emphasised; bolding inside them changes
     nothing or breaks the look.

   Run: node scripts/bold-success-manager.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
let html = fs.readFileSync('index.html', 'utf8');

const PHRASE = /\bSuccess Managers?\b/g;

/**
 * Bold the phrase in one line, skipping anything already inside a **span**.
 *
 * The line is walked in alternating segments — outside a bold span, inside
 * one — and only the outside segments are touched.
 */
function boldOutsideExistingSpans(line) {
  const parts = line.split(/(\*\*[^*\n]+\*\*)/g);
  return parts
    .map(part => part.startsWith('**') ? part : part.replace(PHRASE, '**$&**'))
    .join('');
}

/* ---------- the knowledge base ---------------------------- */
let bolded = 0, skippedNested = 0, articles = 0;

for (const a of kb) {
  const before = a.answer;
  const lines = before.split('\n').map(line => {
    for (const m of line.matchAll(/\*\*([^*\n]+)\*\*/g)) {
      if (PHRASE.test(m[1])) skippedNested++;
      PHRASE.lastIndex = 0;
    }
    return boldOutsideExistingSpans(line);
  });
  const after = lines.join('\n');
  if (after === before) continue;
  bolded += (after.match(/\*\*Success Managers?\*\*/g) || []).length
          - (before.match(/\*\*Success Managers?\*\*/g) || []).length;
  a.answer = after;
  articles++;
}

console.log('KNOWLEDGE BASE');
console.log(`  ${bolded} occurrences bolded across ${articles} articles`);
console.log(`  ${skippedNested} left alone — already inside a bold span`);

/* ---------- the markup ------------------------------------ */
/* Explicit, one at a time. A regex over HTML would have to understand which
   tag it is inside, and there are only four. */
const MARKUP = [
  ['A Success Manager will contact you soon',
   'A <strong>Success Manager</strong> will contact you soon'],
  ['a Success Manager is assigned to help you understand',
   'a <strong>Success Manager</strong> is assigned to help you understand'],
  ['<p>Your Success Manager can explain the website',
   '<p>Your <strong>Success Manager</strong> can explain the website'],
  ['Your Success Manager helps you understand the business',
   'Your <strong>Success Manager</strong> helps you understand the business'],
];

console.log('\nMARKUP');
let problems = 0;
for (const [from, to] of MARKUP) {
  const n = html.split(from).length - 1;
  if (n !== 1) { console.log(`  MISS  "${from.slice(0, 52)}" appears ${n} times`); problems++; continue; }
  html = html.replace(from, to);
  console.log(`  ok  ${from.slice(0, 62)}`);
}
console.log('  left alone: the <h3>, the <b> label, the eyebrow, the <strong> line');

/* ---------- what is deliberately not done ----------------- */
const lowerTitles = kb.filter(a => /success manager/.test(a.question)).map(a => a.question);
if (lowerTitles.length) {
  console.log('\nREPORTED, NOT CHANGED');
  lowerTitles.forEach(q => console.log(`  lowercase in an article title: "${q}"`));
}

/* ---------- guard rails ----------------------------------- */
let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
console.log('\nchecks:');
if (problems) { console.log('  markup replacements did not all apply'); clean = false; }

const everything = JSON.stringify(kb) + html;
chk(!/\*\*\*/.test(everything), 'no run of three or more asterisks');
// Markers come in pairs. Counting them per line catches an opener left
// without its closer; a line with two separate bold spans is four markers
// and perfectly fine, which an earlier version of this check called a fault.
const odd = [];
for (const a of kb) {
  for (const l of a.answer.split('\n')) {
    if (((l.match(/\*\*/g) || []).length) % 2 !== 0) {
      odd.push(`[${a.question.slice(0, 40)}] ${l.trim().slice(0, 56)}`);
    }
  }
}
chk(odd.length === 0, 'every line closes the emphasis it opens');
odd.slice(0, 6).forEach(s => console.log('          ' + s));

// The real test: the pattern the app uses must consume every marker.
const { richText, renderArticle } = await import('../js/dom.js');
const rendered = kb.map(a => richText(a.answer)).join('\n');
chk((rendered.match(/\*\*/g) || []).length === 0, 'no ** survives rendering');
chk(!/<strong>[^<]*<strong>/.test(rendered), 'no nested <strong> in any answer');

// A line that is nothing but bold becomes a heading. Bolding a phrase must
// not accidentally promote a sentence into one.
const promoted = [];
for (const a of kb) {
  for (const l of a.answer.split('\n').map(s => s.trim())) {
    if (/^\*\*[^*]+\*\*$/.test(l) && /Success Manager/.test(l)) {
      promoted.push(`[${a.question.slice(0, 40)}] ${l.slice(0, 50)}`);
    }
  }
}
chk(promoted.length === 0, 'no sentence was turned into a heading');
promoted.forEach(s => console.log('          ' + s));

// Every occurrence in an answer is now emphasised, one way or another.
const unbolded = [];
for (const a of kb) {
  for (const l of a.answer.split('\n')) {
    const plain = l.replace(/\*\*[^*\n]+\*\*/g, '');
    if (PHRASE.test(plain)) unbolded.push(`[${a.question.slice(0, 40)}] ${l.trim().slice(0, 56)}`);
    PHRASE.lastIndex = 0;
  }
}
chk(unbolded.length === 0, 'no occurrence in an answer is left unbolded');
unbolded.slice(0, 6).forEach(s => console.log('          ' + s));

chk(kb.length === 232, 'no article was added or lost');
chk(/<strong>Success Manager<\/strong>/.test(html), 'the markup carries the emphasis too');

// Rendering has to survive as structure, not just as text.
const sample = kb.find(a => /\*\*Success Manager\*\*/.test(a.answer));
chk(!!sample && renderArticle(sample.answer).includes('<strong>Success Manager</strong>'),
    'a real article renders it as <strong>');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  fs.writeFileSync('index.html', html);
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
