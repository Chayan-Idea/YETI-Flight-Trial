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
  // Verify the original single-log workflow before testing multi-log mode.
  await page.locator('#flightPreparationTab').click();
  await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
  await page.locator('#propulsionAnalyzerTab').click();
  await page.locator('#propulsionLogCount').selectOption('1');
  await page.locator('#propulsionLogTypePicker input[value="thrust"]').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#propulsionLogUploadArea').waitFor({state:'visible'});
  const singleCsv='thrust,command_rpm,actual_rpm,dc_voltage_v,dc_current_a,motor_temperature_c,esc_temperature_c,acceleration_x,acceleration_y,acceleration_z\n100,1000,980,50,10,40,35,0.1,0.2,0.3\n110,1100,1080,50,11,41,36,0.2,0.3,0.4\n90,900,0,50,10,39,34,0.0,0.1,0.2\n';
  await page.locator('#propulsionCsvInput').setInputFiles({name:'single-thrust.csv',mimeType:'text/csv',buffer:Buffer.from(singleCsv)});
  await page.locator('#startPropulsionAnalysisBtn').click();
  await page.waitForTimeout(500);
  if(await page.locator('#confirmPropulsionMappingBtn').count()===0){const detail=await page.locator('.propulsion-mapping-card').last().innerText().catch(()=>'(no mapping card)');const upload=await page.locator('#propulsionUploadStatus').innerText().catch(()=>'(no upload status)');throw new Error('Single-log mapping panel was not created. Upload status: '+upload+'; panel: '+detail+'; page errors: '+pageErrors.join(' | '));}
  await page.locator('#confirmPropulsionMappingBtn').waitFor({state:'visible'});
  if(await page.locator('#confirmPropulsionMappingBtn').isDisabled())throw new Error('Single-log parameter mapping did not validate.');
  await page.locator('#confirmPropulsionMappingBtn').click();
  const electrical=page.locator('.propulsion-calculated-parameter[data-parameter-key="electricalPower"]');
  await electrical.locator('input[type="checkbox"]').check();
  await electrical.locator('button').filter({hasText:'Calculate and Add to Log file'}).click();
  const specific=page.locator('.propulsion-calculated-parameter[data-parameter-key="overallEfficiency"]');
  await specific.locator('input[type="checkbox"]').check();
  await specific.locator('button').filter({hasText:'Calculate and Add to Log file'}).click();
  await page.locator('#confirmDerivedParametersReady').check();
  await page.locator('#confirmFilteringSortingReady').check();
  const csvGenerate=page.locator('#propulsionDataFilteringCard button').filter({hasText:'Generate Filtered & Sorted CSV'});
  await csvGenerate.waitFor({state:'visible'});
  await csvGenerate.click();
  await page.locator('#proceedToParameterSummaryBtn').click();
  await page.locator('#proceedToGraphicalAnalysisBtn').click();
  await page.locator('#propulsionGraphicalAnalysisCard').waitFor({state:'visible'});
  const singleGraph=page.locator('#propulsionGraphicalAnalysisCard');
  await singleGraph.locator('select').nth(0).selectOption('2');
  await singleGraph.locator('select').nth(1).selectOption('0');
  await singleGraph.locator('button').filter({hasText:'Plot Graph'}).click();
  await singleGraph.locator('svg').waitFor({state:'visible'});
  // Switch to the common multi-log workflow after the single-log regression passes.
  await page.locator('#propulsionLogCount').selectOption('2');
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('#confirmCommonSetupBtn').click()]);
  if(new URL(page.url()).searchParams.get('logCount')!=='2')throw new Error('Common Analysis Setup selection was not retained after the full page refresh.');
  await page.locator('#propulsionMultiSetupCard').waitFor({state:'visible'});
  await page.locator('#propulsionMultiUploadControls').waitFor({state:'hidden'});
  if(await page.locator('#propulsionMultiUploadControls').isVisible())throw new Error('Multi-log upload controls must remain hidden until a test type is selected.');
  await page.locator('#propulsionMultiLogTypePicker input[value="thrust"]').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#propulsionMultiUploadControls').waitFor({state:'visible'});
  const selectedTypeCard=page.locator('#propulsionMultiLogTypePicker .propulsion-log-type-option').filter({has:page.locator('input[value="thrust"]')});
  if(!(await selectedTypeCard.evaluate(el=>el.classList.contains('is-selected'))))throw new Error('Selected Thrust Log option did not receive its full selected state.');
  await page.locator('#identifyMultipleLogsBtn').waitFor({state:'hidden'});
  const csvA='thrust,command_rpm,actual_rpm,dc_voltage_v,dc_current_a\n100,1000,980,50,10\n110,1100,1080,50,11\n90,900,0,50,10\n';
  const csvB='thrust,command_rpm,actual_rpm,dc_voltage_v,dc_current_a\n200,1500,1480,60,12\n210,1600,1580,60,13\n190,1400,-10,60,12\n';
  const uploads=page.locator('#propulsionMultiUploadGrid input[type="file"]');
  await uploads.nth(0).setInputFiles({name:'run-a.csv',mimeType:'text/csv',buffer:Buffer.from(csvA)});
  await page.locator('#identifyMultipleLogsBtn').waitFor({state:'hidden'});
  await uploads.nth(1).setInputFiles({name:'run-b.csv',mimeType:'text/csv',buffer:Buffer.from(csvB)});
  await page.locator('#identifyMultipleLogsBtn').waitFor({state:'visible'});
  await page.locator('#identifyMultipleLogsBtn').click();
  await page.locator('#confirmAllMultiLogMappingsBtn').waitFor({state:'visible'});
  const mappingTables=page.locator('.propulsion-multi-mapping-unified');
  const assertMappingFits=async(label)=>{
   const dimensions=await page.evaluate(()=>{
    const table=document.querySelector('.propulsion-multi-mapping-table-wrap');
    const grid=document.querySelector('.propulsion-multi-mapping-unified');
    return {viewport:document.documentElement.clientWidth,document:document.documentElement.scrollWidth,wrapper:table?.clientWidth,wrapperScroll:table?.scrollWidth,table:grid?.clientWidth,tableScroll:grid?.scrollWidth,selects:[...document.querySelectorAll('.propulsion-multi-mapping-unified select')].map(el=>({width:el.clientWidth,scroll:el.scrollWidth}))};
   });
   if(dimensions.document>dimensions.viewport+1||dimensions.wrapperScroll>dimensions.wrapper+1||dimensions.tableScroll>dimensions.table+1)throw new Error(label+' parameter table causes horizontal overflow: '+JSON.stringify(dimensions));
   if(dimensions.selects.some(item=>item.width===0||item.width>0&&item.scroll>item.width+2))throw new Error(label+' mapping selector overflows its cell: '+JSON.stringify(dimensions.selects));
  };
  await assertMappingFits('2-log');
  if(await mappingTables.count()!==1)throw new Error('All uploaded logs must be represented in one unified parameter-identification table.');
  if(await mappingTables.locator('tbody tr').count()!==10)throw new Error('The unified Thrust table should contain all 10 applicable parameter rows exactly once.');
  if(await mappingTables.locator('thead tr:first-child th').count()!==4)throw new Error('The unified table should show Parameter Group, Parameter and one grouped header per uploaded log.');
  if(await mappingTables.locator('thead tr:nth-child(2) th').count()!==2)throw new Error('Each uploaded log should have exactly one CSV mapping sub-column and no auto-detection status column.');
  if(await mappingTables.locator('tbody tr:first-child td, tbody tr:first-child th').count()!==4)throw new Error('The first parameter row should contain one group cell, one parameter cell and one mapping cell per uploaded log.');
  const groupStructure=await mappingTables.locator('tbody .propulsion-multi-mapping-group').evaluateAll(cells=>({names:cells.map(cell=>cell.textContent.trim()),spans:cells.map(cell=>Number(cell.rowSpan)),rowCount:cells[0]?.closest('tbody')?.rows.length||0}));
  if(new Set(groupStructure.names).size!==groupStructure.names.length||groupStructure.spans.some(span=>span<2)||groupStructure.spans.reduce((sum,span)=>sum+span,0)!==groupStructure.rowCount)throw new Error('Parameter groups must appear once each and span exactly their associated parameter rows: '+JSON.stringify(groupStructure));
   if(await mappingTables.locator('.propulsion-multi-mapping-status').count()!==0)throw new Error('Auto-detection status cells must not appear in the unified mapping table.');
  if(await mappingTables.locator('select[data-log-index="0"]').count()!==10||await mappingTables.locator('select[data-log-index="1"]').count()!==10)throw new Error('Every parameter should have an independent CSV mapping selector for each uploaded log.');
  if(await page.locator('.propulsion-multi-log-mapping').count()!==0)throw new Error('Separate vertically stacked per-log mapping cards should not be rendered.');
  if(await page.locator('#confirmAllMultiLogMappingsBtn').isDisabled())throw new Error('Default parameter mapping did not validate for both sample logs.');
  await page.locator('#confirmAllMultiLogMappingsBtn').click();
  const step3Card=page.locator('#propulsionPhase3AnalysisCard'),step4Card=page.locator('#propulsionPhase4GraphCard'),step5Card=page.locator('#propulsionPhase4ReportCard');
  await step5Card.waitFor({state:'visible'});
  if(await step3Card.locator('#propulsionPhase4GraphCard, #propulsionPhase4ReportCard').count()!==0)throw new Error('Steps 04 and 05 must not be nested inside Step 03.');
  if(await step3Card.evaluate(el=>el.parentElement)!==await step4Card.evaluate(el=>el.parentElement)||await step4Card.evaluate(el=>el.parentElement)!==await step5Card.evaluate(el=>el.parentElement))throw new Error('Steps 03, 04 and 05 must be separate sibling cards in the workflow.');

  if(await step3Card.locator('.propulsion-phase3-log-card').count()!==0)throw new Error('Individual per-log filtering cards must be removed from multi-log Step 03.');
  if(await step3Card.getByText('Apply Data Filtering',{exact:true}).count()!==0)throw new Error('Individual Apply Data Filtering buttons must not appear in multi-log Step 03.');
  if(await step3Card.getByText('SORT BY',{exact:true}).count()!==0||await step3Card.getByText('ORDER',{exact:true}).count()!==0)throw new Error('Sort By and Order controls must be removed from multi-log Step 03.');
  const sharedDerivedCards=step3Card.locator('.propulsion-step-subsection--derived .propulsion-calculated-parameter');
  if(await sharedDerivedCards.count()!==2)throw new Error('Thrust multi-log mode must show exactly one shared Electrical Power and Specific Thrust selection.');
  const sharedElectrical=sharedDerivedCards.nth(0).locator('input[type="checkbox"]');
  const sharedSpecific=sharedDerivedCards.nth(1).locator('input[type="checkbox"]');
  await sharedElectrical.check();await sharedSpecific.check();
  const calculateElectrical=sharedDerivedCards.nth(0).locator('button').filter({hasText:'Calculate and Add to All logs'});
  const calculateSpecific=sharedDerivedCards.nth(1).locator('button').filter({hasText:'Calculate and Add to All logs'});
  if(await calculateElectrical.isDisabled()||await calculateSpecific.isDisabled())throw new Error('Checking a shared derived parameter must immediately enable its Calculate and Add to All logs action.');
  await calculateElectrical.click();
  const electricalCard=sharedDerivedCards.nth(0);
  await electricalCard.locator('.propulsion-calculated-added-status').waitFor({state:'visible'});
  await electricalCard.locator('.propulsion-calculated-retry').waitFor({state:'visible'});
  await electricalCard.locator('.propulsion-calculated-retry').click();
  if(!(await calculateElectrical.isVisible())||!(await calculateElectrical.isDisabled()))throw new Error('Retry must restore the unchecked Calculate and Add to All logs action.');
  await electricalCard.locator('input[type="checkbox"]').check();await calculateElectrical.click();
  await electricalCard.locator('.propulsion-calculated-added-status').waitFor({state:'visible'});
  await calculateSpecific.click();
  const specificCard=sharedDerivedCards.nth(1);
  await specificCard.locator('.propulsion-calculated-added-status').waitFor({state:'visible'});
  await specificCard.locator('.propulsion-calculated-retry').waitFor({state:'visible'});
  const csvSection=step3Card.locator('.propulsion-step-subsection--csv');
  await csvSection.getByText('CSV Generation with Filtered & Sorted Data').waitFor();
  await csvSection.locator('#confirmMultiDerivedParametersReady').check();
  await csvSection.locator('#confirmMultiFilteringSortingReady').check();
  const generateCsv=csvSection.locator('button').filter({hasText:'Generate Filtered & Sorted CSV'});
  await generateCsv.waitFor({state:'visible'});await generateCsv.click();
  await csvSection.getByText(/Consolidated CSV prepared successfully: 4 data rows from 2 logs/).waitFor();
  await csvSection.locator('button').filter({hasText:'Download Filtered & Sorted CSV'}).waitFor({state:'visible'});
  const multiPreviewToggle=csvSection.locator('button').filter({hasText:'Show Generated CSV Preview'});await multiPreviewToggle.waitFor({state:'visible'});await multiPreviewToggle.click();
  await csvSection.locator('.propulsion-generated-csv-preview').waitFor({state:'visible'});
  if(await csvSection.locator('.propulsion-csv-preview-table tbody tr').count()===0)throw new Error('Generated multi-log CSV preview did not display its rows.');
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

  // Verify the same unified mapping-table layout for 3-log and 4-log analysis.
  for (const count of [3,4]) {
   await page.locator('#propulsionLogCount').selectOption(String(count));
   await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('#confirmCommonSetupBtn').click()]);
   await page.locator('#propulsionMultiSetupCard').waitFor({state:'visible'});
   await page.locator('#propulsionMultiLogTypePicker input[value="thrust"]').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
   const multiUploads=page.locator('#propulsionMultiUploadGrid input[type="file"]');
   if(await multiUploads.count()!==count)throw new Error(count+'-log mode did not render the requested number of CSV upload slots.');
   for(let index=0;index<count;index++){
    const csv='thrust,command_rpm,actual_rpm,dc_voltage_v,dc_current_a\n'+(100+index*10)+',1000,980,50,10\n'+(110+index*10)+',1100,1080,50,11\n';
    await multiUploads.nth(index).setInputFiles({name:'run-'+count+'-'+(index+1)+'.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
   }
   await page.locator('#identifyMultipleLogsBtn').waitFor({state:'visible'});
   await page.locator('#identifyMultipleLogsBtn').click();
   await page.locator('#confirmAllMultiLogMappingsBtn').waitFor({state:'visible'});
   const unified=page.locator('.propulsion-multi-mapping-unified');
   await assertMappingFits(count+'-log');
   if(await unified.count()!==1)throw new Error(count+'-log mode must render exactly one unified parameter-identification table.');
   if(await unified.locator('thead tr:first-child th').count()!==count+2)throw new Error(count+'-log table must contain Parameter Group, Parameter and one grouped header per log.');
   if(await unified.locator('thead tr:nth-child(2) th').count()!==count)throw new Error(count+'-log table must contain exactly one CSV mapping column per log.');
   if(await unified.locator('tbody tr').count()!==10)throw new Error(count+'-log Thrust table must contain all 10 applicable parameter rows.');
   if(await unified.locator('tbody tr:first-child td, tbody tr:first-child th').count()!==count+2)throw new Error(count+'-log first parameter row must contain one group cell, one parameter cell and one mapping cell per log.');
   const groupStructure=await unified.locator('tbody .propulsion-multi-mapping-group').evaluateAll(cells=>({names:cells.map(cell=>cell.textContent.trim()),spans:cells.map(cell=>Number(cell.rowSpan)),rowCount:cells[0]?.closest('tbody')?.rows.length||0}));
   if(new Set(groupStructure.names).size!==groupStructure.names.length||groupStructure.spans.some(span=>span<2)||groupStructure.spans.reduce((sum,span)=>sum+span,0)!==groupStructure.rowCount)throw new Error(count+'-log parameter groups must appear once each and span exactly their associated rows: '+JSON.stringify(groupStructure));
   for(let index=0;index<count;index++){
    if(await unified.locator('select[data-log-index="'+index+'"]').count()!==10)throw new Error(count+'-log table is missing independent selectors for Log '+(index+1)+'.');
   }
   if(await unified.locator('.propulsion-multi-mapping-status').count()!==0)throw new Error(count+'-log table must not show the removed auto-detection status column.');
   if(await page.locator('#confirmAllMultiLogMappingsBtn').isDisabled())throw new Error(count+'-log default mappings did not validate.');
   await page.locator('#confirmAllMultiLogMappingsBtn').click();
   const multiStep3=page.locator('#propulsionPhase3AnalysisCard');await multiStep3.waitFor({state:'visible'});
   if(await multiStep3.locator('.propulsion-phase3-log-card, button:has-text("Apply Data Filtering")').count()!==0)throw new Error(count+'-log mode must not render individual filtering cards or buttons.');
   await multiStep3.locator('.propulsion-step-subsection--csv').getByText('CSV Generation with Filtered & Sorted Data').waitFor();
  }
  await page.locator('#propulsionAnalyzerTab').click();
  await page.locator('#flightPreparationTab').click();
  await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
  if(pageErrors.length)throw new Error('Browser runtime errors: '+pageErrors.join(' | '));
  console.log('Propulsion analyzer browser E2E passed: 2-log upload, independent mapping, RPM filtering, comparative graph with secondary Y axis, report generation and PDF print view.');
 } catch(error) { console.error(error);process.exitCode=1; }
 finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
})();
