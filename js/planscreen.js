// The plan screen: today's steps, breaks and events as now, next and later,
// what is done, yesterday's leftovers, and a short form to add more.

import * as E from './engine.js';
import * as P from './plan.js';
import { plan, view, persist, setView } from './state.js';
import { $, fmtShort, fmtClock, toast } from './ui.js';
import { startPlanItem } from './session.js';
import { render } from './screens.js';

const { MIN, MAX_MINUTES } = E;
const KIND_LABEL = { step: '', break: 'Break', event: 'Event' };

let addKind = 'step';

/* ---------- The list ---------- */

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

function actionBtn(text, label, onClick, act, id) {
  const b = el('button', 'text-btn mono', text);
  b.type = 'button';
  if (label) b.setAttribute('aria-label', label);
  b.dataset.act = act;
  b.dataset.id = id;
  b.addEventListener('click', onClick);
  return b;
}

// Clock times only, in every mode: a plan reads as a day, never a countdown.
const whenText = r => (r.end ? `${fmtShort(r.start)}–${fmtShort(r.end)}` : fmtShort(r.start));

function clashText(r, now) {
  if (!r.fixed || r.state === 'done' || r.state === 'now') return '';
  if (r.start < now) return `Its time, ${fmtClock(r.start)}, has passed.`;
  return r.overlapMs ? `The plan before this runs to ${fmtClock(r.start + r.overlapMs)}.` : '';
}

const titleOf = item => P.nameOf(item) || 'Untitled';
const lenText = ms => (ms ? `${Math.round(ms / MIN)} min` : '');

function row(item, r, { first, last, canStart, now }) {
  const li = el('li', `plan-row${r.state === 'now' ? ' is-now' : ''}`);
  li.dataset.id = item.id;
  const what = el('span', 'plan-what');
  what.append(el('span', item.kind === 'break' ? 'plan-title italic' : 'plan-title', titleOf(item)));
  // An untitled break is already called "Break".
  const kind = item.extOf ? 'More time' : item.returnOf ? 'Return' : item.title ? KIND_LABEL[item.kind] : '';
  if (kind) what.append(' ', el('span', 'label mono plan-kind', kind));
  if (r.state !== 'done' && item.plannedMs) what.append(' ', el('span', 'mono plan-len', lenText(item.plannedMs)));
  li.append(el('span', 'mono plan-when', whenText(r)), what);
  li.append(el('p', 'hint mono plan-clash', clashText(r, now)));
  if (r.state === 'next' || r.state === 'later') {
    const name = titleOf(item);
    const acts = el('span', 'plan-acts');
    if (canStart) acts.append(actionBtn('Start', `Start ${name}`, () => startPlanItem(item.id), 'start', item.id));
    if (!first) acts.append(actionBtn('Up', `Move ${name} up`, () => move(item.id, -1, 'up'), 'up', item.id));
    if (!last) acts.append(actionBtn('Down', `Move ${name} down`, () => move(item.id, 1, 'down'), 'down', item.id));
    acts.append(actionBtn('Remove', `Remove ${name}`, () => remove(item.id), 'remove', item.id));
    li.append(acts);
  }
  return li;
}

export function renderPlan(now = Date.now()) {
  // Rebuilding the list replaces its buttons; remember which one had focus.
  const had = document.activeElement;
  const kept = $('plan').contains(had) && had.dataset.act ? had.dataset : null;
  const rows = P.schedule(plan, now);
  const byId = new Map(rows.map(r => [r.id, r]));
  const canStart = !P.isRunning(plan);
  const up = P.upcoming(plan);
  const groups = { now: [], next: [], later: [], done: [] };
  for (const item of plan.items) {
    const r = byId.get(item.id);
    groups[r.state].push(row(item, r, { first: up[0] === item, last: up[up.length - 1] === item, canStart, now }));
  }
  for (const g of ['now', 'next', 'later', 'done']) {
    $(`plan-${g}`).replaceChildren(...groups[g]);
    $(`plan-${g}-wrap`).hidden = !groups[g].length;
  }
  $('plan-empty').hidden = plan.items.length > 0;

  $('plan-carry').hidden = !plan.carry.length;
  $('carry-list').replaceChildren(...plan.carry.map((c, i) => {
    const li = el('li', 'plan-row');
    const what = el('span', 'plan-what');
    what.append(el('span', 'plan-title', titleOf(c)));
    if (c.plannedMs) what.append(' ', el('span', 'mono plan-len', lenText(c.plannedMs)));
    const acts = el('span', 'plan-acts');
    acts.append(actionBtn('Add', `Add ${titleOf(c)} to today`, () => { P.takeCarry(plan, i); persist(); render(); }, 'carry', i));
    li.append(what, acts);
    return li;
  }));
  renderAddForm();
  if (kept) {
    const same = $('plan').querySelector(`[data-act="${kept.act}"][data-id="${kept.id}"]`);
    const carry = kept.act === 'carry' && $('plan').querySelector('[data-act="carry"]');
    (same || carry || $('plan-heading')).focus();
  }
}

