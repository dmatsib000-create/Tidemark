// A session's life: starting, the running controls, finishing and stopping,
// the cues along the way, and keeping the screen awake meanwhile.

import * as E from './engine.js';
import * as P from './plan.js';
import { load, save, noteKey } from './store.js';
import { unlockAudio, chime, speak } from './sound.js';
import { mode, plan, session, settings, persist, clone, setView } from './state.js';
import { $, fmtLeft, toast, announce } from './ui.js';
import { resetForm } from './setup.js';
import { render } from './screens.js';
import { frame } from './draw.js';
import { closeFloat } from './pip.js';

const { MIN } = E;

/* ---------- Session lifecycle ---------- */

// The person's usual warnings, from Menu, in ms.
const usualStages = () => settings.warnStages.map(m => m * MIN);
export const extraCapMs = () => (settings.extraCapMin ? settings.extraCapMin * MIN : undefined);

// Per-activity lengths are kept only when the person turns this on in Menu.
export const suggestedMinutes = title => (settings.rememberLengths && load('lengths', {})[noteKey(title)]) || 25;

function rememberLength(opts) {
  if (!settings.rememberLengths || opts.kind === 'extension' || !noteKey(opts.title)) return;
  const lengths = load('lengths', {});
  lengths[noteKey(opts.title)] = Math.round(opts.totalMs / MIN);
  save('lengths', lengths);
}

function started() {
  persist();
  setView('main');
  resetForm();
  render();
  frame.force = true;
}

// A quick start (the setup form, Simple mode, a preset): a one-item plan, put
// before whatever the plan has next.
export function startSession(opts) {
  unlockAudio();
  rememberLength(opts);
  $('toast').hidden = true;
  if (P.startNow(plan, { ...opts, warnStages: opts.warnStages ?? usualStages() }, Date.now())) started();
}

// Starts an item from the plan; `minutes` is a length chosen at the handoff.
export function startPlanItem(id, minutes) {
  const item = P.byId(plan, id);
  if (!item) return;
  unlockAudio();
  const totalMs = minutes ? minutes * MIN : undefined;
  if (P.startItem(plan, id, Date.now(), { totalMs, warnStages: usualStages(), fallbackMs: suggestedMinutes(item.title) * MIN })) {
    rememberLength({ title: item.title, totalMs: item.run.totalMs });
    $('toast').hidden = true;
    started();
  }
}

// More time on what just finished: a short new segment of the same activity.
export function extendSession(minutes) {
  $('toast').hidden = true;
  if (P.extend(plan, minutes * MIN, Date.now(), { capMs: extraCapMs(), warnStages: usualStages() })) started();
  else { render(); toast('That is more than the extra time you set.'); }
}

// Stopping keeps the time spent as part of the day; Undo puts the run back.
function stopSession() {
  const item = P.current(plan);
  if (!item) return;
  const before = clone(item), index = plan.items.indexOf(item), day = plan.day;
  P.closeCurrent(plan, Date.now(), 'stopped');
  persist();
  resetForm();
  closeFloat();
  render();
  toast('Session stopped', () => {
    // Not once another session has started, or the day has turned over.
    if (session || plan.day !== day) return;
    P.restoreItem(plan, before, index);
    persist();
    E.settle(session);
    persist();
    render();
  });
}

// Done on the finish screen. With more planned, the plan comes up next.
export function endSession() {
  P.closeCurrent(plan, Date.now());
  persist();
  closeFloat();
  resetForm();
  if (mode !== 'simple' && P.upcoming(plan).length) setView('plan');
  render();
}

// `cued` is true only when the finish arrived live and its cue played. Quiet
// endings (Finish now, taking off more time than is left, a finish missed
// while closed) skip the flash and breathing light.
export function onFinished(cued = false) {
  persist();
  render();
  if (!cued) return;
  const light = $('light');
  if (settings.flash) {
    light.classList.add('flash');
    light.addEventListener('animationend', () => light.classList.remove('flash'), { once: true });
  }
  if (settings.breathe) {
    // Breathing follows the flashes, however long reduced motion makes them.
    const start = () => light.classList.add('breathe');
    if (settings.flash) light.addEventListener('animationend', start, { once: true });
    else start();
    setTimeout(() => light.classList.remove('breathe'), 60_000);
  }
}

$('pause-btn').addEventListener('click', () => {
  if (!session) return;
  if (session.pausedAt) E.resume(session); else E.pause(session);
  persist();
  render();
});
for (const b of document.querySelectorAll('[data-adj]')) {
  b.addEventListener('click', () => {
    if (!session) return;
    E.adjust(session, +b.dataset.adj * MIN);
    persist();
    if (session.finishedAt) onFinished(); else render();
  });
}
$('finish-btn').addEventListener('click', () => {
  if (!session) return;
  E.finishNow(session);
  announce(cueWords('finish', session));
  onFinished();
});
$('stop-btn').addEventListener('click', stopSession);

/* ---------- Cues ---------- */

function cueWords(cue, s) {
  if (mode === 'work') return cue === 'finish' ? 'Session finished.' : '';
  const title = s.title;
  if (cue === 'half') return `Halfway${title ? ` through ${title}` : ''}.`;
  if (cue === 'warn') return `${fmtLeft(E.remaining(s))} left${title ? ` in ${title}` : ''}.${s.next ? ` Next: ${s.next}.` : ''}`;
  return `${title ? `${title} is finished.` : 'Finished.'}${s.next ? ` Next: ${s.next}.` : ''}`;
}

export function playCue(cue) {
  const c = settings.cues[cue] || {};
  if (c.sound) chime(cue, settings.volume);
  if (c.speak) speak(cueWords(cue, session));
  if (cue !== 'half') announce(cueWords(cue, session) || '');
  if (cue !== 'half') notify(cue);
}

async function notify(cue) {
  if (!settings.notify || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  const s = session;
  let title, text = '';
  if (mode === 'work') {
    if (cue !== 'finish') return;
    title = 'Session finished.';
    text = s.next ? `Next: ${s.next}` : '';
  } else if (cue === 'warn') {
    title = `${fmtLeft(E.remaining(s))} left${s.title ? ` · ${s.title}` : ''}`;
    text = s.next ? `Then ${s.next}` : '';
  } else {
    title = `${s.title || 'Session'} finished`;
    text = s.next ? `Next: ${s.next}` : '';
  }
  const opts = { body: text, tag: 'tidemark', icon: 'icons/icon-192.png', silent: true };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, opts); else new Notification(title, opts);
  } catch { /* notifications are optional */ }
}

// Audio needs a tap to start, including after a reload with a session running.
document.addEventListener('pointerdown', unlockAudio, { passive: true });

/* ---------- Screen wake lock ---------- */

// A change that arrives while a request is still pending runs again after it,
// so pausing during the request doesn't leave the screen held awake.
let wakeLock = null, wakeBusy = false, wakeAgain = false;
export async function syncWake() {
  if (wakeBusy) { wakeAgain = true; return; }
  wakeBusy = true;
  try {
    const want = () => settings.wake && session && !session.finishedAt && !session.pausedAt && document.visibilityState === 'visible';
    if (want() && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
    if (!want() && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { wakeLock = null; }
  wakeBusy = false;
  if (wakeAgain) { wakeAgain = false; syncWake(); }
}
