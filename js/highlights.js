/* ============================================================
   In-image action highlights and the zoom modal.

   Coordinates live in data/highlights.json, keyed by image
   filename, as percentages calibrated per screenshot:
     {x, y, w, h, label, tone?, noBadge?, edgeRight?, labelBelow?}

   Percentages are resolution-independent, but they assume the
   image's own aspect ratio — never crop or re-pad the PNGs.
   ============================================================ */

import { esc, byId, registerActions } from './dom.js';

export const IMG_DIR = 'img/';

/**
 * The src for a screenshot. One place, because the single-file review build
 * swaps it for an inline data: URI — there is no img/ directory inside a
 * page that has to travel as one file.
 */
export const imgSrc = file => IMG_DIR + file;

let HIGHLIGHTS = {};
let SIZES = {};

export function setHighlights(data) { HIGHLIGHTS = data || {}; }

/**
 * Intrinsic pixel dimensions per file, from data/image-sizes.json.
 * There are 22 distinct aspect ratios across the 27 screenshots, so a
 * single CSS aspect-ratio cannot stand in for them.
 */
export function setImageSizes(data) { SIZES = data || {}; }

/**
 * width/height attributes so the browser reserves the right box before
 * a lazy image arrives. Without them the percentage-positioned
 * highlight overlays float over a collapsed area until it loads.
 */
export function sizeAttrs(file) {
  const s = SIZES[file];
  return s ? ` width="${s.w}" height="${s.h}"` : '';
}

/** Absolutely-positioned overlay boxes for one screenshot. */
export function highlightMarkup(file) {
  const list = HIGHLIGHTS[file] || [];
  return list.map(h => {
    const classes = [
      'action-highlight',
      h.tone || '',
      h.edgeRight ? 'edge-right' : '',
      h.noBadge ? 'no-badge' : '',
      h.labelBelow ? 'label-below' : '',
    ].filter(Boolean).join(' ');

    return `<span class="${classes}" data-label="${esc(h.label)}" `
         + `style="left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%"></span>`;
  }).join('');
}

/** Distinct action labels for a screenshot, for the hint strip. */
export function firstHighlightLabel(file) {
  const list = HIGHLIGHTS[file] || [];
  return list.length ? [...new Set(list.map(h => h.label))].join(' · ') : '';
}

export function zoomImg(file) {
  byId('modalInner').innerHTML =
    `<div class="modal-frame">`
    + `<img src="${esc(imgSrc(file))}"${sizeAttrs(file)} alt="Screen example">`
    + highlightMarkup(file)
    + `</div>`;
  openModal();
}

export function openModal() {
  byId('modal').classList.add('show');
  byId('modal').setAttribute('aria-hidden', 'false');
}

export function closeModal() {
  const modal = byId('modal');
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  byId('modalInner').innerHTML = '';
}

export function initModal() {
  const modal = byId('modal');

  // Click the backdrop (not the content) to dismiss.
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

  // Escape to dismiss — the original had no keyboard exit at all.
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
  });

  registerActions({
    'close-modal': () => closeModal(),
    'zoom-img': el => zoomImg(el.dataset.file),
  });
}
