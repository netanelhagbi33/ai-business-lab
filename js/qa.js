/* ============================================================
   Support Center — "Support Center".

   Three states, one view:

     browse  hero search + popular questions + topic grid
     topic   one category's articles, reached from the grid
     search  ranked results for a query, from any state

   Search scoring, the synonym table and the category order are
   carried over unchanged from the original file, so a given
   query returns the same ranked results it always did.

   data/kb.json (184 KB) is fetched lazily on first entry.
   ============================================================ */

import { esc, richText, byId, registerActions, loadJSON, renderError } from './dom.js';
import {
  markUnhelpful, markHelpful, markNoResults, isUnhelpful,
  canOpenTicket, REQUIRED_ATTEMPTS,
} from './support.js';

const PAGE_SIZE = 18;

/** Category order. Kept from the original QA_FILTERS, minus "All". */
export const QA_FILTERS = [
  'All', 'Getting Started', 'Building My Site', 'Dashboard & Access',
  'Website & Content', 'Traffic & Boosters', 'Earnings & Payouts',
  'Purchases & Billing', 'Support', 'Refunds', 'Account & Security',
];

/**
 * Chips run a real search, so each one must rank its intended article first.
 * Verified by scripts/verify-popular.mjs — add nothing here without running it.
 *
 * The two refund entries are among the most-asked questions. Answering them
 * up front IS deflection: someone who can read the 200% terms in one click
 * does not open a ticket to ask. They sit last so the hero does not lead
 * with refunds.
 */
const POPULAR_QUESTIONS = [
  'I am new. What should I do first?',
  'What exactly did I buy?',
  'How does traffic become revenue?',
  'How do withdrawals and payouts work?',
  'What is the Free Traffic Boost?',
  'When will my Success Manager contact me?',
  'How do I request a refund?',
  'How does the 200% refund work?',
];

const SYNONYMS = {
  boost:    ['booster', 'traffic', 'visitors', '24 hour', '24h', 'accelerator'],
  earn:     ['earning', 'earnings', 'revenue', 'money', 'income', 'profit'],
  withdraw: ['withdrawal', 'payout', 'payment method', 'wallet', 'paypal', 'wise', 'bank'],
  site:     ['website', 'business', 'storefront', 'domain'],
  build:    ['launch', 'setup', 'create', 'onboarding'],
  refund:   ['cancel', 'money back', 'return'],
  support:  ['ticket', 'callback', 'call back', 'human', 'success manager'],
  article:  ['content', 'products', 'keywords', 'niche'],
  // Customers describe a look rather than name a setting — "too dark",
  // "green earthy theme", "logo swap", "colors are awful". Without this
  // group none of those reached the design articles, which is why 114
  // tickets asked a question the knowledge base already answered.
  design:   ['colors', 'colours', 'color', 'colour', 'theme', 'template',
             'logo', 'font', 'layout', 'appearance', 'look', 'dark',
             'bright', 'style', 'branding'],
};

let KB = [];
let CATEGORIES = [];
let state = 'browse';
let activeCat = 'All';
let qaLimit = PAGE_SIZE;
let loaded = false;
let loading = null;

/* ============================================================
   Scoring — unchanged behaviour
   ============================================================ */

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function score(item, q) {
  const nq = norm(q);
  if (!nq) return 0;

  const qtxt = norm(item.question);
  const txt = norm(item.question + ' ' + item.category + ' ' + item.answer);
  const terms = nq.split(' ').filter(x => x.length > 1);

  let s = 0;
  terms.forEach(t => {
    if (txt.includes(t)) s += 2;
    if (qtxt.includes(t)) s += 5;
  });

  Object.entries(SYNONYMS).forEach(([key, arr]) => {
    if (nq.includes(key) || arr.some(a => nq.includes(a))) {
      if (txt.includes(key) || arr.some(a => txt.includes(a))) s += 6;
    }
  });

  if (qtxt.includes(nq)) s += 16;
  return s;
}

const catCount = c => (c === 'All' ? KB.length : KB.filter(x => x.category === c).length);
const catMeta = c => CATEGORIES.find(x => x.name === c) || { icon: '❓', blurb: '' };

