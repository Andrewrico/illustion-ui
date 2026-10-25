// Drop-in: <script type="module" src="…/src/auto.js"></script> mounts the widget once the DOM is ready.
import {mount} from './widget.js';

const start = () => { globalThis.a11yWidget ??= mount(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
else start();
