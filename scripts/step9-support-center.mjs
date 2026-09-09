/* ============================================================
   Step 9, part three — and a correction.

   Two problems with what part two left behind.

   1. The step showed where a ticket ENDS UP but never showed
      where help STARTS. The Support Center tab was named in the
      text and pictured nowhere.

   2. One of the numbered steps read "you will be able to open a
      support ticket from inside the article." That is the whole
      funnel announced in advance. A customer who reads it now
      knows there is a way through and reads the article looking
      for the way through, not for the answer. The route has to be
      discovered at the point where the answers have genuinely
      failed — not advertised on the way in.

      So the step no longer mentions opening a ticket at all. It
      still says where tickets are read, which is what somebody
      who already has one needs.

   The new screenshot is the sidebar WITHOUT Support Tickets,
   because that is the sidebar a customer has before they have a
   ticket — the state they are actually in while reading this.

   Run: node scripts/step9-support-center.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const steps = JSON.parse(fs.readFileSync('data/steps.json', 'utf8'));
const highlights = JSON.parse(fs.readFileSync('data/highlights.json', 'utf8'));
const sizes = JSON.parse(fs.readFileSync('data/image-sizes.json', 'utf8'));

const step = steps.live[8];
if (step.n !== 9) { console.log('step 9 not where expected'); process.exit(1); }

const CENTER  = 'support-center-tab.png';
const TICKETS = 'support-tickets-tab.png';
const SCREEN  = '8d0c15eb-3148-4b54-a5b5-b226aa5ec463.png';

/* --- the third screenshot ----------------------------------- */
// Order follows the story: where help starts, where tickets are read,
// what that screen looks like.
step.images = [CENTER, TICKETS, SCREEN];
console.log('IMAGES');
for (const f of step.images) {
  if (!sizes[f]) { console.log(`  ${f} is not in image-sizes.json`); process.exit(1); }
  console.log(`  ${f}  ${sizes[f].w}x${sizes[f].h}`);
}

/* --- its marker --------------------------------------------- */
// Measured on the live sidebar with no ticket yet: the Support Center row
// sits at 12,99 and is 235x46, inside a 260x163 crop, taken at 2x.
const CROP = { w: 260, h: 163 };
const row  = { x: 12, y: 99, w: 235, h: 46 };
if (sizes[CENTER].w !== CROP.w * 2 || sizes[CENTER].h !== CROP.h * 2) {
  console.log(`crop moved: expected ${CROP.w * 2}x${CROP.h * 2}, got `
            + `${sizes[CENTER].w}x${sizes[CENTER].h} — re-measure before writing`);
  process.exit(1);
}
highlights[CENTER] = [{
  x: +(row.x / CROP.w * 100).toFixed(3),
  y: +(row.y / CROP.h * 100).toFixed(3),
  w: +(row.w / CROP.w * 100).toFixed(3),
  h: +(row.h / CROP.h * 100).toFixed(3),
  label: 'Support Center — where every answer starts',
}];
console.log('\nHIGHLIGHT on ' + CENTER);
console.log('  ' + JSON.stringify(highlights[CENTER][0]));

/* --- the wording -------------------------------------------- */
// The title said "...then open a ticket if you need one", which announced
// the route above every other word on the page.
step.title = 'Support — find your answer in the Support Center';

step.simple =
  'Help starts in the Support Center. Search your problem in your own words, or open the '
  + 'topic that fits it — most questions are already answered there, in one short article. '
  + 'Tickets you have already sent are tracked under Support Tickets.';

step.rules = {
  title: 'HOW TO GET HELP',
  lead: 'Support works in this order, and most questions are answered before the last step:',
  items: [
    'Open the Support Center from the sidebar.',
    'Search in your own words — type the problem the way you would say it out loud.',
    'Or open the topic that matches your problem, and read the question closest to yours.',
    'Tell us at the end whether the article solved it. That is how we know which answers are working and where you still need us.',
    'Already sent a ticket? Open Support Tickets in the sidebar to see it, its status, and the replies on it.',
  ],
  example: 'Support Tickets only appears in the sidebar once you have a ticket, and it stays '
         + 'there afterwards. Tickets show as In Progress while the Support Team is working on '
         + 'them, and Closed once they are resolved.',
};

console.log('\nSIMPLE\n  ' + step.simple);
console.log('\nRULES');
step.rules.items.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
console.log('  eg. ' + step.rules.example);

/* --- guard rails -------------------------------------------- */
let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
const prose = [step.title, step.simple, step.tip, step.rules.lead,
               ...step.rules.items, step.rules.example].join(' ');
console.log('\nchecks:');
chk(step.images.length === 3 && new Set(step.images).size === 3, 'three screenshots, no duplicate');
chk(step.images[0] === CENTER, 'the Support Center comes first');
chk(step.images.every(f => sizes[f] && highlights[f]?.length),
    'every screenshot has a size and a marker');
chk(!/\bopen a (support )?ticket\b/i.test(prose), 'never tells the reader to open a ticket');
chk(!/you will be able to/i.test(prose), 'promises nothing about a ticket in advance');
chk(!/two articles|2 articles/i.test(prose), 'still does not publish the threshold');
chk(/Support Center/.test(step.simple), 'still points at the Support Center first');
chk(/Support Tickets/.test(prose), 'still says where an existing ticket is read');
chk(/Request a Refund/.test(step.tip), 'refund bypass still stated');
chk(Object.values(highlights).flat().every(h => h.x + h.w <= 100 && h.y + h.h <= 100),
    'every marker stays inside its image');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/steps.json', JSON.stringify(steps, null, 1));
  fs.writeFileSync('data/highlights.json', JSON.stringify(highlights, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
