# a11y-atomic

`a11y-atomic` is an atomic CSS framework. It uses Tailwind-compatible class names and variant syntax. Accessibility values are stored in CSS variables. The widget changes those variables and sets `data-ax-*` attributes on `<html>`.

When a setting is automatic, the operating system preference is used.

The framework is tied to the W3C WAI rules: every feature maps to WCAG 2.2 success criteria, checked against W3C's own data, and a sync script reports when W3C changes them. See [Tied to W3C WAI](#tied-to-w3c-wai) and [WCAG.md](WCAG.md).

## Efficiency: what it costs, measured

Gzipped, on the demo page (what browsers download). Compiling classes only pays off when the CSS is shared:

| Build | First page | Every further page |
|---|---|---|
| Readable classes, CSS inline per page | 10.5 KB | 7.2 KB |
| Atomic classes, CSS inline per page | 12.0 KB | 8.8 KB (inline CSS is not shared, and hashes compress worse) |
| **Atomic classes, one shared stylesheet (`--site`)** | **10.4 KB** | **4.6 KB** (HTML only; the CSS is cached) |

Scale test, 628 variations of the demo page: the shared stylesheet is 28.9 KB for one page and 29.5 KB for 628, and the whole site compiles in under a second. (Variations of one page, so a real site with more variety grows somewhat before it levels off.) In `--site` mode the compiler sees every page, so the most used classes get the shortest names (`ax_0`, `ax_1`, …) and compiled HTML is no bigger than the readable source (4.6 KB gzipped).

The widget JavaScript is one bundled file, `dist/a11y-widget.min.js`: **27 KB minified, 9.9 KB gzipped**, including the atomic engine and shadow DOM support. `npm run build` produces it.

Recommended: `npx a11y-atomic --site "_site/**/*.html"` (or `{site: true}` in the Eleventy plugin). Use `--pages` (readable, inline) when a site is small and you want the least tooling, and `--pages --compile` only to inspect atomic output.

## What ships is atomic

You write readable classes; pages ship atomic ones. The per-page build compiles every framework class in the HTML into generated `ax_` classes, **one declaration each**, shared across the site, Facebook style:

```html
<!-- you write -->
<div class="ax-grid-wrapper lg:ax-grid-cols-2 ax-gap-8 hover:ax-bg-surface">

<!-- the page ships -->
<div class="ax_1ej8q2t ax_98t27f ax_q5qnqt ax_1qmlu10 ax_1uafzxx ax_bpv9b3 ax_8badiq ax_h04ltk">
```

```css
.ax_98t27f { display: grid; }
@media (min-width: 1024px) { .ax_q5qnqt { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (hover: hover) { .ax_h04ltk:hover { background-color: var(--ax-color-surface); } }
```

| Rule | |
|---|---|
| One declaration per class | `ax-text-lg` (size + line height) ships as two classes; your grid ships as the atomic classes of its proven-identical twin. |
| Same cascade | Compiled rules stay in their original layer (grid → components, utilities → utilities); per element, the last class wins per property, lower layers first. |
| Proven | A browser test compares the compiled demo with the readable source in four modes (desktop, mobile, dark + high contrast at 200% text, tablet with text spacing): identical computed styles on every element, and no class in the markup that isn't `ax_`. axe passes on the compiled page. |
| Stays readable | Classes that need an ancestor or child selector (`group-hover:*`, `ax-space-x/y-*`) and your own classes. Class strings built inside `<script>` are not rewritten; their readable rules are still included. |

```sh
npx a11y-atomic --site "_site/**/*.html"              # compiled, ONE shared stylesheet, short names (recommended)
npx a11y-atomic --pages "_site/**/*.html" --compile    # compiled, CSS inline per page (larger)
npm run demo:compile                                   # writes compiled.html and compiled-site.html
```

The Eleventy plugin: `{site: true}` (shared stylesheet) or `{perPage: true, compile: true}`. Node API: `compileSite(pages)`, `linkSite(html, href)`, `buildSite(globs, options)`. The demo is served compiled at `/compiled.html` (inline) and `/compiled-site.html` (shared stylesheet, short names).

## Naming standard

Every name the framework owns starts with `ax` (a11y + atomic), so nothing generic can clash with a site's own CSS or with Tailwind on the same page. The prefix lives in `src/naming.js`.

