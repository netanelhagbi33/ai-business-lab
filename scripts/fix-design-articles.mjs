/* ============================================================
   Design changes: 114 tickets, and the answers already existed.
   Testing 60 of those tickets against the real search showed 68%
   never reached any of them.

   The articles were written operationally — "How do I change my
   website's colors, font, or theme?" — while customers write
   descriptively: "too dark", "green earthy", "logo swap",
   "colors are awful". No shared words, so no match.

   Two changes:
     1. The prose now uses the words customers use. Not keyword
        stuffing — it is how you would write it for a person
        anyway, and it is what makes the article findable.
     2. Every one states that design work is a separate package
        from the one that built the site. That fact appears
        nowhere in the knowledge base today, so customers read
        "yes, contact your Success Manager" and are surprised
        later.

   Run: node scripts/fix-design-articles.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

/** Stated once, worded the same way everywhere it appears. */
const PACKAGE_NOTE =
`Design work is handled as a separate package from the one that created your website, so your Success Manager will explain the available options and what each involves before anything changes.`;

const REWRITES = [
  {
    match: 'How do I change my website’s colors, font, or theme?',
    answer:
`Yes — colours, fonts, the theme, the logo and the overall look can all be changed. If the site feels too dark, too bright, or simply not like your brand, none of that is fixed.

**Before your website has been created**
You can change your design selections during the setup stages. At the final review step you can edit your earlier answers, or go back to the beginning and start over.

**Once your website is live**
Colours, fonts and themes can no longer be changed through the AI Assistant or the dashboard. Contact Support and your request goes to your assigned Success Manager, who will review the look you want and update the site for you.

${PACKAGE_NOTE}`,
  },

  {
    match: 'Can I change the design after my website is live?',
    answer:
`Yes. Nothing about the design is permanent. Colours, fonts, the theme, the logo and the overall appearance can all be updated after the site is live — including a complete reset if you want to start the look again from scratch.

These changes cannot be made through the AI Assistant or the dashboard once setup is finished. Contact Support, describe the look you want — brighter, darker, cleaner, closer to your brand — and the request goes to your assigned Success Manager.

${PACKAGE_NOTE}`,
  },

  {
    match: 'Does changing the website theme require the site to be rebuilt?',
    answer:
`No. Changing the theme does not rebuild the website.

Only the visual layer is adjusted — the layout, colours, fonts and overall appearance. Your articles, products, domain, logo and all website data stay exactly as they are. Swapping a dark theme for a bright one, or a generic look for something closer to your brand, does not cost you any content.

Your Success Manager reviews the theme change you want and handles the update.

${PACKAGE_NOTE}`,
  },
];

let done = 0;
for (const r of REWRITES) {
  const i = kb.findIndex(x => x.question === r.match);
  if (i === -1) { console.log(`NOT FOUND: ${r.match}`); process.exit(1); }
  console.log(`\n${'='.repeat(74)}\n▸ ${r.match}\n${'-'.repeat(74)}`);
  console.log(r.answer.split('\n').map(l => '   ' + l).join('\n'));
  kb[i].answer = r.answer;
  done++;
}

console.log(`\n${'='.repeat(74)}\n${done} articles rewritten.`);

/* --- guard rails ------------------------------------------ */
let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
console.log('\nchecks:');
chk(REWRITES.every(r => kb.find(x => x.question === r.match).answer.includes('separate package')),
    'all three state the separate package');
chk(REWRITES.every(r => /Success Manager/.test(kb.find(x => x.question === r.match).answer)),
    'all three route to the Success Manager');
chk(!/let me know|feel free|I'm here to help/i.test(JSON.stringify(REWRITES)),
    'no chat scaffolding');
// The old wording promised the change; the new must not promise a price.
chk(!/\$\d/.test(JSON.stringify(REWRITES)), 'no price quoted — that is the Success Manager\'s to give');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
