/* ============================================================
   Articles that ask for details and never say where to send them.

   Spotted in "How can I request a refund for a product or service
   I paid for but did not receive?", which reads:

     Please provide:
     The email address used for the purchase
     ...
     and we will submit the request for you

   That is a support agent's side of a conversation, kept as an
   article. The reader is asked for four things with nowhere to put
   them, and told somebody else will file the request — which is no
   longer true, because refunds are submitted by pressing Request a
   Refund. 28 articles across the knowledge base do some version of
   this.

   Two fixes here:

   1. The Refunds section now names the route. Only 6 of its 21
      articles said how a refund is actually requested; the rest
      discussed eligibility, amounts and timing as if the reader
      already knew. "I would like a refund" was the worst — a canned
      agent reply, in quotation marks, telling the reader their
      request had been received. It had not been.

   2. Everywhere else, a request for details now names its
      destination. The wording is "when you write to the Support
      Team" rather than an instruction to go and write: it answers
      where the details go without sending anyone to open a ticket
      they may not need.

   Deliberately untouched: "Do not send us your password", "Never
   send us your full card number". Those are warnings, not requests.

   Run: node scripts/fix-refund-route.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

/* The one way a refund is requested. */
const ROUTE = 'To request a refund, open the **Support Center** in the sidebar and press '
            + '**Request a Refund** in the "Looking for a refund?" box at the bottom of the page.';

/* ============================================================
   Refunds — full rewrites
   ============================================================ */
const REWRITES = [
{ q: 'How can I request a refund for a product or service I paid for but did not receive?', a:
`If you paid for a product, service or add-on that was never delivered or activated, the purchase can be reviewed and either delivered or refunded.

${ROUTE}

Include this in the request:
- The email address used for the purchase
- The name of the product or service you did not receive
- The purchase date and amount, if you have them
- That the item was never delivered or activated

The purchase is checked first to see whether it can still be delivered or activated. If you would rather not receive it, say so in the request and it is handled as a refund.

Refund requests must be submitted within **60 days** of the purchase date. Approved refunds are returned through the same payment provider and payment method used for the original purchase.` },

{ q: 'I would like a refund', a:
`${ROUTE} Describe what you are asking for and submit it.

Refund requests do not go through the article flow. They are submitted directly and tracked from the moment you send them, and they appear under **Support Tickets** in the sidebar with their status.

A request is eligible when it is submitted within **60 days** of the relevant purchase date. Each purchase and add-on is reviewed separately, from its own purchase date. Approved amounts are returned through the same payment provider and payment method used for the original purchase.` },

{ q: 'How can I confirm the amount of my refund?', a:
`A refund is calculated per transaction rather than as one lump sum. Your original purchase and each add-on are reviewed separately, and each has to fall inside its own 60-day window.

If you have already sent a refund request, open **Support Tickets** in the sidebar and reply on that ticket asking for the total. Include the email address used for the purchase.

If you have not requested one yet, the amount is confirmed as part of the review. ${ROUTE}

The review covers which transactions were included, the amount paid for each, whether each is inside its own 60-day window, and whether it has already been approved or processed. Once a refund is processed the amount also appears in the refund confirmation, and each approved transaction is returned through the same payment provider and payment method used for that purchase.` },

{ q: 'What should I do if I believe the service was misrepresented in an advertisement?', a:
`Concerns about what an advertisement promised are taken seriously. What was presented to you can be compared with the products and services actually active on your account, and any difference explained.

If something you purchased is missing, it is checked first to see whether it can still be delivered or activated.

If you would rather not continue, ${ROUTE.charAt(0).toLowerCase() + ROUTE.slice(1)}

Include this in the request:
- The email address used for the purchase
- A short explanation of what you expected to receive
- What appears to be different in your account
- A screenshot or copy of the advertisement, if you have one

Refund requests must be submitted within **60 days** of the relevant purchase date.` },

{ q: 'What should I do if my refund was processed but I have not received the funds?', a:
`Once a refund has been processed it usually takes 3–7 business days for the funds to appear, depending on your bank or payment provider.

If more than 7 business days have passed, open **Support Tickets** in the sidebar and reply on your refund ticket with:
- The email address used for the purchase
- The refund confirmation or approval date
- The transaction amount

The team can verify that the refund was processed and give you the confirmation or transaction reference. If it is confirmed as completed on our side, the remaining delay is with your bank or payment provider, who post the funds back to your account.` },

{ q: 'How do I create or reset my password?', a:
`The Support Team can create or reset the password connected to your account.

Ask through the **Support Center** in the sidebar, using the email address connected to your account. The team verifies that you are the account owner before anything is changed.

Never send a password in a message. One is set for you, and you can change it once you are back in. Choose a password you do not use for any other account.` },
];

