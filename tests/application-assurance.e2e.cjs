const { chromium, firefox, webkit } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const axePath = require.resolve('axe-core/axe.min.js');
const mime = {
  '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.webmanifest':'application/manifest+json'
};

function startServer() {
  const server=http.createServer((req,res)=>{
    const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const target=path.resolve(root,pathname==='/'?'./index.html':'.'+pathname);
    if(!target.startsWith(root)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){
      res.writeHead(404);res.end('Not found');return;
    }
    res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(target).pipe(res);
  });
  return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server)));
}

async function runAxe(page,label) {
  const results=await page.evaluate(async()=>await window.axe.run(document,{
    runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}
  }));
  const blocking=results.violations.filter(item=>item.impact==='critical'||item.impact==='serious');
  console.log('[ACCESSIBILITY]',label,JSON.stringify({
    passes:results.passes.length,
    incomplete:results.incomplete.length,
    moderateOrMinor:results.violations.filter(item=>item.impact==='moderate'||item.impact==='minor').map(item=>({id:item.id,impact:item.impact,nodes:item.nodes.length})),
    blocking:blocking.map(item=>({id:item.id,impact:item.impact,help:item.help,targets:item.nodes.map(node=>node.target)}))
  }));
  if(blocking.length)throw new Error(label+' has '+blocking.length+' critical/serious WCAG accessibility violations.');
}

