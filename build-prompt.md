# Tidemark: requirements

Tidemark grows out of VizTime ([original requirements](docs/origins/viztime-build-prompt.md)). Where the two disagree, this document wins.

## Target user

Adults with level 1 autism and/or ADHD, no intellectual disability, fluent language, self-directing. They are not a caregiver-managed population. The app supports their own goals and is not a compliance tool.

## Problems to solve

1. **Time blindness / time myopia.** They underestimate elapsed and remaining time, lose track of time during hyperfocus, and are chronically late. Timing deficits in ADHD are well documented (Noreika, Falter and Rubia, *Neuropsychologia*, 2013).
2. **Transition distress.** This has two separate drivers:
   - Unpredictability ("when do I have to stop?"). Timers and warnings address this.
   - Loss of an absorbing activity ("I don't want to stop"). Timers alone do not address this (Kim et al., *Behavior Modification*, 2026).
3. **Executive load:** planning, sequencing, starting tasks, and remembering to resume.
4. **Accumulated shame** from years of lapses (Cortese et al., *World Psychiatry*, 2025).

## Evidence constraints

- No trial has tested timer or transition app design in this population. Every feature is a design hypothesis.
- Digital ADHD tools show inconsistent benefit, and engagement does not equal outcome (Faraone et al., *Nature Reviews Disease Primers*, 2024; Hosseinnia et al., *Frontiers in Public Health*, 2024).
- Predictability tools work best combined with reward and resumption strategies, not alone.
- Do not make therapeutic or medical claims without outcome data.

## Core features (must-have)

1. **Visible time representation**
   - Time remaining shown as a shrinking area or bar that can be read at a glance. Digits are optional.
   - The display stays visible without unlocking the phone (widget, lock screen, watch, desktop overlay).
   - Optional and adjustable for users who find countdowns anxiety-provoking. Include a "calm mode" that shows less detail.
2. **End-of-task and transition alerts, not just start reminders**
   - Staged warnings (e.g. 15 / 5 / 1 minute) that the user can configure.
   - An alert marking when the current activity should end, plus "leave by" alerts that include travel and preparation time (UK Adult ADHD Network OT consensus; Adamou et al., *BMC Psychiatry*, 2021).
   - Escalating but gentle modalities (visual, then haptic, then sound), sensory-safe by default, with volume, tone and vibration control.
3. **Resumption bookmarking** (reduces loss-of-activity distress)
   - At a transition, a one-tap or voice "where I left off" note.
   - The option to schedule a guaranteed return slot to the interrupted activity.
   - The bookmark resurfaces automatically when the return slot starts.
4. **Buffer time built in**
   - Automatic padding between events, set by the user.
   - Learns the user's actual durations compared with estimates and shows the gap without judgment, which helps calibrate time estimation.
5. **Self-reinforcement**
   - A reward for stopping on time, not just for finishing, delivered immediately and meaningfully as chosen by the user (adapted from differential reinforcement of alternative behavior).
   - The option to pair the next activity with something pleasant ("transition sandwich").
   - No punitive streak resets, red failure states or loss framing.
6. **Negotiation scripts / flexible extension**
   - A structured "need X more minutes" option with a cap the user sets, replacing all-or-nothing snoozing. This acts as a self-directed communication alternative.
7. **Task chunking and sequencing**
   - Break tasks into steps sized to the user's own attention span, with planned breaks (CBT for adult ADHD modules; Lopez et al., *Cochrane*, 2018; Solanto, *World Psychiatry*, 2025).
   - Visual sequence of upcoming steps or events (a "now / next / later" view).
8. **Change-of-plan handling**
   - Unexpected schedule changes flagged clearly and early, with a visual preview of the revised day. Changes in routine add burden in co-occurring autism and ADHD (Young et al., *BMC Medicine*, 2020).

## Design principles

- **User control first:** every cue, sound, color, density and countdown can be adjusted or turned off.
- **Low friction:** setting up a timer takes 2 taps or fewer, or a voice command. Calendar integration (Google, Outlook, Apple).
- **Sensory-considerate:** muted palette option, no flashing, dark mode, predictable layouts that don't move around.
- **Literal, plain language:** no ambiguous icons or idioms. Notifications are explicit ("Meeting in 10 min. Leave in 2 min.").
- **Non-shaming tone:** neutral, factual feedback.
- **Cross-device:** phone, watch and desktop stay synced, because hyperfocus often happens at a computer.
- **Privacy:** behavioral data stays local or encrypted, and nothing is shared without opt-in.

## Avoid

- Gamification that punishes lapses.
- Countdowns that are always on with no way to change them.
- Alert flooding.
- Claims of treating ADHD or autism.
- Designs borrowed from child or intellectual disability populations (cartoon visuals, caregiver control).

## Development process

- **Co-design:** recruit autistic and ADHD adults from discovery through testing (user-centered design is the dominant approach in autism app development; Liu et al., *Sensors*, 2023).
- **Iterate:** diary studies and in-context testing during real transitions, not lab tasks alone.
- Include anxiety-prone users to catch timers that increase distress.

## Evaluation plan (define before launch)

- **Primary outcomes:** self-rated time management, lateness frequency, self-reported transition distress.
- **Secondary:** retention, feature use, qualitative process feedback.
- **Design:** start with a pilot, then a randomized comparison (e.g. app compared with a standard timer/calendar), with follow-up beyond 3 months (Valentine et al., *Clinical Psychology Review*, 2020).
- Report engagement and outcomes separately.

## Scope boundaries

The app supports self-management. It does not replace CBT for adult ADHD, autism-adapted CBT for anxiety, or medication. Consider an optional "share with my clinician/coach" export.
