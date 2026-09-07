/* ============================================================
   The two step-by-step guides ("build" and "live").

   Each journey owns: an ordered list of steps, the current
   index, and the set of completed step numbers. Both are
   restored from localStorage on boot and saved on every move.
   ============================================================ */

import { esc, byId, registerActions } from './dom.js';
import { showView } from './router.js';
import { highlightMarkup, firstHighlightLabel, sizeAttrs, IMG_DIR } from './highlights.js';
import { getJourneyIndex, getJourneyDone, saveJourneyState } from './store.js';

/** DOM element ids each journey renders into. */
const TARGETS = {
  build: {
    nav: 'buildNav', body: 'buildSteps', crumb: 'buildCrumb',
    text: 'buildProgressText', sub: 'buildProgressSub',
    bar: 'buildProgressBar', pct: 'buildProgressPct',
    view: 'guide-build',
  },
  live: {
    nav: 'liveNav', body: 'liveSteps', crumb: 'liveCrumb',
    text: 'liveProgressText', sub: 'liveProgressSub',
    bar: 'liveProgressBar', pct: 'liveProgressPct',
    view: 'guide-live',
  },
};

const JOURNEYS = {};

export function initJourneys(steps) {
  for (const path of ['build', 'live']) {
    const list = steps[path] || [];
    JOURNEYS[path] = {
      ...TARGETS[path],
      steps: list,
      index: clamp(getJourneyIndex(path), 0, Math.max(0, list.length - 1)),
      done: getJourneyDone(path),
    };
  }

  registerActions({
    'journey-step':  el => goJourney(el.dataset.path, Number(el.dataset.index)),
    'journey-prev':  el => prevJourney(el.dataset.path),
    'journey-next':  el => nextJourney(el.dataset.path),
    'open-guide':    el => openGuideStep(el.dataset.path, Number(el.dataset.index)),
  });

  renderJourney('build');
  renderJourney('live');
  updateHomeProgress();
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function save(path) {
  const j = JOURNEYS[path];
  saveJourneyState(path, j.index, j.done);
  updateHomeProgress();
}

export function renderJourney(path) {
  const j = JOURNEYS[path];
  if (!j) return;
  const { steps } = j;
  const step = steps[j.index];
  if (!step) return;

  byId(j.nav).innerHTML = steps.map((s, i) => {
    const isDone = j.done.has(s.n);
    const state = i === j.index ? 'You are here' : isDone ? 'Completed' : 'Not started';
    const classes = ['journey-step', i === j.index ? 'active' : '', isDone ? 'done' : '']
      .filter(Boolean).join(' ');
    return `<button class="${classes}" type="button" data-action="journey-step" `
         + `data-path="${path}" data-index="${i}">`
         + `<span>${isDone ? '✓' : i + 1}</span>`
         + `<div><b>${esc(s.title)}</b><small>${state}</small></div>`
         + `</button>`;
  }).join('');

  const positionPct = Math.round(((j.index + 1) / steps.length) * 100);

  byId(j.crumb).textContent = `Step ${j.index + 1}: ${step.title}`;
  byId(j.text).textContent  = `Step ${j.index + 1} of ${steps.length}`;
  byId(j.sub).textContent   = `${j.done.size} completed`;
  byId(j.bar).style.width   = positionPct + '%';
  byId(j.pct).textContent   = positionPct + '%';

  byId(j.body).innerHTML = lessonMarkup(path, j, step, positionPct);
  save(path);
}

function lessonMarkup(path, j, step, _pct) {
  const steps = j.steps;
  const images = step.images.map((file, idx) => {
    const action = firstHighlightLabel(file);
    const hint = action
      ? `<div class="shot-action-hint"><span class="hint-dot">↘</span>`
        + `<span>On this screen: <b>${esc(action)}</b></span></div>`
      : '';
    const caption = (step.images.length > 1
        ? `Example ${idx + 1} of ${step.images.length}`
        : 'Screen example')
      + ' · click image to enlarge'
      + (action ? ' · highlighted area shows where to click' : '');

    return `<figure class="journey-shot ${action ? 'has-action' : ''}">`
         + hint
         + `<div class="shot-stage">`
         + `<img src="${IMG_DIR}${esc(file)}"${sizeAttrs(file)} loading="lazy" decoding="async" `
         + `alt="Example screen for ${esc(step.title)}" `
         + `data-action="zoom-img" data-file="${esc(file)}">`
         + highlightMarkup(file)
         + `</div>`
         + `<figcaption>${caption}</figcaption>`
         + `</figure>`;
  }).join('');

  const isLast = j.index === steps.length - 1;

  return `<article class="lesson-card">`
    + `<div class="lesson-kicker">STEP ${j.index + 1} OF ${steps.length}</div>`
    + `<div class="lesson-title-row">`
      + `<div class="lesson-step-number">${j.index + 1}</div>`
      + `<div><h2>${esc(step.title)}</h2><p>${esc(step.simple)}</p></div>`
    + `</div>`
    + `<div class="lesson-explain">`
      + `<div class="what-card"><span>WHAT TO DO</span><p>${esc(step.simple)}</p></div>`
      + `<div class="remember-card"><span>KEEP IN MIND</span><p>${esc(step.tip)}</p></div>`
    + `</div>`
    + `<div class="journey-gallery ${step.images.length === 1 ? 'one' : ''}">${images}</div>`
    + `<div class="lesson-actions">`
      + `<button class="btn soft" type="button" data-action="journey-prev" `
        + `data-path="${path}" ${j.index === 0 ? 'disabled' : ''}>← Previous</button>`
      + `<button class="btn start-btn" type="button" data-action="view" `
        + `data-view="home">⌂ Start Here</button>`
      + `<button class="btn green" type="button" data-action="journey-next" `
        + `data-path="${path}">${isLast ? '✓ Finish guide' : 'Next →'}</button>`
    + `</div>`
  + `</article>`;
}

export function goJourney(path, index) {
  const j = JOURNEYS[path];
  if (!j) return;
  j.index = clamp(index, 0, j.steps.length - 1);
  renderJourney(path);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function prevJourney(path) {
  const j = JOURNEYS[path];
  if (j && j.index > 0) goJourney(path, j.index - 1);
}

export function nextJourney(path) {
  const j = JOURNEYS[path];
  if (!j) return;
  j.done.add(j.steps[j.index].n);

  if (j.index < j.steps.length - 1) {
    goJourney(path, j.index + 1);
  } else {
    save(path);
    showView('next-steps');
  }
}

/** Jump into a guide at a given step (used by the Home cards). */
export function openGuideStep(path, index) {
  const j = JOURNEYS[path];
  if (!j) return;
  j.index = clamp(index, 0, j.steps.length - 1);
  save(path);
  showView(j.view);
}

/** Called by the router when a guide view opens. */
export function onGuideShown(viewId) {
  if (viewId === 'guide-build') renderJourney('build');
  if (viewId === 'guide-live')  renderJourney('live');
}

/** Progress hints on the two Home cards. */
export function updateHomeProgress() {
  for (const path of ['build', 'live']) {
    const j = JOURNEYS[path];
    if (!j || !j.steps.length) continue;

    const pct = Math.round((j.done.size / j.steps.length) * 100);
    const status = byId(path + 'HomeStatus');
    const btn = byId(path + 'HomeBtn');

    if (status) {
      status.textContent = j.done.size
        ? `${pct}% complete · continue from step ${Math.min(j.index + 1, j.steps.length)}`
        : '';
    }
    if (btn && j.done.size && j.done.size < j.steps.length) {
      btn.textContent = 'Continue guide →';
    }
    if (btn && j.done.size === j.steps.length) {
      btn.textContent = 'Review completed guide →';
    }
  }
}
