// andrewrico grid.css, rebuilt as atomic styles: same variables, same values,
// same breakpoints. scripts/browser-check.mjs proves both render identically.
//
//   el.className = classes(grid.wrapper)          // = class="ax-grid-wrapper"
//   style="--ax-grid-column-desktop: repeat(4, 1fr)"       // same variable API as grid.css
//
// Two notes from the conversion, kept as-is so behaviour is identical:
//  - grid.css sets padding-top/padding-bottom on sections, then `padding`
//    overrides both, so --ax-grid-padding-top / --ax-grid-padding-bottom never apply.
//  - .ax-grid-row computes padding-bottom as calc(var(--ax-grid-gap) * 2px), which is
//    invalid (length × length), so rows get no bottom padding.
import {create} from './atomic.js';

const tablet = '@media only screen and (min-width: 1024px)';
const desktop = '@media only screen and (min-width: 1440px)';

// Raw definitions (the compiler re-creates them in the components layer).
export const gridStyles = {
  section: {
    background: 'var(--ax-grid-background)',
    overflow: 'var(--ax-grid-overflow)',
    padding: 'var(--ax-grid-padding)',
    '--ax-grid-padding-bottom': '1rem',
    '--ax-grid-padding-top': '1rem',
    '--ax-grid-padding': {default: '2rem 0', '@media (min-width:1024px)': '2rem 0', '@media (min-width:1440px)': '4rem 0'},
    '--ax-grid-background': 'transparent',
    '--ax-grid-overflow': 'hidden',
    '--ax-grid-min-height': {[tablet]: '65vh'},
  },
  title: {
    textAlign: 'var(--ax-text-align)',
    padding: 'var(--ax-grid-padding)',
    '--ax-grid-padding': {default: '0px .5rem', [tablet]: '0px .8rem', [desktop]: '0px 2rem'},
    '--ax-text-align': 'center',
  },
  wrapper: {
    display: 'grid',
    margin: 'var(--ax-grid-margin)',
    padding: 'var(--ax-grid-padding)',
    gridGap: 'var(--ax-grid-gap, 1rem)',
    maxWidth: 'var(--ax-grid-max-width, 100%)',
    width: 'var(--ax-grid-width, 100%)',
    gridTemplateColumns: {
      default: 'var(--ax-grid-column-mobile, var(--ax-grid-column-count))',
      '@media only screen and (min-width: 1024px) and (max-width: 1268px)': 'var(--ax-grid-column-table, var(--ax-grid-column-count))',
      '@media only screen and (min-width: 1268px) and (max-width: 1440px)': 'var(--ax-grid-column-laptop, var(--ax-grid-column-count, var(--ax-grid-column-table)))',
      [desktop]: 'var(--ax-grid-column-desktop, var(--ax-grid-column-count, var(--ax-grid-column-laptop, var(--ax-grid-column-table))))',
    },
    '--ax-grid-width': '100%',
    '--ax-grid-max-width': '100%',
    '--ax-grid-gap': '1rem',
    '--ax-grid-column-mobile': '1fr',
    '--ax-grid-padding': {default: '0px .5rem', [tablet]: '0px .8rem', [desktop]: '0px 2rem'},
    '--ax-grid-margin': '0 auto',
  },
  // grid.css: `.ax-grid-wrapper + .ax-grid-wrapper` — atomic styles have no sibling
  // selectors, so add this to a wrapper that follows another wrapper.
  wrapperNext: {paddingTop: 'var(--ax-grid-gap)'},
  row: {
    '--ax-grid-padding-bottom': '2px',
    gridColumn: '1 / -1',
    paddingBottom: 'calc(var(--ax-grid-gap) * var(--ax-grid-padding-bottom))',
  },
  column: {
    display: 'flex',
    alignItems: 'var(--ax-grid-align-items)',
    justifyContent: 'var(--ax-grid-justify-content)',
    flexDirection: 'var(--ax-grid-flow)',
    gap: 'var(--ax-grid-gap)',
    padding: 'var(--ax-grid-padding)',
    margin: 'var(--ax-grid-margin)',
    order: {'@media only screen and (max-width: 1024px)': 'var(--ax-grid-mobile-column-first)'},
    '--ax-grid-flow': 'column',
    '--ax-grid-align-items': 'unset',
    '--ax-grid-justify-content': 'unset',
    '--ax-grid-gap': '0',
    '--ax-grid-margin': '0',
    '--ax-grid-padding': '0 0.2rem',
    '--ax-grid-mobile-column-first': {'@media only screen and (max-width: 1024px)': 'unset'},
  },
};

export const grid = create(gridStyles);
