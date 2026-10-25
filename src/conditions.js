// Conditions shared by the Tailwind-style variants (build.mjs) and the atomic
// engine (atomic.js). Each context = [selector prefix, media query]; pseudo is
// appended to the class. Widget-aware ones follow the widget first, then the OS.
import * as tokens from './tokens.mjs';

const bp = Object.entries(tokens.breakpoints);
export const VARIANTS = {
  hover: {pseudo: ':hover', ctx: [['', '(hover: hover)']]},
  focus: {pseudo: ':focus', ctx: [['']]},
  'focus-visible': {pseudo: ':focus-visible', ctx: [['']]},
  'focus-within': {pseudo: ':focus-within', ctx: [['']]},
  active: {pseudo: ':active', ctx: [['']]},
  disabled: {pseudo: ':disabled', ctx: [['']]},
  'group-hover': {ctx: [['.group:hover ', '(hover: hover)']]},
  'group-focus-within': {ctx: [['.group:focus-within ']]},
  // Our own field: variants follow the widget AND the OS, like the tokens do.
  dark: {ctx: [[':root[data-a11y-theme="dark"] '], [':root:not([data-a11y-theme="light"]) ', '(prefers-color-scheme: dark)']]},
  'contrast-more': {ctx: [[':root[data-a11y-contrast="high"] '], [':root:not([data-a11y-contrast="normal"]) ', '(prefers-contrast: more)']]},
  'motion-safe': {ctx: [[':root[data-a11y-motion="allow"] '], [':root:not([data-a11y-motion="reduce"]) ', '(prefers-reduced-motion: no-preference)']]},
  'motion-reduce': {ctx: [[':root[data-a11y-motion="reduce"] '], [':root:not([data-a11y-motion="allow"]) ', '(prefers-reduced-motion: reduce)']]},
  'large-text': {ctx: [[':root:is([data-a11y-text="150"], [data-a11y-text="175"], [data-a11y-text="200"]) ']]},
  'text-spacing': {ctx: [[':root[data-a11y-spacing="on"] ']]},
  'forced-colors': {ctx: [['', '(forced-colors: active)']]},
  print: {ctx: [['', 'print']]},
  ...Object.fromEntries(bp.map(([name, min]) => [name, {ctx: [['', `(min-width: ${min})`]]}])),
};
