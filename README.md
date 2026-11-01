# Tidemark

A calm visual timer for time blindness and transitions. Plain static files that install to a phone home screen and work offline. The look ("Afternoon paper") is described in [design-direction.md](design-direction.md) and documented as built in [design-system.md](design-system.md); the requirements are in [build-prompt.md](build-prompt.md).

New to Tidemark, or not technical? Start with the [plain-language guide](docs/guide.md), with pictures of every screen.

## Three modes

- **Full.** What this time is for, what comes next, and an ochre wash on paper whose area is the time left. A dotted ring shows where the warning stage begins, so the end is visible from the start. Supporting numbers: time left and the end clock time. Pause, −5, −1, +1, +5, Finish now, Stop. Presets start in one tap. The dots under the time figures swap the disc for one of Work mode's faces (Level, Sun, Planner), with Level and Sun drawing their clock hands finer and lighter so the time left stays the strongest mark; Full remembers its own choice, separately from Work.
- **Work.** Reads as an ordinary desk clock and schedule: a large clock time, a "now" entry and a "next" entry. The time is shown only as a picture, with three faces to flip between (the dots under it):
  - **Planner**: a day-planner page. The session is an appointment block on a real clock grid with a "now" line moving through it; the wash below the line is the time left. In the last stretch the page eases into a closer view of the end of the block and the next entry, which warms. A bystander sees a calendar.
  - **Level**: a clock whose dial holds a sinking ochre level, with a small mark where the warning begins.
  - **Sun**: a clock with a low sun arcing to the horizon and sinking at the end.
  Tapping the picture shows the time left for four seconds. Controls hide behind **Edit**. The tab title is "Day". It finishes with "Session finished."
  Setting up looks like adding an entry to the day: the desk clock sits on top, it opens on **Until**, with end-time buttons ("2:15", "2:30") and a "next starts at" time. **For** (minutes) is one tap away; typed minutes there are confirmed only as an end time. Full and Simple open on For.
- **Simple.** Six large lengths or exact minutes. While running: the picture, Pause, −5, +5, Reset.

Switch modes with **Full · Work · Simple** at the top of the screen, or **Alt+1**, **Alt+2**, **Alt+3** on a keyboard, at any time without touching a running session. **Menu → Open in** sets the mode the app starts in.

## Today's plan

**Plan** at the top (Full and Work) opens today's plan: the steps, breaks and events of the day as **Now**, **Next** and **Later**, with clock times. **Add to the plan** takes a step, a break or an event; an event has a fixed start time ("At"), and the minutes are optional (an unsized step takes its length when it starts). Each upcoming item can be started, moved up or down, or removed (with Undo). What has finished is under **Done today**.

- Steps and breaks follow one another, so when something runs over, they move later. An event keeps its time; if the plan before it runs into it, the event says so ("The plan before this runs to 3:10 PM.") and nothing is moved for you.
- The running session's "then" line is always the plan's next item, and the finish screen offers it in one tap. Nothing starts on its own.
- A quick start (the setup form, Simple mode, a preset) is a one-item plan placed before whatever is next. A "What comes next" typed with it becomes the next item.
- Done on the finish screen opens the plan when more is planned.
- On a new day, what you finished yesterday is filed away on this device with its planned and actual length (not shown yet; it is there for a later view that compares the two without judgment). Yesterday's unstarted steps and breaks are offered under **From yesterday**, to add one at a time or set aside with **Not today**.
- Work mode's plan shows clock times only, never lengths. Simple mode has no plan screen.

## The handoff

