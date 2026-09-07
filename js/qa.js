/* ============================================================
   Help Center — "Find an Answer".

   Three states, one view:

     browse  hero search + popular questions + topic grid
     topic   one category's articles, reached from the grid
     search  ranked results for a query, from any state

   Search scoring, the synonym table and the category order are
   carried over unchanged from the original file, so a given
   query returns the same ranked results it always did.

   data/kb.json (184 KB) is fetched lazily on first entry.
   ============================================================ */

import { esc, byId, registerActions, loadJSON, renderError } from './dom.js';

const PAGE_SIZE = 18;

/** Category order. Kept from the original QA_FILTERS, minus "All". */
export const QA_FILTERS = [
  'All', 'Getting Started', 'Building My Site', 'Dashboard & Access',
  'Website & Content', 'Traffic & Boosters', 'Earnings & Payouts',
  'Purchases & Billing', 'Support', 'Refunds', 'Account & Security',
];

const POPULAR_QUESTIONS = [
  'I am new. What should I do first?',
  'What exactly did I buy?',
  'How does traffic become revenue?',
  'How do withdrawals and payouts work?',
  'What is the Free Traffic Boost?',
  'When will my Success Manager contact me?',
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
};

let KB = [];
let CATEGORIES = [];
let state = 'browse';
let activeCat = 'All';
let qaLimit = PAGE_SIZE;
let loaded = false;
let loading = null;
let onEscalate = { solved() {}, notSolved() {} };

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
  const browsing = state === 'browse';

  byId('qaHeader').classList.toggle('compact', !browsing);
  byId('qaCrumb').hidden = browsing;
  byId('topicGrid').hidden = !browsing;
  byId('qaResultsWrap').hidden = browsing;
  byId('popularQs').hidden = !browsing;
}

/** The topic grid — the Help Center's landing state. */
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
  byId('qaCrumbLabel').textContent = cat;

  applyState();
  renderQA();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSearchState(query) {
  state = 'search';
  byId('qaTitle').textContent = 'Search results';
  byId('qaSubtitle').textContent = `Showing matches for “${query}”.`;
  byId('qaCrumbLabel').textContent =
    activeCat === 'All' ? 'Search' : `${activeCat} · Search`;
  applyState();
}

/* ============================================================
   Rendering
   ============================================================ */

const answerHtml = a => `<div class="answer-full">${esc(a)}</div>`;

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
    + `<div class="a"><div class="answer-label">FULL ANSWER</div>${answerHtml(x.answer)}</div>`
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
      + `<div class="answer-actions">`
        + `<button class="btn green" type="button" data-action="qa-solved">`
          + `Yes, this solved it</button>`
        + `<button class="btn soft" type="button" data-action="qa-not-solved" `
          + `data-q="${esc(q)}" data-answer="${esc(top.question)}">`
          + `No, I still need help</button>`
      + `</div></div>`;

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
    smart.innerHTML =
      `<div class="answer-card">`
      + `<div class="answer-label">NO CLOSE MATCH</div>`
      + `<h3>I could not find a close answer</h3>`
      + `<p>Try a shorter question or browse the topics. If the Help Center `
      + `still cannot solve it, the Support path remains available.</p>`
      + `<div class="answer-actions">`
        + `<button class="btn soft" type="button" data-action="qa-not-solved" `
          + `data-q="${esc(q)}" data-answer="No matching answer">`
          + `Open support path</button>`
        + `<button class="btn soft" type="button" data-action="qa-home">`
          + `Browse all topics</button>`
      + `</div></div>`;

    renderResults([]);
    byId('qaMeta').textContent = '0 results';
    byId('qaMoreWrap').innerHTML = '';
  }
}

export function appendToSmartAnswer(html) {
  byId('smartAnswer').innerHTML += html;
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

export function initQA(escalateHandler) {
  onEscalate = escalateHandler;

  registerActions({
    'qa-home':  () => showBrowse(),
    'qa-topic': el => showTopic(el.dataset.category),
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
    'qa-solved': () => onEscalate.solved(),
    'qa-not-solved': el => onEscalate.notSolved(el.dataset.q, el.dataset.answer),
  });

  byId('qSearch').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchKB();
  });
}
