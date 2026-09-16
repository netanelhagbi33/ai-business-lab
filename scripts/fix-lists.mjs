/* ============================================================
   Lists that were written as paragraphs.

   62 blocks across 61 articles introduce a list with a colon and
   then write the items as bare lines:

     Before submitting, make sure that:
     You have at least $100 in eligible earnings
     Your payout method is saved
     ...

   renderArticle turns every one of those lines into its own <p>,
   so a checklist reads as a run of disconnected sentences. The
   reader has no way to see that the four lines belong together, or
   that they are four of anything.

   This is not the renderer's fault and cannot be fixed there. A
   bare line after a colon is genuinely ambiguous — it could be a
   list item or the paragraph that the colon introduces. The source
   has to say which, so the markers go into the source.

   The run of items ends at the first line that reads as prose
   again: too long, ending in a colon of its own, carrying more
   than one sentence, or opening with a connector like "If" or
   "Once". Every conversion is printed with its items before
   anything is written, because the failure mode here is silently
   turning a paragraph into a bullet.

   Also fixes the 200% guarantee, which had two problems:
     · its first condition ended "…dashboard; or" with no full
       stop, so the item read as unfinished
     · it did not mention that the free 24-hour Boost has to have
       been activated at least once

   Run: node scripts/fix-lists.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

const one = qStart => {
  const hits = kb.filter(a => a.question.startsWith(qStart));
  if (hits.length !== 1) { console.log(`  MISS  "${qStart.slice(0, 50)}" matched ${hits.length}`); return null; }
  return hits[0];
};

let problems = 0;

/* ============================================================
   Part 1 — the 200% guarantee
   ============================================================ */
const BOOST = 'In every case, the free 24-hour Boost must have been activated at least once.';
const EITHER = `Beyond that, one of the following must also be true:

- You did not earn your first $0.01 within the first week, measured by the advertising activity shown on your website dashboard.
- You actively promoted the website for 90 days according to our guidance, and completed at least three free support calls with a Success Manager.`;

const GUARANTEE = [
{ q: 'How does the money-back guarantee work, and how do I request a refund?', a:
`**Requesting a refund**
Open the Support Center and click **Request a Refund** in the "Looking for a refund?" box at the bottom of the page. Fill in what you are asking for and submit.

Refund requests do not go through the article flow — they are submitted directly and tracked from the moment you send them.

**The standard guarantee**
A refund request is eligible if it is submitted within **90 days** of the original purchase date. Each purchase and add-on is reviewed separately, and each is measured from its own purchase date. Approved amounts are returned the same way you originally paid.

**The 200% guarantee**
The 200% guarantee is not automatic. It applies only when the published eligibility requirements are met.

${BOOST}

${EITHER}

If those requirements are not met you may still be eligible for a 100% refund under the standard policy, but not the additional 200%. Eligibility is reviewed against the activity and records on your account.` },

{ q: 'Does the money-back guarantee provide a 100% or 200% refund?', a:
`The 200% money-back guarantee is not automatic. It applies only when the published eligibility requirements are met.

${BOOST}

${EITHER}

If these requirements are not met, you may still be eligible for a 100% refund under the standard refund policy, but not for the additional 200% guarantee.

Eligibility is reviewed based on the activity and records associated with your account.

To request a refund, open the **Support Center** in the sidebar and press **Request a Refund** in the "Looking for a refund?" box at the bottom of the page.` },

{ q: 'How can I receive the 200% refund as explained in your promotional material?', a:
`The 200% guarantee is not automatic. It applies only when the published eligibility requirements are met.

${BOOST}

${EITHER}

If any earnings were generated in the first week, the first condition is not met. If the requirements are not met you may still be eligible for a 100% refund under the standard refund policy, but not for the additional 200% guarantee.

Eligibility is reviewed based on the activity and records associated with your account.

To request a refund, open the **Support Center** in the sidebar and press **Request a Refund** in the "Looking for a refund?" box at the bottom of the page.` },
];

