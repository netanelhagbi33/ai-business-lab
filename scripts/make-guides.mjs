/* ============================================================
   The seven Start Here guides.

   Each card on Start Here used to open one article from the
   Support Center. That article was written to answer one narrow
   question, so the card promised an overview and delivered a
   fragment — "Changing your niche" opened an answer that assumed
   you already knew whether your site was built.

   These guides replace that. Each one is written from every
   article on its subject, in the order a customer meets the
   problem, and ends where the reader can act.

   They are NOT in kb.json, and that is deliberate. A guide that
   covers a whole topic matches every search about that topic and
   outranks the specific articles — a broad answer beating the
   exact one is a search regression, and it has already happened
   twice in this knowledge base. The Support Center keeps the
   narrow articles; Start Here keeps the overviews.

   Run: node scripts/make-guides.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');

const GUIDES = [
{
  id: 'dashboard',
  icon: '🧩',
  title: 'Where is my dashboard',
  blurb: 'The chat screen you are on is your dashboard — here is how to use it.',
  sources: ['Where is my dashboard?', 'What is the Dashboard and AI Assistant?',
            'Where can I find my dashboard and website link?',
            'Can I access my dashboard from any device?',
            'Can I create a home-screen shortcut to my dashboard?'],
  body:
`**You are already in it.**
The chat screen you are looking at is your dashboard. There is no separate page to find, nothing to install, and no second login.

It looks like a conversation because that is how you operate it. You type what you want, or pick from the buttons, and the system does it.

**Everything lives behind the + icon**
Click the **+** to the left of the message box to see every action available to you:

- **Visit my site** — opens your public website
- **Check my stats** — impressions, clicks and revenue
- **Check billing** — your matured balance and withdrawal status
- **Daily earnings** — a day-by-day breakdown for a chosen month
- **Past withdrawals** — your withdrawal-request history
- **Payment method** — add, view or remove your payout method
- **Boost my site** — activates the free 24-hour visitor boost, once per day
- **Boost timer** — how much time is left on the current boost
- **Upgrades** — additional articles, a new logo, an SEO Boost
- **Clear chat** — hides previous messages from your view

You can also type the question in your own words instead. You do not need to memorise any of these.

**Getting back to it**
Sign in at https://aibusiness-lab.com/ from any device — computer, phone or tablet. It is the same dashboard on each of them, showing the same information.

**Keeping it one tap away**
On iPhone or iPad:

1. Open the link in Safari.
2. Tap the Share icon.
3. Select Add to Home Screen.
4. Tap Add.

On Android:

1. Open the link in Chrome.
2. Tap the three-dot menu.
3. Select Add to Home screen or Install app.
4. Confirm the shortcut.

The icon then sits on your home screen. You may still be asked to log in with your registration email and either your password or the phone number on your account.`,
},

{
  id: 'guarantee',
  icon: '🛡️',
  title: 'Guarantee and refunds',
  blurb: 'How the 100% and 200% guarantees work, and how to request a refund.',
  sources: ['How does the money-back guarantee work, and how do I request a refund?',
            'Does the money-back guarantee provide a 100% or 200% refund?',
            'How long does the refund process take?',
            'What should I do if my refund was processed but I have not received the funds?'],
  body:
`**Requesting a refund**
Open the **Support Center** in the sidebar. At the bottom of the page there is a box titled "Looking for a refund?" — press **Request a Refund**, describe what you are asking for, and submit.

Refund requests do not go through the article flow. They are submitted directly and tracked from the moment you send them, and they appear under **Support Tickets** in the sidebar with their status.

**The standard guarantee**
A refund request is eligible when it is submitted within **90 days** of the original purchase date.

- Each purchase and add-on is reviewed separately.
- Each is measured from its own purchase date, not from your first one.
- Approved amounts are returned through the same payment provider and method you originally paid with.

**The 200% guarantee**
The 200% guarantee is not automatic. It applies only when the published eligibility requirements are met.

In every case, the free 24-hour Boost must have been activated at least once.

Beyond that, one of the following must also be true:

- You did not earn your first $0.01 within the first week, measured by the advertising activity shown on your website dashboard.
- You actively promoted the website for 90 days according to our guidance, and completed at least three free support calls with a **Success Manager**.

If those requirements are not met you may still be eligible for a 100% refund under the standard policy, but not the additional 200%. Eligibility is reviewed against the activity and records on your account.

**After you submit**
Refund requests are usually reviewed within 24–48 hours. Once one is approved and processed, the money can take a further 3–7 business days to appear, depending on your bank or payment provider.

Follow the request under **Support Tickets** in the sidebar. If anything is unclear, reply on that same ticket rather than sending a second one — duplicates slow the review down rather than speeding it up.`,
},

{
  id: 'package',
  icon: '📦',
  title: 'What did I buy',
  blurb: 'What the initial package includes, and what the Accelerator adds.',
  sources: ['What exactly did I buy?', 'What are the program details, packages, and pricing?',
            'How many websites are included in my purchase?',
            'What is the payment structure for the Accelerator Program?'],
  body:
`**What the purchase is**
You bought access to a system that builds and runs a niche comparison website — a digital asset designed to attract traffic and earn from visitor activity.

The site is built with 30 comparison articles in the niche you chose during setup. These are content pages that compare and discuss products or topics. They are not physical products: there is nothing to buy in, store, sell or ship.

**What the initial package includes**

- One website
- The niche you selected, and a design template
- A domain or subdomain
- A logo
- 30 comparison articles
- Access to the AI Assistant and the website dashboard

**What you can do with it**
From the dashboard you can visit the website, view statistics and revenue, manage traffic boosts, add a payout method, review billing and purchases, and reach the Support Center.

**What the Accelerator adds**
The Accelerator is a one-time fee rather than a subscription. It is designed to push the website harder for a limited period, which can help bring income forward.

Other optional upgrades exist as well: custom domains, more content, traffic Boosters, SEO services, social media setup, branding, and additional websites. Availability and pricing vary, and your **Success Manager** can review your account and give you the current options.

**What is not promised**
Results, traffic and earnings are not guaranteed, and they take time to develop.

If something you paid for is not showing in your account, check your purchase history in Billing first. If it is still missing, ask through the **Support Center** in the sidebar with the purchase date, the product name and a screenshot of what you see.`,
},

{
  id: 'niche',
  icon: '🎯',
  title: 'Changing your niche',
  blurb: 'Picked the wrong topic? What can be changed, and when.',
  sources: ['How do I change the niche or product category of my website?',
            'Can my website’s niche be changed after the site has been created?',
            'Can I add multiple categories or topics to the same website?',
            'I selected one niche, but my account shows another niche. How can I correct it?'],
  body:
`**It turns on one thing: has the website been built yet?**

**Before your website has been created**
Nothing is locked in. The niche, the design, the business name and the logo can all still be changed by you:

- Edit your answers as you move through the setup stages.
- Change them at the final review step, before you confirm.
- Or go back to the beginning and run the setup again.

**Once your website is live**
The niche can no longer be changed from the AI Assistant or the dashboard. Your articles, categories, design and structure were all built around the niche you picked, so changing it means rebuilding the site rather than editing a setting.

It can still be done, but not by you. Ask through the **Support Center** in the sidebar. The request goes to your assigned **Success Manager**, who reviews what you want, explains the available options, and handles the change.

**If the niche on your account is not the one you chose**
That is a different problem, and worth reporting straight away rather than living with. Report which niche you selected and which one your account shows, through the **Support Center** in the sidebar.

**Adding a second topic instead of changing this one**
A website is built around one fixed niche, and a second category cannot be added to it.

You can add far more articles within your existing niche, and additional article packages are available through your **Success Manager**. A genuinely different topic is a second website rather than a change to this one.`,
},

{
  id: 'design',
  icon: '🎨',
  title: 'Colours, theme and logo',
  blurb: 'Too dark, wrong style, not your brand — all of it can change.',
  sources: ['Can I change the design after my website is live?',
            'How do I change my website’s colors, font, or theme?',
            'Does changing the website theme require the site to be rebuilt?',
            'Why is the Logo Generator missing from my dashboard?'],
  body:
`**None of it is permanent**
Colours, fonts, the theme, the logo and the overall appearance can all be changed after the site is live — including a complete reset if you want to start the look again from scratch.

**Changing the theme does not rebuild the site**
Only the visual layer is adjusted: layout, colours, fonts and appearance. Your articles, products, domain and website data stay exactly as they are. Swapping a dark theme for a bright one costs you no content.

**Before your website has been created**
You can change your design selections yourself during setup — edit your answers as you go, change them at the final review step, or start over from the beginning.

**Once your website is live**
Design changes can no longer be made through the AI Assistant or the dashboard. Ask through the **Support Center** in the sidebar and describe the look you want: brighter, darker, cleaner, closer to your brand. The request goes to your assigned **Success Manager**.

Design work is handled as a separate package from the one that built your website, so your **Success Manager** will explain the available options and what each involves before anything changes.

**The logo**
There is no Logo Generator inside the dashboard. It is not a self-service feature, so it is not missing from your account and nothing is broken.

Logo creation and logo upgrades are handled through your **Success Manager**, who can explain the available options and help you choose one that fits the brand.`,
},

{
  id: 'login',
  icon: '🔑',
  title: 'How to log in',
  blurb: 'No password set, no email arrived, or the link keeps looping.',
  sources: ['Why can’t I log in to my dashboard?',
            'Why does my login keep sending me to the password reset page?',
            'How do I know what my password is if I haven’t had to put it in ?',
            'How do I create or reset my password?',
            'What should I do if I did not receive my login email despite it being resent?'],
  body:
`**Where to sign in**
Go to https://aibusiness-lab.com/ directly. Use the email address you registered with as your username.

You can then sign in with either:

- Your password
- The phone number connected to your account

**If you never set a password**
That is normal and nothing is wrong. Sign in with your email address and the phone number on your account instead.

**If you need one**
Ask through the **Support Center** in the sidebar, using the email address connected to your account. The team verifies that you are the account owner, sets a password for you, and you change it to one only you know once you are back in.

Never send a password in a message — not one you already use, and not one you would like.

**If the login keeps sending you to the password-reset page**
This usually means the password is not recognised, was never set, or the link you opened belongs to the reset process rather than to the login itself.

Go directly to https://aibusiness-lab.com/ rather than through the link, and sign in with your email and phone number. If it still loops, send a screenshot of what appears to the Support Team so your account details can be checked.

**If the login email never arrived**
Check the spam and junk folders first, and search for the sender rather than the subject line. If it is genuinely not there, ask through the **Support Center** in the sidebar with the email address on your account, and your access is checked and restored.

**If your phone number is not accepted**
The number held on the account may be wrong, or missing its country code. Ask through the **Support Center** with the correct number, country code included, and it is updated for you.`,
},

{
  id: 'websites',
  icon: '🗂️',
  title: 'Additional website',
  blurb: 'What one purchase covers, and how to add another.',
  sources: ['How many websites are included in my purchase?',
            'Can I create more than one website?', 'How do I create a second website?'],
  body:
`**What one purchase covers**
Your initial purchase includes one website:

- The niche you selected in the AI Assistant
- A website template
- A domain
- A logo
- 30 articles

One purchase is one website. A single site is built around one fixed niche and cannot carry a second category, so a genuinely different topic means a second website.

**Adding another**
Additional websites are available as a package through your **Success Manager**. There is no limit to how many you can run under the same account.

Once the package is on your account, you set the new site up through the AI Assistant the same way as the first:

1. Choose the new niche.
2. Select a template.
3. Set up the domain.
4. Create the logo.
5. Generate the website content.

The new site is managed under the same account and keeps its own niche, content and activity.

**If you expected more than one and only see one**
Check your purchase history in Billing first. If you believe an additional website was included or already paid for and it is not there, ask through the **Support Center** in the sidebar with the purchase details so the fulfilment status can be checked.`,
},
];

/* ============================================================
   Guards
   ============================================================ */
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
const html = fs.readFileSync('index.html', 'utf8');
const { richText, renderArticle } = await import('../js/dom.js');

