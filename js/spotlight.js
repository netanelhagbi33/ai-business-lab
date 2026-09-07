/* ============================================================
   The one-time spotlight on the Start Here tab.

   Customers were missing the tab, so it gets a gold animated
   marker until they click it once — then it is gone for good,
   remembered in localStorage.

   Deliberately one-shot: a marker that keeps coming back stops
   being a signal and becomes decoration people learn to ignore.
   ============================================================ */

import { $$ } from './dom.js';
import { getSpotlightSeen, setSpotlightSeen } from './store.js';

const SELECTOR = '.nav[data-view="home"]';
const CLASS = 'nav-spotlight';

/** Remove the marker everywhere and remember that we did. */
export function dismissSpotlight() {
  $$(`.${CLASS}`).forEach(el => el.classList.remove(CLASS));
  setSpotlightSeen();
}

export function initSpotlight() {
  if (getSpotlightSeen()) return;

  const targets = $$(SELECTOR);
  if (!targets.length) return;

  targets.forEach(el => {
    el.classList.add(CLASS);
    // Announced once, not on every pulse.
    el.setAttribute('aria-describedby', 'spotlightHint');
  });

  // A capture listener, so the marker clears even though the nav's own
  // click handler also fires.
  targets.forEach(el =>
    el.addEventListener('click', dismissSpotlight, { once: true, capture: true }));
}
