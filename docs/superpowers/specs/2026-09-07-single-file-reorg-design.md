# AI Business Lab — Start Here: reorganization design

**Date:** 2026-09-07
**Source:** `C:\Users\Netan\Downloads\index (28).html` (V2.7, 4,109,990 bytes, 209 lines)
**Target:** `C:\Users\Netan\ai-business-lab\`
**Status:** implemented and verified (39 parity checks + 18 accessibility checks passing)

> **Outcome note.** The suspected `notSolved` bug in §1 was confirmed in a real
> browser before any code was written — see `scripts/verify-bug.mjs`. Two
> contrast failures inherited from the original were also found during
> verification and fixed: `--brand` is 3.07:1 against white (fails AA below
> 24px) and `--brand-strong` was 4.1:1 on `--brand-border`. Solid fills that
> carry small text now use dedicated `--*-solid-bg` / `--*-solid-fg` pairs.
> One item was added to the plan during the work: `data/image-sizes.json`,
> holding each PNG's intrinsic dimensions, because lazy images without explicit
> `width`/`height` left the percentage-positioned overlays floating over a
> collapsed box. There are 22 distinct aspect ratios across the 27 screenshots,
> so a single CSS `aspect-ratio` could not substitute.

---

## 1. Current state

A single self-contained HTML file implementing a customer help/onboarding
app with six views: Home, two step-by-step guides (Build / Live), Next
Steps, Find an Answer (searchable Q&A), and Support.

### Composition

| Part | Location | Size | Notes |
|---|---|---|---|
| `<head>` | line 1 | 176 B | |
| CSS | lines 2–56 | 24 KB | one `<style>`, built in dated layers |
| HTML body | lines 56–83 | 12 KB | 6 `<section class="view">` |
| `DATA` object | line 84 | **4,054 KB** | one single line |
| App JS | lines 85–208 | 20 KB | 124 lines, all globals |

`DATA` breaks down as: `imgs` 3,774 KB (27 base64 PNGs), `kb` 178 KB
(232 Q&A items across 10 categories), `liveSteps` 4 KB (9 steps),
`buildSteps` 2 KB (6 steps).

**Images are 92% of the file.**

### Measured problems

**CSS is a stack of patches.** The file carries dated section comments
(`/* V2.1 UX refinements */`, `/* V2.3 Find an Answer */`,
`/* V2.5 calibrated highlights */`). Each release appended a block that
overrode the one before instead of editing it.

| Metric | Value |
|---|---|
| Distinct selectors | 239 |
| Selectors declared more than once | **54 (23%)** |
| Worst offenders | `.head h1` ×4, `.choice h3` ×4, `body` ×3, `.content` ×3, `.learn-grid` ×3, `.kb-top` ×3, `.cat` ×3, `.journey-progress-card` ×3, `.action-highlight` ×3 |
| CSS custom properties defined | 14 |
| Distinct hard-coded hex colors | **176** (251 occurrences) — **150 used exactly once** |
| Distinct `font-size` values | **24** (9px → 36px) |
| Distinct `border-radius` values | **16** |
| Breakpoints | **5** (650, 700, 900, 1000, 1050px) |
| `!important` | 0 ✅ |

The 176 colors are not 176 intentions. They are near-duplicates of about
eight: e.g. `#087e60 #087d61 #087c61 #087b60 #087f63 #087e63 #08785d
#08775d #09795f` are nine shades of one dark green, visually
indistinguishable. `body` sets `font-family: Inter, ...` on line 4 and is
overridden to `"Segoe UI", Arial` on line 7 — the Inter declaration is
dead.

**All JS is global.** 124 top-level functions and `let`/`const` bindings
in one scope. Reaching any behaviour means reading the whole script.

**32 inline `onclick` attributes** — 22 in static HTML, 10 built inside JS
template literals. Every one depends on the functions being global.

### Bug found while reading (verify first)

`searchKB()` (line 197) builds:

```js
onclick="notSolved(${JSON.stringify(q)},${JSON.stringify(top.question)})"
```

`JSON.stringify` on a string always emits wrapping double quotes, injected
into a double-quoted HTML attribute. The parsed attribute value is
therefore just `notSolved(` and the rest of the expression is reinterpreted
as stray attributes. **The "No, I still need help" button should be
inert**, breaking escalation from search to Support. The same pattern
appears in the no-match branch.

