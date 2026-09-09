/* ============================================================
   The knowledge base still taught the route we replaced.

   45 of 232 articles pointed at a "Support tab in the left-side
   menu", listed "the AI Assistant, Support, or a Support Ticket"
   as three channels a customer picks between, or told the reader
   to open a ticket outright. Two of those were false positives —
   the Boosters and Billing articles name the real left-side menu
   entries of the product, which still exist — leaving 43.

   Support now runs one way: the Support Center, the article, and
   only once the answers have genuinely run out does the ticket
   appear. A ticket already sent is read under Support Tickets.

   The rules the wording follows:
     · a new problem  -> "the Support Center in the sidebar"
     · an open ticket -> "Support Tickets in the sidebar"
     · a refund       -> Request a Refund, in the "Looking for a
                         refund?" box in the Support Center
     · never          -> "open a Support Ticket" as an instruction,
                         a channel list, a Support tab, the chat
                         bubble, or the number of articles it takes

   Nothing here is a blind regex over an answer. Articles whose
   subject IS the route are rewritten in full; the rest get exact
   sentence replacements that must match once and only once. An
   earlier tidy-up pass on this knowledge base ran a general
   substitution and silently rewrote eleven articles nobody had
   asked it to touch.

   Run: node scripts/fix-support-route.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));

/* One sentence, used wherever an article has to say what happens when the
   answers do not land. It never states how many articles it takes. */
const ESCALATE = 'If the answers do not solve it, the Support Center will offer to '
               + 'send your question to the Support Team.';

/* ============================================================
   Full rewrites — articles whose subject is the route itself.
   ============================================================ */
