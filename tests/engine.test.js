// The timer model: run with `node --test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../js/engine.js';

const { MIN } = E;
const T0 = new Date(2026, 10, 1, 14, 0).getTime(); // 2:00 PM local

test('the automatic warning is 15% of the length, kept between 2 and 10 minutes', () => {
  assert.equal(E.autoWarning(25 * MIN), 3.75 * MIN);
  assert.equal(E.autoWarning(5 * MIN), 2 * MIN);
  assert.equal(E.autoWarning(120 * MIN), 10 * MIN);
  // Never more than half a very short session.
  assert.equal(E.autoWarning(2 * MIN), 1 * MIN);
});

test('a new session ends at start plus length and trims its words', () => {
  const s = E.createSession({ title: '  Notes ', next: ' Lunch ', totalMs: 25 * MIN }, T0);
  assert.equal(s.endAt, T0 + 25 * MIN);
  assert.equal(s.title, 'Notes');
  assert.equal(s.next, 'Lunch');
  assert.deepEqual(s.warnSrc, []);
  assert.equal(E.remaining(s, T0 + 10 * MIN), 15 * MIN);
});

test('stages move from running to warning to finished', () => {
  const s = E.createSession({ totalMs: 20 * MIN, warnMs: 5 * MIN }, T0);
  assert.equal(E.stage(s, T0 + 10 * MIN), 'running');
  assert.equal(E.stage(s, T0 + 15 * MIN), 'warning');
  assert.equal(E.warnProgress(s, T0 + 17.5 * MIN), 0.5);
  assert.equal(E.stage(s, T0 + 20 * MIN), 'finished');
});

test('pausing freezes the time left and resuming pushes the end back', () => {
  const s = E.createSession({ totalMs: 20 * MIN }, T0);
  E.pause(s, T0 + 5 * MIN);
  assert.equal(E.remaining(s, T0 + 9 * MIN), 15 * MIN);
  E.resume(s, T0 + 9 * MIN);
  assert.equal(s.endAt, T0 + 24 * MIN);
  assert.equal(E.remaining(s, T0 + 9 * MIN), 15 * MIN);
  assert.equal(s.pausedMs, 4 * MIN);
});

test('adding time extends the end and rescales an automatic warning', () => {
  const s = E.createSession({ totalMs: 10 * MIN }, T0);
  E.adjust(s, 50 * MIN, T0);
  assert.equal(s.endAt, T0 + 60 * MIN);
  assert.equal(s.warnMs, E.autoWarning(60 * MIN));
});

test('a set warning is kept when time changes', () => {
  const s = E.createSession({ totalMs: 30 * MIN, warnMs: 5 * MIN }, T0);
  E.adjust(s, 30 * MIN, T0);
  assert.equal(s.warnMs, 5 * MIN);
});

test('taking off more than is left finishes quietly, with every cue marked done', () => {
  const s = E.createSession({ totalMs: 10 * MIN }, T0);
  E.adjust(s, -15 * MIN, T0 + 2 * MIN);
  assert.equal(s.finishedAt, T0 + 2 * MIN);
  assert.deepEqual(s.fired, { half: true, warn: true, finish: true });
  assert.deepEqual(E.dueCues(s, T0 + 3 * MIN), []);
});

test('adding time back re-arms cues that are in the future again', () => {
  const s = E.createSession({ totalMs: 20 * MIN, warnMs: 5 * MIN }, T0);
  E.dueCues(s, T0 + 16 * MIN); // warning fires
  assert.equal(s.fired.warn, true);
  E.adjust(s, 10 * MIN, T0 + 16 * MIN);
  assert.equal(s.fired.warn, false);
});

test('each cue plays once, in order, on the tick it comes due', () => {
  const s = E.createSession({ totalMs: 20 * MIN, warnMs: 5 * MIN }, T0);
  assert.deepEqual(E.dueCues(s, T0 + 5 * MIN), []);
  assert.deepEqual(E.dueCues(s, T0 + 10 * MIN), ['half']);
  assert.deepEqual(E.dueCues(s, T0 + 10 * MIN + 1000), []);
  assert.deepEqual(E.dueCues(s, T0 + 15 * MIN), ['warn']);
  assert.deepEqual(E.dueCues(s, T0 + 20 * MIN), ['finish']);
  assert.equal(s.finishedAt, T0 + 20 * MIN);
});

test('when several cues come due together only the most important plays', () => {
  const s = E.createSession({ totalMs: 4 * MIN, warnMs: 2 * MIN }, T0);
  // A throttled background tab wakes after both halfway and the warning.
  assert.deepEqual(E.dueCues(s, T0 + 2 * MIN + 500), ['warn']);
});

test('a cue more than 75 seconds late is marked done without playing', () => {
  const s = E.createSession({ totalMs: 10 * MIN, warnMs: 2 * MIN }, T0);
  assert.deepEqual(E.dueCues(s, T0 + 12 * MIN), []);
  assert.equal(s.fired.finish, true);
  assert.equal(s.finishedAt, T0 + 10 * MIN);
});

test('no cue plays while paused', () => {
  const s = E.createSession({ totalMs: 10 * MIN }, T0);
  E.pause(s, T0 + 4 * MIN);
  assert.deepEqual(E.dueCues(s, T0 + 30 * MIN), []);
});

test('reopening after the end lands on the finished state at the real end time', () => {
  const s = E.createSession({ totalMs: 10 * MIN }, T0);
  E.settle(s, T0 + 60 * MIN);
  assert.equal(s.finishedAt, T0 + 10 * MIN);
  assert.deepEqual(s.fired, { half: true, warn: true, finish: true });
});

