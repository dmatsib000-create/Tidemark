// Saved data and where-I-left-off notes: run with `node --test`.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, noteKey, getNote, setNote } from '../js/store.js';

// A stand-in for the browser's localStorage.
const items = new Map();
globalThis.localStorage = {
  getItem: k => (items.has(k) ? items.get(k) : null),
  setItem: (k, v) => items.set(k, String(v)),
  removeItem: k => items.delete(k),
};
beforeEach(() => items.clear());

test('values round-trip under the app prefix', () => {
  save('presets', [{ minutes: 25 }]);
  assert.deepEqual(load('presets', []), [{ minutes: 25 }]);
  assert.ok(items.has('viztime2:presets'));
});

test('saving null removes the value', () => {
  save('session', { id: 'a' });
  save('session', null);
  assert.equal(load('session', 'none'), 'none');
});

test('unreadable data falls back instead of breaking the app', () => {
  items.set('viztime2:settings', '{not json');
  assert.deepEqual(load('settings', {}), {});
});

test('activity names match regardless of case and spacing', () => {
  assert.equal(noteKey('  Clinic   Notes '), 'clinic notes');
  assert.equal(noteKey(''), '');
});

test('a note saved for an activity comes back for the same activity', () => {
  setNote('Clinic notes', '  Halfway through the letter ');
  assert.equal(getNote('clinic  NOTES').text, 'Halfway through the letter');
});

test('clearing a note removes it, and untitled sessions keep none', () => {
  setNote('Lunch', 'Sandwich');
  setNote('Lunch', '   ');
  assert.equal(getNote('Lunch'), null);
  setNote('', 'ignored');
  assert.equal(getNote(''), null);
});