**Step 1 of implementation is to confirm this in a real browser before
claiming it as fixed.** If confirmed, it is in scope.

---

## 2. Goals

1. Serve the page as a set of maintainable files instead of a 4 MB blob.
2. Replace the CSS patch stack with one token-driven system.
3. Give the JS module boundaries that match the app's actual features.
4. Refresh the visual design while keeping the product's identity.
5. Prove nothing broke.

## 3. Non-goals

- No framework, no bundler, no build step. Plain static files.
- No content rewriting. The 232 answers and 15 guide steps ship
  byte-identical.
- No new features.
- No change to image pixel dimensions (see constraint below).
- No translation. The UI stays English.

---

## 4. Hard constraint: image geometry is load-bearing

`HIGHLIGHTS` (lines 86–144) positions the green/orange/blue "CLICK HERE"
overlay boxes as percentage coordinates keyed by image filename, calibrated
per screenshot to three decimal places:

```js
'19517bc1-….png': [ {x:23.106, y:52.27, w:59.343, h:7.42, label:'Press Launch My Business'} ]
```

Percentages are resolution-independent, so rescaling is safe in principle —
but any **crop, re-encode with different padding, or aspect-ratio change**
moves every marker off its target.

**Decision: extract the 27 PNGs byte-for-byte from their base64 payloads.
No compression, no WebP conversion, no resizing.** The 20× page-weight win
comes from lazy loading and caching, which needs no re-encoding. Image
optimization can be evaluated later as its own task with visual diffing.

---

## 5. Target structure

```
ai-business-lab/
├── index.html                 ~15 KB   markup only
├── css/
│   ├── tokens.css                      custom properties: color, type, space, radius, shadow, z
│   ├── base.css                        reset, document defaults, focus-visible
│   ├── layout.css                      .app shell, .sidebar, .main, breakpoints
│   ├── components.css                  .btn, .chip, .cat, .modal, form controls
│   ├── views.css                       home, next-steps, support
│   ├── journey.css                     guides: .journey-*, .lesson-*, .shot-*, .action-highlight
│   └── qa.css                          Find an Answer
├── js/
│   ├── main.js                         entry: boot order, wires modules
│   ├── router.js                       showView, sidebar nav, deep links
│   ├── store.js                        the ONLY localStorage access point
│   ├── journey.js                      build/live guide state + rendering
│   ├── highlights.js                   HIGHLIGHTS data + overlay markup + zoom modal
│   ├── qa.js                           search, scoring, synonyms, filters, rendering
│   ├── support.js                      tickets, solved/notSolved, ticket modal
│   └── dom.js                          esc(), el(), delegate()
├── data/
│   ├── kb.json                 178 KB  232 Q&A items
│   ├── steps.json                6 KB  buildSteps + liveSteps
│   └── highlights.json           4 KB  overlay coordinates
├── img/                       3.77 MB  27 PNGs, original bytes
└── docs/superpowers/specs/             this document
```

### Load behaviour

`index.html` + CSS + JS ≈ **200 KB**, down from 4,110 KB — **20× smaller**
first paint.

- `data/steps.json` and `data/highlights.json` are fetched during boot;
  the guides need them to render. ~10 KB, imperceptible.
- `data/kb.json` (178 KB) is fetched lazily, on first entry to the
  "Find an Answer" view. Home and the guides never pay for it.
- Images carry `loading="lazy"` + explicit `width`/`height` (prevents
  layout shift), so a visitor downloads only the screenshots they scroll to
  instead of all 27 up front.
- Everything is separately cacheable — a copy edit to one answer no longer
  invalidates 4 MB.

**Loading states are required** where data is now async. Each view that
depends on a fetch renders a skeleton first and an error state if the fetch
fails. This is new behaviour that did not exist when data was inline, and
it must not flash on fast connections.

---

## 6. The token system

Every raw hex, font size and radius in the CSS is replaced by a token. The
consolidation targets:

| Axis | Now | After |
|---|---|---|
| Colors | 176 | ~26 |
| Font sizes | 24 | 8 |
| Radii | 16 | 5 |
| Breakpoints | 5 | 3 |
| Shadows | ad hoc | 4 |
| Spacing | ad hoc px | 6-step scale |

