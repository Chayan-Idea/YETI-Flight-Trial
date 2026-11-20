const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const mime = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.webmanifest':'application/manifest+json'
};
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/S2kAAAAASUVORK5CYII=', 'base64');

function startServer() {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const target = path.resolve(root, pathname === '/' ? './index.html' : '.' + pathname);
    if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'content-type': mime[path.extname(target)] || 'application/octet-stream', 'cache-control':'no-store' });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function drawSignature(page, selector) {
  const canvas = page.locator(selector);
  await canvas.waitFor({ state:'visible' });
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForFunction(sel => {
    const el=document.querySelector(sel), r=el?.getBoundingClientRect();
    return !!el && !!r && r.width>100 && r.height>40 && getComputedStyle(el).pointerEvents!=='none';
  }, selector);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Signature canvas is not measurable: ' + selector);
  // Draw within the actual visible canvas bounds; fixed pixel offsets can land
  // outside a responsive canvas after layout or viewport changes.
  const y = box.y + box.height * 0.52;
  const points = [
    [box.x + box.width * 0.08, y],
    [box.x + box.width * 0.32, y - box.height * 0.18],
    [box.x + box.width * 0.56, y + box.height * 0.12],
    [box.x + box.width * 0.82, y - box.height * 0.08]
  ];
  const hit = await page.evaluate(({x,y,sel}) => {
    const el=document.elementFromPoint(x,y);
    return !!el && (el.matches(sel) || el.closest(sel));
  }, {x:points[0][0],y:points[0][1],sel:selector});
  if (!hit) throw new Error('Signature canvas is covered at the drawing point: ' + selector);
  await page.mouse.move(points[0][0], points[0][1]);
  await page.mouse.down();
  for (const [x,py] of points.slice(1)) await page.mouse.move(x, py, {steps:12});
  await page.mouse.up();
  const result = await canvas.evaluate(el => {
    const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
    let count=0; for(let i=3;i<data.length;i+=4) if(data[i]>0) count++;
    const r=el.getBoundingClientRect(), s=getComputedStyle(el);
    return {pixels:count,width:el.width,height:el.height,rect:{width:r.width,height:r.height},pointerEvents:s.pointerEvents};
  });
  if (result.pixels < 10) throw new Error('Signature drawing did not produce visible canvas data: ' + selector + ' (' + JSON.stringify(result) + ')');
}

async function exportOriginalPdfDownload(page, buttonSelector, promptName) {
  page.once('dialog', dialog => dialog.accept(promptName));
  const downloadPromise=page.waitForEvent('download',{timeout:15000});
  await page.locator(buttonSelector).click();
  const download=await downloadPromise;
  if(!download.suggestedFilename().toLowerCase().endsWith('.pdf'))throw new Error('Original PDF export did not produce a PDF download.');
  const filePath=await download.path();
  if(!filePath||fs.statSync(filePath).size<1000)throw new Error('Original PDF export is empty or incomplete.');
}

async function exportPreview(page, buttonSelector, expectedHeading, promptName) {
  page.once('dialog', dialog => dialog.accept(promptName));
  const popupPromise = page.waitForEvent('popup', { timeout:10000 });
  await page.locator(buttonSelector).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  const bodyText = await popup.locator('body').innerText();
  if (!bodyText.includes(expectedHeading)) throw new Error('Exported print view is missing its expected document heading: ' + expectedHeading);
  await popup.close();
}

