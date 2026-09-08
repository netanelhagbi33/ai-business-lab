/* ============================================================
   Group 2: the remaining articles written as live-chat replies.

   These were agent messages, not articles: greetings, "I'm here
   to help", "just let me know!", full letter formats with
   "Dear Customer / Best regards", and in several cases one
   specific customer's balance quoted back as if it were
   everyone's.

   Rules followed throughout:
     - No fact is dropped. Where an answer had no facts at all
       ("Let me take care of that for you right now"), the facts
       are taken from the article that does state them, named in
       a comment.
     - One person's figures never appear. "$9.87 in revenue" and
       "you earned $1.27" describe individuals, not readers.
     - Policy figures stay: the $0.01 first-week threshold, the
       $99 and $297 prices, 60 days, 5-10 business days.

   Run: node scripts/rewrite-voice.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');

const REWRITES = [
  /* ---------- Getting Started ---------- */
  {
    match: 'I’m lost what do I do',
    why: '"No worries!" … "Just let me know if you need help with any specific step!"',
    answer:
`You are at the beginning of your digital asset journey.

Start by completing the setup steps: choose your niche, your design, your domain name and your logo. Once you finish these, your website goes live.

Your Success Manager will also reach out soon to guide you through the process.`,
  },
  {
    match: 'Should i be doing something differently',
    why: 'Opened by guessing at the reader\'s mood and closed offering "more tailored advice".',
    answer:
`Three things make the most difference to a website's performance:

1. **Activate your Daily Boost** — activate it every 24 hours for extra traffic.
2. **Promote your website** — share it on social media and in relevant online communities.
3. **Add more content** — additional articles expand what your website offers.`,
  },
  {
    match: 'We don\'t know what going on.Can you help me set it up',
    why: '"Hello! I\'m here to help you get started…" plus a closing offer to answer more questions.',
    answer:
`To create your first website, complete these four steps:

1. **Choose your niche** — the main category your website will focus on.
2. **Choose your design** — a website template and visual style.
3. **Choose your domain name** — an available name related to your chosen niche.
4. **Choose your logo** — the logo that will represent your website.

Once you finish these steps, your website goes live shortly. Your Success Manager will reach out to you soon to provide further guidance.`,
  },

  /* ---------- Dashboard & Access ---------- */
  {
    match: 'How can I get this on my computer? / I still need to know how to access my site?',
    why: 'The entire answer was a request for information — "Could you please confirm the email address associated with your purchase" — so it answered nothing.',
    // Facts from "Why does my live website say Activate Your Account?" and
    // "What should I do if I did not receive my login email…".
    answer:
`Your dashboard runs in a browser, so there is nothing to install. It works the same on a computer and on a phone.

Go to https://aibusiness-lab.com/ and sign in with the email address you registered with, using the password you set during registration. Use your account's login page rather than the original purchase link — opening the purchase link again shows an "Activate Your Account" message even though your account already exists.

If you do not have your login details, contact Support and they will be re-sent to you.`,
  },
  {
    match: 'How do I know what my password is if I haven’t had to put it in ?',
    why: '"just let me know, and I can help you with that!"',
    answer:
`If you have not set a password yet, you can log in using your email address and the phone number connected to your account.

If you need to reset your password, contact Support. A temporary password can be generated for you, and you can change it to one only you know after logging in.`,
  },
  {
    match: 'What should I do if I did not receive my login email despite it being resent?',
    why: 'A full letter: "Subject: Assistance with Your Login Email", "Dear Customer", "Best regards, AI Business Lab Support Team", and two requests for the reader to confirm details.',
    answer:
`First check the correct inbox, including spam and junk folders — login emails are often filtered there.

If you still cannot find it, you do not need the email to get in. Go to https://aibusiness-lab.com/ and sign in directly: your username is your registered email address, and your password is the one you set during registration.

If you still cannot log in, contact Support with the email address on your account and your access will be checked and restored.`,
  },

  /* ---------- Website & Content ---------- */
  {
    match: 'How do I add additional content for building my website?',
    why: '"Just let me know if you\'d like to proceed with that!" in the middle of a numbered list.',
    answer:
`There are two ways to add more content.

1. **Through your AI Assistant** — each purchase adds 5 new articles tailored to your website's niche.
2. **Through your Success Manager** — for more than 5 articles at a time. Your Success Manager can help find a package that suits your needs.`,
  },

  /* ---------- Traffic & Boosters ---------- */
  {
    match: 'Ok so how do I get to that ?',
    why: '"Dear Customer" … "Best regards, AI Business Lab Support Team".',
    answer:
`There are several ways to increase your website's visitors and clicks:

1. **SEO Boost** — improves your website's visibility in search engines, attracting more organic traffic over time.
2. **Content Expansion** — more articles give visitors more to engage with, which may lead to increased traffic and earnings.
3. **Custom Domain** — a custom domain gives your website a more professional appearance.

To proceed with any of these, discuss them with your Success Manager, who will help you choose the best strategy for your goals.`,
  },

  /* ---------- Earnings & Payouts ---------- */
  {
    match: 'am i on track to start making decent money?',
    why: '"It\'s great that you\'re looking to make decent money!" … "feel free to ask!"',
    answer:
`Earnings vary based on traffic volume and quality, so there is no single figure to compare yourself against.

What increases them is consistent activity: activate your Daily Boost regularly and promote your website through social media and other channels. Your Site Stats show your earnings and traffic, which is where you can see whether what you are doing is working.`,
  },
  {
    match: 'Do I use explodely as a payout method or click bank',
    why: '"please let me know!"',
    answer:
`Explodely and ClickBank are not payout methods for this account.

The supported payout methods are PayPal, Wise and Bank Transfer. You can set up your payout method directly through the AI Assistant.`,
  },
  {
    match: 'how can i make $500 per day with your system?',
    why: '"Hello! I appreciate your interest…" and a closing offer of further assistance.',
    answer:
`There is no guaranteed way to make $500 per day. Earnings depend on traffic and engagement, and building them takes time and consistent effort.

These are the things that increase your revenue potential:

1. **Activate your Daily Boost** — activate it every 24 hours to increase traffic to your website.
2. **Promote your website** — share it on social media, relevant online communities, and through referrals.
3. **Add more content** — additional articles expand your website's offerings, which can improve SEO and attract more traffic over time.
4. **Use your Boosters** — if you have purchased traffic optimization packages or Boosters, make sure they are active.
5. **Monitor your Site Stats** — regularly check your earnings and traffic to understand which strategies are working best.`,
  },
  {
    match: 'I had $12.98 in my app earlier, but I can\'t find it now. If I order the upgrade for $297, will my revenue increase faster, or do I need to wait for 45 days?',
    why: 'The whole answer was a quoted agent reply stating one customer\'s balance — "it shows that you currently have $9.87 in revenue" — which is wrong for every other reader. The question carried that person\'s figures too, so it is generalised while keeping the words people search for.',
    question: 'My revenue figure changed and I cannot find it. Will the $297 upgrade make my earnings arrive faster, or do I still have to wait 45 days?',
    answer:
`Your current revenue is shown in the Earnings section of the app, which is the accurate place to check it rather than a figure remembered from earlier.

The $297 upgrade can increase your revenue potential, but it does not shorten the NET-45 clearance period. Earnings still have to complete NET-45 before they can be withdrawn, and results vary based on activity and engagement.`,
  },
  {
    match: 'I know to boost my traffic every day, but that is all I can do on my end. Today, I received fewer clicks. My website value went up every day, but revenue $16.47 can you explain?',
    why: 'A full letter quoting one customer\'s revenue figure back at every reader. The question stated it too, so it is generalised while keeping the words people search for.',
    question: 'I boost my traffic every day but received fewer clicks today. My website value keeps going up while revenue stays low — can you explain?',
    answer:
`Fluctuations in traffic and clicks are normal. They happen for several reasons: changes in visitor behaviour, how well the content matches what people are searching for, and external factors such as market trends. Boosting every day increases your exposure, but the number of clicks still depends on how many visitors engage on any given day.

A website value that rises daily is a positive sign — it means the asset is developing. Revenue reflects the activity that has actually occurred on the site, so it usually lags behind. It takes time for consistent traffic and engagement to translate into higher earnings.

Continuing to activate your Daily Boost and promoting your website through social media and other channels is what increases visibility. Your Site Stats show which of those is working.`,
  },
  {
    match: 'Orientation I have not spoken to anyone regarding my site and would like some guidance. The site is not making much money.',
    why: '"Hello! … I\'m here to help you get started" and two separate closing offers.',
    answer:
`**If your setup is not finished**
You can still complete it by choosing your niche, design, domain name and logo. Once you finish these steps, your website goes live shortly.

**If earnings are lower than you expected**
It is common for new websites to take time to generate significant revenue. Activate your Daily Boost regularly, promote your website through social media and other channels, and consider adding more articles to expand your content and attract more visitors over time.

Your Success Manager will also reach out soon to provide further guidance and support.`,
  },
  {
    match: 'thinking I picked the wrong topic because it is not doing good. Suggestions?',
    why: '"I understand your concern…" … "just let me know!"',
    answer:
`A website generating little revenue early on does not necessarily mean the topic was wrong. Traffic and earnings take time to build up.

Keep activating your Daily Boost and promoting your site to increase visibility. If you do want to change the niche, that is possible before your website is created; once it is live the request goes through your Success Manager, who will explain the available options.`,
  },

  /* ---------- Purchases & Billing ---------- */
  {
    match: 'What is the payment structure for the Accelerator Program?',
    why: 'Asked the reader to supply "proof of what you\'re seeing" and closed with "feel free to reach out!".',
    answer:
`The Accelerator payment is a one-time fee. It is designed to give your website a boost for a limited period, which can help increase your income.

If the payment structure shown in your account does not match what you expected, contact Support with the details you are seeing so the difference can be investigated.`,
  },

  /* ---------- Support ---------- */
  {
    match: 'Please let them know to leave a message so I know they called and I will call them back.',
    why: 'A personal reply to a named customer — "Dear Dean" — forwarding one individual\'s request. It is not an article, and the general case is covered by "How can I request a callback?".',
    remove: true,
  },
  {
    match: 'Why is my upgrade not showing in my account?',
    why: 'Offered to check the reader\'s account and responded to an accusation of a scam. Neither belongs in an article.',
    // Facts from "I paid for an upgrade or Accelerator but I do not see it."
    answer:
`Purchased upgrades appear in your account under the Booster tab, so check there first.

If the upgrade is still not visible, contact Support with your purchase details and the purchase will be verified against your account. Do not create multiple tickets for the same purchase — duplicates slow the review down rather than speeding it up.`,
  },

  /* ---------- Refunds ---------- */
  {
    match: 'How do I cancel my subscription?',
    why: 'The answer contained no information at all: "Let me take care of that for you right now."',
    // Facts from "How do I cancel my subscription or stop participating?".
    answer:
`A cancellation request is handled as a refund request. Open Support and submit a Refund Request.

Once the request is received it can be tracked through the Support process, and you will receive updates as it is reviewed. The standard refund eligibility period is 60 days from the date of the relevant purchase, so the purchase date matters when the request is reviewed.`,
  },
  {
    match: 'How long will it take to receive the refund after it has been requested?',
    why: '"feel free to ask!"',
    answer:
`A refund typically takes 5-10 business days to process once it has been requested.

After it has been processed, the funds may take additional time to appear in your account, depending on your bank.`,
  },
  {
    match: 'How can I receive the 200% refund as explained in your promotional material?',
    why: 'Denied eligibility using one customer\'s earnings — "since you earned $1.27" — which tells every other reader they are ineligible for a reason that may not apply to them.',
    // Conditions quoted from "Does the money-back guarantee provide a 100% or
    // 200% refund?" — the $0.01 threshold there is policy, not a person's data.
    answer:
`The 200% guarantee is not automatic. It applies only when the published eligibility requirements are met, which are either:

- Not earning the first $0.01 within the first week through advertising activity shown on the website dashboard; or
- Actively promoting the website for 60 days according to our guidance and completing at least three free support calls with a Success Manager.

If any earnings were generated in the first week, the first condition is not met. If the requirements are not met you may still be eligible for a 100% refund under the standard refund policy, but not for the additional 200% guarantee.

Eligibility is reviewed based on the activity and records associated with your account.`,
  },
  {
    match: 'Does the money-back guarantee provide a 100% or 200% refund?',
    why: 'Opens "he 200% money-back guarantee" — the leading T is missing.',
    fixTypo: ['he 200% money-back guarantee is not automatic', 'The 200% money-back guarantee is not automatic'],
  },
  {
    match: 'Please DELETE MY BANK CARD HISTORY IMMEDIATELY!!! YOU GUYS WERE NOT HONEST AND AFTER YOU TOOK THE $99 DOLLARS FROM ME TOU HELPED YOURSELVES TO $67 DOLLARS MORE!!',
    why: 'An apology addressed to one angry customer, offering to "initiate that process for you right away".',
    answer:
`If a charge was taken that you did not expect, or you want your payment details removed, submit a Refund Request through Support and state clearly what you are asking for.

The request is tracked from the moment it is submitted, and you will receive updates as it is reviewed. Include the amounts and dates you are querying so the charges can be checked against your account.

If you also want one-to-one help with the package you purchased, your assigned Success Manager can be asked to contact you through the same request.`,
  },

  /* ---------- Account & Security ---------- */
  {
    match: 'Hello, I am wondering what plan I’m on. The ai tells me starter plan is that $297. What I paid is the $99 one off payment then was talked into the $297 plan so not sure what plan I’m on',
    why: '"Hello! I understand your confusion…" and a closing offer of assistance.',
    answer:
`Two different purchases are easy to confuse.

The **$99 one-time fee** is the standard package. It includes one website, a niche, a design template, a domain, a logo and 30 articles.

The **$297 payment** is the Accelerator Package, an optional upgrade designed to boost your website's traffic and earnings.

To confirm which of these are on your account, check your account details through the AI Assistant, or ask your Success Manager to confirm what has been purchased.`,
  },
  {
    match: 'How can I find my AI Account?',
    why: '"Hello! … please let me know, and I can assist you further!"',
    answer:
`Your AI Account is the chat interface, which also serves as the dashboard for your website. Everything related to your account is managed from there.`,
  },
  {
    match: 'I bought the Accelerator Package and it’s not showing up. When could someone reach out?',
    why: '"Dear Customer" … "I\'m here to help if you need anything else!"',
    answer:
`The Accelerator Package appears in your account under the **Booster** tab.

If it is not visible there, contact Support with your purchase details so it can be checked against your account.

Your Success Manager will also reach out to you soon to provide guidance and support.`,
  },
];

