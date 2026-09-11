const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createRequire } = require('node:module');
const appRequire = createRequire(process.env.WURFKIT_APP_PACKAGE || path.resolve(__dirname, '../../.worktrees/app-security/package.json'));
const puppeteer = appRequire('puppeteer');
const root = path.resolve(__dirname, '..');
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!filename.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  try { response.setHeader('Content-Type', filename.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8'); response.end(fs.readFileSync(filename)); }
  catch { response.writeHead(404); response.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await puppeteer.launch({ headless: true });
  try {
    const cases = [
      { name: 'network failure', abort: true },
      { name: 'server error', status: 503, body: '{"status":"ok"}' },
      { name: 'invalid', body: '{"status":"invalid"}' },
      { name: 'busy', body: '{"status":"busy"}' },
      { name: 'application error', body: '{"status":"error"}' },
      { name: 'invalid response', body: '<html>unexpected</html>' },
      { name: 'confirmed save', body: '{"status":"ok"}', success: true },
      { name: 'timeout preserves input', hang: true },
      { name: 'contact RU saved', form: 'contact-form', routing: 'contact', lang: 'ru', body: '{"status":"ok"}', success: true },
      { name: 'CTA EN saved', form: 'waitlist-cta-form', routing: 'waitlist-cta', lang: 'en', body: '{"status":"ok"}', success: true },
    ];
    for (const scenario of cases) {
      const page = await browser.newPage();
      const formId = scenario.form || 'signup';
      const selector = '#' + formId;
      let submissions = 0;
      await page.setRequestInterception(true);
      page.on('request', async request => {
        if (request.url().startsWith('https://script.google.com/')) {
          submissions++;
          const url = new URL(request.url());
          assert.equal(url.searchParams.get('form-name'), scenario.routing || 'waitlist');
          assert.equal(url.searchParams.get('email'), 'audit@example.invalid');
          assert.equal(url.searchParams.get('lang'), scenario.lang || 'de');
          assert.equal(url.searchParams.get('privacy-consent'), 'yes');
          if (scenario.hang) return; // Actual AbortController timeout; nothing reaches Google.
          if (scenario.abort) await request.abort();
          else await request.respond({ status: scenario.status || 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: scenario.body });
        } else if (request.url().startsWith(origin)) await request.continue();
        else await request.abort(); // No real form submissions or third-party requests.
      });
      await page.goto(origin, { waitUntil: 'networkidle0' });
      await page.evaluate(lang => setLang(lang), scenario.lang || 'de');
      await page.type(selector + ' input[type=email]', 'audit@example.invalid');
      if (scenario.routing === 'contact') {
        await page.type(selector + ' input[name=name]', 'Synthetic audit');
        await page.select(selector + ' select', 'feedback');
        await page.type(selector + ' textarea', 'Synthetic local test, not a real message.');
      }
      await page.click('input[name="privacy-consent"][form="' + formId + '"]');
      await page.click(selector + ' button[type=submit]');
      if (scenario.success) {
        await page.waitForFunction(() => location.pathname.endsWith('/danke.html'));
      } else {
        await page.waitForSelector(selector + ' .form-status.is-error');
        assert.equal(page.url(), origin + '/');
        assert.equal(await page.$eval(selector + ' input[type=email]', input => input.value), 'audit@example.invalid');
        assert.equal(await page.$eval(selector + ' button[type=submit]', button => button.disabled), false);
      }
      assert.equal(submissions, 1, scenario.name);
      console.log('PASS: ' + scenario.name);
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
