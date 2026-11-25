const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const base = process.env.SITE_URL || 'http://127.0.0.1:8766/';
const data = JSON.parse(fs.readFileSync(__dirname + '/../website/news/website_news.json'));
const article = data.items.find(item => item.id === 'crowdfunding-meikan');
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_BIN ? {executablePath: process.env.BROWSER_BIN} : {})});
  try {
    for (const width of [390, 768, 800, 801, 1024, 1366, 1920]) {
      const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
      await page.goto(base + 'news/detail/?id=crowdfunding-meikan', {waitUntil: 'networkidle'});
      await page.evaluate(() => document.fonts.ready);
      const text = page.locator('.news-split-copy');
      assert.deepEqual(await text.locator('p').allTextContents(), article.blocks.filter(b => b.type === 'paragraph').map(b => b.text));
      assert.equal(await text.locator('a').count(), 1);
      const image = page.locator('.news-split-media img');
      await image.evaluate(e => e.decode());
      const copyBox = await text.boundingBox(), imageBox = await page.locator('.news-split-media').boundingBox();
      if (width > 800) { assert.ok(copyBox.x < imageBox.x); assert.ok(Math.abs(copyBox.y - imageBox.y) < 1); }
      else assert.ok(copyBox.y + copyBox.height < imageBox.y);
      const r = await image.boundingBox();
      assert.ok(r.width <= 320); assert.ok(Math.abs(r.height - r.width * 1932 / 1238) < .1);
      assert.equal(await page.locator('figcaption').evaluate(e => getComputedStyle(e).textAlign), 'center');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const link = text.locator('a'); assert.equal(await link.getAttribute('target'), '_blank');
      assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
      await page.route('https://crowdfunding.meikan.org/**', route => route.fulfill({body: 'Link test'}));
      const next = page.waitForEvent('popup'); await link.click(); const popup = await next; await popup.waitForLoadState();
      assert.equal(popup.url(), 'https://crowdfunding.meikan.org/project/forgood-1004679/'); await popup.close();
      await page.locator('[data-image-zoom]').click(); await page.getByRole('dialog').waitFor({state: 'visible'});
      await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state: 'hidden'});
      if (width === 390 || width === 1366) { await page.evaluate(() => scrollTo(0,0)); await page.screenshot({path: require('node:os').tmpdir() + '/news-columns-' + width + '.png', fullPage: true}); }
      const back = page.locator('.news-article > .text-link'); const backBox = await back.boundingBox();
      const finalCopy = await text.boundingBox(), finalImage = await page.locator('.news-split-media').boundingBox();
      assert.ok(backBox.y >= Math.max(finalCopy.y + finalCopy.height, finalImage.y + finalImage.height));
      await back.click(); await page.waitForURL(base + 'news/');
      await page.goto(base + 'news/detail/?id=official-sns', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('.news-body--split').count(), 0); assert.equal(await page.locator('.news-social').count(), 2);
      // Same image article without the option retains its inline block order.
      const inline = structuredClone(data); delete inline.items.find(i => i.id === article.id).layout;
      await page.route('**/website/news/website_news.json', route => route.fulfill({json: inline}));
      await page.goto(base + 'news/detail/?id=crowdfunding-meikan', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('.news-body--split').count(), 0);
      assert.deepEqual(await page.locator('.news-body').evaluate(e => [...e.children].map(n => n.tagName)), ['P', 'FIGURE', 'P', 'P', 'A']);
      // A different ID can use the split layout; no article-specific rendering.
      inline.items = [{...article, id: 'reusable', layout: 'text-image'}];
      await page.goto(base + 'news/detail/?id=reusable', {waitUntil: 'networkidle'});
      assert.equal(await page.locator('.news-body--split').count(), 1);
      await page.close(); console.log('PASS news layout', width);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