| Kind | Pattern | Example |
|---|---|---|
| Utility class | `ax-NAME`, variants before it | `ax-p-4`, `lg:ax-grid-cols-3`, `hover:ax-bg-primary` |
| Variable utility | `ax--KEY` (double dash: reads a variable) | `ax--p` with `--ax--p`, `--ax--p-lg`, `--ax--p-large` |
| Generated atomic class | `ax_HASH` (underscore: generated) | `ax_1k2j3` |
| Grid | `ax-grid-PART`, `--ax-grid-VAR` | `ax-grid-wrapper`, `--ax-grid-column-desktop` |
| Token | `--ax-GROUP-NAME` | `--ax-color-text`, `--ax-spacing`, `--ax-a11y-motion` |
| Widget setting | `data-ax-KEY` on `<html>` | `data-ax-text="150"` |
| Hooks and events | `ax-`, `data-ax-`, `ax:` | `.ax-widget`, `data-ax-part`, `data-ax-page`, `ax:change` |

## Variable utilities

The andrewrico grid picks columns by reading one variable per breakpoint, each falling back to the one below. Variable utilities use that pattern for any property: **one class, any value, any breakpoint**, with no class per value.

```html
<ul class="ax-grid ax--cols ax--gap"
    style="--ax--cols: 1fr; --ax--cols-md: repeat(2, 1fr); --ax--cols-xl: repeat(4, 1fr);
           --ax--cols-large: 1fr; --ax--gap: var(--ax-space-3)">
```

| Variable | Applies |
|---|---|
| `--ax--KEY` | Always (base). |
| `--ax--KEY-sm` … `-2xl` | From that breakpoint up; unset ones fall back to the next smaller one. |
| `--ax--KEY-large` | When the reader picks 150% text or more: reflow for readers, not just for screens. |
| `--ax--KEY-hover` | On hover (`fg`, `bg`, `bd`, `shadow`, `opacity`). |

How it stays efficient and safe:

