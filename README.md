# a11y-atomic

`a11y-atomic` is an atomic CSS framework in which every utility reads CSS variables. Its accessibility widget sets `data-a11y-*` attributes on `<html>`. The modes behind those attributes change shared variables, so type, spacing, color, motion, and other styles adapt across the site. OS preferences are honoured when the related mode is set to `auto` or left at its default.

## How it works

```css
/* Tokens are variables… */
:root { --a11y-text-scale: 1; --space-4: 1rem; --color-text: #16191d; }
/* …atomic classes only read them… */
.p-4 { padding: var(--space-4); }
.fg-text { color: var(--color-text); }
/* …and a widget mode only changes them. */
[data-a11y-text="150"] { --a11y-text-scale: 1.5; }
html { font-size: calc(100% * var(--a11y-text-scale)); }
```

One attribute on `<html>` restyles every utility on the page. No extra markup or JavaScript per component. You can theme it the same way: override any token on `:root` or on one element (`style="--space-4: 1.25rem"`).

## Quick start

Load the compiled CSS. Put `dist/a11y-init.js` inline in `<head>`, or load it as a normal blocking script. Do not add `defer` or `async`. The init script applies saved settings before the first paint and avoids a flash.

Load `src/auto.js` as an ES module to mount the widget automatically.

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

Use either `src/auto.js` or a manual mount. Do not use both.

```html
<script type="module">
  import { mount } from "./src/widget.js";

  mount({ position: "bottom-left" });
</script>
```

## Accessibility modes

The widget removes an attribute when its value is the default. The table includes the default and every valid value.

| Attribute | Values | What it does | Related WCAG criterion |
|---|---|---|---|
| `data-a11y-text` | `100` (default), `115`, `130`, `150`, `175`, `200` | Scales the root font size. Rem-based type, spacing, and the grid scale with it. | 1.4.4 Resize Text |
| `data-a11y-theme` | `auto` (default), `light`, `dark` | Selects the system, light, or dark theme. `auto` follows `prefers-color-scheme`. | 1.4.3 Contrast (Minimum); 1.4.11 Non-text Contrast |
| `data-a11y-contrast` | `auto` (default), `normal`, `high` | Selects the standard or high-contrast palette. `auto` follows the OS contrast preference. | 1.4.3 Contrast (Minimum); 1.4.6 Contrast (Enhanced); 1.4.11 Non-text Contrast |
| `data-a11y-font` | `default` (default), `readable`, `dyslexic` | Changes the body font. Readable and dyslexic stacks include local fallbacks. | 1.4.8 Visual Presentation (related) |
| `data-a11y-saturation` | `normal` (default), `low`, `gray` | Applies full, low, or grayscale saturation to site content. The widget is excluded. | 1.4.1 Use of Color (related) |
| `data-a11y-motion` | `auto` (default), `reduce`, `allow` | `reduce` stops animation and transitions. `auto` follows `prefers-reduced-motion`. `allow` overrides that OS preference. | 2.3.3 Animation from Interactions |
| `data-a11y-spacing` | `off` (default), `on` | Sets a 1.8 line height, 0.12em letter spacing, 0.16em word spacing, and 2em paragraph spacing. | 1.4.12 Text Spacing |
| `data-a11y-align` | `off` (default), `left` | Aligns headings and common text blocks to the left. | 1.4.8 Visual Presentation (related) |
| `data-a11y-links` | `off` (default), `underline` | Underlines links and gives them a contrasting highlight. Widget links are excluded. | 1.4.1 Use of Color (related) |
| `data-a11y-focus` | `off` (default), `strong` | Increases the focus outline to 5px with a 3px offset. | 2.4.7 Focus Visible |
| `data-a11y-target` | `off` (default), `large` | Sets most interactive targets to at least 44 by 44 pixels. Checkboxes and radio buttons become 1.5rem square. | 2.5.8 Target Size (Minimum); 2.5.5 Target Size (Enhanced) |
| `data-a11y-cursor` | `off` (default), `large` | Uses a custom 48 by 48 pixel cursor. | No direct success criterion; related motor-accessibility support |

Forced-colors mode is handled separately through the `forced-colors: active` media query.

## Tokens

The framework groups its custom properties into these families:

- `--a11y-*`: text scale, line height, letter spacing, word spacing, paragraph spacing, body and monospace fonts, focus width and offset, minimum target size, and motion multiplier.
- `--space-*`: spacing scale with keys `0`, `px`, `1`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`, `16`, `20`, and `24`.
- `--text-*`: type sizes and line heights for `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl`, `4xl`, and `5xl`.
- `--radius-*`: border radii for `none`, `sm`, `md`, `lg`, and `full`.
- `--shadow-*`: shadows for `sm`, `md`, and `lg`.
- `--duration-*`: durations for `fast`, `base`, and `slow`. Each token is already multiplied by `--a11y-motion`, so anything that uses it stops when motion is reduced.
- `--color-*`: semantic colors used by the four themes: `light`, `dark`, `high-light`, and `high-dark`. All of them are defined in `src/tokens.mjs`, and `test/contrast.test.js` checks every text pair for 4.5:1 (7:1 in the high-contrast themes) and every border and focus color for 3:1.

Color tokens include `bg`, `surface`, `surface-2`, `text`, `muted`, `primary`, `primary-hover`, `on-primary`, `link`, `border`, `focus`, `danger`, `success`, `warning`, `highlight`, and `on-highlight`.

## Grid

The grid layer is `src/grid.css`, copied unchanged from the andrewrico Eleventy site (`eleventy/src/css/grid.css`). The build test fails if the copy drifts. Keep this structure:

```html
<section class="grid__section section-surface">
  <h2 class="grid__title">Title</h2>
  <div class="grid__wrapper cols-t-2 cols-d-3 grid-gap-6">
    <div class="grid__row">Full-width intro</div>
    <div class="grid__column">One</div>
    <div class="grid__column">Two</div>
    <div class="grid__column md:span-2">Spans two columns from 1024px</div>
  </div>
