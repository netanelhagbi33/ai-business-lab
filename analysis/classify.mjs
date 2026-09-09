/* ============================================================
   Map every ticket to one intent, then to a Support Center
   section, and check whether the knowledge base answers it.

   Rules are ORDERED and the first match wins, so each ticket
   is counted once. Specific intents come before broad ones —
   "unauthorised charge" must beat "refund", or everything
   money-shaped collapses into one bucket.

   Run: node analysis/classify.mjs
   ============================================================ */
import fs from 'fs';

const tickets = JSON.parse(fs.readFileSync('analysis/tickets.json', 'utf8'));
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

/* --- the Support Center's own search, so "answered?" means
       what the customer would actually have seen ------------ */
const SYN = {
  boost: ['booster','traffic','visitors','24 hour','24h','accelerator'],
  earn: ['earning','earnings','revenue','money','income','profit'],
  withdraw: ['withdrawal','payout','payment method','wallet','paypal','wise','bank'],
  site: ['website','business','storefront','domain'],
  build: ['launch','setup','create','onboarding'],
  refund: ['cancel','money back','return'],
  support: ['ticket','callback','call back','human','success manager'],
  article: ['content','products','keywords','niche'],
};
const norm = s => String(s || '').toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
function score(item, q) {
  const nq = norm(q); if (!nq) return 0;
  const qt = norm(item.question), t = norm(item.question + ' ' + item.category + ' ' + item.answer);
  let s = 0;
  nq.split(' ').filter(x => x.length > 1).forEach(x => {
    if (t.includes(x)) s += 2; if (qt.includes(x)) s += 5;
  });
  Object.entries(SYN).forEach(([k, a]) => {
    if (nq.includes(k) || a.some(v => nq.includes(v))) {
      if (t.includes(k) || a.some(v => t.includes(v))) s += 6;
    }
  });
  if (qt.includes(nq)) s += 16;
  return s;
}
function bestArticle(q) {
  let best = null, bs = 0;
  for (const a of kb) { const s = score(a, q); if (s > bs) { bs = s; best = a; } }
  return { article: best, score: bs };
}

