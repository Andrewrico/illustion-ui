# a11y-atomic

`a11y-atomic` is an atomic CSS framework. It uses Tailwind-compatible class names and variant syntax. Accessibility values are stored in CSS variables. The widget changes those variables and sets `data-a11y-*` attributes on `<html>`.

When a setting is automatic, the operating system preference is used.

The framework is tied to the W3C WAI rules: every feature maps to WCAG 2.2 success criteria, checked against W3C's own data, and a sync script reports when W3C changes them. See [Tied to W3C WAI](#tied-to-w3c-wai) and [WCAG.md](WCAG.md).

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
  --spacing: 0.25rem;
  --a11y-text-scale: 1;
  --color-muted: #4a5360;
}

.p-4 {
  padding: calc(var(--spacing) * 4);
}

.text-muted {
  color: var(--color-muted);
}

html {
  font-size: calc(100% * var(--a11y-text-scale));
}
```

A widget mode changes the variable. The utility class does not change.

```css
[data-a11y-text="150"] {
  --a11y-text-scale: 1.5;
}
```

Rem-based type and spacing scale with the root font size. Grid measurements can scale in the same way.

## Tailwind compatibility

Class names and variants use Tailwind syntax.

```html
<div class="grid grid-cols-3 gap-4 p-4 lg:col-span-2 hover:bg-primary dark:bg-primary motion-reduce:transition-none">
  <a class="sr-only focus:not-sr-only">Skip to content</a>
</div>
```

The tokens, breakpoints, and accessibility behavior are specific to `a11y-atomic`.

### Differences from Tailwind

| Area | `a11y-atomic` behavior |
|---|---|
| Spacing | Uses Tailwind v4 spacing. `--spacing` is `0.25rem`. `p-4` equals `calc(var(--spacing) * 4)`. |
| Colors | Uses semantic tokens only. Examples are `text-muted`, `bg-surface`, `border-border`, and `text-on-primary`. Color pairs are contrast-tested in four themes. There is no fixed color palette. |
| Breakpoints | Uses `sm` at 640px, `md` at 768px, `lg` at 1024px, `xl` at 1268px, and `2xl` at 1440px. The `lg`, `xl`, and `2xl` values match the andrewrico `grid.css` breakpoints. |
| Reader variants | Adds `large-text:` for text scales of 150% or more and `text-spacing:` for the text spacing mode. |
| Preference variants | `dark:`, `contrast-more:`, `motion-safe:`, and `motion-reduce:` follow an explicit widget choice first. If the widget leaves the choice automatic, they follow the operating system. |
| Durations | Multiply their duration by `--a11y-motion`. The widget can set that variable to zero. |
| Letter spacing | `tracking-*` never reduces the letter spacing set by the widget. |
| Target sizes | `min-h-target`, `min-w-target`, and `size-target` use the widget target size. It ranges from 24px to 44px. |
| Focus ring | `outline-focus-ring` uses the widget focus width, offset, and focus color. |
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
@layer theme, base, components, utilities, a11y;
```

| Layer | Contents |
|---|---|
| `theme` | Design tokens and theme variables. |
| `base` | Base element styles. |
| `components` | `grid.css` and the widget styles. |
| `utilities` | Atomic utility classes. |
| `a11y` | Widget mode overrides. |

The precedence is:

1. Utilities beat `grid.css` and the widget component styles.
2. Unlayered author CSS beats layered utilities.
3. Reader choices in the `a11y` layer beat everything. They use `!important`.

## Accessibility modes

The widget stores only non-default settings. It removes an attribute when its value is the default.