/* ---------------------------------------------------------- */
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
let rewritten = 0, removed = 0;
const missed = [];

for (const r of REWRITES) {
  const i = kb.findIndex(x => x.question === r.match);
  if (i === -1) { missed.push(r.match); continue; }

  console.log(`\n${'='.repeat(74)}`);
  console.log(`[${i}] (${kb[i].category})  ${kb[i].question.slice(0, 80)}`);
  console.log(`WHY: ${r.why}`);

  if (r.remove) {
    console.log('ACTION: removed');
    kb.splice(i, 1);
    removed++;
    continue;
  }

  if (r.fixTypo) {
    const [from, to] = r.fixTypo;
    if (!kb[i].answer.includes(from)) { console.log('!! typo anchor not found'); process.exit(1); }
    kb[i].answer = kb[i].answer.replace(from, to);
    console.log(`ACTION: fixed "${from.slice(0, 40)}…" -> "${to.slice(0, 40)}…"`);
    rewritten++;
    continue;
  }

  console.log('-'.repeat(74));
  // A few entries also replace the question: where the customer's own
  // wording carried their balance, it is generalised so the article title
  // is not one person's figures, while keeping the words people search for.
  if (r.question) {
    console.log(`Q BEFORE: ${kb[i].question}`);
    console.log(`Q AFTER : ${r.question}`);
    console.log('-'.repeat(74));
    kb[i].question = r.question;
  }
  console.log(r.answer.split('\n').map(l => '   ' + l).join('\n'));
  kb[i].answer = r.answer;
  rewritten++;
}

