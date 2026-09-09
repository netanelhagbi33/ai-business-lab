/* ============================================================
   The questions worth answering outside the Support Center.

   Two exclusions, applied before ranking:

     - Pure refund requests. "I want a refund" is a decision,
       not a question — no article prevents it. But 12% of
       refund tickets carry a real question alongside, and
       those are kept and counted by that other topic.
     - Tickets too short to carry a question: "help",
       "question", "test", a bare subject with no body.

   What is left is what a customer actually wanted to know.

   Run: node analysis/questions.mjs
   ============================================================ */
import fs from 'fs';

const tickets = JSON.parse(fs.readFileSync('analysis/tickets.json', 'utf8'));
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

const REFUND = /refund|money back|cancel|opt out|charge ?back|reimburse|unsubscrib/i;

/** Any sign the ticket is asking something, not just demanding money back. */
const CARRIES_QUESTION =
  /how (do|can|long|much|does)|what (is|are|do|does|should)|when (will|do|can|does)|why (is|am|do|does|can|are)|where (is|do|can)|traffic|log ?in|password|payout|withdraw|niche|domain|dashboard|article|booster|accelerat|earn|income|revenue|set ?up|access|activate|verif|credit card|products?/i;

const meaningful = s => s.toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
  .filter(w => w.length > 2).length;

let droppedRefund = 0, droppedShort = 0;
const kept = [];

for (const t of tickets) {
  const text = `${t.subject} ${t.body}`;

  if (REFUND.test(text)) {
    // Keep only if something else is being asked.
    const rest = text.replace(new RegExp(REFUND.source, 'gi'), ' ');
    if (!CARRIES_QUESTION.test(rest)) { droppedRefund++; continue; }
  }

  // Deduplicate: many tickets repeat the subject as the body.
  const unique = t.subject.trim() === t.body.trim() ? t.subject : text;
  if (meaningful(unique) < 4) { droppedShort++; continue; }

  kept.push(t);
}

/* --- intents. No refund bucket: those are gone, and the
       survivors are counted by what else they ask. --------- */