// The clock moves the plan's times, so they are kept current without
// rebuilding the list (which would lose the keyboard focus).
export function refreshPlanTimes(now) {
  for (const r of P.schedule(plan, now)) {
    const li = $('plan').querySelector(`li[data-id="${r.id}"]`);
    if (!li) continue;
    li.querySelector('.plan-when').textContent = whenText(r);
    li.querySelector('.plan-clash').textContent = clashText(r, now);
  }
}

function move(id, delta, act) {
  if (!P.moveItem(plan, id, delta)) return;
  persist();
  render();
  // Keep the keyboard on the item that moved, or on its other arrow at an end.
  const q = a => $('plan').querySelector(`[data-act="${a}"][data-id="${id}"]`);
  (q(act) || q(act === 'up' ? 'down' : 'up'))?.focus();
}

function remove(id) {
  const gone = P.removeItem(plan, id);
  if (!gone) return;
  persist();
  render();
  $('plan-heading').focus();
  toast('Removed from the plan', () => { P.restoreItem(plan, gone.item, gone.index); persist(); render(); });
}

$('carry-clear').addEventListener('click', () => {
  const carry = plan.carry;
  plan.carry = [];
  persist();
  render();
  $('plan-heading').focus();
  toast('Not carried over', () => { plan.carry = [...carry, ...plan.carry]; persist(); render(); });
});

/* ---------- Adding ---------- */

function renderAddForm() {
  for (const b of document.querySelectorAll('[data-kind]')) b.setAttribute('aria-pressed', String(b.dataset.kind === addKind));
  $('p-at-wrap').hidden = addKind !== 'event';
  $('p-title-opt').hidden = addKind !== 'break';
}

function showAddError(msg = '', fieldId) {
  $('p-error').textContent = msg;
  for (const id of ['p-title', 'p-minutes', 'p-at']) {
    if (id === fieldId) { $(id).setAttribute('aria-invalid', 'true'); $(id).setAttribute('aria-describedby', 'p-error'); }
    else { $(id).removeAttribute('aria-invalid'); $(id).removeAttribute('aria-describedby'); }
  }
}

$('plan-form').addEventListener('submit', e => {
  e.preventDefault();
  const now = Date.now();
  const title = $('p-title').value.trim();
  const typed = $('p-minutes').value.trim();
  const minutes = typed ? parseInt(typed, 10) : undefined;
  if (!title && addKind !== 'break') { showAddError('Give it a name.', 'p-title'); return; }
  if (typed && !(minutes >= 1 && minutes <= MAX_MINUTES)) { showAddError(`Choose a length between 1 and ${MAX_MINUTES} minutes.`, 'p-minutes'); return; }
  let at = null, index;
  if (addKind === 'event') {
    if (!$('p-at').value) { showAddError('Choose the time it starts.', 'p-at'); return; }
    const until = E.untilMs($('p-at').value, 0, now);
    if (until <= 0) { showAddError('That time has passed. Choose a later time.', 'p-at'); return; }
    at = now + until;
    index = P.eventIndex(plan, at, now);
  }
  showAddError();
  P.addItem(plan, { kind: addKind, title, minutes, at }, index);
  persist();
  $('p-title').value = $('p-minutes').value = $('p-at').value = '';
  render();
  $('p-title').focus();
});

for (const b of document.querySelectorAll('[data-kind]')) {
  b.addEventListener('click', () => { addKind = b.dataset.kind; showAddError(); renderAddForm(); });
}
for (const id of ['p-title', 'p-minutes', 'p-at']) $(id).addEventListener('input', () => showAddError());

/* ---------- Opening and closing ---------- */

$('plan-btn').addEventListener('click', () => {
  setView(view === 'plan' ? 'main' : 'plan');
  render();
});