let clean = true;
const chk = (ok, m) => { console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${m}`); if (!ok) clean = false; };

console.log('GUIDES');
for (const g of GUIDES) {
  const words = g.body.split(/\s+/).length;
  console.log(`  ${g.icon} ${g.title.padEnd(26)} ${String(words).padStart(4)} words, `
            + `${g.sources.length} sources`);
}

console.log('\nchecks:');
chk(GUIDES.length === 7, 'seven guides');
chk(new Set(GUIDES.map(g => g.id)).size === 7, 'every id is distinct');
chk(GUIDES.every(g => g.title && g.blurb && g.body && g.icon), 'none is missing a field');

// Every source named actually exists, so a guide cannot claim to be built
// from an article that was renamed or removed.
const missing = GUIDES.flatMap(g => g.sources.filter(s => !kb.some(a => a.question === s))
                                             .map(s => `${g.id}: ${s}`));
chk(missing.length === 0, 'every named source article exists');
missing.forEach(s => console.log('          ' + s));

// The bodies go through the same renderer as the articles.
const rendered = GUIDES.map(g => renderArticle(g.body)).join('');
chk(!rendered.includes('**'), 'no ** survives rendering');
chk(!/<p>[-•*] /.test(rendered), 'no bullet is left as a paragraph');
chk(GUIDES.every(g => ((g.body.match(/\*\*/g) || []).length) % 2 === 0),
    'every emphasis marker is paired');
chk(!/<strong>[^<]*<strong>/.test(rendered), 'no nested emphasis');

// The rules the knowledge base is held to apply here too.
chk(!/\b60[\s-]days?\b/.test(JSON.stringify(GUIDES)), 'no stale 60-day rule');
chk(!/\b(two|2) articles\b/i.test(JSON.stringify(GUIDES)),
    'the ticket threshold stays unpublished');
chk(!/\bopen a (support )?ticket\b/i.test(JSON.stringify(GUIDES)),
    'no guide tells the reader to open a ticket');
chk(!/24\s*[–—-]\s*72/.test(JSON.stringify(GUIDES)), 'no contact-time promise');
chk(!/@(gmail|yahoo)\.com|\b\d{3}-\d{3}-\d{4}\b/.test(JSON.stringify(GUIDES)),
    'no personal data');

// Every mention of the role is emphasised, as in the knowledge base.
const unbolded = GUIDES.filter(g =>
  /\bSuccess Managers?\b/.test(g.body.replace(/\*\*[^*\n]+\*\*/g, ''))).map(g => g.id);
chk(unbolded.length === 0, 'Success Manager is emphasised throughout');
unbolded.forEach(s => console.log('          ' + s));

// Each card on Start Here has to point at a guide that exists.
const wanted = [...html.matchAll(/data-guide="([^"]+)"/g)].map(m => m[1]);
if (wanted.length) {
  const unknown = wanted.filter(id => !GUIDES.some(g => g.id === id));
  chk(unknown.length === 0, `every card on Start Here points at a real guide (${wanted.length} cards)`);
  unknown.forEach(s => console.log('          ' + s));
} else {
  console.log('  INFO  the cards do not use data-guide yet');
}

if (!clean) { console.log('\nNot writing.'); process.exit(1); }

const out = GUIDES.map(({ id, icon, title, blurb, body, sources }) =>
  ({ id, icon, title, blurb, body, sources }));
if (WRITE) {
  fs.writeFileSync('data/guides.json', JSON.stringify(out, null, 1));
  console.log(`\nWrote data/guides.json — ${GUIDES.length} guides, `
            + `${(fs.statSync('data/guides.json').size / 1024).toFixed(1)} KB.`);
} else {
  console.log('\nDry run — pass --write to apply.');
}
