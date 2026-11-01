// The timer model. A session is plain data stored as wall-clock timestamps, so it
// survives closing the app and resumes from its real end time.

export const MIN = 60_000;
// The longest session any length field accepts.
export const MAX_MINUTES = 600;

// A cue may play a little late while the page is alive but throttled in the
// background (Chrome wakes hidden tabs about once a minute). Anything later
// than this is marked done silently: a missed cue is never played on reopen.
const LATE_LIMIT = 75_000;

export function autoWarning(totalMs) {
  const w = Math.min(10 * MIN, Math.max(2 * MIN, totalMs * 0.15));
  return Math.min(w, totalMs / 2);
}

// Warnings come in stages, such as 15, 5 and 1 minute before the end. `src` is
// what was asked for, in ms; empty means one automatic warning. Stages not
// shorter than the session are skipped. The warm light and the next card begin
// at the last-but-one stage (or the only one), never before halfway; that
// moment is `warnMs`, which the pictures and stage() read.
export function resolveStages(src, totalMs) {
  let stages = [...new Set(src || [])].filter(ms => ms > 0 && ms < totalMs).sort((a, b) => b - a);
  if (!stages.length) stages = [autoWarning(totalMs)];
  const onset = stages.length > 1 ? stages.length - 2 : 0;
  const warnMs = Math.min(stages[onset], totalMs / 2);
  stages[onset] = warnMs;
  return { stages: [...new Set(stages)].sort((a, b) => b - a), warnMs };
}

const deriveStages = s => Object.assign(s, resolveStages(s.warnSrc, s.totalMs));

// A session saved before stages existed had one warning: automatic, or set.
// Its cue for that warning keeps the same name, so nothing plays twice.
export function ensureStages(s) {
  if (s.stages) return;
  s.warnSrc = s.autoWarn ? [] : [s.warnMs];
  delete s.autoWarn;
  deriveStages(s);
}

// Length of a session that ends `bufferMin` before the clock time `hhmm`
// ("14:30"). A time already past today is read as after midnight when that is
// within half a day, so 00:15 typed at 23:50 means 25 minutes, while 11:00
// typed at 11:50 stays in the past (and is rejected by the caller).
export function untilMs(hhmm, bufferMin = 0, now = Date.now()) {
  const [h, m] = hhmm.split(':').map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now) {
    const tomorrow = new Date(target);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getTime() - now <= 12 * 60 * MIN) target.setTime(tomorrow.getTime());
  }
  return target.getTime() - bufferMin * MIN - now;
}

// `warnStages` (ms) are the warnings asked for; a single `warnMs` is one stage.
export function createSession({ title = '', next = '', step = '', totalMs, warnStages, warnMs, kind = 'main' }, now = Date.now()) {
  const s = {
    id: now.toString(36),
    title: title.trim(), next: next.trim(), step: step.trim(),
    kind, totalMs, warnSrc: warnStages ?? (warnMs != null ? [warnMs] : []),
    endAt: now + totalMs, pausedAt: null, finishedAt: null, fired: {},
  };
  deriveStages(s);
  settle(s, now);
  return s;
}

export const remaining = (s, now = Date.now()) =>
  s.finishedAt ? 0 : Math.max(0, s.endAt - (s.pausedAt ?? now));

export const fraction = (s, now) => Math.min(1, remaining(s, now) / s.totalMs);

export function stage(s, now = Date.now()) {
  const r = remaining(s, now);
  if (s.finishedAt || r <= 0) return 'finished';
  return r <= s.warnMs ? 'warning' : 'running';
}

// 0 at the start of the warning stage, 1 at the end.
export function warnProgress(s, now) {
  if (stage(s, now) === 'running') return 0;
  return Math.min(1, 1 - remaining(s, now) / s.warnMs);
}

// Every cue of a session and when it is due, as remaining time. The stage that
// starts the warm light is 'warn'; the others are named by their time.
export function cuePoints(s) {
  ensureStages(s);
  return [
    { id: 'half', kind: 'half', at: s.totalMs / 2 },
    ...s.stages.map(ms => ({ id: ms === s.warnMs ? 'warn' : `warn@${Math.round(ms / 1000)}`, kind: 'warn', at: ms })),
    { id: 'finish', kind: 'finish', at: 0 },
  ];
}

export function pause(s, now = Date.now()) {
  if (!s.pausedAt && !s.finishedAt) s.pausedAt = now;
}

// The time spent paused is kept, so the day plan can tell actual from planned.
const closePause = (s, now) => { s.pausedMs = (s.pausedMs || 0) + now - s.pausedAt; s.pausedAt = null; };

export function resume(s, now = Date.now()) {
  if (!s.pausedAt) return;
  s.endAt += now - s.pausedAt;
  closePause(s, now);
}

// Add (positive) or take away (negative) time. Taking away more than is left
// finishes quietly. Cues the change jumps past are marked done without playing;
// cues the change moves back into the future are re-armed.
export function adjust(s, deltaMs, now = Date.now()) {
  if (s.finishedAt) return;
  const left = remaining(s, now);
  const delta = Math.max(deltaMs, -left);
  s.endAt += delta;
  s.totalMs = Math.max(MIN / 2, s.totalMs + delta);
  // The stages are worked out again for the new length, so a corrected session
  // behaves as if it had been set to the right length from the start.
  ensureStages(s);
  deriveStages(s);
  const r = remaining(s, now);
  s.fired = {};
  for (const p of cuePoints(s)) s.fired[p.id] = r <= p.at;
  if (r <= 0) { s.finishedAt = now; if (s.pausedAt) closePause(s, now); }
}

export function finishNow(s, now = Date.now()) {
  if (s.finishedAt) return;
  s.finishedAt = now;
  if (s.pausedAt) closePause(s, now);
  for (const p of cuePoints(s)) s.fired[p.id] = true;
}

// On load: anything already due is settled silently, and a session whose end
// passed while the app was closed lands directly in the finished state.
export function settle(s, now = Date.now()) {
  const r = remaining(s, now);
  for (const p of cuePoints(s)) if (r <= p.at) s.fired[p.id] = true;
  if (r <= 0 && !s.finishedAt) s.finishedAt = s.pausedAt ?? s.endAt;
}

// Called on every tick while the page is alive. Returns the kinds of cue
// ('half', 'warn', 'finish') that came due recently enough to play, and marks
// every due cue as fired.
export function dueCues(s, now = Date.now()) {
  if (s.pausedAt || (s.finishedAt && s.fired.finish)) return [];
  const r = remaining(s, now);
  const out = [];
  for (const { id, kind, at } of cuePoints(s)) {
    if (s.fired[id] || r > at) continue;
    s.fired[id] = true;
    const late = (s.endAt - at) <= now ? now - (s.endAt - at) : 0;
    if (late <= LATE_LIMIT) out.push(kind);
  }
  if (r <= 0 && !s.finishedAt) s.finishedAt = s.endAt;
  // Only the most important of several simultaneous cues plays.
  if (out.includes('finish')) return ['finish'];
  if (out.includes('warn')) return ['warn'];
  return out;
}
