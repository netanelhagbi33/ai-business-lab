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

/* --- Tickets -------------------------------------------- */

export function getTickets() {
  const t = readJSON(KEYS.tickets, []);
  return Array.isArray(t) ? t : [];
}

export function saveTickets(tickets) {
  write(KEYS.tickets, JSON.stringify(tickets));
}
