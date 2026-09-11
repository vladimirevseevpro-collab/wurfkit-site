const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const puppeteer = createRequire(path.resolve(root, '../.worktrees/app-security/package.json'))('puppeteer');
const output = path.resolve(root, '../_visual_test/remediation-2026-09-11/landing');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.pdf': 'application/pdf' };
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)) return response.writeHead(403).end();
  try { const body = fs.readFileSync(filename); response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream' }).end(body); }
  catch { response.writeHead(404).end(); }
});
(async () => {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ headless: true });
  try {
    for (const [viewport, width, height] of [['desktop', 1440, 900], ['tablet', 1024, 768], ['mobile', 390, 844]]) {
      for (const lang of ['de', 'en', 'ru']) {
        const page = await browser.newPage();
        const errors = []; let submissions = 0;
        page.on('pageerror', error => errors.push(error.message));
        await page.setViewport({ width, height, deviceScaleFactor: 1 });
        await page.setRequestInterception(true);
        page.on('request', request => {
          if (request.url().startsWith('https://script.google.com/')) {
            submissions++;
            return request.respond({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: '{"status":"error"}' });
          }
          return request.url().startsWith(origin) ? request.continue() : request.abort();
        });
        await page.goto(`${origin}/?lang=${lang}`, { waitUntil: 'networkidle0' });
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.$eval('html', e => e.lang), lang);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${viewport}/${lang} overflow`);
        assert.equal(await page.evaluate(lang => [...document.querySelectorAll(['de', 'en', 'ru'].filter(l => l !== lang).map(l => '.' + l).join(','))].filter(e => e.getClientRects().length > 0).length, lang), 0, 'foreign language visible');
        assert.equal(await page.evaluate(() => document.fonts.check('16px "DM Sans"') && document.fonts.check('24px "Playfair Display"')), true);
        await page.screenshot({ path: path.join(output, `${viewport}-${lang}-full.png`), fullPage: true });
        await page.screenshot({ path: path.join(output, `${viewport}-${lang}-hero.png`) });
        // Required consent is associated with the form even though outside its box.
        await page.type('#signup input[type=email]', 'audit@example.invalid');
        await page.click('#signup button[type=submit]');
        assert.equal(submissions, 0, 'unchecked consent sent data');
        assert.equal(await page.$eval('#signup', f => f.checkValidity()), false);
        await page.click('input[form=signup][type=checkbox]');
        await page.click('#signup button[type=submit]');
        await page.waitForSelector('#signup .form-status.is-error');
        assert.equal(submissions, 1);
        assert.equal(await page.$eval('#signup input[type=email]', e => e.value), 'audit@example.invalid');
        assert.equal(await page.$eval('#signup button', e => e.disabled), false);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: path.join(output, `${viewport}-${lang}-error.png`) });
        const privacy = `label.consent .${lang} a`;
        await page.focus(privacy); await page.keyboard.press('Enter');
        assert.equal(await page.$eval('#site-content', e => e.inert), true);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.getElementById('modal').contains(document.activeElement)), true);
        await page.screenshot({ path: path.join(output, `${viewport}-${lang}-privacy.png`) });
        await page.keyboard.press('Escape');
        assert.equal(await page.$eval('#site-content', e => e.inert), false);
        assert.equal(await page.$eval(privacy, e => e === document.activeElement), true);
        assert.deepEqual(errors, []);
        console.log(`PASS ${viewport}/${lang}: overflow, locale, fonts, consent, failure recovery, modal keyboard/focus`);
        await page.close();
      }
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
