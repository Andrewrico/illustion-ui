// Bundles and minifies the widget into dist/a11y-widget.min.js (one file, ES module).
import {build} from 'esbuild';
import {gzipSync} from 'node:zlib';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

await build({
  entryPoints: [fileURLToPath(new URL('../src/auto.js', import.meta.url))],
  outfile: fileURLToPath(new URL('../dist/a11y-widget.min.js', import.meta.url)),
  bundle: true, minify: true, format: 'esm', target: 'es2022', legalComments: 'none',
});
const out = await readFile(new URL('../dist/a11y-widget.min.js', import.meta.url));
console.log(`dist/a11y-widget.min.js ${(out.length / 1024).toFixed(1)} KB, ${(gzipSync(out).length / 1024).toFixed(1)} KB gzipped`);