| Attribute | Values | Effect | Related WCAG criterion |
|---|---|---|---|
| `data-a11y-text` | `100` (default), `115`, `130`, `150`, `175`, `200` | Scales the root font size. Rem-based type, spacing, and the grid scale with it. | 1.4.4 Resize Text |
| `data-a11y-theme` | `auto` (default), `light`, `dark` | Selects the system, light, or dark theme. `auto` follows `prefers-color-scheme`. | 1.4.3 Contrast (Minimum); 1.4.11 Non-text Contrast |
| `data-a11y-contrast` | `auto` (default), `normal`, `high` | Selects the standard or high-contrast palette. `auto` follows the operating system contrast preference. | 1.4.3 Contrast (Minimum); 1.4.6 Contrast (Enhanced); 1.4.11 Non-text Contrast |
| `data-a11y-font` | `default` (default), `readable`, `dyslexic` | Changes the body font. Readable and dyslexic stacks include local fallbacks. | 1.4.8 Visual Presentation (related) |
| `data-a11y-saturation` | `normal` (default), `low`, `gray` | Applies full, low, or grayscale saturation to site content. The widget is excluded. | 1.4.1 Use of Color (related) |
| `data-a11y-motion` | `auto` (default), `reduce`, `allow` | `reduce` stops animation and transitions. `auto` follows `prefers-reduced-motion`. `allow` overrides that operating system preference. | 2.2.2 Pause, Stop, Hide; 2.3.3 Animation from Interactions |
| `data-a11y-spacing` | `off` (default), `on` | Sets a 1.8 line height, 0.12em letter spacing, 0.16em word spacing, and 2em paragraph spacing. | 1.4.12 Text Spacing |
| `data-a11y-align` | `off` (default), `left` | Aligns headings and common text blocks to the left. | 1.4.8 Visual Presentation (related) |
| `data-a11y-links` | `off` (default), `underline` | Underlines links and gives them a contrasting highlight. Widget links are excluded. | 1.4.1 Use of Color (related) |
| `data-a11y-focus` | `off` (default), `strong` | Increases the focus outline to 5px with a 3px offset. | 2.4.7 Focus Visible; 2.4.13 Focus Appearance |
| `data-a11y-target` | `off` (default), `large` | Sets most interactive targets to at least 44 by 44 pixels. Checkboxes and radio buttons become 1.5rem square. | 2.5.8 Target Size (Minimum); 2.5.5 Target Size (Enhanced) |
| `data-a11y-cursor` | `off` (default), `large` | Uses a custom 48 by 48 pixel cursor. | No direct success criterion; related motor-accessibility support |

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

- `--a11y-*` contains the text scale, line height, letter spacing, word spacing, paragraph spacing, body and monospace fonts, focus width and offset, minimum target size, and motion multiplier.
- `--spacing` is the base spacing unit. It is `0.25rem`.
- `--space-*` follows the spacing scale (a dot becomes an underscore, so `0.5` is `--space-0_5`): `0`, `px`, `0.5`, `1`, `1.5`, `2`, `2.5`, `3`, `3.5`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `14`, `16`, `20`, `24`, `28`, `32`, `36`, `40`, `44`, `48`, `52`, `56`, `60`, `64`, `72`, `80`, and `96`.
- `--text-*` contains type sizes and line heights from `xs` through `9xl`.
- `--radius-*` contains border radii from `none` through `full`.
- `--shadow-*` contains shadows from `2xs` through `2xl`, plus `inner` and `none`.
- `--duration-fast`, `--duration-base`, and `--duration-slow` are named component durations. Each one already includes `--a11y-motion`.
- `--ease-*` contains `linear`, `in`, `out`, `in-out`, and `spring`.
- `--space-fluid-*` contains fluid spacing from `2xs` through `3xl`.
- `--color-*` contains semantic colors used by the four themes: `light`, `dark`, `high-light`, and `high-dark`.

The color tokens are `bg`, `surface`, `surface-2`, `text`, `muted`, `primary`, `primary-hover`, `on-primary`, `link`, `border`, `focus`, `danger`, `success`, `warning`, `highlight`, and `on-highlight`.

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
- Accessibility utilities such as `sr-only`, `not-sr-only`, and `outline-focus-ring`.

State variants include `hover:`, `focus:`, `focus-visible:`, `focus-within:`, `active:`, `disabled:`, `group-hover:`, and `group-focus-within:`.

## Grid

`src/grid.css` comes from the andrewrico Eleventy site. It ships unchanged in the `components` layer.

It provides:

- `grid__section`
- `grid__wrapper`
- `grid__column`
- `grid__row`
- `grid__title`
- `--column-mobile`
- `--column-table`
- `--column-laptop`
- `--column-desktop`

The grid is already efficient. It has one rule per breakpoint. Each rule reads a variable and uses earlier breakpoint values as fallbacks.

Tailwind utilities override the grid on the same element because utilities are in a later layer.