</section>
```

Use these helpers:

- `.cols-N` sets the base number of grid columns.
- `.cols-m-N`, `.cols-t-N`, `.cols-l-N`, and `.cols-d-N` set column counts at a breakpoint.
- `.span-N` makes a grid column span `N` tracks. On the one-column mobile grid a span above 1 adds extra tracks, so use `md:span-N` or `lg:span-N` for layout spans.
- `.span-full` (also `md:` / `lg:`) makes a grid column span the full row.
- `.row-span-N` spans rows.
- `.cols-auto` creates automatic columns. Set `--min-column` to control their minimum width.
- `.grid-gap-N` sets the grid gap.
- `.section-transparent`, `.section-bg`, `.section-surface`, `.section-surface-2` and `.section-primary` set the `.grid__section` background from the color tokens.
- `.mobile-first` moves that column to the top on screens up to 1024px.

| Breakpoint | Range | Prefix |
|---|---:|---|
| Mobile | Below 1024px | `m` |
| Tablet (`--column-table` in grid.css) | 1024px to below 1268px | `t` |
| Laptop | 1268px to below 1440px | `l` |
| Desktop | 1440px and wider | `d` |

Mobile is one column (`--column-mobile: 1fr`) unless you set `.cols-m-N`. From 1024px up, each breakpoint reads its own variable and falls back to `.cols-N`. Desktop falls back further to the laptop and then the tablet value.

```html
<!-- 1 → 2 → 3 → 4 columns -->
<div class="grid__wrapper cols-t-2 cols-l-3 cols-d-4">…</div>
<!-- 4 columns from 1024px, 2 on mobile -->
<div class="grid__wrapper cols-4 cols-m-2">…</div>
```

## Utilities overview

### Layout

- Display utilities control `block`, `inline`, `inline-block`, `flex`, and hidden elements.
- Flex utilities set direction, wrapping, justification, alignment, and flex growth.
- Spacing utilities use `p-*`, `px-*`, `py-*`, `pt-*`, `pr-*`, `pb-*`, and `pl-*` for padding.
- Margin utilities use `m-*`, `mx-*`, `my-*`, `mt-*`, `mr-*`, `mb-*`, and `ml-*`.
- Gap utilities use `gap-*`.

The spacing and gap scale uses these keys:

```text
0 px 1 2 3 4 5 6 8 10 12 16 20 24
```

The `px` scale key means 1 pixel. It is separate from the `px-*` prefix, which means horizontal padding or margin.

### Sizing and type

- Sizing utilities control width, height, minimum size, and maximum size.
- Typography utilities range from `text-xs` through `text-5xl`.
- Text utilities cover size, weight, alignment, line height, and decoration.

### Colors and decoration

- Foreground colors use `fg-<token>`.
- Background colors use `bg-<token>`.
- Border colors use `bd-<token>`.
- Border utilities control width, style, and color.
- Rounded utilities use the `--radius-*` scale.
- Shadow utilities use the `--shadow-*` scale.
- Position utilities cover static, relative, absolute, fixed, and sticky positioning.

### Accessibility primitives

- `sr-only` hides content visually while keeping it available to assistive technology.
- `focus:not-sr-only` reveals hidden content when it receives focus.
- `skip-link` moves a skip link into view when focused.
- `tap-target` applies the minimum interactive target size.
- `focus-ring` applies a visible focus ring.
- `reading` limits text to a readable line length.
- `stack` arranges items vertically with consistent spacing.
- `cluster` arranges items horizontally and allows wrapping.

### Variants

- `md:` applies at 1024px and wider.
- `lg:` applies at 1440px and wider.
- Variants are available for display, flex, spacing, text, and width utilities.
- `hover:` is available for color utilities, `underline`, `no-underline`, `shadow-md` and `shadow-lg`.
- `motion-safe:transition` only animates when the user has not asked for reduced motion.

```html
<div class="block md:flex lg:p-8 hover:bg-surface">
  ...
</div>
```

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
import { mount } from "./src/widget.js";

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

The widget dispatches an `a11y:change` event after a setting changes, a setting is set through the API, or all settings are reset. The event bubbles. Its `detail` property contains the current state.

```js
const widget = mount();

widget.element.addEventListener("a11y:change", (event) => {
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
} from "./src/widget.js";
```

## Development

Node.js 22 or later is required.

```sh
npm test
npm run test:browser
npm run dev
```

`npm test` builds the CSS and runs the Node tests (contrast of every token pair, widget state handling, build output). `npm run test:browser` builds the CSS and runs Chromium checks: axe-core (WCAG 2.2 A/AA plus best practices) in light, dark, high-contrast and all-modes states with the panel open; keyboard flow (open, arrows, Escape, focus return, shortcut); persistence and the pre-paint script; 320px reflow at 200% text; grid column counts per breakpoint; and OS reduced-motion and more-contrast fallbacks. `npm run check` runs both test commands.

The development server runs at:

```text
http://127.0.0.1:8094
```

## Limits

The widget changes presentation and stores user preferences. It does not make a site WCAG-conformant.

Authors must still provide semantic HTML, useful alt text, visible labels, correct heading order, keyboard support, and logical focus order. Test pages with browser accessibility tools and assistive technology. Include real users in testing when possible.

## License

Released under the [MIT License](LICENSE).

