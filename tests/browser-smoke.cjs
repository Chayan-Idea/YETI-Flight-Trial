const { chromium } = require('playwright');
const { loginToYeti } = require('./helpers/yeti-login.cjs');
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
  let browser,context,page,traceStarted=false,traceSaved=false;
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    const baseUrl = 'http://127.0.0.1:' + address.port;
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    context = await browser.newContext();
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    traceStarted = true;
    page = await context.newPage();
    const sopJson = fs.readFileSync(path.join(root, 'data/flight-trial-sop.json'), 'utf8');
    await page.route('https://raw.githubusercontent.com/Chayan-Idea/YETI-Flight-Trial/main/data/flight-trial-sop.json**', route => route.fulfill({ status: 200, contentType: 'application/json', body: sopJson }));
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' }));

    const response = await page.goto(baseUrl + '/', { waitUntil: 'networkidle' });
    await loginToYeti(page, 'admin');
    await page.locator('#flightTrialPreparationSopTab').click();
    await page.locator('#flightTrialSopAdminTools').waitFor({ state: 'visible' });
    await page.locator('#flightTrialSopReadModeBtn').waitFor({ state: 'visible' });
    await page.waitForFunction(() => !document.querySelector('#flightTrialSopEditModeBtn').disabled, { timeout: 5000 });
    await page.locator('#flightTrialSopEditModeBtn').click();
    const sopArticle = page.locator('.flight-trial-reading-document');
    if (await sopArticle.getAttribute('contenteditable') !== 'true') throw new Error('Admin Edit View Mode did not enable SOP editing.');
    await sopArticle.locator('h2').first().evaluate(element => { element.textContent = 'TEMPORARY SOP TEST'; element.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.locator('#flightTrialSopSaveBtn').waitFor({ state: 'visible' });
    if (await page.locator('#flightTrialSopSaveBtn').isDisabled()) throw new Error('SOP Save Changes did not enable after an edit.');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#flightTrialSopCancelBtn').click();
    await page.locator('#flightTrialSopEditModeBtn').waitFor({ state: 'visible' });
    if (await sopArticle.locator('h2').first().textContent() !== 'YETI FLIGHT TRIAL') throw new Error('Cancel did not restore the centrally saved SOP content.');
    await page.locator('#yetiLogoutBtn').click();
    await loginToYeti(page, 'user');
    await page.locator('#flightTrialPreparationSopTab').click();
    await page.locator('#flightTrialSopAdminTools').waitFor({ state: 'hidden' });
    if (await page.locator('.flight-trial-reading-document').getAttribute('contenteditable') === 'true') throw new Error('User Login must remain read-only for the SOP.');

    if (!response || !response.ok()) throw new Error('Application shell did not return a successful HTTP response.');
    await page.locator('#propulsionAnalyzerTab').waitFor({ state: 'visible' });
    await page.locator('#flightPreparationTab').waitFor({ state: 'visible' });
    await page.locator('#flightPreparationPanel').waitFor({ state: 'visible' });
    const designLayer = await page.locator('link[href*="yeti-design-system.css"]').count();
    if (designLayer !== 1) throw new Error('YETI visual design stylesheet is not loaded exactly once.');
    const designTokens = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--yeti-ink').trim());
    if (designTokens !== '#142b43') throw new Error('YETI design tokens are not active.');

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
    if (page) {
      try { await page.screenshot({ path: '/tmp/yeti-smoke-failure.png', fullPage: true }); console.error('[SCREENSHOT] /tmp/yeti-smoke-failure.png'); } catch (captureError) { console.error('[SCREENSHOT CAPTURE FAILED]', captureError.message); }
    }
    if (context && traceStarted) {
      try { await context.tracing.stop({ path: '/tmp/yeti-smoke-trace.zip' }); traceSaved = true; console.error('[TRACE] /tmp/yeti-smoke-trace.zip'); } catch (traceError) { console.error('[TRACE CAPTURE FAILED]', traceError.message); }
    }
    process.exitCode = 1;
  } finally {
    if (context && traceStarted && !traceSaved) await context.tracing.stop().catch(() => {});
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})();
