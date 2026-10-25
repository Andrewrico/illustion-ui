// The naming standard. Everything the framework owns starts with PREFIX:
//   utilities        ax-p-4, lg:ax-grid-cols-3, hover:ax-bg-primary
//   variable utils   ax-p + --ax-p / --ax-p-lg / --ax-p-large
//   generated atomic ax_1k2j3
//   grid             ax-grid-section/-title/-wrapper/-row/-column, --ax-grid-*
//   tokens           --ax-color-text, --ax-spacing, --ax-a11y-motion
//   widget settings  data-ax-text="150" on <html>; hooks .ax-widget, data-ax-part
// (Hand-written CSS in src/*.css uses the literal "ax"; build.test.js checks it.)
export const PREFIX = 'ax';

// andrewrico grid.css → standard names. src/grid.css itself stays byte-for-byte.
export const GRID_CLASSES = {
  'grid__section': 'grid-section', 'eleventify-section': 'grid-section', 'grid__title': 'grid-title',
  'grid__wrapper': 'grid-wrapper', 'grid__row': 'grid-row', 'grid__column': 'grid-column',
};
export const GRID_VARS = ['padding-bottom', 'padding-top', 'padding', 'background', 'overflow', 'text-align', 'margin', 'gap',
  'max-width', 'width', 'column-mobile', 'column-count', 'column-table', 'column-laptop', 'column-desktop', 'flow',
  'align-items', 'justify-content', 'mobile-column-first', 'min-height'];

const gridVarRx = new RegExp(`--(${[...GRID_VARS].sort((a, b) => b.length - a.length).join('|')})(?![\\w-])`, 'g');

/** Rename the grid's classes and variables to the standard; values and structure are untouched. */
export function standardizeGrid(css) {
  let out = css;
  for (const [from, to] of Object.entries(GRID_CLASSES)) out = out.replace(new RegExp(`\\.${from}(?![\\w-])`, 'g'), `.${PREFIX}-${to}`);
  out = out.replace(gridVarRx, `--${PREFIX}-grid-$1`);
  return out.replace(new RegExp(`(\\.${PREFIX}-grid-section),\\s*\\.${PREFIX}-grid-section(?![\\w-])`, 'g'), '$1');
}
export const gridVar = name => `--${PREFIX}-grid-${name}`;