/* ============================================================
   Refunds — articles that were only missing the route
   ============================================================ */
const APPENDS = [
  ['Am I eligible for the advertised money-back guarantee?', ROUTE],
  ['Can I request a refund for all of my purchases and add-ons?', ROUTE],
  ['Does the money-back guarantee provide a 100% or 200% refund?', ROUTE],
  ['How can I receive the 200% refund as explained in your promotional material?', ROUTE],
  ['How long does the refund process take?', ROUTE],
  ['How long will it take to receive the refund after it has been requested?', ROUTE],
  ['Where will my refunded funds be returned?', ROUTE],
];

/* ============================================================
   Everywhere else — a request for details gets a destination
   ============================================================ */
const E = [];
const edit = (qStart, from, to) => E.push({ qStart, from, to });

edit('How can I resolve a refund dispute before it escalates',
  'Send us that confirmation so we can verify the status and begin the refund process.',
  'Send that confirmation through the **Support Center** in the sidebar so the status can be '
  + 'verified and the refund started. If you have not requested a refund yet, press '
  + '**Request a Refund** in the "Looking for a refund?" box at the bottom of that page.');
edit('How can I confirm that my store is online',
  'send us the website domain and a screenshot of the issue so we can check its status and technical configuration.',
  'send the website domain and a screenshot of the issue to the Support Team, who can check its status and technical configuration.');
edit('My account says the website is live, but the website does',
  'please provide the website domain and a screenshot of the error message.',
  'send the website domain and a screenshot of the error message to the Support Team.');
edit('What should I do if I cannot access the dashboard link',
  'send us the error message or a screenshot.',
  'send the error message or a screenshot to the Support Team.');
edit('Why are my buttons disabled or grayed out?',
  'Please tell us which button appears grayed out, or send us a screenshot.',
  'Tell the Support Team which button appears grayed out, or send a screenshot.');
edit('Why does my dashboard link open and then immediately close',
  'send us a screenshot or screen recording, and we will check your account and login details.',
  'send a screenshot or screen recording to the Support Team, who will check your account and login details.');
edit('Why does my login keep sending me to the password reset',
  'send us a screenshot of what appears.',
  'send a screenshot of what appears to the Support Team.');
edit('Why is the Boosters section missing from my dashboard?',
  'please send us a screenshot.',
  'send a screenshot to the Support Team.');
edit('Why is contact information missing from my website footer?',
  'Please provide your website domain and, when possible, a screenshot showing the missing information so we can investigate the issue.',
  'Send your website domain to the Support Team and, when possible, a screenshot showing the missing information, so the cause can be investigated.');
edit('What should I do if a Booster or Article Pack I purchased',
  'Please provide the email address connected to your account and, when available, the purchase receipt or transaction details.',
  'Include the email address connected to your account and, when available, the purchase receipt or transaction details, when you write to the Support Team.');
edit('Why did my impressions, clicks, or earnings reset to zero?',
  'send us a screenshot and tell us when you last saw the previous totals.',
  'send the Support Team a screenshot and say when you last saw the previous totals.');
edit('Why does my balance appear to be decreasing?',
  'send us a screenshot and tell us the previous and current amounts.',
  'send the Support Team a screenshot with the previous and current amounts.');
edit('How can I get a receipt or invoice for my purchase?',
  'To request an invoice, please provide:',
  'To request an invoice, include this when you write to the Support Team:');
edit('I was charged, but my purchase is not showing in my dashboard',
  'please provide the Support Team with:',
  'include this when you write to the Support Team:');
edit('Why am I being asked to make another payment after completing',
  'Send us the page or a screenshot, and we will review the redirect.',
  'Send the page or a screenshot to the Support Team, who will review the redirect.');
edit('Why am I being redirected to pages asking me to make additional',
  'Send us the page or a screenshot, and we will review the redirect.',
  'Send the page or a screenshot to the Support Team, who will review the redirect.');
edit('Why is my upgrade not showing after payment?',
  'If the upgrade is still not displayed, please provide:',
  'If the upgrade is still not displayed, include this when you write to the Support Team:');
edit('How do I change my phone number?',
  'Please provide:',
  'Include this when you write to the Support Team:');
edit('How do I change the email address connected to my account?',
  'Please provide the following information:',
  'Include this when you write to the Support Team:');