const RULES = [
  ['Cannot reach a person — the AI call fails', 'Support',
   /kevin|robot|android|automated (voice|call)|live (person|agent|human)|speak to (a )?(person|human|someone)|call (keeps )?(dropping|hanging|disconnect)|hangs? up|can.t (understand|hear)|no one (called|answered|contacted)/i],

  ['Cannot log in or access my account', 'Dashboard & Access',
   /can.?t (log ?in|access|get in|sign in|open)|unable to (log|access|sign)|locked out|login (issue|problem|link)|access (my|the) (account|site|website|dashboard)|password|activate your account/i],

  ['Why is it asking for my credit card again?', 'Purchases & Billing',
   /(credit card|card|payment).{0,40}(again|verif|another|second time)|asking for.{0,20}card|wants my (credit )?card|charge.{0,20}(verif|activat)/i],

  ['What is the Accelerator and what did I buy?', 'Purchases & Billing',
   /accelerat|\$297|297|what (plan|package) am i on|what did i (buy|purchase|pay for)|payment structure|what.{0,15}(included|comes with)/i],

  ['When will I start earning, and how much?', 'Earnings & Payouts',
   /when.{0,30}(start|begin).{0,25}(earn|mak|see|generat)|how long.{0,30}(earn|money|income|revenue|profit)|how (much|do) i (make|earn)|start (seeing|making)|how does.{0,20}(money|income|revenue)|when.{0,20}(will|do) i (get|see) (paid|money)/i],

  ['Not earning / earnings too low', 'Earnings & Payouts',
   /(not|no|zero|barely|hardly|only).{0,25}(earning|income|revenue|money|profit|sales)|made (nothing|no money)|earnings? (are )?(low|small)/i],

  ['Setting up where I get paid', 'Earnings & Payouts',
   /(set|setting|add|adding|change|update|put in).{0,25}(payout|payment|banking|bank)|payment method|payout method|paypal|wise|cash ?app|bank (transfer|details|account|info)/i],

  ['How do I withdraw my earnings?', 'Earnings & Payouts',
   /withdraw|cash out|get (my )?(money|earnings) out|when (can|do) i (get|receive) (my )?(money|payment)/i],

  ['No traffic or visitors', 'Traffic & Boosters',
   /no (traffic|visitors|clicks|views)|not (getting|receiving|seeing).{0,20}(traffic|visitors|clicks)|traffic (is )?(low|zero|down)|why.{0,20}no.{0,15}traffic/i],

  ['Changing my niche or category', 'Website & Content',
   /(change|wrong|different|another|pick|choose|switch|start over).{0,25}(niche|category|topic)|don.t want.{0,25}(niche|category)|niche/i],

  ['Wrong or unwanted products on my site', 'Website & Content',
   /(site|website) shows|offensive|inappropriate|remove.{0,20}(product|article|content|item)|(products?|items?).{0,30}(wrong|silly|expensive|different|don.t|do not|not related)|content (is )?(wrong|irrelevant)/i],

  ['Changing the design, theme or logo', 'Website & Content',
   /\b(theme|colou?rs?|design|template|logo|layout|font)\b/i],

  ['Can I have more than one website?', 'Website & Content',
   /(multiple|more than one|another|second|extra|additional) (site|website)/i],

  ['Adding more articles or content', 'Website & Content',
   /(more|additional|extra|new).{0,15}articles?|article generator|add content|content expansion/i],

  ['Domain or site name', 'Website & Content',
   /domain|site name|website name|subdomain|\burl\b/i],

  ['My site is not live or setup did not finish', 'Building My Site',
   /(site|website) (is )?not (live|up|working|created|built|ready)|setup (not|did ?n.t) (complete|finish)|still (not|isn.t) (live|ready)|nothing (happened|created)|stuck/i],

  ['How do I get started?', 'Getting Started',
   /how (do|to) (i |we )?(get )?start|getting started|what (do|should) i do( now| next| first)?|where do i (start|begin)|set ?up my (account|site|website)|help me set (it|this) up|how does this work|what.s next/i],

  ['When will my Success Manager contact me?', 'Support',
   /success manager|account manager|orientation|onboarding call|assigned (manager|rep)|when will (someone|anyone) (call|contact|reach)/i],

  ['Boosters and the Daily Boost', 'Traffic & Boosters',
   /booster|daily boost|traffic boost|seo boost/i],

  ['Dashboard — what the numbers mean', 'Dashboard & Access',
   /dashboard|site stats|impressions|clicks|estimated (website )?value|available balance/i],

  ['Changing my email or account details', 'Account & Security',
   /change (my )?(email|e.mail|phone|number)|update (my )?(email|details)|wrong email/i],

  ['Asking to be called back', 'Support',
   /call me|please call|phone me|contact me at|my number is|\bcallback\b/i],
];

const counts = new Map();
let unmatched = 0;
for (const t of kept) {
  const text = `${t.subject} ${t.body}`;
  const hit = RULES.find(([, , re]) => re.test(text));
  if (!hit) { unmatched++; continue; }
  const [intent, section] = hit;
  if (!counts.has(intent)) counts.set(intent, { intent, section, n: 0, samples: [] });
  const e = counts.get(intent);
  e.n++;
  if (e.samples.length < 4) {
    const s = (t.body.length > t.subject.length ? t.body : t.subject).replace(/\s+/g, ' ').trim();
    if (s.length > 25) e.samples.push(s.slice(0, 120));
  }
}

const ranked = [...counts.values()].sort((a, b) => b.n - a.n);

console.log(`${tickets.length} tickets total`);
console.log(`  −${droppedRefund}  pure refund requests (no other question)`);
console.log(`  −${droppedShort}  too short to carry a question`);
console.log(`  =${kept.length}  real questions · ${kept.length - unmatched} classified, ${unmatched} unmatched\n`);

console.log('THE 10 MOST-ASKED QUESTIONS');
console.log('='.repeat(96));
ranked.slice(0, 10).forEach((r, i) => {
  console.log(`\n${String(i + 1).padStart(2)}.  ${r.n} tickets  ·  ${(r.n / kept.length * 100).toFixed(1)}% of real questions`);
  console.log(`    ${r.intent}`);
  console.log(`    Support Center section: ${r.section}`);
  r.samples.slice(0, 2).forEach(s => console.log(`      "${s}"`));
});

console.log('\n\n11-22, for context');
console.log('='.repeat(96));
ranked.slice(10, 22).forEach((r, i) =>
  console.log(`${String(i + 11).padStart(3)}.  ${String(r.n).padStart(4)}  ${r.intent}  [${r.section}]`));

fs.writeFileSync('analysis/questions.json', JSON.stringify(ranked, null, 1));
