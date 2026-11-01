// Saved data lives in localStorage under one prefix, because every GitHub Pages
// project on the same account shares a single origin.
const PREFIX = 'viztime2:';

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    if (value == null) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch { /* storage full or blocked: the app keeps working for this visit */ }
}

// Where-I-left-off notes are keyed by activity name, ignoring case and spacing.
export const noteKey = title => (title || '').trim().replace(/\s+/g, ' ').toLowerCase();

export function getNote(title) {
  const k = noteKey(title);
  return k ? load('notes', {})[k] || null : null;
}

export function setNote(title, text) {
  const k = noteKey(title);
  if (!k) return;
  const notes = load('notes', {});
  if (text && text.trim()) notes[k] = { text: text.trim(), at: Date.now() };
  else delete notes[k];
  save('notes', notes);
}
