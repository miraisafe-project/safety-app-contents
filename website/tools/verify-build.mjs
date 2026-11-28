import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {resolve, dirname, relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';
import {gzipSync} from 'node:zlib';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pages = ['index.html', '404.html', 'about/index.html', 'app/index.html', 'crowdfunding/index.html', 'news/index.html', 'news/detail/index.html', 'terms/index.html', 'privacy/index.html'];
for (const name of pages) {
  const source = parseHTML(await readFile(resolve(root, name), 'utf8')).document;
  const built = parseHTML(await readFile(resolve(root, '_site', name), 'utf8')).document;
  assert.equal(built.querySelector('main').textContent, source.querySelector('main').textContent, `${name}: text changed`);
  for (const selector of ['a', 'img', 'ruby', 'strong', 'button']) {
    const signature = document => [...document.querySelectorAll(selector)].map(el => [el.tagName, el.getAttribute('href'), el.getAttribute('src'), el.getAttribute('alt'), el.textContent]);
    assert.deepEqual(signature(built), signature(source), `${name}: ${selector} changed`);
  }
}
let dataFiles = 0;
async function verifyData(path) {
  for (const e of await readdir(path, {withFileTypes: true})) {
    const source = resolve(path, e.name);
    if (e.isDirectory()) await verifyData(source);
    else { assert.deepEqual(await readFile(resolve(root, '_site', relative(root, source))), await readFile(source)); dataFiles++; }
  }
}
await verifyData(resolve(root, 'data'));
const bundle = await readFile(resolve(root, '_site/assets/js/japanese-wrap.js'));
assert.ok(bundle.length < 60000);
console.log(`Verified ${pages.length} page texts/links/images/inline markup; ${dataFiles} app-data files byte-identical.`);
console.log(`Local Japanese bundle: ${bundle.length} bytes / gzip ${gzipSync(bundle).length} bytes.`);
