/* ============================================================
   The only place that touches localStorage.

   Key names are preserved EXACTLY as the original file wrote
   them — including the now-inaccurate "v21" prefix. Renaming
   them would silently discard the saved progress of anyone
   who has already used the page.

   Every access is guarded: the original called JSON.parse on
   raw localStorage values without a try/catch in places, which
   throws in private-mode browsers and on corrupted values.
   ============================================================ */

const KEYS = {
  failed:      'abl_help_failed',
  tickets:     'abl_help_tickets',
  lastQ:       'abl_help_last_q',
  lastAnswer:  'abl_help_last_answer',
  index:  path => `abl_v21_${path}_index`,
  done:   path => `abl_v21_${path}_done`,

  // Ticket deflection. `failed` counted clicks, so clicking "No" twice on
  // one article unlocked a ticket. These track which distinct articles were
  // marked unhelpful, and whether a search came back empty.
  unhelpful:  'abl_help_unhelpful',
  noResults:  'abl_help_no_results',
};

function read(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function write(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch { return false; }   // private mode / quota — degrade, never throw
}

function readJSON(key, fallback) {
  const raw = read(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); }
  catch { return fallback; }
}

/* --- Journey progress ----------------------------------- */

export function getJourneyIndex(path) {
  return Number(read(KEYS.index(path)) || 0);
}

export function getJourneyDone(path) {
  const arr = readJSON(KEYS.done(path), []);
  return new Set(Array.isArray(arr) ? arr : []);
}

export function saveJourneyState(path, index, doneSet) {
  write(KEYS.index(path), String(index));
  write(KEYS.done(path), JSON.stringify([...doneSet]));
}

/* --- Help-centre escalation counter --------------------- */

export function getFailedAnswers() {
  return Number(read(KEYS.failed) || 0);
}

export function setFailedAnswers(n) {
  write(KEYS.failed, String(n));
}

export function setLastQuestion(q, answer) {
  write(KEYS.lastQ, q);
  write(KEYS.lastAnswer, answer);
}

export function getLastQuestion() {
  return read(KEYS.lastQ) || '';
}

/* --- Ticket deflection ----------------------------------- */

/** Questions the user marked "this did not solve my problem". */
export function getUnhelpful() {
  const arr = readJSON(KEYS.unhelpful, []);
  return new Set(Array.isArray(arr) ? arr : []);
}

export function addUnhelpful(question) {
  const set = getUnhelpful();
  set.add(question);
  write(KEYS.unhelpful, JSON.stringify([...set]));
  return set;
}

export function getNoResults() {
  return read(KEYS.noResults) === '1';
}

export function setNoResults(v) {
  write(KEYS.noResults, v ? '1' : '0');
}

/**
 * Cleared when a ticket is submitted, so the next ticket has to earn its
 * way through the articles again rather than the gate staying open forever.
 */
export function resetDeflection() {
  write(KEYS.unhelpful, '[]');
  write(KEYS.noResults, '0');
  write(KEYS.failed, '0');
}

/* --- Tickets -------------------------------------------- */

export function getTickets() {
  const t = readJSON(KEYS.tickets, []);
  return Array.isArray(t) ? t : [];
}

export function saveTickets(tickets) {
  write(KEYS.tickets, JSON.stringify(tickets));
}