console.log(`\n${'='.repeat(74)}`);
console.log(`${rewritten} rewritten, ${removed} removed.`);
if (missed.length) { console.log('NOT FOUND:'); missed.forEach(m => console.log('  ' + m)); process.exit(1); }

/* --- guard rails ------------------------------------------ */
const text = JSON.stringify(kb);
const banned = [
  [/\blet me know\b/gi, '"let me know"'],
  [/feel free to (reach out|ask)/gi, '"feel free to…"'],
  [/I(?:'m| am) here to help/gi, '"I\'m here to help"'],
  [/^(?:Dear|Hello|Hi)[ ,!]/gim, 'a greeting opening an answer'],
  [/Best regards/gi, '"Best regards"'],
  [/I (?:can|will) (?:help|assist|check|follow up)/gi, 'agent first person'],
  [/\$9\.87|\$1\.27|\$16\.47|\$12\.98/g, "an individual customer's figures"],
  [/Dear Dean/gi, "a customer's name"],
];
console.log('\nchat markers remaining:');
let clean = true;
for (const [re, label] of banned) {
  const n = (text.match(re) || []).length;
  console.log(`  ${n === 0 ? 'OK  ' : 'LEFT'}  ${label}: ${n}`);
  if (n) {
    clean = false;
    kb.forEach((x, i) => {
      const q = (x.question.match(re) || []).length;
      const a = (x.answer.match(re) || []).length;
      if (q || a) console.log(`          [${i}] ${q ? 'question' : ''}${q && a ? ' + ' : ''}${a ? 'answer' : ''}: ${x.question.slice(0, 60)}`);
    });
  }
}

/* Policy figures must survive — they are what customers are entitled to. */
console.log('\npolicy figures kept:');
for (const p of ['$0.01', '$99', '$297', '60 days', '5-10 business days',
                 'three free support calls', '30 articles', 'NET-45']) {
  const ok = text.includes(p);
  console.log(`  ${ok ? 'OK  ' : 'LOST'}  ${p}`);
  if (!ok) clean = false;
}

if (!clean) { console.log('\nNot writing — a check failed.'); process.exit(1); }

if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