(async () => {
  let server, browser, context, page, traceStarted=false, traceSaved=false;
  const pageErrors=[], consoleErrors=[], failedRequests=[];
  try {
    server = await startServer();
    const baseUrl = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
    context = await browser.newContext({ acceptDownloads:true, viewport:{width:1440,height:1000} });
    await context.tracing.start({ screenshots:true, snapshots:true, sources:true });
    traceStarted = true;
    page = await context.newPage();
    page.setDefaultTimeout(10000);
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', message => { if (message.type()==='error') consoleErrors.push(message.text()); });
    page.on('requestfailed', request => failedRequests.push({url:request.url(),error:request.failure()?.errorText||'request failed'}));

    const response = await page.goto(baseUrl+'/', {waitUntil:'networkidle'});
    if (!response || !response.ok()) throw new Error('YETI application shell did not load.');
    await page.locator('#flightPreparationPanel').waitFor({state:'visible'});

    // SOP reading workflow.
    await page.locator('#flightTrialPreparationSopTab').click();
    const sop = page.locator('#flightTrialPreparationSopPanel');
    await sop.waitFor({state:'visible'});
    const sopText = await sop.innerText();
    if (!sopText.includes('STANDARD OPERATING PROCEDURE (SOP)') || !sopText.includes('PURPOSE & SCOPE')) {
      throw new Error('Flight Trial Preparation SOP content is incomplete or not visible.');
    }

    // Daily Airworthiness workflow.
    await page.locator('#dailyTabBtn').click();
    await page.locator('#dailyChecklistTabPanel').waitFor({state:'visible'});
    const firstDailySection = page.locator('#list details.section').first();
    await firstDailySection.waitFor({state:'visible'});
    await firstDailySection.locator('summary').click();
    await firstDailySection.locator('.item').first().waitFor({state:'visible'});
    await page.locator('#uavNameId').fill('YETI-PHASE3-QA');
    await page.locator('#trialPhase').fill('Phase 3 UI Assurance');
    await page.locator('#trialStage').fill('Regression');
    await page.locator('#flightPlace').fill('QA Test Site');
    await page.locator('#flightDate').fill('2026-11-19');

    const dailyStatus = page.locator('#list select[data-k="status"]').first();
    const dailyItemId = await dailyStatus.getAttribute('data-id');
    const dailySection = dailyStatus.locator('xpath=ancestor::details[contains(@class,"section")]');
    await dailySection.locator('summary').click();
    await dailyStatus.selectOption({label:'Pass'});
    const dailyRemark = page.locator('#list input[data-id="'+dailyItemId+'"][data-k="remarks"]');
    await dailyRemark.fill('Phase 3 automated verification remark.');
    const overallRemarks = page.locator('#list textarea[data-id="9.0"][data-k="remarks"]');
    await overallRemarks.locator('xpath=ancestor::details[contains(@class,"section")]').locator('summary').click();
    await overallRemarks.fill('YETI daily checklist workflow verified.');
    const firstDailyTitle = await page.locator('#list .item .title').first().innerText();
    const searchTerm = firstDailyTitle.trim().split(/\s+/)[0];
    await page.locator('#search').fill(searchTerm);
    if (await page.locator('#list .item').count() < 1) throw new Error('Daily checklist search did not return its matching item.');
    await page.locator('#search').fill('');

    await page.locator('#expand').click();
    if (await page.locator('#list details.section[open]').count() < 1) throw new Error('Daily checklist Expand All did not open any section.');
    await page.locator('#collapse').click();
    if (await page.locator('#list details.section[open]').count() !== 0) throw new Error('Daily checklist Collapse All did not close every section.');

    const dailyTouchAction=await page.locator('#signaturePad').evaluate(el=>getComputedStyle(el).touchAction);
    if(dailyTouchAction!=='none')throw new Error('Daily signature canvas must disable browser touch gestures; got '+dailyTouchAction);
    await drawSignature(page, '#signaturePad');
    await page.locator('#clearSignature').click();
    const clearedDailyPixels = await page.locator('#signaturePad').evaluate(el => {
      const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
      let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)count++;return count;
    });
    if (clearedDailyPixels !== 0) throw new Error('Clear Signature did not clear the Daily Airworthiness signature pad.');

    await page.locator('#galleryPhotos').setInputFiles({name:'phase3-daily-evidence.png',mimeType:'image/png',buffer:tinyPng});
    await page.locator('#photoThumbs img').first().waitFor({state:'visible'});
    if (!(await page.locator('#photoStatus').innerText()).includes('1 photo(s) added')) throw new Error('Daily photo evidence was not saved and rendered.');
    await page.locator('#photoThumbs textarea[data-photo-remark]').first().fill('Wing root inspection: no visible cracks or deformation.');
    await page.locator('#photoThumbs textarea[data-photo-remark]').first().evaluate(el=>el.dispatchEvent(new Event('change',{bubbles:true})));

    await page.locator('#previewBtn').click();
    await page.locator('#previewContent .yeti-pdf-source-page').nth(1).waitFor({state:'attached'});
    // The preview button starts asynchronous PDF.js rendering; wait for the appended evidence page, not merely an earlier source-page canvas.
    await page.locator('#previewContent .yeti-pdf-photo-page').waitFor({state:'attached'});
    const dailyPreviewText = await page.locator('#previewContent').innerText();
    if (dailyPreviewText.includes('YETI-PHASE3-QA') || dailyPreviewText.includes('Phase 3 UI Assurance') || dailyPreviewText.includes('Phase 3 automated verification remark.')) {
      throw new Error('Dynamic trial metadata or checklist remarks leaked into the original-PDF preview.');
    }
    const dailyPhotoPages=await page.locator('#previewContent .yeti-pdf-photo-page').count();
    if (dailyPhotoPages!==1 || !dailyPreviewText.includes('PHOTO EVIDENCE') || !dailyPreviewText.includes('phase3-daily-evidence.png') || !dailyPreviewText.includes('Wing root inspection: no visible cracks or deformation.')) throw new Error('Daily photo evidence is missing from the original-PDF preview. Photo pages: '+dailyPhotoPages+'; preview text: '+dailyPreviewText.slice(-500));
    await exportOriginalPdfDownload(page, '#pdfBtn', 'YETI_PHASE3_DAILY_QA');

    // Verify browser refresh preserves daily answers, metadata and IndexedDB photo evidence.
    await page.reload({waitUntil:'networkidle'});
    await page.locator('#dailyChecklistTabPanel').waitFor({state:'visible'});
    if (await page.locator('#uavNameId').inputValue() !== 'YETI-PHASE3-QA') throw new Error('Daily trial metadata was not preserved after refresh.');
    if (await page.locator('#list select[data-id="'+dailyItemId+'"][data-k="status"]').inputValue() !== 'Pass') throw new Error('Daily checklist result was not preserved after refresh.');
    if (await page.locator('#list input[data-id="'+dailyItemId+'"][data-k="remarks"]').inputValue() !== 'Phase 3 automated verification remark.') throw new Error('Daily checklist remarks were not preserved after refresh.');
    await page.locator('#photoThumbs img').first().waitFor({state:'visible'});

    // Loading-Unloading workflow.
    await page.locator('#loadingTabBtn').click();
    await page.locator('#loadingChecklistSection').waitFor({state:'visible'});
    await page.locator('#loadingList .loading-accordion').first().waitFor({state:'visible'});
    await page.locator('#loadingUavNameId').fill('YETI-LOAD-QA');
    await page.locator('#loadingFrom').fill('Origin Test Bay');
    await page.locator('#unloadingAt').fill('Destination Test Bay');
    await page.locator('#loadingDate').fill('2026-11-19');
    await page.locator('#loadingTime').fill('10:30');

    const loadingStatus = page.locator('#loadingList select[data-load-k="status"]').first();
    const loadingItemId = await loadingStatus.getAttribute('data-load-id');
    const loadingSection = loadingStatus.locator('xpath=ancestor::details[contains(@class,"loading-accordion")]');
    await loadingSection.locator('summary').click();
    await loadingStatus.selectOption({label:'Pass'});
    await page.locator('#loadingList input[data-load-id="'+loadingItemId+'"][data-load-k="remark"]').fill('Loading workflow QA remark.');

    const firstLoadingTitle = await page.locator('#loadingList .loading-item').first().innerText();
    const loadingSearchTerm = firstLoadingTitle.trim().split(/\s+/)[0];
    await page.locator('#loadingSearch').fill(loadingSearchTerm);
    if (await page.locator('#loadingList .loading-item').count() < 1) throw new Error('Loading checklist search did not return its matching item.');
    await page.locator('#loadingSearch').fill('');

    await page.locator('#loadingExpand').click();
    if (await page.locator('#loadingList details.loading-accordion[open]').count() < 1) throw new Error('Loading checklist Expand All did not open any section.');
    await page.locator('#loadingCollapse').click();
    if (await page.locator('#loadingList details.loading-accordion[open]').count() !== 0) throw new Error('Loading checklist Collapse All did not close every section.');

    const loadingTouchAction=await page.locator('#loadingSignaturePad').evaluate(el=>getComputedStyle(el).touchAction);
    if(loadingTouchAction!=='none')throw new Error('Loading signature canvas must disable browser touch gestures; got '+loadingTouchAction);
    await drawSignature(page, '#loadingSignaturePad');
    await page.locator('#clearLoadingSignature').click();
    const clearedLoadingPixels = await page.locator('#loadingSignaturePad').evaluate(el => {
      const data=el.getContext('2d').getImageData(0,0,el.width,el.height).data;
      let count=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)count++;return count;
    });
    if (clearedLoadingPixels !== 0) throw new Error('Clear Signature did not clear the Loading-Unloading signature pad.');

    await page.locator('#loadingGalleryPhotos').setInputFiles({name:'phase3-loading-evidence.png',mimeType:'image/png',buffer:tinyPng});
    await page.locator('#loadingPhotoThumbs img').first().waitFor({state:'visible'});
    if (!(await page.locator('#loadingPhotoStatus').innerText()).includes('1 photo(s) added')) throw new Error('Loading photo evidence was not saved and rendered.');

    await page.locator('#loadingPreviewBtn').click();
    await page.locator('#loadingPreviewContent .loading-print-document').waitFor({state:'attached'});
    const loadingPreviewText = await page.locator('#loadingPreviewContent').innerText();
    if (!loadingPreviewText.includes('YETI-LOAD-QA') || !loadingPreviewText.includes('Loading workflow QA remark.')) {
      throw new Error('Loading-Unloading preview did not include the entered metadata and checklist remarks.');
    }
    await exportPreview(page, '#loadingPdfBtn', 'Loading & Unloading Checklist', 'YETI_PHASE3_LOADING_QA');

    // Verify browser refresh preserves loading answers and evidence.
    await page.reload({waitUntil:'networkidle'});
    await page.locator('#loadingChecklistSection').waitFor({state:'visible'});
    if (await page.locator('#loadingUavNameId').inputValue() !== 'YETI-LOAD-QA') throw new Error('Loading-Unloading metadata was not preserved after refresh.');
    if (await page.locator('#loadingList select[data-load-id="'+loadingItemId+'"][data-load-k="status"]').inputValue() !== 'Pass') throw new Error('Loading checklist result was not preserved after refresh.');
    if (await page.locator('#loadingList input[data-load-id="'+loadingItemId+'"][data-load-k="remark"]').inputValue() !== 'Loading workflow QA remark.') throw new Error('Loading checklist remarks were not preserved after refresh.');
    await page.locator('#loadingPhotoThumbs img').first().waitFor({state:'visible'});

    await page.locator('#flightTrialPreparationSopTab').click();
    await sop.waitFor({state:'visible'});

    if (pageErrors.length || consoleErrors.length || failedRequests.length) {
      throw new Error('Flight Preparation browser regression detected runtime or network errors.');
    }
    console.log('Flight Preparation regression passed: SOP, Daily Airworthiness, Loading-Unloading, checklist inputs, search, expand/collapse, signatures, photo evidence, previews, PDF print views and refresh persistence.');
  } catch (error) {
    console.error('[FLIGHT PREPARATION E2E FAILURE]', error.stack || error);
    console.error('[PAGE ERRORS]', JSON.stringify(pageErrors,null,2));
    console.error('[CONSOLE ERRORS]', JSON.stringify(consoleErrors,null,2));
    console.error('[FAILED REQUESTS]', JSON.stringify(failedRequests,null,2));
    if (page) {
      try { await page.screenshot({path:'/tmp/yeti-flight-preparation-failure.png',fullPage:true}); console.error('[SCREENSHOT] /tmp/yeti-flight-preparation-failure.png'); } catch (captureError) { console.error('[SCREENSHOT CAPTURE FAILED]',captureError.message); }
    }
    if (context && traceStarted) {
      try { await context.tracing.stop({path:'/tmp/yeti-flight-preparation-trace.zip'}); traceSaved=true; console.error('[TRACE] /tmp/yeti-flight-preparation-trace.zip'); } catch (traceError) { console.error('[TRACE CAPTURE FAILED]',traceError.message); }
    }
    process.exitCode=1;
  } finally {
    if (context && traceStarted && !traceSaved) await context.tracing.stop().catch(()=>{});
    if (browser) await browser.close();
    if (server) await new Promise(resolve=>server.close(resolve));
  }
})();
