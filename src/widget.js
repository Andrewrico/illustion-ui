// a11y-atomic accessibility widget.
// Settings become data-a11y-<key> attributes on <html>; the CSS framework reads
// them. Pure helpers (sanitize/apply/load/save) work without a DOM for tests.

export const STORAGE_KEY = 'a11y-atomic';

// type 'choice' renders a radio group, 'toggle' a switch (options = [off, on]).
export const SETTINGS = [
  {key: 'text', label: 'Text size', type: 'choice', default: '100',
    options: [['100', '100%'], ['115', '115%'], ['130', '130%'], ['150', '150%'], ['175', '175%'], ['200', '200%']]},
  {key: 'theme', label: 'Theme', type: 'choice', default: 'auto',
    options: [['auto', 'System'], ['light', 'Light'], ['dark', 'Dark']]},
  {key: 'contrast', label: 'Contrast', type: 'choice', default: 'auto',
    options: [['auto', 'System'], ['normal', 'Standard'], ['high', 'High']]},
  {key: 'font', label: 'Font', type: 'choice', default: 'default',
    options: [['default', 'Default'], ['readable', 'Readable'], ['dyslexic', 'Dyslexia-friendly']]},
  {key: 'saturation', label: 'Color', type: 'choice', default: 'normal',
    options: [['normal', 'Full'], ['low', 'Low'], ['gray', 'Grayscale']]},
  {key: 'motion', label: 'Animations', type: 'choice', default: 'auto',
    options: [['auto', 'System'], ['reduce', 'Stop'], ['allow', 'Allow']]},
  {key: 'spacing', label: 'Wider text spacing', type: 'toggle', default: 'off', options: [['off', 'Off'], ['on', 'On']]},
  {key: 'align', label: 'Align text left', type: 'toggle', default: 'off', options: [['off', 'Off'], ['left', 'On']]},
  {key: 'links', label: 'Highlight links', type: 'toggle', default: 'off', options: [['off', 'Off'], ['underline', 'On']]},
  {key: 'focus', label: 'Strong focus outline', type: 'toggle', default: 'off', options: [['off', 'Off'], ['strong', 'On']]},
  {key: 'target', label: 'Larger click targets', type: 'toggle', default: 'off', options: [['off', 'Off'], ['large', 'On']]},
  {key: 'cursor', label: 'Large cursor', type: 'toggle', default: 'off', options: [['off', 'Off'], ['large', 'On']]},
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

  const el = doc.createElement('div');
  el.className = 'a11y-widget';
  el.dataset.position = options.position === 'bottom-left' ? 'bottom-left' : 'bottom-right';
  el.innerHTML = `
    <button type="button" class="a11y-widget__toggle tap-target" aria-expanded="false" aria-controls="${id}-panel">${ICON}<span class="sr-only">${title} settings</span></button>
    <section id="${id}-panel" class="a11y-widget__panel" role="dialog" aria-modal="false" aria-labelledby="${id}-title" hidden>
      <div class="a11y-widget__header">
        <h2 id="${id}-title" class="a11y-widget__title" tabindex="-1">${title}</h2>
        <button type="button" class="a11y-widget__close tap-target" data-a11y-close><span aria-hidden="true">&times;</span><span class="sr-only">Close ${title.toLowerCase()} settings</span></button>
      </div>
      <form class="a11y-widget__form">
        ${SETTINGS.map(s => (s.type === 'toggle' ? toggleHtml(id, s) : choiceHtml(id, s))).join('')}
      </form>
      <div class="a11y-widget__footer">
        <button type="button" class="a11y-widget__reset tap-target" data-a11y-reset>Reset all</button>
      </div>
      <p class="sr-only" aria-live="polite" data-a11y-status></p>
    </section>`;
  (options.container || doc.body).append(el);

  const toggle = el.querySelector('.a11y-widget__toggle');
  const panel = el.querySelector('.a11y-widget__panel');
  const form = el.querySelector('form');
  const status = el.querySelector('[data-a11y-status]');
  const heading = el.querySelector('.a11y-widget__title');

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
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    heading.focus();
  };
  const close = (returnFocus = true) => {
    if (panel.hidden) return;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
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
  return `<fieldset class="a11y-widget__group">
      <legend class="a11y-widget__legend">${s.label}</legend>
      <div class="a11y-widget__options">
        ${s.options.map(([value, label]) => `<label class="a11y-widget__option"><input type="radio" name="${s.key}" value="${value}"><span>${label}</span></label>`).join('')}
      </div>
    </fieldset>`;
}

function toggleHtml(id, s) {
  return `<label class="a11y-widget__switch" for="${id}-${s.key}">
      <span>${s.label}</span>
      <input type="checkbox" role="switch" id="${id}-${s.key}" name="${s.key}">
    </label>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
}

function safeLocalStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}
