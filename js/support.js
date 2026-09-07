/* ============================================================
   Support — the escalation gate, the ticket modal, ticket list.

   The gate is deliberate: a general ticket only unlocks after
   the Help Center has failed twice. Refund requests bypass it.
   ============================================================ */

import { esc, byId, registerActions } from './dom.js';
import { showView } from './router.js';
import { openModal, closeModal } from './highlights.js';
import {
  getFailedAnswers, setFailedAnswers, setLastQuestion, getLastQuestion,
  getTickets, saveTickets,
} from './store.js';

let failedAnswers = getFailedAnswers();
let appendSmartAnswer = () => {};

/* --- Escalation counter ---------------------------------- */

export function solved() {
  failedAnswers = 0;
  setFailedAnswers(0);
  byId('smartAnswer').innerHTML =
    `<div class="answer-card">`
    + `<h3>Great — you’re all set.</h3>`
    + `<p>If another question comes up, search here again.</p>`
    + `</div>`;
}

export function notSolved(q, answer) {
  failedAnswers += 1;
  setFailedAnswers(failedAnswers);
  setLastQuestion(q, answer);

  appendSmartAnswer(failedAnswers >= 2
    ? `<div class="answer-card">`
      + `<h3>Let’s send this to Support.</h3>`
      + `<p>You tried the Help Center and still need help. `
      + `You can now open a general Support ticket.</p>`
      + `<button class="btn green" type="button" data-action="open-ticket">`
        + `Open Support Ticket</button>`
      + `</div>`
    : `<div class="answer-card">`
      + `<h3>Try one more time</h3>`
      + `<p>Ask the question in a different way or open one of the related `
      + `answers below. If it still does not help, Support will unlock.</p>`
      + `</div>`);
}

/* --- Tickets --------------------------------------------- */

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
    : '<div class="tickets-empty">No tickets in this demo yet.</div>';
}

export function openGeneralTicket() {
  const q = getLastQuestion();
  const unlocked = failedAnswers >= 2 || !q;

  if (!unlocked) {
    showView('qa');
    byId('smartAnswer').innerHTML =
      `<div class="answer-card">`
      + `<h3>Let the Help Center try first</h3>`
      + `<p>Search for your question. If the answer does not solve it after `
      + `two attempts, the general ticket form will open.</p>`
      + `</div>`;
    return;
  }
  openTicketModal('General Support', q);
}

export function openRefund() {
  openTicketModal('Refund Request', '');
}

export function openTicketModal(type, prefill) {
  const isRefund = type === 'Refund Request';

  byId('modalInner').innerHTML =
    `<div class="ticket-modal">`
    + `<h2>${esc(type)}</h2>`
    + `<p>${isRefund
        ? 'Refund requests can be submitted directly so they are tracked from the start.'
        : 'Tell us what is still not working after using the Help Center.'}</p>`
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
  byId('tSubject').focus();
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

  closeModal();
  showView('support');
  renderTickets();
}

/* --- Wiring ---------------------------------------------- */

export function initSupport(appendFn) {
  appendSmartAnswer = appendFn;

  registerActions({
    'open-ticket':   () => openGeneralTicket(),
    'open-refund':   () => openRefund(),
    'submit-ticket': el => submitTicket(el.dataset.type),
  });
}

/** Called by the router when the Support view opens. */
export function onSupportShown(viewId) {
  if (viewId === 'support') renderTickets();
}