console.log('THE 200% GUARANTEE');
for (const g of GUARANTEE) {
  const a = one(g.q);
  if (!a) { problems++; continue; }
  a.answer = g.a;
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 58)}`);
}

/* ============================================================
   Part 1b — two answers that open mid-word

   Found while reading the list previews: one article greets the
   reader with "ou can open the withdrawal section…". The Y is
   simply missing, and it is the first thing anyone searching for
   how to withdraw money sees.
   ============================================================ */
const OPENINGS = [
  ['How do I withdraw my earnings?',
   'ou can open the withdrawal section', 'You can open the withdrawal section'],
  ['Why am I not receiving traffic even though I activated',
   'traffic may not appear immediately', 'Traffic may not appear immediately'],
];

console.log('\nCLIPPED OPENINGS');
for (const [q, from, to] of OPENINGS) {
  const a = one(q);
  if (!a) { problems++; continue; }
  if (!a.answer.startsWith(from)) {
    console.log(`  MISS  [${a.category}] ${a.question.slice(0, 44)} does not start with "${from.slice(0, 28)}"`);
    problems++;
    continue;
  }
  a.answer = to + a.answer.slice(from.length);
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 50)}`);
}

/* ============================================================
   Part 2 — colon, then bare lines
   ============================================================ */

/**
 * A line that resumes prose rather than continuing the list.
 *
 * Kept deliberately short. The first version also rejected anything opening
 * with "Your", "To", "It" or "This", which threw away real items — "Your
 * earnings have completed the NET-45 clearance period" is the second line of
 * a four-item checklist, not a paragraph. Punctuation consistency does that
 * job better, so this only has to catch the openers that genuinely cannot
 * begin a list item.
 */
const RESUMES = /^(If|Once|After|When|Please note|You can also|We will|We can|There (is|are)|As a result|The Support Team)\b/;

const isItem = line =>
  line.length <= 130
  && !/^[-•*]\s|^\d+[.)]\s/.test(line)
  && !line.endsWith(':')
  // More than one sentence means it is a paragraph, not an item.
  && !/[.!?]\s+\S/.test(line)
  && !RESUMES.test(line);

/**
 * The concluding sentence of a paragraph looks exactly like a list item to
 * the rule above. Six of them were swallowed on the first run — including
 * "Please do not send your full card number…", which is a security warning
 * and would have become the last bullet of a list of things to send.
 *
 * Every one of them gave itself away by punctuation: the items in a list are
 * written alike, and the sentence that follows them is not. So the first item
 * sets the style, and trailing items that do not match it are dropped back
 * into prose.
 */
function trimToStyle(items) {
  const ends = t => /[.]$/.test(t);
  const style = ends(items[0]);
  const kept = [...items];
  while (kept.length > 1 && ends(kept[kept.length - 1]) !== style) kept.pop();
  return kept;
}

/* Sequential things get numbers; alternatives and checklists get bullets. */
const IMPERATIVE = /^(Open|Tap|Select|Click|Confirm|Go|Enter|Choose|Press|Copy|Take|Close|Review|Sign|Add|Send|Fill|Do not|Make sure)\b/;
// "…still considered a very early stage" is not a list of stages, so the
// keyword has to be plural — it has to be naming the things that follow.
const NAMES_SEQUENCE = /\b(stages|steps)\b/i;
// A list of ways, options or reasons is a set of alternatives even when each
// one happens to start with a verb.
const ALTERNATIVES = /\b(ways?|options?|methods?|includes?|including|such as|reasons?|make sure|confirm that|provide|send us)\b/i;

const numbered = (lead, items) =>
  NAMES_SEQUENCE.test(lead)
  || (!ALTERNATIVES.test(lead)
      && items.filter(t => IMPERATIVE.test(t)).length >= Math.ceil(items.length * 0.75));

let converted = 0, touched = 0;
console.log('\nLISTS RECOVERED');