/* --- intents, most specific first ------------------------- */
const RULES = [
  ['Unauthorised or unexpected charge', 'Purchases & Billing',
   /unauthoriz|unauthoris|did not authorize|didn.t authorize|charged (me )?(twice|again|extra|more)|double charge|extra charge|took (money|\$\d+) (from|out)|without my (permission|consent)|fraudulent charge/i],

  ['Refund not received or still pending', 'Refunds',
   /(refund|money).{0,40}(not (received|come|arrived|processed)|still (waiting|pending|not)|haven.t (received|got)|where is)|waiting (weeks|months|for.{0,20}refund)|tickets? (are )?closed and still no refund/i],

  ['Requesting a refund or cancellation', 'Refunds',
   /refund|money back|cancel|opt out|charge ?back|reimburse|i want out|stop (participating|the program)|unsubscrib/i],

  ['Says it is a scam or misleading advertising', 'Refunds',
   /\bscam|fraud|misleading|false advertis|lied|not (as|what) (advertised|promised)|rip.?off|deceiv/i],

  ['Cannot reach a person / AI call problems', 'Support',
   /kevin|robot|android|automated (voice|call)|live (person|agent|human)|speak to (a )?(person|human|someone)|call (keeps )?(dropping|hanging|disconnect)|no one (called|answered|contacted)|can.t (understand|hear)/i],

  ['When will I start earning?', 'Earnings & Payouts',
   /when.{0,30}(start|begin).{0,20}(earn|mak|see|generat).{0,20}(money|income|revenue)|how long.{0,30}(earn|money|income|revenue|profit)|when.{0,20}(will|do) i (get|see) (paid|money|income)|start (seeing|making) (some )?(income|money)/i],

  ['Not earning / earnings too low', 'Earnings & Payouts',
   /(not|no|zero|barely|hardly).{0,25}(earning|income|revenue|money|profit|sales)|earnings? (are )?(low|small|nothing)|only .{0,10}(cent|\$0)|made (nothing|no money)/i],

  ['No traffic or visitors', 'Traffic & Boosters',
   /no (traffic|visitors|clicks|views)|not (getting|receiving|seeing).{0,20}(traffic|visitors|clicks|views)|traffic (is )?(low|zero|down)|why.{0,20}(no|not).{0,15}traffic/i],

  ['Setting up a payout method', 'Earnings & Payouts',
   /(set|setting|add|adding|change|update).{0,25}(payout|payment) (method|option|details)|payment method|banking (info|details)|need banking|paypal (account|email)|wise account|bank (transfer|details|account)/i],

  ['How do I withdraw my earnings?', 'Earnings & Payouts',
   /withdraw|payout (request|timing)|cash out|get (my )?(money|earnings) out|transfer.{0,20}(earnings|balance)/i],

  ['Cannot log in or access my account', 'Dashboard & Access',
   /can.?t (log ?in|access|get in|sign in)|unable to (log|access|sign)|locked out|login (issue|problem|not work)|access my (account|site|dashboard)|password/i],

  ['Accelerator or upgrade not showing', 'Purchases & Billing',
   /(accelerat|upgrade|booster|package|article pack).{0,40}(not (showing|visible|appear|there)|missing|don.t see|can.t find|haven.t (received|got))/i],

  ['What is the Accelerator and what does it cost?', 'Purchases & Billing',
   /accelerat|\$297|297 (plan|package|program)|what (plan|package) am i on|payment structure/i],

  ['Changing my niche or category', 'Website & Content',
   /(change|wrong|different|another|pick|choose).{0,25}(niche|category|topic)|don.t want.{0,25}(niche|category)|niche is (wrong|not)/i],

  ['Wrong or unwanted content on my site', 'Website & Content',
   /(site|website) shows|offensive|inappropriate|remove.{0,20}(product|article|content|item)|content (is )?(wrong|irrelevant|not related)|products? (i|that) (don.t|do not)/i],

  ['Adding more articles or content', 'Website & Content',
   /(more|additional|extra|new).{0,15}articles?|article generator|add content|content expansion|write.{0,15}articles?/i],

  ['Domain or site name questions', 'Website & Content',
   /domain|site name|website name|url|subdomain|custom domain/i],

  ['How do I get started / what do I do now?', 'Getting Started',
   /how (do|to) (i |we )?(get )?start|getting started|what (do|should) i do( now| next| first)?|where do i (start|begin)|set ?up my (account|site|website)|help me set (it|this) up|new (here|to this)|just (started|joined|bought)/i],

  ['Site is not live or setup did not finish', 'Building My Site',
   /(site|website) (is )?not (live|up|working|created|built)|setup (not|did ?n.t) (complete|finish)|still (not|isn.t) (live|ready)|activate your account|nothing (happened|created)/i],

  ['When will my Success Manager contact me?', 'Support',
   /success manager|account manager|orientation call|onboarding call|assigned (manager|rep)|when will (someone|anyone) (call|contact|reach)/i],

  ['Boosters and traffic upgrades', 'Traffic & Boosters',
   /booster|daily boost|traffic boost|seo boost|boost (my|the) (site|traffic)/i],

  ['Billing, invoices and receipts', 'Purchases & Billing',
   /invoice|receipt|billing (statement|question|issue)|what (did|have) i (paid|bought|purchase)|proof of payment/i],

  ['Account or security concerns', 'Account & Security',
   /delete my (account|data|card)|remove my (card|details|information)|security|hacked|privacy|personal (data|information)/i],

  ['Dashboard, stats and what the numbers mean', 'Dashboard & Access',
   /dashboard|site stats|impressions|clicks|estimated (website )?value|available balance|what do.{0,20}numbers mean/i],

  ['Changing the design, theme or colours', 'Website & Content',
   /(theme|colou?rs?|design|template|logo|layout|font|look of (my|the) site)/i],

  ['Can I have more than one website?', 'Website & Content',
   /(multiple|more than one|another|second|extra|additional) (site|website)s?|sites|two websites/i],

  ['Changing my email or account details', 'Account & Security',
   /change (my )?(email|e.mail|phone|number|address|name on)|update (my )?(email|details|information)|wrong email/i],

  ['Asking to be called back', 'Support',
   /call me|please call|phone me|contact me at|reach me at|my number is|give me a call|callback/i],

  ['Unclear or general request for help', 'Getting Started',
   /^\s*(question|help|need help|i need help|confused|not working|everything|test|hi|hello|info|information)\s*$|help with everything|don.t (know|understand) (what|how)|not sure (what|how)/i],
];

/* --- classify --------------------------------------------- */
const counts = new Map();
let unmatched = 0;

