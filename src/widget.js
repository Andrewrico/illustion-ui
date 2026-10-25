// a11y-atomic accessibility widget.
// Settings become data-a11y-<key> attributes on <html>; the CSS framework reads
// them. Pure helpers (sanitize/apply/load/save) work without a DOM for tests.

import {classes as cx} from './atomic.js';
import {styles as st} from './widget.styles.js';

export const STORAGE_KEY = 'a11y-atomic';

// type 'choice' renders a radio group, 'toggle' a switch (options = [off, on]).
// wcag: success criteria the setting helps with (checked against wcag/snapshot.json).
// The large cursor helps low-vision users but maps to no WCAG criterion.
export const SETTINGS = [
  {key: 'text', wcag: ['1.4.4'], label: 'Text size', type: 'choice', default: '100',
    options: [['100', '100%'], ['115', '115%'], ['130', '130%'], ['150', '150%'], ['175', '175%'], ['200', '200%']]},
  {key: 'theme', wcag: ['1.4.3', '1.4.11'], label: 'Theme', type: 'choice', default: 'auto',
    options: [['auto', 'System'], ['light', 'Light'], ['dark', 'Dark']]},
  {key: 'contrast', wcag: ['1.4.3', '1.4.6', '1.4.11'], label: 'Contrast', type: 'choice', default: 'auto',
    options: [['auto', 'System'], ['normal', 'Standard'], ['high', 'High']]},
  {key: 'font', wcag: ['1.4.8'], label: 'Font', type: 'choice', default: 'default',
    options: [['default', 'Default'], ['readable', 'Readable'], ['dyslexic', 'Dyslexia-friendly']]},
  {key: 'saturation', wcag: ['1.4.1'], label: 'Color', type: 'choice', default: 'normal',
    options: [['normal', 'Full'], ['low', 'Low'], ['gray', 'Grayscale']]},
  {key: 'motion', wcag: ['2.2.2', '2.3.3'], label: 'Animations', type: 'choice', default: 'auto',
    options: [['auto', 'System'], ['reduce', 'Stop'], ['allow', 'Allow']]},
  {key: 'spacing', wcag: ['1.4.12'], label: 'Wider text spacing', type: 'toggle', default: 'off', options: [['off', 'Off'], ['on', 'On']]},
  {key: 'align', wcag: ['1.4.8'], label: 'Align text left', type: 'toggle', default: 'off', options: [['off', 'Off'], ['left', 'On']]},
  {key: 'links', wcag: ['1.4.1'], label: 'Highlight links', type: 'toggle', default: 'off', options: [['off', 'Off'], ['underline', 'On']]},
  {key: 'focus', wcag: ['2.4.7', '2.4.13'], label: 'Strong focus outline', type: 'toggle', default: 'off', options: [['off', 'Off'], ['strong', 'On']]},
  {key: 'target', wcag: ['2.5.8', '2.5.5'], label: 'Larger click targets', type: 'toggle', default: 'off', options: [['off', 'Off'], ['large', 'On']]},
  {key: 'cursor', wcag: [], label: 'Large cursor', type: 'toggle', default: 'off', options: [['off', 'Off'], ['large', 'On']]},
];

const byKey = Object.fromEntries(SETTINGS.map(s => [s.key, s]));

export const defaults = () => Object.fromEntries(SETTINGS.map(s => [s.key, s.default]));

/** Keep only known keys with allowed values; fill the rest with defaults. */
export function sanitize(input) {
  const state = defaults();
  if (input && typeof input === 'object') {
    for (const s of SETTINGS) if (s.options.some(([v]) => v === input[s.key])) state[s.key] = input[s.key];
  }
  return state;
}

/** Write state to the root element: defaults remove the attribute. */
export function applySettings(root, input) {
  const state = sanitize(input);
  for (const s of SETTINGS) {
    const name = `data-a11y-${s.key}`;
    if (state[s.key] === s.default) root.removeAttribute(name);
    else root.setAttribute(name, state[s.key]);
  }
  return state;
}

export function loadState(storage) {
  try { return sanitize(JSON.parse(storage?.getItem(STORAGE_KEY) || '{}')); } catch { return defaults(); }
}

/** Store only non-default values. Returns false if storage is unavailable. */
export function saveState(storage, state) {
  const changed = Object.fromEntries(Object.entries(sanitize(state)).filter(([k, v]) => v !== byKey[k].default));
  try {
    if (Object.keys(changed).length) storage.setItem(STORAGE_KEY, JSON.stringify(changed));
    else storage.removeItem(STORAGE_KEY);
    return true;
  } catch { return false; }
}

export const describe = (key, value) => {
  const s = byKey[key];
  return `${s.label}: ${s.options.find(([v]) => v === value)?.[1] ?? value}`;
};

const ICON = '<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="28" height="28"><circle cx="12" cy="4.5" r="2.2" fill="currentColor"/><path d="M4 8.2c2.6.8 5.3 1.2 8 1.2s5.4-.4 8-1.2l.5 1.8c-2 .7-4.1 1.1-6.2 1.3V14l2.3 7.4-1.9.6L12 15.6 9.3 22l-1.9-.6L9.7 14v-2.7C7.6 11.1 5.5 10.7 3.5 10z" fill="currentColor"/></svg>';

let uid = 0;

/**
 * Render the widget and wire it up. Returns {open, close, reset, state, destroy}.
 * Options: position ('bottom-right' | 'bottom-left'), shortcut (true: Alt+Shift+A),
 * storage (default localStorage), root (default <html>), title.
 */
