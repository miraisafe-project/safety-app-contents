import {parseHTML} from 'linkedom';
import {loadDefaultJapaneseParser} from 'budoux';
import {build} from 'esbuild';
import {cp, mkdir, readFile, writeFile, readdir} from 'node:fs/promises';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepare} from '../typography/core.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const output = resolve(root, '_site');
// Deliberately no recursive deletion. Every generated official page is overwritten.
await mkdir(output, {recursive: true});
for (const name of ['index.html', '404.html', 'robots.txt', 'sitemap.xml', 'about', 'app', 'assets', 'news', 'crowdfunding', 'data', 'terms', 'privacy']) {
  await cp(resolve(root, name), resolve(output, name), {recursive: true});
}
await mkdir(resolve(output, 'website'), {recursive: true});
await cp(resolve(root, 'website/news'), resolve(output, 'website/news'), {recursive: true});
const parser = loadDefaultJapaneseParser();
let pages = 0, blocks = 0;
async function processDirectory(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (entry.isDirectory() && !['data', 'assets', 'website'].includes(entry.name)) await processDirectory(resolve(directory, entry.name));
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const path = resolve(directory, entry.name), source = await readFile(path, 'utf8');
    const {document} = parseHTML(source);
    blocks += prepare(document, parser); pages++;
    await writeFile(path, document.toString());
  }
}
await processDirectory(output);
await build({entryPoints: [resolve(root, 'website/tools/browser.mjs')], outfile: resolve(output, 'assets/js/japanese-wrap.js'), bundle: true, minify: true, platform: 'browser', target: ['es2020'], legalComments: 'eof'});
console.log(`Built ${pages} official pages, ${blocks} Japanese text blocks; app data copied without processing.`);
