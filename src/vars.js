// Token references for style objects: vars.color.text → 'var(--ax-color-text)'.
// Values stay CSS variables, so every accessibility mode still applies.
import {themes, spaceSteps, text, radius, shadow, duration, ease, fluid, a11y} from './tokens.mjs';

const refs = (names, prefix) => Object.fromEntries(names.map(n => [n, `var(--ax-${prefix}${n})`]));

export const vars = {
  color: refs(Object.keys(themes.light), 'color-'),
  space: Object.fromEntries(spaceSteps.map(s => [s, `var(--ax-space-${s.replace('.', '_')})`])),
  fluid: refs(Object.keys(fluid), 'space-fluid-'),
  text: refs(Object.keys(text), 'text-'),
  radius: Object.fromEntries(Object.keys(radius).map(k => [k, k === 'DEFAULT' ? 'var(--ax-radius)' : `var(--ax-radius-${k})`])),
  shadow: Object.fromEntries(Object.keys(shadow).map(k => [k, k === 'DEFAULT' ? 'var(--ax-shadow)' : `var(--ax-shadow-${k})`])),
  duration: refs(Object.keys(duration), 'duration-'),
  ease: refs(Object.keys(ease), 'ease-'),
  a11y: Object.fromEntries(Object.keys(a11y).map(k => [k.replace(/^a11y-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase()), `var(--ax-${k})`])),
  measure: 'var(--ax-measure)',
};
