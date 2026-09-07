/* ============================================================
   The one-time spotlight on the Start Here tab.

   Customers were missing the tab, so it gets a gold animated
   marker until they click it once — then it is gone for good,
   remembered in localStorage.

   Deliberately one-shot: a marker that keeps coming back stops
   being a signal and becomes decoration people learn to ignore.

   Demo mode: append ?spotlight to the URL and it shows no
   matter what is stored, and clicking it does NOT write the
   flag — so a reload brings it straight back. That is how you
   show the effect to someone who has already dismissed it,
   without clearing their real progress.
   ============================================================ */

import { $$ } from './dom.js';
import { getSpotlightSeen, setSpotlightSeen } from './store.js';

const SELECTOR = '.nav[data-view="home"]';
const CLASS = 'nav-spotlight';

/** ?spotlight forces the marker on and stops it being remembered. */
export const isDemo = () =>
  new URLSearchParams(window.location.search).has('spotlight');

/**
 * Take the marker down. `remember` is false in demo mode, so showing the
 * effect to someone never burns their real one-time hint.
 */
export function dismissSpotlight({ remember = true } = {}) {
  $$(`.${CLASS}`).forEach(el => {
    el.classList.remove(CLASS);
    el.removeAttribute('aria-describedby');
  });
  if (remember) setSpotlightSeen();
}

export function initSpotlight() {
  const demo = isDemo();
  if (!demo && getSpotlightSeen()) return;

  const targets = $$(SELECTOR);
  if (!targets.length) return;

  targets.forEach(el => {
    el.classList.add(CLASS);
    el.setAttribute('aria-describedby', 'spotlightHint');

    // Capture, so the marker clears alongside the nav's own click handler
    // rather than racing it — the click must still navigate.
    el.addEventListener('click', () => dismissSpotlight({ remember: !demo }),
                        { once: true, capture: true });
  });
}
