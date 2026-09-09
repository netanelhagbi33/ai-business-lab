/* ============================================================
   Two articles surfaced as cards on Start Here, answering the
   questions the ticket data shows people actually ask.

   "What is the Accelerator and what did I buy?" is 307 tickets
   and "where is my dashboard" runs through the access and
   getting-started tickets: people are inside the dashboard and
   do not recognise it, because it looks like a chat.

   Facts come from existing articles, named per entry. Nothing
   new is asserted about the product.

   Run: node scripts/add-start-here-guides.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

const ARTICLES = [
  {
    category: 'Dashboard & Access',
    question: 'Where is my dashboard?',
    // Facts: "How can I find my AI Account?" (the chat is the dashboard),
    // live guide step 1 (what the Dashboard offers), "What are the daily
    // buttons and how should I use them?" (the + icon), and the
    // any-device / home-screen articles.
    answer:
`**You are already in it.** The chat screen you are looking at is your dashboard. There is no other page to find and nothing to install.

It looks like a conversation because that is how you operate it — you type what you want, or pick from the buttons, and the system does it.

**The + icon opens everything**
Click the **+** to the left of the message box to see every action available to you in one list: visit your website, check your stats, add a payout method, check billing, boost your traffic and view upgrades.

You can also just type a normal question instead. You do not need to memorise commands.

**Getting back to it**
Sign in at https://aibusiness-lab.com/ from any device — computer, phone or tablet. Everything is in the same place on each of them.

If you use it often, add it to your phone's home screen: on iPhone open it in Safari, tap Share, then Add to Home Screen. On Android open it in Chrome, tap the three-dot menu, then Add to Home screen.`,
  },

  {
    category: 'Refunds',
    question: 'How does the money-back guarantee work, and how do I request a refund?',
    // Facts: "Does the money-back guarantee provide a 100% or 200% refund?",
    // "Am I eligible for the advertised money-back guarantee?", "Can I
    // request a refund for all of my purchases and add-ons?", and
    // "How do I cancel my order or stop participating in the program?".
    answer:
`**Requesting a refund**
Open the Support Center and click **Request a Refund** in the "Looking for a refund?" box at the bottom of the page. Fill in what you are asking for and submit.

Refund requests do not go through the article flow — they are submitted directly and tracked from the moment you send them. You can also ask through the AI Assistant or open a Support Ticket if you prefer.

**The standard guarantee**
A refund request is eligible if it is submitted within **60 days** of the original purchase date. Each purchase and add-on is reviewed separately, and each is measured from its own purchase date. Approved amounts are returned through the same payment method used originally.

**The 200% guarantee**
The 200% guarantee is not automatic. It applies only when the published eligibility requirements are met, which are either:

- Not earning the first $0.01 within the first week, through advertising activity shown on the website dashboard; or
- Actively promoting the website for 60 days according to our guidance, and completing at least three free support calls with a Success Manager.

If those requirements are not met you may still be eligible for a 100% refund under the standard policy, but not the additional 200%. Eligibility is reviewed against the activity and records on your account.`,
  },
];

let added = 0;
for (const a of ARTICLES) {
  if (kb.some(x => x.question === a.question)) {
    console.log(`already present: ${a.question}`);
    continue;
  }
  // Insert next to its category so browsing stays coherent.
  const last = kb.map(x => x.category).lastIndexOf(a.category);
  kb.splice(last + 1, 0, a);
  added++;
  console.log(`\n${'='.repeat(74)}`);
  console.log(`+ [${a.category}]  ${a.question}`);
  console.log('-'.repeat(74));
  console.log(a.answer.split('\n').map(l => '   ' + l).join('\n'));
}

console.log(`\n${'='.repeat(74)}`);
console.log(`${added} articles added · ${kb.length} total`);

/* --- guard rails ------------------------------------------ */
let clean = true;
const chk = (ok, msg) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${msg}`); if (!ok) clean = false; };
console.log('\nchecks:');
chk(!/let me know|feel free to|I'm here to help/i.test(JSON.stringify(ARTICLES)),
    'no chat scaffolding');
chk(!/\[insert/i.test(JSON.stringify(ARTICLES)), 'no placeholders');
chk(ARTICLES.every(a => kb.some(x => x.question === a.question)), 'both present in kb');
chk(new Set(kb.map(x => x.question)).size === kb.length, 'no duplicate questions');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
