/* ============================================================
   Step 9 taught the old route: "Press Open a ticket".

   Support now works in one order — Support Center, find the
   article, and only if that fails does a ticket become an
   option. The step said the opposite, and its first screenshot
   pointed at the shortcut with a CLICK HERE badge.

   The screenshot stays: that screen is still where tickets are
   tracked. Its marker moves off the button and onto the ticket
   list, which is what the step is now about.

   Deliberately does NOT state the two-article threshold. A
   published gate is one people click through twice on purpose.

   Run: node scripts/fix-step9.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const steps = JSON.parse(fs.readFileSync('data/steps.json', 'utf8'));
const highlights = JSON.parse(fs.readFileSync('data/highlights.json', 'utf8'));
const sizes = JSON.parse(fs.readFileSync('data/image-sizes.json', 'utf8'));

const step = steps.live[8];
if (step.n !== 9) { console.log('step 9 not where expected'); process.exit(1); }

console.log('BEFORE');
console.log('  title : ' + step.title);
console.log('  simple: ' + step.simple);
console.log('  tip   : ' + step.tip);

step.title = 'Support — find an answer, then open a ticket if you need one';

step.simple =
`Help starts in the Support Center. Search your problem in your own words, or open the topic that fits it — most questions are already answered there. If nothing answers it, you will be able to open a support ticket, and this screen is where you track it afterwards.`;

step.tip =
`Refund requests are the exception. They are submitted directly with Request a Refund and tracked from the moment you send them.`;

step.rules = {
  title: 'HOW TO GET HELP',
  lead: 'Support works in this order, and each step answers most of the people who reach it:',
  items: [
    'Open the Support Center from the sidebar.',
    'Search in your own words, or open the topic that matches your problem.',
    'Read the article that looks closest, and tell us at the end whether it solved it.',
    'If the answers do not solve it, you will be able to open a support ticket. It then appears in Support Tickets with its status.',
  ],
  example: 'Tickets show as In Progress while the Support Team is working on them, and Closed once they are resolved. Replies appear on the ticket itself.',
};

console.log('\nAFTER');
console.log('  title : ' + step.title);
console.log('  simple: ' + step.simple);
console.log('  tip   : ' + step.tip);
console.log('  rules : ' + step.rules.items.length + ' steps + an example');

/* --- drop the second screenshot ----------------------------- */
// It showed the old route into My Tickets and is being replaced. Its
// markers go with it; the file stays on disk rather than being deleted,
// since nothing else references it and deleting is the harder step to undo.
const DROP = '35980f19-2659-4cb1-b421-6bb9fa9b2334.png';
console.log(`
IMAGES
  before: ${step.images.length}`);
step.images = step.images.filter(f => f !== DROP);
delete highlights[DROP];
console.log(`  after : ${step.images.length}  (removed ${DROP})`);

/* --- the first screenshot's marker -------------------------- */
const IMG = '8d0c15eb-3148-4b54-a5b5-b226aa5ec463.png';
const { w, h } = sizes[IMG];
// Measured against the image at 1:1. The ticket list, not the button.
const box = { x: 385, y: 105, w: 758, h: 500 };

console.log(`\nHIGHLIGHT on ${IMG} (${w}x${h})`);
console.log('  removed: "Press Open a ticket"  — it taught the route being replaced');

highlights[IMG] = [{
  x: +(box.x / w * 100).toFixed(3),
  y: +(box.y / h * 100).toFixed(3),
  w: +(box.w / w * 100).toFixed(3),
  h: +(box.h / h * 100).toFixed(3),
  label: 'Your tickets and their status',
  tone: 'blue',
  noBadge: true,
}];
console.log('  added  : "Your tickets and their status" over the list');
console.log('           ' + JSON.stringify(highlights[IMG][0]));

/* --- guard rails ------------------------------------------- */
let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
console.log('\nchecks:');
const all = JSON.stringify(step) + JSON.stringify(highlights[IMG]);
chk(!/Press Open a ticket/.test(all), 'no longer teaches "Press Open a ticket"');
chk(!/two articles|2 articles/i.test(all), 'does not publish the two-article threshold');
chk(/Support Center/.test(step.simple), 'points at the Support Center first');
chk(/Request a Refund/.test(step.tip), 'refund bypass still stated');
chk(highlights[IMG].every(x => x.x + x.w <= 100 && x.y + x.h <= 100),
    'the marker stays inside the image');
chk(!step.images.includes(DROP), 'the replaced screenshot is gone');
chk(!highlights[DROP], 'its markers went with it');
chk(step.images.length >= 1, 'the step still has a screenshot');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/steps.json', JSON.stringify(steps, null, 1));
  fs.writeFileSync('data/highlights.json', JSON.stringify(highlights, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
