Build me a visual timer web app, designed for an adult.

A bit about me: I'm a clever, capable adult who struggles with time blindness and with transitions between activities because of autism and ADHD. I can lose track of time completely while focused, and stopping one thing to start the next is genuinely hard, even when I know what is coming. A normal countdown or a sudden alarm does not help: the numbers do not register, and being startled is not the same as being ready.

I already have a version of this timer. Below is what it does and what I have learned from using it and from studying another attempt at the same idea. Treat the requirements as real. Wherever I write "mine" or describe how my version does something, that is my current solution, not a requirement: the requirement is the problem it solves. Keep, replace, or improve on my solutions, and say briefly why.

Three modes, because one timer does not fit my day

- A full timer mode: time shown as a visual proportion (mine: a large shrinking disc), with the remaining time and the end clock time as supporting numbers, fields for what this time is for and what comes next, a warning period before the end, presets I can save and start in one tap, and controls to pause, add time, subtract time, and stop.
- A discreet work mode. I use this at work, in a clinic, where patients may see my screen. It must not read as a timer to a bystander: no countdown numbers, no percentages, no "wrapping up" or "time's up" language, nothing that tells a patient they are being timed. That includes the browser tab: the page title and icon must not give it away either. Mine disguises itself as an ordinary desk clock and schedule, with a small "next" line like a schedule entry, and shows time only as an abstract visual I have learned to read: a level that sinks as time passes, or a small sun that arcs across the clock face and sinks at the end. Keep both of those faces, add at least one of your own (see the end), and let me flip among them to compare. Tapping privately reveals the time left for a few seconds. The closing cue is subtle (mine: a warming tint). Finishing says something neutral like "Session finished."
- A simple mode: almost no decisions. A few large duration choices or exact minutes, a start button, and while running only pause, add a few minutes, and reset. For moments when even settings feel like friction.
- I can switch modes for one visit without disturbing a running timer, and I can set any mode as my default. The default is saved and the app opens in that mode every time until I change it.

The transition is the main event, not the countdown

What I have read supports this: advance warnings and visual schedules on their own are among the weaker supports for transitions, especially when moving from something I like to something I don't. Losing the current activity matters as much as the surprise. Treat the warning as necessary but not sufficient, and put real effort into making leaving cheap and starting cheap.

- Let me name what I am doing and what comes next, and keep what is next visible.
- Let me set a session either by length or by when the next thing starts, with an optional buffer for getting there (for example: next is clinic at 2:00, 5 minutes to get there, so this session ends at 1:55).
- The end must never arrive as a surprise: a warning stage I can see coming, then a calm finish. No harsh alarm, no flashing unless I ask for it.
- I am often in another app when the end approaches. Decide how the warning reaches me when this app is not in front, within what each platform allows (see "Where it lives"), without breaking the calm or the discreet mode.
- In the final minutes, the next activity needs its own presence, so the last stretch has its own scale instead of being a sliver of the whole. (Mine: a card for the next activity that grows and fills as the end approaches.)
- Make leaving cheap. Stopping is expensive mostly because I fear losing my place. Let me leave a one-line note about where I left off, and offer it during the warning stage, while I still have the thread, not only after the finish. Show the note the next time I start that same activity.
- Make starting cheap. Let me give the next activity an optional first small step, and put it front and centre on the landing screen with a one-tap start. If I add extra time at the end, it becomes its own short, full-size timer segment rather than a barely visible extension of the finished one.

Controls I insist on, because their absence ruined another timer for me

- A real stop: one tap that discards a running timer and returns me to setup, distinct from finishing early. A timer I started by mistake must be abandonable.
- Subtracting time while running must be as easy as adding it. If I set the wrong length, I need to claw minutes back, not only pile more on.
- Reset means reset: back to a clean, default setup, not a form pre-filled with the last session.

Comfort is mine to set

- Anything that chimes, flashes, pulses, or announces milestones is optional and adjustable, per moment where that makes sense. Offer one-tap bundles (mine: Quiet, Balanced, Noticeable) over the individual toggles, because assembling a dozen settings is its own burden.
- The finish sound, if any, should be soft: a gentle tone with a slow attack, never a beep or an alarm.
- If a cue's moment passed while the app was closed, never play it late when I reopen. A running timer must survive closing and reopening the app, resuming from its real end time.

Feel

Adult, calm, and unobtrusive: something I am happy to keep open at work all day. No classroom-timer styling, no primary-color cartoon look, no patronizing language, no gamification, streaks, or scores, and no failure framing for stopping early or running over. Muted, deliberate design over cheerful. Keep the app itself predictable: the same layout every time, controls that stay where they are, no pop-ups or announcements I did not ask for.

The visual language is already decided: follow design-direction.md in this repository (the "Afternoon paper" direction), including its tokens, type, motion, and states. It sets the look and feel, not the time metaphors: the discreet face, the last minutes, and the handoff are still yours to invent, within its material world of paper, ink, rules, and light.

Where it lives

- It is a static site on GitHub Pages, served from a project subpath (username.github.io/<repo>/). No server and no build step: plain files I can push and have work. Use relative paths everywhere, including the manifest and service worker, and keep saved data namespaced to this app, since my other Pages projects share the same address. Tell me the exact Pages settings to turn on.
- I install it on my iPhone as a home-screen web app, and it must look perfect there: full screen with no browser bars, clear of the notch, Dynamic Island, and home indicator, no accidental zooming or text selection, comfortable one-handed touch targets, good in portrait and landscape, following the system light/dark setting, with a proper app icon. Once loaded, it works offline.
- On my Windows computer, in Chrome or Edge, I keep it open as a small always-on-top floating window while I work in other apps, using the Document Picture-in-Picture API. Treat the floating window as a surface of its own, not a shrunken page: decide what the time looks like at about 200 x 200 pixels and which controls belong there. In discreet mode the floating window must be exactly as discreet as the main screen.
- A web app on iPhone is limited: it is suspended in the background and when the screen locks, it cannot vibrate, it can only play sound after I have tapped something, the silent switch can mute it, and Safari has no interactive floating window. Work with that: keep the screen awake while a session runs where iOS allows it (a comfort setting I can turn off), make the visual able to carry the whole cue on its own, and try a picture-in-picture video of the face as a floating view if it genuinely works from a home-screen app, dropping it if not. Never pretend a feature works when it cannot.
- In your final summary, tell me plainly what works on my iPhone, what works on my computer, what is not possible, and why.

Your own thinking: the part I care most about

Before writing code, sketch three or four candidate metaphors for the discreet face in a sentence each, pick the strongest, and build it alongside mine. A good one:
- reads to a bystander as decoration or an ordinary desk object;
- tells me roughly how much is left in a two-second glance, even in peripheral vision;
- makes the final stretch look different from the middle, without alarm;
- stays calm enough to sit on screen all day;
- still reads clearly when small: in the floating window and on a phone held at arm's length.

Give the last few minutes and the handoff to the next activity the same treatment, more briefly, and build whatever you think beats my version. Where my design conflicts with a requirement, the requirement wins. Where my design conflicts with a better idea of yours, use yours.

Build it as something I can actually use, not a mockup: set a duration, start it, and understand it within a few seconds. When you are done, give me a short list of what you kept, what you changed, and what you invented, with one line of why for each.
