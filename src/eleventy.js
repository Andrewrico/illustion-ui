// Eleventy plugin.
//
//   import a11yAtomic from 'a11y-atomic/eleventy';
//
//   // Only what each page uses (recommended): shared core file + per-page <style> in <head>,
//   // and readable classes compiled to atomic ax_ classes (compile: false keeps them readable)
//   eleventyConfig.addPlugin(a11yAtomic, {perPage: true, core: 'css/a11y-core.css', styles: ['src/**/*.styles.js']});
//
//   // One file for the whole site, scanned from the built HTML
//   eleventyConfig.addPlugin(a11yAtomic, {out: 'css/a11y-atomic.css'});
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {build, buildCore, buildPage, inlinePage, loadStyles, minify} from '../scripts/build.mjs';

export default function a11yAtomic(eleventyConfig, options = {}) {
  if (options.perPage) {
    const core = (options.core || 'css/a11y-core.css').replace(/^\/+/, '');
    let ready = null;
    eleventyConfig.addTransform('a11y-atomic', async function (content) {
      const out = this.page?.outputPath || this.outputPath;
      if (!out || !String(out).endsWith('.html')) return content;
      ready ??= loadStyles(options.styles);
      await ready;
      if (options.compile === false) return inlinePage(content, await buildPage(content), `/${core}`);
      const {css, html} = await buildPage(content, {compile: true}); // readable classes → atomic classes
      return inlinePage(html, css, `/${core}`);
    });
    eleventyConfig.on('eleventy.after', async ({dir}) => {
      const file = path.join(dir?.output || '_site', core);
      await mkdir(path.dirname(file), {recursive: true});
      await writeFile(file, await buildCore());
    });
    return;
  }
  eleventyConfig.on('eleventy.after', async ({dir}) => {
    const output = dir?.output || '_site';
    const content = options.content || [`${output}/**/*.html`];
    const file = path.join(output, options.out || 'css/a11y-atomic.css');
    const css = minify(await build({content, styles: options.styles}));
    await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, css + '\n');
  });
}
