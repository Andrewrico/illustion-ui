// How Illustion UI relates to every WCAG success criterion at Level A and AA
// (plus the AAA criteria it helps with). Checked against wcag/snapshot.json,
// which scripts/wcag-sync.mjs refreshes from W3C — when W3C adds or changes a
// criterion, test/wcag.test.js fails until it is classified here.
//
// status:
//   framework — met by the framework's own CSS, tokens or widget for any page that uses them
//   supports  — the framework provides the tool or default; the author must apply it
//   author    — outside what CSS can do (content, media, behaviour); the author's job
// verify: test files that prove a "framework" claim.

export const WCAG_VERSION = '2.2';

export const map = {
  '1.1.1': {status: 'supports', how: 'ax-sr-only for text alternatives of icons; the widget button has a visually hidden name and an aria-hidden icon. Alt text is the author\'s job.'},
  '1.2.1': {status: 'author', how: 'Media alternatives are content.'},
  '1.2.2': {status: 'author', how: 'Captions are content.'},
  '1.2.3': {status: 'author', how: 'Audio description is content.'},
  '1.2.4': {status: 'author', how: 'Live captions are content.'},
  '1.2.5': {status: 'author', how: 'Audio description is content.'},
  '1.3.1': {status: 'author', how: 'Use semantic HTML. The widget uses fieldset/legend, labels and native inputs.'},
  '1.3.2': {status: 'author', how: 'ax-order-* and flex/grid reverse change visual order only; keep DOM order meaningful.'},
  '1.3.3': {status: 'author', how: 'Instructions must not rely on shape, size or position alone.'},
  '1.3.4': {status: 'framework', how: 'Nothing in the framework locks orientation; every layout reflows.', verify: ['scripts/browser-check.mjs']},
  '1.3.5': {status: 'author', how: 'Add autocomplete attributes to inputs.'},
  '1.4.1': {status: 'supports', how: 'Links are underlined by default; the "Highlight links" mode underlines and highlights every link.'},
  '1.4.2': {status: 'author', how: 'Audio control is behaviour.'},
  '1.4.3': {status: 'framework', how: 'Every text/background token pair is at least 4.5:1 in all four themes.', verify: ['test/contrast.test.js', 'scripts/browser-check.mjs']},
  '1.4.4': {status: 'framework', how: 'All sizes are rem; the text size mode scales the root to 200% without loss of content.', verify: ['scripts/browser-check.mjs']},
  '1.4.5': {status: 'author', how: 'Use real text instead of images of text.'},
  '1.4.10': {status: 'supports', how: 'The grid is one column on mobile, ax-basis-switch stacks by available space, large-text: variants and --ax--KEY-large variables. Avoid fixed widths. The demo is checked at 320px with 200% text.', verify: ['scripts/browser-check.mjs']},
  '1.4.11': {status: 'framework', how: 'Border, focus and primary tokens are at least 3:1 against backgrounds in all themes.', verify: ['test/contrast.test.js']},
  '1.4.12': {status: 'framework', how: 'The text spacing mode applies the exact 1.4.12 values; ax-tracking-* never goes below the reader\'s letter spacing.', verify: ['scripts/browser-check.mjs', 'test/build.test.js']},
  '1.4.13': {status: 'author', how: 'Hover/focus content must be dismissible, hoverable and persistent. The widget panel closes with Escape.'},
  '2.1.1': {status: 'supports', how: 'The widget is fully keyboard operable (native radios and switches). Page content is the author\'s job.', verify: ['scripts/browser-check.mjs']},
  '2.1.2': {status: 'supports', how: 'The widget is non-modal and never traps focus; Escape returns focus to its button.', verify: ['scripts/browser-check.mjs']},
  '2.1.4': {status: 'framework', how: 'The widget shortcut needs modifier keys (Alt+Shift+A) and can be turned off with mount({shortcut: false}).', verify: ['scripts/browser-check.mjs']},
  '2.2.1': {status: 'author', how: 'Time limits are behaviour.'},
  '2.2.2': {status: 'supports', how: 'The animations mode and prefers-reduced-motion stop CSS animation and transitions; durations multiply by --ax-a11y-motion. JS-driven motion is the author\'s job.', verify: ['scripts/browser-check.mjs']},
  '2.3.1': {status: 'author', how: 'Do not add flashing content.'},
  '2.4.1': {status: 'supports', how: 'Skip link recipe: ax-sr-only focus:ax-not-sr-only focus:ax-absolute.'},
  '2.4.2': {status: 'author', how: 'Give each page a descriptive <title>.'},
  '2.4.3': {status: 'author', how: 'Keep DOM order logical; the widget moves focus into its panel and back.'},
  '2.4.4': {status: 'author', how: 'Write descriptive link text. ax-stretched-link keeps the link text as the accessible name.'},
  '2.4.5': {status: 'author', how: 'Provide more than one way to find pages.'},
  '2.4.6': {status: 'author', how: 'Write descriptive headings and labels.'},
  '2.4.7': {status: 'framework', how: 'A :focus-visible outline in the focus token (3:1 or better) is on by default; ax-outline-focus-ring and the strong focus mode build on it.', verify: ['test/contrast.test.js']},
  '2.4.11': {status: 'supports', how: 'scroll-padding keeps focused elements clear of the fixed widget button; sticky headers are the author\'s job.'},
  '2.5.1': {status: 'author', how: 'Nothing in the framework needs multipoint or path gestures.'},
  '2.5.2': {status: 'author', how: 'Pointer behaviour is JS; the widget uses native click events.'},
  '2.5.3': {status: 'author', how: 'Visible labels must be part of the accessible name; the widget\'s are.'},
  '2.5.4': {status: 'author', how: 'Nothing in the framework uses device motion.'},
  '2.5.7': {status: 'author', how: 'Nothing in the framework needs dragging.'},
  '2.5.8': {status: 'supports', how: 'ax-min-h-target / ax-min-w-target / ax-size-target give 24px by default and follow the larger click targets mode; widget controls meet it.'},
  '3.1.1': {status: 'author', how: 'Set <html lang>.'},
  '3.1.2': {status: 'author', how: 'Mark language changes with lang.'},
  '3.2.1': {status: 'author', how: 'Do not change context on focus; the widget does not.'},
  '3.2.2': {status: 'author', how: 'Widget settings change presentation only, not context.'},
  '3.2.3': {status: 'author', how: 'Keep navigation consistent.'},
  '3.2.4': {status: 'author', how: 'Identify the same functions the same way.'},
  '3.2.6': {status: 'supports', how: 'The widget sits in the same corner on every page; contact/help placement is the author\'s job.'},
  '3.3.1': {status: 'author', how: 'Identify errors in text (ax-text-danger is contrast-tested for it).'},
  '3.3.2': {status: 'author', how: 'Provide labels or instructions.'},
  '3.3.3': {status: 'author', how: 'Suggest corrections.'},
  '3.3.4': {status: 'author', how: 'Let users review or reverse submissions.'},
  '3.3.7': {status: 'author', how: 'Do not ask for the same information twice.'},
  '3.3.8': {status: 'author', how: 'Do not require cognitive tests to sign in.'},
  '4.1.2': {status: 'supports', how: 'The widget uses native inputs, role="switch" and aria-expanded; axe checks it in every theme. Custom controls are the author\'s job.', verify: ['scripts/browser-check.mjs']},
  '4.1.3': {status: 'supports', how: 'The widget announces every change in a polite live region.', verify: ['scripts/browser-check.mjs']},
  // AAA criteria the framework helps with
  '1.4.6': {status: 'framework', how: 'Both high-contrast themes are at least 7:1 for text.', verify: ['test/contrast.test.js']},
  '1.4.8': {status: 'supports', how: 'Readable/dyslexia fonts, align-left mode, ax-max-w-prose / ax-max-w-measure line length, theme choice.'},
  '2.3.3': {status: 'framework', how: 'Interaction animation can be turned off in the widget or by the OS setting.', verify: ['scripts/browser-check.mjs']},
  '2.4.13': {status: 'supports', how: 'The strong focus mode draws a 5px outline with a 3px offset and a background halo.'},
  '2.5.5': {status: 'supports', how: 'The larger click targets mode raises --ax-a11y-target-min to 44px.'},
};

export const STATUS = ['framework', 'supports', 'author'];
