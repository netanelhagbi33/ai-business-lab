/* ============================================================
   Support tickets — the deflection gate, the ticket form, the
   ticket list.

   The point of this module is to make a ticket the last step
   rather than the first. There is no "Open a ticket" button
   anywhere in the navigation. The only way to reach the form is
   from inside an article, after telling us that two different
   articles did not solve the problem — or after a search that
   returned nothing at all, which means no article could have.

   Refund requests deliberately bypass all of it: delaying a
   refund request is a legal problem, not just a bad experience.
   ============================================================ */

import { esc, byId, registerActions, $$ } from './dom.js';
import { showView } from './router.js';
import { openModal, closeModal } from './highlights.js';
import {
  getFailedAnswers, setFailedAnswers, setLastQuestion, getLastQuestion,
  getUnhelpful, addUnhelpful, getNoResults, setNoResults, resetDeflection,
  getTickets, saveTickets,
} from './store.js';

/** Distinct unhelpful articles required before the form opens. */
export const REQUIRED_ATTEMPTS = 2;

let unhelpful = getUnhelpful();
let noResults = getNoResults();

/* ============================================================
   The gate
   ============================================================ */

/**
 * Legacy: before this model, `abl_help_failed` counted clicks and two of
 * them unlocked a ticket. Anyone already past that stays past it rather
 * than being sent back through the funnel.
 *
 * The key is read, never written by the new counter — mirroring the new
 * count into it destroyed exactly the signal it exists to carry. It is
 * cleared only by resetDeflection() and markHelpful(), both of which mean
 * the escalation is genuinely over.
 */
const legacyUnlocked = () => getFailedAnswers() >= REQUIRED_ATTEMPTS;

export function attemptsMade() {
  return unhelpful.size;
}

/** Has this article already been marked unhelpful? */
export function isUnhelpful(question) {
  return unhelpful.has(question);
}

export function canOpenTicket() {
  return noResults || unhelpful.size >= REQUIRED_ATTEMPTS || legacyUnlocked();
}

export function attemptsRemaining() {
  return Math.max(0, REQUIRED_ATTEMPTS - unhelpful.size);
}

/** A search came back with nothing — no article could have helped. */
export function markNoResults(query) {
  noResults = true;
  setNoResults(true);
  setLastQuestion(query, 'No matching answer');
}

/** The user says this article did not solve their problem. */
export function markUnhelpful(question, query) {
  unhelpful = addUnhelpful(question);
  // `query` is empty when browsing a topic rather than searching. Record it
  // as-is: falling back to the article title made the prefilled ticket say
  // "I searched for: <article the user never typed>".
  setLastQuestion(query || '', question);
  return canOpenTicket();
}

export function markHelpful() {
  // Solving it is the outcome we want; it does not clear the record of
  // what already failed, but it is the natural end of the flow.
  setFailedAnswers(0);
}

/* ============================================================
   Ticket form
   ============================================================ */

export function openTicketFromArticle(question) {
  if (!canOpenTicket()) {
    console.warn('[support] ticket blocked: %d of %d attempts',
                 unhelpful.size, REQUIRED_ATTEMPTS);
    return;
  }
  openTicketModal('General Support', buildPrefill(question));
}

export function openRefund() {
  openTicketModal('Refund Request', '');
}

/**
 * Give the agent what the customer already tried, so the ticket does not
 * start with "did you search the help centre?".
 */
function buildPrefill(question) {
  const lastQ = getLastQuestion();
  const lines = [];

  if (lastQ) lines.push(`I searched for: ${lastQ}`);
  else if (unhelpful.size) lines.push('I looked through the Support Center.');
  if (unhelpful.size) {
    lines.push('', 'These articles did not solve it:');
    [...unhelpful].forEach(q => lines.push(`  • ${q}`));
  } else if (noResults) {
    lines.push('', 'The Support Center returned no matching articles.');
  }
  if (question && !unhelpful.has(question)) {
    lines.push('', `Reading: ${question}`);
  }
  lines.push('', 'What I still need help with:', '');

  return lines.join('\n');
}