const REWRITES = [
{ q: 'Can I receive support from a person instead of the AI assistant?', a:
`Yes. A human Support Team handles every request the answers here cannot.

Start in the **Support Center** in the sidebar. Search your problem in your own words, or open the topic that matches it — most questions are already answered there, and that is the fastest way to get an answer at any hour.

At the end of each article, tell us whether it solved your problem. Once the answers have genuinely run out, the Support Center offers to send your question to the Support Team, and a representative replies during operating hours.

If you write outside operating hours you get an automatic confirmation, and the team replies once support is available again.

Phone calls are handled by your assigned Success Manager rather than by the Support Team.` },

{ q: 'Can I request a different Success Manager?', a:
`Yes. Open the **Support Center** in the sidebar and search for **Success Manager**. ${ESCALATE}

Explain why you are asking. The team documents the reason and forwards it to the relevant management team for review.

A reassignment depends on availability and approval, so a different Success Manager cannot always be guaranteed.` },

{ q: 'Can support contact me by email or text instead of by phone?', a:
`Yes. Written support is the normal channel. Anything you send through the **Support Center** is answered in writing, and relevant updates may also go to the email address connected to your account.

Text messaging is not a support channel.

Phone calls and callbacks are handled by your assigned Success Manager rather than by the Support Team. The Support Team can leave a callback request for your Success Manager when one is needed.` },

{ q: 'How can I check the status of a questionnaire I submitted?', a:
`The questionnaire is reviewed by the setup team, and its status is not shown in your dashboard.

To ask about yours, open the **Support Center** in the sidebar and search for **questionnaire**. ${ESCALATE} Include the email address connected to your account and, if you know it, roughly when you submitted it.

The team can confirm whether the questionnaire was received, whether it is still under review, whether processing has started, whether anything is missing, and whether the next stage of your website setup has begun.

Check the email address connected to your account as well, including the spam or junk folder — confirmations and follow-up questions are sent there.

Please do not submit the same questionnaire again unless you are asked to. Duplicate submissions delay the review.` },

{ q: 'How can I check the status of an existing support ticket?', a:
`Open **Support Tickets** in the sidebar. The tab appears once you have sent a ticket and stays there afterwards, and it lists every request you have sent with its current status — In Progress while the team is working on it, Closed once it is resolved. Open a ticket to read the latest reply.

Updates may also go to the email address connected to your account, so check there too, including the spam or junk folder.

While a ticket is open, keep using that same ticket for follow-up rather than sending a second one. Duplicates make the issue harder to track and can delay the review.` },

{ q: 'How can I request a callback?', a:
`Callbacks are handled by your assigned Success Manager rather than by the Support Team.

Open the **Support Center** in the sidebar and search for **callback**. ${ESCALATE} The team will pass the request to your Success Manager, who calls back based on their availability.

Include your full name, the email address on your account, your phone number with country code, and the reason for the call.

If you are a new customer and have not had your introductory call yet, your Success Manager should contact you soon. Keep your phone available — the call may come from a number with a New York area code.` },

{ q: 'How can I speak with a human representative?', a:
`Every request the answers cannot settle reaches a human.

Open the **Support Center** in the sidebar and search your problem in your own words, or open the topic that fits it. At the end of each article, tell us whether it solved your problem. Once the answers have genuinely run out, the Support Center offers to send your question to the Support Team, and a representative replies during operating hours.

Outside operating hours you get an automatic confirmation, and the team replies once support is available again.

For additional services, upgrades, traffic, content, SEO, social media or additional websites, you can also ask to speak with your assigned Success Manager.` },

{ q: 'How do I open a Support Ticket?', a:
`Support starts with the answers rather than with a form.

Open the **Support Center** in the sidebar and search your problem in your own words, or open the topic that matches it. Most questions are answered there in one short article, which is faster than waiting for a reply.

At the end of every article, tell us whether it solved your problem. Once the answers have genuinely run out, the Support Center offers to send your question to the Support Team, and what you were reading is carried into the request for you.

A **Support Tickets** tab then appears in the sidebar. Every ticket you have sent is read there, with its status and the replies on it.

When you do write to the team, describe the issue clearly and include whatever helps:
- Your website domain
- The feature or page involved
- A screenshot, or the error message
- Purchase details, when the issue involves a payment or a product

Please do not send a second request for the same issue. Duplicates delay the review rather than speeding it up.` },

{ q: 'How do I reopen a ticket that was not resolved correctly?', a:
`Open **Support Tickets** in the sidebar and select the ticket. Add a new message on that same ticket explaining:
- What part of the issue is still unresolved
- What result you expected
- Any new details, screenshots or error messages

If the ticket is closed and you cannot reply to it, send the ticket number and the email address connected to your account. The previous resolution can be reviewed, the case reopened, and sent back to the right team.

You can also reply to the ticket's email conversation — your reply is added to the existing case.

Please do not start a new ticket for the same issue. Reopening the existing one keeps the full history with it and avoids delays.` },

{ q: 'How long does it take for a support ticket to be answered?', a:
`There is no single response time for every ticket. It depends on the type of request, how complex it is, and which team handles it.

The fastest way to follow one is to open **Support Tickets** in the sidebar and read its status and latest reply. Updates may also go to the email address connected to your account, so check there too, including the spam or junk folder.

While a ticket is open, continue on that same ticket rather than sending another one for the same issue.` },

{ q: 'How long does it take for my support ticket to be fulfilled?', a:
`The time depends on how complex the request is and how much the team is handling at that moment, so no single time applies to every ticket.

Open **Support Tickets** in the sidebar to see where yours stands. It shows In Progress while the team is working on it and Closed once it is resolved, and the latest reply from the team is on the ticket itself.` },

{ q: 'What should I do if my support ticket has not been answered?', a:
`First, check where it stands. Open **Support Tickets** in the sidebar to see the ticket and its current status, and check the email address connected to your account, including the spam or junk folder, since updates may be sent there.

If it still looks stuck, reply on the existing ticket with the ticket number and the email address connected to your account. The team can confirm the current status, which team is handling it, the most recent update, and whether anything is needed from you.

Please do not send another ticket for the same issue. Duplicates delay the review — replying on the existing ticket is what moves it.` },

{ q: 'What should I do if no one has contacted me after my purchase?', a:
`Your assigned Success Manager will contact you soon. Keep your phone available — the call may come from a number with a New York area code.

If you would like an update in the meantime, open the **Support Center** in the sidebar and search for **onboarding call**. ${ESCALATE} The team will verify your account and leave a callback request for your Success Manager.` },

{ q: 'What time can I expect my success manager to contact me?', a:
`An exact time cannot be guaranteed. Your Success Manager works Monday to Friday, 10am to 6pm New York time, and will try to reach you as soon as possible within those hours.

Keep your phone available — the call may come from a number with a New York area code.` },

{ q: 'When will I receive my onboarding phone call?', a:
`If you are a new customer, your assigned Success Manager will contact you soon. Keep your phone available — the call may come from a number with a New York area code.

If time has passed and no one has called, open the **Support Center** in the sidebar and search for **callback**. ${ESCALATE} The team will leave a callback request for your Success Manager.` },

{ q: 'Why can’t I find, open, or access my Support Ticket?', a:
`Check both places a ticket appears:
- **Support Tickets** in the sidebar. The tab appears once you have sent a ticket, and every ticket you have sent is listed there.
- The email address connected to your account, including the spam or junk folder, for the original confirmation and any updates.

If the ticket is missing, does not load, or the ticket number is not recognised, send us the ticket number and the email address connected to your account. The request can be found from your account details, and we can confirm whether it was created, its current status, which team is handling it, the latest update, and whether anything is needed from you.

Please do not send another ticket for the same issue until we confirm the original cannot be found.` },

{ q: 'Why is my upgrade not showing in my account?', a:
`Purchased upgrades appear in your account under the **Booster** tab, so check there first.

If it is still not visible, open the **Support Center** in the sidebar and search for your purchase. ${ESCALATE} The purchase is then verified against your account.

Include the purchase date, the product name, and a screenshot of what you see. Do not send several requests for the same purchase — duplicates slow the review down rather than speeding it up.` },

{ q: 'How do I cancel my order or stop participating in the program?', a:
`A cancellation is handled as a refund request.

Open the **Support Center** in the sidebar. In the box titled "Looking for a refund?" at the bottom of the page, press **Request a Refund**, state that you want to cancel, and submit it.

Refund requests do not go through the article flow. They are submitted directly and tracked from the moment you send them, and they appear under **Support Tickets** in the sidebar like any other ticket.` },

{ q: 'How do I request a refund?', a:
`Open the **Support Center** in the sidebar. In the box titled "Looking for a refund?" at the bottom of the page, press **Request a Refund** and submit the request for the relevant purchase.

Refund requests do not go through the article flow. They are submitted directly, because a refund needs to be tracked from the moment it is sent.

A refund request is eligible when it is submitted within **60 days** of the relevant purchase date. Each transaction or add-on is reviewed separately, and each is measured from its own purchase date. Once a refund is approved and processed, the time for the money to appear can depend on your payment provider or bank.

Keep everything about the refund on that same ticket, under **Support Tickets** in the sidebar, so its status can be followed from start to finish.` },
];

