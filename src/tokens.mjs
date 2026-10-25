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

// Tailwind-compatible scales, on our own variables. Everything is in rem, so the
// widget's text scale (applied to the root font size) scales type, spacing and
// layout together, like text-only zoom.

// p-4 = calc(var(--spacing) * 4) = 1rem, exactly like Tailwind v4.
export const spacing = '0.25rem';
export const spaceSteps = ['0', 'px', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '52', '56', '60', '64', '72', '80', '96'];

// [font-size, line-height]. Base and lg use the widget-controlled line height.
export const text = {
  xs: ['0.75rem', '1.334'], sm: ['0.875rem', '1.43'], base: ['1rem', 'var(--a11y-line-height)'],
  lg: ['1.125rem', 'max(1.556, var(--a11y-line-height))'], xl: ['1.25rem', '1.4'], '2xl': ['1.5rem', '1.334'],
  '3xl': ['1.875rem', '1.2'], '4xl': ['2.25rem', '1.112'], '5xl': ['3rem', '1'], '6xl': ['3.75rem', '1'],
  '7xl': ['4.5rem', '1'], '8xl': ['6rem', '1'], '9xl': ['8rem', '1'],
};

export const radius = {
  none: '0', xs: '0.125rem', sm: '0.25rem', DEFAULT: '0.25rem', md: '0.375rem', lg: '0.5rem',
  xl: '0.75rem', '2xl': '1rem', '3xl': '1.5rem', full: '9999px',
};

export const shadow = {
  '2xs': '0 1px rgb(0 0 0 / 0.05)', xs: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  sm: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)', inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)', none: '0 0 #0000',
};

// Named durations for components; duration-* utilities use milliseconds like Tailwind.
// Both are multiplied by --a11y-motion, so "Stop animations" zeroes them.
export const duration = { fast: '150ms', base: '250ms', slow: '400ms' };

// Tailwind's three easings, plus Open Props' spring (a linear() curve).
export const ease = {
  linear: 'linear',
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
  spring: 'linear(0, 0.006, 0.025 2.8%, 0.101 6.1%, 0.539 18.9%, 0.721 25.3%, 0.849 31.5%, 0.937 38.1%, 0.968 41.8%, 0.991 45.7%, 1.006 50.1%, 1.015 55%, 1.017 63.9%, 1.001)',
};

// Utopia-style fluid space: [min rem at 320px, max rem at 1440px].
export const fluid = {
  '2xs': [0.25, 0.375], xs: [0.5, 0.75], s: [0.75, 1.125], m: [1, 1.5],
  l: [1.5, 2.25], xl: [2, 3], '2xl': [3, 4.5], '3xl': [4, 6],
};

export const maxWidth = {
  '3xs': '16rem', '2xs': '18rem', xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem',
  '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem', '7xl': '80rem',
  prose: '65ch', measure: 'var(--measure)', full: '100%', none: 'none',
};

// Tailwind names; lg/xl/2xl are the andrewrico grid.css breakpoints (1024/1268/1440).
export const breakpoints = { sm: '640px', md: '768px', lg: '1024px', xl: '1268px', '2xl': '1440px' };

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
