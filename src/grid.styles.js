// andrewrico grid.css, rebuilt as atomic styles: same variables, same values,
// same breakpoints. scripts/browser-check.mjs proves both render identically.
//
//   el.className = classes(grid.wrapper)          // = class="grid__wrapper"
//   style="--column-desktop: repeat(4, 1fr)"       // same variable API as grid.css
//
// Two notes from the conversion, kept as-is so behaviour is identical:
//  - grid.css sets padding-top/padding-bottom on sections, then `padding`
//    overrides both, so --padding-top / --padding-bottom never apply.
//  - .grid__row computes padding-bottom as calc(var(--gap) * 2px), which is
//    invalid (length × length), so rows get no bottom padding.
import {create} from './atomic.js';

const tablet = '@media only screen and (min-width: 1024px)';
const desktop = '@media only screen and (min-width: 1440px)';

export const grid = create({
  section: {
    background: 'var(--background)',
    overflow: 'var(--overflow)',
    padding: 'var(--padding)',
    '--padding-bottom': '1rem',
    '--padding-top': '1rem',
    '--padding': {default: '2rem 0', '@media (min-width:1024px)': '2rem 0', '@media (min-width:1440px)': '4rem 0'},
    '--background': 'transparent',
    '--overflow': 'hidden',
    '--min-height': {[tablet]: '65vh'},
  },
  title: {
    textAlign: 'var(--text-align)',
    padding: 'var(--padding)',
    '--padding': {default: '0px .5rem', [tablet]: '0px .8rem', [desktop]: '0px 2rem'},
    '--text-align': 'center',
  },
  wrapper: {
    display: 'grid',
    margin: 'var(--margin)',
    padding: 'var(--padding)',
    gridGap: 'var(--gap, 1rem)',
    maxWidth: 'var(--max-width, 100%)',
    width: 'var(--width, 100%)',
    gridTemplateColumns: {
      default: 'var(--column-mobile, var(--column-count))',
      '@media only screen and (min-width: 1024px) and (max-width: 1268px)': 'var(--column-table, var(--column-count))',
      '@media only screen and (min-width: 1268px) and (max-width: 1440px)': 'var(--column-laptop, var(--column-count, var(--column-table)))',
      [desktop]: 'var(--column-desktop, var(--column-count, var(--column-laptop, var(--column-table))))',
    },
    '--width': '100%',
    '--max-width': '100%',
    '--gap': '1rem',
    '--column-mobile': '1fr',
    '--padding': {default: '0px .5rem', [tablet]: '0px .8rem', [desktop]: '0px 2rem'},
    '--margin': '0 auto',
  },
  // grid.css: `.grid__wrapper + .grid__wrapper` — atomic styles have no sibling
  // selectors, so add this to a wrapper that follows another wrapper.
  wrapperNext: {paddingTop: 'var(--gap)'},
  row: {
    '--padding-bottom': '2px',
    gridColumn: '1 / -1',
    paddingBottom: 'calc(var(--gap) * var(--padding-bottom))',
  },
  column: {
    display: 'flex',
    alignItems: 'var(--align-items)',
    justifyContent: 'var(--justify-content)',
    flexDirection: 'var(--flow)',
    gap: 'var(--gap)',
    padding: 'var(--padding)',
    margin: 'var(--margin)',
    order: {'@media only screen and (max-width: 1024px)': 'var(--mobile-column-first)'},
    '--flow': 'column',
    '--align-items': 'unset',
    '--justify-content': 'unset',
    '--gap': '0',
    '--margin': '0',
    '--padding': '0 0.2rem',
    '--mobile-column-first': {'@media only screen and (max-width: 1024px)': 'unset'},
  },
});