/* ============================================================
   Sentence replacements — articles that only point at the wrong
   destination in passing. Each `from` must appear exactly once.
   ============================================================ */
const SIDEBAR = 'ask through the Support Center in the sidebar';
const E = [];
const edit = (qStart, from, to) => E.push({ qStart, from, to });

edit('Why does my live website say',
  'contact Support and your account details will be re-sent to you.',
  `${SIDEBAR} and your account details will be re-sent to you.`);
edit('Why does my my site say active your account',
  'contact Support and your account details will be re-sent to you.',
  `${SIDEBAR} and your account details will be re-sent to you.`);
edit('Why was only one category selected during setup',
  'Contact Support and report which niche you selected and which one your account shows.',
  'Report which niche you selected and which one your account shows through the Support Center in the sidebar.');
edit('Why was only one category selected during setup',
  'Once the site is live, contact Support and the request is passed',
  `Once the site is live, ${SIDEBAR} and the request is passed`);
edit('How can I get this on my computer',
  'contact Support and they will be re-sent to you.',
  `${SIDEBAR} and they will be re-sent to you.`);
edit('How do I know what my password is',
  'If you need to reset your password, contact Support.',
  `If you need to reset your password, ${SIDEBAR}.`);
edit('My calls keep disconnecting',
  'Contact Support through the AI Assistant or open a Support Ticket describing the problem.',
  'Open the Support Center in the sidebar and search for the problem in your own words. '
  + 'If the answers do not solve it, the Support Center will offer to send it to the Support Team.');