edit('How do I correct an email address that was entered incorrectly',
  'Please provide:',
  'Include this when you write to the Support Team:');
edit('What should I do if I see an antivirus purchase prompt',
  'Send us the screenshot and page address so we can review the redirect or advertisement and take the necessary action.',
  'Send the screenshot and page address to the Support Team so the redirect or advertisement can be reviewed and acted on.');
edit('What should I do if my website asks visitors to enter credit',
  'Please provide the exact page where this appears and, when possible, a screenshot of the message.',
  'Send the Support Team the exact page where this appears and, when possible, a screenshot of the message.');

/* ============================================================
   Apply
   ============================================================ */
const one = qStart => {
  const hits = kb.filter(a => a.question.startsWith(qStart));
  if (hits.length !== 1) {
    console.log(`  MISS  "${qStart.slice(0, 56)}" matched ${hits.length}`);
    return null;
  }
  return hits[0];
};

let problems = 0;
console.log('FULL REWRITES');
for (const r of REWRITES) {
  const a = one(r.q);
  if (!a) { problems++; continue; }
  a.answer = r.a;
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 60)}`);
}

console.log('\nROUTE ADDED');
for (const [q, text] of APPENDS) {
  const a = one(q);
  if (!a) { problems++; continue; }
  if (a.answer.includes('Request a Refund')) {
    console.log(`  MISS  [${a.category}] ${a.question.slice(0, 48)} already names the button`);
    problems++;
    continue;
  }
  a.answer = a.answer.trimEnd() + '\n\n' + text;
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 60)}`);
}

console.log('\nDESTINATION ADDED');
for (const e of E) {
  const a = one(e.qStart);
  if (!a) { problems++; continue; }
  const n = a.answer.split(e.from).length - 1;
  if (n !== 1) {
    console.log(`  MISS  [${a.category}] ${a.question.slice(0, 44)} — "${e.from.slice(0, 46)}" x${n}`);
    problems++;
    continue;
  }
  a.answer = a.answer.replace(e.from, e.to);
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 60)}`);
}

console.log(`\n${REWRITES.length} rewritten, ${APPENDS.length} given the route, `
          + `${E.length} given a destination, ${problems} could not be applied`);
if (problems) { console.log('\nNot writing.'); process.exit(1); }

/* ============================================================
   Guard rails
   ============================================================ */
let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
console.log('\nchecks:');

// A Refunds article is about getting a refund or about following one already
// sent. The first kind must name the button; the second correctly points at
// Support Tickets instead, so either destination satisfies the rule.
const refunds = kb.filter(a => a.category === 'Refunds');
const noRoute = refunds
  .filter(a => !/Request a Refund/.test(a.answer) && !/Support Tickets/.test(a.answer))
  .map(a => a.question.slice(0, 46));
chk(noRoute.length === 0, 'every Refunds article names a destination');
noRoute.forEach(q => console.log('          ' + q));

chk(refunds.every(a => !/Request a Refund/.test(a.answer)
                    || /Looking for a refund\?/.test(a.answer)),
    'and says where that button is');

// "we will submit the request for you" is no longer true of anybody.
const filedForYou = kb.filter(a => /we will submit the request for you|start the process right away/i.test(a.answer))
                      .map(a => a.question.slice(0, 46));
chk(filedForYou.length === 0, 'no article claims somebody else files the request');
filedForYou.forEach(q => console.log('          ' + q));

// A request for details has to say where the details go.
const ASK = /please provide|provide the following|provide us with|provide the Support Team with/i;
const DEST = /Support Center|Support Tickets|Support Team|Request a Refund/;
const orphan = kb.filter(a => ASK.test(a.answer) && !DEST.test(a.answer))
                 .map(a => `[${a.category}] ${a.question.slice(0, 40)}`);
chk(orphan.length === 0, 'no article asks for details without naming a destination');
orphan.forEach(q => console.log('          ' + q));

// The security warnings must survive intact.
for (const phrase of ['Do not send us your password',
                      'Never send us your full card number']) {
  chk(kb.some(a => a.answer.includes(phrase)), `kept the warning: "${phrase}"`);
}
chk(!kb.some(a => /send us the new password/i.test(a.answer)),
    'no article asks a customer to send a password');

chk(kb.length === 232, 'no article was added or lost');
// An answer wrapped end to end in straight quotes is a pasted agent reply.
// An answer that merely opens with a quoted screen label — “In hold” — is not.
chk(!kb.some(a => /^"[\s\S]*"$/.test(a.answer.trim())),
    'no answer is a pasted agent reply');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
