/* ============================================================
   DOM helpers + the action-delegation system.

   The original file carried 32 inline onclick="..." attributes,
   every one of which depended on the handler being a global.
   ES modules have no globals, so behaviour is declared in the
   markup as data-action and dispatched from one listener here.

   That also removes a whole class of bug: arguments travel as
   data attributes instead of being concatenated into a JS
   string inside an HTML attribute. (The original built
   onclick="notSolved(${JSON.stringify(q)},...)", whose quotes
   terminated the attribute and left the button inert.)
   ============================================================ */

/** Escape a value for interpolation into HTML text or an attribute. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export const byId = id => document.getElementById(id);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const actions = new Map();

/**
 * Register handlers by action name.
 * Each handler receives (element, event); read arguments off
 * the element's dataset.
 */
export function registerActions(map) {
  for (const [name, fn] of Object.entries(map)) actions.set(name, fn);
}

function run(el, event) {
  const fn = actions.get(el.dataset.action);
  if (!fn) {
    console.warn('[dom] no handler registered for data-action="%s"', el.dataset.action);
    return;
  }
  fn(el, event);
}

/** One click listener and one keyboard listener for the whole app. */
export function initDelegation(root = document) {
  root.addEventListener('click', event => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    run(el, event);
  });

  // Non-button elements opted into keyboard activation via
  // role="button" tabindex="0" still need Enter/Space.
  root.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const el = event.target.closest('[data-action][data-keyboard]');
    if (!el) return;
    event.preventDefault();
    run(el, event);
  });
}

/** Fetch JSON with a clear error message naming the file. */
export async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (HTTP ${res.status})`);
  return res.json();
}

export function renderError(el, message) {
  if (el) el.innerHTML = `<div class="load-error">${esc(message)}</div>`;
}
