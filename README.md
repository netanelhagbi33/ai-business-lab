# AI Business Lab — Start Here

Customer onboarding and self-service support. Six views: Start Here, two
step-by-step guides, What Happens Next, the Support Center (232 articles across
10 topics), and Support Tickets.

The Support Center is built to deflect tickets, not collect them — see below.

Rebuilt from a single 4.1 MB `index.html` into static files. No framework, no
build step — upload the folder and serve it.

## Run locally

```
node serve.mjs          # http://localhost:8137
```

Any static server works. It must be served over HTTP, not opened as a `file://`
path: the app fetches its data as JSON and uses ES modules, both of which
browsers block on `file://`.

## Layout

```
index.html          markup only
css/                tokens · base · layout · components · views · journey · qa
js/                 ES modules, one per feature
data/               kb.json · categories.json · steps.json · highlights.json · image-sizes.json
img/                27 screenshots
scripts/            extraction + verification
```

Page weight: **~200 KB** on first paint (was 4.1 MB). The 232-answer knowledge
base is fetched only when someone opens Support Center; screenshots are lazy.

## Things that will bite you

**`scripts/extract.mjs` is destructive and no longer safe to re-run.** It
regenerates `data/` and `img/` from the original single-file build, which would
throw away everything edited since: the guide copy, the highlight on the
Dashboard message-box `+`, and `data/categories.json`, which the original does
not contain at all. It is kept for provenance.

**Do not resize, crop or re-encode anything in `img/`.** `data/highlights.json`
positions the "CLICK HERE" overlay boxes as percentages calibrated per
screenshot to three decimals. Change an image's aspect ratio and every marker on
it drifts off target. If you must replace a screenshot, re-calibrate its entry.

`data/image-sizes.json` is generated, not hand-written — it carries each PNG's
intrinsic dimensions so `<img>` reserves the right box before a lazy image
lands. Regenerate after adding or replacing an image:

```
node scripts/image-sizes.mjs
```

**localStorage keys are frozen**, including the misleading `abl_v21_` prefix.
They hold real users' guide progress and tickets. Renaming one discards it
silently. All access goes through `js/store.js`.

**Behaviour is declared in markup, not in `onclick`.** Buttons carry
`data-action` plus any arguments as data attributes; `js/dom.js` dispatches from
a single listener. Adding a control means adding a `data-action` and registering
a handler with `registerActions`. Inline `on*` attributes are checked for and
rejected by the verification suite.

**Colors, sizes and spacing come from `css/tokens.css`.** Nothing else should
hard-code a hex value. Solid fills that carry small text use the
`--*-solid-bg` / `--*-solid-fg` pairs — plain `--brand` is only 3.07:1 against
white and fails AA below 24px.

## Ticket deflection

The goal is to stop customers opening tickets for questions the articles
already answer. **There is no "Open a ticket" button anywhere in the
navigation.** The only routes to the form are:

| Route | Condition |
|---|---|
| Inside an article | After **2 different** articles were marked "did not solve it" |
| The no-match card | A search returned zero articles, so none could have helped |
| Request a Refund | Always — deliberately ungated |

Every answer ends with "Did this solve your problem? / Yes / No". Saying No
records that article and shows either *"let's try one more"* or, on the second
distinct article, the ticket button. The count is a **set of article
questions**, not a click counter, so answering No twice on the same article
does not unlock anything. An article already marked unhelpful re-renders in
its answered state, in the list and after any re-render.

Submitting a ticket calls `resetDeflection()`, so the next ticket has to earn
its way through two more articles rather than the gate staying open forever.

The ticket body is prefilled with the search query and the titles of the
articles that failed, so an agent does not open with "did you search the help
centre?".

**Support Tickets** is hidden from the sidebar until the user has a ticket;
after that it stays, with a badge counting open ones.

