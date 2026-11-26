const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const target=path.resolve(root,pathname==='/'?'./index.html':'.'+pathname);
 if(!target.startsWith(root)||!fs.existsSync(target)||fs.statSync(target).isDirectory()){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(target).pipe(res);
});
(async()=>{
 let browser;
 const errors=[];
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/',{waitUntil:'networkidle',timeout:60000});
  await page.waitForFunction(()=>!!window.XLSX&&!!window.YetiWorkbookImport,{timeout:30000});
  const workbookBase64=await page.evaluate(()=>{
   const wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Instructions'],['Do not analyse this worksheet']]),'Read Me');
   XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([
    ['thrust','command_rpm','actual_rpm','dc_voltage_v','dc_current_a','motor_temperature_c','esc_temperature_c','acceleration_x','acceleration_y','acceleration_z'],
    [100,1000,980,50,10,40,35,0.1,0.2,0.3],[110,1100,1080,50,11,41,36,0.2,0.3,0.4],[120,1200,1180,50,12,42,37,0.3,0.4,0.5]
   ]),'Thrust Data');
   return XLSX.write(wb,{bookType:'xlsx',type:'base64'});
  });
  const excelFile={name:'propulsion-run.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(workbookBase64,'base64')};
  await page.locator('#propulsionAnalyzerTab').click();
  await page.locator('#propulsionLogCount').selectOption('1');
  await page.locator('#confirmCommonSetupBtn').click();
  await page.locator('#propulsionLogTypePicker input[value="thrust"]').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#propulsionCsvInput').setInputFiles(excelFile);
  await page.locator('#propulsionExcelSheetPicker').waitFor({state:'visible'});
  const singleOptions=await page.locator('#propulsionExcelWorksheetSelect option').allTextContents();
  if(singleOptions.join('|')!=='Read Me|Thrust Data')throw new Error('Single-log Excel upload did not list all worksheet names: '+singleOptions.join(', '));
  await page.locator('#propulsionExcelWorksheetSelect').selectOption('Thrust Data');
  await page.locator('#propulsionExcelSheetPicker button').click();
  if(await page.locator('#startPropulsionAnalysisBtn').isDisabled())throw new Error('Selecting an Excel worksheet did not enable parameter identification.');
  await page.locator('#startPropulsionAnalysisBtn').click();
  await page.locator('#confirmPropulsionMappingBtn').waitFor({state:'visible',timeout:15000});
  if(await page.locator('#confirmPropulsionMappingBtn').isDisabled())throw new Error('Excel worksheet data did not populate valid single-log parameter mappings.');
  if(!(await page.locator('#propulsionExcelSheetPicker').innerText()).includes('Thrust Data'))throw new Error('The selected Excel worksheet name was not retained in the upload status.');
  await page.locator('#resetPropulsionUploadBtn').click();

  await page.locator('#propulsionLogCount').selectOption('2');
  await page.locator('#confirmCommonSetupBtn').click();
  await page.locator('#propulsionMultiLogTypePicker input[value="thrust"]').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));});
  const uploads=page.locator('#propulsionMultiUploadGrid input[type="file"]');
  await uploads.nth(0).setInputFiles(excelFile);
  const firstSlot=page.locator('.propulsion-multi-upload-slot').nth(0);
  await firstSlot.locator('.propulsion-multi-excel-sheet-picker').waitFor({state:'visible',timeout:15000});
  await firstSlot.locator('select[aria-label="Select worksheet for log 1"]').selectOption('Thrust Data');
  await firstSlot.getByRole('button',{name:'Use Selected Worksheet'}).click();
  const csv='thrust,command_rpm,actual_rpm,dc_voltage_v,dc_current_a\n200,1500,1480,60,12\n210,1600,1580,60,13\n';
  await uploads.nth(1).setInputFiles({name:'run-b.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await page.locator('#identifyMultipleLogsBtn').waitFor({state:'visible'});
  await page.locator('#identifyMultipleLogsBtn').click();
  await page.locator('.propulsion-multi-mapping-unified').waitFor({state:'visible'});
  if(await page.locator('.propulsion-multi-mapping-unified select[data-log-index="0"]').count()===0)throw new Error('Excel workbook was not included in multi-log parameter mapping.');
  if(await page.locator('.propulsion-multi-mapping-unified select[data-log-index="1"]').count()===0)throw new Error('CSV workbook peer was not included in mixed-format multi-log parameter mapping.');
  if(errors.length)throw new Error('Browser runtime errors: '+errors.join(' | '));
  console.log('Propulsion Excel import browser tests passed: single-log worksheet selection and mixed Excel/CSV multi-log upload.');
 }catch(error){console.error(error);process.exitCode=1;}
 finally{if(browser)await browser.close();server.close();}
})();