async function checkResponsive(page,baseUrl) {
  for(const width of [360,390,768,1024,1440]) {
    await page.setViewportSize({width,height:900});
    await page.locator('#flightPreparationTab').click();
    await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
    for(const [subtab,panel] of [['flightTrialPreparationSopTab','flightTrialPreparationSopPanel'],['dailyTabBtn','dailyChecklistTabPanel'],['loadingTabBtn','loadingChecklistSection']]) {
      await page.locator('#'+subtab).click();
      await page.locator('#'+panel).waitFor({state:'visible'});
      const dims=await page.evaluate(()=>({
        viewport:window.innerWidth,
        document:document.documentElement.scrollWidth,
        body:document.body.scrollWidth,
        panel:(()=>{const el=document.querySelector('[id$="Panel"]:not([hidden])');const r=el?.getBoundingClientRect();return r?{left:r.left,right:r.right,width:r.width}:null})(),
        overflowingElements:[...document.querySelectorAll('body *')].map(el=>{const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return {tag:el.tagName,id:el.id,className:typeof el.className==='string'?el.className:'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,overflowX:cs.overflowX}}).filter(x=>x.width>0&&x.right>window.innerWidth+2&&x.overflowX!=='auto'&&x.overflowX!=='scroll').slice(0,20)
      }));
      if(dims.document>dims.viewport+2||dims.body>dims.viewport+2) {
        throw new Error('Unexpected page-level horizontal overflow at '+width+'px in Flight Preparation '+subtab+': '+JSON.stringify(dims));
      }
    }
    await page.locator('#propulsionAnalyzerTab').click();
    await page.locator('#propulsionAnalyzerPanel').waitFor({state:'visible'});
    const analyzerDims=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
    if(analyzerDims.document>analyzerDims.viewport+2||analyzerDims.body>analyzerDims.viewport+2)throw new Error('Unexpected page-level horizontal overflow at '+width+'px in Propulsion Analyzer: '+JSON.stringify(analyzerDims));
  }
  await page.setViewportSize({width:1440,height:900});
  await page.locator('#flightPreparationTab').click();
  await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
}

async function crossBrowserSmoke(browserType,name,baseUrl,runA11y=false) {
  const launchOptions={headless:true};
  if(name==='chromium')launchOptions.args=['--no-sandbox'];
  const browser=await browserType.launch(launchOptions);
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  let page;
  page=await context.newPage();
  page.setDefaultTimeout(12000);
  const errors=[],externalRequests=[],failedRequests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{
    const url=new URL(request.url());
    if((url.protocol==='http:'||url.protocol==='https:')&&url.origin!==new URL(baseUrl).origin)externalRequests.push(request.url());
  });
  page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText||'request failed'}));
  try {
    const response=await page.goto(baseUrl+'/',{waitUntil:'networkidle'});
    if(!response||!response.ok())throw new Error(name+' failed to load the application shell.');
    await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
    const timing=await page.evaluate(()=>{
      const nav=performance.getEntriesByType('navigation')[0];
      const fcp=performance.getEntriesByName('first-contentful-paint')[0];
      return {domContentLoaded:nav?.domContentLoadedEventEnd||0,load:nav?.loadEventEnd||0,firstContentfulPaint:fcp?.startTime||0};
    });
    if(timing.load>10000||timing.domContentLoaded>8000)throw new Error(name+' exceeded application startup performance budget: '+JSON.stringify(timing));

    await page.locator('#propulsionAnalyzerTab').click();
    await page.locator('#propulsionAnalyzerPanel').waitFor({state:'visible'});
    await page.locator('#flightPreparationTab').click();
    await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
    await page.locator('#flightTrialPreparationSopTab').click();
    await page.locator('#flightTrialPreparationSopPanel').waitFor({state:'visible'});
    await page.locator('#dailyTabBtn').click();
    await page.locator('#dailyChecklistTabPanel').waitFor({state:'visible'});
    await page.locator('#loadingTabBtn').click();
    await page.locator('#loadingChecklistSection').waitFor({state:'visible'});
    await page.locator('#flightTrialPreparationSopTab').click();

    if(externalRequests.length)throw new Error(name+' made unexpected third-party network requests: '+JSON.stringify(externalRequests));
    if(failedRequests.length)throw new Error(name+' had failed same-origin requests: '+JSON.stringify(failedRequests));
    if(errors.length)throw new Error(name+' reported browser runtime/console errors: '+JSON.stringify(errors));
    console.log('[CROSS-BROWSER PASS]',name,JSON.stringify(timing));

    if(runA11y) {
      await page.addScriptTag({path:axePath});
      await runAxe(page,'Flight Preparation SOP');
      await page.locator('#dailyTabBtn').click();
      await page.locator('#dailyChecklistTabPanel').waitFor({state:'visible'});
      await runAxe(page,'Daily Airworthiness');
      await page.locator('#loadingTabBtn').click();
      await page.locator('#loadingChecklistSection').waitFor({state:'visible'});
      await runAxe(page,'Loading-Unloading');
      await page.locator('#propulsionAnalyzerTab').click();
      await page.locator('#propulsionAnalyzerPanel').waitFor({state:'visible'});
      await runAxe(page,'Propulsion Analyzer');
    }
    if(name==='chromium')await checkResponsive(page,baseUrl);
  } catch(error) {
    if(page)try{await page.screenshot({path:'/tmp/yeti-assurance-'+name+'-failure.png',fullPage:true});}catch(_){}
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function offlineShellCheck(baseUrl) {
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  try {
    await page.goto(baseUrl+'/',{waitUntil:'networkidle'});
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.reload({waitUntil:'networkidle'});
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:15000});
    await context.setOffline(true);
    const response=await page.reload({waitUntil:'domcontentloaded',timeout:15000});
    if(!response||!response.ok())throw new Error('Offline reload did not return the cached application shell.');
    await page.locator('#flightPreparationTab').waitFor({state:'visible'});
    await page.locator('#propulsionAnalyzerTab').click();
    await page.locator('#propulsionAnalyzerPanel').waitFor({state:'visible'});
    await page.locator('#flightPreparationTab').click();
    await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
    console.log('[OFFLINE PASS] Service-worker cached shell, styles and scripts remained operational after network loss.');
  } catch(error) {
    try{await page.screenshot({path:'/tmp/yeti-assurance-offline-failure.png',fullPage:true});}catch(_){}
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

async function xssContentCheck(baseUrl) {
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  try {
    await page.goto(baseUrl+'/',{waitUntil:'networkidle'});
    await page.locator('#dailyTabBtn').click();
    await page.locator('#dailyChecklistTabPanel').waitFor({state:'visible'});
    const payload='<img src=x onerror="window.__yetiXssTriggered=true">';
    await page.locator('#uavNameId').fill(payload);
    await page.locator('#previewBtn').click();
    await page.locator('#previewContent .print-document').waitFor({state:'attached'});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const result=await page.evaluate(()=>({
      triggered:window.__yetiXssTriggered===true,
      injectedImages:document.querySelectorAll('#previewContent img[src="x"]').length,
      renderedText:document.querySelector('#previewContent')?.innerText||''
    }));
    if(result.triggered||result.injectedImages!==0||!result.renderedText.includes(payload)) {
      throw new Error('User-supplied checklist metadata was not safely rendered as text: '+JSON.stringify(result));
    }
    console.log('[SECURITY PASS] HTML-like user content remained inert text in the generated preview.');
  } catch(error) {
    try{await page.screenshot({path:'/tmp/yeti-assurance-xss-failure.png',fullPage:true});}catch(_){}
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

(async()=>{
  let server;
  try {
    server=await startServer();
    const baseUrl='http://127.0.0.1:'+server.address().port;
    await crossBrowserSmoke(chromium,'chromium',baseUrl,true);
    await crossBrowserSmoke(firefox,'firefox',baseUrl,false);
    await crossBrowserSmoke(webkit,'webkit',baseUrl,false);
    await offlineShellCheck(baseUrl);
    await xssContentCheck(baseUrl);
    console.log('Application assurance passed: Chromium, Firefox, WebKit, responsive layouts, accessibility, offline shell, third-party request isolation, performance budget and inert user-content rendering.');
  } catch(error) {
    console.error('[APPLICATION ASSURANCE FAILURE]',error.stack||error);
    process.exitCode=1;
  } finally {
    if(server)await new Promise(resolve=>server.close(resolve));
  }
})();
