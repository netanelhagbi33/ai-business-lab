/* ============================================================
   Entry point — boot order and cross-module wiring.

   Boot:
     1. delegation + modal (no data needed)
     2. steps.json + highlights.json  -> the guides can render
     3. kb.json is NOT fetched here; qa.js pulls it the first
        time the "Support Center" view is opened.
   ============================================================ */

import { initDelegation, registerActions, byId, loadJSON, renderError } from './dom.js';
import { showView, initNav, onViewChange } from './router.js';
import { setHighlights, setImageSizes, initModal } from './highlights.js';
import { initJourneys, openGuideStep, onGuideShown } from './journey.js';
import { initQA, ensureLoaded, showBrowse } from './qa.js';
import { initSupport, onSupportShown } from './support.js';
import { initSpotlight } from './spotlight.js';
import { initGuides } from './guides.js';

/* --- Actions that belong to no single module -------------- */
registerActions({
  view: el => showView(el.dataset.view),

});

initDelegation();
initModal();

initSupport();
initQA();

initNav();
initSpotlight();
initGuides();

/* --- View-change side effects ----------------------------- */
onViewChange(id => {
  onGuideShown(id);
  onSupportShown(id);
  // Arriving at the Support Center always lands on the topic grid. The
  // module keeps its own topic/search state, so without this you would come
  // back from another view into whatever topic you last opened — which reads
  // as the app having ignored the click. Navigation inside the Support
  // Center never routes through showView, so this cannot reset a drill-down.
  if (id === 'qa') {
    ensureLoaded().then(() => showBrowse()).catch(() => {});
  }
});

/* --- Data the guides need up front ------------------------ */
Promise.all([
  loadJSON('data/steps.json'),
  loadJSON('data/highlights.json'),
  loadJSON('data/image-sizes.json'),
])
  .then(([steps, highlights, sizes]) => {
    setHighlights(highlights);
    setImageSizes(sizes);
    initJourneys(steps);
  })
  .catch(err => {
    console.error(err);
    for (const id of ['buildSteps', 'liveSteps']) {
      renderError(byId(id), err.message + ' — reload the page to try again.');
    }
  });

// Home cards need openGuideStep before the journeys resolve;
// registerActions in journey.js covers it once data lands.
export { openGuideStep };