- The breakpoint chain resolves once per element into `--ax--KEY-now`; the property, large-text and hover rules each read it. About 0.8 KB per key, and per-page builds include only the keys a page uses.
- Every variable is registered with `@property … { inherits: false }`, so a parent's value never leaks into a child.
- Unset everywhere, the class falls back to `revert-layer`, as if it were absent (on an `ax-grid-wrapper` it keeps the grid's own padding).
- Every rule has one declaration.

Keys: `p px py pt pr pb pl m mx my mt mb gap w h min-w max-w min-h display flow wrap items justify basis grow order cols rows span text leading weight align fg bg bd radius shadow opacity` (class `ax--KEY`).

## Atomic, Facebook style

The core is an atomic engine in the style of Meta's StyleX. You write styles as objects; every property/value/condition compiles to **one class with one declaration**, named by a stable hash. The same declaration anywhere reuses the same class, so the stylesheet stops growing as the site grows. Merging is done in JavaScript, not by specificity: the last style wins per property.

```js
import {create, classes} from 'a11y-atomic/atomic';
import {vars} from 'a11y-atomic/vars';

const s = create({
  card: {
    padding: vars.space[6],
    borderRadius: vars.radius.lg,
    backgroundColor: {default: vars.color.surface, ':hover': vars.color['surface-2']},
    flexDirection: {default: 'row', '@large-text': 'column'},   // our own field
    outline: {':focus-within': `${vars.a11y.focusWidth} solid ${vars.color.focus}`},
  },
  active: {backgroundColor: vars.color.primary, color: vars.color['on-primary']},
});

el.className = classes(s.card, isActive && s.active);  // active's background wins
```

Compiles to rules like:

```css
.ax_1k2j3 { padding: var(--ax-space-6); }
.ax_9a8b7:hover { background-color: var(--ax-color-surface-2); }
:root:is([data-ax-text="150"], [data-ax-text="175"], [data-ax-text="200"]) .ax_4d5e6 { flex-direction: column; }
```

| Rule | Behaviour |
|---|---|
| One declaration per class | Enforced by a test over every generated rule. |
| Conditions | `default`, any pseudo-class (`:hover`, `:focus-visible`, `:has(:checked)`), `@media` / `@supports` / `@container`, and our own: `@sm` `@md` `@lg` `@xl` `@2xl` `@dark` `@contrast-more` `@motion-safe` `@motion-reduce` `@large-text` `@text-spacing` `@forced-colors` `@print`. Conditions nest. |
| Pseudo-elements | `'::after': {content: '""', left: {default: '0', ':checked': '1rem'}}`. |
| Merging | `classes(a, b, cond && c)`: last wins per property; a later shorthand (`padding`) removes earlier longhands (`paddingTop`); falsy values are skipped. |
| Order | Shorthands before longhands, base before pseudo-classes before at-rules, smaller breakpoints before larger. |
| Values | Strings; use `vars.*` so every widget mode still applies. |
| Development | `inject()` writes every registered rule into a `<style>` in `@layer atomic`, so styles created in the page work without a rebuild (the demo's "Atomic engine" section uses it and lists each class with its rule). Use the built CSS in production. |
| Build | `npx a11y-atomic --content "_site/**/*.html" --styles "src/**/*.styles.js"` imports your style modules and emits their rules in the `atomic` layer. Style modules must be importable in Node (no DOM at import time). |

The widget is built with this engine (`src/widget.styles.js`), and so is an atomic version of the grid (`src/grid.styles.js`).

### Is it atomic?

| Part | Atomic? |
|---|---|
| What pages ship (compiled build) | Yes: every framework class becomes `ax_` classes with one declaration each, tested on the demo. |
| Atomic engine, the widget and the atomic grid | Yes: one declaration per class, every rule tested. |
| Readable utilities while authoring (1,359) | 1,287 set one property; compiled, all of them ship as one-declaration classes. 72 set two or more, exactly as Tailwind does (`ax-text-lg` = size + line height, `ax-rounded-t-lg`, `ax-size-6`, `ax-transition`, `ax-sr-only`, `ax-truncate`, `ax-stretched-link`). Use the engine when you need strict atomic. |
| Grid (`ax-grid-*`) | No: component classes from `grid.css`, with standard names. `grid.styles.js` is its strict atomic twin. |
| Variable utilities (`ax--KEY`) | Yes: one declaration per rule. |

## Quick start

Load the compiled CSS. Load the init script before the first paint. Then load `src/auto.js` as an ES module.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <link rel="stylesheet" href="./dist/a11y-atomic.css">
    <script src="./dist/a11y-init.js"></script>
    <script type="module" src="./src/auto.js"></script>
  </head>
  <body>
    <main>
      <h1>Page title</h1>
    </main>
  </body>
</html>
```

The init script applies saved settings before the first paint. Put it in `<head>`. Do not add `defer` or `async`.

Use either `src/auto.js` or a manual mount. Do not use both.

```html
<script type="module">
  import { mount } from "./src/widget.js";

  mount({ position: "bottom-left" });
</script>
```

## How it works

Utility classes read framework variables.

```css
:root {
  --ax-spacing: 0.25rem;
  --ax-a11y-text-scale: 1;
  --ax-color-muted: #4a5360;
}

.p-4 {
  padding: calc(var(--ax-spacing) * 4);
}

.text-muted {
  color: var(--ax-color-muted);
}

html {
  font-size: calc(100% * var(--ax-a11y-text-scale));
}
```

A widget mode changes the variable. The utility class does not change.

```css
[data-ax-text="150"] {
  --ax-a11y-text-scale: 1.5;
}
```

Rem-based type and spacing scale with the root font size. Grid measurements can scale in the same way.

## Tailwind compatibility

Class names and variants use Tailwind syntax.

```html
<div class="ax-grid ax-grid-cols-3 ax-gap-4 ax-p-4 lg:ax-col-span-2 hover:ax-bg-primary dark:ax-bg-primary motion-reduce:ax-transition-none">
  <a class="ax-sr-only focus:ax-not-sr-only">Skip to content</a>
</div>
```

The tokens, breakpoints, and accessibility behavior are specific to `a11y-atomic`.

### Differences from Tailwind

| Area | `a11y-atomic` behavior |
|---|---|
| Spacing | Uses Tailwind v4 spacing. `--ax-spacing` is `0.25rem`. `ax-p-4` equals `calc(var(--ax-spacing) * 4)`. |
| Colors | Uses semantic tokens only. Examples are `ax-text-muted`, `ax-bg-surface`, `ax-border-border`, and `ax-text-on-primary`. Color pairs are contrast-tested in four themes. There is no fixed color palette. |
| Breakpoints | Uses `sm` at 640px, `md` at 768px, `lg` at 1024px, `xl` at 1268px, and `2xl` at 1440px. The `lg`, `xl`, and `2xl` values match the andrewrico `grid.css` breakpoints. |
| Reader variants | Adds `large-text:` for text scales of 150% or more and `text-spacing:` for the text spacing mode. |
| Preference variants | `dark:`, `contrast-more:`, `motion-safe:`, and `motion-reduce:` follow an explicit widget choice first. If the widget leaves the choice automatic, they follow the operating system. |
| Durations | Multiply their duration by `--ax-a11y-motion`. The widget can set that variable to zero. |
| Letter spacing | `ax-tracking-*` never reduces the letter spacing set by the widget. |
| Target sizes | `ax-min-h-target`, `ax-min-w-target`, and `ax-size-target` use the widget target size. It ranges from 24px to 44px. |
| Focus ring | `ax-outline-focus-ring` uses the widget focus width, offset, and focus color. |
| Arbitrary values | Does not support values such as `p-[13px]`. Override a token or use a CSS variable instead. |
| Build model | Does not use a JIT compiler. It scans content for class names. |

### Breakpoints

| Variant | Minimum width |
|---|---:|
| `sm:` | 640px |
| `md:` | 768px |
| `lg:` | 1024px |
| `xl:` | 1268px |
| `2xl:` | 1440px |

## Cascade layers

The framework uses these layers:

```css
@layer theme, base, components, atomic, utilities, a11y;
```

| Layer | Contents |
|---|---|
| `theme` | Design tokens and theme variables. |
| `base` | Base element styles. |
| `components` | `grid.css`. |
| `atomic` | Rules generated by `create()`: the widget, the atomic grid, your style modules. |
| `utilities` | Tailwind-compatible classes. |
| `a11y` | Widget mode overrides. |

The precedence is:

1. Atomic styles beat `grid.css`; Tailwind utilities beat both, so a class can still override a component.
2. Unlayered author CSS beats layered utilities.
3. Reader choices in the `a11y` layer beat everything. They use `!important`.

## Accessibility modes

The widget stores only non-default settings. It removes an attribute when its value is the default.

| Attribute | Values | Effect | Related WCAG criterion |
|---|---|---|---|
| `data-ax-text` | `100` (default), `115`, `130`, `150`, `175`, `200` | Scales the root font size. Rem-based type, spacing, and the grid scale with it. | 1.4.4 Resize Text |
| `data-ax-theme` | `auto` (default), `light`, `dark` | Selects the system, light, or dark theme. `auto` follows `prefers-color-scheme`. | 1.4.3 Contrast (Minimum); 1.4.11 Non-text Contrast |
| `data-ax-contrast` | `auto` (default), `normal`, `high` | Selects the standard or high-contrast palette. `auto` follows the operating system contrast preference. | 1.4.3 Contrast (Minimum); 1.4.6 Contrast (Enhanced); 1.4.11 Non-text Contrast |
| `data-ax-font` | `default` (default), `readable`, `dyslexic` | Changes the body font. Readable and dyslexic stacks include local fallbacks. | 1.4.8 Visual Presentation (related) |
| `data-ax-saturation` | `normal` (default), `low`, `gray` | Applies full, low, or grayscale saturation to site content. The widget is excluded. | 1.4.1 Use of Color (related) |
| `data-ax-motion` | `auto` (default), `reduce`, `allow` | `reduce` stops animation and transitions. `auto` follows `prefers-reduced-motion`. `allow` overrides that operating system preference. | 2.2.2 Pause, Stop, Hide; 2.3.3 Animation from Interactions |
| `data-ax-spacing` | `off` (default), `on` | Sets a 1.8 line height, 0.12em letter spacing, 0.16em word spacing, and 2em paragraph spacing. | 1.4.12 Text Spacing |
| `data-ax-align` | `off` (default), `left` | Aligns headings and common text blocks to the left. | 1.4.8 Visual Presentation (related) |
| `data-ax-links` | `off` (default), `ax-underline` | Underlines links and gives them a contrasting highlight. Widget links are excluded. | 1.4.1 Use of Color (related) |
| `data-ax-focus` | `off` (default), `strong` | Increases the focus outline to 5px with a 3px offset. | 2.4.7 Focus Visible; 2.4.13 Focus Appearance |
| `data-ax-target` | `off` (default), `large` | Sets most interactive targets to at least 44 by 44 pixels. Checkboxes and radio buttons become 1.5rem square. | 2.5.8 Target Size (Minimum); 2.5.5 Target Size (Enhanced) |
| `data-ax-cursor` | `off` (default), `large` | Uses a custom 48 by 48 pixel cursor. | No direct success criterion; related motor-accessibility support |

Forced-colors mode is handled separately through the `forced-colors: active` media query.

The full criterion-by-criterion table is in [WCAG.md](WCAG.md).

## Tied to W3C WAI

WCAG changes over time (2.1 added 17 criteria, 2.2 added 9 and made 4.1.1 Parsing obsolete). The framework is checked against W3C's published data, not a hand-copied list.

| Piece | What it does |
|---|---|
| `wcag/snapshot.json` | Every success criterion from W3C's official [wcag.json](https://www.w3.org/WAI/WCAG22/wcag.json): number, name, level, versions, obsolete flag, fetch date and checksum. |
| `src/wcag-map.mjs` | Classifies every Level A and AA criterion (and the AAA ones the framework helps with) as `framework` (met by the framework itself), `supports` (the framework gives the tool, the author applies it) or `author` (outside CSS). Each `framework` claim names the test that proves it. |
| Widget settings | Each setting in `SETTINGS` lists the criteria it serves (`wcag: ['1.4.4']`). |
| `npm run wcag:sync` | Downloads W3C's current data, lists added, changed and removed criteria, and exits with an error if anything changed. `-- --write` updates the snapshot. It also reports when axe-core, the rule engine used in the browser check, has a newer release. |
| `test/wcag.test.js` | Fails when a current A/AA criterion is unclassified, when the map or a setting points at an unknown or obsolete criterion, or when `WCAG.md` is stale. |
| `npm run wcag:report` | Regenerates [WCAG.md](WCAG.md) with links to W3C's Understanding documents. |
| `.github/workflows/wcag-sync.yml` | Runs the sync and the tests every Monday, so a W3C change fails the build until it is handled. |

Current coverage of Level A and AA: 7 met by the framework, 12 supported, 36 author responsibility. Most criteria are about content and behaviour, which no CSS framework can meet on its own.

When W3C publishes a change:

1. `npm run wcag:sync -- --write`
2. `npm test` shows which criteria need attention.
3. Classify them in `src/wcag-map.mjs`, update the framework if needed, then `npm run wcag:report`.

WCAG 3 is still a W3C draft. Point `WCAG_SOURCE` at a newer W3C data file when one is published as a Recommendation.

## Tokens

The token definitions are in `src/tokens.mjs`.

- `--ax-a11y-*` contains the text scale, line height, letter spacing, word spacing, paragraph spacing, body and monospace fonts, focus width and offset, minimum target size, and motion multiplier.
- `--ax-spacing` is the base spacing unit. It is `0.25rem`.
- `--ax-space-*` follows the spacing scale (a dot becomes an underscore, so `0.5` is `--ax-space-0_5`): `0`, `px`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3.5`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `14`, `16`, `20`, `24`, `28`, `32`, `36`, `40`, `44`, `48`, `52`, `56`, `60`, `64`, `72`, `80`, and `96`.
- `--ax-text-*` contains type sizes and line heights from `xs` through `9xl`.
- `--ax-radius-*` contains border radii from `none` through `full`.
- `--ax-shadow-*` contains shadows from `2xs` through `2xl`, plus `inner` and `none`.
- `--ax-duration-fast`, `--ax-duration-base`, and `--ax-duration-slow` are named component durations. Each one already includes `--ax-a11y-motion`.
- `--ax-ease-*` contains `linear`, `in`, `out`, `in-out`, and `spring`.
- `--ax-space-fluid-*` contains fluid spacing from `2xs` through `3xl`.
- `--ax-color-*` contains semantic colors used by the four themes: `light`, `dark`, `high-light`, and `high-dark`.

The color tokens are `bg`, `surface`, `surface-2`, `text`, `muted`, `primary`, `primary-hover`, `on-primary`, `link`, `ax-border`, `focus`, `danger`, `success`, `warning`, `highlight`, and `on-highlight`.

Tested text pairs meet 4.5:1 contrast. High-contrast text pairs meet 7:1. Tested border, focus, and primary colors meet 3:1.

All token families can be overridden with CSS.

## Utilities

`scripts/build.mjs` is the source of truth for utility names.

The main groups are:

- Layout utilities for display, position, flexbox, grid, order, and alignment.
- Spacing utilities for padding, margin, and gap.
- Sizing utilities for width, height, minimum size, maximum size, and target size.
- Typography utilities for font size, weight, style, alignment, line height, tracking, decoration, and wrapping.
- Semantic color utilities for text, background, border, outline, fill, stroke, accent, and caret colors.
- Border, radius, shadow, opacity, transition, duration, delay, easing, and transform utilities.
- Interaction utilities for cursor, pointer events, selection, appearance, and resizing.
- Accessibility utilities such as `ax-sr-only`, `ax-not-sr-only`, and `ax-outline-focus-ring`.

State variants include `hover:`, `focus:`, `focus-visible:`, `focus-within:`, `active:`, `disabled:`, `group-hover:`, and `group-focus-within:`.

## Grid

`src/grid.css` is the andrewrico Eleventy file, byte for byte. The build renames its classes and variables to the naming standard (`grid__wrapper` → `ax-grid-wrapper`, `--column-desktop` → `--ax-grid-column-desktop`); values and structure are untouched, and a test checks that.

It provides:

- `ax-grid-section`
- `ax-grid-wrapper`
- `ax-grid-column`
- `ax-grid-row`
- `ax-grid-title`
- `--ax-grid-column-mobile`
- `--ax-grid-column-table`
- `--ax-grid-column-laptop`
- `--ax-grid-column-desktop`

The grid is already efficient. It has one rule per breakpoint. Each rule reads a variable and uses earlier breakpoint values as fallbacks.

Tailwind utilities override the grid on the same element because utilities are in a later layer.

### Atomic grid

`src/grid.styles.js` is the same grid as strict atomic styles: same variables (`--ax-grid-column-mobile`, `--ax-grid-column-table`, `--ax-grid-column-laptop`, `--ax-grid-column-desktop`, `--ax-grid-gap`, `--ax-grid-padding`...), same values, same breakpoints. A browser test renders both side by side and compares computed styles at 390, 1024, 1100, 1300 and 1500px.

```js
import {grid} from 'a11y-atomic/grid';
import {classes} from 'a11y-atomic/atomic';
wrapper.className = classes(grid.wrapper);       // = ax-grid-wrapper
next.className = classes(grid.wrapper, grid.wrapperNext); // = .ax-grid-wrapper + .ax-grid-wrapper
```

Two things the conversion found in `grid.css` (kept as-is so behaviour is identical): sections set `padding-top`/`padding-bottom` and then `padding` overrides both, so `--ax-grid-padding-top`/`--ax-grid-padding-bottom` never apply; and `.ax-grid-row` computes `padding-bottom: calc(var(--ax-grid-gap) * 2px)`, which is invalid (length × length), so rows get no bottom padding.

```html
<section class="ax-grid-section">
  <h2 class="ax-grid-title">Title</h2>

  <div class="ax-grid-wrapper lg:ax-grid-cols-2 xl:ax-grid-cols-3 2xl:ax-grid-cols-4 ax-gap-4">
    <div class="ax-grid-row">Introduction</div>
    <div class="ax-grid-column">One</div>
    <div class="ax-grid-column">Two</div>
  </div>
</section>
```

Order utilities work with the grid.

```html
<div class="ax-grid-column ax-order-first lg:ax-order-none">
  Content
</div>
```

Use span utilities for grid placement.

```html
<div class="ax-grid-column ax-col-span-full lg:ax-col-span-2">
  Content
</div>
```

The mobile grid has one column. A span above 1 on that grid creates extra tracks. Use breakpoint spans when the span should apply only at wider sizes.

## The best idea from each framework

| Framework | Idea used in `a11y-atomic` |
|---|---|
| Tailwind | Class syntax, variants, spacing scale, and cascade layers. |
| Bootstrap | `ax-stretched-link` makes the whole card clickable. The focus ring is drawn around the card. The parent needs `ax-relative`. |
| Every Layout | The switcher uses two class sets. The parent uses `ax-flex ax-flex-wrap`. Children use `ax-grow ax-basis-switch`. The threshold is `--ax-switch-at`, with a default of `30rem`. It uses rem, so larger text stacks sooner. |
| Utopia | Fluid space tokens run from `--ax-space-fluid-2xs` to `--ax-space-fluid-3xl`. Classes include `ax-p-fluid-m`, `ax-px-fluid-*`, `ax-py-fluid-*`, `ax-pt-fluid-*`, `ax-pb-fluid-*`, `ax-m-fluid-*`, `ax-my-fluid-*`, `ax-mt-fluid-*`, `ax-mb-fluid-*`, and `ax-gap-fluid-*`. Fluid spacing grows from 320px to 1440px. |
| Open Props | `ax-ease-spring` uses a `linear()` easing curve. The framework also provides `ax-ease-linear`, `ax-ease-in`, `ax-ease-out`, and `ax-ease-in-out`. |
| Material Design | State layers use `hover:ax-wash-8`, `focus-visible:ax-wash-12`, and `active:ax-wash-16`. Each layer uses a `currentColor` overlay, so it works on any background. |
| Pico CSS | Native controls are themed. `ax-accent-primary` applies the primary accent color. Each theme sets `color-scheme`. The framework provides a styled base instead of a stripped reset. |

## Only what the page loads

Each page gets a shared core plus only its own classes:

| Part | What | Size (demo page) |
|---|---|---|
| `a11y-core.css` | Layer order, tokens and themes, base, widget modes. Same on every page, so the browser caches it once. | 14 KB |
| Inline `<style data-ax-page>` in `<head>` | Only the Tailwind classes, atomic classes and grid rules found in **this page's** HTML. `grid.css` is left out when the page does not use the grid. | 15 KB (incl. four variable utilities) |
| Widget / JS-rendered atomic styles | Injected at runtime, only for classes actually rendered, and only if the page CSS does not already have them (checked before the widget paints, so no flash). | — |

Compared with the 555 KB full bundle. A browser test serves the demo this way and checks every element's computed styles match the full bundle (desktop, mobile, and high contrast at 200% text).

```sh
npx a11y-atomic --pages "_site/**/*.html" --core css/a11y-core.css --styles "src/**/*.styles.js"
```

Rewrites each built page in place (removes any full-bundle `<link>`, adds the core link and the page's `<style>`; safe to run twice). Eleventy does it per page as it writes:

```js
eleventyConfig.addPlugin(a11yAtomic, {perPage: true, core: 'css/a11y-core.css', styles: ['src/**/*.styles.js']});
```

Node API: `buildCore()`, `buildPage(html)`, `inlinePage(html, css, coreHref)`, `buildPages(globs, options)`. In the browser, `inject()` keeps one `<style>` in step with the atomic classes the page has used (`inject(document, {all: true})` for every registered rule).

## Web components and shadow DOM

Shadow DOM blocks document stylesheets; CSS variables still inherit through it. `a11y-atomic/shadow` closes the gap:

```js
import {AtomicElement, adopt} from 'a11y-atomic/shadow';
import {create, classes} from 'a11y-atomic/atomic';
import {vars} from 'a11y-atomic/vars';

const s = create({card: {padding: vars.space[6], flexDirection: {default: 'row', '@large-text': 'column'}}});

customElements.define('my-card', class extends AtomicElement {
  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.innerHTML = `<div class="${classes(s.card)}"><slot></slot></div>`;
  }
});

// An existing component: adopt(this.shadowRoot)  ·  extra CSS: adopt(root, {css: await buildPage(template)})
```

| Piece | How |
|---|---|
| One shared sheet | `adopt()` attaches a single constructable stylesheet to every shadow root: base essentials, the widget modes, and the atomic rules in use (updated as new classes are used). |
| Modes inside shadows | Document selectors are rewritten for the host (`:root[data-ax-theme="dark"] .x` → `:host([data-ax-theme="dark"]) .x`), and each host mirrors `<html>`'s `data-ax-*` attributes, so it works in every browser without `:host-context()`. |
| Tokens and text size | Inherit through the boundary on their own (variables and `rem`). |
| Saturation | Not repeated inside shadows: the page-level filter already covers them. |
| The widget | `mount({shadow: true})` renders the widget in its own shadow root, isolated from site CSS. Outside-click detection uses `composedPath()`. |

The browser check styles a real custom element and verifies atomic classes, tokens, `@large-text`, text spacing, dark theme, highlighted links and attribute removal inside the shadow root, plus the shadow-mounted widget (open, set a mode, outside click, Escape, axe).

## Ways to connect

### CSS

Load the full or minified stylesheet.

```html
<link rel="stylesheet" href="./dist/a11y-atomic.css">
```

```html
<link rel="stylesheet" href="./dist/a11y-atomic.min.css">
```

Load the init script in `<head>` if saved widget settings should apply before the first paint.

```html
<script src="./dist/a11y-init.js"></script>
```

The init script can be inlined. It must not use `defer` or `async`.

### npm exports

| Export | Contents |
|---|---|
| `a11y-atomic` | Full CSS. |
| `a11y-atomic/min` | Minified CSS. |
| `a11y-atomic/init` | The init script. |
| `a11y-atomic/widget` | The widget and its state helpers. |
| `a11y-atomic/widget.min` | The widget bundled and minified (9.9 KB gzipped). |
| `a11y-atomic/atomic` | The atomic engine: `create`, `props`, `classes`, `inject`. |
| `a11y-atomic/shadow` | `adopt`, `AtomicElement` for web components. |
| `a11y-atomic/core` | The shared core CSS for per-page builds. |
| `a11y-atomic/vars` | Token references for style objects. |
| `a11y-atomic/grid` | The atomic grid styles. |
| `a11y-atomic/auto` | The automatic widget entry point. |
| `a11y-atomic/tokens` | Token definitions. |
| `a11y-atomic/build` | The build API, including `build` and `minify`. |
| `a11y-atomic/eleventy` | The Eleventy plugin. |

CSS imports from JavaScript need a bundler that handles CSS (Vite, esbuild, webpack).

```js
import "a11y-atomic";
import "a11y-atomic/min";
import { mount } from "a11y-atomic/widget";
import "a11y-atomic/auto";
import { build, minify } from "a11y-atomic/build";
import a11yAtomic from "a11y-atomic/eleventy";
```

### Command line

Build CSS from scanned content.

```sh
npx a11y-atomic --content "_site/**/*.html,src/**/*.js" --out css/site.css
```

The content option accepts comma-separated file patterns. The content build writes minified CSS.

The package also provides the `npm run build:site` script.

Scan JavaScript files that build class strings. This includes `src/widget.js`.

### Node API

```js
import { build, minify } from "a11y-atomic/build";

const css = await build({
  content: [
    "_site/**/*.html",
    "src/**/*.js",
  ],
});

const minifiedCss = minify(css);
```

### Eleventy plugin

```js
import a11yAtomic from "a11y-atomic/eleventy";

eleventyConfig.addPlugin(a11yAtomic, {
  out: "css/a11y-atomic.css",
});
```

The plugin scans the built HTML after each build.

### Widget

Load the automatic entry point.

```html
<script type="module" src="./src/auto.js"></script>
```

Or mount the widget manually.

```js
import { mount } from "./src/widget.js";

const widget = mount();
```

Use one method, not both.

### Manual attributes

Set `data-ax-*` attributes directly on `<html>`.

```html
<html lang="en" data-ax-text="150" data-ax-theme="dark">
```

### CSS variable overrides

Override framework variables in CSS.

```css
:root {
  --ax-spacing: 0.3rem;
  --ax-a11y-target-min: 44px;
}
```

A variable can also be scoped to one element.

```css
.card {
  --ax-spacing: 0.2rem;
}
```

## Performance

The measured full bundle is 555 KB raw and about 60 KB gzipped (minified): 1,359 utilities, 37 variable utilities and the atomic layer, built in about 35 ms. Use it for prototyping. On the real andrewrico site (628 pages) the per-page build ran in about 2 seconds, with 2.3 KB inline per page on average plus the shared core.

The demo page produces about 41 KB of content-scanned CSS (one file for the whole site, scanned from its pages).

The browser test confirms that the content-scanned CSS and the full bundle produce identical computed styles on desktop and mobile.

## Widget JavaScript API

### `mount(options)`

Mounts the widget and returns its control object.

| Option | Type | Default | Description |
|---|---|---|---|
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Places the widget at the bottom of the page. |
| `shortcut` | `boolean` | `true` | Enables `Alt+Shift+A` to open or close the widget. Set it to `false` to disable the shortcut. |
| `storage` | Storage-like object | `localStorage` | Stores non-default settings. |
| `root` | Element | `document.documentElement` | Receives the `data-ax-*` attributes. |
| `ax-container` | Element | `document.body` | Receives the widget element. |
| `title` | `string` | `"Accessibility"` | Sets the visible and accessible widget title. |
| `document` | Document | Current document | Selects the document used by the widget. |

```js
import { mount } from "a11y-atomic/widget";

const widget = mount({
  position: "bottom-left",
  shortcut: true,
  title: "Site accessibility",
});

console.log(widget.state);
```

### Returned object

- `element`: The widget root element.
- `open()`: Opens the panel and moves focus to its heading.
- `close(returnFocus = true)`: Closes the panel. It returns focus to the toggle by default.
- `reset()`: Restores every setting to its default.
- `set(key, value)`: Changes one setting and applies it.
- `state`: A copy of the current settings.
- `destroy()`: Removes the widget and its document-level event listeners.

### Change event

The widget dispatches an `ax:change` event after a setting changes. It also dispatches the event when a setting is set through the API or all settings are reset.

The event bubbles. Its `detail` property contains the current state.

```js
const widget = mount();

widget.element.addEventListener("ax:change", event => {
  console.log(event.detail);
});
```

### State exports

The module also exports helpers that do not mount the widget:

- `sanitize(input)`: Keeps known keys and allowed values. It fills missing or invalid values with defaults.
- `applySettings(root, input)`: Sanitizes a state, updates the `data-ax-*` attributes on `root`, and returns the state.
- `loadState(storage)`: Loads and sanitizes the saved state.
- `saveState(storage, state)`: Stores only non-default values. It returns `false` when storage is unavailable.
- `SETTINGS`: The setting definitions and allowed options.
- `STORAGE_KEY`: The storage key, `"a11y-atomic"`.

```js
import {
  SETTINGS,
  STORAGE_KEY,
  applySettings,
  loadState,
  sanitize,
  saveState,
} from "a11y-atomic/widget";
```

## Development

Node.js 22 or later is required.

```sh
npm test
npm run test:browser
npm run check
npm run dev
```

`npm test` runs the unit tests: contrast of every token pair in all themes, Tailwind class names and values, variants, layers, the content scan, the Eleventy plugin, the widget state helpers and the WCAG mapping.

`npm run test:browser` runs 89 Chromium checks: axe-core (WCAG 2.2 A/AA) in 6 theme and mode states with the widget open, keyboard flow, persistence, reflow at 320px with 200% text, grid columns per breakpoint, `large-text:` and the switcher at 200% text, the stretched link, OS preference fallbacks, identical computed styles between the content-scanned CSS and the full bundle, the atomic grid against `grid.css` at five widths, per-page builds against the full bundle, web components / shadow DOM, variable utilities (breakpoints, large text, hover, no inheritance, `revert-layer` fallback), and the compiled demo (inline and shared-stylesheet) against the readable source in four modes.

`npm run check` runs both test commands. `npm run wcag:sync` checks for W3C rule changes.

The development server runs at:

```text
http://127.0.0.1:8094
```

## Limits

The widget changes presentation and stores user preferences. It does not make a site WCAG-conformant.

The content scanner finds complete class-name tokens. Scan every file that contains class strings, including JavaScript files.

Custom CSS and token overrides can still affect contrast, spacing, and focus visibility.

Authors must provide semantic HTML, useful alt text, visible labels, correct heading order, keyboard support, and a logical focus order.

Test pages with browser accessibility tools and assistive technology. Include real users in testing when possible.

## License

Released under the [MIT License](LICENSE).