edit('What is the Dashboard and AI Assistant?',
  'Open Support and review ticket status.',
  'Open the Support Center for answers, and Support Tickets to follow a request you have already sent.');
edit('What should I do if I did not receive my login email',
  'contact Support with the email address on your account and your access will be checked and restored.',
  `${SIDEBAR} with the email address on your account, and your access will be checked and restored.`);
edit('Can I change the design after my website is live?',
  'Contact Support, describe the look you want',
  'Ask through the Support Center in the sidebar, describe the look you want');
edit('Can I create more than one website?',
  'open Support with the purchase details',
  `${SIDEBAR} with the purchase details`);
edit('Can my website’s niche be changed after the site has been created',
  'Contact Support and the request goes to your assigned Success Manager',
  'Ask through the Support Center in the sidebar and the request goes to your assigned Success Manager');
edit('How do I change my website’s colors, font, or theme?',
  'Contact Support and your request goes to your assigned Success Manager',
  'Ask through the Support Center in the sidebar and your request goes to your assigned Success Manager');
edit('How do I change the niche or product category of my website?',
  'Contact Support and the request goes to your assigned Success Manager',
  'Ask through the Support Center in the sidebar and the request goes to your assigned Success Manager');
edit('I selected one niche, but my account shows another niche',
  'Contact Support and report which niche you selected and which one your account shows.',
  'Report which niche you selected and which one your account shows through the Support Center in the sidebar.');
edit('What exactly did I buy?',
  'and contact Support when needed.',
  'and reach the Support Center when needed.');
edit('Who selected the content and topics on my website?',
  'open Support and explain what you expected to see.',
  `${SIDEBAR} and explain what you expected to see.`);
edit('Why am I not making money yet?',
  'open Support with a screenshot so the account can be reviewed.',
  `${SIDEBAR} with a screenshot so the account can be reviewed.`);
edit('I paid for an upgrade or Accelerator but I do not see it',
  'Open Support and include the purchase date, product name and a screenshot',
  'Ask through the Support Center in the sidebar and include the purchase date, product name and a screenshot');
edit('What is the payment structure for the Accelerator Program?',
  'contact Support with the details you are seeing',
  `${SIDEBAR} with the details you are seeing`);
edit('I bought the Accelerator Package and it’s not showing up',
  'contact Support with your purchase details so it can be checked against your account.',
  `${SIDEBAR} with your purchase details so it can be checked against your account.`);
edit('How do I cancel my subscription or stop participating?',
  'If you want to cancel, open Support and submit a Refund Request.',
  'If you want to cancel, open the Support Center in the sidebar and press Request a Refund in the "Looking for a refund?" box.');
edit('How do I cancel my subscription?',
  'Open Support and submit a Refund Request.',
  'Open the Support Center in the sidebar and press Request a Refund in the "Looking for a refund?" box.');
edit('Please DELETE MY BANK CARD HISTORY',
  'submit a Refund Request through Support and state clearly what you are asking for.',
  'open the Support Center in the sidebar and press Request a Refund in the "Looking for a refund?" box, stating clearly what you are asking for.');
edit('What should I do if I submitted a refund request but have not',
  'please contact us again through Support or reply to your existing support ticket.',
  'open Support Tickets in the sidebar and reply on your existing refund ticket.');
edit('What should I do if the support ticket number I received',
  'please contact us through Support or submit a new support ticket.',
  'open Support Tickets in the sidebar to check it, and reply on the ticket.');