- **Warnings come in stages** you choose in **Menu → Comfort** (tap the minutes: 30, 15, 10, 5, 2, 1; 5 and 1 to start with). Each stage plays the warning cue you set there. The warm light and the next card begin at the second-to-last stage (with one stage, at that one), never before halfway; earlier stages are heads-up cues only. Stages not shorter than the session are skipped, and with none chosen there is one automatic warning. **Warning before the end** on the setup form sets a single warning for one session. A stage that passed while the app was closed is never played late.
- The whole page warms slightly through the warning stage, like late-afternoon light, and settles at the finish. That light is the main cue in every mode.
- In Full mode the next activity gets its own card in the warning stage. It fills and grows as the end approaches and shows the first small step and your last note for it.
- The note about where you left off is offered during the warning stage (and on the finish screen). Your recent notes are there as one-tap chips. It reappears as a ribbon bookmark the next time you start that activity.
- **Come back to this** adds a return slot for the activity to today's plan: after the next item, at the end of today, or at a time you choose (which works like an event). The note goes with the slot and shows as the ribbon when the slot comes up and when it starts. An activity has one return slot; choosing again moves it, with Undo.
- The finish screen puts the next activity first with one main button, such as "Start Lunch · 25 min", and other lengths below it. Turn on **Menu → Activities → Remember how long each activity usually runs** and that button suggests the length you last used for that activity. Extra time (+2, +5, +10; in Work mode the end times they give) starts its own short, full-size segment. **Menu → Activities → Most extra time per activity** sets a cap on that extra time. The choices shrink to what fits, including the exact remainder, and once it is used the finish screen says so plainly ("That is all the extra time you set for Writing."). Minutes added with +1 or +5 while running don't count.
- **Until** sets a session by when the next thing starts, minus time to get there.

## Stop, finish, reset

- **Stop** ends the session and returns to a clean setup; the time spent stays in today's plan (a quick start stopped within a minute is taken out). Undo is offered for ten seconds.
- **Finish now** ends early and goes to the handoff.
- Taking time off is as easy as adding it. Taking off more than is left finishes quietly; cues it skips past don't play.
- Setup is always clean after a session. Nothing is pre-filled.

## Comfort

**Quiet**, **Balanced** and **Noticeable** set everything at once. Under "Adjust each cue": a tone and a spoken line per moment (halfway, each warning, finish), volume, light strength, a slow breathing light, three slow flashes, keeping the screen awake, and system notifications on a computer. Tones are soft bells with a slow attack. Work mode never speaks or notifies about anything except "Session finished."

Sessions are stored as timestamps inside the day plan, so a running session survives closing and reopening the app. A cue whose moment passed while the app was closed is never played late.

## Floating view

- **Chrome, Edge or Vivaldi on a computer:** **Float** opens a small always-on-top window with the picture and −5, Pause, +5. Its layout follows the window's shape: side by side when wide, picture-first when small. At the finish it offers the same handoff as the main screen (Start the next activity, +5 min, Done). In Work mode it shows only the picture and the next entry, and the picture reveals the time left on a tap or Enter.
- **iPhone and Safari:** **Float** shows the picture as a picture-in-picture video above other apps. It can't be tapped, and iOS may freeze it while Tidemark is in the background. This is experimental.

## Limits on iPhone

A home-screen web app is suspended when it isn't on screen or the phone locks, so it can't sound a cue then. Keep the screen awake (on by default while a session runs) and leave Tidemark open. Sound only works after a tap, the silent switch mutes it, and web apps can't vibrate. Notifications aren't available without a server.

## Install

Static files at the repository root: `index.html`, `styles.css`, `js/`, `fonts/`, `icons/`, `manifest.webmanifest`, `sw.js`.

1. GitHub repository **Settings → Pages → Build and deployment**: Source "Deploy from a branch", choose the branch and `/ (root)`.
2. Open the published address on your phone.
3. iPhone: Safari → Share → **Add to Home Screen**.

## Local preview

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Tests

The timer model, the day plan, saved data and the offline file list have tests that use Node's built-in runner, so there is nothing to install. With Node 20 or later:

```bash
node --test
```

They also run on every pull request. When adding a file the app needs offline, list it in `SHELL` in `sw.js` and bump `CACHE`; the tests fail if a script or font is missing from the list.

Fonts: Newsreader and IBM Plex Mono, SIL Open Font License, stored in `fonts/`.
