// The day plan: run with `node --test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';
import * as P from '../js/plan.js';

const { MIN } = E;
const T0 = new Date(2026, 10, 1, 14, 0).getTime(); // 2:00 PM local
const at = (h, m) => new Date(2026, 10, 1, h, m).getTime();
const titles = plan => plan.items.map(i => i.title);

function dayOf(...specs) {
  const plan = P.emptyPlan(T0);
  for (const s of specs) P.addItem(plan, s);
  return plan;
}

test('items are added in order with their own ids, trimmed and sized in minutes', () => {
  const plan = dayOf({ title: ' Email ', minutes: 20 }, { kind: 'break', title: 'Tea', minutes: 10 });
  assert.deepEqual(titles(plan), ['Email', 'Tea']);
  assert.notEqual(plan.items[0].id, plan.items[1].id);
  assert.equal(plan.items[0].plannedMs, 20 * MIN);
  assert.equal(plan.items[1].kind, 'break');
});

test('an item without a length stays unsized; an event gets a default length', () => {
  const plan = dayOf({ title: 'Read' }, { kind: 'event', title: 'Call', at: at(15, 0) });
  assert.equal(plan.items[0].plannedMs, null);
  assert.equal(plan.items[1].plannedMs, P.EVENT_MINUTES * MIN);
});

test('flexible items flow one after another from now', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10 });
  const rows = P.schedule(plan, T0);
  assert.deepEqual(rows.map(r => [r.state, r.start, r.end]), [
    ['next', T0, T0 + 20 * MIN], ['later', T0 + 20 * MIN, T0 + 30 * MIN],
  ]);
});

test('a buffer before an item moves it, and everything after it, later', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10, bufferMs: 5 * MIN }, { title: 'C', minutes: 5 });
  const rows = P.schedule(plan, T0);
  assert.equal(rows[1].start, T0 + 25 * MIN);
  assert.equal(rows[2].start, T0 + 35 * MIN);
});

test('an overrun moves flexible items later but leaves an event at its time', () => {
  const plan = dayOf({ title: 'A', minutes: 30 }, { title: 'B', minutes: 10 }, { kind: 'event', title: 'Call', at: at(15, 0) });
  P.startItem(plan, plan.items[0].id, T0);
  E.adjust(plan.items[0].run, 15 * MIN, T0 + 20 * MIN); // A now ends at 2:45
  const rows = P.schedule(plan, T0 + 20 * MIN);
  assert.equal(rows[1].start, at(14, 45));
  assert.equal(rows[2].start, at(15, 0));
  assert.equal(rows[2].overlapMs, 0);
});

test('when the plan runs into an event, the overlap is reported and nothing moves', () => {
  const plan = dayOf({ title: 'A', minutes: 50 }, { title: 'B', minutes: 20 }, { kind: 'event', title: 'Call', at: at(15, 0), minutes: 30 }, { title: 'C', minutes: 10 });
  const rows = P.schedule(plan, T0);
  assert.equal(rows[2].start, at(15, 0));
  assert.equal(rows[2].overlapMs, 10 * MIN);
  // What follows the event starts after its end.
  assert.equal(rows[3].start, at(15, 30));
});

test('seconds of overlap with an event are not reported', () => {
  const plan = dayOf({ title: 'A', minutes: 60 }, { kind: 'event', title: 'Call', at: at(15, 0) });
  assert.equal(P.schedule(plan, T0 + 30_000)[1].overlapMs, 0);
});

test('a paused item pushes the rest of the day later while it waits', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10 });
  P.startItem(plan, plan.items[0].id, T0);
  E.pause(plan.items[0].run, T0 + 5 * MIN);
  const rows = P.schedule(plan, T0 + 15 * MIN);
  assert.equal(rows[0].end, T0 + 30 * MIN);
  assert.equal(rows[1].start, T0 + 30 * MIN);
});

test('the schedule does not change the plan, so before and after can be compared', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10 });
  const before = JSON.stringify(plan);
  const a = P.schedule(plan, T0);
  assert.equal(JSON.stringify(plan), before);
  P.moveItem(plan, plan.items[1].id, -1);
  const b = P.schedule(plan, T0);
  assert.equal(b.find(r => r.id === a[0].id).start, T0 + 10 * MIN);
});