export function openTicketModal(type, prefill) {
  const isRefund = type === 'Refund Request';

  byId('modalInner').innerHTML =
    `<div class="ticket-modal">`
    + `<h2>${esc(type)}</h2>`
    + `<p>${isRefund
        ? 'Refund requests can be submitted directly so they are tracked from the start.'
        : 'Tell us what is still not working after using the Support Center.'}</p>`
    + `<div class="form">`
      + `<label>Subject`
        + `<input id="tSubject" value="${isRefund ? 'Refund Request' : 'Need more help'}">`
      + `</label>`
      + `<label>What do you need help with?`
        + `<textarea id="tMessage">${esc(prefill)}</textarea>`
      + `</label>`
      + (isRefund
        ? `<label>Which purchase?`
          + `<select id="purchase">`
            + `<option>Select purchase</option>`
            + `<option>Website / Initial purchase</option>`
            + `<option>Traffic Booster</option>`
            + `<option>Article Pack</option>`
            + `<option>Other add-on</option>`
          + `</select></label>`
        : '')
      + `<button class="btn ${isRefund ? 'red' : 'green'}" type="button" `
        + `data-action="submit-ticket" data-type="${esc(type)}">Submit Request</button>`
    + `</div></div>`;

  openModal();
  const box = byId('tMessage');
  box.focus();
  box.setSelectionRange(box.value.length, box.value.length);
}

export function submitTicket(type) {
  const subject = byId('tSubject').value.trim() || type;
  const message = byId('tMessage').value.trim();

  if (!message) {
    alert('Please add a short description.');
    byId('tMessage').focus();
    return;
  }

  const tickets = getTickets();
  tickets.unshift({
    id: Date.now(),
    type,
    title: subject,
    message,
    status: 'OPEN',
    created: new Date().toLocaleString(),
  });
  saveTickets(tickets);

  // The next ticket earns its way through the articles again.
  resetDeflection();
  unhelpful = new Set();
  noResults = false;

  closeModal();
  refreshTicketsNav();
  showView('support');
  renderTickets();
}

/* ============================================================
   Ticket list + the sidebar entry
   ============================================================ */

export function renderTickets() {
  const tickets = getTickets();
  const el = byId('tickets');

  el.innerHTML = tickets.length
    ? tickets.map(t =>
        `<div class="ticket">`
        + `<div>`
          + `<strong>${esc(t.title)}</strong>`
          + `<div class="ticket-meta">${esc(t.created)} · ${esc(t.type)}</div>`
          + `<div class="ticket-body">${esc(t.message)}</div>`
        + `</div>`
        + `<span class="status">${esc(t.status)}</span>`
        + `</div>`
      ).join('')
    : '<div class="tickets-empty">You have no support tickets.</div>';
}

/**
 * The Support Tickets entry does not exist until the user has a ticket.
 * Once they do it stays, so they can find the history again.
 */
export function refreshTicketsNav() {
  const open = getTickets().filter(t => t.status === 'OPEN').length;
  const total = getTickets().length;

  $$('.nav[data-view="support"]').forEach(btn => {
    btn.hidden = total === 0;
    const badge = btn.querySelector('.navplus');
    if (badge) {
      badge.hidden = open === 0;
      badge.textContent = open;
    }
  });
}

/* --- Wiring ---------------------------------------------- */

export function initSupport() {
  registerActions({
    'open-refund':   () => openRefund(),
    'submit-ticket': el => submitTicket(el.dataset.type),
    'open-ticket':   el => openTicketFromArticle(el.dataset.question || ''),
  });
  refreshTicketsNav();
}

/** Called by the router when the Support Tickets view opens. */
export function onSupportShown(viewId) {
  if (viewId === 'support') renderTickets();
}
