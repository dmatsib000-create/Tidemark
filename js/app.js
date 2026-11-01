// VizTime: wiring between the timer model, the page, and the floating views.

import * as E from './engine.js';
import { load, save, getNote, setNote, noteKey } from './store.js';
import { unlockAudio, chime, speak } from './sound.js';
import { palette, drawFace, paintWarmth, SERIF } from './faces.js';
import { canFloatWindow, canFloatVideo, openFloatWindow, openFloatVideo } from './float.js';

const $ = id => document.getElementById(id);
const { MIN } = E;
const body = document.body;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Settings ---------- */

const BUNDLES = {
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
const BUNDLE_HINTS = {
  quiet: 'No sound. A faint warm light is the only cue.',
  balanced: 'A soft tone at the warning and at the finish, and a gentle warm light.',
  noticeable: 'Tones at halfway, the warning and the finish, a spoken line, and a stronger light that breathes slowly at the end.',
  custom: 'Your own mix of cues.',
};
const LIGHT_GAIN = { subtle: 0.6, normal: 1, strong: 1.6 };

const clone = o => JSON.parse(JSON.stringify(o));
const DEFAULTS = {
  defaultMode: 'full', face: 'planner', bundle: 'balanced', ...clone(BUNDLES.balanced),
  volume: 0.6, flash: false, wake: true, notify: false, rememberLengths: false,
};
const stored = load('settings', {});
const settings = { ...clone(DEFAULTS), ...stored, cues: { ...clone(DEFAULTS.cues), ...(stored.cues || {}) } };
const saveSettings = () => save('settings', settings);

function matchBundle() {
  const pick = s => JSON.stringify({ cues: s.cues, warmth: s.warmth, breathe: s.breathe });
  return Object.keys(BUNDLES).find(k => pick(BUNDLES[k]) === pick(settings)) || 'custom';
}

/* ---------- State ---------- */

let mode = settings.defaultMode;     // for this visit only
let session = load('session', null);  // the running or just-finished session
let presets = load('presets', []);
if (session) { E.settle(session); persist(); }

function persist() { save('session', session); }

/* ---------- Formatting ---------- */

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const fmtClock = t => timeFmt.format(t);
// Clock time without AM/PM, for the planner's narrow margin.
const fmtShort = t => timeFmt.formatToParts(t).filter(p => p.type !== 'dayPeriod').map(p => p.value).join('').trim();

function fmtLeft(ms) {
  if (ms < MIN) return 'under a minute';
  const m = Math.ceil(ms / MIN);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}`;
}

/* ---------- Screens ---------- */

const screenFor = () => (!session ? 'setup' : session.finishedAt ? 'landing' : 'run');

let shownScreen = null;

function render() {
  const screen = screenFor();
  const changed = shownScreen !== null && shownScreen !== screen;
  shownScreen = screen;
  body.dataset.mode = mode;
  body.dataset.screen = screen;
  for (const b of document.querySelectorAll('#mode-switch [data-mode]')) b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
  if (screen !== 'run') body.classList.remove('is-edit-open', 'is-note-open');
  renderSetup();
  if (session && !session.finishedAt) renderRun();
  if (session && session.finishedAt) renderLanding();
  $('float-btn').hidden = !(session && !session.finishedAt && (canFloatWindow() || canFloatVideo()));
  tick();
  syncWake();
  if (changed) focusScreen(screen);
}

// After Start, Finish, Stop or Done, focus is left on a button the change just
// hid. Move it to the new screen's heading so keyboard and VoiceOver users
// arrive at the top of what is now showing.
function focusScreen(screen) {
  const active = document.activeElement;
  if (active && active !== body && active.getClientRects().length) return;
  const target = screen === 'setup'
    ? (mode === 'simple' ? $('s-chips').firstElementChild : $('setup-heading'))
    : screen === 'run' ? $('r-title') : $('l-title');
  target.focus();
}

/* ---------- Setup (full and work) ---------- */

function showError(errId, fieldId, msg = '') {
  $(errId).textContent = msg;
  for (const id of ['f-minutes', 'f-until', 's-minutes']) {
    if ($(id).getAttribute('aria-describedby') !== errId) continue;
    $(id).removeAttribute('aria-invalid');
    $(id).removeAttribute('aria-describedby');
  }
  if (msg && fieldId) {
    $(fieldId).setAttribute('aria-invalid', 'true');
    $(fieldId).setAttribute('aria-describedby', errId);
  }
}
// Every mode has the For/Until switch. Work mode starts on Until, because an
// end time reads as an appointment; the other modes start on For.
const defaultBy = () => (mode === 'work' ? 'until' : 'for');
const lengthBy = () => form.by;
const lengthField = () => (lengthBy() === 'for' ? 'f-minutes' : 'f-until');

// minutes: the chosen For button. untilMin: the chosen Until button, as
// minutes from now; a typed "next starts at" time overrides it.
const form = { by: 'for', minutes: 25, untilMin: 25 };

function resetForm() {
  form.by = defaultBy();
  form.minutes = 25;
  form.untilMin = 25;
  for (const id of ['f-title', 'f-next', 'f-step', 'f-minutes', 'f-until']) $(id).value = '';
  $('f-buffer').value = '0';
  $('f-warn').value = 'auto';
  showError('f-error');
  renderSetup();
}

function renderSetup() {
  const work = mode === 'work', by = lengthBy();
  for (const b of document.querySelectorAll('[data-by]')) b.setAttribute('aria-pressed', String(b.dataset.by === form.by));
  $('by-for').hidden = by !== 'for';
  $('by-until').hidden = by !== 'until';
  const exact = $('f-minutes').value.trim();
  // In Work mode typed minutes are confirmed as an end time, never a duration.
  const typed = parseInt(exact, 10);
  $('f-exact-hint').textContent = work && typed >= 1 && typed <= 600 ? `Ends at ${fmtClock(Date.now() + typed * MIN)}.` : '';
  for (const c of $('f-chips').children) c.setAttribute('aria-pressed', String(by === 'for' && !exact && +c.dataset.min === form.minutes));
  const typedTime = $('f-until').value;
  for (const c of $('u-chips').children) c.setAttribute('aria-pressed', String(by === 'until' && !typedTime && +c.dataset.min === form.untilMin));
  labelChips(Date.now());
  showRibbon('f-ribbon', 'f-ribbon-text', $('f-title').value);
  renderUntilHint();
  renderPresets();
}

// Until buttons (and, in Work mode, the finish screen's lengths) read as end
// times ("2:45"); For buttons read as minutes. End times follow the clock, so
// they are refreshed every tick.
function labelChips(now) {
  const asTime = c => {
    const min = +c.dataset.min;
    c.textContent = fmtShort(now + min * MIN);
    c.setAttribute('aria-label', `Until ${fmtClock(now + min * MIN)}`);
  };
  const asMinutes = c => {
    c.textContent = c.dataset.min;
    c.setAttribute('aria-label', `${c.dataset.min} minutes`);
  };
  [...$('u-chips').children].forEach(asTime);
  [...$('f-chips').children].forEach(asMinutes);
  [...$('l-chips').children].forEach(mode === 'work' ? asTime : asMinutes);
}

function showRibbon(wrapId, textId, title) {
  const note = getNote(title);
  $(wrapId).hidden = !note;
  if (note) $(textId).textContent = note.text;
}

function untilTotal() {
  const v = $('f-until').value;
  if (!v) return null;
  const [h, m] = v.split(':').map(Number);
  const target = new Date();
  target.setHours(h, m, 0, 0);
  return target.getTime() - (+$('f-buffer').value) * MIN - Date.now();
}

function renderUntilHint() {
  const total = untilTotal();
  // Work mode shows only the clock time, never a duration someone could read as a countdown.
  $('f-until-hint').textContent = total == null ? '' : total < MIN
    ? 'That leaves no time. Choose a later time.'
    : mode === 'work' ? `Ends at ${fmtClock(Date.now() + total)}.`
      : `This session ends at ${fmtClock(Date.now() + total)}, ${fmtLeft(total)} from now.`;
}

function readForm() {
  let totalMs;
  if (lengthBy() === 'for') {
    const exact = $('f-minutes').value.trim();
    const minutes = exact ? parseInt(exact, 10) : form.minutes;
    if (!(minutes >= 1 && minutes <= 600)) return { error: 'Choose a length between 1 and 600 minutes.' };
    totalMs = minutes * MIN;
  } else if (!$('f-until').value) {
    totalMs = form.untilMin * MIN;
  } else {
    totalMs = untilTotal();
    if (totalMs < MIN) return { error: 'That time has passed or is too close. Choose a later time.' };
    totalMs = Math.round(totalMs / 1000) * 1000;
  }
  const w = $('f-warn').value;
  let warnMs = w === 'auto' ? undefined : +w * MIN;
  if (warnMs && warnMs >= totalMs) warnMs = totalMs / 2;
  return {
    title: $('f-title').value, next: $('f-next').value, step: $('f-step').value, totalMs, warnMs,
  };
}

function renderPresets() {
  const list = $('preset-list');
  list.replaceChildren(...presets.map(p => {
    const li = document.createElement('li');
    const start = document.createElement('button');
    start.type = 'button';
    start.className = 'preset-start';
    const name = document.createElement('span');
    name.className = 'preset-name';
    name.textContent = p.title || `${p.minutes} minutes`;
    if (p.next) {
      const em = document.createElement('em');
      em.textContent = `, then ${p.next}`;
      name.append(em);
    }
    const len = document.createElement('span');
    len.className = 'preset-len';
    len.textContent = `${p.minutes} min`;
    start.append(name, len);
    start.addEventListener('click', () => startSession({
      title: p.title, next: p.next, step: p.step, totalMs: p.minutes * MIN,
      warnMs: p.warn === 'auto' ? undefined : Math.min(+p.warn * MIN, (p.minutes * MIN) / 2),
    }));
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'preset-del';
    del.textContent = '×';
    del.setAttribute('aria-label', `Remove preset ${p.title || p.minutes + ' minutes'}`);
    del.addEventListener('click', () => {
      const removed = presets.indexOf(p);
      presets = presets.filter(x => x !== p);
      save('presets', presets);
      renderPresets();
      toast('Preset removed', () => { presets.splice(removed, 0, p); save('presets', presets); renderPresets(); });
    });
    li.append(start, del);
    return li;
  }));
  $('presets-empty').hidden = presets.length > 0;
  list.closest('.presets').classList.toggle('has-items', presets.length > 0);
}

$('setup-form').addEventListener('submit', e => {
  e.preventDefault();
  const f = readForm();
  if (f.error) { showError('f-error', lengthField(), f.error); return; }
  startSession(f);
});

$('f-save').addEventListener('click', () => {
  // An Until button is a length from now, so it saves; a typed clock time doesn't.
  if (lengthBy() === 'until' && $('f-until').value) { showError('f-error', null, 'Presets use a length. Choose one of the times above, or switch to “For”.'); return; }
  const f = readForm();
  if (f.error) { showError('f-error', lengthField(), f.error); return; }
  presets.push({
    id: Date.now().toString(36), title: f.title.trim(), next: f.next.trim(), step: f.step.trim(),
    minutes: Math.round(f.totalMs / MIN), warn: $('f-warn').value,
  });
  save('presets', presets);
  showError('f-error');
  renderPresets();
  toast('Preset saved');
});

$('f-clear').addEventListener('click', resetForm);

for (const b of document.querySelectorAll('[data-by]')) {
  b.addEventListener('click', () => { form.by = b.dataset.by; showError('f-error'); renderSetup(); });
}
for (const c of $('f-chips').children) {
  c.addEventListener('click', () => { form.minutes = +c.dataset.min; $('f-minutes').value = ''; showError('f-error'); renderSetup(); });
}
for (const c of $('u-chips').children) {
  c.addEventListener('click', () => { form.untilMin = +c.dataset.min; $('f-until').value = ''; showError('f-error'); renderSetup(); });
}
$('f-minutes').addEventListener('input', () => { showError('f-error'); renderSetup(); });
// The keyboard's return key moves to the next field instead of starting early.
const fieldOrder = ['f-title', 'f-next', 'f-step'];
fieldOrder.forEach((id, i) => $(id).addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  e.preventDefault();
  if (fieldOrder[i + 1]) $(fieldOrder[i + 1]).focus(); else $(id).blur();
}));
$('f-title').addEventListener('input', () => showRibbon('f-ribbon', 'f-ribbon-text', $('f-title').value));
for (const id of ['f-until', 'f-buffer']) $(id).addEventListener('input', () => { showError('f-error'); renderSetup(); });

/* ---------- Setup (simple) ---------- */

for (const c of $('s-chips').children) {
  c.addEventListener('click', () => startSession({ totalMs: +c.dataset.min * MIN }));
}
$('s-form').addEventListener('submit', e => {
  e.preventDefault();
  const m = parseInt($('s-minutes').value, 10);
  if (!(m >= 1 && m <= 600)) { showError('s-error', 's-minutes', 'Type a number of minutes from 1 to 600.'); return; }
  showError('s-error');
  $('s-minutes').value = '';
  startSession({ totalMs: m * MIN });
});
$('s-minutes').addEventListener('input', () => showError('s-error'));

/* ---------- Session lifecycle ---------- */

// Per-activity lengths are kept only when the person turns this on in Menu.
const suggestedMinutes = title => (settings.rememberLengths && load('lengths', {})[noteKey(title)]) || 25;

function rememberLength(opts) {
  if (!settings.rememberLengths || opts.kind === 'extension' || !noteKey(opts.title)) return;
  const lengths = load('lengths', {});
  lengths[noteKey(opts.title)] = Math.round(opts.totalMs / MIN);
  save('lengths', lengths);
}

function startSession(opts) {
  unlockAudio();
  rememberLength(opts);
  $('toast').hidden = true;
  session = E.createSession(opts);
  persist();
  resetForm();
  render();
  frame.force = true;
}

function stopSession() {
  const prev = session;
  session = null;
  persist();
  resetForm();
  closeFloat();
  render();
  toast('Session stopped', () => {
    if (session) return;
    session = prev;
    E.settle(session);
    persist();
    render();
  });
}

// `cued` is true only when the finish arrived live and its cue played. Quiet
// endings (Finish now, taking off more time than is left, a finish missed
// while closed) skip the flash and breathing light.
function onFinished(cued = false) {
  persist();
  render();
  if (!cued) return;
  const light = $('light');
  if (settings.flash) {
    light.classList.add('flash');
    light.addEventListener('animationend', () => light.classList.remove('flash'), { once: true });
  }
  if (settings.breathe) {
    setTimeout(() => light.classList.add('breathe'), settings.flash ? 5000 : 0);
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

/* ---------- Running screen ---------- */

const leftFigures = (s, now) => {
  const left = E.remaining(s, now);
  if (s.pausedAt) return `Paused · <strong>${fmtLeft(left)}</strong> left`;
  return `<strong>${fmtLeft(left)}</strong> left · ends ${fmtClock(s.endAt)}`;
};

function renderRun(now = Date.now()) {
  const s = session;
  const st = E.stage(s, now);
  const noteFor = getNote(s.title);

  $('r-kind').textContent = s.kind === 'extension' ? 'Extra time' : '';
  $('r-title').textContent = s.title || `${Math.round(s.totalMs / MIN)} minutes`;
  $('r-next-line').hidden = !s.next;
  $('r-next').textContent = s.next;
  showRibbon('r-ribbon', 'r-ribbon-text', s.title);
  $('r-figures').innerHTML = leftFigures(s, now);
  $('pause-btn').textContent = s.pausedAt ? 'Resume' : 'Pause';

  // The next activity takes the stage for the last stretch.
  const showCard = mode === 'full' && s.next && st !== 'running';
  $('next-card').hidden = !showCard;
  if (showCard) {
    $('next-card').style.setProperty('--p', E.warnProgress(s, now).toFixed(3));
    $('nc-title').textContent = s.next;
    $('nc-step').textContent = s.step ? `First: ${s.step}` : '';
    const nextNote = getNote(s.next);
    $('nc-note').textContent = nextNote ? `Last time: ${nextNote.text}` : '';
  }

  // Offer the where-I-left-off note while there is still a thread to hold.
  const noteForm = $('leave-note');
  noteForm.hidden = !s.title || (mode === 'full' && st === 'running') || mode === 'simple';
  if (document.activeElement !== $('ln-text')) $('ln-text').value = noteFor ? noteFor.text : '';
  $('w-note-btn').hidden = !s.title;

  // Work mode: desk clock and schedule.
  $('w-now-when').textContent = `${fmtShort(s.endAt - s.totalMs)}–${fmtShort(s.endAt)}`;
  $('w-now-what').textContent = s.title || 'Current';
  $('w-next-row').hidden = !s.next;
  $('w-next-when').textContent = fmtShort(s.endAt);
  $('w-next-what').textContent = s.next;
  for (const d of document.querySelectorAll('[data-face]')) d.setAttribute('aria-pressed', String(d.dataset.face === settings.face));

  const face = $('face');
  face.setAttribute('aria-label', faceLabel(now));
  if (mode === 'work') { face.setAttribute('role', 'button'); face.tabIndex = 0; }
  else { face.setAttribute('role', 'img'); face.removeAttribute('tabindex'); }
  renderFloatText(now);
}

// The main start button; in Work mode it names an end time, which moves with the clock.
function labelMain(now) {
  if (!session || !session.next) return;
  const m = +$('l-main').dataset.min || 25;
  $('l-main').textContent = mode === 'work'
    ? `Start ${session.next} · until ${fmtShort(now + m * MIN)}`
    : `Start ${session.next} · ${m} min`;
}

function renderLanding() {
  const s = session;
  const work = mode === 'work', simple = mode === 'simple';
  const hasNext = !!s.next && !simple;

  let label = '', title = 'Finished';
  if (work) { label = hasNext ? 'Session finished.' : ''; title = hasNext ? s.next : 'Session finished.'; }
  else if (!simple && hasNext) { label = `${s.title || 'This session'} is finished. Next:`; title = s.next; }
  else if (!simple) label = s.title;
  $('l-label').textContent = label;
  $('l-title').textContent = title;
  $('l-step').textContent = hasNext && s.step ? `First: ${s.step}` : '';
  showRibbon('l-ribbon', 'l-ribbon-text', hasNext ? s.next : '');

  $('l-start').hidden = !hasNext;
  if (hasNext) $('l-main').dataset.min = suggestedMinutes(s.next);
  labelMain(Date.now());
  $('l-start-label').textContent = work ? 'Or until' : 'Or another length';
  labelChips(Date.now());

  $('l-note').hidden = !s.title || simple;
  $('l-note-label').textContent = work ? 'Note' : `Where did you leave off on ${s.title}?`;
  const note = getNote(s.title);
  if (document.activeElement !== $('l-note-text')) $('l-note-text').value = note ? note.text : '';
  $('l-note-saved').textContent = '';

  $('l-more-label').textContent = work ? 'Extend' : simple ? 'More time' : `More time on ${s.title || 'this'}`;
  for (const b of document.querySelectorAll('[data-extend]')) b.textContent = `+${b.dataset.extend} min`;
  renderFloatText(Date.now());
}

for (const c of $('l-chips').children) {
  c.addEventListener('click', () => startNext(+c.dataset.min));
}
$('l-main').addEventListener('click', () => startNext(+$('l-main').dataset.min));
$('l-form').addEventListener('submit', e => {
  e.preventDefault();
  const m = parseInt($('l-minutes').value, 10);
  if (m >= 1 && m <= 600) { $('l-minutes').value = ''; startNext(m); }
});
function startNext(minutes) {
  startSession({ title: session.next, totalMs: minutes * MIN });
}
for (const b of document.querySelectorAll('[data-extend]')) {
  b.addEventListener('click', () => {
    const s = session;
    startSession({ title: s.title, next: s.next, step: s.step, totalMs: +b.dataset.extend * MIN, kind: 'extension' });
  });
}
$('l-done').addEventListener('click', () => { session = null; persist(); closeFloat(); resetForm(); render(); });

// Notes save as you type; they are shown the next time that activity starts.
function wireNote(inputId, savedId) {
  let timer;
  $(inputId).addEventListener('input', () => {
    if (!session || !session.title) return;
    setNote(session.title, $(inputId).value);
    clearTimeout(timer);
    timer = setTimeout(() => {
      $(savedId).textContent = $(inputId).value.trim() ? 'Saved for next time' : '';
    }, 500);
  });
  $(inputId).closest('form').addEventListener('submit', e => { e.preventDefault(); $(inputId).blur(); });
}
wireNote('ln-text', 'ln-saved');
wireNote('l-note-text', 'l-note-saved');

/* ---------- Work mode tools ---------- */

$('w-edit-btn').addEventListener('click', () => {
  const open = body.classList.toggle('is-edit-open');
  $('w-edit-btn').setAttribute('aria-expanded', String(open));
});
$('w-note-btn').addEventListener('click', () => {
  if (body.classList.toggle('is-note-open')) $('ln-text').focus();
});
for (const d of document.querySelectorAll('[data-face]')) {
  d.addEventListener('click', () => { settings.face = d.dataset.face; saveSettings(); render(); });
}

// What the picture says to a screen reader. Work mode stays discreet: it is a
// clock until asked, then the reveal speaks the time left.
function faceLabel(now) {
  if (!session) return '';
  if (mode === 'work') return 'Clock. Show time left';
  return `${session.pausedAt ? 'Paused, ' : ''}${fmtLeft(E.remaining(session, now))} left, ends ${fmtClock(session.endAt)}`;
}

// Tapping the clock (or Enter or Space on it) privately shows the time left
// for a few seconds.
let revealTimer;
function reveal() {
  if (mode !== 'work' || !session) return;
  $('reveal').textContent = '';
  setTimeout(() => { $('reveal').textContent = fmtLeft(E.remaining(session)); }, 50);
  $('reveal').classList.add('is-on');
  clearTimeout(revealTimer);
  revealTimer = setTimeout(() => $('reveal').classList.remove('is-on'), 4000);
}
$('face').addEventListener('click', reveal);
$('face').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  reveal();
});

/* ---------- Cues ---------- */

function cueWords(cue, s) {
  if (mode === 'work') return cue === 'finish' ? 'Session finished.' : '';
  const title = s.title;
  if (cue === 'half') return `Halfway${title ? ` through ${title}` : ''}.`;
  if (cue === 'warn') return `${fmtLeft(E.remaining(s))} left${title ? ` in ${title}` : ''}.${s.next ? ` Next: ${s.next}.` : ''}`;
  return `${title ? `${title} is finished.` : 'Finished.'}${s.next ? ` Next: ${s.next}.` : ''}`;
}

function playCue(cue) {
  const c = settings.cues[cue] || {};
  if (c.sound) chime(cue, settings.volume);
  if (c.speak) speak(cueWords(cue, session));
  if (cue !== 'half') announce(cueWords(cue, session) || '');
  if (cue !== 'half') notify(cue);
}

function announce(text) {
  if (!text) return;
  $('live').textContent = '';
  setTimeout(() => { $('live').textContent = text; }, 50);
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
  const opts = { body: text, tag: 'viztime', icon: 'icons/icon-192.png', silent: true };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) reg.showNotification(title, opts); else new Notification(title, opts);
  } catch { /* notifications are optional */ }
}

/* ---------- Clock tick ---------- */

// A long gap between ticks means the page was frozen (an iPhone app in the
// background or a locked phone), which counts as closed: whatever came due
// meanwhile is settled silently. A desktop tab in the background still ticks
// about once a minute, so its cues play, at most a minute late.
const FROZEN_GAP = 65_000;
// Animation frames can stay stopped after an iPhone browser app returns from
// the background, until the screen is touched. Past this gap the tick paints.
const PAINT_STALL = 1500;
let lastTick = Date.now(), lastPaint = Date.now();

function tick() {
  const now = Date.now();
  const frozen = now - lastTick > FROZEN_GAP;
  lastTick = now;
  if (!document.hidden && now - lastPaint > PAINT_STALL) drawMain();
  $('bar-date').textContent = dateFmt.format(now);
  $('w-time').textContent = $('s-clock').textContent = fmtClock(now);
  if (body.dataset.screen !== 'run') { labelChips(now); if (mode === 'work') labelMain(now); }
  if (body.dataset.screen === 'landing') renderFloatText(now);
  if (session) {
    const wasFinished = !!session.finishedAt;
    const firedBefore = JSON.stringify(session.fired);
    let cues = [];
    if (frozen) E.settle(session, now); else cues = E.dueCues(session, now);
    if (JSON.stringify(session.fired) !== firedBefore) persist();
    cues.forEach(playCue);
    if (!wasFinished && session.finishedAt) onFinished(cues.includes('finish'));
    else if (!session.finishedAt) renderRun(now);
  }
  updateTitle(now);
}

function updateTitle(now) {
  let t = 'VizTime';
  if (mode === 'work') t = 'Day';
  else if (session && session.finishedAt) t = 'Finished · VizTime';
  else if (session) t = `${session.pausedAt ? 'Paused · ' : ''}${fmtLeft(E.remaining(session, now))} · ${session.title || 'VizTime'}`;
  if (document.title !== t) document.title = t;
}

/* ---------- Drawing: faces, light, zoom ---------- */

let pal = palette();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { pal = palette(); });

let warmth = 0, zoom = 0, lastFrame = 0, lastStep = performance.now();

function targets(now) {
  if (!session) return { w: 0, z: 0 };
  if (session.finishedAt) return { w: 1, z: 1 };
  const st = E.stage(session, now);
  if (st === 'running') return { w: 0, z: 0 };
  const p = E.warnProgress(session, now);
  return { w: 0.7 * p * p, z: 1 };
}

function faceModel(now) {
  const s = session;
  const end = s.pausedAt ? s.endAt + (now - s.pausedAt) : s.endAt;
  return {
    frac: E.fraction(s, now), warnFrac: Math.min(1, s.warnMs / s.totalMs),
    stage: E.stage(s, now), warnP: E.warnProgress(s, now), paused: !!s.pausedAt,
    now, endAt: end, totalMs: s.totalMs, warnMs: s.warnMs, remainingMs: E.remaining(s, now),
    title: s.title || (mode === 'work' ? 'Current' : ''), next: s.next, zoom, fmtClock: fmtShort,
  };
}

const faceName = () => (mode === 'work' ? settings.face : 'disc');

function paint(canvas, name, m) {
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(3, canvas.ownerDocument.defaultView.devicePixelRatio || 1);
  const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, r.width, r.height);
  drawFace(ctx, r.width, r.height, name, m, pal);
}

// Moves the warm light and the planner zoom toward their targets. Both the main
// page and the floating window call it, so it measures real elapsed time.
function step() {
  const t = performance.now();
  const dt = Math.min(1, Math.max(0, (t - lastStep) / 1000));
  lastStep = t;
  const now = Date.now();
  const tg = targets(now);
  if (reducedMotion.matches) {
    warmth = Math.round(tg.w * 3) / 3;
    zoom = tg.z;
  } else {
    warmth += (tg.w - warmth) * Math.min(1, dt / 1.5);
    zoom += (tg.z - zoom) * Math.min(1, dt / 1.2);
  }
  const gain = LIGHT_GAIN[settings.warmth] || 1;
  document.documentElement.style.setProperty('--warmth', warmth.toFixed(4));
  document.documentElement.style.setProperty('--light-gain', gain);
  if (floatDoc) {
    floatDoc.documentElement.style.setProperty('--warmth', warmth.toFixed(4));
    floatDoc.documentElement.style.setProperty('--light-gain', gain);
  }
}

let frameId = 0;
function frame(t) {
  frameId = requestAnimationFrame(frame);
  if (!frame.force && t - lastFrame < 80) return;
  lastFrame = t;
  frame.force = false;
  drawMain();
  // Timers can stall while frames run; keep the text and cues current.
  if (Date.now() - lastTick >= 1000) tick();
}
frameId = requestAnimationFrame(frame);

function drawMain() {
  lastPaint = Date.now();
  step();
  if (!session || session.finishedAt || document.hidden || body.dataset.screen !== 'run') return;
  paint($('face'), faceName(), faceModel(Date.now()));
}

// Coming back to the page: bring everything up to date at once, and restart
// the frame loop in case the browser left it stopped.
function wake() {
  if (document.hidden) return;
  tick();
  drawMain();
  cancelAnimationFrame(frameId);
  frameId = requestAnimationFrame(frame);
}

// The floating window draws on its own animation frames. The main tab's frames
// stop whenever that tab is in the background, which is exactly when the
// floating window is in use; relying on them left a stale, stretched picture.
let lastFloatFrame = 0;
function floatFrame(t) {
  if (!floatWin) return;
  floatWin.requestAnimationFrame(floatFrame);
  if (t - lastFloatFrame < 80) return;
  lastFloatFrame = t;
  step();
  paintFloat();
  // Background tabs may run timers only once a minute; keep the text and cues current.
  if (Date.now() - lastTick >= 1000) tick();
}

function paintFloat() {
  if (!floatDoc || !session || session.finishedAt) return;
  paint(floatDoc.getElementById('pip-face'), faceName(), faceModel(Date.now()));
}

// The picture-in-picture video keeps drawing on a timer, since animation
// frames stop when the page is in the background.
function paintVideo() {
  const c = $('video-canvas');
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = pal.paper;
  ctx.fillRect(0, 0, W, H);
  if (session && !session.finishedAt) {
    const m = faceModel(Date.now());
    ctx.save();
    ctx.translate(20, 14);
    drawFace(ctx, W - 40, H - 74, faceName(), m, pal);
    ctx.restore();
    ctx.fillStyle = pal.ink;
    ctx.font = `italic 400 24px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const line = session.next ? `then ${session.next}` : (session.title || '');
    ctx.fillText(line, W / 2, H - 22, W - 40);
  } else {
    ctx.fillStyle = pal.ink;
    ctx.font = `400 30px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(mode === 'work' ? 'Session finished.' : (session?.next || 'Finished'), W / 2, H / 2);
  }
  paintWarmth(ctx, W, H, warmth * (LIGHT_GAIN[settings.warmth] || 1), pal);
}

/* ---------- Floating views ---------- */

let floatDoc = null, floatWin = null, closeVideo = null, videoTimer = null;

async function openFloat() {
  if (!session || session.finishedAt) return;
  if (floatWin || closeVideo) return closeFloat();
  try {
    if (canFloatWindow()) {
      floatWin = await openFloatWindow(240, 300, () => { floatWin = null; floatDoc = null; });
      floatDoc = floatWin.document;
      buildFloat(floatDoc);
      renderFloatText(Date.now());
      floatWin.addEventListener('resize', paintFloat);
      lastFloatFrame = 0; // each window's frame clock starts from zero
      floatWin.requestAnimationFrame(floatFrame);
    } else if (canFloatVideo()) {
      paintVideo();
      videoTimer = setInterval(paintVideo, 500);
      closeVideo = await openFloatVideo($('video-canvas'), () => {
        clearInterval(videoTimer);
        videoTimer = null;
        closeVideo = null;
      });
    }
  } catch {
    clearInterval(videoTimer);
    toast('The floating view could not open here.');
  }
}

function closeFloat() {
  if (floatWin) { floatWin.close(); floatWin = null; floatDoc = null; }
  if (closeVideo) closeVideo();
}

function buildFloat(doc) {
  doc.title = mode === 'work' ? 'Day' : 'VizTime';
  doc.documentElement.lang = 'en';
  doc.body.className = 'pip';
  doc.body.innerHTML = `
    <div class="light" aria-hidden="true"></div>
    <p class="pip-title" id="pip-title"></p>
    <p class="pip-next" id="pip-next"></p>
    <div class="pip-face-wrap" id="pip-face-wrap"><canvas class="pip-face" id="pip-face" role="img"></canvas></div>
    <p class="pip-fig mono" id="pip-fig" aria-live="polite"></p>
    <div class="pip-row pip-controls" id="pip-row">
      <button type="button" class="ctl mono" data-padj="-5" aria-label="Take 5 minutes off">−5</button>
      <button type="button" class="ctl mono" id="pip-pause">Pause</button>
      <button type="button" class="ctl mono" data-padj="5" aria-label="Add 5 minutes">+5</button>
    </div>
    <div class="pip-end" id="pip-end" hidden>
      <button type="button" class="primary pip-main" id="pip-main"></button>
      <div class="pip-row">
        <button type="button" class="ctl mono" id="pip-more">+5 min</button>
        <button type="button" class="ctl mono" id="pip-done">Done</button>
      </div>
    </div>`;
  // The handoff buttons do exactly what the main finish screen's buttons do.
  doc.getElementById('pip-main').addEventListener('click', () => $('l-main').click());
  doc.getElementById('pip-more').addEventListener('click', () => document.querySelector('[data-extend="5"]').click());
  doc.getElementById('pip-done').addEventListener('click', () => $('l-done').click());
  doc.getElementById('pip-pause').addEventListener('click', () => $('pause-btn').click());
  for (const b of doc.querySelectorAll('[data-padj]')) {
    b.addEventListener('click', () => document.querySelector(`[data-adj="${b.dataset.padj}"]`).click());
  }
  // In Work mode the clock can be tapped there too, or reached with the keyboard.
  const revealFloat = () => {
    if (mode !== 'work' || !session) return;
    floatRevealUntil = Date.now() + 4000;
    renderFloatText(Date.now());
  };
  const face = doc.getElementById('pip-face');
  face.addEventListener('click', revealFloat);
  face.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    revealFloat();
  });
}

let floatRevealUntil = 0;

function renderFloatText(now) {
  if (!floatDoc || !session) return;
  const work = mode === 'work';
  const finished = !!session.finishedAt;
  const g = id => floatDoc.getElementById(id);
  const face = g('pip-face');
  face.setAttribute('aria-label', finished ? '' : faceLabel(now));
  face.setAttribute('role', work ? 'button' : 'img');
  if (work) face.tabIndex = 0; else face.removeAttribute('tabindex');
  floatDoc.body.classList.toggle('is-finished', finished);
  g('pip-face-wrap').hidden = finished;
  g('pip-title').textContent = finished
    ? (work ? 'Session finished.' : 'Finished') : (session.title || (work ? fmtClock(now) : ''));
  g('pip-next').textContent = session.next ? `${work || finished ? 'Next:' : 'then'} ${session.next}` : '';
  g('pip-row').hidden = work || finished;
  // At the finish the window offers the same handoff as the main screen.
  g('pip-end').hidden = !finished;
  const canStart = !!(finished && session.next && mode !== 'simple');
  g('pip-main').hidden = !canStart;
  if (canStart) g('pip-main').textContent = $('l-main').textContent;
  floatDoc.getElementById('pip-pause').textContent = session.pausedAt ? 'Resume' : 'Pause';
  const fig = floatDoc.getElementById('pip-fig');
  if (finished) fig.textContent = '';
  else if (work) fig.textContent = now < floatRevealUntil ? fmtLeft(E.remaining(session, now)) : '';
  else fig.textContent = `${fmtLeft(E.remaining(session, now))} · ends ${fmtClock(session.endAt)}`;
}

$('float-btn').addEventListener('click', openFloat);

/* ---------- Screen wake lock ---------- */

let wakeLock = null, wakeBusy = false;
async function syncWake() {
  if (wakeBusy) return;
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
}

document.addEventListener('visibilitychange', () => {
  syncWake();
  frame.force = true;
  if (document.hidden) tick(); else wake();
});
addEventListener('pageshow', wake);
addEventListener('focus', wake);
// Audio needs a tap to start, including after a reload with a session running.
document.addEventListener('pointerdown', unlockAudio, { passive: true });

/* ---------- Toast with undo ---------- */

let toastTimer;
function toast(text, undo) {
  $('toast-text').textContent = text;
  $('toast-undo').hidden = !undo;
  $('toast-undo').onclick = () => { $('toast').hidden = true; undo(); };
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 10_000);
}

/* ---------- Menu ---------- */

function renderMenu() {
  $('m-default').value = settings.defaultMode;
  settings.bundle = matchBundle();
  for (const b of document.querySelectorAll('[data-bundle]')) b.setAttribute('aria-pressed', String(b.dataset.bundle === settings.bundle));
  $('m-bundle-hint').textContent = BUNDLE_HINTS[settings.bundle];
  for (const c of document.querySelectorAll('[data-cue]')) {
    const [cue, kind] = c.dataset.cue.split('.');
    c.checked = !!settings.cues[cue][kind];
  }
  $('m-volume').value = settings.volume;
  $('m-warmth').value = settings.warmth;
  $('m-breathe').checked = settings.breathe;
  $('m-flash').checked = settings.flash;
  $('m-wake').checked = settings.wake;
  $('m-notify').checked = settings.notify;
  $('m-remember').checked = settings.rememberLengths;
  $('m-forget').textContent = 'Forget saved lengths';
  $('m-notify-wrap').hidden = !('Notification' in window);
  $('m-float-hint').textContent = canFloatWindow()
    ? 'While a session runs, choose Float at the top. A small window stays on top of your other apps, with the picture and a few controls.'
    : canFloatVideo()
      ? 'While a session runs, choose Float at the top. The picture floats as a small video above other apps. It can’t be tapped, and the phone may pause it while VizTime is in the background.'
      : 'This browser has no floating view. Chrome or Edge on a computer can keep the session in a small window on top of other apps.';
}

$('menu-btn').addEventListener('click', () => { renderMenu(); $('sheet').showModal(); });
$('sheet').addEventListener('click', e => { if (e.target === $('sheet')) $('sheet').close(); });

const MODE_NAMES = { full: 'Full', work: 'Work', simple: 'Simple' };

function setMode(next, { announceIt = false } = {}) {
  if (next === mode) return;
  mode = next;
  if (!session) form.by = defaultBy();
  render();
  frame.force = true;
  if (floatDoc) { buildFloat(floatDoc); renderFloatText(Date.now()); }
  // The pressed button says which mode is on; a shortcut has no button in
  // focus, so it is announced instead.
  if (announceIt) announce(`${MODE_NAMES[mode]} mode`);
}

for (const b of document.querySelectorAll('#mode-switch [data-mode]')) {
  b.addEventListener('click', () => setMode(b.dataset.mode));
}

// Alt+1, Alt+2, Alt+3. A modifier keeps typing from ever switching modes, and
// e.code works on keyboards where Alt changes the character.
const MODE_KEYS = { Digit1: 'full', Digit2: 'work', Digit3: 'simple', Numpad1: 'full', Numpad2: 'work', Numpad3: 'simple' };
document.addEventListener('keydown', e => {
  if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !MODE_KEYS[e.code]) return;
  e.preventDefault();
  setMode(MODE_KEYS[e.code], { announceIt: true });
});
$('m-default').addEventListener('change', () => { settings.defaultMode = $('m-default').value; saveSettings(); });
for (const b of document.querySelectorAll('[data-bundle]')) {
  b.addEventListener('click', () => {
    Object.assign(settings, clone(BUNDLES[b.dataset.bundle]));
    saveSettings();
    renderMenu();
  });
}
for (const c of document.querySelectorAll('[data-cue]')) {
  c.addEventListener('change', () => {
    const [cue, kind] = c.dataset.cue.split('.');
    settings.cues[cue][kind] = c.checked;
    saveSettings();
    renderMenu();
  });
}
$('m-volume').addEventListener('input', () => { settings.volume = +$('m-volume').value; saveSettings(); });
$('m-test').addEventListener('click', () => { unlockAudio(); chime('finish', settings.volume); });
$('m-warmth').addEventListener('change', () => { settings.warmth = $('m-warmth').value; saveSettings(); renderMenu(); });
$('m-breathe').addEventListener('change', () => { settings.breathe = $('m-breathe').checked; saveSettings(); renderMenu(); });
$('m-flash').addEventListener('change', () => { settings.flash = $('m-flash').checked; saveSettings(); });
$('m-wake').addEventListener('change', () => { settings.wake = $('m-wake').checked; saveSettings(); syncWake(); });
$('m-remember').addEventListener('change', () => { settings.rememberLengths = $('m-remember').checked; saveSettings(); });
$('m-forget').addEventListener('click', () => { save('lengths', null); $('m-forget').textContent = 'Saved lengths forgotten'; });
$('m-notify').addEventListener('change', async () => {
  settings.notify = $('m-notify').checked;
  if (settings.notify && Notification.permission !== 'granted') {
    const p = await Notification.requestPermission().catch(() => 'denied');
    if (p !== 'granted') { settings.notify = false; $('m-notify').checked = false; toast('Notifications are blocked in this browser.'); }
  }
  saveSettings();
});

/* ---------- Start ---------- */

resetForm();
render();
setInterval(tick, 1000);

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
