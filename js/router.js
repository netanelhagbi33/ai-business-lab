/* ============================================================
   View switching + sidebar navigation.

   Views are the six <section class="view"> elements; exactly
   one carries .active at a time.
   ============================================================ */

import { $$, byId } from './dom.js';

const listeners = [];

/** Register a callback fired whenever a view becomes active. */
export function onViewChange(fn) { listeners.push(fn); }

export function showView(id) {
  const target = byId(id);
  if (!target) {
    console.warn('[router] unknown view "%s"', id);
    return;
  }

  $$('.view').forEach(v => v.classList.remove('active'));
  target.classList.add('active');

  $$('.nav').forEach(n => n.classList.remove('active'));
  $$(`.nav[data-view="${id}"]`).forEach(n => n.classList.add('active'));

  window.scrollTo({ top: 0, behavior: 'smooth' });

  listeners.forEach(fn => fn(id));
}

/**
 * Sidebar buttons. Only those carrying data-view navigate; the
 * inert .nav-external entries have none and are skipped.
 */
export function initNav() {
  $$('.nav[data-view]').forEach(btn => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
}
