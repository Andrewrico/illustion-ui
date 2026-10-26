// Widget styles as atomic objects (one property per class). State that CSS
// used to read from descendants (open, position) is applied from JS instead;
// checked/focus state uses :has()/:checked on the element itself.
import {create} from './atomic.js';
import {vars} from './vars.js';

const {color, space, radius, shadow, text, duration} = vars;
const focusRing = `${vars.a11y.focusWidth} solid ${color.focus}`;
const target = `max(2.25rem, ${vars.a11y.targetMin})`;

export const styles = create({
  root: {
    position: 'fixed', bottom: space[4], right: space[4], zIndex: '2147483000',
    fontFamily: vars.a11y.fontBody, color: color.text,
  },
  rootLeft: {right: 'auto', left: space[4]},

  toggle: {
    display: 'grid', placeItems: 'center',
    width: 'clamp(44px, 3.25rem, 64px)', height: 'clamp(44px, 3.25rem, 64px)',
    borderWidth: '2px', borderStyle: 'solid', borderColor: color['on-primary'], borderRadius: radius.full,
    backgroundColor: {default: color.primary, ':hover': color['primary-hover']},
    color: color['on-primary'], boxShadow: shadow.lg, cursor: 'pointer',
    transitionProperty: 'transform, background-color', transitionDuration: duration.fast,
    transform: {':hover': `scale(calc(1 + 0.06 * ${vars.a11y.motion}))`},
  },
  toggleOpen: {backgroundColor: color['primary-hover']},

  panel: {
    position: 'absolute', bottom: `calc(100% + ${space[3]})`, right: '0',
    width: `min(22rem, calc(100vw - 2 * ${space[4]}))`, maxHeight: 'min(40rem, calc(100dvh - 6rem))',
    overflowY: 'auto', overscrollBehavior: 'contain', padding: space[4],
    backgroundColor: color.bg, borderWidth: '2px', borderStyle: 'solid', borderColor: color.border,
    borderRadius: radius.lg, boxShadow: shadow.lg,
  },
  panelLeft: {right: 'auto', left: '0'},

  header: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[2], marginBottom: space[3]},
  // The heading only receives programmatic focus on open; it is not a control.
  title: {margin: '0', minWidth: '0', fontSize: `min(${text.xl}, 28px)`, lineHeight: '1.3', overflowWrap: 'anywhere', outline: {':focus': 'none'}},

  button: {
    display: 'inline-grid', placeItems: 'center', paddingBlock: space[1], paddingInline: space[3],
    borderWidth: '2px', borderStyle: 'solid', borderColor: color.border, borderRadius: radius.md,
    backgroundColor: {default: color.surface, ':hover': color['surface-2']}, color: color.text, cursor: 'pointer',
  },
  close: {flexShrink: '0', width: 'clamp(44px, 2.75rem, 56px)', height: 'clamp(44px, 2.75rem, 56px)', paddingBlock: '0', paddingInline: '0', fontSize: text['2xl'], lineHeight: '1'},
  reset: {width: '100%', fontWeight: '600'},

  form: {display: 'grid', gap: space[3]},
  group: {margin: '0', padding: '0', borderWidth: '0', minWidth: '0'},
  legend: {padding: '0', marginBottom: space[2], fontWeight: '600'},
  options: {display: 'flex', flexWrap: 'wrap', gap: space[2]},

  // A radio option is the pill itself; the native radio covers it invisibly.
  option: {
    position: 'relative', display: 'inline-flex', alignItems: 'center', minHeight: target,
    paddingBlock: space[1], paddingInline: space[3], fontSize: text.sm, cursor: 'pointer',
    borderWidth: '2px', borderStyle: 'solid', borderRadius: radius.full,
    borderColor: {default: color.border, ':has(:checked)': color.primary},
    backgroundColor: {default: color.surface, ':has(:checked)': color.primary},
    color: {default: color.text, ':has(:checked)': color['on-primary']},
    fontWeight: {default: '400', ':has(:checked)': '600'},
    outline: {':has(:focus-visible)': focusRing},
    outlineOffset: {':has(:focus-visible)': vars.a11y.focusOffset},
    forcedColorAdjust: {'@forced-colors': 'none'},
    '::before': {content: {default: 'none', ':has(:checked)': '"✓\\00a0"'}},
  },
  optionInput: {position: 'absolute', inset: '0', width: '100%', height: '100%', margin: '0', opacity: '0', cursor: 'pointer'},

  switchRow: {display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: space[3], minHeight: target, cursor: 'pointer'},
  switch: {
    appearance: 'none', flexShrink: '0', position: 'relative', width: '3rem', height: '1.75rem', margin: '0',
    borderWidth: '2px', borderStyle: 'solid', borderRadius: radius.full, cursor: 'pointer',
    borderColor: {default: color.border, ':checked': color.primary},
    backgroundColor: {default: color['surface-2'], ':checked': color.primary},
    transitionProperty: 'background-color', transitionDuration: duration.fast,
    forcedColorAdjust: {'@forced-colors': 'none'},
    '::after': {
      content: '""', position: 'absolute', top: '50%', width: '1.1rem', height: '1.1rem', borderRadius: '50%',
      left: {default: '0.2rem', ':checked': 'calc(100% - 1.3rem)'},
      backgroundColor: {default: color.text, ':checked': color['on-primary']},
      transform: 'translateY(-50%)', transitionProperty: 'left', transitionDuration: duration.fast,
    },
  },

  footer: {marginTop: space[4], paddingTop: space[3], borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: color.border},

  srOnly: {
    position: 'absolute', width: '1px', height: '1px', padding: '0', margin: '-1px',
    overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: '0',
  },
});