for (const a of kb) {
  const blocks = a.answer.split(/\n\s*\n/);
  let changedHere = false;

  for (let bi = 0; bi < blocks.length; bi++) {
    const lines = blocks[bi].split('\n').map(l => l.trimEnd());
    let out = [], i = 0, hit = false;

    while (i < lines.length) {
      const lead = lines[i].trim();
      out.push(lines[i]);

      if (!lead.endsWith(':')) { i++; continue; }

      // Collect the run that follows.
      let j = i + 1;
      const raw = [];
      while (j < lines.length && lines[j].trim() && isItem(lines[j].trim())) {
        raw.push(lines[j].trim());
        j++;
      }
      // Three is the bar for spotting a list that never said it was one.
      // When the lead says so outright — "in either of the following ways:",
      // "in three ways:" — two items are enough, because the sentence has
      // already told the reader to expect a list.
      const ANNOUNCED = /\b(either|both|any) of the following\b|\bthe following\b|\bin (two|three|four|five) ways\b/i;
      if (raw.length < (ANNOUNCED.test(lead) ? 2 : 3)) { i++; continue; }

      const items = trimToStyle(raw);
      const dropped = raw.slice(items.length);
      // Three is the bar for recognising a list at all — it is what keeps an
      // ordinary two-sentence paragraph from becoming bullets. Once a run has
      // cleared it, trimming a concluding sentence off the end can leave two
      // real items, and two items are still a list.
      if (items.length < 2) { i++; continue; }
      j -= dropped.length;

      const num = numbered(lead, items);
      const mark = num ? (n => `${n + 1}. `) : (() => '- ');
      items.forEach((t, n) => out.push(mark(n) + t));
      // A list has to be its own block for the renderer to see it.
      out.splice(out.length - items.length, 0, '');

      converted++;
      hit = true;
      console.log(`\n  [${a.category}] ${a.question.slice(0, 54)}`);
      console.log(`    lead : ${lead.slice(0, 76)}`);
      console.log(`    ${num ? 'numbered' : 'bulleted'} ${items.length}:`);
      items.forEach(t => console.log(`      • ${t.slice(0, 84)}`));
      dropped.forEach(t => console.log(`      ↩ left as prose: ${t.slice(0, 70)}`));
      if (j < lines.length) console.log(`    stops before: "${lines[j].trim().slice(0, 62)}"`);

      i = j;
    }

    if (hit) { blocks[bi] = out.join('\n'); changedHere = true; }
  }

  if (changedHere) { a.answer = blocks.join('\n\n'); touched++; }
}

console.log(`\n${converted} lists recovered across ${touched} articles`);
if (problems) { console.log('\nNot writing.'); process.exit(1); }

/* ============================================================
   Guard rails
   ============================================================ */
let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
console.log('\nchecks:');

chk(kb.length === 232, 'no article was added or lost');

// The thing this script exists to remove.
const leftover = [];
for (const a of kb) {
  for (const block of a.answer.split(/\n\s*\n/)) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length - 2; i++) {
      if (!lines[i].endsWith(':')) continue;
      let k = i + 1, n = 0;
      while (k < lines.length && isItem(lines[k])) { n++; k++; }
      if (n >= 3) leftover.push(`[${a.category}] ${a.question.slice(0, 40)}`);
    }
  }
}
chk(leftover.length === 0, 'no colon is still followed by bare list lines');
leftover.slice(0, 8).forEach(s => console.log('          ' + s));

// The 200% guarantee.
const g200 = kb.filter(a => /200%/.test(a.answer) && /eligibility requirements/i.test(a.answer));
chk(g200.length === 3, `all three 200% articles found (${g200.length})`);
chk(g200.every(a => /free 24-hour Boost must have been activated at least once/.test(a.answer)),
    'every one states the Boost requirement');
chk(!kb.some(a => /dashboard; or$/m.test(a.answer)),
    'no list item ends mid-sentence with "; or"');

// Every bullet in the knowledge base should end like a sentence or a label,
// never with a dangling conjunction.
const dangling = [];
for (const a of kb) {
  for (const l of a.answer.split('\n').map(s => s.trim())) {
    if (/^[-•*]\s/.test(l) && /\b(or|and)$/.test(l)) {
      dangling.push(`[${a.category}] ${a.question.slice(0, 36)} — ${l.slice(0, 50)}`);
    }
  }
}
chk(dangling.length === 0, 'no bullet ends with a dangling "or"/"and"');
dangling.forEach(s => console.log('          ' + s));

const lowerStart = kb.filter(a => /^[a-z]/.test(a.answer.trim()))
                     .map(a => `[${a.category}] ${a.question.slice(0, 40)}`);
chk(lowerStart.length === 0, 'no answer opens with a lowercase letter');
lowerStart.forEach(s => console.log('          ' + s));

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