edit('How do I cancel my subscription or stop participating?',
  'The standard refund eligibility period in the provided Knowledge Base is 60 days',
  'The standard refund eligibility period is 60 days');
edit('How does the money-back guarantee work',
  ' You can also ask through the AI Assistant or open a Support Ticket if you prefer.',
  '');

/* ============================================================
   Apply
   ============================================================ */
const one = qStart => {
  const hits = kb.filter(a => a.question.startsWith(qStart));
  if (hits.length !== 1) {
    console.log(`  MISS  "${qStart}" matched ${hits.length} articles`);
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
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 62)}`);
}

console.log('\nSENTENCE REPLACEMENTS');
for (const e of E) {
  const a = one(e.qStart);
  if (!a) { problems++; continue; }
  const n = a.answer.split(e.from).length - 1;
  if (n !== 1) {
    console.log(`  MISS  [${a.category}] ${a.question.slice(0, 48)}`);
    console.log(`        "${e.from.slice(0, 70)}" appears ${n} times`);
    problems++;
    continue;
  }
  a.answer = a.answer.replace(e.from, e.to);
  console.log(`  ok  [${a.category}] ${a.question.slice(0, 62)}`);
}

console.log(`\n${REWRITES.length} rewritten, ${E.length} sentence edits, ${problems} could not be applied`);
if (problems) { console.log('\nNot writing.'); process.exit(1); }

/* ============================================================
   Guard rails
   ============================================================ */
// The two survivors are the product's real menu entries, not ours.
const KEEP = ['Why is the Boosters section missing from my dashboard?',
              'Where can I see what I purchased?'];
const OLD = [
  [/\bSupport tab\b/i,                   'a "Support tab"'],
  // "open Support Tickets" and "open the Support Center" are the destinations
  // this change is moving articles TO, so they are not the old wording.
  [/\bOpen(?:ing)? Support(?! Tickets| Center)\b/i, '"open Support"'],
  [/\bopen(?:ing)? a Support Ticket\b/i, 'telling the reader to open a ticket'],
  [/\bcreate a new ticket\b/i,           'telling the reader to create a ticket'],
  [/\bAI Assistant, Support\b/i,         'the old channel list'],
  [/\bthrough Support\b/i,               '"through Support"'],
  [/\bcontact Support\b/i,               '"contact Support"'],
  [/\bsupport chat bubble\b/i,           'the chat bubble'],
];

let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };
console.log('\nchecks:');

const stragglers = [];
for (const a of kb) {
  if (KEEP.includes(a.question)) continue;
  for (const [re, why] of OLD) {
    if (re.test(a.answer)) stragglers.push(`[${a.category}] ${a.question.slice(0, 40)} — ${why}`);
  }
}
chk(stragglers.length === 0, 'no article still teaches the old route');
stragglers.slice(0, 10).forEach(s => console.log('          ' + s));

const touched = [...REWRITES.map(r => r.q), ...new Set(E.map(e => e.qStart))];
const changed = kb.filter(a => touched.some(q => a.question.startsWith(q)));
chk(!changed.some(a => /\b(two|2) articles\b/i.test(a.answer)),
    'no article publishes how many attempts it takes');
chk(!changed.some(a => /\b(24|48|72)[–-]/.test(a.answer) && /Success Manager/.test(a.answer)),
    'no contact-time promise came back with the rewrites');
chk(!changed.some(a => /\bI have (updated|informed|notified)\b/i.test(a.answer)),
    'no article speaks as a live agent');
chk(!changed.some(a => /the material you provided|the provided Knowledge Base/i.test(a.answer)),
    'no article talks about its own source material');
chk(!changed.some(a => /\b\d{3}-\d{3}-\d{4}\b|@gmail\.com|@yahoo\.com/i.test(a.answer)),
    'no personal data introduced');
chk(kb.length === 232, 'no article was added or lost');
chk(changed.every(a => a.answer.trim().length > 40), 'no answer was emptied');

if (!clean) { console.log('\nNot writing.'); process.exit(1); }
if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