Refunds bypass all of it. Delaying a refund request is a legal problem, not
just a bad experience. **"Request a Refund" exists in exactly one place** —
the "Looking for a refund?" box at the foot of the Support Center — and
verify.mjs fails if a second one appears anywhere in the app.

**No customer-facing copy states the rule.** Not "if two articles do not
help", not "you will be able to open a ticket". A published gate is a gate
people click through twice on purpose; the unlock should land only after
someone has genuinely tried. The one place the threshold is mentioned is the
panel shown *after* it opens, where it is describing what happened rather
than advertising a shortcut.

### What the old model got wrong

```js
const unlocked = failedAnswers >= 2 || !q;   // removed
```

`!q` is true when the user has never searched, so a brand-new customer going
straight to Support got the form on the first click — the gate only applied to
people who had already tried. There were also four separate buttons that
opened a ticket. All are gone.

`abl_help_failed` survives as a **read-only migration signal**: anyone already
past the old gate stays past it. Writing the new count into that key destroyed
exactly the signal it carries, which cost a round of debugging — don't.

## The Start Here spotlight

Customers were missing the Start Here tab, so on a first visit it wears a gold
ring that breathes and a sheen that sweeps across it. **One click retires it
permanently** (`abl_start_here_seen`) — a marker that keeps coming back stops
being a signal and becomes decoration people learn to ignore. Visiting other
tabs does not retire it; only clicking Start Here does.

Two things the effect must not cost:

- Under `prefers-reduced-motion` the movement stops and the sheen is removed,
  but the gold ring stays, so the hint itself is not lost.
- The label colour is `#9a5c00`, not the brighter gold it looks like it should
  be: brighter measured 4.14:1 on the tint and missed AA. The gold people
  actually see is the ring and the sheen, which carry no text.

`scripts/verify-spotlight.mjs` covers all of it, contrast included.

## The sidebar is two groups

The top four entries — Start Here, Dashboard guide, Support Center, Support —
are views inside this file and carry `data-view`.

Below the `IN YOUR DASHBOARD` divider, **Article Generator, Boosters, Billing**
and **Log Out** are areas of the main AI Business Lab product. This page cannot
navigate to them, so they are `disabled` and muted: present for continuity with
the real system, out of the tab order, and inert on click.

They previously carried `data-view="qa"` with a pre-filled `data-query`, so
clicking Boosters dropped you into the Support Center searching for "boost", and
opening Support Center lit up all four buttons at once — `showView` marks every
`.nav[data-view="qa"]` active.

If this page is ever mounted inside the product, give each one an `href` (or a
`data-view`) and drop the `disabled` attribute and the `nav-external` class.

## The Support Center

The tab is named **Support Center**. It was called "Find an Answer" in the
sidebar while everything inside it said "Help Center" — one thing under two
names. Both are now Support Center throughout the UI.

Two answers in `data/kb.json` still say "Help Center" in their body text.
That is customer-facing content, not UI chrome, so it was left alone — worth
a copy pass if the product is renaming for real.

Note it sits next to the separate **Support** tab, which holds tickets. The
split is deliberate: Support Center is self-service, Support is where a person
picks it up.

`#qa` is one view with three states, driven by `js/qa.js`:

| State | What it shows |
|---|---|
| `browse` | Hero search, popular questions, and a grid of 10 topic cards |
| `topic` | One topic's articles, reached from a card |
| `search` | Ranked results for a query, from either state |

**Arriving from anywhere else always lands on `browse`.** The module keeps its
own topic/search state, so without the reset in `main.js` you would leave the
Support Center, come back, and find yourself inside whatever topic you last
opened — which reads as the app having ignored the click. Navigation *inside*
the Support Center never routes through `showView`, so the reset cannot
clobber a drill-down.

Leaving a topic goes through **two** `data-action="qa-home"` buttons: one above
the topic title, one after the article list. Both are needed — "Website &
Content" runs to 43 articles, so the header is long gone by the time you have
read to the bottom. This replaced a text breadcrumb that read as a heading
rather than a control; people could not find their way back out of a topic.