for (const t of tickets) {
  const text = `${t.subject} ${t.body}`;
  const hit = RULES.find(([, , re]) => re.test(text));
  if (!hit) { unmatched++; continue; }
  const [intent, section] = hit;
  if (!counts.has(intent)) counts.set(intent, { intent, section, n: 0, samples: [] });
  const e = counts.get(intent);
  e.n++;
  if (e.samples.length < 3 && t.subject.length > 12) e.samples.push(t.subject.slice(0, 90));
}

const ranked = [...counts.values()].sort((a, b) => b.n - a.n);

/* --- does the knowledge base answer it? ------------------- */
/* A canonical phrasing per intent. Probing with one customer's subject line
   measures that person's wording, not whether the topic is covered. */
const PROBE = {
  'Requesting a refund or cancellation': 'How do I request a refund?',
  'Refund not received or still pending': 'I submitted a refund request but have not received a response',
  'Unauthorised or unexpected charge': 'I see an unexpected or unauthorized charge on my account',
  'Says it is a scam or misleading advertising': 'The service was misrepresented in the advertisement',
  'Cannot reach a person / AI call problems': 'I cannot reach anyone and my calls keep disconnecting',
  'When will I start earning?': 'How long does it usually take to generate revenue?',
  'Not earning / earnings too low': 'Why am I not making money yet?',
  'No traffic or visitors': 'Why is my website not receiving traffic?',
  'Setting up a payout method': 'How do I set up my payout method?',
  'How do I withdraw my earnings?': 'How do I withdraw my earnings?',
  'Cannot log in or access my account': 'I cannot log in to my account',
  'Accelerator or upgrade not showing': 'I paid for an upgrade but I do not see it',
  'What is the Accelerator and what does it cost?': 'What is the payment structure for the Accelerator Program?',
  'Changing my niche or category': 'How do I change the niche or product category of my website?',
  'Wrong or unwanted content on my site': 'Can I remove or replace products or content I do not want?',
  'Adding more articles or content': 'How do I add additional content to my website?',
  'Domain or site name questions': 'How can I change the name of my site and choose a domain name?',
  'How do I get started / what do I do now?': 'I am new. What should I do first?',
  'Site is not live or setup did not finish': 'How do I know whether my website is ready and live?',
  'When will my Success Manager contact me?': 'When will my Success Manager contact me?',
  'Boosters and traffic upgrades': 'What is the Free Traffic Boost?',
  'Billing, invoices and receipts': 'What exactly did I buy?',
  'Account or security concerns': 'How do I change the email address connected to my account?',
  'Dashboard, stats and what the numbers mean': 'What is the Dashboard and AI Assistant?',
  'Changing the design, theme or colours': 'Can I change the design or template of my website?',
  'Can I have more than one website?': 'Do I need multiple websites, or can I operate only one?',
  'Changing my email or account details': 'How do I change the email address connected to my account?',
  'Asking to be called back': 'How can I request a callback?',
  'Unclear or general request for help': 'I am new. What should I do first?',
};

for (const r of ranked) {
  const probe = PROBE[r.intent] || r.intent;
  r.probe = probe;
  const { article, score: s } = bestArticle(probe);
  r.best = article ? article.question : null;
  r.bestSection = article ? article.category : null;
  r.rightSection = article ? article.category === r.section : false;
  r.strength = s;
}

const total = tickets.length;
console.log(`${total} tickets · ${total - unmatched} classified · ${unmatched} unmatched (${Math.round(unmatched / total * 100)}%)\n`);

console.log('RANK  TICKETS   %   INTENT / SUPPORT CENTER SECTION');
console.log('─'.repeat(100));
ranked.slice(0, 20).forEach((r, i) => {
  const pct = (r.n / total * 100).toFixed(1);
  console.log(`${String(i + 1).padStart(3)}.  ${String(r.n).padStart(6)}  ${pct.padStart(4)}%  ${r.intent}`);
  console.log(`                     └─ section: ${r.section}`);
  console.log(`                        KB best match: ${r.best ? r.best.slice(0, 74) : 'NOTHING'}`);
  console.log(`                        ${r.rightSection ? 'lands in the right section' : 'LANDS IN ' + (r.bestSection || '—') + ' — wrong section'}`);
});

fs.writeFileSync('analysis/ranked.json', JSON.stringify(ranked, null, 1));
console.log('\nfull ranking written to analysis/ranked.json');
