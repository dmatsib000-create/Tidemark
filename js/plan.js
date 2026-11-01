// The day plan: an ordered list of steps, breaks and events for today. Pure, like
// engine.js: no page, no storage, and `now` is always a parameter.
//
// A plan item is plain data. Once started it carries `run`, the engine's session
// for it (timestamps, cues), so the timer code works on `run` unchanged. The
// plan's `cursor` is the item whose run is on screen: running, or finished and
// waiting for the handoff. Status is never stored; it follows from the fields:
//   upcoming  no startedAt
//   current   the cursor item
//   done      startedAt and endedAt (outcome 'done' or 'stopped')
//
// Steps and breaks flow one after another, so an overrun moves them later.
// Events keep their clock time (`at`); when the plan before one runs into it,
// schedule() reports the overlap and moves nothing.

import * as E from './engine.js';

const { MIN, MAX_MINUTES } = E;

export const KINDS = ['step', 'break', 'event'];
// An event added without a length still needs an end for the schedule.
export const EVENT_MINUTES = 30;

const pad = n => String(n).padStart(2, '0');
export function dayKey(now) {
  const d = new Date(now);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const emptyPlan = now => ({ v: 1, day: dayKey(now), seq: 0, cursor: null, items: [], carry: [] });

export const byId = (plan, id) => plan.items.find(i => i.id === id) || null;
export const current = plan => (plan.cursor ? byId(plan, plan.cursor) : null);
export const upcoming = plan => plan.items.filter(i => !i.startedAt);
export const isRunning = plan => { const c = current(plan); return !!(c && !c.run.finishedAt); };
// What an item is called on screen and in cues: an untitled break is a "Break".
export const nameOf = item => item.title || (item.kind === 'break' ? 'Break' : '');

/* ---------- Editing ---------- */

// `minutes` (or `plannedMs`) left out makes an unsized item: its length is
// chosen when it starts.
export function makeItem(plan, { kind = 'step', title = '', step = '', minutes, plannedMs, at = null, bufferMs = 0, quick = false, extOf = null, returnOf = null, note = null }) {
  const ms = plannedMs ?? (minutes ? Math.min(MAX_MINUTES, Math.max(1, Math.round(minutes))) * MIN : null);
  return {
    id: `i${(plan.seq = (plan.seq || 0) + 1).toString(36)}`,
    kind: KINDS.includes(kind) ? kind : 'step',
    title: title.trim(), step: step.trim(),
    plannedMs: kind === 'event' ? ms ?? EVENT_MINUTES * MIN : ms,
    at: kind === 'event' ? at : null,
    bufferMs, quick, extOf, returnOf, note,
    startedAt: null, endedAt: null, outcome: null, run: null,
  };
}

export function insertItem(plan, item, index = plan.items.length) {
  plan.items.splice(Math.max(0, Math.min(index, plan.items.length)), 0, item);
  return item;
}

export const addItem = (plan, spec, index) => insertItem(plan, makeItem(plan, spec), index);

// Where a new event belongs: before the first upcoming item that would start
// after it, so the list stays in time order.
export function eventIndex(plan, at, now) {
  const rows = schedule(plan, now);
  const row = rows.find(r => r.state !== 'done' && r.state !== 'now' && r.start >= at);
  return row ? plan.items.findIndex(i => i.id === row.id) : plan.items.length;
}

// Only upcoming items can be removed or moved; what has started is the record
// of the day. Returns what was removed and where, for Undo.
export function removeItem(plan, id) {
  const index = plan.items.findIndex(i => i.id === id);
  if (index < 0 || plan.items[index].startedAt) return null;
  const [item] = plan.items.splice(index, 1);
  return { item, index };
}

// Swaps an upcoming item with its upcoming neighbour (delta -1 or +1).
export function moveItem(plan, id, delta) {
  const list = upcoming(plan);
  const k = list.findIndex(i => i.id === id);
  const other = list[k + delta];
  if (k < 0 || !other) return false;
  const a = plan.items.indexOf(list[k]), b = plan.items.indexOf(other);
  [plan.items[a], plan.items[b]] = [plan.items[b], plan.items[a]];
  return true;
}

// Puts back an item exactly as it was (Undo for remove and stop).
// An upcoming item never goes back in front of one that started meanwhile.
export function restoreItem(plan, item, index) {
  plan.items = plan.items.filter(i => i.id !== item.id);
  if (!item.startedAt) index = Math.max(index, plan.items.filter(i => i.startedAt).length);
  insertItem(plan, item, index);
  if (item.run && !item.endedAt) plan.cursor = item.id;
}

/* ---------- Running ---------- */

// Starts an upcoming item. A finished current item is closed first; a running
// one blocks the start (returns null). The length is, in order: the one chosen
// now, an event's fixed end, the planned length, then `fallbackMs`.
export function startItem(plan, id, now, { totalMs, warnStages, warnMs, fallbackMs = 25 * MIN } = {}) {
  if (isRunning(plan)) return null;
  const item = byId(plan, id);
  if (!item || item.startedAt) return null;
  if (plan.cursor) closeCurrent(plan, now);
  let ms = totalMs;
  if (ms == null && item.kind === 'event' && item.at != null) {
    const toEnd = item.at + item.plannedMs - now;
    if (toEnd >= MIN) ms = toEnd;
  }
  ms = ms ?? item.plannedMs ?? fallbackMs;
  if (item.plannedMs == null) item.plannedMs = ms;
  // What has started always comes before what hasn't, so an item started out
  // of order moves ahead of the ones it skipped.
  plan.items.splice(plan.items.indexOf(item), 1);
  const first = upcoming(plan)[0];
  insertItem(plan, item, first ? plan.items.indexOf(first) : plan.items.length);
  item.startedAt = now;
  item.run = E.createSession({ title: nameOf(item), totalMs: ms, warnStages, warnMs, kind: item.extOf ? 'extension' : 'main' }, now);
  plan.cursor = item.id;
  normalize(plan);
  return item;
}

// The quick one-off timer: a new item placed just before whatever is planned
// next, then started. A "then" typed with it becomes the next item, unless the
// plan's next item already has that name.
export function startNow(plan, { title = '', next = '', step = '', totalMs, warnStages, warnMs }, now) {
  if (isRunning(plan)) return null;
  if (plan.cursor) closeCurrent(plan, now);
  const first = upcoming(plan)[0];
  const at = first ? plan.items.indexOf(first) : plan.items.length;
  const item = insertItem(plan, makeItem(plan, { title, plannedMs: totalMs, quick: true }), at);
  if (next.trim()) {
    if (first && sameName(first.title, next)) { if (step.trim()) first.step = step.trim(); }
    else insertItem(plan, makeItem(plan, { title: next, step }), at + 1);
  }
  return startItem(plan, item.id, now, { totalMs, warnStages, warnMs });
}

// More time after a finish: a new segment of the same activity, right after it.
// It is refused past the person's own cap on extra time (`capMs`, none if
// left out).
export function extend(plan, totalMs, now, { capMs, warnStages } = {}) {
  const from = current(plan);
  if (!from || !from.run.finishedAt) return null;
  if (capMs != null && extraUsedMs(plan, from) + totalMs > capMs) return null;
  closeCurrent(plan, now);
  const item = insertItem(plan, makeItem(plan, {
    kind: from.kind === 'event' ? 'step' : from.kind, title: from.title, plannedMs: totalMs, extOf: rootOf(from),
  }), plan.items.indexOf(from) + 1);
  return startItem(plan, item.id, now, { totalMs, warnStages });
}

/* ---------- Extra time ---------- */

// The first segment of an activity; "More time" segments point back to it.
export const rootOf = item => item.extOf || item.id;

// Extra time granted so far with "More time". Time added with +1 or +5 while
// running changes only the run, never `plannedMs`, so it doesn't count.
export const extraUsedMs = (plan, item) =>
  plan.items.filter(i => i.extOf === rootOf(item)).reduce((sum, i) => sum + i.plannedMs, 0);

// The "More time" choices, in minutes, for what is left under the cap: the
// usual steps that fit, plus exactly what remains when that is not one of them.
export function extendChoices(leftMs, steps = [2, 5, 10]) {
  if (leftMs == null || leftMs === Infinity) return steps;
  const out = steps.filter(m => m * MIN <= leftMs);
  const rest = Math.floor(leftMs / MIN);
  if (rest >= 1 && rest < steps[steps.length - 1] && !out.includes(rest)) out.push(rest);
  return out.sort((a, b) => a - b);
}

/* ---------- Return slots ---------- */

// The upcoming slot that returns to this item's activity, if there is one.
export const returnSlotFor = (plan, item) =>
  (item ? upcoming(plan).find(i => i.returnOf === rootOf(item)) : null) || null;

// Adds a slot to come back to an interrupted activity, with the note of where
// it was left. `where` is 'next' (after the next item), 'end' (end of today)
// or 'at' (a fixed time, like an event). An activity has one return slot: a
// new one replaces the old. Returns { item, replaced } (replaced is what
// Undo puts back), or null.
export function addReturnSlot(plan, fromId, where, now, { text = '', at } = {}) {
  const from = byId(plan, fromId);
  if (!from || (where === 'at' && !(at >= now + MIN))) return null;
  const old = returnSlotFor(plan, from);
  const replaced = old ? removeItem(plan, old.id) : null;
  const item = makeItem(plan, {
    kind: where === 'at' ? 'event' : 'step', title: from.title, at: where === 'at' ? at : null,
    returnOf: rootOf(from), note: text.trim() ? { text: text.trim(), at: now } : null,
  });
  item.returnWhere = where;
  const first = upcoming(plan)[0];
  const index = where === 'at' ? eventIndex(plan, at, now)
    : where === 'next' && first ? plan.items.indexOf(first) + 1 : plan.items.length;
  insertItem(plan, item, index);
  return { item, replaced };
}

// Keeps a return slot's note in step with the note being typed.
export function setSlotNote(slot, text, now) {
  slot.note = text.trim() ? { text: text.trim(), at: now } : null;
}

// Done on the finish screen, or Stop while running. A stopped run under a
// minute old is taken back out of the day, since it was most likely a mis-tap.
export function closeCurrent(plan, now, outcome = 'done') {
  const item = current(plan);
  if (!item) return null;
  plan.cursor = null;
  if (outcome === 'stopped' && item.quick && now - item.startedAt < MIN) {
    plan.items = plan.items.filter(i => i !== item);
    return item;
  }
  if (outcome === 'stopped') E.finishNow(item.run, now);
  item.endedAt = Math.min(item.run.finishedAt ?? now, now);
  item.outcome = outcome;
  normalize(plan);
  return item;
}

// The running item's "then" line always names the plan's next item, so it can
// never go stale after an edit. Called after every change (state.js persist).
export function normalize(plan) {
  const c = current(plan);
  if (!c) return;
  const n = upcoming(plan)[0];
  c.run.next = n ? nameOf(n) : '';
  c.run.step = n ? n.step : '';
}

/* ---------- Actual and planned ---------- */

// Time actually spent, not counting pauses.
export function actualMs(item, now) {
  if (!item.startedAt) return 0;
  const r = item.run;
  const end = item.endedAt ?? r.finishedAt ?? now;
  const pausedNow = r.pausedAt && !r.finishedAt ? end - r.pausedAt : 0;
  return Math.max(0, end - item.startedAt - (r.pausedMs || 0) - pausedNow);
}

// What is kept of a finished item once its day is over.
export const logEntry = (item, day) => ({
  day, kind: item.kind, title: item.title, quick: item.quick, extOf: item.extOf, outcome: item.outcome,
  plannedMs: item.plannedMs, actualMs: actualMs(item, item.endedAt), startedAt: item.startedAt, endedAt: item.endedAt,
});

/* ---------- The day as a schedule ---------- */

// Projects every item onto the clock. Pure, so a change can be previewed by
// comparing schedule(before) with schedule(after).
// Row: { id, kind, state: done|now|next|later, start, end (null when unsized),
//        fixed (an event), overlapMs (how far the plan before runs into an event) }
export function schedule(plan, now) {
  const rows = [];
  let t = now, seenNext = false;
  for (const item of plan.items) {
    const row = { id: item.id, kind: item.kind, fixed: item.kind === 'event', overlapMs: 0 };
    if (item.id === plan.cursor) {
      const r = item.run;
      const end = r.finishedAt ?? (r.pausedAt ? now + E.remaining(r, now) : r.endAt);
      Object.assign(row, { state: 'now', start: item.startedAt, end });
      t = Math.max(now, end);
    } else if (item.startedAt) {
      Object.assign(row, { state: 'done', start: item.startedAt, end: item.endedAt });
    } else {
      row.state = seenNext ? 'later' : 'next';
      seenNext = true;
      const ready = t + (item.bufferMs || 0);
      if (row.fixed && item.at != null) {
        row.start = item.at;
        // Times are shown to the minute, so seconds of overlap don't count.
        row.overlapMs = ready - item.at >= MIN ? ready - item.at : 0;
        row.end = item.at + item.plannedMs;
        t = Math.max(t, row.end);
      } else {
        row.start = ready;
        row.end = item.plannedMs ? ready + item.plannedMs : null;
        t = row.end ?? ready;
      }
    }
    rows.push(row);
  }
  return rows;
}

/* ---------- Loading and a new day ---------- */

const sameName = (a, b) => a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

// The saved plan, or one built from a session saved before plans existed.
export function loadPlan(saved, legacySession, now) {
  if (saved && Array.isArray(saved.items)) return { ...emptyPlan(now), ...saved };
  const plan = emptyPlan(now);
  if (!legacySession) return plan;
  const s = legacySession;
  const item = insertItem(plan, makeItem(plan, { title: s.title || '', plannedMs: s.totalMs, quick: true }));
  item.startedAt = s.endAt - s.totalMs;
  item.run = s;
  plan.cursor = item.id;
  if (s.next) addItem(plan, { title: s.next, step: s.step || '' });
  normalize(plan);
  return plan;
}

// On a new day with nothing on screen, the old plan is put away: finished items
// go to the log, and unstarted steps and breaks are offered to carry over (an
// event's time belonged to that day). A run still on screen keeps its day
// until it is closed. Returns null when nothing changes.
export function rollDay(plan, now) {
  if (plan.day === dayKey(now) || plan.cursor) return null;
  const next = emptyPlan(now);
  next.seq = plan.seq; // ids stay unique across days
  next.carry = [...plan.carry, ...upcoming(plan)].filter(i => i.kind !== 'event')
    .map(({ kind, title, step, plannedMs, note }) => ({ kind, title, step, plannedMs, note }));
  const log = plan.items.filter(i => i.endedAt).map(i => logEntry(i, plan.day));
  return { plan: next, log };
}

// Moves one carried-over item into today's plan.
export function takeCarry(plan, index) {
  const [spec] = plan.carry.splice(index, 1);
  return spec ? addItem(plan, spec) : null;
}