`data/categories.json` supplies each topic's icon and one-line description —
it is presentation metadata, not content. Its `name` values must match the
`category` field in `kb.json` exactly, or a topic will show zero articles.

The states are toggled with the `hidden` property. `css/base.css` carries
`[hidden] { display: none !important }` because `hidden` only sets
`display:none` at user-agent weight — any class with its own `display` beats it
silently.

### The "Popular:" chips

`POPULAR_QUESTIONS` in `js/qa.js` are not decoration — each one runs a real
search. If a chip's wording stops matching (an article is reworded, the
scoring changes), it lands on the wrong answer or on nothing at all. And "nothing
at all" now offers a support ticket immediately, so a broken chip becomes the
shortest path to the agent you were trying to avoid.

`scripts/verify-popular.mjs` pins each chip to the article it must surface.
**Run it after editing the chip list, `kb.json`, or the scoring function.**

The two refund chips are deliberate: they are among the most-asked questions,
and answering them in one click is deflection — nobody opens a ticket to ask
something they just read. They sit last so the hero does not lead with refunds.

## Verification

Start the server first, then:

```
node scripts/verify.mjs           # 58 checks: parity, sidebar, Support Center states, screenshots
node scripts/verify-deflection.mjs  # 32 checks: the whole ticket funnel
node scripts/verify-popular.mjs     # 10 checks: every Popular chip lands on its article
node scripts/verify-spotlight.mjs   # 18 checks: the one-time Start Here marker
node scripts/verify-a11y.mjs   # 18 checks: handler coverage, keyboard, WCAG AA contrast
node scripts/verify-overflow.mjs  # 30 checks: no view scrolls sideways at 5 widths
node scripts/verify-bug.mjs    # demonstrates the bug the original shipped with
```

`verify.mjs` drives the **original** file and the rebuilt one side by side and
compares category counts, ranked search results for ten queries, guide step
titles and overlay geometry — the rebuild has to produce identical output.

Overlays are the exception that proves the rule: every marker the original
shipped must still be pixel-identical, which is what proves the per-screenshot
calibration has not drifted. Deliberate additions are listed in
`ADDED_OVERLAYS` at the top of that check, so a new marker cannot appear
without someone naming it. It
writes screenshots for every view at 1440 / 1024 / 390 px plus dark mode to
`verify-shots/`.

These need Microsoft Edge (`channel: 'msedge'`); change the channel in the
scripts for a different browser.

## What changed from V2.7

- 4.1 MB single file → ~200 KB first paint, everything separately cacheable.
- 176 hard-coded colors → 26 semantic tokens; 24 font sizes → 8; 16 radii → 5;
  5 breakpoints → 2.
- 54 selectors that were declared more than once (`.head h1` four times, `body`
  three) merged into single rules. The dated `V2.1`/`V2.3`/`V2.5` patch layers
  are gone; what they styled is not.
- 32 inline `onclick` handlers → `data-action` delegation.
- Support Center became a real Support Center: a flat list of 232 accordions
  behind pill filters is now a hero search, ten topic cards with counts, and a
  breadcrumbed topic view. Search ranking is unchanged — the parity suite
  proves ten queries return identical results.
- Narrow screens have navigation. The original set `.sidebar { display: none }`
  under 1000px and offered nothing in its place; the same markup now lays out
  as a scrollable top bar.
- Dark mode, visible focus rings on every control, Escape closes the modal,
  WCAG AA contrast throughout.
- **Fixed:** the "No, I still need help" button never worked. The original built
  `onclick="notSolved(${JSON.stringify(q)},…)"`, and the quotes that
  `JSON.stringify` emits closed the HTML attribute — the browser parsed the
  handler as `notSolved(` and threw a SyntaxError. Escalation from search to
  Support was dead. `scripts/verify-bug.mjs` demonstrates it against the
  original file.

The original remains untouched at `C:\Users\Netan\Downloads\index (28).html`.