function currentFiltered() {
  const query = byId('qSearch').value.trim();
  let items = KB.filter(x => activeCat === 'All' || x.category === activeCat);

  if (query) {
    items = items
      .map(x => ({ ...x, _s: score(x, query) }))
      .filter(x => x._s > 0)
      .sort((a, b) => b._s - a._s);
  }
  return items;
}

/* ============================================================
   State switching
   ============================================================ */

function applyState() {
  const browsing = state === 'browse';   // 'topic', 'search' and 'article' all compact

  byId('qaHeader').classList.toggle('compact', !browsing);
  byId('qaCrumb').hidden = browsing;
  byId('topicGrid').hidden = !browsing;
  byId('qaResultsWrap').hidden = browsing;
  byId('popularQs').hidden = !browsing;
}

/** The topic grid — the Support Center's landing state. */
export function showBrowse() {
  state = 'browse';
  activeCat = 'All';
  qaLimit = PAGE_SIZE;
  byId('qSearch').value = '';
  byId('smartAnswer').innerHTML = '';

  byId('qaTitle').textContent = 'How can we help?';
  byId('qaSubtitle').textContent =
    `Search ${KB.length} answers, or choose a topic below.`;

  applyState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function showTopic(cat) {
  state = 'topic';
  activeCat = cat;
  qaLimit = PAGE_SIZE;
  byId('qSearch').value = '';
  byId('smartAnswer').innerHTML = '';

  const meta = catMeta(cat);
  // aria-hidden: the icon is decoration, it should not be read as part
  // of the heading.
  byId('qaTitle').innerHTML =
    `<span class="topic-title-icon" aria-hidden="true">${meta.icon}</span>${esc(cat)}`;
  byId('qaSubtitle').textContent = meta.blurb;

  applyState();
  renderQA();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Open one named article on its own, with the topic grid hidden.
 * Used by the Start Here cards, which point at a specific answer rather
 * than at a topic or a search.
 */
export function showArticle(question) {
  const article = KB.find(x => x.question === question);
  if (!article) {
    console.warn('[qa] no article titled "%s"', question);
    showBrowse();
    return;
  }

  state = 'article';
  activeCat = article.category;
  byId('qSearch').value = '';
  byId('smartAnswer').innerHTML = '';

  const meta = catMeta(article.category);
  byId('qaTitle').innerHTML =
    `<span class="topic-title-icon" aria-hidden="true">${meta.icon}</span>${esc(article.category)}`;
  byId('qaSubtitle').textContent = meta.blurb;

  applyState();
  byId('qaMeta').textContent = '';
  renderResults([article]);
  byId('qaMoreWrap').innerHTML = '';

  // Open it — arriving here means the reader already chose this one.
  const row = byId('results').querySelector('.qa');
  if (row) {
    row.classList.add('open');
    row.querySelector('.q').setAttribute('aria-expanded', 'true');
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSearchState(query) {
  state = 'search';
  byId('qaTitle').textContent = 'Search results';
  byId('qaSubtitle').textContent = `Showing matches for “${query}”.`;
  applyState();
}

/* ============================================================
   Rendering
   ============================================================ */

const answerHtml = a => `<div class="answer-full">${richText(a)}</div>`;

/**
 * Every answer ends with this. It is the only route to a support ticket:
 * saying "No" on two different articles is what opens the form.
 */
function feedbackMarkup(question) {
  // An article the user already rejected renders in its answered state, so
  // re-opening it (or meeting it again in another search) shows what they
  // said rather than asking again as if nothing happened.
  const answered = isUnhelpful(question);

  return `<div class="article-feedback">`
    + `<span class="article-feedback-q">`
      + (answered ? 'You said this did not solve it.' : 'Did this solve your problem?')
    + `</span>`
    + `<span class="article-feedback-actions"${answered ? ' hidden' : ''}>`
      + `<button class="btn soft btn-sm" type="button" data-action="article-yes">`
        + `Yes, thanks</button>`
      + `<button class="btn soft btn-sm" type="button" data-action="article-no" `
        + `data-question="${esc(question)}">No, I still need help</button>`
    + `</span>`
    + `<div class="article-outcome"${answered ? '' : ' hidden'}>`
      + (answered ? outcomeMarkup(question) : '')
    + `</div>`
    + `</div>`;
}

/**
 * Swap a feedback block into its answered state. The label has to change
 * with the buttons, or an article answered in place would disagree with
 * the same article after the list re-renders.
 */
function answerFeedback(el, label, html) {
  const box = el.closest('.article-feedback');
  box.querySelector('.article-feedback-q').textContent = label;
  box.querySelector('.article-feedback-actions').hidden = true;
  const out = box.querySelector('.article-outcome');
  out.hidden = false;
  out.innerHTML = html;
}

/** What the user sees after saying an article did not help. */
function outcomeMarkup(question) {
  if (canOpenTicket()) {
    return `<div class="article-outcome-box unlocked">`
      + `<strong>We could not answer this one.</strong>`
      + `<p>You have tried ${REQUIRED_ATTEMPTS} articles without getting an `
      + `answer, so a person should take it from here.</p>`
      + `<button class="btn green" type="button" data-action="open-ticket" `
        + `data-question="${esc(question)}">Open a support ticket</button>`
      + `</div>`;
  }

  // Deliberately does not state the rule. Telling someone "one more and you
  // get a ticket" turns the gate into a two-click formality; the unlock is
  // better as a surprise once they have genuinely tried.
  return `<div class="article-outcome-box">`
    + `<strong>Noted — let's try one more.</strong>`
    + `<p>Most questions are answered somewhere in the Support Center. `
    + `Open another article that looks close to your problem, or search using `
    + `different words.</p>`
    + `<button class="btn soft" type="button" data-action="qa-home">`
      + `Browse all topics</button>`
    + `</div>`;
}

function renderTopicGrid() {
  byId('topicGrid').innerHTML = CATEGORIES.map(c => {
    const n = catCount(c.name);
    return `<button class="topic-card" type="button" `
      + `data-action="qa-topic" data-category="${esc(c.name)}">`
      + `<span class="topic-card-icon" aria-hidden="true">${c.icon}</span>`
      + `<span class="topic-card-name">${esc(c.name)}</span>`
      + `<span class="topic-card-blurb">${esc(c.blurb)}</span>`
      + `<span class="topic-card-count">${n} article${n === 1 ? '' : 's'}</span>`
      + `</button>`;
  }).join('');
}

function renderPopular() {
  byId('popularQs').innerHTML =
    '<strong>Popular:</strong>'
    + POPULAR_QUESTIONS.map(q =>
        `<button type="button" data-action="qa-ask" data-q="${esc(q)}">${esc(q)}</button>`
      ).join('');
}

function renderResults(items) {
  const el = byId('results');
  // Inside a topic every row shares one category, so the eyebrow is noise.
  // In search results, which span topics, it tells you where a hit came from.
  const showCategory = state !== 'topic';

  if (!items.length) {
    el.innerHTML =
      `<div class="qa-empty">`
      + `<strong>No answers found.</strong>`
      + `<p>Try fewer words, or `
      + `<button class="qa-link-btn" type="button" data-action="qa-home">`
      + `browse all topics</button>.</p>`
      + `</div>`;
    return;
  }

  el.innerHTML = items.map(x =>
    `<article class="qa">`
    + `<button class="q" type="button" data-action="qa-toggle" aria-expanded="false">`
      + `<span>${showCategory ? `<small>${esc(x.category)}</small>` : ''}`
      + `${esc(x.question)}</span>`
      + `<span class="qa-chev" aria-hidden="true">⌄</span>`
    + `</button>`
    + `<div class="a">`
      + `<div class="answer-label">FULL ANSWER</div>`
      + answerHtml(x.answer)
      + feedbackMarkup(x.question)
    + `</div>`
    + `</article>`
  ).join('');
}

export function renderQA() {
  const items = currentFiltered();
  const shown = items.slice(0, qaLimit);
  const query = byId('qSearch').value.trim();

  byId('qaMeta').innerHTML = query
    ? `${items.length} result${items.length === 1 ? '' : 's'}`
    : `${items.length} article${items.length === 1 ? '' : 's'} in this topic`;

  renderResults(shown);

  const remaining = items.length - shown.length;
  byId('qaMoreWrap').innerHTML = remaining > 0
    ? `<button type="button" class="btn soft" data-action="qa-more">`
      + `Show ${Math.min(PAGE_SIZE, remaining)} more</button>`
    : '';
}

export function searchKB() {
  const q = byId('qSearch').value.trim();

  // Empty search from a topic returns to that topic; from browse, stays home.
  if (!q) {
    byId('smartAnswer').innerHTML = '';
    if (activeCat === 'All') showBrowse();
    else showTopic(activeCat);
    return;
  }

  qaLimit = PAGE_SIZE;
  showSearchState(q);

  const items = currentFiltered();
  const smart = byId('smartAnswer');

  if (items.length) {
    const top = items[0];
    // Arguments ride on data attributes. The original interpolated
    // JSON.stringify(q) into an onclick, whose quotes closed the
    // attribute and left this button inert.
    smart.innerHTML =
      `<div class="answer-card">`
      + `<div class="answer-label">BEST MATCH</div>`
      + `<h3>${esc(top.question)}</h3>`
      + answerHtml(top.answer)
      + feedbackMarkup(top.question)
      + `</div>`;

    renderResults(items.slice(1, Math.min(qaLimit, items.length)));
    byId('qaMeta').innerHTML =
      `${items.length} result${items.length === 1 ? '' : 's'}`
      + (activeCat === 'All' ? '' : ` in <strong>${esc(activeCat)}</strong>`);

    const remaining = items.length - 1 - Math.max(0, Math.min(qaLimit, items.length) - 1);
    byId('qaMoreWrap').innerHTML = remaining > 0
      ? `<button type="button" class="btn soft" data-action="qa-more">`
        + `Show ${Math.min(PAGE_SIZE, remaining)} more</button>`
      : '';
  } else {
    // No article matched, so no article could have solved it. Sending this
    // user back through the funnel would just be an obstacle course.
    markNoResults(q);

    smart.innerHTML =
      `<div class="answer-card">`
      + `<div class="answer-label">NO CLOSE MATCH</div>`
      + `<h3>Nothing in the Support Center matches that</h3>`
      + `<p>Try shorter words or a different topic first — the answer may be `
      + `filed under wording you did not expect. If it really is not here, `
      + `open a ticket and a person will pick it up.</p>`
      + `<div class="answer-actions">`
        + `<button class="btn soft" type="button" data-action="qa-home">`
          + `Browse all topics</button>`
        + `<button class="btn green" type="button" data-action="open-ticket" `
          + `data-question="">Open a support ticket</button>`
      + `</div></div>`;

    renderResults([]);
    byId('qaMeta').textContent = '0 results';
    byId('qaMoreWrap').innerHTML = '';
  }
}

/* ============================================================
   Lazy load
   ============================================================ */

export function ensureLoaded() {
  if (loaded) return Promise.resolve();
  if (loading) return loading;

  byId('topicGrid').innerHTML =
    Array.from({ length: 10 },
      () => '<div class="skeleton topic-card-skeleton"></div>').join('');

  loading = Promise.all([loadJSON('data/kb.json'), loadJSON('data/categories.json')])
    .then(([kb, cats]) => {
      KB = kb;
      CATEGORIES = cats;
      loaded = true;
      renderTopicGrid();
      renderPopular();
      showBrowse();
    })
    .catch(err => {
      loading = null;
      renderError(byId('topicGrid'), err.message + ' — reload the page to try again.');
      throw err;
    });

  return loading;
}

/* ============================================================
   Wiring
   ============================================================ */

export function initQA() {
  registerActions({
    'qa-home':  () => showBrowse(),
    'qa-topic': el => showTopic(el.dataset.category),
    'qa-article': el => showArticle(el.dataset.question),
    'qa-ask':   el => { byId('qSearch').value = el.dataset.q; searchKB(); },
    'qa-search': () => searchKB(),
    'qa-more':  () => {
      qaLimit += PAGE_SIZE;
      if (state === 'search') searchKB(); else renderQA();
    },
    'qa-toggle': el => {
      const card = el.closest('.qa');
      const open = card.classList.toggle('open');
      el.setAttribute('aria-expanded', String(open));
    },
    'article-yes': el => {
      markHelpful();
      answerFeedback(el, 'You said this solved it.',
        `<div class="article-outcome-box solved">`
        + `<strong>Glad that helped.</strong>`
        + `<p>If something else comes up, search here again.</p></div>`);
    },

    'article-no': el => {
      const question = el.dataset.question;
      markUnhelpful(question, byId('qSearch').value.trim());
      answerFeedback(el, 'You said this did not solve it.', outcomeMarkup(question));
    },
  });

  byId('qSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchKB();
  });
}
