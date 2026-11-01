# VizTime

A calm visual timer for time blindness and transitions. Built as a single-page web app that installs to a phone home screen and works offline.

## The idea: a horizon that sinks toward what's next

The running screen is one wide field. Its filled level is the time left, so you read it the way you read a glass of water, without doing arithmetic. Faint lines across the field are pinned to real clock times (2:20, 2:30, 2:40), so the level always relates to the clock on the wall.

The next activity sits on the floor of the field. Time drains toward it.

- **Wind-down zone.** The bottom band (about 15% of the timer by default, 2 to 10 min) is visible from the start, so the ending never comes as a surprise. When the level reaches it, the fill warms gradually like dusk, a soft cue plays, and the screen suggests finding a good place to stop.
- **Landing lens.** During the wind-down, the "Next" card fills from left to right. Your final minutes get their own full-width scale, even when they are a thin sliver of a long timer.
- **Final minute.** Says "Wrap up the step you're on." Optional chime.
- **Time's up.** Two soft bell notes with a slow attack: no beep, no flashing. The screen becomes a handoff panel: the next activity, a one-tap start with a length, your handoff routine, **+2 / +5 min**, and a **reset pause** (a short breathing break).
- **Overtime** is shown calmly as a striped band and a "past the end" count, with optional reminders that never get louder.

## Things that help with transitions

- **Leave a note.** One line about where you left off. It reappears the next time you start that activity, which makes stopping cheaper.
- **Handoff steps.** A short routine of your own (save work, close tabs, stand up) shown at every changeover.
- **Until a clock time.** "Until 3:00" for the time before a meeting or appointment.
- **Day strip.** On the setup screen, the block (and what follows it) is placed on a strip of your next couple of hours.
- **Planned vs. actual.** A small log of today's sessions and how long they really took, to help calibrate estimates. Informational only; no streaks or scores.
- **Check-ins.** An optional quiet "30 min in" while you're absorbed.

## Comfort and control

- **Quiet / Balanced / Noticeable** presets, plus individual control of chimes (per moment), volume, spoken announcements, vibration (Android), motion, number display (hidden / end time / full), wind-down length, overtime reminders and theme.
- **Work mode.** Dimmer colors, silent by default, controls that fade back, and activity names hidden as "Current" / "Next" (tap to peek), so nothing private shows on a desk between patients. The browser tab title and icon also show the time left as a tiny live level.
- Respects the system "reduce motion" setting.

## Persistence

Timers are stored as timestamps, so a running timer continues correctly if you close and reopen the page. Cues missed while the page was closed are not played retroactively, so you never get a burst of sound on reopen. Settings, saved timers, notes and history stay in the browser on this device (`localStorage`).

## Install on your phone

The app is static files (`index.html`, `sw.js`, `manifest.webmanifest`, `icons/`), so it can be hosted anywhere over HTTPS. With GitHub Pages:

1. Repository **Settings → Pages → Build and deployment**: Source "Deploy from a branch", choose the branch and `/ (root)`.
2. Open the published URL on your phone.
3. iPhone: Safari → Share → **Add to Home Screen**. Android: Chrome menu → **Install app**.

## Limits worth knowing

- Web pages can't reliably sound alerts once a phone locks the screen or suspends the page. "Keep screen awake" is on by default while a timer runs. Keep the app open in the foreground for audible cues.
- On iPhone, the ring/silent switch mutes web audio, and vibration isn't available to web pages.

## Local preview

```
python3 -m http.server 8000
```
then open http://localhost:8000.