Color tokens are semantic, not literal — `--color-accent`, not
`--green-500`, so a theme swap touches one file. Families:

- **brand** — accent, accent-hover, accent-subtle (tint), accent-border
- **info** (blue), **warning** (orange), **danger** (red) — each with base
  / subtle / border
- **surface** — page, raised, sunken
- **text** — primary, secondary, muted, inverse
- **border** — default, strong, subtle

Type scale: `12 / 13 / 14 / 16 / 18 / 22 / 28 / 34`. The current 24 sizes
mostly differ by 1px, which reads as noise rather than hierarchy.

Breakpoints collapse to **mobile ≤700px** and **tablet ≤1050px**. The
650/900/1000 rules are folded into the nearest of the two; each fold is
checked visually rather than assumed.

**The 54 duplicate selectors are resolved by merging**, not by deleting the
later rule. For each, the final computed style in today's cascade is the
source of truth — the merged rule must produce that same result. The dated
`V2.x` comments disappear; the styling they introduced does not.

---

## 7. Design refresh

Identity is preserved: green accent, left sidebar, white cards, the same
six views in the same order, same information architecture. What changes:

**Typography.** `Segoe UI` is Windows-only; the fallback chain drops to
Arial elsewhere, so the app already looks different across platforms. Move
to a system stack (`system-ui, -apple-system, "Segoe UI", Roboto,
Helvetica, Arial`) that resolves to the platform's native UI face
everywhere. Apply the 8-step scale so headings, kickers and body text form
a real hierarchy. Set line-height per role — tighter on headings, ~1.6 on
the long answer text, which currently runs at 1.5 across paragraphs of 400+
words.

**Spacing.** One 6-step scale, consistently applied. Current padding values
drift (13px, 14px, 15px, 20px, 27px within the same component family).

**Depth.** Four defined shadow levels replacing ad-hoc `rgba` blurs, so
cards, popovers and the modal sit on a coherent z-axis.

**Interaction states.** Today most buttons have hover and nothing else.
Add: visible `:focus-visible` rings on every interactive element (currently
absent — the app is not keyboard-navigable in practice), `:active` press
feedback, and `disabled` styling.

**Mobile.** Verified at 360px. The sidebar becomes a proper top nav rather
than a stacked flex row; `.journey-shell` and `.journey-gallery` reflow to
single column; the 2-up screenshot gallery stacks.

**Dark mode.** Because every color becomes a token, a dark palette is a
second `:root` block under `prefers-color-scheme: dark`. Included.

**Accessibility.** Keyboard operation of the guide navigation and Q&A
accordions; `aria-expanded` is already set on Q&A toggles and stays.
Contrast checked against WCAG AA — several current muted grays on tinted
backgrounds (`#8a9195` on `#f5faf8`) are likely under 4.5:1 and get
darkened. The existing `prefers-reduced-motion` rule is kept and extended
to the new transitions.

---

## 8. JS architecture

Modules are drawn along the feature seams that already exist in the code:

| Module | Absorbs |
|---|---|
| `router.js` | `showView`, nav click listeners |
| `journey.js` | `JOURNEYS`, `saveJourney`, `renderJourney`, `goJourney`, `prevJourney`, `nextJourney`, `openGuideStep`, `updateHomeProgress` |
| `highlights.js` | `highlightMarkup`, `firstHighlightLabel`, `zoomImg`, `closeModal` — reads coordinates from `data/highlights.json`, holds none itself |
| `qa.js` | `QA_FILTERS`, `POPULAR_QUESTIONS`, `norm`, `synonyms`, `score`, `catCount`, `renderCats`, `renderPopular`, `currentFiltered`, `answerHtml`, `renderQA`, `searchKB`, `renderResults`, `clearQA`, `initQA` |
| `support.js` | `solved`, `notSolved`, `ticketsData`, `openGeneralTicket`, `openRefund`, `openTicketModal`, `submitTicket` |
| `dom.js` | `esc` + small helpers |
| `store.js` | all `localStorage` |

### Inline handlers: the main migration risk

ES modules do not create globals, so all 32 `onclick="…"` attributes break
the moment the script becomes `type="module"`. Two ways out:

