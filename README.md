# AI Business Lab — Start Here

Customer onboarding and Support Center. Six views: Start Here, two step-by-step
guides, What Happens Next, the Support Center (232 articles across 10 topics), and
Support.

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
| `topic` | One topic's articles, reached from a card; breadcrumb back |
| `search` | Ranked results for a query, from either state |

`data/categories.json` supplies each topic's icon and one-line description —
it is presentation metadata, not content. Its `name` values must match the
`category` field in `kb.json` exactly, or a topic will show zero articles.

The states are toggled with the `hidden` property. `css/base.css` carries
`[hidden] { display: none !important }` because `hidden` only sets
`display:none` at user-agent weight — any class with its own `display` beats it
silently.

## Verification

Start the server first, then:

```
node scripts/verify.mjs        # 55 checks: parity, sidebar, Support Center states, screenshots
node scripts/verify-a11y.mjs   # 18 checks: handler coverage, keyboard, WCAG AA contrast
node scripts/verify-overflow.mjs  # 30 checks: no view scrolls sideways at 5 widths
node scripts/verify-bug.mjs    # demonstrates the bug the original shipped with
```

`verify.mjs` drives the **original** file and the rebuilt one side by side and
compares category counts, ranked search results for ten queries, guide step
titles and overlay geometry — the rebuild has to produce identical output. It
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