```html
<section class="grid__section">
  <h2 class="grid__title">Title</h2>

  <div class="grid__wrapper lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
    <div class="grid__row">Introduction</div>
    <div class="grid__column">One</div>
    <div class="grid__column">Two</div>
  </div>
</section>
```

Order utilities work with the grid.

```html
<div class="grid__column order-first lg:order-none">
  Content
</div>
```

Use span utilities for grid placement.

```html
<div class="grid__column col-span-full lg:col-span-2">
  Content
</div>
```

The mobile grid has one column. A span above 1 on that grid creates extra tracks. Use breakpoint spans when the span should apply only at wider sizes.

## The best idea from each framework

| Framework | Idea used in `a11y-atomic` |
|---|---|
| Tailwind | Class syntax, variants, spacing scale, and cascade layers. |
| Bootstrap | `stretched-link` makes the whole card clickable. The focus ring is drawn around the card. The parent needs `relative`. |
| Every Layout | The switcher uses two class sets. The parent uses `flex flex-wrap`. Children use `grow basis-switch`. The threshold is `--switch-at`, with a default of `30rem`. It uses rem, so larger text stacks sooner. |
| Utopia | Fluid space tokens run from `--space-fluid-2xs` to `--space-fluid-3xl`. Classes include `p-fluid-m`, `px-fluid-*`, `py-fluid-*`, `pt-fluid-*`, `pb-fluid-*`, `m-fluid-*`, `my-fluid-*`, `mt-fluid-*`, `mb-fluid-*`, and `gap-fluid-*`. Fluid spacing grows from 320px to 1440px. |
| Open Props | `ease-spring` uses a `linear()` easing curve. The framework also provides `ease-linear`, `ease-in`, `ease-out`, and `ease-in-out`. |
| Material Design | State layers use `hover:wash-8`, `focus-visible:wash-12`, and `active:wash-16`. Each layer uses a `currentColor` overlay, so it works on any background. |
| Pico CSS | Native controls are themed. `accent-primary` applies the primary accent color. Each theme sets `color-scheme`. The framework provides a styled base instead of a stripped reset. |

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

Set `data-a11y-*` attributes directly on `<html>`.

```html
<html lang="en" data-a11y-text="150" data-a11y-theme="dark">
```

### CSS variable overrides

Override framework variables in CSS.

```css
:root {
  --spacing: 0.3rem;
  --a11y-target-min: 44px;
}
```

A variable can also be scoped to one element.

```css
.card {
  --spacing: 0.2rem;
}
```

## Performance

The measured full bundle is 463 KB raw and 55 KB gzipped (minified). It contains 1,359 utilities and builds in about 30 ms. Use it for prototyping.

The demo page produces 26 KB of content-scanned CSS. Its build takes about 15 ms.

The browser test confirms that the content-scanned CSS and the full bundle produce identical computed styles on desktop and mobile.

## Widget JavaScript API

### `mount(options)`

Mounts the widget and returns its control object.

| Option | Type | Default | Description |
|---|---|---|---|
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | Places the widget at the bottom of the page. |
| `shortcut` | `boolean` | `true` | Enables `Alt+Shift+A` to open or close the widget. Set it to `false` to disable the shortcut. |
| `storage` | Storage-like object | `localStorage` | Stores non-default settings. |
| `root` | Element | `document.documentElement` | Receives the `data-a11y-*` attributes. |
| `container` | Element | `document.body` | Receives the widget element. |
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

The widget dispatches an `a11y:change` event after a setting changes. It also dispatches the event when a setting is set through the API or all settings are reset.

The event bubbles. Its `detail` property contains the current state.

```js
const widget = mount();

widget.element.addEventListener("a11y:change", event => {
  console.log(event.detail);
});
```

### State exports

The module also exports helpers that do not mount the widget:

- `sanitize(input)`: Keeps known keys and allowed values. It fills missing or invalid values with defaults.
- `applySettings(root, input)`: Sanitizes a state, updates the `data-a11y-*` attributes on `root`, and returns the state.
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

`npm run test:browser` runs 42 Chromium checks: axe-core (WCAG 2.2 A/AA) in 6 theme and mode states with the widget open, keyboard flow, persistence, reflow at 320px with 200% text, grid columns per breakpoint, `large-text:` and the switcher at 200% text, the stretched link, OS preference fallbacks, and identical computed styles between the content-scanned CSS and the full bundle.

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

