/* ============================================================
   "Where can I find the instructions or help section?" told the
   reader the help section did not exist yet — while they were
   reading it inside that help section.

   It now describes what is actually here: the two guided
   walkthroughs and the searchable Support Center. Counts are
   read from data/, not typed in, so the article cannot drift
   out of date the next time a step or topic is added.

   Deliberately does NOT explain how a ticket becomes available.
   Publishing the gate turns it into a formality.

   Run: node scripts/fix-help-section.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');

const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
const steps = JSON.parse(fs.readFileSync('data/steps.json', 'utf8'));
const cats = JSON.parse(fs.readFileSync('data/categories.json', 'utf8'));

const QUESTION = 'Where can I find the instructions or help section?';
const i = kb.findIndex(x => x.question === QUESTION);
if (i === -1) { console.log('article not found'); process.exit(1); }

const build = steps.build.length;
const live = steps.live.length;
const topics = cats.map(c => c.name);
const total = kb.length;

const answer =
`Everything is in the Start Here section. It contains two guided walkthroughs and a searchable library of answers.

**Step-by-step guides**
Build Your Website walks through the ${build} steps of creating and launching your site.

Your Website Is Live — Now What? walks through the ${live} steps of running it once it is up.

Each step shows the actual screen with the button you need marked on it, and you can click any screenshot to enlarge it. Open either guide from Start Here.

**Support Center**
A searchable library of ${total} answers, grouped into ${topics.length} topics shown as cards on the Support Center page.

Search it in your own words or open the topic that fits your question. Your progress through the guides is saved, so you can leave and pick up where you stopped.`;

console.log('BEFORE:');
console.log(kb[i].answer.split('\n').map(l => '   ' + l).join('\n'));
console.log('\nAFTER:');
console.log(answer.split('\n').map(l => '   ' + l).join('\n'));

kb[i].answer = answer;

/* --- guard rails ------------------------------------------ */
let clean = true;
const fail = m => { console.log('  FAIL  ' + m); clean = false; };
const ok = m => console.log('  OK    ' + m);

console.log('\nchecks:');
/^We are currently developing|not yet available/.test(kb[i].answer)
  ? fail('still says the help section does not exist')
  : ok('no longer denies its own existence');

// The gate must not be published — a rule people can read is a rule they work around.
/two articles|open a support ticket from inside/i.test(kb[i].answer)
  ? fail('publishes the ticket gate')
  : ok('does not publish the ticket gate');

// Counts must match the data, or the article starts lying as content grows.
kb[i].answer.includes(`${build} steps`) && kb[i].answer.includes(`${live} steps`)
  ? ok(`step counts match data/steps.json (${build} and ${live})`)
  : fail('step counts do not match steps.json');

kb[i].answer.includes(`${total} answers`)
  ? ok(`article count matches kb.json (${total})`)
  : fail('article count does not match kb.json');

// Listing all ten topic names made this article match every topic search:
// "security" returned it as the best match ahead of the actual security
// articles. One article naming every category outranks the categories.
//
// "Support" is exempt only where it is part of "Support Center", which is
// the section's own name and cannot be avoided.
const stripped = kb[i].answer.replace(/Support Center/g, '');
const named = topics.filter(t => stripped.includes(t));
named.length === 0
  ? ok('no topic names inlined, so it cannot outrank the topics themselves')
  : fail(`inlines topic names (${named.join(', ')}) — this pollutes search`);

if (!clean) { console.log('\nNot writing.'); process.exit(1); }

if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
