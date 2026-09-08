/* ============================================================
   Group 1 of the article-voice rewrite: the eight internal
   agent playbooks.

   These were never written for customers. They contain
   "Scenario 1 / Customer Response", instructions addressed to
   staff ("Internal Instructions for Support Agents", "do not
   answer before completing the following verification"),
   quoted scripts for an agent to read aloud, and
   "[Insert customer's username]" fields an agent was meant to
   fill in per person.

   Every fact below is carried over from the original or from
   another article in the same knowledge base. Nothing is
   invented; sources are named per entry.

   Run: node scripts/rewrite-playbooks.mjs [--write]
   ============================================================ */
import fs from 'fs';

const WRITE = process.argv.includes('--write');

const REWRITES = [
  {
    // Hybrid: the customer-facing answer above the heading is complete and
    // correct on its own. Only the appended staff policy is cut.
    match: 'If Support sets up or resets my password, does it become a shared password between me and the company?',
    why: 'A sound customer answer with an "Internal Instructions for Support Agents" policy block appended to the end.',
    truncateAt: 'Internal Instructions for Support Agents',
  },

  {
    match: 'What should I do now regarding my website?',
    why: 'Two "Case N" branches with quoted scripts for an agent to read out.',
    answer:
`What to do next depends on whether your website is live yet.

**If you have not created your website**
You are in your dashboard, which also works as your AI Assistant. Complete the first four steps to create your website. You choose:
1. A niche
2. A website template
3. A domain name
4. A logo
Once you complete these steps, your website goes live within a few moments.

**If your website is already live**
Your website is running and can generate revenue. You can view your earnings directly through your AI Assistant.

In both cases, your Success Manager will contact you soon to explain the product in more detail and guide you through the next stage.`,
  },

  {
    match: 'Why does my live website say “Activate Your Account”?',
    why: '"Scenario 1 / Customer Response" structure, plus [Insert …] credential fields that only an agent could fill in.',
    answer:
`There are two reasons this message appears.

**Your purchase is already complete**
The most common cause is opening the original purchase or activation link a second time instead of signing in to your existing account. Your purchase is already complete and you do not need to activate or pay again.
Sign in through your account's login page rather than the original purchase link. If you no longer have your login details, contact Support and your account details will be re-sent to you.

**No completed purchase was found**
If no successful transaction exists on the account, the message appears because the account has not been activated yet.
Check whether the payment went through. If you believe you were charged, send Support the purchase receipt or the transaction details and the payment will be investigated.`,
  },

  {
    match: 'Why does my my site say active your account ?',
    why: '[Insert …] credential fields and a chat sign-off. Near-duplicate of the article above, kept because customers phrase it this way.',
    answer:
`Your website is already live. This message usually appears when the original purchase link is opened again instead of signing in to your existing account. You do not need to activate your account a second time.

Sign in through your account's login page rather than the original purchase link. If you no longer have your login details, contact Support and your account details will be re-sent to you.`,
  },

  {
    match: 'User reports repeated disconnected calls and inability to get support.',
    why: 'Agent-facing question, and the answer was about "Activate Your Account" — it did not answer the question at all.',
    // Rewritten as the customer question it should have been. Facts from
    // "How can I request a callback?" and "What should I do if no one has
    // contacted me after my purchase?".
    question: 'My calls keep disconnecting and I cannot reach anyone. What should I do?',
    answer:
`If calls drop or you cannot get through by phone, you do not need to keep retrying. Requests can be logged in writing and a callback arranged.

Contact Support through the AI Assistant or open a Support Ticket describing the problem. Support will verify your account and leave a callback request for your assigned Success Manager.

Please remain available by phone once the request is logged. The call may come from a number with a New York area code, so it can appear unfamiliar.`,
  },

  {
    match: 'How do I change the niche or product category of my website?',
    why: 'Opened with "Internal Instructions for Support Agents" and told staff what to check before replying.',
    answer:
`Whether the niche can still be changed depends on how far your setup has progressed.

**Before your website has been created**
You can still change your selections through the AI Assistant. You can edit your answers during each stage, review and change them at the final step, or return to the beginning and restart the setup.

**Once your website is live**
The niche or product category can no longer be changed through the AI Assistant or the dashboard. Contact Support and the request will be passed to your assigned Success Manager, who will review what you want to change and explain the available options.`,
  },

  {
    match: 'I selected one niche, but my account shows another niche. How can I correct it?',
    why: 'A staff verification procedure ("Open the Conversations tab…"), and it broke off mid-sentence at "Customer Response — The Customer Is Correct".',
    answer:
`Contact Support and report which niche you selected and which one your account shows.

Your setup conversation with the AI Assistant is checked against the niche assigned to your website. If the two do not match, your account is corrected to the niche you originally selected and you are told once it has been updated. If they do match, you are shown the point in your setup conversation where the selection was made.

If you would like a different niche either way, the request is passed to your assigned Success Manager, who will explain the available options.`,
  },

  {
    match: 'How do I initiate a withdrawal and what are the rules associated with it?',
    why: 'Shipped with literal "[insert amount]" placeholders where the minimum and maximum should be, and described a generic "withdrawal section" that does not match the product.',
    // Facts from "How do I request a withdrawal?", "What does NET-45 mean?",
    // "What is the minimum amount required to withdraw?" and "How do
    // withdrawals and payouts work?" — the same articles that state $100.
    answer:
`Withdrawals are requested through the AI Assistant.

Ask the AI Assistant to help you request a withdrawal, or click the + icon to the left of the text field and select Check Billing. A billing window opens showing your earnings, available balance, pending earnings and withdrawal information. Click Request Withdrawal, enter the amount and submit.

Before you submit, all of the following must be true:
- A valid payout method is saved — PayPal, Wise or Bank Transfer.
- You have at least $100 in eligible earnings.
- Those earnings have completed the NET-45 clearance period, counted from the last day of the month in which they were generated.
- You are submitting between the 1st and the 14th of the month.

Approved payouts are sent on the 15th or 16th. If you miss the request window, the withdrawal waits for the next cycle. The time funds take to arrive after that depends on your payout method.`,
  },
];