test('an event is placed in time order among the upcoming items', () => {
  const plan = dayOf({ title: 'A', minutes: 30 }, { title: 'B', minutes: 30 }, { title: 'C', minutes: 30 });
  const i = P.eventIndex(plan, at(14, 45), T0);
  P.addItem(plan, { kind: 'event', title: 'Call', at: at(14, 45) }, i);
  assert.deepEqual(titles(plan), ['A', 'B', 'Call', 'C']);
});

test('upcoming items move and come out; started ones stay as the record', () => {
  const plan = dayOf({ title: 'A', minutes: 5 }, { title: 'B', minutes: 5 }, { title: 'C', minutes: 5 });
  assert.equal(P.moveItem(plan, plan.items[2].id, -1), true);
  assert.deepEqual(titles(plan), ['A', 'C', 'B']);
  assert.equal(P.moveItem(plan, plan.items[0].id, -1), false);
  P.startItem(plan, plan.items[0].id, T0);
  assert.equal(P.removeItem(plan, plan.items[0].id), null);
  // An upcoming item can't be moved above one that has started.
  assert.equal(P.moveItem(plan, plan.items[1].id, -1), false);
  const gone = P.removeItem(plan, plan.items[2].id);
  assert.deepEqual(titles(plan), ['A', 'C']);
  P.restoreItem(plan, gone.item, gone.index);
  assert.deepEqual(titles(plan), ['A', 'C', 'B']);
});

test('starting an item gives it a run that the engine drives as before', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10, step: 'Open the file' });
  const item = P.startItem(plan, plan.items[0].id, T0, { warnMs: 5 * MIN });
  assert.equal(plan.cursor, item.id);
  assert.equal(item.run.endAt, T0 + 20 * MIN);
  assert.equal(item.run.next, 'B');
  assert.equal(item.run.step, 'Open the file');
  assert.equal(E.stage(item.run, T0 + 16 * MIN), 'warning');
  assert.deepEqual(E.dueCues(item.run, T0 + 20 * MIN), ['finish']);
});

test('nothing else starts while an item is running', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10 });
  P.startItem(plan, plan.items[0].id, T0);
  assert.equal(P.startItem(plan, plan.items[1].id, T0 + MIN), null);
  assert.equal(P.startNow(plan, { totalMs: 5 * MIN }, T0 + MIN), null);
});

test('starting the next item after a finish closes the finished one', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B' });
  P.startItem(plan, plan.items[0].id, T0);
  E.settle(plan.items[0].run, T0 + 21 * MIN);
  const b = P.startItem(plan, plan.items[1].id, T0 + 22 * MIN, { totalMs: 15 * MIN });
  assert.equal(plan.items[0].endedAt, T0 + 20 * MIN);
  assert.equal(plan.items[0].outcome, 'done');
  // A length chosen at the start sizes an unsized item.
  assert.equal(b.plannedMs, 15 * MIN);
});

test('an item started out of order moves ahead of the ones it skipped', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10 }, { title: 'C', minutes: 5 });
  P.startItem(plan, plan.items[1].id, T0);
  assert.deepEqual(titles(plan), ['B', 'A', 'C']);
  const rows = P.schedule(plan, T0);
  assert.equal(rows[1].start, T0 + 10 * MIN);
  assert.equal(P.current(plan).run.next, 'A');
});

test('an event started late still ends at its planned end', () => {
  const plan = dayOf({ kind: 'event', title: 'Call', at: at(14, 0), minutes: 30 });
  const item = P.startItem(plan, plan.items[0].id, at(14, 10));
  assert.equal(item.run.endAt, at(14, 30));
});

