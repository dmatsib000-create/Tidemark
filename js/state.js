// The state every part of the page shares: settings, the mode, and the day plan
// with its current session.

import * as E from './engine.js';
import * as P from './plan.js';
import { load, save } from './store.js';

/* ---------- Settings ---------- */

export const BUNDLES = {
  quiet: {
    cues: { half: { sound: false, speak: false }, warn: { sound: false, speak: false }, finish: { sound: false, speak: false } },
    warmth: 'subtle', breathe: false,
  },
  balanced: {
    cues: { half: { sound: false, speak: false }, warn: { sound: true, speak: false }, finish: { sound: true, speak: false } },
    warmth: 'normal', breathe: false,
  },
  noticeable: {
    cues: { half: { sound: true, speak: false }, warn: { sound: true, speak: true }, finish: { sound: true, speak: true } },
    warmth: 'strong', breathe: true,
  },
};

export const clone = o => JSON.parse(JSON.stringify(o));
const DEFAULTS = {
  defaultMode: 'full', face: 'planner', fullFace: 'disc', bundle: 'balanced', ...clone(BUNDLES.balanced),
  volume: 0.6, flash: false, wake: true, notify: false, rememberLengths: false,
  // Minutes before the end; none chosen means one automatic warning.
  warnStages: [5, 1],
  // The most extra time (minutes) "More time" gives one activity; null is no limit.
  extraCapMin: null,
};
const stored = load('settings', {});
export const settings = { ...clone(DEFAULTS), ...stored, cues: { ...clone(DEFAULTS.cues), ...(stored.cues || {}) } };
export const saveSettings = () => save('settings', settings);

/* ---------- State ---------- */

// Other modules read `mode`, `plan`, `session` and `view` as live bindings;
// only the setters below replace them. `session` is the run of the plan's
// current item (running, or finished and waiting for the handoff), so the
// timer code works on it as on a single session.
export let mode = settings.defaultMode;     // for this visit only
export let view = 'main';                   // 'plan' while the plan screen is open
// A session saved before plans existed becomes a one-item plan.
export let plan = P.loadPlan(load('plan', null), load('session', null), Date.now());
export let session = null;
persist();
save('session', null);
if (session) { E.settle(session); persist(); }
newDay();

export function setMode(next) { mode = next; }
export function setView(next) { view = next; }
export function setPlan(next) { plan = next; persist(); }

// Saves the plan after any change to it. Every change ends here, so the
// running session's "then" line is refreshed here too.
export function persist() {
  P.normalize(plan);
  session = P.current(plan)?.run ?? null;
  save('plan', plan);
}

// The first look at the plan on a new day: finished items go to the log, and
// yesterday's unstarted ones wait to be carried over. Returns true when the day
// changed.
export function newDay(now = Date.now()) {
  const rolled = P.rollDay(plan, now);
  if (!rolled) return false;
  if (rolled.log.length) save('history', [...load('history', []), ...rolled.log].slice(-2000));
  setPlan(rolled.plan);
  return true;
}
