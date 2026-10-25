// Single source of truth for design tokens. scripts/build.mjs turns these into CSS
// variables; test/contrast.test.js checks every colour pair against WCAG 2.2.

// Values the accessibility widget changes (via data-a11y-* on <html>).
export const a11y = {
  'a11y-text-scale': '1',
  'a11y-line-height': '1.5',
  'a11y-letter-spacing': '0em',
  'a11y-word-spacing': '0em',
  'a11y-paragraph-spacing': '1em',
  'a11y-font-body': 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  'a11y-font-mono': 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  'a11y-focus-width': '3px',
  'a11y-focus-offset': '2px',
  'a11y-target-min': '24px',
  'a11y-motion': '1',
};

// Everything below is in rem, so the widget's text scale (applied to the root
// font size) scales type, spacing and the grid together, like text-only zoom.
export const space = {
  0: '0', px: '1px', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem', 5: '1.25rem',
  6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem', 16: '4rem', 20: '5rem', 24: '6rem',
};

export const text = {
  xs: ['0.75rem', '1.6'], sm: ['0.875rem', '1.55'], base: ['1rem', 'var(--a11y-line-height)'],
  lg: ['1.125rem', 'var(--a11y-line-height)'], xl: ['1.25rem', '1.45'], '2xl': ['1.5rem', '1.35'],
  '3xl': ['1.875rem', '1.25'], '4xl': ['clamp(2rem, 1.4rem + 2.4vw, 2.75rem)', '1.15'],
  '5xl': ['clamp(2.5rem, 1.6rem + 3.6vw, 3.75rem)', '1.1'],
};

export const radius = { none: '0', sm: '0.25rem', md: '0.5rem', lg: '1rem', full: '9999px' };

export const shadow = {
  sm: '0 1px 2px rgb(0 0 0 / 0.12)',
  md: '0 4px 12px rgb(0 0 0 / 0.14)',
  lg: '0 12px 32px rgb(0 0 0 / 0.18)',
};

export const duration = { fast: '150ms', base: '250ms', slow: '400ms' };

// Colour themes. Pairs that must meet contrast are listed in `pairs` below.
export const themes = {
  light: {
    bg: '#ffffff', surface: '#f3f5f8', 'surface-2': '#e6eaf0',
    text: '#16191d', muted: '#4a5360',
    primary: '#0b57d0', 'primary-hover': '#0842a0', 'on-primary': '#ffffff',
    link: '#0b57d0', border: '#6b7480', focus: '#9a3412',
    danger: '#b3261e', success: '#1e6b33', warning: '#7a4a00',
    highlight: '#fff1a8', 'on-highlight': '#16191d',
  },
  dark: {
    bg: '#111316', surface: '#1b1e23', 'surface-2': '#262a31',
    text: '#eef1f4', muted: '#b6bfcc',
    primary: '#8ab4f8', 'primary-hover': '#aecbfa', 'on-primary': '#0a1a33',
    link: '#8ab4f8', border: '#8b94a1', focus: '#ffb454',
    danger: '#ff8b80', success: '#7fdc9c', warning: '#ffcf70',
    highlight: '#5c4b00', 'on-highlight': '#fff8d6',
  },
  'high-light': {
    bg: '#ffffff', surface: '#ffffff', 'surface-2': '#f0f0f0',
    text: '#000000', muted: '#1f1f1f',
    primary: '#00008b', 'primary-hover': '#000060', 'on-primary': '#ffffff',
    link: '#00008b', border: '#000000', focus: '#c00000',
    danger: '#8b0000', success: '#004d00', warning: '#5a3600',
    highlight: '#ffff00', 'on-highlight': '#000000',
  },
  'high-dark': {
    bg: '#000000', surface: '#000000', 'surface-2': '#141414',
    text: '#ffffff', muted: '#e8e8e8',
    primary: '#ffff00', 'primary-hover': '#ffff80', 'on-primary': '#000000',
    link: '#ffff00', border: '#ffffff', focus: '#00ffff',
    danger: '#ff9c9c', success: '#8cff8c', warning: '#ffd966',
    highlight: '#ffff00', 'on-highlight': '#000000',
  },
};

// [foreground, background, minimum ratio]. 4.5 = WCAG 1.4.3 text, 3 = 1.4.11 non-text.
// High-contrast themes are held to 7 (1.4.6 AAA) for text.
export const pairs = [
  ['text', 'bg', 4.5, 7], ['text', 'surface', 4.5, 7], ['text', 'surface-2', 4.5, 7],
  ['muted', 'bg', 4.5, 7], ['muted', 'surface', 4.5, 7],
  ['link', 'bg', 4.5, 7], ['link', 'surface', 4.5, 7],
  ['on-primary', 'primary', 4.5, 7], ['on-primary', 'primary-hover', 4.5, 7],
  ['danger', 'bg', 4.5, 7], ['success', 'bg', 4.5, 7], ['warning', 'bg', 4.5, 7],
  ['on-highlight', 'highlight', 4.5, 7],
  ['border', 'bg', 3, 3], ['border', 'surface', 3, 3],
  ['focus', 'bg', 3, 3], ['focus', 'surface', 3, 3], ['primary', 'bg', 3, 3],
];