- **(a) `window.showView = showView; …`** — a compatibility shim. Fast,
  but keeps the global surface the refactor is meant to remove, and leaves
  the `JSON.stringify` quoting bug pattern in place.
- **(b) Event delegation via `data-action`** ← **chosen.** Markup declares
  intent, one listener per module dispatches it:

```html
<button data-action="view" data-view="qa">Find an Answer</button>
<button data-action="journey-step" data-path="build" data-index="0">…</button>
```

This removes all 32 inline handlers, ends string-concatenated JS in
attributes, and **structurally eliminates the `notSolved` bug** — arguments
travel as data attributes, so no amount of quoting in a question can break
out. It is the more invasive option, and every one of the 32 call sites has
to be re-verified individually; that is what the checklist in §9 is for.

### localStorage

Eight keys exist today: `abl_help_failed`, `abl_help_tickets`,
`abl_help_last_q`, `abl_help_last_answer`, `abl_v21_build_index`,
`abl_v21_build_done`, `abl_v21_live_index`, `abl_v21_live_done`.

**Key names are preserved exactly**, including the now-inaccurate `v21`
prefix. Renaming them would silently wipe the saved progress of anyone who
already used the page. `store.js` wraps all access in try/catch — the
current `JSON.parse` calls are partly unguarded and throw in private-mode
browsers.

---

## 9. Verification

No tests exist, and this refactor touches every line of a working app.
Verification is therefore the deliverable, not an afterthought.

**Baseline first.** Before any change, drive the *original* file with
Playwright and capture:

1. Screenshots of all 6 views at 1440px, 1024px and 390px wide.
2. Screenshots of both guides at every step (6 build + 9 live = 15).
3. The Q&A view: default, one category filter, one search with results, one
   search with no match.
4. The image zoom modal with overlay markers visible.
5. The ticket modal.

**Then the same script against the rebuilt version**, comparing
side-by-side. The images are pixel-identical bytes, so screenshot diffs are
meaningful.

**Behavioural checklist** — each verified by clicking, not by reading code:

- All 32 former inline handlers fire correctly.
- Guide progress persists across reload (both paths, `localStorage` keys
  unchanged and readable by the old key names).
- Search returns the same ranked results for a fixed set of ~10 queries,
  compared against the original's output.
- All 10 category filters return the same counts as the original.
- The `notSolved` escalation button works — the specific bug from §1.
- Ticket submission writes the same `abl_help_tickets` shape.
- Keyboard-only pass through every view.
- All 27 images resolve (no 404s), and every overlay marker lands on the
  same target as the baseline screenshot.

**Content integrity check** — a script asserting the extracted
`kb.json` / `steps.json` deep-equal the objects parsed out of the original
file, and that the 27 extracted PNGs match their base64 payloads byte for
byte. This runs before anything else and is non-negotiable: it is what
guarantees "no content was rewritten".

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Merging 54 duplicate selectors changes computed styles | Baseline screenshot diff per view and per guide step |
| Converting 32 inline handlers misses one | Explicit checklist, each clicked |
| Overlay markers drift | Images extracted byte-identical; markers diffed against baseline |
| Async data introduces flashes/races | Skeletons + a boot order that renders nothing dependent before its fetch resolves |
| Breakpoint consolidation breaks a layout | Three widths screenshotted, 650/900/1000 rules folded one at a time |
| Losing saved user progress | localStorage keys byte-identical, verified by reading old values |
| Original file lost | Source in `Downloads` is never modified; work happens in a new directory |

---

## 11. Order of work

1. Confirm the `notSolved` bug in a browser; capture the full baseline.
2. Extract assets (`img/`, `data/`) + run the content integrity check.
3. Split HTML/CSS/JS mechanically — **no design changes yet** — and verify
   the split version matches the baseline screenshots. This isolates
   "did the restructure break anything" from "did the redesign change
   anything".
4. Build the token system; migrate CSS onto it; merge the duplicates.
5. Apply the design refresh; dark mode; accessibility pass.
6. Convert inline handlers to delegation; fix the `notSolved` bug.
7. Full verification pass; report diffs.

Step 3 is deliberately a checkpoint: at that point the app is reorganized
and provably unchanged, which is a safe place to stop if the redesign needs
to wait.
