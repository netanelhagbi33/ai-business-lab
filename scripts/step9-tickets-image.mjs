/* ============================================================
   Step 9, part two.

   The step now teaches Support Center first, ticket second. What
   it never showed is where a ticket goes afterwards: Support
   Tickets only appears in the sidebar once you have one, so a
   customer who has never opened a ticket has no way to know the
   tab exists.

   Adds our own sidebar as the second screenshot, with the tab
   marked, and one more line in HOW TO GET HELP saying to come
   back through it.

   The screenshot was taken from the running app at
   deviceScaleFactor 2 (520x426 device px = 260x213 css px), so
   the marker below is measured in that same css space. It is
   cropped to the nav list alone: the full sidebar was twice the
   height of the other screenshot beside it and left the row
   dead space.

   Run: node scripts/step9-tickets-image.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const steps = JSON.parse(fs.readFileSync('data/steps.json', 'utf8'));
const highlights = JSON.parse(fs.readFileSync('data/highlights.json', 'utf8'));
const sizes = JSON.parse(fs.readFileSync('data/image-sizes.json', 'utf8'));

const step = steps.live[8];
if (step.n !== 9) { console.log('step 9 not where expected'); process.exit(1); }

const IMG = 'support-tickets-tab.png';
if (!sizes[IMG]) { console.log(`${IMG} is not in image-sizes.json`); process.exit(1); }

/* --- the screenshot ----------------------------------------- */
if (!step.images.includes(IMG)) step.images.push(IMG);
console.log('IMAGES');
step.images.forEach(f => console.log(`  ${f}  ${sizes[f].w}x${sizes[f].h}`));

/* --- the marker on the tab ---------------------------------- */
// Measured on the live sidebar: the Support Tickets row sits at
// 12,146 and is 235x49, inside a 260x213 crop.
const CROP = { w: 260, h: 213 };
const row  = { x: 12, y: 146, w: 235, h: 49 };

if (sizes[IMG].w !== CROP.w * 2 || sizes[IMG].h !== CROP.h * 2) {
  console.log(`crop moved: expected ${CROP.w * 2}x${CROP.h * 2}, `
            + `got ${sizes[IMG].w}x${sizes[IMG].h} — re-measure before writing`);
  process.exit(1);
}

highlights[IMG] = [{
  x: +(row.x / CROP.w * 100).toFixed(3),
  y: +(row.y / CROP.h * 100).toFixed(3),
  w: +(row.w / CROP.w * 100).toFixed(3),
  h: +(row.h / CROP.h * 100).toFixed(3),
  label: 'Support Tickets — where your tickets live',
  tone: 'orange',
}];
console.log('\nHIGHLIGHT');
console.log('  ' + JSON.stringify(highlights[IMG][0]));

/* --- the explanation ---------------------------------------- */
step.simple =
  'Help starts in the Support Center. Search your problem in your own words, or open the '
  + 'topic that fits it — most questions are already answered there. If nothing answers it, '
  + 'you will be able to open a support ticket, and it is tracked under Support Tickets.';

step.rules.items = [
  'Open the Support Center from the sidebar.',
  'Search in your own words, or open the topic that matches your problem.',
  'Read the article that looks closest, and tell us at the end whether it solved it.',
  'If the answers do not solve it, you will be able to open a support ticket from inside the article.',
  'A Support Tickets tab then appears in the sidebar. Open it any time to see every ticket you sent, its status, and the replies on it.',
];
step.rules.example =
  'Support Tickets only shows up once you have opened one, and it stays there afterwards. '
  + 'Tickets show as In Progress while the Support Team is working on them, and Closed once they are resolved.';

step.tip =
  'Refund requests are the exception. They are submitted directly with Request a Refund, '
  + 'and they appear under Support Tickets like any other ticket.';

console.log('\nRULES');
step.rules.items.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
console.log('  eg. ' + step.rules.example);
console.log('\nTIP\n  ' + step.tip);

/* --- guard rails -------------------------------------------- */
let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
const all = JSON.stringify(step) + JSON.stringify(highlights[IMG]);
console.log('\nchecks:');
chk(step.images.includes(IMG), 'the sidebar screenshot is on the step');
chk(step.images.length === 2, 'two screenshots, no duplicate');
chk(/Support Tickets tab/.test(all), 'says how to get back to a ticket');
chk(/Support Center/.test(step.simple), 'still points at the Support Center first');
chk(!/this screen/.test(step.simple), 'no "this screen" now that there are two');
chk(/Request a Refund/.test(step.tip), 'refund bypass still stated');
chk(!/two articles|2 articles/i.test(all), 'still does not publish the threshold');
chk(!/Press Open a ticket/.test(all), 'still does not teach the old route');
chk(highlights[IMG].every(h => h.x + h.w <= 100 && h.y + h.h <= 100),
    'the marker stays inside the image');
chk(step.images.every(f => sizes[f]), 'every screenshot has a registered size');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/steps.json', JSON.stringify(steps, null, 1));
  fs.writeFileSync('data/highlights.json', JSON.stringify(highlights, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
