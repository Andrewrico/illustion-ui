// Eleventy plugin: after each build, scan the generated HTML and write a CSS
// file containing only the classes the site uses.
//
//   import a11yAtomic from 'a11y-atomic/eleventy';
//   eleventyConfig.addPlugin(a11yAtomic, {out: 'css/a11y-atomic.css'});
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {build, minify} from '../scripts/build.mjs';

export default function a11yAtomic(eleventyConfig, options = {}) {
  eleventyConfig.on('eleventy.after', async ({dir}) => {
    const output = dir?.output || '_site';
    const content = options.content || [`${output}/**/*.html`];
    const file = path.join(output, options.out || 'css/a11y-atomic.css');
    const css = minify(await build({content}));
    await mkdir(path.dirname(file), {recursive: true});
    await writeFile(file, css + '\n');
  });
}