test('finishing while paused counts the pause as paused', () => {
  const s = E.createSession({ totalMs: 10 * MIN }, T0);
  E.pause(s, T0 + 2 * MIN);
  E.finishNow(s, T0 + 7 * MIN);
  assert.equal(s.pausedMs, 5 * MIN);
  assert.equal(s.pausedAt, null);
});

test('finishing now ends the session and silences every cue', () => {
  const s = E.createSession({ totalMs: 10 * MIN }, T0);
  E.finishNow(s, T0 + MIN);
  assert.equal(E.stage(s, T0 + MIN), 'finished');
  assert.equal(E.remaining(s, T0 + MIN), 0);
  assert.deepEqual(E.dueCues(s, T0 + 2 * MIN), []);
});

test('an end time later today gives the length up to it, minus travel', () => {
  assert.equal(E.untilMs('14:30', 0, T0), 30 * MIN);
  assert.equal(E.untilMs('14:30', 5, T0), 25 * MIN);
});

test('an end time just after midnight counts as tonight, not this morning', () => {
  const late = new Date(2026, 10, 1, 23, 50).getTime();
  assert.equal(E.untilMs('00:15', 0, late), 25 * MIN);
});

test('an end time earlier today stays in the past', () => {
  assert.ok(E.untilMs('13:10', 0, T0) < 0);
});

test('stages shorter than the session are kept; the light starts at the last-but-one', () => {
  const r = E.resolveStages([MIN, 15 * MIN, 5 * MIN, 5 * MIN], 25 * MIN);
  assert.deepEqual(r.stages, [15 * MIN, 5 * MIN, MIN]);
  assert.equal(r.warnMs, 5 * MIN);
  // A stage not shorter than the session is skipped.
  assert.deepEqual(E.resolveStages([30 * MIN, 5 * MIN], 20 * MIN), { stages: [5 * MIN], warnMs: 5 * MIN });
  // No stages asked for, or none that fit: one automatic warning.
  assert.deepEqual(E.resolveStages([], 25 * MIN), { stages: [E.autoWarning(25 * MIN)], warnMs: E.autoWarning(25 * MIN) });
  assert.deepEqual(E.resolveStages([5 * MIN], 4 * MIN).stages, [E.autoWarning(4 * MIN)]);
});

test('the warm light never starts before halfway', () => {
  const r = E.resolveStages([5 * MIN, MIN], 6 * MIN);
  assert.equal(r.warnMs, 3 * MIN);
  assert.deepEqual(r.stages, [3 * MIN, MIN]);
});

test('each stage plays once, in order, and the light follows the last-but-one', () => {
  const s = E.createSession({ totalMs: 30 * MIN, warnStages: [15 * MIN, 5 * MIN, MIN] }, T0);
  assert.equal(s.warnMs, 5 * MIN);
  assert.deepEqual(E.dueCues(s, T0 + 15 * MIN), ['warn']); // halfway and the 15 minute stage together
  assert.equal(E.stage(s, T0 + 20 * MIN), 'running');
  assert.deepEqual(E.dueCues(s, T0 + 25 * MIN), ['warn']);
  assert.equal(E.stage(s, T0 + 25 * MIN), 'warning');
  assert.deepEqual(E.dueCues(s, T0 + 26 * MIN), []);
  assert.deepEqual(E.dueCues(s, T0 + 29 * MIN), ['warn']);
  assert.deepEqual(E.dueCues(s, T0 + 30 * MIN), ['finish']);
});

test('a stage passed while the app was closed is never played late', () => {
  const s = E.createSession({ totalMs: 30 * MIN, warnStages: [15 * MIN, 5 * MIN, MIN] }, T0);
  E.settle(s, T0 + 26 * MIN);
  assert.deepEqual(E.dueCues(s, T0 + 26 * MIN), []);
  assert.deepEqual(E.dueCues(s, T0 + 29 * MIN), ['warn']);
});

test('adding time brings back the stages it moves into the future', () => {
  const s = E.createSession({ totalMs: 10 * MIN, warnStages: [15 * MIN, 5 * MIN, MIN] }, T0);
  assert.deepEqual(s.stages, [5 * MIN, MIN]); // 15 doesn't fit in 10
  E.dueCues(s, T0 + 6 * MIN); // the 5 minute stage plays
  E.adjust(s, 20 * MIN, T0 + 6 * MIN); // now 30 minutes long, 24 left
  assert.deepEqual(s.stages, [15 * MIN, 5 * MIN, MIN]);
  assert.equal(s.warnMs, 5 * MIN);
  assert.deepEqual(E.dueCues(s, T0 + 15 * MIN), ['warn']);
});

test('a session saved with one warning keeps working', () => {
  const saved = more => ({ id: 'x', title: '', next: '', step: '', kind: 'main', totalMs: 20 * MIN, warnMs: 5 * MIN, autoWarn: false,
    endAt: T0 + 20 * MIN, pausedAt: null, finishedAt: null, fired: { half: true, warn: false, finish: false }, ...more });
  const old = saved();
  assert.deepEqual(E.dueCues(old, T0 + 15 * MIN), ['warn']);
  assert.deepEqual(old.stages, [5 * MIN]);
  assert.deepEqual(E.dueCues(old, T0 + 16 * MIN), []);
  const auto = saved({ autoWarn: true, warnMs: E.autoWarning(20 * MIN), fired: { half: true, warn: true, finish: false } });
  E.settle(auto, T0 + 19 * MIN);
  assert.deepEqual(E.dueCues(auto, T0 + 19 * MIN), []);
  assert.deepEqual(auto.warnSrc, []);
});