test('an untitled break is called a break', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { kind: 'break', minutes: 10 });
  P.startItem(plan, plan.items[0].id, T0);
  assert.equal(P.current(plan).run.next, 'Break');
  const b = P.startItem(plan, plan.items[1].id, T0 + 20 * MIN);
  assert.equal(b, null); // A is still running
  E.finishNow(P.current(plan).run, T0 + 20 * MIN);
  assert.equal(P.startItem(plan, plan.items[1].id, T0 + 20 * MIN).run.title, 'Break');
});

test('the next line follows the plan when it changes', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B' }, { title: 'C' });
  const a = P.startItem(plan, plan.items[0].id, T0);
  P.moveItem(plan, plan.items[2].id, -1);
  P.normalize(plan);
  assert.equal(a.run.next, 'C');
  P.removeItem(plan, plan.items[1].id);
  P.removeItem(plan, plan.items[1].id);
  P.normalize(plan);
  assert.equal(a.run.next, '');
});

test('a quick timer is a one-item plan', () => {
  const plan = P.emptyPlan(T0);
  const item = P.startNow(plan, { title: 'Notes', totalMs: 25 * MIN }, T0);
  assert.equal(plan.items.length, 1);
  assert.equal(item.quick, true);
  assert.equal(item.run.endAt, T0 + 25 * MIN);
});

test('a quick timer goes before what is planned, and its "then" becomes the next item', () => {
  const plan = dayOf({ title: 'Lunch', minutes: 30 });
  P.startNow(plan, { title: 'Notes', next: 'Email', step: 'Inbox', totalMs: 10 * MIN }, T0);
  assert.deepEqual(titles(plan), ['Notes', 'Email', 'Lunch']);
  assert.equal(plan.items[1].plannedMs, null);
  assert.equal(P.current(plan).run.next, 'Email');
  assert.equal(P.current(plan).run.step, 'Inbox');
});

test('a "then" that is already next in the plan is not added twice', () => {
  const plan = dayOf({ title: 'Lunch', minutes: 30 });
  P.startNow(plan, { title: 'Notes', next: '  lunch', totalMs: 10 * MIN }, T0);
  assert.deepEqual(titles(plan), ['Notes', 'Lunch']);
});

test('more time is a new segment of the same activity, linked to it', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10 });
  P.startItem(plan, plan.items[0].id, T0);
  E.settle(plan.items[0].run, T0 + 20 * MIN);
  const ext = P.extend(plan, 5 * MIN, T0 + 20 * MIN);
  assert.deepEqual(titles(plan), ['A', 'A', 'B']);
  assert.equal(ext.extOf, plan.items[0].id);
  assert.equal(ext.run.kind, 'extension');
  assert.equal(ext.run.next, 'B');
  assert.equal(P.schedule(plan, T0 + 20 * MIN)[2].start, T0 + 25 * MIN);
});

test('stopping keeps the item as part of the day, and Undo puts the run back', () => {
  const plan = dayOf({ title: 'A', minutes: 20 });
  const a = P.startItem(plan, plan.items[0].id, T0);
  const before = structuredClone(a);
  P.closeCurrent(plan, T0 + 5 * MIN, 'stopped');
  assert.equal(plan.cursor, null);
  assert.equal(plan.items[0].outcome, 'stopped');
  assert.equal(plan.items[0].endedAt, T0 + 5 * MIN);
  P.restoreItem(plan, before, 0);
  assert.equal(plan.cursor, a.id);
  assert.equal(P.current(plan).run.finishedAt, null);
});

test('a quick timer stopped within a minute is taken back out', () => {
  const plan = P.emptyPlan(T0);
  P.startNow(plan, { totalMs: 5 * MIN }, T0);
  P.closeCurrent(plan, T0 + 20_000, 'stopped');
  assert.equal(plan.items.length, 0);
});

test('actual time leaves out pauses', () => {
  const plan = dayOf({ title: 'A', minutes: 20 });
  const a = P.startItem(plan, plan.items[0].id, T0);
  E.pause(a.run, T0 + 5 * MIN);
  E.resume(a.run, T0 + 8 * MIN);
  E.pause(a.run, T0 + 10 * MIN);
  assert.equal(P.actualMs(a, T0 + 12 * MIN), 7 * MIN);
  E.resume(a.run, T0 + 12 * MIN);
  E.settle(a.run, T0 + 40 * MIN);
  P.closeCurrent(plan, T0 + 40 * MIN);
  // Finished at 2:25 after 5 minutes of pauses: 20 minutes of work, as planned.
  assert.equal(P.actualMs(a, T0 + 40 * MIN), 20 * MIN);
});