export function mount(options = {}) {
  const doc = options.document || document;
  const root = options.root || doc.documentElement;
  const storage = options.storage === undefined ? safeLocalStorage() : options.storage;
  const title = escapeHtml(options.title || 'Accessibility');
  const id = `a11y-widget-${++uid}`;
  let state = applySettings(root, loadState(storage));

  const left = options.position === 'bottom-left';
  const el = doc.createElement('div');
  // .a11y-widget is a hook (modes.css keeps the widget legible); styling is atomic.
  el.className = `a11y-widget ${cx(st.root, left && st.rootLeft)}`;
  el.dataset.position = left ? 'bottom-left' : 'bottom-right';
  const sr = cx(st.srOnly);
  el.innerHTML = `
    <button type="button" data-part="toggle" class="${cx(st.toggle)}" aria-expanded="false" aria-controls="${id}-panel">${ICON}<span class="${sr}">${title} settings</span></button>
    <section id="${id}-panel" data-part="panel" class="${cx(st.panel, left && st.panelLeft)}" role="dialog" aria-modal="false" aria-labelledby="${id}-title" hidden>
      <div class="${cx(st.header)}">
        <h2 id="${id}-title" data-part="title" class="${cx(st.title)}" tabindex="-1">${title}</h2>
        <button type="button" class="${cx(st.button, st.close)}" data-a11y-close><span aria-hidden="true">&times;</span><span class="${sr}">Close ${title.toLowerCase()} settings</span></button>
      </div>
      <form class="${cx(st.form)}">
        ${SETTINGS.map(s => (s.type === 'toggle' ? toggleHtml(id, s) : choiceHtml(id, s))).join('')}
      </form>
      <div class="${cx(st.footer)}">
        <button type="button" class="${cx(st.button, st.reset)}" data-a11y-reset>Reset all</button>
      </div>
      <p class="${sr}" aria-live="polite" data-a11y-status></p>
    </section>`;
  (options.container || doc.body).append(el);

  const toggle = el.querySelector('[data-part="toggle"]');
  const panel = el.querySelector('[data-part="panel"]');
  const form = el.querySelector('form');
  const status = el.querySelector('[data-a11y-status]');
  const heading = el.querySelector('[data-part="title"]');
  const setOpen = isOpen => {
    panel.hidden = !isOpen;
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.className = cx(st.toggle, isOpen && st.toggleOpen);
  };

  const sync = () => {
    for (const s of SETTINGS) {
      if (s.type === 'toggle') form.elements[s.key].checked = state[s.key] !== s.default;
      else for (const input of form.querySelectorAll(`input[name="${s.key}"]`)) input.checked = input.value === state[s.key];
    }
  };
  const announce = message => { status.textContent = ''; setTimeout(() => { status.textContent = message; }, 50); };
  const commit = (next, message) => {
    state = applySettings(root, next);
    saveState(storage, state);
    sync();
    if (message) announce(message);
    el.dispatchEvent(new CustomEvent('a11y:change', {bubbles: true, detail: {...state}}));
  };

  const open = () => {
    setOpen(true);
    heading.focus();
  };
  const close = (returnFocus = true) => {
    if (panel.hidden) return;
    setOpen(false);
    if (returnFocus) toggle.focus();
  };
  const reset = () => commit(defaults(), 'All accessibility settings reset');

  toggle.addEventListener('click', () => (panel.hidden ? open() : close()));
  el.querySelector('[data-a11y-close]').addEventListener('click', () => close());
  el.querySelector('[data-a11y-reset]').addEventListener('click', reset);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', event => {
    const input = event.target;
    const s = byKey[input.name];
    if (!s) return;
    const value = s.type === 'toggle' ? s.options[input.checked ? 1 : 0][0] : input.value;
    commit({...state, [s.key]: value}, describe(s.key, value));
  });
  el.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); close(); }
  });
  const onPointer = event => { if (!panel.hidden && !el.contains(event.target)) close(false); };
  const onKey = event => {
    if (options.shortcut !== false && event.altKey && event.shiftKey && event.code === 'KeyA') {
      event.preventDefault();
      panel.hidden ? open() : close();
    }
  };
  doc.addEventListener('pointerdown', onPointer);
  doc.addEventListener('keydown', onKey);
  sync();

  return {
    element: el, open, close, reset,
    get state() { return {...state}; },
    set(key, value) { commit({...state, [key]: value}); },
    destroy() { doc.removeEventListener('pointerdown', onPointer); doc.removeEventListener('keydown', onKey); el.remove(); },
  };
}

function choiceHtml(id, s) {
  return `<fieldset class="${cx(st.group)}">
      <legend class="${cx(st.legend)}">${s.label}</legend>
      <div class="${cx(st.options)}">
        ${s.options.map(([value, label]) => `<label class="${cx(st.option)}"><input class="${cx(st.optionInput)}" type="radio" name="${s.key}" value="${value}"><span>${label}</span></label>`).join('')}
      </div>
    </fieldset>`;
}

function toggleHtml(id, s) {
  return `<label class="${cx(st.switchRow)}" for="${id}-${s.key}">
      <span>${s.label}</span>
      <input class="${cx(st.switch)}" type="checkbox" role="switch" id="${id}-${s.key}" name="${s.key}">
    </label>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
}

function safeLocalStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
