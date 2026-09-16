/* ============================================================
   The Start Here guides.

   Seven cards on Start Here each open one of these. They are
   overviews written for someone who has just hit the problem and
   does not yet know which question to ask — which is exactly what
   a Support Center article is not, because an article answers one
   narrow question and assumes the rest.

   They live in data/guides.json rather than in kb.json on
   purpose. A guide that covers a whole topic matches every search
   about that topic and would outrank the specific articles; a
   broad answer beating the exact one is a search regression, and
   it has already happened twice here.

   Loaded on first open, like the knowledge base — nobody who
   never touches a card should pay for 14 KB of guide text.
   ============================================================ */

import { esc, byId, renderArticle, registerActions, renderError, loadJSON } from './dom.js';
import { showView } from './router.js';

let GUIDES = null;
let loading = null;
let pending = null;

/** Fetch once, and hand every later caller the same promise. */
function ensureLoaded() {
  if (GUIDES) return Promise.resolve(GUIDES);
  if (loading) return loading;
  loading = loadJSON('data/guides.json')
    .then(data => (GUIDES = data))
    .catch(err => {
      loading = null;
      renderError(byId('guideBody'), 'Could not load this guide. Please try again.');
      throw err;
    });
  return loading;
}

function markup(g) {
  const back = `<button class="btn soft help-back" type="button" data-action="view" data-view="home">`
             + `<span class="help-back-arrow" aria-hidden="true">←</span>Back to Start Here</button>`;

  return `<div class="help-back-row">${back}</div>`
    + `<div class="head">`
      + `<div class="title">`
        + `<div class="round" aria-hidden="true">${g.icon}</div>`
        + `<div><h1>${esc(g.title)}</h1><p>${esc(g.blurb)}</p></div>`
      + `</div>`
    + `</div>`
    + `<div class="answer-full guide-body">${renderArticle(g.body)}</div>`
    // The way out is repeated at the end. These run to 300 words, and a
    // control that is only at the top is off-screen by the time it is wanted.
    + `<div class="guide-foot">`
      + back
      + `<button class="btn green" type="button" data-action="view" data-view="qa">`
        + `Still need help? Search the Support Center</button>`
    + `</div>`;
}

/** Render one guide into the view. Assumes the data has landed. */
function render(id) {
  const el = byId('guideBody');
  if (!el) return;

  const g = (GUIDES || []).find(x => x.id === id);
  if (!g) {
    console.warn('[guides] no guide with id "%s"', id);
    renderError(el, 'That guide could not be found.');
    return;
  }
  el.innerHTML = markup(g);
  byId('topic-guide')?.setAttribute('aria-label', g.title);
}

/**
 * Open a guide by id.
 *
 * The view switch happens first so the page responds to the click straight
 * away; the content fills in when the fetch lands. Going through `pending`
 * means a second click while the first is still loading wins, rather than
 * both rendering in whatever order the network returns them.
 */
export function openGuide(id) {
  pending = id;
  showView('topic-guide');
  ensureLoaded().then(() => {
    if (pending !== id) return;
    pending = null;
    render(id);
  }).catch(() => {});
}

export function initGuides() {
  registerActions({
    'open-topic-guide': el => openGuide(el.dataset.guide),
  });
}
