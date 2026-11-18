const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webmanifest':'application/manifest+json' };
const server = http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const target = path.resolve(root, pathname === '/' ? './index.html' : '.' + pathname);
  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) { res.writeHead(404);res.end('Not found');return; }
  res.writeHead(200, {'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});
  fs.createReadStream(target).pipe(res);
});
(async()=>{
 let browser;
 try {
  await new Promise(resolve=>server.listen(4173,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();
  const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  await page.locator('#flightPreparationTab').click();
  await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
  await page.locator('#propulsionAnalyzerTab').click();
  await page.locator('#propulsionLogCount').selectOption('1');
  await page.locator('.propulsion-upload-card').first().waitFor({state:'visible'});
  await page.locator('#propulsionLogCount').selectOption('2');
  await page.locator('#propulsionMultiLogTypePicker input[value="thrust"]').check({force:true});
  const csvA='thrust,command_rpm,actual_rpm,dc_voltage_v,dc_current_a\n100,1000,980,50,10\n110,1100,1080,50,11\n90,900,0,50,10\n';
  const csvB='thrust,command_rpm,actual_rpm,dc_voltage_v,dc_current_a\n200,1500,1480,60,12\n210,1600,1580,60,13\n190,1400,-10,60,12\n';
  const uploads=page.locator('#propulsionMultiUploadGrid input[type="file"]');
  await uploads.nth(0).setInputFiles({name:'run-a.csv',mimeType:'text/csv',buffer:Buffer.from(csvA)});
  await uploads.nth(1).setInputFiles({name:'run-b.csv',mimeType:'text/csv',buffer:Buffer.from(csvB)});
  await page.locator('#identifyMultipleLogsBtn').click();
  await page.locator('#confirmAllMultiLogMappingsBtn').waitFor({state:'visible'});
  if(await page.locator('#confirmAllMultiLogMappingsBtn').isDisabled())throw new Error('Default parameter mapping did not validate for both sample logs.');
  await page.locator('#confirmAllMultiLogMappingsBtn').click();
  const applyButtons=page.locator('.propulsion-phase3-log-card button');
  if(await applyButtons.count()!==2)throw new Error('Expected one independent processing action per log.');
  const derivedChecks=page.locator('.propulsion-phase3-log-card .propulsion-phase3-derived-option input');
  await derivedChecks.nth(0).check();
  await applyButtons.nth(0).click();
  await derivedChecks.nth(2).check();
  await applyButtons.nth(1).click();
  const resultSummaries=page.locator('.propulsion-phase3-result');
  if(!(await resultSummaries.nth(0).innerText()).includes('2 data rows retained')||!(await resultSummaries.nth(1).innerText()).includes('2 data rows retained'))throw new Error('Independent RPM filtering did not retain the expected two data rows per log.');
  await page.locator('#multiGraphSecondaryYAxis').selectOption('commandRpm');
  await page.locator('.propulsion-phase3-graph-card button').filter({hasText:'Plot Comparative Graph'}).click();
  await page.locator('.propulsion-phase3-plot-host svg').waitFor({state:'visible'});
  const graphAria=await page.locator('.propulsion-phase3-plot-host svg').getAttribute('aria-label');
  if(!graphAria.includes('and commandRpm'))throw new Error('Secondary Y-axis was not applied to the comparative graph.');
  for(const [key,value] of Object.entries({motor:'Test Motor',esc:'Test ESC',propeller:'Test Propeller',date:'2026-11-18'}))await page.locator('#multiReport_'+key).fill(value);
  const exportButton=page.locator('#propulsionPhase4ReportCard button').filter({hasText:'Export Comparative Report as PDF'});
  if(await exportButton.isDisabled())throw new Error('Report export did not unlock after both logs were processed and required metadata was entered.');
  const popupPromise=page.waitForEvent('popup');await exportButton.click();const report=await popupPromise;
  await report.waitForLoadState('domcontentloaded');
  await report.getByText('YETI Propulsion Comparative Validation Report').waitFor();
  await report.getByText('run-a.csv').waitFor();await report.getByText('run-b.csv').waitFor();
  await page.locator('#propulsionAnalyzerTab').click();
  await page.locator('#flightPreparationTab').click();
  await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
  if(pageErrors.length)throw new Error('Browser runtime errors: '+pageErrors.join(' | '));
  console.log('Propulsion analyzer browser E2E passed: 2-log upload, independent mapping, RPM filtering, comparative graph with secondary Y axis, report generation and PDF print view.');
 } catch(error) { console.error(error);process.exitCode=1; }
 finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
})();
