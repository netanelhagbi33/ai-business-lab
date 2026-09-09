/* ============================================================
   The 200% guarantee's promotion condition is 90 days too.

   The previous pass moved the refund window from 60 to 90 and
   deliberately left "Actively promoting the website for 60 days"
   alone, on the understanding that it was a separate rule with its
   own number. It is a separate rule, but it changed as well.

   That leaves no 60-day rule anywhere, so the machinery built to
   tell the two apart comes out with it: verify-content no longer
   needs a per-line exception, and the phrase it protects as a
   "non-promise duration" moves to 90 with the rest.

   Run: node scripts/fix-promo-window.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

const FROM = 'Actively promoting the website for 60 days';
const TO   = 'Actively promoting the website for 90 days';

let changed = 0;
for (const a of kb) {
  if (!a.answer.includes(FROM)) continue;
  const n = a.answer.split(FROM).length - 1;
  a.answer = a.answer.split(FROM).join(TO);
  changed += n;
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 60)}  (x${n})`);
}
console.log(`\n${changed} changed`);

let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
console.log('\nchecks:');
chk(changed === 3, `all three occurrences moved (found ${changed})`);

// Nothing anywhere should still quote a 60-day rule.
const stale = [];
for (const a of kb) {
  for (const line of a.answer.split('\n')) {
    if (/\b60[\s-]days?\b/.test(line)) {
      stale.push(`[${a.category}] ${a.question.slice(0, 36)} — ${line.trim().slice(0, 58)}`);
    }
  }
}
chk(stale.length === 0, 'no 60-day rule left in the knowledge base');
stale.forEach(s => console.log('          ' + s));

chk(kb.some(a => a.answer.includes(TO)), 'the promotion condition is intact at 90 days');
chk(kb.filter(a => /\bthree free support calls\b/.test(a.answer)).length >= 3,
    'the rest of the condition is untouched');
chk(kb.length === 232, 'no article was added or lost');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
