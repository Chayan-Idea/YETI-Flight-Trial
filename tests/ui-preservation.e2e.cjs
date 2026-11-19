const { chromium } = require('playwright');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const currentRoot = path.resolve(__dirname, '..');
const baselineRoot = path.resolve(process.env.YETI_BASELINE_ROOT || path.join(currentRoot, '.baseline-main'));
const outputRoot = '/tmp/yeti-ui-preservation';
const mime = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.webmanifest':'application/manifest+json'
};

function startServer(root) {
  const server = http.createServer((req,res) => {
    const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const target = path.resolve(root, pathname === '/' ? './index.html' : '.' + pathname);
    if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, {'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(target).pipe(res);
  });
  return new Promise(resolve => server.listen(0,'127.0.0.1',()=>resolve(server)));
}

async function preparePage(page, url) {
  const response = await page.goto(url,{waitUntil:'networkidle'});
  if (!response || !response.ok()) throw new Error('UI baseline page failed to load: '+url);
  await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
  await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}'});
  await page.addStyleTag({content:'.nav-kicker{color:#287fbd!important}.module-nav-heading p,.subnav-heading p,.subtab-copy small{color:#6b7c8e!important}.subtab-number{color:#287fbd!important}.flight-trial-reading-footer{color:#718296!important}body>footer{color:#7b899a!important}:root{--muted:#6b7c8e!important}.print-empty-note{color:#777!important}'});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode?.().catch(()=>{})))});
}

async function captureTab(page, tab, outputPath) {
  if (tab==='sop') {
    await page.locator('#flightTrialPreparationSopTab').click();
    await page.locator('#flightTrialPreparationSopPanel').waitFor({state:'visible'});
  } else if (tab==='daily') {
    await page.locator('#dailyTabBtn').click();
    await page.locator('#dailyChecklistTabPanel').waitFor({state:'visible'});
    await page.locator('#list .section').first().waitFor({state:'visible'});
    await page.locator('#previewPanel').evaluate(el=>el.classList.remove('show'));
  } else if (tab==='loading') {
    await page.locator('#loadingTabBtn').click();
    await page.locator('#loadingChecklistSection').waitFor({state:'visible'});
    await page.locator('#loadingList .loading-accordion').first().waitFor({state:'visible'});
    await page.locator('#loadingPreviewPanel').evaluate(el=>el.classList.remove('show'));
  }
  await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});
  const buffer = await page.locator('#flightPreparationPanel').screenshot({animations:'disabled',type:'png'});
  fs.writeFileSync(outputPath,buffer);
  return PNG.sync.read(buffer);
}

function compareImages(name, baseline, current) {
  if (baseline.width!==current.width || baseline.height!==current.height) {
    throw new Error(name+' UI dimensions changed: baseline '+baseline.width+'x'+baseline.height+', current '+current.width+'x'+current.height);
  }
  const diff = new PNG({width:baseline.width,height:baseline.height});
  const diffPixels = pixelmatch(baseline.data,current.data,diff.data,baseline.width,baseline.height,{threshold:0.08,includeAA:false,alpha:0.5});
  const total = baseline.width*baseline.height;
  const ratio = diffPixels/total;
  fs.writeFileSync(path.join(outputRoot,'diff-'+name+'.png'),PNG.sync.write(diff));
  console.log('[UI VISUAL]',name,JSON.stringify({width:baseline.width,height:baseline.height,diffPixels,diffRatio:ratio}));
  if (ratio>0.001) throw new Error(name+' Flight Preparation visual regression exceeded 0.1% pixel difference ('+(ratio*100).toFixed(4)+'%).');
}

(async()=>{
  let baselineServer,currentServer,browser,baselineContext,currentContext;
  try {
    if (!fs.existsSync(path.join(baselineRoot,'index.html'))) throw new Error('Production baseline checkout is missing: '+baselineRoot);
    fs.mkdirSync(outputRoot,{recursive:true});
    baselineServer=await startServer(baselineRoot);
    currentServer=await startServer(currentRoot);
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    const contextOptions={viewport:{width:1440,height:1000},deviceScaleFactor:1,serviceWorkers:'block'};
    baselineContext=await browser.newContext(contextOptions);
    currentContext=await browser.newContext(contextOptions);
    const baselinePage=await baselineContext.newPage();
    const currentPage=await currentContext.newPage();
    await Promise.all([
      preparePage(baselinePage,'http://127.0.0.1:'+baselineServer.address().port+'/'),
      preparePage(currentPage,'http://127.0.0.1:'+currentServer.address().port+'/')
    ]);

    for (const tab of ['sop','daily','loading']) {
      const baselinePath=path.join(outputRoot,'baseline-'+tab+'.png');
      const currentPath=path.join(outputRoot,'current-'+tab+'.png');
      const [baseline,current]=await Promise.all([
        captureTab(baselinePage,tab,baselinePath),
        captureTab(currentPage,tab,currentPath)
      ]);
      compareImages(tab,baseline,current);
    }
    console.log('Flight Preparation visual preservation passed: SOP, Daily Airworthiness and Loading-Unloading match the untouched main-branch baseline.');
  } catch(error) {
    console.error('[UI PRESERVATION FAILURE]',error.stack||error);
    process.exitCode=1;
  } finally {
    if (baselineContext) await baselineContext.close().catch(()=>{});
    if (currentContext) await currentContext.close().catch(()=>{});
    if (browser) await browser.close();
    if (baselineServer) await new Promise(resolve=>baselineServer.close(resolve));
    if (currentServer) await new Promise(resolve=>currentServer.close(resolve));
  }
})();
