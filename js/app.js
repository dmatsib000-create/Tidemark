// Tidemark: loads every part of the page, then shows the first screen.
//
// state.js    settings, the mode, the day plan and its session, shared by all of these
// ui.js       element lookup, time wording, the toast, the live region
// setup.js    the setup form, presets and the simple chips
// session.js  starting, running controls, finishing, stopping, cues, wake lock
// screens.js  which screen shows, and the running and finish screens
// draw.js     the clock tick and the frame loop: picture, warm light, zoom
// pip.js      the floating window's content and the picture-in-picture video
// menu.js     the menu sheet and the mode switch
// planscreen.js  the plan screen: now, next, later, and adding to the day
// bookmark.js the where-I-left-off chips and return slots at a transition
//
// engine.js (the timer) and plan.js (the day plan) are pure: no page, and
// `now` is always a parameter, so the tests can run them.
//
// The modules import one another in a loop. That is safe because each one,
// while loading, only defines things and wires its own controls; they call
// across modules later, from handlers and from the start below.

import { resetForm } from './setup.js';
import { render } from './screens.js';
import { tick } from './draw.js';
import './session.js';
import './pip.js';
import './menu.js';
import './planscreen.js';
import './bookmark.js';

resetForm();
render();
setInterval(tick, 1000);

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
