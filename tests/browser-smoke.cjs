const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const target = path.resolve(root, pathname === '/' ? './index.html' : '.' + pathname);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(target).pipe(res);
});

(async () => {
  let browser;
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  try {
    await new Promise(resolve => server.listen(4174, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' }));

    const response = await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' });
    if (!response || !response.ok()) throw new Error('Application shell did not return a successful HTTP response.');
    await page.locator('#propulsionAnalyzerTab').waitFor({ state: 'visible' });
    await page.locator('#flightPreparationTab').waitFor({ state: 'visible' });
    await page.locator('#flightPreparationPanel').waitFor({ state: 'visible' });

    await page.locator('#propulsionAnalyzerTab').click();
    await page.locator('.propulsion-analyser-workspace').waitFor({ state: 'visible' });
    await page.locator('#propulsionLogCount').waitFor({ state: 'visible' });
    await page.locator('#propulsionAnalyzerTab').click();
    await page.locator('#flightPreparationTab').click();
    await page.locator('#flightPreparationPanel').waitFor({ state: 'visible' });

    if (pageErrors.length || consoleErrors.length || failedRequests.length) {
      throw new Error('Browser smoke test detected runtime or network errors.');
    }
    console.log('Browser smoke test passed: app shell, Flight Preparation, Propulsion Analyzer tab navigation, and return navigation.');
  } catch (error) {
    console.error('[BROWSER SMOKE FAILURE]', error.stack || error);
    console.error('[PAGE ERRORS]', JSON.stringify(pageErrors, null, 2));
    console.error('[CONSOLE ERRORS]', JSON.stringify(consoleErrors, null, 2));
    console.error('[FAILED REQUESTS]', JSON.stringify(failedRequests, null, 2));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
