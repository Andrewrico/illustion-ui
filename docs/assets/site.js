// Small helpers shared by the landing page and the docs: copy buttons, the
// widget opener, the mobile sidebar and the "On this page" highlight.
// Everything here is an enhancement; the pages read fine without it.

const widget = () => globalThis.a11yWidget;

document.addEventListener('click', event => {
  if (event.target.closest('[data-open-widget]')) widget()?.open();
});

// Copy buttons on every code block.
for (const block of document.querySelectorAll('.code')) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'copy';
  button.textContent = 'Copy';
  button.setAttribute('aria-label', 'Copy code to clipboard');
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(block.querySelector('pre').textContent);
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Press Ctrl+C';
      const range = document.createRange();
      range.selectNodeContents(block.querySelector('code'));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 2000);
  });
  block.append(button);
}

// The docs sidebar is a <details>: open for everyone, folded away on small screens.
const side = document.querySelector('.docs-side');
if (side) {
  const narrow = matchMedia('(max-width: 1023.98px)');
  const fold = () => { side.open = !narrow.matches; };
  fold();
  narrow.addEventListener('change', fold);
}

// Highlight the section being read in "On this page".
const links = [...document.querySelectorAll('.docs-toc a')];
if (links.length && 'IntersectionObserver' in globalThis) {
  const byId = new Map(links.map(a => [decodeURIComponent(a.hash.slice(1)), a]));
  const seen = new Set();
  const mark = () => {
    const first = [...byId.keys()].find(id => seen.has(id));
    for (const [id, a] of byId) {
      if (id === first) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const e of entries) { if (e.isIntersecting) seen.add(e.target.id); else seen.delete(e.target.id); }
    mark();
  }, {rootMargin: '-80px 0px -60% 0px'});
  for (const id of byId.keys()) { const el = document.getElementById(id); if (el) observer.observe(el); }
}
