# VizTime design system

The reference for what is actually built. [design-direction.md](design-direction.md) is the intent ("Afternoon paper"); this file records the tokens, components and rules as they exist in [styles.css](styles.css), [index.html](index.html) and [js/faces.js](js/faces.js).

## Principles in one screen

- **Paper, not screen.** Warm off-white or walnut, near-black or cream ink, hairline rules. No shadows, no pills, 2px corners.
- **Ochre means time.** `--ochre` fills time (faces, next-card fill, the light). `--ochre-ink` is for focus, the ribbon, and time text that needs contrast. Never on controls, never decoration.
- **Two voices.** Newsreader for human content, IBM Plex Mono (tabular) for the clerk: labels, times, controls.
- **Motion is time.** Controls settle 1px and fade; only stage changes move slowly, over seconds.
- **Rules organize.** `1px var(--ink)` opens a section; `1px var(--rule)` divides inside it.

## Color tokens

| Token | Light | Dark | Use |
|---|---|---|---|
| `--paper` | `#EFEAE0` | `#1E1C19` | Page, sheet |
| `--paper-raised` | `#F6F2EA` | `#26231F` | Box inputs, big chips, next card, hover and pressed fills |
| `--rule` | `#D6CFC1` | `#3A362F` | Decorative dividers |
| `--rule-strong` | `#8A8275` | `#7A7366` | Control and field borders (3:1) |
| `--ink` | `#2B2A26` | `#E6DFD2` | Text, section rules, primary fill, pressed state |
| `--ink-soft` | `#5A564E` | `#A39C8E` | Labels, hints, secondary text, rest-state text buttons |
| `--ochre` | `#B8875A` | `#C9965F` | Time fills and the light. Never text. |
| `--ochre-ink` | `#7A5230` | `#D9A86F` | Focus, ribbon, time text needing contrast (including form errors, which are always about a length or end time) |

Support tokens: `--wash-alpha` (face fill strength, 0.5 / 0.42), `--light-alpha` (overlay ceiling, 0.12 / 0.10), `--light-blend` (`multiply` / `soft-light`), `--backdrop` (dialog backdrop). Script-set: `--warmth` (0–1), `--light-gain` (0.6 / 1 / 1.6 from the Warm light setting), `--p` (warning progress, 0–1).

Canvas reads colors through `palette()` in [js/faces.js](js/faces.js), so faces follow the mode automatically. Don't hardcode colors in canvas code.

Contrast (WCAG 2.1):

| Pair | Light | Dark | Needs |
|---|---|---|---|
| `--ink` on `--paper` / `--paper-raised` | 11.98 / 12.87 | 12.83 / 11.81 | 4.5 |
| `--ink-soft` on paper / raised | 6.09 / 6.54 | 6.24 / 5.74 | 4.5 |
| `--ochre-ink` on paper / raised | 5.69 / 6.11 | 7.92 / 7.29 | 4.5 (text), 3 (focus) |
| `--rule-strong` on paper (control borders) | 3.17 | 3.62 | 3 |
| `--paper` on `--ink` (primary button, toast) | 11.98 | 12.83 | 4.5 |
| Placeholder (`--ink-soft` at 75%) | 3.51 | 4.10 | No input uses one yet; check before relying on it |

