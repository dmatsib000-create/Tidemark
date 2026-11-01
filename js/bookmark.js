// The bookmark at a transition, in both note forms (the warning stage and the
// finish screen): recent notes as one-tap chips, and a slot in the plan to come
// back to the interrupted activity. The note rides on the slot and shows when
// the slot starts.

import * as E from './engine.js';
import * as P from './plan.js';
import { recentNotes } from './store.js';
import { plan, persist } from './state.js';
import { $, fmtClock, toast } from './ui.js';
import { render } from './screens.js';

const hosts = [...document.querySelectorAll('[data-bookmark]')];

const nameOf = item => P.nameOf(item) || 'this';

// Which choice made the slot, and where it sits now in words (clock times
// only, so it suits Work mode too).
function whereText(slot) {
  if (slot.kind === 'event') return { where: 'at', text: `at ${fmtClock(slot.at)}` };
  const up = P.upcoming(plan);
  const i = up.indexOf(slot);
  const where = slot.returnWhere || 'next';
  if (where === 'end' && i === up.length - 1) return { where, text: 'at the end of today' };
  return { where, text: `after ${nameOf(up[i - 1] || P.current(plan))}` };
}

function addSlot(host, where, at) {
  const from = P.current(plan);
  if (!from) return;
  const input = $(host.dataset.bookmark);
  const done = P.addReturnSlot(plan, from.id, where, Date.now(), { text: input.value, at });
  const status = host.querySelector('[data-bk="status"]');
  if (!done) { status.textContent = 'Choose a later time.'; return; }
  host.dataset.atOpen = '';
  persist();
  render();
  // The time box just closed; keep the keyboard on the choice that was made.
  if (!host.contains(document.activeElement) || document.activeElement.closest('[hidden]')) host.querySelector(`[data-where="${where}"]`).focus();
  toast(done.replaced ? 'Return slot moved' : 'Return slot added', () => {
    // Not once the new slot has started.
    if (!P.removeItem(plan, done.item.id)) return;
    if (done.replaced) P.restoreItem(plan, done.replaced.item, done.replaced.index);
    persist();
    render();
  });
}

export function renderBookmarks() {
  const from = P.current(plan);
  if (!from) return;
  const slot = P.returnSlotFor(plan, from);
  const placed = slot ? whereText(slot) : null;
  const others = P.upcoming(plan).filter(i => i !== slot);
  for (const host of hosts) {
    const input = $(host.dataset.bookmark);
    const chips = host.querySelector('[data-bk="chips"]');
    // Rebuilt only when they change and nobody is on them.
    const notes = recentNotes(3, input.value);
    if (chips.dataset.notes !== notes.join('\n') && !chips.contains(document.activeElement)) {
      chips.dataset.notes = notes.join('\n');
      chips.replaceChildren(...notes.map(text => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip note-chip';
        b.textContent = text;
        b.addEventListener('click', () => {
          input.value = text;
          input.dispatchEvent(new Event('input'));
        });
        return b;
      }));
    }
    for (const b of host.querySelectorAll('[data-where]')) {
      b.setAttribute('aria-pressed', String(placed?.where === b.dataset.where));
      if (b.dataset.where === 'next') b.hidden = !others.length;
    }
    host.querySelector('[data-bk="at"]').hidden = !host.dataset.atOpen;
    host.querySelector('[data-bk="status"]').textContent = placed ? `Back to ${nameOf(slot)} ${placed.text}.` : '';
  }
}

for (const host of hosts) {
  host.append($('bk-tpl').content.cloneNode(true));
  const time = host.querySelector('input[type="time"]');
  for (const b of host.querySelectorAll('[data-where]')) {
    b.addEventListener('click', () => {
      if (b.dataset.where !== 'at') { addSlot(host, b.dataset.where); return; }
      host.dataset.atOpen = '1';
      renderBookmarks();
      time.focus();
    });
  }
  const addAt = () => {
    if (!time.value) { time.focus(); return; }
    const now = Date.now();
    addSlot(host, 'at', now + E.untilMs(time.value, 0, now));
  };
  host.querySelector('[data-bk="add"]').addEventListener('click', addAt);
  time.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addAt(); } });
}
