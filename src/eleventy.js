// Eleventy plugin.
//
//   import a11yAtomic from 'illustion-ui/eleventy';
//
//   // Recommended: Facebook-style site build. Readable classes compile to short atomic
//   // ax_ classes and every page links ONE shared, cached stylesheet.
//   eleventyConfig.addPlugin(a11yAtomic, {site: true, out: 'css/illustionui-site.css', styles: ['src/**/*.styles.js']});
//
//   // Only what each page uses: shared core file + per-page <style> in <head> (readable classes;
//   // compile: true turns them into atomic ax_ classes, but inline pages then come out larger)
//   eleventyConfig.addPlugin(a11yAtomic, {perPage: true, core: 'css/illustionui-core.css'});
//
//   // One file for the whole site, scanned from the built HTML
//   eleventyConfig.addPlugin(a11yAtomic, {out: 'css/illustionui.css'});
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {build, buildCore, buildPage, buildSite, inlinePage, loadStyles, minify} from '../scripts/build.mjs';

export default function a11yAtomic(eleventyConfig, options = {}) {
  if (options.site) {
    eleventyConfig.on('eleventy.after', async ({dir}) => {
      const output = dir?.output || '_site';
      await buildSite([`${output}/**/*.html`], {styles: options.styles, out: path.join(output, options.out || 'css/illustionui-site.css'), hrefRoot: output});
    });
    return;
  }
  if (options.perPage) {
    const core = (options.core || 'css/illustionui-core.css').replace(/^\/+/, '');
    let ready = null;
    eleventyConfig.addTransform('illustion-ui', async function (content) {
      const out = this.page?.outputPath || this.outputPath;
      if (!out || !String(out).endsWith('.html')) return content;
      ready ??= loadStyles(options.styles);
      await ready;
      if (!options.compile) return inlinePage(content, await buildPage(content), `/${core}`);
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
    const file = path.join(output, options.out || 'css/illustionui.css');
    const css = minify(await build({content, styles: options.styles}));
    await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, css + '\n');
  });
}
