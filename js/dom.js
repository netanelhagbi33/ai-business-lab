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

/**
 * Long-form content, with `**bold**` rendered as bold.
 *
 * The order matters: esc() runs FIRST, so everything in the source is inert
 * markup by the time the emphasis is added. Converting before escaping would
 * turn article text into an HTML injection point.
 *
 * The pattern cannot span a line break or swallow a neighbouring pair, and an
 * unmatched `**` is simply left as written rather than mangling the sentence.
 */
export function richText(s) {
  return esc(s).replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
}

/**
 * Render an article body as real HTML blocks.
 *
 * The source is plain text with light markdown. Rendering it with
 * `white-space: pre-line` made every line look identical — a heading, a
 * list item and a sentence all got the same weight and the same spacing,
 * which is what made long answers read as a wall.
 *
 * 187 of the articles use a single newline where they mean a paragraph
 * break, so a lone newline separates paragraphs here rather than acting as
 * a <br>. Blank lines separate blocks.
 *
 * Escaping still happens first, via richText(). No block type introduces
 * markup from the source; the tags below are ours.
 */
export function renderArticle(text) {
  const blocks = String(text ?? '').split(/\n\s*\n/);
  const out = [];

  for (const raw of blocks) {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    const bulleted = lines.every(l => /^[-•*]\s+/.test(l));
    const numbered = lines.some(l => /^\d+[.)]\s+/.test(l));

    if (bulleted) {
      out.push('<ul class="answer-list">'
        + lines.map(l => `<li>${richText(l.replace(/^[-•*]\s+/, ''))}</li>`).join('')
        + '</ul>');
      continue;
    }

    if (numbered) {
      // A line that does not start a new number continues the one above —
      // "1. Choose your niche" followed by its explanation.
      const items = [];
      let first = null;
      for (const line of lines) {
        const m = line.match(/^(\d+)[.)]\s+/);
        if (m) {
          if (first === null) first = Number(m[1]);
          items.push([line.slice(m[0].length)]);
        } else if (items.length) {
          items[items.length - 1].push(line);
        } else {
          items.push([line]);
        }
      }
      // Articles often put a blank line between numbered items, which makes
      // each one its own block. Carrying the source's own starting number
      // stops every block restarting at 1.
      const start = first && first !== 1 ? ` start="${first}"` : '';
      out.push(`<ol class="answer-list"${start}>`
        + items.map(parts =>
            `<li>${parts.map(t => richText(t)).join('<span class="answer-cont"></span>')}</li>`)
          .join('')
        + '</ol>');
      continue;
    }

    // Everything else: one paragraph per line. A line that is nothing but
    // bold is a heading for what follows — most articles write the heading
    // and its first paragraph on consecutive lines, so this is checked per
    // line rather than per block.
    lines.forEach(l => out.push(
      /^\*\*[^*]+\*\*$/.test(l)
        ? `<h4 class="answer-h">${richText(l.slice(2, -2))}</h4>`
        : `<p>${richText(l)}</p>`));
  }

  return out.join('');
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
