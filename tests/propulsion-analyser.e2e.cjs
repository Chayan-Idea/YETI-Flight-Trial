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
  const pageErrors=[],consoleErrors=[],failedRequests=[],checkpoints=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('requestfailed',request=>failedRequests.push({url:request.url(),error:request.failure()?.errorText||'request failed'}));
  const checkpoint=name=>{checkpoints.push({name,url:page.url(),time:new Date().toISOString()});console.log('[E2E CHECKPOINT] '+name);};
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
  checkpoint('application shell loaded');
  // Exercise the single-log workflow first, then validate comparative report UI after multi-log data exists.


    await page.locator('#propulsionAnalyzerTab').click();
  checkpoint('propulsion analyzer opened');
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
  checkpoint('single-log mapping confirmed');
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
  checkpoint('multi-log parameter identification opened');
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
  await page.locator('#propulsionPhase3AnalysisCard').waitFor({state:'visible'});
  if(await page.locator('#propulsionPhase3AnalysisCard .propulsion-next-step-actions').count()!==1)throw new Error('Step 03 must render its continuation actions after mapping confirmation.');

  const step3Card=page.locator('#propulsionPhase3AnalysisCard'),step4Card=page.locator('#propulsionPhase4GraphCard'),step5Card=page.locator('#propulsionPhase4ReportCard');
  await step3Card.waitFor({state:'visible'});
  if(await step4Card.isVisible()||await step5Card.isVisible())throw new Error('Comparative summary, graph and report steps must remain hidden until the user proceeds from the preceding step.');
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
  await csvSection.getByText(/Successfully generated 2 separate CSV files/).waitFor();
  const generatedFiles=csvSection.locator('.propulsion-generated-csv-preview');
  if(await generatedFiles.count()!==2)throw new Error('2-log mode must generate two independent CSV result cards.');
  for(let index=0;index<2;index++){
   const fileCard=generatedFiles.nth(index);
   const downloadButton=fileCard.locator('button').filter({hasText:'Download CSV'});
   if(await downloadButton.count()!==1)throw new Error('Each generated log CSV must have its own download action.');
   if(!(await fileCard.locator('h3').innerText()).includes('run-'+(index===0?'a':'b')+'_filtered_sorted.csv'))throw new Error('Each generated CSV card must retain its corresponding source log filename.');
   if(!(await fileCard.locator('.propulsion-csv-preview-meta').innerText()).includes('filtered data rows'))throw new Error('Each generated CSV card must describe the filtered output rows.');
   const downloadPromise=page.waitForEvent('download');
   await downloadButton.click();
   const download=await downloadPromise;
   if(download.suggestedFilename()!=='run-'+(index===0?'a':'b')+'_filtered_sorted.csv')throw new Error('Generated CSV download filename does not match its source log.');
  }
  // Follow the real Step 03 -> Step 04 -> Step 05 navigation before interacting with hidden controls.
  const proceedInApp=step3Card.locator('.propulsion-next-step-actions button').filter({hasText:'Proceed with In App Analysis'});
  await proceedInApp.waitFor({state:'visible'});
  await proceedInApp.click();
  const multiSummary=page.locator('#propulsionMultiParameterSummaryCard');
  await multiSummary.waitFor({state:'visible'});
  const proceedToGraph=multiSummary.locator('button').filter({hasText:'Proceed to Graphical Analysis'});
  await proceedToGraph.waitFor({state:'visible'});
  await proceedToGraph.click();
  const multiGraph=page.locator('#propulsionPhase4GraphCard');
  await multiGraph.waitFor({state:'visible'});
  const xyRange=page.locator('.propulsion-phase3-range-panel');
  if(await xyRange.count()!==1)throw new Error('Comparative graph must provide the X-Y range selector.');
  if(await xyRange.isVisible())throw new Error('Comparative X-Y range selector must remain hidden before a graph is plotted.');
  if(await page.locator('#multiGraphSecondaryYAxis, .propulsion-phase3-series-controls, .propulsion-phase3-graph-controls input[type=number]').count()!==0)throw new Error('Comparative graph should expose only common X/Y selectors, not secondary axes, per-log toggles or manual range fields.');
  await page.locator('#multiGraphXAxis').selectOption('actualRpm');
  await page.locator('#multiGraphYAxis').selectOption('thrust');
  await page.locator('.propulsion-phase3-graph-card button').filter({hasText:'Plot Comparative Graph'}).click();
  await page.locator('.propulsion-phase3-plot-host svg').waitFor({state:'visible'});
  const graphAria=await page.locator('.propulsion-phase3-plot-host svg').getAttribute('aria-label');
  if(!graphAria.includes('actualRpm')||!graphAria.includes('thrust')||!graphAria.includes('2 logs superimposed'))throw new Error('Comparative graph did not superimpose all logs on the selected common X/Y axes.');
  if(await page.locator('.propulsion-phase3-explorer input[type=range]').count()!==1||await page.locator('.propulsion-phase3-explorer input[type=range]').isDisabled())throw new Error('Comparative graph slider did not enable for exploring plotted data points.');
  const graphPointerLayer=page.locator('.propulsion-phase3-plot-host svg rect[aria-label*="Touch or drag"]');
  if(await graphPointerLayer.count()!==1)throw new Error('Direct touch/mouse graph interaction layer was not rendered.');
  const graphBox=await graphPointerLayer.boundingBox();if(!graphBox)throw new Error('Graph interaction area has no measurable bounds.');
  await page.mouse.move(graphBox.x+graphBox.width*.7,graphBox.y+graphBox.height*.5);await page.mouse.down();await page.mouse.move(graphBox.x+graphBox.width*.8,graphBox.y+graphBox.height*.5);await page.mouse.up();
  if(!(await page.locator('.propulsion-phase3-explorer input[type=range]').inputValue()).length)throw new Error('Direct graph movement did not synchronize the point slider.');
  const commonSlider=page.locator('.propulsion-phase3-explorer input[type=range]');
  if(await commonSlider.getAttribute('max')!=='1000')throw new Error('Comparative slider must use one normalized common X-axis scale, not concatenated log point counts.');
  await commonSlider.fill('500');
  const perLogReadouts=page.locator('.propulsion-phase3-point-readout .propulsion-phase3-log-point-readout');
  if(await perLogReadouts.count()!==0)throw new Error('Per-log values should be rendered in a table, not separate line-style readout blocks.');
  const readoutTable=page.locator('.propulsion-phase3-readout-table');
  if(await readoutTable.count()!==1||await readoutTable.locator('tbody tr').count()!==2)throw new Error('Common X-axis slider must show every log in a structured table.');
  if(await readoutTable.locator('thead th').count()!==4)throw new Error('Per-log readout table must show only Log, File Name, X and Y columns.');
  const sliderStyle=await commonSlider.evaluate(el=>({width:getComputedStyle(el).width,marginLeft:getComputedStyle(el).marginLeft,appearance:getComputedStyle(el).appearance}));
  if(sliderStyle.appearance!=='auto')throw new Error('Comparative slider must use the shared native slider appearance.');
  await page.getByRole('button',{name:'Plot Comparative Graph'}).click();
  if(!(await xyRange.isVisible()))throw new Error('Comparative X-Y range selector must appear after graph plotting.');
  if(!(await xyRange.isVisible()))throw new Error('Comparative X-Y range selector must appear after graph plotting.');
  const explorerOrder=await page.locator('.propulsion-phase3-explorer').evaluate(el=>Array.from(el.children).map(child=>Array.from(child.classList)));
  const rangeOrderIndex=explorerOrder.findIndex(classes=>classes.includes('propulsion-phase3-range-panel'));
  const readoutOrderIndex=explorerOrder.findIndex(classes=>classes.includes('propulsion-phase3-point-readout'));
  if(rangeOrderIndex<0||readoutOrderIndex<0||rangeOrderIndex<readoutOrderIndex)throw new Error('Comparative X-Y range selector must appear below graph slider and readout.');

  for(const id of ['multiGraphXRangeStart','multiGraphXRangeEnd','multiGraphYRangeStart','multiGraphYRangeEnd'])if(await page.locator('#'+id).count()!==1)throw new Error('Missing comparative X-Y range input: '+id);
  if(await page.getByRole('button',{name:'Apply',exact:true}).count()<1||await page.getByRole('button',{name:'Reset Full Range'}).count()<1)throw new Error('Comparative X-Y range selector must provide Apply and Reset Full Range actions.');
  // Switching axes must discard the previous pair's numeric range and replot the newly selected parameters.
  await page.locator('#multiGraphYAxis').selectOption('electricalPower');
  await page.locator('.propulsion-phase3-graph-card button').filter({hasText:'Plot Comparative Graph'}).click();
  const changedGraph=page.locator('.propulsion-phase3-plot-host svg');
  await changedGraph.waitFor({state:'visible'});
  const changedGraphLabel=await changedGraph.getAttribute('aria-label');
  if(!changedGraphLabel.includes('actualRpm')||!changedGraphLabel.includes('electricalPower'))throw new Error('Plot Comparative Graph did not redraw after changing the Y-axis parameter.');
  const changedRange=await page.locator('#multiGraphYRangeStart').inputValue();
  if(!changedRange||!Number.isFinite(Number(changedRange)))throw new Error('Changing the Y-axis must initialise a fresh valid Y range for the newly selected parameter.');

    const graphSvg=page.locator('.propulsion-phase3-plot-host svg');
  const svgStyle=await graphSvg.evaluate(el=>({width:getComputedStyle(el).width,minWidth:getComputedStyle(el).minWidth}));
  if(svgStyle.minWidth!=='0px')throw new Error('Comparative graph must fit its viewport so the slider and graph share visible endpoints.');

  for(let index=0;index<2;index++){
   const entry=perLogReadouts.nth(index);
   if(!(await entry.innerText()).includes('X (')||!(await entry.innerText()).includes('Y ('))throw new Error('Each log readout must show its own X and Y values.');
  }
  if(!(await page.locator('.propulsion-phase3-common-x-readout').innerText()).includes('COMMON X AXIS'))throw new Error('Comparative slider readout must identify the shared X-axis position.');

  const multiReport=page.locator('#propulsionPhase4ReportCard');
  await multiReport.waitFor({state:'attached'});
  const reportInputTable=multiReport.locator('.propulsion-phase4-report-input-table');
  if(await reportInputTable.locator('thead th').count()!==3)throw new Error('Two-log report identification table must have one parameter column and one column per log.');
  if(await reportInputTable.locator('tbody tr').count()!==8)throw new Error('Comparative report must retain all eight existing identification fields for each log.');
  if(await multiReport.locator('#multiReport_commonObjective').count()!==1)throw new Error('Comparative report must have exactly one shared objective/manual entry field.');
  if(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-page').count()<2)throw new Error('Comparative report must render the live A4 cover and executive summary pages before optional report graphs are added.');
  if(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-brand-lockup').count()!==1)throw new Error('Comparative A4 cover must use the Single-Log ideaForge brand lockup.');
  if(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-accent-rule').count()!==1)throw new Error('Comparative A4 cover must use the Single-Log green and blue accent rule.');
  const comparativeSummary=multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-comparative-summary-table');
  if(await comparativeSummary.count()!==1)throw new Error('Comparative PDF must show one parameter-by-log executive summary table.');
  if(await comparativeSummary.locator('thead th').count()!==3)throw new Error('Executive summary table must contain a parameter column and one column for each log.');
  if(await comparativeSummary.locator('tbody tr').count()<6)throw new Error('Executive summary table must include all mapped comparative-summary parameters.');
  const summaryPage=multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-multi-summary-page');
  if(await summaryPage.count()!==1)throw new Error('All comparative executive summary parameters must fit on one A4 summary page.');
  const summaryTableBox=await comparativeSummary.boundingBox();
  const summaryPageBox=await summaryPage.boundingBox();
  if(!summaryTableBox||!summaryPageBox||summaryTableBox.height>summaryPageBox.height-55)throw new Error('Comparative executive summary table is too tall for its single-page A4 layout.');

  if(await comparativeSummary.locator('.propulsion-report-kpi-timestamp').count()!==await comparativeSummary.locator('tbody tr').count()*2)throw new Error('Every parameter/log table cell must include its maximum-value timestamp.');
  if(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-page-kicker').filter({hasText:'PER-LOG ANALYSIS'}).count()!==0)throw new Error('PDF preview must omit the separate per-log processing and derived-statistics pages.');
  const reportGraphX=multiReport.locator('#multiReportGraphXAxis'),reportGraphY=multiReport.locator('#multiReportGraphYAxis');
  if(await reportGraphX.count()!==1||await reportGraphY.count()!==1)throw new Error('Comparative report must have independent X/Y graph selectors.');
  if(await multiReport.locator('#addMultiReportGraphBtn').count()!==1)throw new Error('Comparative report must provide Add Graph to Report.');
  if(await multiReport.locator('#multiReportGraphCount').innerText()!=='0 of 5 graphs added')throw new Error('Comparative report graph counter must start at zero of five.');
  await reportGraphX.selectOption('actualRpm');await reportGraphY.selectOption('thrust');
  await multiReport.locator('#addMultiReportGraphBtn').click();
  if(await multiReport.locator('#multiReportGraphList .propulsion-report-graph-item').count()!==1)throw new Error('Adding a comparative report graph must create one removable graph entry.');
  if(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-graph-page .propulsion-report-graph-svg').count()!==1)throw new Error('The selected comparative report graph must appear in the live PDF preview.');
  const reportSvg=multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-graph-page .propulsion-report-graph-svg').first();
  const legendLabels=reportSvg.locator('text').filter({hasText:/^LOG [12] ·/});
  if(await legendLabels.count()!==2)throw new Error('Comparative report graph must show one legend label for each log.');
  const legendRects=reportSvg.locator('rect[rx="4"]');
  if(await legendRects.count()!==2)throw new Error('Comparative graph legend labels must have separate readable background areas placed by the blank-space layout algorithm.');
  const firstLegendBox=await legendRects.nth(0).boundingBox(),secondLegendBox=await legendRects.nth(1).boundingBox();
  if(firstLegendBox&&secondLegendBox&&firstLegendBox.x<secondLegendBox.x+secondLegendBox.width&&firstLegendBox.x+firstLegendBox.width>secondLegendBox.x&&firstLegendBox.y<secondLegendBox.y+secondLegendBox.height&&firstLegendBox.y+firstLegendBox.height>secondLegendBox.y)throw new Error('Comparative graph legend labels must not overlap one another.');
  if(firstLegendBox&&secondLegendBox){
   if(Math.abs(firstLegendBox.x-secondLegendBox.x)>1)throw new Error('Comparative graph legend labels must be grouped on the same horizontal alignment.');
   const verticalGap=Math.abs(firstLegendBox.y-secondLegendBox.y)-Math.max(firstLegendBox.height,secondLegendBox.height);
   if(verticalGap>4)throw new Error('Comparative graph legend labels must sit closely together without excessive vertical gaps.');
  }


  if(await multiReport.locator('#multiReportGraphCount').innerText()!=='1 of 5 graphs added')throw new Error('Comparative report graph counter must update after adding a graph.');
  if(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-graph-page .propulsion-report-graph-svg circle').count()<2)throw new Error('Added comparative report graph must contain plotted data points from the processed logs.');
  if(await multiReport.locator('#multiReportGraphList .propulsion-report-graph-item').count()!==1)throw new Error('Added comparative graph must appear in the report graph list.');
  if((await multiReport.locator('.propulsion-phase4-report-status').innerText()).includes('Unable to add graph:'))throw new Error('Adding a comparative report graph must not produce a runtime error.');


  await multiReport.locator('#multiReportGraphList button[aria-label="Remove report graph 1"]').click();
  if(await multiReport.locator('#multiReportGraphList .propulsion-report-graph-item').count()!==0||await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-graph-page').count()!==0)throw new Error('Removing a comparative report graph must also remove it from the live PDF preview.');

  if(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-comparative-cell-value').filter({hasText:/\\d/}).count()===0)throw new Error('Comparative PDF summary should refresh with numeric values after each log is processed.');

  if(await multiReport.locator('#multiPropulsionReportLivePreview').getByText('Rows retained',{exact:true}).count()!==0)throw new Error('PDF preview must omit per-log row-retention statistics.');


  if(!(await multiReport.locator('#multiPropulsionReportLivePreview .propulsion-report-inline-title').innerText()).includes('YETI Propulsion Bench Data Validation Report'))throw new Error('Comparative cover title must match the Single-Log report design.');

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
   const step3Actions=multiStep3.locator('.propulsion-next-step-actions');
   if(await step3Actions.count()!==1)throw new Error(count+'-log Step 03 must contain its continuation action area.');
   if(await step3Actions.isVisible())throw new Error(count+'-log continuation buttons must remain hidden until CSV generation succeeds.');

  }
  await page.locator('#propulsionAnalyzerTab').click();
  await page.locator('#flightPreparationTab').click();
  await page.locator('#flightPreparationPanel').waitFor({state:'visible'});
  if(pageErrors.length)throw new Error('Browser runtime errors: '+pageErrors.join(' | '));
  console.log('Propulsion analyzer browser E2E passed: 2-log upload, independent mapping, RPM filtering, comparative graph with secondary Y axis, report generation and PDF print view.');
 } catch(error) {
   console.error('[E2E FAILURE]',error.stack||error);
   console.error('[E2E CHECKPOINTS]',JSON.stringify(checkpoints,null,2));
   console.error('[BROWSER PAGE ERRORS]',JSON.stringify(pageErrors,null,2));
   console.error('[BROWSER CONSOLE ERRORS]',JSON.stringify(consoleErrors,null,2));
   console.error('[FAILED NETWORK REQUESTS]',JSON.stringify(failedRequests,null,2));
   if(page){
    try{await page.screenshot({path:'/tmp/yeti-browser-failure.png',fullPage:true});console.error('[SCREENSHOT] /tmp/yeti-browser-failure.png');}catch(captureError){console.error('[SCREENSHOT CAPTURE FAILED]',captureError.message);}
    try{console.error('[FAILED PAGE STATE]',JSON.stringify(await page.evaluate(()=>({url:location.href,title:document.title,visibleHeadings:[...document.querySelectorAll('h1,h2,h3')].filter(el=>el.getClientRects().length).map(el=>el.textContent.trim()).slice(-30),visibleAlerts:[...document.querySelectorAll('[role=alert]')].map(el=>el.textContent.trim()),visibleStatus:[...document.querySelectorAll('[role=status]')].map(el=>el.textContent.trim())})),null,2));}catch(stateError){console.error('[PAGE STATE CAPTURE FAILED]',stateError.message);}
   }
   process.exitCode=1;
  }
 finally { if(browser)await browser.close();await new Promise(resolve=>server.close(resolve)); }
})();
