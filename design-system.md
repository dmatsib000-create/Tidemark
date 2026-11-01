# VizTime design system

The reference for what is actually built. [design-direction.md](design-direction.md) is the intent ("Afternoon paper"); this file records the tokens, components and rules as they exist in [styles.css](styles.css), [index.html](index.html) and [js/faces.js](js/faces.js), and where the two disagree.

Audited 2026-11-01 against `main` at `83da073`. Part 1 is kept as the record of that audit; Part 2 describes the system after the fixes listed under [Resolution](#resolution).

---

## Part 1: Audit

### Summary

**Components reviewed:** 24 | **Issues found:** 15 (1 usability, 5 drift from spec or open questions, 9 hygiene)

The system is small, coherent and mostly faithful to the spec. Colors are fully tokenized, ochre is used only for time, the spacing scale is used almost everywhere, contrast passes AA in both modes including under full warmth, and every tap area is at least 44 px (see [Tap targets](#tap-targets)). The one real usability problem is that the next card, which is meant to take the stage in the warning, sits below the controls and off-screen on a laptop. The weak spots in the system itself are untokenized typography (the spec defines five type tokens; the code has none), a few places where JS duplicates values CSS already owns, and reduced motion silencing finish cues people opted into.

No overall score is given: there is no rubric that would make a number meaningful. The per-component scores below are a rough guide only.

### Resolution

All findings were fixed on 2026-11-01, on the `design-system-doc` branch, except where noted.

| Finding | What changed |
|---|---|
| Next card off-screen in the warning | Moved above the controls in index.html. At 1024×768 it now shows in full; the controls start just below it. |
| PiP video warmth | `palette()` reads `--light-alpha` and `--light-blend`; `paintWarmth` uses them with the matching canvas blend mode. |
| Reduced motion and finish cues | Decided: keep them, gentler. Under reduced motion, breathing slows to 12s and the flashes become three soft 4s swells (peak 0.35). Breathing now starts when the flashes end rather than at a fixed 5s. |
| Mode switch margin | `.seg.mode-switch` now beats `.seg`; the switch and Menu share a center line. |
| 320px adjust row | `−1`/`+1` hide below 360px. |
| Finish screen chips | Three per row at 440px and below (covers the 428–430px iPhones). Setup chips narrowed to `--tap` (44px) so six fit with room to spare at 360px. |
| Type tokens | `--type-title`, `--type-next`, `--type-body`, `--type-label`, `--type-figure` added and used. The shipped title and next sizes were kept and design-direction.md updated to match. One-off sizes stay hand-tuned. |
| Fonts in JS | `SERIF` and `MONO` exported from faces.js with the CSS stacks; `paintVideo` uses `SERIF`. |
| Motion and size tokens | `--dur-press`, `--dur-fade` (was `--quick`), `--tap`, `--measure`; literals replaced. |
| Hover | Chips fill, segments and dots darken to ink, big chips firm their edge to ink. |
| Names | `.line-input` (with `.big`, `.italic`) replaces `.serif-input` / `.plain-input`; `.box-input` replaces `.num-input`; `.is-on`, `.is-edit-open`, `.is-note-open` replace `.on`, `.edit-open`, `.note-open`. `.label` now has tabular figures itself. |
| Off-scale spacing | Chip gap is `--s2`, ribbon indent `--s5`. `.text-btn`'s 2px side padding stays: it keeps the underline flush with the text. |
| `--backdrop` | Light mode mixes `--ink` instead of a raw rgba. |
| Placeholder contrast | Opacity raised to 0.75, ahead of any placeholder being added. |
| Next card 400ms fade | Kept, with a comment: it arrives with a stage change. |
| Icon `#E0CDB7` | Unchanged: the SVG icon can't read CSS tokens. It is `--ochre` mixed with `--paper`. |
| Disabled styles | None added: the system hides controls rather than disabling them. |

The offline cache name moved to `viztime-paper-5` so installed copies pick up the changes.

### Token coverage

| Category | Defined | Hardcoded values found |
|---|---|---|
| Color | 8 per mode, plus 4 support tokens (`--wash-alpha`, `--light-alpha`, `--light-blend`, `--backdrop`) | 0 hex in CSS rules. `--backdrop` is a raw `rgba()` of ink. JS: canvas warmth alpha `0.12` in `paintWarmth` (ignores dark mode's `0.10` and `soft-light`). Icon SVG uses `#E0CDB7`, not a token. |
| Spacing | 8 (`--s1`…`--s8`) | 3 off-scale: `.chips` gap `6px`, `.ribbon` left padding `22px`, `.text-btn` side padding `2px`. Ribbon geometry (`4px`, `-6px`, `9px`) is drawing, not spacing. |
| Typography | 2 family tokens (`--serif`, `--mono`); **0 of the 5 spec type tokens** | ~33 `font-size` declarations, ~20 distinct values (12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 24, 34, 44 px and 10 `clamp()`s). The serif stack is re-typed in `app.js` (twice) instead of using the `SERIF` constant in `faces.js`. (The canvas mono stack omits `Consolas`, which is harmless because the fonts are self-hosted.) |
| Radius | 1 (`--radius` 2px) | `50%` on `.dot` (a circle, intentional); `0` on underline inputs. Clean. |
| Motion | 2 (`--ease`, `--quick` 160ms) | Press `100ms` ×4 untokenized; reveal `200ms`/`600ms`; `.next-card` fades `400ms` (spec: 160ms). |
| Layout | none | `640px` content width and `44px` tap minimum repeated as literals (18 times for 44px). |

### Naming consistency

| Issue | Where | Recommendation |
|---|---|---|
| Button classes share no family | `.primary`, `.ctl`, `.text-btn`, `.chip`, `.big-chip`, `.seg-btn`, `.dot`, `.preset-start`, `.preset-del` | Keep the short names (they read well in markup), but document them as one family: *primary*, *control*, *text button*, *chip*, *segment*. Avoid adding a tenth. |
| `.serif-input` vs `.plain-input` | Both are serif; "plain" only means smaller | Rename to `.line-input` with `.big` / `.italic` / default sizes, or document that "plain" means "body size". |
| `.num-input` also styles `type="time"` | `#f-until` | Rename to `.box-input` (it is the boxed field, as opposed to the underlined one). |
| State classes use four conventions | `.is-now`, `.is-finished`, `.has-items`, `.on`, `.edit-open`, `.note-open` | Standardize on `is-*` / `has-*`: `.reveal.is-on`, `body.is-edit-open`, `body.is-note-open`. Toggle state on buttons already uses `aria-pressed` consistently; keep that. |
| `.label` sets the mono font but not tabular figures; `.mono` adds `tnum` | ~30 places in index.html pair them | Not redundant: `.mono` is what keeps clock times in labels from jittering. Either fold `tnum` into `.label` and drop the pairing, or document that labels showing numbers need `.mono`. |
| `--quick` names a speed, not a use | `:root` | Add `--dur-press: 100ms` and rename to `--dur-fade: 160ms` so motion tokens map to the spec's motion table. |

### Spec drift (design-direction.md vs code)

| Spec says | Code does | Recommendation |
|---|---|---|
| Overlay is `--ochre` × warmth × 12% (light) / 10% (dark), multiply / soft-light | Canvas `paintWarmth` (iPhone PiP video) always uses 12%, normal blend | Read `--light-alpha` into `palette()` and use it; approximate soft-light with a lower alpha in dark. |
| Reduced motion keeps what is information (the time visual, the warmth) | `animation: none !important` also removes the opt-in breathing and flashing finish cues | Needs a decision: these are cues the person turned on, so they arguably count as information. One option is a slower, lower-contrast version under reduced motion instead of none. |
| `--type-title`: `clamp(28px, 5vw + 12px, 52px)` | `.run-title`: `clamp(30px, 5vw + 14px, 52px)` | Both came in with the v2 build commit, so there is no record of whether the change was deliberate. Decide which is right, then make it a token. |
| `--type-next`: `clamp(20px, 2vw + 12px, 28px)` | `.run-next`: max `26px` | Same. |
| Panels fade over 160 ms | `.next-card` fades over 400 ms | Probably deliberate, since the next card arrives with a stage change. Note it as such or use `--quick`. |

The rest of the spec is met: eight colors per mode, ochre only for time (focus, the ribbon, time fills, and error text, which is always about a length or end time), 4px scale, 2px radius, hairline rules for structure, no drop shadows (the two `box-shadow`s are 1px rules), sentence case, inputs ≥17px, 44px targets, custom focus styles, discreet Work mode.

### Accessibility check

Contrast, computed from the tokens (WCAG 2.1):

| Pair | Light | Dark | Needs |
|---|---|---|---|
| `--ink` on `--paper` / `--paper-raised` | 11.98 / 12.87 | 12.83 / 11.81 | 4.5 |
| `--ink-soft` on paper / raised | 6.09 / 6.54 | 6.24 / 5.74 | 4.5 |
| `--ochre-ink` on paper / raised | 5.69 / 6.11 | 7.92 / 7.29 | 4.5 (text), 3 (focus) |
| `--rule-strong` on paper (control borders) | 3.17 | 3.62 | 3 |
| `--paper` on `--ink` (primary button, toast) | 11.98 | 12.83 | 4.5 |
| Placeholder (`--ink-soft` at 45%) | **2.00** | **2.33** | 4.5 if it carries meaning |

Under full warmth on the Strong setting, light-mode pairs drop slightly (rule-strong 3.06, ink-soft 5.66, ochre-ink 5.26), because the multiply overlay darkens foreground and background together. All still pass.

Placeholders are faint, but no input has placeholder text (in the HTML or set from JS), so this is latent. If placeholders are added, raise the opacity to about 0.75.

No component has a disabled style (0 `:disabled` rules). Nothing is disabled today, so nothing is broken; document that the system avoids disabled controls and hides them instead.

### Component completeness

| Component | States | Variants | Docs | Score |
|---|---|---|---|---|
| Primary button | ✅ hover, press, focus | ✅ default, `.small`, `.landing-main` | ⚠️ | 8/10 |
| Control (`.ctl`) | ✅ hover, press, focus | ✅ `.ctl-pause`, `.done-btn`, PiP size | ⚠️ | 8/10 |
| Text button | ✅ hover, focus | ✅ `.stop`, on-ink in toast | ⚠️ | 8/10 |
| Segmented control | ⚠️ pressed and focus, no hover | ✅ mode switch size | ⚠️ | 7/10 |
| Chip | ⚠️ hover is border only (`.ctl` also fills) | ✅ | ⚠️ | 7/10 |
| Big chip | ⚠️ hover is border only | ➖ one | ⚠️ | 6/10 |
| Face dot | ⚠️ pressed, no hover | ➖ one | ❌ | 5/10 |
| Line input (serif / plain) | ✅ focus, focus-visible | ✅ big, italic, plain | ⚠️ | 8/10 |
| Box input / select | ✅ focus border plus the global 2px ochre-ink outline, as the spec asks for non-text controls | ✅ number, time, select | ⚠️ | 8/10 |
| Checkbox, range | native with `accent-color` | ➖ | ❌ | 6/10 |
| Field / inline field / label / hint / error | ✅ | ✅ | ⚠️ | 8/10 |
| Ribbon bookmark | ➖ static | ➖ | ✅ spec | 9/10 |
| Preset row | ✅ hover | ➖ hides length in Work | ⚠️ | 7/10 |
| Next card | ✅ fill by `--p` | ➖ | ✅ spec | 8/10 |
| Schedule row | ✅ `.is-now` | ➖ | ⚠️ | 7/10 |
| Sheet (dialog) | ✅ open fade | ✅ bottom sheet / centered ≥640px | ⚠️ | 8/10 |
| Toast | ✅ | ➖ | ⚠️ | 7/10 |
| Light overlay | ✅ warmth, breathe, flash | ✅ per mode | ✅ spec | 10/10 |
| Time faces (disc, level, sun, planner) | ✅ | ✅ | ✅ in faces.js | 9/10 |

### Live check

Run on the published site (1024×768, 375px and 320px, light and dark), through a full session from setup to warning to finish, then confirmed in the code.

| Finding | Severity | Cause | Fix |
|---|---|---|---|
| In the warning, the next card is below the controls. At 1024×768 about 10px of it shows; the rest needs a scroll. The spec's "next activity gains presence" is effectively invisible. | 🔴 | `#next-card` comes after `nav.controls` in [index.html](index.html), and nothing reorders or scrolls it (the code comment in `app.js` says it "takes the stage"). | Move it above the controls, between the figures and the control rule. |
| The mode switch sits higher than Menu in the top bar on phones. | 🟢 | `.mode-switch { margin: 0 }` comes before `.seg { margin-bottom: var(--s3) }` in styles.css; same specificity, so the later rule wins and the switch keeps a 12px bottom margin. | Raise the specificity (`.seg.mode-switch`) or move the rule below `.seg`. |
| At 320px the adjust row wraps four plus one, leaving `+5` alone. | 🟢 | 4 × 52px + 96px Pause + gaps is 336px; the content is 288px. | Hide `.adj-fine` under about 360px, as Simple mode already does. |
| On a 375px phone the finish screen's minute chips wrap five plus one. | 🟢 | `.landing-start .chip` is 60px min; six of them plus gaps is 390px. | A 3-column grid, like Simple mode's big chips. |

Confirmed live: no text under 4.5:1 on the setup screen, keyboard focus visible on every control tried, focus moves to each screen's heading, the live region speaks only at the warning and finish, no horizontal scroll at 320px, and reopening after the end time goes straight to the finished screen.

Not checked: the iPhone PiP video, reduced-motion behavior, and a real screen reader.

### Tap targets

44 × 44 px is the right minimum for this app and should stay. WCAG AA (2.5.8) only requires 24px, but 44px is the AAA level (2.5.5) and Apple's guideline, the app is mainly a home-screen iPhone app, and it is used at a glance in front of other people. The current build gets the details right:

- **It measures the tap area, not the visible box.** The underlined fields are 38px tall, but each is inside a `<label class="field">`, so tapping the label above also focuses it. The real target is about 60px tall and full width.
- **Inline text links are exempt**, as WCAG allows.
- **The floating window is the deliberate exception**: `.pip-row .ctl` shrinks to 36px in very small windows, where the alternative is dropping the controls. It hides them altogether below about 140px tall.

### Priority actions

1. **Move the next card above the controls,** so the warning shows what's next without scrolling. (From the live check.)
2. **Match the PiP video warmth to the page.** Have `paintWarmth` read `--light-alpha` through `palette()` so dark mode uses 10% and a soft-light approximation, not 12% normal blend.
3. **Decide on reduced motion and the finish cues.** Either keep the opt-in breathing and flashing in a gentler form, or document that reduced motion overrides them.
4. **Fix the small layout issues** from the live check: the mode switch margin, the 320px adjust row, and the finish screen chips.
5. **Tokenize the five spec type sizes** (`--type-title`, `--type-next`, `--type-body`, `--type-label`, `--type-figure`), settling the title and next values first. Leave the one-off context sizes alone: the spec asks for each to be calibrated by hand, and collapsing them would undo that work.
6. **Give JS one source for fonts.** Export `SERIF` / `MONO` from faces.js and use them in `app.js`'s `paintVideo`.
7. **Add motion and size tokens.** `--dur-press: 100ms`, `--dur-fade: 160ms`, `--tap: 44px`, `--measure: 640px`. Replace the literals.
8. **Even out hover.** Chip, big chip, segment and dot should fill to `--paper-raised` on hover the way `.ctl` and preset rows do.
9. **Tidy names** per the naming table; lowest priority because nothing is broken.

---

## Part 2: Reference

### Principles in one screen

- **Paper, not screen.** Warm off-white or walnut, near-black or cream ink, hairline rules. No shadows, no pills, 2px corners.
- **Ochre means time.** `--ochre` fills time (faces, next-card fill, the light). `--ochre-ink` is for focus, the ribbon, and time text that needs contrast. Never on controls, never decoration.
- **Two voices.** Newsreader for human content, IBM Plex Mono (tabular) for the clerk: labels, times, controls.
- **Motion is time.** Controls settle 1px and fade; only stage changes move slowly, over seconds.
- **Rules organize.** `1px var(--ink)` opens a section; `1px var(--rule)` divides inside it.

### Color tokens

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

### Typography

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

### Spacing, radius, rules

`--s1` 4 · `--s2` 8 · `--s3` 12 · `--s4` 16 · `--s5` 24 · `--s6` 32 · `--s7` 48 · `--s8` 64

- Field to field: `--s5`. Label to field: `--s1`. Section break: `--s6` or `--s7` above a `1px var(--ink)` rule with `--s3` under it.
- Content width `--measure` 640px (Work mode on ≥820px: 1040px; landscape phone: 900px).
- Tap area minimum `--tap` 44 × 44 px, measured on what responds to a tap (a wrapping `<label>` counts); primary 48px tall. Only exception: the floating window's controls, which shrink to 36px before hiding.
- `--radius` 2px on every boxed control. Circles only for the face dots.

### Motion

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

### Focus

Global: `2px solid var(--ochre-ink)`, offset 2px, `:focus-visible` only. Text buttons swap to a 2px ochre-ink underline. Line inputs show a 2px ochre-ink bottom rule (1px border plus 1px shadow). Headings that receive programmatic focus (`tabindex="-1"`) show nothing.

---

### Components

#### Primary button — `.primary`

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

#### Control — `.ctl`

Bordered mono buttons for adjustments: −5, −1, Pause, +1, +5, extend chips on the landing, Done, PiP row.

States: default (transparent, `--rule-strong` border), hover (border `--ink-soft`, fill `--paper-raised`), active (1px down), focus (outline). Variants: `.ctl-pause` (min 96px so Pause/Resume doesn't shift the row), `.done-btn` (serif, 96px), PiP sizing via `vmin`.

Accessibility: symbol labels like `−5` carry an `aria-label` in words ("Take 5 minutes off").

#### Text button — `.text-btn`

Underlined mono text for low-weight actions: Menu, Float, Save as preset, Clear, Finish now, Stop, Undo.

States: rest is `--ink-soft` with a `--rule` underline; hover goes to `--ink` text and underline; focus thickens the underline to 2px ochre-ink. Variant `.stop` is ink at rest, because stopping should be easy to find. Inside the toast it inverts to `--paper`.

#### Segmented control — `.seg` + `.seg-btn`

A row of mutually exclusive choices with `role="group"` and `aria-pressed` on each button. Used for mode (Full / Work / Simple), For / Until, and comfort bundle.

Selected: `--paper-raised` fill, `--ink` text, 1px ink underline (inset shadow). Unselected: `--ink-soft` text, `--ink` on hover. The mode switch uses a narrower 12px variant.

#### Chip — `.chip` and `.big-chip`

Quick minute choices. `.chip` (44 × 44, mono 16px) toggles with `aria-pressed`; hover fills raised; selected gets an ink border, raised fill and weight 500. On the finish screen they sit three to a row at 440px and below. `.big-chip` (Simple mode, 104px tall, 44px serif numeral with a mono "min" under it) starts the timer directly, so it has no selected state; already raised, its hover firms the border to ink.

#### Line input — `.line-input`

An underlined field on the page, no box. `.line-input.big` for the title, `.line-input.italic` (22px) for the next activity, plain `.line-input` (17px) for notes and the first step. Always wrap it in a `<label class="field">`, which makes the tap area. Focus darkens the rule to ink; keyboard focus turns it into a 2px ochre-ink rule. Long titles are capped by `maxlength` (80, notes 140).

#### Box input — `.box-input`, `.select`

Boxed mono fields on `--paper-raised` for numbers, times and short choices. `.box-input` is 4.5em wide and centered; `.time` widens it. `.select` draws its own chevron in `--ink-soft`. Always `inputmode="numeric"` for minutes.

#### Field wrappers — `.field`, `.inline-field`, `.label`, `.hint`, `.error`, `.check`

- `.field`: block label + input, `--s5` below. Optional fields add `<span class="soft">(optional)</span>` to the label.
- `.inline-field`: label, input and unit on one wrapping line ("or exactly [  ] min").
- `.label`: `--type-label` (12px mono, tabular figures), `--ink-soft`. Also used for small headings (`h2.label`, `h3.label`).
- `.hint`: 14px serif `--ink-soft`; `.hint.mono` is 12px.
- `.error`: 13px mono in `--ochre-ink` with `role="alert"` and a reserved line so the form doesn't jump. Errors here are about time; an error that isn't should use `--ink`.
- `.check`: native checkbox (20px, `accent-color: var(--ink)`) and a sentence, 44px tall.

#### Ribbon — `.ribbon`

The "where you left off" bookmark: an ochre-ink notched ribbon in the left margin with a mono label and italic note. Appears on setup, running and landing screens. Only one per screen.

#### Preset row — `.preset-list li`

A ruled list item: `.preset-start` (name in 19px serif, next activity in soft italic, length in 13px mono) and `.preset-del` (×, 44px). Hover fills raised. Work mode hides the length. When presets exist they move above the form (`.has-items`), except in Work mode.

#### Next card — `.next-card`

Full mode only, during the warning, between the figures and the controls. Raised panel with a `--rule` border; `.next-fill` grows in ochre at 22% by `--p` while the title grows from 22 to 36px. It is the only boxed surface on the running screen.

#### Schedule — `.schedule`, `.sched-row`

Work mode's two-line agenda: 7.5em mono time column, serif activity. The current row (`.is-now`) is ink; the next is soft italic.

#### Face switch — `.dot`

Three 44px buttons each drawing an 8px circle; hover darkens the ring, pressed is filled ink. `aria-label` names the face (Level, Sun, Planner).

#### Sheet — `dialog.sheet`

The menu. Bottom sheet on phones (square bottom, top corners at `--radius`), centered dialog at ≥640px. Fades in over 160ms. Inside: `.sheet-head` (24px serif heading, Close text button, ink rule) and `.sheet-section`s divided by `--rule`. Uses native `<dialog>` for focus trapping and Escape.

#### Toast — `.toast`

Inverted ink bar at the bottom with mono text and an Undo text button, `role="status"`. Used for the 10-second undo after Stop instead of a confirmation dialog.

#### Light — `.light`

The signature. A fixed, full-page `--ochre` layer at `warmth × --light-alpha × --light-gain`, blended `multiply` (light) or `soft-light` (dark), above everything (`z-index: 40`) and ignoring pointer events. Optional `.breathe` and `.flash` at the finish. Copy its warmth to the floating window; paint it into the PiP video with `paintWarmth`.

#### Faces — `canvas.face`

Drawn by [js/faces.js](js/faces.js): `disc` (Full, Simple), `level`, `sun`, `planner` (Work). Each takes a model and the palette, so one drawing serves the page, the floating window and the video. `role="img"` with an `aria-label` the app keeps current.

---

### Patterns

| Pattern | Built from | Notes |
|---|---|---|
| Setup form | field, line input, seg, chips, inline field, select, error, primary + text buttons | Optional fields are labeled, not starred. No validation until submit. |
| Running screen | title, next line, ribbon, face, figures, controls row, next card | One thing of primary importance. Controls sit under an ink rule. |
| Handoff (landing) | label, display title, landing-main primary, chips, inline start form, note field, extend controls | Next activity takes the title position; one tap to start it. |
| Undo instead of confirm | toast + text button | 10 seconds; no dialog for a timer under one minute old. |
| Mode-specific content | `.only-full`, `.only-work`, `.only-simple`, `.not-simple` | Swap words per mode inside one element rather than duplicating elements. |
| Floating window | `body.pip`, `.pip-*` | Sized in `vmin`. Drops controls, then figures, then next line before the face shrinks. |

### Adding something new

1. Use existing tokens; if a value isn't on the scale, round to it rather than adding a literal.
2. Reuse a button family (primary, control, text, chip, segment) before making a new one.
3. Give it hover, press, keyboard focus and a 44px target.
4. Check it in light, dark, full warmth, 200% text and the 200 × 200 floating window.
5. If it is not about time, it is not ochre.