test('stopping while paused does not count the pause as time spent', () => {
  const plan = dayOf({ title: 'A', minutes: 25 });
  const a = P.startItem(plan, plan.items[0].id, T0);
  E.pause(a.run, T0 + 5 * MIN);
  P.closeCurrent(plan, T0 + 15 * MIN, 'stopped');
  assert.equal(P.actualMs(a, T0 + 15 * MIN), 5 * MIN);
});

test('undoing a removal never puts an item before one that started meanwhile', () => {
  const plan = dayOf({ title: 'A', minutes: 5 }, { title: 'B', minutes: 5 }, { title: 'C', minutes: 5 });
  const gone = P.removeItem(plan, plan.items[0].id);
  P.startItem(plan, plan.items[0].id, T0);
  P.restoreItem(plan, gone.item, gone.index);
  assert.deepEqual(titles(plan), ['B', 'A', 'C']);
});

test('a run whose end passed while the app was closed settles silently', () => {
  const plan = dayOf({ title: 'A', minutes: 10 });
  P.startItem(plan, plan.items[0].id, T0);
  const reopened = P.loadPlan(JSON.parse(JSON.stringify(plan)), null, T0 + 60 * MIN);
  const run = P.current(reopened).run;
  E.settle(run, T0 + 60 * MIN);
  assert.equal(run.finishedAt, T0 + 10 * MIN);
  assert.deepEqual(E.dueCues(run, T0 + 60 * MIN), []);
});

test('a session saved before plans existed becomes a plan', () => {
  const s = E.createSession({ title: 'Notes', next: 'Lunch', step: 'Wash up', totalMs: 25 * MIN }, T0);
  const plan = P.loadPlan(null, JSON.parse(JSON.stringify(s)), T0 + 5 * MIN);
  assert.deepEqual(titles(plan), ['Notes', 'Lunch']);
  const c = P.current(plan);
  assert.equal(c.startedAt, T0);
  assert.equal(c.run.endAt, T0 + 25 * MIN);
  assert.equal(c.run.next, 'Lunch');
  assert.equal(plan.items[1].step, 'Wash up');
  assert.deepEqual(P.loadPlan(null, null, T0).items, []);
});

test('a saved plan loads as it was', () => {
  const plan = dayOf({ title: 'A', minutes: 5 });
  const back = P.loadPlan(JSON.parse(JSON.stringify(plan)), { title: 'old' }, T0);
  assert.deepEqual(back, plan);
});

test('a new day files away what was done and offers what was not', () => {
  const plan = dayOf({ title: 'A', minutes: 20 }, { title: 'B', minutes: 10 }, { kind: 'event', title: 'Call', at: at(16, 0) });
  P.startItem(plan, plan.items[0].id, T0);
  E.settle(plan.items[0].run, T0 + 20 * MIN);
  const tomorrow = T0 + 24 * 60 * MIN;
  // A run still on screen keeps its day.
  assert.equal(P.rollDay(plan, tomorrow), null);
  P.closeCurrent(plan, T0 + 21 * MIN);
  const { plan: next, log } = P.rollDay(plan, tomorrow);
  assert.equal(next.day, P.dayKey(tomorrow));
  assert.equal(next.seq, plan.seq);
  assert.deepEqual(next.items, []);
  assert.deepEqual(next.carry, [{ kind: 'step', title: 'B', step: '', plannedMs: 10 * MIN }]);
  assert.equal(log.length, 1);
  assert.equal(log[0].title, 'A');
  assert.equal(log[0].actualMs, 20 * MIN);
  const b = P.takeCarry(next, 0);
  assert.equal(b.title, 'B');
  assert.deepEqual(next.carry, []);
  assert.equal(P.rollDay(next, tomorrow), null);
});