/* ---------------------------------------------------------- */
const kb = JSON.parse(fs.readFileSync('data/kb.json', 'utf8'));
let applied = 0;
const missed = [];

for (const r of REWRITES) {
  const i = kb.findIndex(x => x.question === r.match);
  if (i === -1) { missed.push(r.match); continue; }

  console.log(`\n${'='.repeat(72)}`);
  console.log(`[${i}] (${kb[i].category})`);
  console.log(`WHY: ${r.why}`);
  console.log('-'.repeat(72));
  if (r.question) {
    console.log(`Q BEFORE:  ${kb[i].question}`);
    console.log(`Q AFTER :  ${r.question}`);
    console.log('-'.repeat(72));
  } else {
    console.log(`Q: ${kb[i].question}`);
    console.log('-'.repeat(72));
  }
  // An entry either supplies a replacement answer, or names the point to
  // cut at — used where the customer-facing text is sound and only an
  // appended staff block has to go.
  if (r.truncateAt && !kb[i].answer.includes(r.truncateAt)) {
    console.log(`!! truncation anchor "${r.truncateAt}" not found`);
    process.exit(1);
  }
  const next = r.truncateAt
    ? kb[i].answer.slice(0, kb[i].answer.indexOf(r.truncateAt)).trimEnd()
    : r.answer;

  console.log('BEFORE:');
  console.log(kb[i].answer.split('\n').map(l => '   ' + l).join('\n'));
  console.log('\nAFTER:');
  console.log(next.split('\n').map(l => '   ' + l).join('\n'));

  if (r.question) kb[i].question = r.question;
  kb[i].answer = next;
  applied++;
}

console.log(`\n${'='.repeat(72)}`);
console.log(`${applied} of ${REWRITES.length} rewritten.`);
if (missed.length) { console.log('NOT FOUND:', missed); process.exit(1); }

/* --- guard rails ------------------------------------------ */
const text = JSON.stringify(kb);
const checks = [
  [/\[insert[^\]]*\]/gi, 'unfilled [insert …] placeholder'],
  [/Internal Instructions for Support Agents/gi, 'staff-facing heading'],
  [/Customer Response/gi, '"Customer Response" header'],
  [/^(Scenario \d|Case \d)/gim, 'Scenario/Case branch header'],
  [/\bthe customer (probably|has|completed|reports|is)\b/gi, 'refers to "the customer"'],
];
console.log('\nremaining agent-playbook markers:');
let clean = true;
for (const [re, label] of checks) {
  const n = (text.match(re) || []).length;
  console.log(`  ${n === 0 ? 'OK  ' : 'LEFT'}  ${label}: ${n}`);
  if (n) clean = false;
}

if (!clean) { console.log('\nNot writing — playbook markers survive.'); process.exit(1); }

if (WRITE) {
  fs.writeFileSync('data/kb.json', JSON.stringify(kb, null, 1));
  console.log('\nWritten.');
} else {
  console.log('\nDry run — pass --write to apply.');
}