The light overlay multiplies foreground and background together, so contrast holds under full warmth (on Strong, light mode's tightest pair is `--rule-strong` at 3.06).

## Typography

Families: `--serif` (Newsreader, roman 400–500 and italic 400, optical sizing on) and `--mono` (IBM Plex Mono 400 and 500, `tnum`). Both self-hosted in `fonts/` and cached by the service worker.

Sizes in use, grouped by role. Roles with a token use it; the rest are tuned per context.

| Role | Family | Size | Where |
|---|---|---|---|
| Display | serif | `clamp(36px, 6vw + 16px, 60px)`; work clock `clamp(44px, 8vw + 16px, 72px)` | Landing title, desk clock |
| Title [`--type-title`] | serif | `clamp(30px, 5vw + 14px, 52px)`, lh 1.1 | Running title |
| Title input | serif | `clamp(26px, 4vw + 14px, 36px)` | Setup "what this time is for" |
| Next [`--type-next`] | serif italic | `clamp(20px, 2vw + 12px, 26px)`, lh 1.25; inputs 22px | "then …", next field |
| Heading | serif | 24px (sheet), 21–22px (landing step, next card) | |
| Lead | serif | 19px | Preset names, schedule rows, primary button |
| Body [`--type-body`] | serif | 17px / 1.5 | Default, line inputs, ribbon |
| Hint | serif | 14px | `.hint` |
| Control | mono | 15–16px | `.ctl`, `.chip` |
| Small | mono | 13px | Text buttons, segments, errors, preset lengths |
| Label [`--type-label`] | mono | 12px / 1.4, `0.02em` | `.label`, dates, schedule times |
| Figure [`--type-figure`] | mono tabular | 15px / 1.5 (17px in Simple mode) | Time left and end time under the face |

Weights: 400 everywhere; 500 only for the selected chip and `<strong>` in figures. Inputs are never under 17px (prevents iOS zoom). Sentence case throughout.

## Spacing, radius, rules

`--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 · `--s7` 48 · `--s8` 64

- Field to field: `--s5`. Label to field: `--s1`. Section break: `--s6` or `--s7` above a `1px var(--ink)` rule with `--s3` under it.
- Content width `--measure` 640px (Work mode on ≥820px: 1040px; landscape phone: 900px).
- Tap area minimum `--tap` 44 × 44 px, measured on what responds to a tap (a wrapping `<label>` counts); primary 48px tall. That is stricter than WCAG AA's 24px, matching AAA and Apple's guideline, because this is mostly a phone app used at a glance. Inline text links are exempt. Only exception: the floating window's controls, which shrink to 36px before hiding.
- `--radius` 2px on every boxed control. Circles only for the face dots.

## Motion

| Token / value | Use |
|---|---|
| `--ease` `cubic-bezier(0.2, 0, 0, 1)` | All interaction motion |
| `--dur-press` 100ms | Press: `translateY(1px)` on `.ctl`, `.chip`, `.big-chip`, `.primary` |
| `--dur-fade` 160ms | Hover color and border changes, sheet and toast fade |
| 200ms in / 600ms out | Discreet reveal |
| ~1.5s time constant (JS) | Warmth easing toward its stage target |
| 6s / 1.6s ×3 | Opt-in breathing and flashing light at finish |
| 400ms | Next card fading in with the warning (a stage change, so slower than a panel) |

`prefers-reduced-motion` removes CSS transitions and animations except the finish cues the person turned on: breathing slows to 12s and the flashes become three soft 4s swells. JS steps warmth in thirds. The faces keep moving because they are the information.

## Focus

Global: `2px solid var(--ochre-ink)`, offset 2px, `:focus-visible` only. Text buttons swap to a 2px ochre-ink underline. Line inputs show a 2px ochre-ink bottom rule (1px border plus 1px shadow). Headings that receive programmatic focus (`tabindex="-1"`) show nothing.

---

## Components

### Primary button — `.primary`

The one main action per screen: Start, Add, the landing's "start next" button.

| Variant | Use when |
|---|---|
| default | Form submit (48px tall, 19px serif) |
| `.small` | Tighter rows (44px, 17px) |
| `.landing-main` | Full-width "start what's next" on the finish screen (60px, 22px, left-aligned) |

| State | Visual |
|---|---|
| Default | `--ink` fill, `--paper` text, 1px ink border |
| Hover | Fill mixes 12% toward paper |
| Active | Moves down 1px (100ms) |
| Focus | 2px ochre-ink outline |

Do: one per screen, serif label, a verb. Don't: use it for secondary actions or color it ochre.

### Control — `.ctl`

Bordered mono buttons for adjustments: −5, −1, Pause, +1, +5, extend chips on the landing, Done, PiP row.

States: default (transparent, `--rule-strong` border), hover (border `--ink-soft`, fill `--paper-raised`), active (1px down), focus (outline). Variants: `.ctl-pause` (min 96px so Pause/Resume doesn't shift the row), `.done-btn` (serif, 96px), PiP sizing via `vmin`.

Accessibility: symbol labels like `−5` carry an `aria-label` in words ("Take 5 minutes off").

### Text button — `.text-btn`

Underlined mono text for low-weight actions: Menu, Float, Save as preset, Clear, Finish now, Stop, Undo.

States: rest is `--ink-soft` with a `--rule` underline; hover goes to `--ink` text and underline; focus thickens the underline to 2px ochre-ink. Variant `.stop` is ink at rest, because stopping should be easy to find. Inside the toast it inverts to `--paper`.

### Segmented control — `.seg` + `.seg-btn`

A row of mutually exclusive choices with `role="group"` and `aria-pressed` on each button. Used for mode (Full / Work / Simple), For / Until, and comfort bundle.

Selected: `--paper-raised` fill, `--ink` text, 1px ink underline (inset shadow). Unselected: `--ink-soft` text, `--ink` on hover. The mode switch uses a narrower 12px variant.

### Chip — `.chip` and `.big-chip`

Quick minute choices. `.chip` (44 × 44, mono 16px) toggles with `aria-pressed`; hover fills raised; selected gets an ink border, raised fill and weight 500. On the finish screen they sit three to a row at 440px and below. `.big-chip` (Simple mode, 104px tall, 44px serif numeral with a mono "min" under it) starts the timer directly, so it has no selected state; already raised, its hover firms the border to ink.

### Line input — `.line-input`

An underlined field on the page, no box. `.line-input.big` for the title, `.line-input.italic` (22px) for the next activity, plain `.line-input` (17px) for notes and the first step. Always wrap it in a `<label class="field">`, which makes the tap area. Focus darkens the rule to ink; keyboard focus turns it into a 2px ochre-ink rule. Long titles are capped by `maxlength` (80, notes 140).

### Box input — `.box-input`, `.select`

Boxed mono fields on `--paper-raised` for numbers, times and short choices. `.box-input` is 4.5em wide and centered; `.time` widens it. `.select` draws its own chevron in `--ink-soft`. Always `inputmode="numeric"` for minutes.

### Field wrappers — `.field`, `.inline-field`, `.label`, `.hint`, `.error`, `.check`

- `.field`: block label + input, `--s5` below. Optional fields add `<span class="soft">(optional)</span>` to the label.
- `.inline-field`: label, input and unit on one wrapping line ("or exactly [  ] min").
- `.label`: `--type-label` (12px mono, tabular figures), `--ink-soft`. Also used for small headings (`h2.label`, `h3.label`).
- `.hint`: 14px serif `--ink-soft`; `.hint.mono` is 12px.
- `.error`: 13px mono in `--ochre-ink` with `role="alert"` and a reserved line so the form doesn't jump. Errors here are about time; an error that isn't should use `--ink`.
- `.check`: native checkbox (20px, `accent-color: var(--ink)`) and a sentence, 44px tall.

### Ribbon — `.ribbon`

The "where you left off" bookmark: an ochre-ink notched ribbon in the left margin with a mono label and italic note. Appears on setup, running and landing screens. Only one per screen.

### Preset row — `.preset-list li`

A ruled list item: `.preset-start` (name in 19px serif, next activity in soft italic, length in 13px mono) and `.preset-del` (×, 44px). Hover fills raised. Work mode hides the length. When presets exist they move above the form (`.has-items`), except in Work mode.

### Next card — `.next-card`

Full mode only, during the warning, between the figures and the controls. Raised panel with a `--rule` border; `.next-fill` grows in ochre at 22% by `--p` while the title grows from 22 to 36px. It is the only boxed surface on the running screen.

### Schedule — `.schedule`, `.sched-row`

Work mode's two-line agenda: 7.5em mono time column, serif activity. The current row (`.is-now`) is ink; the next is soft italic.

### Face switch — `.dot`

Three 44px buttons each drawing an 8px circle; hover darkens the ring, pressed is filled ink. `aria-label` names the face (Level, Sun, Planner).

### Sheet — `dialog.sheet`

The menu. Bottom sheet on phones (square bottom, top corners at `--radius`), centered dialog at ≥640px. Fades in over 160ms. Inside: `.sheet-head` (24px serif heading, Close text button, ink rule) and `.sheet-section`s divided by `--rule`. Uses native `<dialog>` for focus trapping and Escape.

### Toast — `.toast`

Inverted ink bar at the bottom with mono text and an Undo text button, `role="status"`. Used for the 10-second undo after Stop instead of a confirmation dialog.

### Light — `.light`

The signature. A fixed, full-page `--ochre` layer at `warmth × --light-alpha × --light-gain`, blended `multiply` (light) or `soft-light` (dark), above everything (`z-index: 40`) and ignoring pointer events. Optional `.breathe` and `.flash` at the finish. Copy its warmth to the floating window; paint it into the PiP video with `paintWarmth`.

### Faces — `canvas.face`

Drawn by [js/faces.js](js/faces.js): `disc` (Full, Simple), `level`, `sun`, `planner` (Work). Each takes a model and the palette, so one drawing serves the page, the floating window and the video. `role="img"` with an `aria-label` the app keeps current.

---

## Patterns

| Pattern | Built from | Notes |
|---|---|---|
| Setup form | field, line input, seg, chips, inline field, select, error, primary + text buttons | Optional fields are labeled, not starred. No validation until submit. |
| Running screen | title, next line, ribbon, face, figures, controls row, next card | One thing of primary importance. Controls sit under an ink rule. |
| Handoff (landing) | label, display title, landing-main primary, chips, inline start form, note field, extend controls | Next activity takes the title position; one tap to start it. |
| Undo instead of confirm | toast + text button | 10 seconds; no dialog for a timer under one minute old. |
| Mode-specific content | `.only-full`, `.only-work`, `.only-simple`, `.not-simple` | Swap words per mode inside one element rather than duplicating elements. |
| Floating window | `body.pip`, `.pip-*` | Sized in `vmin`. Drops controls, then figures, then next line before the face shrinks. |

## Adding something new

1. Use existing tokens; if a value isn't on the scale, round to it rather than adding a literal.
2. Reuse a button family (primary, control, text, chip, segment) before making a new one.
3. Give it hover, press, keyboard focus and a 44px target.
4. Check it in light, dark, full warmth, 200% text and the 200 × 200 floating window.
5. If it is not about time, it is not ochre.
