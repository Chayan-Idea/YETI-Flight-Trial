/* Propulsion Test Bench Log Analyzer — local CSV parameter identification */
(()=>{
 'use strict';
 const $id=id=>document.getElementById(id);
 function printReportMarkup(markup,rootId,title,onStatus){
  const html=markup.outerHTML;
  const stylesheetUrl=new URL('./css/propulsion-analyser.css?v=62',window.location.href).href;
  const printOverrides='<style>html,body{margin:0!important;padding:0!important;width:210mm!important;min-height:297mm!important;background:#fff!important;color:#172b3d!important;font:10pt Arial,sans-serif!important}body{display:block!important}#'+rootId+'{display:block!important;position:static!important;left:auto!important;top:auto!important;width:210mm!important;max-width:none!important;max-height:none!important;height:auto!important;overflow:visible!important;padding:0!important;margin:0!important;background:#fff!important;visibility:visible!important}#'+rootId+' *{visibility:visible!important}#'+rootId+' .propulsion-report-page{box-sizing:border-box!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:12mm 13mm!important;overflow:hidden!important;box-shadow:none!important;break-after:page!important;page-break-after:always!important;visibility:visible!important}#'+rootId+' .propulsion-report-page:last-child{break-after:auto!important;page-break-after:auto!important}#'+rootId+' .propulsion-report-preview-graph svg{display:block!important;width:100%!important;height:auto!important;max-height:165mm!important}@media print{@page{size:A4 portrait;margin:0}html,body{width:210mm!important;margin:0!important;padding:0!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body *{visibility:visible!important}#'+rootId+'{position:static!important;display:block!important;visibility:visible!important}#'+rootId+' *{visibility:visible!important}}</style>';
  const doc='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="'+new URL('./',window.location.href).href+'"><title>'+title+'</title><link rel="stylesheet" href="'+stylesheetUrl+'">'+printOverrides+'</head><body>'+html+'</body></html>';
  const prepare=target=>{
   target.document.open();target.document.write(doc);target.document.close();
   const link=target.document.querySelector('link[rel="stylesheet"]');
   const print=async()=>{
    try{
     if(target.closed)return;
     await (target.document.fonts?.ready||Promise.resolve());
     await Promise.all(Array.from(target.document.images).map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});})));
     await new Promise(resolve=>target.requestAnimationFrame(()=>target.requestAnimationFrame(resolve)));
     const root=target.document.getElementById(rootId);
     if(!root||!root.querySelector('.propulsion-report-page')||!root.textContent.trim())throw new Error('The generated report contains no printable content.');
     if(root.querySelectorAll('.propulsion-report-page').length<1)throw new Error('No report pages were generated.');
     onStatus('Report is ready. In the print dialog, choose “Save as PDF”.');
     target.focus();target.print();
    }catch(error){onStatus('PDF export preparation failed: '+(error.message||'Please regenerate the report and retry.'));try{target.close()}catch(_){}}
   };
   if(!link){print();return}
   if(link.sheet){print();return}
   link.addEventListener('load',print,{once:true});
   link.addEventListener('error',()=>onStatus('Unable to load report styling. Check your connection and retry.'),{once:true});
  };
  const popup=window.open('','_blank');
  if(popup){prepare(popup);return}
  const frame=document.createElement('iframe');frame.title='YETI PDF print view';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;left:-12000px;top:0;width:210mm;height:297mm;border:0;opacity:.01;pointer-events:none';
  frame.onload=()=>{try{if(!frame.contentWindow)throw new Error('Print frame is unavailable');prepare(frame.contentWindow)}catch(error){onStatus('Unable to prepare PDF: '+(error.message||'Please retry.'));frame.remove()}};
  frame.srcdoc=doc;document.body.append(frame);
 }

 const logTypePicker=$id('propulsionLogTypePicker'),logUploadArea=$id('propulsionLogUploadArea');let logType='';const input=$id('propulsionCsvInput'),filePicker=input?.closest('.propulsion-file-picker'),status=$id('propulsionUploadStatus'),meta=$id('propulsionFileMeta'),start=$id('startPropulsionAnalysisBtn'),reset=$id('resetPropulsionUploadBtn'),workspace=document.querySelector('.propulsion-analyser-workspace');
 if(reset)reset.textContent='Choose another log file';
 if(!input||!status||!start||!workspace)return;
 const csvProcessing=window.YetiCsvProcessing,mappingTools=window.YetiParameterMapping,graphTools=window.YetiGraphAnalysis,reportTools=window.YetiReportGeneration,sessionTools=window.YetiSessionStorage;
 if(!csvProcessing||!mappingTools||!graphTools||!reportTools||!sessionTools)throw new Error('A required YETI analysis module failed to load.');
 const uploadCard=input.closest('.propulsion-upload-card');
 let csvPreviewPanel=null,identifyActions=null;
 function createVirtualCsvRows(viewport,tbody,rows,columnCount){
  const rowHeight=38,overscan=12;let currentRows=rows,start=-1,end=-1,frame=0;
  const topSpacer=document.createElement('tr'),topCell=document.createElement('td');
  const bottomSpacer=document.createElement('tr'),bottomCell=document.createElement('td');
  [topSpacer,bottomSpacer].forEach((tr)=>{tr.className='propulsion-csv-virtual-spacer';const cell=tr===topSpacer?topCell:bottomCell;cell.colSpan=columnCount+1;cell.setAttribute('aria-hidden','true');tr.append(cell)});
  const makeRow=(row,index)=>{
   const tr=document.createElement('tr');tr.className='propulsion-csv-virtual-row';tr.dataset.rowIndex=String(index);
   const number=el('th','',String(index+1));number.scope='row';tr.append(number);
   for(let col=0;col<columnCount;col++){const value=String(row?.[col]??'');const td=el('td','',value);td.title=value;tr.append(td)}
   return tr;
  };
  const render=()=>{
   frame=0;const total=currentRows.length,visible=Math.max(1,Math.ceil((viewport.clientHeight||460)/rowHeight));
   const nextStart=Math.max(0,Math.floor(viewport.scrollTop/rowHeight)-overscan),nextEnd=Math.min(total,nextStart+visible+overscan*2);
   if(nextStart===start&&nextEnd===end)return;
   start=nextStart;end=nextEnd;const frag=document.createDocumentFragment();
   topCell.style.height=(start*rowHeight)+'px';bottomCell.style.height=(Math.max(0,total-end)*rowHeight)+'px';
   frag.append(topSpacer);for(let index=start;index<end;index++)frag.append(makeRow(currentRows[index],index));frag.append(bottomSpacer);tbody.replaceChildren(frag);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(render)};
  viewport.addEventListener('scroll',schedule,{passive:true});render();
  return {
   refresh(){start=-1;end=-1;render()},
   setRows(nextRows){currentRows=nextRows;start=-1;end=-1;viewport.scrollTop=0;render()},
   scrollTo(index){const safe=Math.max(0,Math.min(currentRows.length-1,index));viewport.scrollTop=Math.max(0,safe*rowHeight-(viewport.clientHeight||460)/2);start=-1;render()},
   getRow(index){return tbody.querySelector('tr[data-row-index="'+index+'"]')||null;}
  };
 }

 function filterRowsWithReturnTail(rows,rpmIndex,headerCount=0){return csvProcessing.filterRowsWithReturnTail(rows,rpmIndex,headerCount);}

 function createExactCsvPreview(titleText,rows,metaText){
  const card=el('section','propulsion-csv-preview-card propulsion-step-card propulsion-step-card--green propulsion-exact-csv-preview');
  const heading=el('div','propulsion-step-label','CSV FILE PREVIEW'),title=el('h3','',titleText),meta=el('p','propulsion-csv-preview-meta',metaText||((rows.length-1).toLocaleString()+' data rows'));
  const searchWrap=el('div','propulsion-csv-search');
  const columnSelect=document.createElement('select');columnSelect.className='propulsion-csv-column-select';columnSelect.setAttribute('aria-label','Select CSV column to search');columnSelect.append(new Option('Select column to search…',''));
  const maxColumns=rows.reduce((max,row)=>Math.max(max,row?.length||0),0);
  for(let col=0;col<maxColumns;col++){const name=String(rows[0]?.[col]??'').trim()||('Column '+(col+1));columnSelect.append(new Option(name,String(col)));}
  const search=document.createElement('input');search.type='search';search.className='propulsion-csv-search-input';search.placeholder='Select a column first';search.setAttribute('aria-label','Search selected CSV column');search.disabled=true;
  const searchButton=el('button','btn alt propulsion-csv-search-button','Search');searchButton.type='button';searchButton.disabled=true;
  const searchStatus=el('span','propulsion-csv-search-status','Select a column to enable search.');
  searchWrap.append(columnSelect,search,searchButton,searchStatus);
  const viewport=el('div','propulsion-csv-preview-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',titleText);
  const table=document.createElement('table');table.className='propulsion-csv-preview-table propulsion-exact-csv-table';
  const head=document.createElement('thead'),headRow=document.createElement('tr');
  for(let col=0;col<maxColumns;col++){const th=el('th','',String(rows[0]?.[col]??''));th.scope='col';headRow.append(th);}
  const colgroup=document.createElement('colgroup');for(let col=0;col<maxColumns;col++){const column=document.createElement('col');column.className=col===0?'propulsion-csv-first-column':'propulsion-csv-data-column';colgroup.append(column);}table.append(colgroup);head.append(headRow);table.append(head);const body=document.createElement('tbody');table.append(body);viewport.append(table);
  const rowHeight=38,overscan=10;let highlightedRows=new Set(),renderFrame=0,searchTimer=0,lastStart=-1,lastEnd=-1;
  const rowCount=Math.max(0,rows.length-1);
  const topSpacer=document.createElement('tr'),topCell=document.createElement('td'),bottomSpacer=document.createElement('tr'),bottomCell=document.createElement('td');
  topSpacer.className=bottomSpacer.className='propulsion-csv-virtual-spacer';
  [topCell,bottomCell].forEach(cell=>{cell.colSpan=Math.max(1,maxColumns);cell.setAttribute('aria-hidden','true');cell.style.cssText='padding:0!important;border:0!important;line-height:0!important;'});
  topSpacer.append(topCell);bottomSpacer.append(bottomCell);
  const makeRow=index=>{const row=rows[index+1]||[],tr=document.createElement('tr');tr.className='propulsion-csv-virtual-row';tr.dataset.rowIndex=String(index+1);if(highlightedRows.has(index))tr.classList.add('propulsion-csv-search-match');for(let col=0;col<maxColumns;col++){const value=String(row[col]??''),cell=el(col===0?'th':'td','',value);if(col===0)cell.scope='row';cell.title=value;tr.append(cell);}return tr;};
  const render=()=>{renderFrame=0;const total=rowCount,visible=Math.max(1,Math.ceil((viewport.clientHeight||460)/rowHeight)),start=Math.max(0,Math.floor(viewport.scrollTop/rowHeight)-overscan),end=Math.min(total,start+visible+overscan*2);if(start===lastStart&&end===lastEnd)return;lastStart=start;lastEnd=end;topCell.style.height=(start*rowHeight)+'px';bottomCell.style.height=(Math.max(0,total-end)*rowHeight)+'px';const fragment=document.createDocumentFragment();fragment.append(topSpacer);for(let i=start;i<end;i++)fragment.append(makeRow(i));fragment.append(bottomSpacer);body.replaceChildren(fragment);};
  const scheduleRender=()=>{if(!renderFrame)renderFrame=requestAnimationFrame(render);};
  const executeSearch=()=>{const col=Number(columnSelect.value),query=search.value.trim().toLocaleLowerCase();highlightedRows=new Set();if(!columnSelect.value||!query){searchStatus.textContent=!columnSelect.value?'Select a column to enable search.':'Enter a value to search.';lastStart=lastEnd=-1;scheduleRender();return;}for(let i=0;i<rowCount;i++){if(String(rows[i+1]?.[col]??'').toLocaleLowerCase().includes(query))highlightedRows.add(i);}searchStatus.textContent=highlightedRows.size.toLocaleString()+' matching row(s) highlighted in '+rowCount.toLocaleString()+' total rows';lastStart=lastEnd=-1;viewport.scrollTop=0;if(highlightedRows.size){const first=highlightedRows.values().next().value;viewport.scrollTop=Math.max(0,first*rowHeight-(viewport.clientHeight||460)/2);}scheduleRender();};
  columnSelect.addEventListener('change',()=>{search.disabled=!columnSelect.value;searchButton.disabled=!columnSelect.value;search.placeholder=columnSelect.value?'Enter value to find in selected column':'Select a column first';search.value='';highlightedRows.clear();searchStatus.textContent=columnSelect.value?'Enter a value, then click Search.':'Select a column to enable search.';lastStart=lastEnd=-1;scheduleRender();});
  searchButton.addEventListener('click',executeSearch);
  search.addEventListener('keydown',event=>{if(event.key==='Enter'&&!searchButton.disabled)executeSearch();});
  search.addEventListener('input',()=>{window.clearTimeout(searchTimer);searchTimer=window.setTimeout(()=>{if(!search.value.trim()){highlightedRows.clear();searchStatus.textContent=rowCount.toLocaleString()+' data rows';lastStart=lastEnd=-1;scheduleRender();}},120);});
  viewport.addEventListener('scroll',scheduleRender,{passive:true});
  card.append(heading,title,meta,searchWrap,viewport);
  const container=el('div','propulsion-csv-preview-disclosure'),toggle=el('button','btn alt propulsion-csv-preview-toggle','Show CSV Preview');toggle.type='button';toggle.setAttribute('aria-expanded','false');card.hidden=true;
  toggle.addEventListener('click',()=>{const opening=card.hidden;card.hidden=!opening;toggle.textContent=opening?'Hide CSV Preview':'Show CSV Preview';toggle.setAttribute('aria-expanded',String(opening));if(opening){lastStart=lastEnd=-1;scheduleRender();}});
  container.append(toggle,card);return container;
 }
 function renderCsvPreview(text){
  csvPreviewPanel?.remove();const rows=parseCSV(text,chooseDelimiter(text));if(!rows.length)return;
  csvPreviewPanel=createExactCsvPreview('Uploaded Raw CSV File',rows,'Original uploaded CSV · '+rows.length.toLocaleString()+' rows · Read-only');csvPreviewPanel.id='propulsionCsvPreview';
  const previewAnchor=logUploadArea||uploadCard;if(previewAnchor)previewAnchor.insertAdjacentElement('afterend',csvPreviewPanel);else workspace.insertBefore(csvPreviewPanel,workspace.firstChild);
 }
 const STANDARD_GRAVITY=9.80665;
 const accelerationParameterKeys=new Set(['accelerationX','accelerationY','accelerationZ']);
 const isAccelerationColumn=index=>specs.some(spec=>accelerationParameterKeys.has(spec.key)&&mapping[spec.key]?.selected!==''&&Number(mapping[spec.key]?.selected)===Number(index));
 const toDisplayAcceleration=value=>Number.isFinite(value)?value/STANDARD_GRAVITY:value;
 const specs=[
  {key:'thrust',label:'Thrust',aliases:['net_thrust_n','net thrust n','thrust n','thrust newton','thrust']},
  {key:'torque',label:'Torque',aliases:['esc_torque_nm','torque_nm','torque nm','torque']},
  {key:'commandRpm',label:'Command RPM',aliases:['commanded_rpm','command_rpm','command rpm','commanded rpm','setpoint rpm','target rpm']},
  {key:'actualRpm',label:'Actual RPM',aliases:['actual_rpm','measured_rpm','motor_speed_rpm','actual rpm','motor rpm']},
  {key:'voltage',label:'DC Voltage',aliases:['dc_voltage_v','dc voltage','bus_voltage_v','battery_voltage_v','voltage_v']},
  {key:'current',label:'DC Current',aliases:['current_a','dc_current_a','dc current','battery_current_a','bus_current_a']},
  {key:'motorTemperature',label:'Motor Temperature',aliases:['motor_temperature_c','motor_temp_c','motor temperature','motor temp','motor_temperature','motor_temp','temperature_motor','motor winding temperature']},
  {key:'escTemperature',label:'ESC Temperature',aliases:['esc_temperature_c','esc_temp_c','esc temperature','esc temp','esc_temperature','esc_temp','controller_temperature','electronic speed controller temperature']},
  {key:'accelerationX',label:'Acceleration Along X Axis',aliases:['acceleration_x','accel_x','acc_x','x_acceleration','x_accel','acceleration along x axis','linear_acceleration_x','acceleration_x_m_s2','accel_x_m_s2']},
  {key:'accelerationY',label:'Acceleration Along Y Axis',aliases:['acceleration_y','accel_y','acc_y','y_acceleration','y_accel','acceleration along y axis','linear_acceleration_y','acceleration_y_m_s2','accel_y_m_s2']},
  {key:'accelerationZ',label:'Acceleration Along Z Axis',aliases:['acceleration_z','accel_z','acc_z','z_acceleration','z_accel','acceleration along z axis','linear_acceleration_z','accel_z_m_s2','acceleration_z_m_s2']}
 ];
 // Single source of truth for mode-dependent parameter availability across the workflow.
 const PARAMETER_DEPENDENCY_MATRIX={
  thrust:{mapping:['thrust','commandRpm','actualRpm','voltage','current','motorTemperature','escTemperature','accelerationX','accelerationY','accelerationZ'],derived:['electricalPower','overallEfficiency'],report:['thrust','commandRpm','actualRpm','voltage','current','motorTemperature','escTemperature','accelerationX','accelerationY','accelerationZ']},
  torque:{mapping:['torque','commandRpm','actualRpm','voltage','current','motorTemperature','escTemperature','accelerationX','accelerationY','accelerationZ'],derived:['mechanicalPower','electricalPower'],report:['torque','commandRpm','actualRpm','voltage','current','motorTemperature','escTemperature','accelerationX','accelerationY','accelerationZ']}
 };
 function isParameterAvailable(key,stage='mapping'){
  const mode=PARAMETER_DEPENDENCY_MATRIX[logType];
  return !!mode&&Array.isArray(mode[stage])&&mode[stage].includes(key);
 }
 function activeSpecs(stage='mapping'){return specs.filter(spec=>isParameterAvailable(spec.key,stage));}

 let selectedFile=null,headerRow=[],dataRows=[],analysisRows=[],mapping={},calculatedParameterKeys=[],calculatedParameterControls={},confirmed=false,step3FilterVisible=false,step3Visible=false,step4Visible=false,step5Visible=false,reportDirectVisible=false,analysisPanel=null;
 const DB_NAME=sessionTools.DB_NAME,DB_STORE=sessionTools.DB_STORE,DB_KEY=sessionTools.DB_KEY;
 function openStateDB(){return sessionTools.open()}
 let graphXIndex='',graphYIndex='',graphY2Index='',graphRangeStart='',graphRangeEnd='',graphYRangeStart='',graphYRangeEnd='',graphY2RangeStart='',graphY2RangeEnd='';
 async function saveState(){try{await sessionTools.write({csvText:parseCSVText,fileName:selectedFile?.name||'Restored CSV log.csv',stage:step5Visible?'report':step4Visible?'graphical':step3Visible?'summary':step3FilterVisible?'filter':confirmed?'confirmed':analysisPanel?'identified':selectedFile?'uploaded':'empty',reportDirectVisible,logType,mapping:Object.fromEntries(specs.map(s=>[s.key,mapping[s.key]?.selected??''])),graphXIndex,graphYIndex,graphY2Index,graphRangeStart,graphRangeEnd,graphYRangeStart,graphYRangeEnd,graphY2RangeStart,graphY2RangeEnd,calculatedParameterKeys});}catch(error){console.warn('Could not save propulsion session locally:',error)}}
 async function loadState(){try{const saved=await sessionTools.read();if(!saved?.csvText)return;logType=saved.logType||'';if(logTypePicker){const choice=logTypePicker.querySelector('input[value="'+logType+'"]');if(choice)choice.checked=true;}updateLogTypeUI();parseCSVText=saved.csvText;selectedFile={name:saved.fileName||'Restored CSV log.csv',size:new Blob([parseCSVText]).size,text:async()=>parseCSVText};if(filePicker)filePicker.hidden=true;meta.hidden=false;meta.textContent=selectedFile.name+' · '+(selectedFile.size/1024).toFixed(1)+' KB · Restored locally';reset.hidden=false;setUploadState(true,'Previous CSV session restored from this browser');renderCsvPreview(parseCSVText);const rows=parseCSV(parseCSVText,chooseDelimiter(parseCSVText));detect(rows);if(saved.mapping){specs.forEach(spec=>{const value=saved.mapping[spec.key];if(value!==''&&value!==undefined)mapping[spec.key].selected=Number(value)});analysisPanel.querySelectorAll('.propulsion-column-select').forEach(select=>{select.value=mapping[select.dataset.key].selected===''?'':String(mapping[select.dataset.key].selected)});validateMapping()}if((saved.stage==='confirmed'||saved.stage==='filter'||saved.stage==='summary'||saved.stage==='graphical'||saved.stage==='report')&&validateMapping())$id('confirmPropulsionMappingBtn').click();if(Array.isArray(saved.calculatedParameterKeys)){saved.calculatedParameterKeys.forEach(key=>{const control=calculatedParameterControls[key];if(control){control.checkbox.checked=true;control.checkbox.dispatchEvent(new Event('change'));control.calculate.click();}})}if((saved.stage==='summary'||saved.stage==='graphical')&&confirmed)$id('proceedToParameterSummaryBtn')?.click();if(saved.stage==='summary'||saved.stage==='graphical')$id('proceedToParameterSummaryBtn')?.click();if(saved.stage==='report'&&saved.reportDirectVisible){$id('proceedToReportGenerationChoiceBtn')?.click()}else if((saved.stage==='graphical'||saved.stage==='report')&&step3Visible){$id('proceedToGraphicalAnalysisBtn')?.click();if(saved.stage==='report')$id('proceedToGenerateReportBtn')?.click();if(saved.graphXIndex!==undefined){graphXIndex=String(saved.graphXIndex);graphYIndex=String(saved.graphYIndex??'');graphY2Index=String(saved.graphY2Index??'');const xs=$id('propulsionXAxisSelect'),ys=$id('propulsionYAxisSelect'),y2s=$id('propulsionSecondaryYAxisSelect');if(xs)xs.value=graphXIndex;if(ys)ys.value=graphYIndex;if(y2s)y2s.value=graphY2Index;graphRangeStart=String(saved.graphRangeStart??'');graphRangeEnd=String(saved.graphRangeEnd??'');graphYRangeStart=String(saved.graphYRangeStart??'');graphYRangeEnd=String(saved.graphYRangeEnd??'');graphY2RangeStart=String(saved.graphY2RangeStart??'');graphY2RangeEnd=String(saved.graphY2RangeEnd??'');const savedRangeStart=$id('propulsionXRangeStart'),savedRangeEnd=$id('propulsionXRangeEnd'),savedYRangeStart=$id('propulsionYRangeStart'),savedYRangeEnd=$id('propulsionYRangeEnd'),savedY2RangeStart=$id('propulsionY2RangeStart'),savedY2RangeEnd=$id('propulsionY2RangeEnd');if(savedRangeStart)savedRangeStart.value=graphRangeStart;if(savedRangeEnd)savedRangeEnd.value=graphRangeEnd;if(savedYRangeStart)savedYRangeStart.value=graphYRangeStart;if(savedYRangeEnd)savedYRangeEnd.value=graphYRangeEnd;if(savedY2RangeStart)savedY2RangeStart.value=graphY2RangeStart;if(savedY2RangeEnd)savedY2RangeEnd.value=graphY2RangeEnd;if($id('plotPropulsionGraphBtn')&&graphXIndex!==''&&graphYIndex!=='')$id('plotPropulsionGraphBtn').click();}}start.textContent='Parameters Identified';start.disabled=true}catch(error){console.warn('Could not restore propulsion session:',error)}}
 function setUploadState(ok,text){status.classList.toggle('is-complete',ok);status.querySelector('.propulsion-status-symbol').textContent=ok?'✓':'○';status.lastElementChild.textContent=text}
 function parseCSV(text,delimiter){return csvProcessing.parse(text,delimiter);}
 function chooseDelimiter(text){return csvProcessing.chooseDelimiter(text);}
 function norm(value){return csvProcessing.normalizeHeader(value);}
 function scoreHeader(header,aliases){return mappingTools.scoreHeader(header,aliases,norm);}
 function findHeader(rows){return mappingTools.findHeader(rows,specs,scoreHeader);}
 function detect(rows){
  // Re-identification starts a fresh review cycle and removes every previously unlocked downstream step.
  workspace.querySelector('#propulsionDataFilteringCard')?.remove();
  workspace.querySelector('#propulsionParameterSummaryCard')?.remove();
  workspace.querySelector('#propulsionGraphicalAnalysisCard')?.remove();
  workspace.querySelector('#propulsionReportGenerationCard')?.remove();
  step3FilterVisible=false;step3Visible=false;step4Visible=false;step5Visible=false;reportDirectVisible=false;
  confirmed=false;
  if(!logType)throw new Error('Select Thrust Log or Torque Log in Step 01 before identifying columns.');const hi=findHeader(rows);if(hi<0)throw new Error('Could not locate a recognizable header row in the first 10 rows.');
  headerRow=rows[hi].map((v,i)=>String(v??'').trim()||('Column '+(i+1)));
  dataRows=rows.slice(hi+1).filter(r=>r.some(v=>String(v??'').trim()!==''));analysisRows=dataRows.slice();
  mapping={};calculatedParameterKeys=[];
  specs.forEach(s=>{
   const candidates=headerRow.map((name,index)=>({name,index,score:scoreHeader(name,s.aliases)})).filter(x=>x.score>=30).sort((a,b)=>b.score-a.score);
   mapping[s.key]={candidates,selected:candidates[0]?.index??''};
  });
  renderMapping(hi);
 }
 function el(tag,cls,txt){const node=document.createElement(tag);if(cls)node.className=cls;if(txt!==undefined)node.textContent=txt;return node}
 function renderMapping(headerIndex){
  if(analysisPanel)analysisPanel.remove();
  workspace.querySelector('.propulsion-statistics-card')?.remove();workspace.querySelector('.propulsion-graphical-card')?.remove();workspace.querySelector('.propulsion-report-card')?.remove();
  analysisPanel=el('section','propulsion-mapping-card propulsion-step-card propulsion-step-card--purple propulsion-unified-mapping-single');analysisPanel.setAttribute('aria-labelledby','propulsionMappingHeading');
  const top=el('div','propulsion-mapping-top');top.append(el('span','propulsion-step-label','STEP 02 · COLUMN IDENTIFICATION'));
  const h=el('h3','', 'Review detected parameters');h.id='propulsionMappingHeading';top.append(h);
  top.append(el('p','propulsion-mapping-description', 'Header row detected at CSV row '+(headerIndex+1)+'. Review the proposed column mapping before proceeding.'));
  analysisPanel.append(top);
  const mappingGroups=[
   {title:'Mechanical',keys:['thrust','torque','commandRpm','actualRpm']},
   {title:'Electrical',keys:['voltage','current']},
   {title:'Thermal',keys:['escTemperature','motorTemperature']},
   {title:'Other',keys:['accelerationX','accelerationY','accelerationZ']}
  ];
  const singleMappingTableWrap=el('div','propulsion-multi-mapping-table-wrap');
  const singleMappingTable=el('table','propulsion-multi-mapping-table propulsion-multi-mapping-unified');
  const singleMappingHead=document.createElement('thead'),singleMappingGroupHead=document.createElement('tr'),singleMappingSubHead=document.createElement('tr');
  const singleParameterHead=el('th','','PARAMETER');
  singleParameterHead.rowSpan=2;singleParameterHead.scope='col';
  singleMappingGroupHead.append(singleParameterHead);
  const singleLogHead=el('th','','LOG 1 · '+(selectedFile?.name||'Uploaded CSV'));singleLogHead.scope='colgroup';singleMappingGroupHead.append(singleLogHead);
  const singleColumnHead=el('th','','CSV COLUMN MAPPING');singleColumnHead.scope='col';singleMappingSubHead.append(singleColumnHead);
  singleMappingHead.append(singleMappingGroupHead,singleMappingSubHead);const singleCols=document.createElement('colgroup'),singleParamCol=document.createElement('col'),singleMapCol=document.createElement('col');singleParamCol.style.width='34%';singleMapCol.style.width='66%';singleCols.append(singleParamCol,singleMapCol);singleMappingTable.append(singleCols,singleMappingHead);
  const singleMappingBody=document.createElement('tbody'),singleActiveKeys=new Set(activeSpecs('mapping').map(spec=>spec.key));
  mappingGroups.forEach(group=>{
   const groupKeys=group.keys.filter(key=>singleActiveKeys.has(key));
   if(!groupKeys.length)return;
   const sectionRow=el('tr','propulsion-mapping-section-row propulsion-mapping-section--'+group.title.toLowerCase());
   const sectionCell=el('th','propulsion-mapping-section-heading',group.title.toUpperCase()+' PARAMETERS');sectionCell.colSpan=2;sectionCell.scope='colgroup';sectionRow.append(sectionCell);singleMappingBody.append(sectionRow);
   groupKeys.forEach(key=>{
    const spec=specs.find(item=>item.key===key);if(!spec)return;
    const row=document.createElement('tr'),parameterCell=el('th','propulsion-multi-mapping-parameter',spec.label);
    parameterCell.scope='row';row.append(parameterCell);
    const mappingCell=document.createElement('td'),parameterEnabled=isParameterAvailable(key,'mapping');
    const select=el('select','propulsion-column-select');select.dataset.key=key;select.setAttribute('aria-label',spec.label+' CSV column mapping');select.disabled=!parameterEnabled;
    const empty=document.createElement('option');empty.value='';empty.textContent='Not detected — select a column';select.append(empty);
    headerRow.forEach((name,columnIndex)=>{const option=document.createElement('option');option.value=String(columnIndex);option.textContent=name;select.append(option);});
    const current=mapping[key].selected;select.value=current===''?'':String(current);
    if(mapping[key].candidates.length>1)mappingCell.append(el('div','propulsion-match-note','Multiple possible matches — verify selection'));
    else if(current==='')mappingCell.append(el('div','propulsion-match-note warning','No automatic match — choose manually'));
    if(!parameterEnabled){mappingCell.classList.add('is-parameter-disabled');mappingCell.setAttribute('aria-disabled','true');}
    mappingCell.append(select);
    select.addEventListener('change',()=>{
     mapping[key].selected=select.value===''?'':Number(select.value);
     if(confirmed){
      calculatedParameterDefinitions.forEach(parameter=>calculatedParameterControls[parameter.key]?.retry?.click());
      headerRow=headerRow.slice(0,originalHeaderCount);analysisRows=dataRows.slice();calculatedParameterKeys=[];
      confirmed=false;step3FilterVisible=false;step3Visible=false;step4Visible=false;step5Visible=false;reportDirectVisible=false;
      step3Filter.hidden=true;step3.hidden=true;step4.hidden=true;step5.hidden=true;
      next.hidden=true;next.replaceChildren();confirm.disabled=false;confirm.textContent='Mapping Confirmed';
      proceed.hidden=true;directReportProceed.hidden=true;
      invalidateGeneratedCsv('Step 02 mapping changed. Confirm the updated mapping and regenerate the Filtered & Sorted CSV.');
     }
     validateMapping();saveState();
    });
    row.append(mappingCell);singleMappingBody.append(row);
   });
  });
  singleMappingTable.append(singleMappingBody);singleMappingTableWrap.append(singleMappingTable);analysisPanel.append(singleMappingTableWrap);
  const summary=el('div','propulsion-mapping-summary');summary.id='propulsionMappingSummary';analysisPanel.append(summary);
  const actions=el('div','propulsion-actions');const confirm=el('button','btn','Mapping Confirmed');confirm.type='button';confirm.id='confirmPropulsionMappingBtn';confirm.disabled=true;actions.append(confirm);
  const rescan=el('button','btn alt','Re-identify columns');rescan.type='button';rescan.addEventListener('click',()=>{try{detect(parseCSV(parseCSVText,chooseDelimiter(parseCSVText)))}catch(e){showError(e.message)}});actions.append(rescan);analysisPanel.append(actions);
  const next=el('div','propulsion-next-step');next.id='propulsionNextStep';next.hidden=true;analysisPanel.append(next);
  const proceed=el('button','btn','Proceed with In App Analysis');proceed.type='button';proceed.id='proceedToParameterSummaryBtn';proceed.hidden=true;const directReportProceed=el('button','btn alt','Proceed with Report Generation');directReportProceed.type='button';directReportProceed.id='proceedToReportGenerationChoiceBtn';directReportProceed.hidden=true;
  const step3=el('section','propulsion-statistics-card propulsion-step-card propulsion-step-card--green');step3.id='propulsionParameterSummaryCard';step3.hidden=true;
  workspace.insertBefore(analysisPanel,workspace.querySelector('.propulsion-local-note'));
  const step3Filter=el('section','propulsion-step-card propulsion-step-card--orange');step3Filter.id='propulsionDataFilteringCard';step3Filter.hidden=true;
  step3Filter.append(el('span','propulsion-step-label','STEP 03 · DATA FILTERING & SORTING'));
  step3Filter.append(el('h3','','Data Filtering & Sorting'));
  step3Filter.append(el('p','propulsion-statistics-description','Select calculated parameters to add row-wise derived data columns. Formula definitions and calculation actions will be enabled as each formula is provided.'));
  const derivedSection=el('section','propulsion-step-subsection propulsion-step-subsection--derived');
  derivedSection.append(el('h4','','Derived Parameter Identification & Calculation'));
  derivedSection.append(el('p','propulsion-subsection-description','Select derived parameters, review their mapped inputs and calculate row-wise values.'));
  const calculatedParameters=el('div','propulsion-calculated-parameters');calculatedParameters.id='propulsionCalculatedParameters';
  const originalHeaderCount=headerRow.length;
  const calculatedParameterDefinitions=[
   {key:'mechanicalPower',name:'Mechanical Power',formula:null,sources:[['torque','Torque'],['actualRpm','Actual Motor Speed']]},
   {key:'electricalPower',name:'Electrical Power',formula:'Electrical Power (W) = DC Voltage (V) × DC Current (A)',sources:[['voltage','DC Voltage'],['current','DC Current']]},
   {key:'overallEfficiency',name:'Specific Thrust',formula:null,numerator:'Thrust (N)',denominator:'Electrical Power (W)',sources:[['thrust','Thrust'],['voltage','DC Voltage'],['current','DC Current']]}
  ];
  calculatedParameterControls={};
  let derivedReadyCheckbox=null,filteringReadyCheckbox=null;
  const updateCsvGenerationGate=()=>{csvExportButton.hidden=!(derivedReadyCheckbox?.checked&&filteringReadyCheckbox?.checked);};
  const resetCsvConfirmationCheckboxes=()=>{
   // Resolve by live DOM ID as well as the retained references so the visible controls always reset.
   const derived=document.getElementById('confirmDerivedParametersReady')||derivedReadyCheckbox;
   const filtering=document.getElementById('confirmFilteringSortingReady')||filteringReadyCheckbox;
   [derived,filtering].forEach(input=>{
    if(input){input.checked=false;input.removeAttribute('checked');}
   });
   updateCsvGenerationGate();
  };
  const invalidateGeneratedCsv=(message)=>{
   // Any edit within Step 03 invalidates every downstream analysis/report section immediately.
   step3Visible=false;step4Visible=false;step5Visible=false;reportDirectVisible=false;
   step3.hidden=true;step4.hidden=true;step5.hidden=true;
   step3.replaceChildren();
   csvExportButton.disabled=false;
   resetCsvConfirmationCheckboxes();
   csvDownloadButton.hidden=true;
   generatedCsvText='';
   proceed.hidden=true;directReportProceed.hidden=true;
   csvStatus.textContent=message||'Derived parameter settings changed. Generate Filtered & Sorted CSV again to include the latest selections and calculations.';
  };
  const mappedColumnName=key=>{
   const index=mapping[key]?.selected;
   return index===''||index===undefined?'Not mapped':(headerRow[index]||'Mapped column');
  };
  calculatedParameterDefinitions.forEach(parameter=>{
   const parameterEnabled=isParameterAvailable(parameter.key,'derived');
   const card=el('div','propulsion-calculated-parameter');card.dataset.parameterKey=parameter.key;
   const details=el('div','propulsion-calculated-parameter-details');
   const label=el('label','propulsion-calculated-parameter-label');
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.disabled=false;checkbox.setAttribute('aria-label','Calculate '+parameter.name);if(!parameterEnabled){checkbox.setAttribute('aria-disabled','true');checkbox.title='Unavailable for the selected log type because the required parameter mapping is missing.';checkbox.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const missingParameter=logType==='thrust'?'Torque':'Thrust';window.alert(`Can't be derived because ${missingParameter} parameter mapping is missing`);});card.classList.add('is-parameter-unavailable');}
   const name=el('strong','',parameter.name);label.append(checkbox,name);
   const formulaLabel=el('span','propulsion-calculated-formula-label','FORMULA');
   const formula=el('div','propulsion-calculated-formula');
   if(parameter.key==='mechanicalPower'){
    formula.append(el('span','propulsion-formula-equation','Mechanical Power (W) = Torque (N·m) × Actual Motor Speed (RPM) × '));
    const conversion=el('span','propulsion-formula-fraction propulsion-formula-conversion');
    conversion.setAttribute('role','math');
    conversion.append(el('span','propulsion-formula-numerator','2π'),el('span','propulsion-formula-denominator','60'));
    formula.append(conversion);
   }else if(parameter.key==='overallEfficiency'){
    const equation=el('span','propulsion-formula-equation','Specific Thrust (N/W) = ');
    const fraction=el('span','propulsion-formula-fraction');
    fraction.setAttribute('role','math');
    fraction.append(el('span','propulsion-formula-numerator',parameter.numerator),el('span','propulsion-formula-denominator',parameter.denominator));
    formula.append(equation,fraction);
   }else formula.textContent=parameter.formula;
   const mappingNote=el('div','propulsion-calculated-mapping-note');
   const updateMappingNote=()=>{
    const mapped=parameter.sources.map(([key,term])=>term+' → '+mappedColumnName(key));
    if(parameter.key==='overallEfficiency')mapped.push('Electrical Power → DC Voltage × DC Current (mapped inputs)');
    if(parameter.key==='mechanicalPower')mapped[1]='Motor Speed → '+mappedColumnName('actualRpm')+' (Actual RPM)';
    mappingNote.textContent='STEP 02 MAPPED INPUTS: '+mapped.join('  ·  ');
   };
   updateMappingNote();
   details.append(label,formulaLabel,formula,mappingNote);
   const calculate=el('button','btn alt propulsion-calculated-action','Calculate and Add to Log file');calculate.type='button';calculate.disabled=true;calculate.hidden=!parameterEnabled;
   calculate.title='Select the checkbox to enable this calculation.';
   let addedToGraph=false;
   const addedStatus=el('span','propulsion-calculated-added-status','✓ Added to Log file');
   addedStatus.hidden=true;
   const retry=el('button','btn alt propulsion-calculated-retry','Retry');
   retry.type='button';retry.hidden=true;retry.disabled=!parameterEnabled;
   retry.title='Enable this calculation again.';
   calculatedParameterControls[parameter.key]={checkbox,calculate,retry,updateMappingNote};
   checkbox.addEventListener('change',()=>{calculate.disabled=addedToGraph||!checkbox.checked;invalidateGeneratedCsv('Derived parameter selection changed. Generate Filtered & Sorted CSV again to apply the latest selections.');saveState();});
   retry.addEventListener('click',()=>{
    // A Retry is a derived-parameter edit: immediately invalidate the CSV confirmation gate and downstream output.
    invalidateGeneratedCsv('A derived parameter was reset. Review the derived parameters and re-confirm both CSV preparation checkboxes before generating the file again.');
    // Repeat the reset at the Retry interaction boundary to prevent stale confirmation state.
    resetCsvConfirmationCheckboxes();
    addedToGraph=false;
    calculate.hidden=false;
    checkbox.disabled=false;
    checkbox.checked=false;
    calculate.disabled=true;
    calculate.textContent='Calculate and Add to Log file';
    calculate.title='Select the checkbox to enable this calculation.';
    addedStatus.hidden=true;
    retry.hidden=true;
    card.classList.remove('is-added-to-graph');
    calculatedParameterKeys=calculatedParameterKeys.filter(key=>key!==parameter.key);
    const derivedIndex=headerRow.indexOf(parameter.name);
    if(derivedIndex>=originalHeaderCount){
     headerRow.splice(derivedIndex,1);
     analysisRows=analysisRows.map(row=>{const next=row.slice();next.splice(derivedIndex,1);return next;});
     [xSelect,ySelect,y2Select].forEach(select=>{
      const previous=Number(select.value);
      select.querySelectorAll('option').forEach(option=>{if(Number(option.value)===derivedIndex)option.remove();});
      if(select.value!==''&&Number.isInteger(previous)&&previous>derivedIndex)select.value=String(previous-1);
      else if(previous===derivedIndex)select.value='';
     });
     savedGraphSelection();updatePlotAvailability();
    }
    csvExportButton.disabled=false;
    csvDownloadButton.hidden=true;
    generatedCsvText='';
    proceed.hidden=true;directReportProceed.hidden=true;
    csvStatus.textContent='A derived parameter was reset. Generate Filtered & Sorted CSV again to include the updated calculations.';
    saveState();
   });
   calculate.addEventListener('click',()=>{
    invalidateGeneratedCsv('A derived parameter calculation was updated. Generate Filtered & Sorted CSV again to include the latest calculations.');
    if(!checkbox.checked){graphStatus.textContent='Select the checkbox for '+parameter.name+' before calculating and adding it to the graph.';return;}
    updateMappingNote();
    const requiredKeys=parameter.key==='mechanicalPower'?['torque','actualRpm']:parameter.key==='electricalPower'?['voltage','current']:['thrust','voltage','current'];
    const missing=requiredKeys.filter(key=>mapping[key]?.selected===''||mapping[key]?.selected===undefined);
    if(missing.length){
     graphStatus.textContent='Cannot calculate '+parameter.name+'. Confirm these Step 02 mappings: '+missing.map(key=>specs.find(spec=>spec.key===key)?.label||key).join(', ')+'.';
     return;
    }
    const engineKey=parameter.key==='overallEfficiency'?'specificThrust':parameter.key;
    const engineMapping=Object.fromEntries(Object.entries(mapping).map(([key,item])=>[key,item?.selected===''||item?.selected===undefined?undefined:Number(item.selected)]));
    const calculateRow=row=>commonEngine.calculateDerivedValue(engineKey,row,engineMapping);
    let derivedIndex=headerRow.indexOf(parameter.name);
    if(derivedIndex<0){derivedIndex=headerRow.length;headerRow.push(parameter.name);}
    analysisRows=analysisRows.map(row=>{
     const next=row.slice(),value=calculateRow(row);
     next[derivedIndex]=Number.isFinite(value)?String(value):'';
     return next;
    });
    [xSelect,ySelect,y2Select].forEach(select=>{
     if(!Array.from(select.options).some(option=>option.value===String(derivedIndex))){
      const option=document.createElement('option');option.value=String(derivedIndex);option.textContent=parameter.name;select.append(option);
     }
    });
    const actualRpmIndex=mapping.actualRpm?.selected;
    if(xSelect.value===''&&actualRpmIndex!==''&&actualRpmIndex!==undefined)xSelect.value=String(actualRpmIndex);
    if(xSelect.value===''&&numericColumns.length)xSelect.value=String(numericColumns[0].index);
    ySelect.value=String(derivedIndex);
    if(!calculatedParameterKeys.includes(parameter.key))calculatedParameterKeys.push(parameter.key);
    savedGraphSelection();updatePlotAvailability();
    const validCount=analysisRows.filter(row=>String(row[derivedIndex]??'').trim()!==''&&Number.isFinite(Number(row[derivedIndex]))).length;
    graphStatus.textContent=parameter.name+' calculated for '+validCount.toLocaleString()+' valid rows out of '+analysisRows.length.toLocaleString()+' included rows. Select Plot Graph to view it.';
    addedToGraph=true;
    calculate.disabled=true;
    calculate.textContent='✓ Added to Log file';
    calculate.hidden=true;
    calculate.title='This calculated parameter has already been added to the generated log file data.';
    addedStatus.hidden=false;
    retry.hidden=false;
    checkbox.disabled=true;
    card.classList.add('is-added-to-graph');
    saveState();
   });
   card.append(details,calculate,addedStatus,retry);calculatedParameters.append(card);
  });
  derivedSection.append(calculatedParameters);
  step3Filter.append(derivedSection);
  const csvSection=el('section','propulsion-step-subsection propulsion-step-subsection--csv');
  csvSection.append(el('h4','','CSV Generation with Filtered & Sorted Data'));
  csvSection.append(el('p','propulsion-subsection-description','Export rows after applying the Actual RPM validity filter, chronological timestamp sorting where available, and all calculated derived-parameter columns.'));
  const csvStatus=el('p','propulsion-csv-export-status','Ready to generate from '+analysisRows.length.toLocaleString()+' identified data rows and '+headerRow.length.toLocaleString()+' available columns.');
  csvStatus.setAttribute('role','status');csvStatus.setAttribute('aria-live','polite');
  const csvConfirmation=el('div','propulsion-csv-confirmations');
  const derivedReadyLabel=el('label','propulsion-csv-confirmation');derivedReadyCheckbox=document.createElement('input');derivedReadyCheckbox.type='checkbox';derivedReadyCheckbox.id='confirmDerivedParametersReady';derivedReadyLabel.append(derivedReadyCheckbox,el('span','','Required Derived Parameters identified, calculated, added to log file'));
  const filteringReadyLabel=el('label','propulsion-csv-confirmation');filteringReadyCheckbox=document.createElement('input');filteringReadyCheckbox.type='checkbox';filteringReadyCheckbox.id='confirmFilteringSortingReady';filteringReadyLabel.append(filteringReadyCheckbox,el('span','','Apply Data Filtering & Sorting Logic'));
  [derivedReadyCheckbox,filteringReadyCheckbox].forEach(input=>input.addEventListener('change',updateCsvGenerationGate));
  csvConfirmation.append(derivedReadyLabel,filteringReadyLabel);
  const csvExportButton=el('button','btn','Generate Filtered & Sorted CSV');csvExportButton.type='button';csvExportButton.hidden=true;
  const csvDownloadButton=el('button','btn','Download Filtered & Sorted CSV');csvDownloadButton.type='button';csvDownloadButton.hidden=true;
  let generatedCsvText='';
  const filteredCsvPreviewHost=el('div','propulsion-csv-preview-stack');csvSection.append(filteredCsvPreviewHost);
  csvDownloadButton.addEventListener('click',()=>{if(!generatedCsvText)return;const blob=new Blob([generatedCsvText],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');const base=(selectedFile?.name||'propulsion_log.csv').replace(/\.csv$/i,'');link.href=url;link.download=base+'_filtered_sorted.csv';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);csvStatus.textContent='Filtered & sorted CSV downloaded.';});
  const csvActions=el('div','propulsion-actions propulsion-csv-actions');csvActions.append(csvExportButton,csvDownloadButton);
  csvSection.append(csvConfirmation,csvStatus,csvActions);
  csvExportButton.addEventListener('click',()=>{
   const rpmIndex=mapping.actualRpm?.selected;
   if(rpmIndex===''||rpmIndex===undefined){csvStatus.textContent='CSV not generated: map the Actual RPM column in Step 02 before applying the RPM filter.';return;}
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
   const timestampIndex=headerRow.map((name,index)=>({index,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
   const sourceRows=analysisRows.map((row,index)=>({row:row.slice(),sourceIndex:index}));
   const filteredSourceIndexes=[];let returnTailRemaining=-1;
   sourceRows.forEach((item,index)=>{
    if(returnTailRemaining===0)return;
    if(returnTailRemaining>0){filteredSourceIndexes.push(index);returnTailRemaining--;return;}
    const raw=String(item.row[rpmIndex]??'').trim(),rpm=raw===''?NaN:Number(raw.replace(/,/g,''));
    if(!Number.isFinite(rpm)||rpm>0){filteredSourceIndexes.push(index);return;}
    if(rpm<0)return;
    filteredSourceIndexes.push(index);returnTailRemaining=5;
   });
   const filteredRows=filteredSourceIndexes.map(index=>sourceRows[index]);
   let sortNote='Original row order retained because no timestamp column was identified.';
   if(timestampIndex!==undefined){
    const parsed=filteredRows.map(item=>{const raw=String(item.row[timestampIndex]??'').trim();const numeric=raw!==''?Number(raw):NaN;const date=numeric>0&&numeric<1e12?new Date(numeric*1000):numeric>=1e12?new Date(numeric):new Date(raw);return {...item,sortTime:Number.isFinite(date.getTime())?date.getTime():NaN};});
    parsed.sort((a,b)=>{if(Number.isFinite(a.sortTime)&&Number.isFinite(b.sortTime))return a.sortTime-b.sortTime||a.sourceIndex-b.sourceIndex;if(Number.isFinite(a.sortTime))return -1;if(Number.isFinite(b.sortTime))return 1;return a.sourceIndex-b.sourceIndex;});
    filteredRows.splice(0,filteredRows.length,...parsed);sortNote='Sorted by detected timestamp in ascending chronological order; unparseable timestamps remain in original order after valid timestamps.';
   }
   const exportRows=filteredRows.map(item=>item.row);
   const escapeCsv=value=>{const text=String(value??'');return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;};
   const rows=[headerRow.slice(),...exportRows.map(row=>row.slice())];
   const csv='\uFEFF'+rows.map(row=>rows[0].map((_,index)=>escapeCsv(row[index]??'')).join(',')).join('\r\n');
   generatedCsvText=csv;
   // From this point onward, the filtered and chronologically sorted export is the sole analysis dataset.
   analysisRows=exportRows.map(row=>row.slice());

   csvStatus.textContent='Filtered & sorted CSV prepared: '+exportRows.length.toLocaleString()+' filtered rows and '+headerRow.length.toLocaleString()+' columns. Derived columns included where calculated. Download is available.';csvExportButton.disabled=true;csvDownloadButton.hidden=false;proceed.hidden=false;directReportProceed.hidden=false;saveState();
  });
  step3Filter.append(csvSection);
  const filterActions=el('div','propulsion-actions');filterActions.append(proceed,directReportProceed);
  workspace.insertBefore(step3Filter,workspace.querySelector('.propulsion-local-note'));
  workspace.insertBefore(step3,workspace.querySelector('.propulsion-local-note'));
  const step4=el('section','propulsion-graphical-card propulsion-step-card propulsion-step-card--blue');step4.id='propulsionGraphicalAnalysisCard';step4.hidden=true;
  step4.append(el('span','propulsion-step-label','STEP 05 · GRAPHICAL ANALYSIS'));step4.append(el('h3','','Graphical Analysis'));
  step4.append(el('p','propulsion-statistics-description','Select any two numeric CSV columns to plot their relationship.'));
  const graphControls=el('div','propulsion-graph-controls');
  const makeAxisField=(labelText,id)=>{const label=el('label','propulsion-graph-field',labelText);const select=el('select','propulsion-column-select');select.id=id;const empty=document.createElement('option');empty.value='';empty.textContent='Select a CSV column';select.append(empty);const mappedIndices=new Set(specs.filter(spec=>mapping[spec.key]&&mapping[spec.key].selected!==''&&mapping[spec.key].selected!==undefined).map(spec=>Number(mapping[spec.key].selected)));calculatedParameterKeys.forEach(key=>{const derivedName=calculatedParameterDefinitions.find(parameter=>parameter.key===key)?.name;const derivedIndex=derivedName?headerRow.indexOf(derivedName):-1;if(derivedIndex>=0)mappedIndices.add(derivedIndex)});const numericIndices=new Set(headerRow.map((_,index)=>index).filter(index=>analysisRows.some(row=>{const raw=String(row[index]??'').trim();return raw!==''&&Number.isFinite(Number(raw))})));headerRow.forEach((name,index)=>{
    if(!mappedIndices.has(index)||!numericIndices.has(index))return;
    const option=document.createElement('option');option.value=String(index);
    const mappedSpec=specs.find(spec=>mapping[spec.key]?.selected!==''&&mapping[spec.key]?.selected!==undefined&&Number(mapping[spec.key].selected)===index);
    const derivedDefinition=calculatedParameterDefinitions.find(parameter=>parameter.name===name);
    const derivedLabels={mechanicalPower:'Mechanical Power (W)',electricalPower:'Electrical Power (W)',overallEfficiency:'Specific Thrust (N/W)'};
    option.textContent=mappedSpec?.label||(derivedDefinition?derivedLabels[derivedDefinition.key]||derivedDefinition.name:name);
    select.append(option);
   });label.append(select);return {label,select}};
  const xField=makeAxisField('Choose X Axis','propulsionXAxisSelect');
  const yField=makeAxisField('Choose Primary Y Axis','propulsionYAxisSelect');
  const y2Field=makeAxisField('Choose Secondary Y Axis','propulsionSecondaryYAxisSelect');
  const numericColumns=headerRow.map((_,index)=>({index,count:analysisRows.filter(row=>{const v=String(row[index]??'').trim();return v!==''&&Number.isFinite(Number(v))}).length})).filter(item=>item.count>0);
  const [xSelect,ySelect,y2Select]=[xField.select,yField.select,y2Field.select];
  const savedGraphSelection=()=>{graphXIndex=xSelect.value;graphYIndex=ySelect.value;graphY2Index=y2Select.value;saveState()};
  const updatePlotAvailability=()=>{plotButton.disabled=xSelect.value===''||ySelect.value==='';};
  const plotActions=el('div','propulsion-actions');const plotButton=el('button','btn','Plot Graph');plotButton.type='button';plotButton.id='plotPropulsionGraphBtn';plotButton.disabled=true;plotActions.append(plotButton);
  const handleAxisSelectionChange=()=>{
   // Step 5 graph controls must not change Step 6 report visibility or its contents.
   graphRangeHasValidPlot=false;updateRangeActionAvailability();savedGraphSelection();updatePlotAvailability();
   graphStatus.textContent='Axis selection updated. Click Plot Graph to refresh the chart with the selected parameters.';
  };
  xSelect.addEventListener('change',()=>{
   // A new X column has a different numeric domain; never reuse the previous column's range.
   xRangeStart.value='';xRangeEnd.value='';graphRangeStart='';graphRangeEnd='';
   handleAxisSelectionChange();
  });
  ySelect.addEventListener('change',()=>{yRangeStart.value='';yRangeEnd.value='';graphYRangeStart='';graphYRangeEnd='';handleAxisSelectionChange()});
  y2Select.addEventListener('change',()=>{graphY2RangeStart='';graphY2RangeEnd='';handleAxisSelectionChange();updateRangeActionAvailability()});
  graphControls.append(xField.label,yField.label,y2Field.label);step4.append(graphControls);
  step4.append(plotActions);
  const graphStatus=el('p','propulsion-graph-status','Choose an X axis and at least one Y axis parameter to enable Plot Graph.');graphStatus.id='propulsionGraphStatus';step4.append(graphStatus);
  const graphRangePanel=el('div','propulsion-x-range-panel');
  graphRangePanel.append(el('strong','propulsion-x-range-title','X-Y RANGE SELECTOR'));
  const graphRangeFields=el('div','propulsion-x-range-fields');
  const makeRangeField=(labelText,id,parent=graphRangeFields)=>{const label=el('label','propulsion-graph-field',labelText);const input=document.createElement('input');input.type='number';input.step='any';input.id=id;input.placeholder='Full graph range';input.className='propulsion-column-select';label.append(input);parent.append(label);return input};
  const xRangeStart=makeRangeField('Start X Point','propulsionXRangeStart'),xRangeEnd=makeRangeField('End X Point','propulsionXRangeEnd');
  const yRangeStart=makeRangeField('Start Y Point','propulsionYRangeStart'),yRangeEnd=makeRangeField('End Y Point','propulsionYRangeEnd');
   let graphRangeHasValidPlot=false;
   const updateRangeActionAvailability=()=>{const multipleY=y2Select.value!=='';graphRangePanel.classList.toggle('is-disabled',multipleY);graphRangePanel.setAttribute('aria-disabled',String(multipleY));[xRangeStart,xRangeEnd,yRangeStart,yRangeEnd,applyGraphRange,resetXRange].forEach(control=>{control.disabled=multipleY||(control===resetXRange&&!graphRangeHasValidPlot)});};
  const graphRangeActions=el('div','propulsion-x-range-actions');
  const applyGraphRange=el('button','btn propulsion-x-range-apply','Apply');applyGraphRange.type='button';
  const resetXRange=el('button','btn alt propulsion-x-range-reset','Reset Full Range');resetXRange.type='button';
  resetXRange.disabled=true;
  resetXRange.disabled=true;
  graphRangeActions.append(applyGraphRange,resetXRange);
  graphRangePanel.append(graphRangeFields,graphRangeActions);graphRangePanel.hidden=true;
  const chartHost=el('div','propulsion-chart-host');chartHost.id='propulsionChartHost';step4.append(chartHost);
  const pointExplorer=el('div','propulsion-point-explorer');pointExplorer.hidden=true;
  const pointReadout=el('div','propulsion-point-readout');
  const makeValueCard=(label)=>{const card=el('div','propulsion-point-value');const heading=el('span','propulsion-point-value-label',label);const value=el('strong','propulsion-point-value-number','—');card.append(heading,value);pointReadout.append(card);return {heading,value}};
  const timestampReadout=makeValueCard('TIMESTAMP'),xReadout=makeValueCard('X AXIS'),yReadout=makeValueCard('PRIMARY Y AXIS'),y2Readout=makeValueCard('SECONDARY Y AXIS');
  pointReadout.setAttribute('aria-live','polite');
  const pointSliderLabel=el('label','propulsion-point-slider-label','Explore data point');
  const pointSlider=document.createElement('input');pointSlider.type='range';pointSlider.min='0';pointSlider.max='0';pointSlider.value='0';pointSlider.step='1';pointSlider.id='propulsionPointSlider';pointSlider.disabled=true;pointSlider.setAttribute('aria-label','Select data point on graph');pointSliderLabel.append(pointSlider);
  const pointCounter=el('span','propulsion-point-counter','Point 0 of 0');pointCounter.id='propulsionPointCounter';
  const sliderNavigationSection=el('section','propulsion-point-navigation-section');
  sliderNavigationSection.append(el('strong','propulsion-point-navigation-title','GRAPH NAVIGATION USING SLIDING BAR'));
  sliderNavigationSection.append(pointReadout,pointSliderLabel,pointCounter,graphRangePanel);
  pointExplorer.append(sliderNavigationSection);
  const pointNavigator=el('section','propulsion-point-navigator');
  pointNavigator.append(el('strong','propulsion-point-navigation-title','GRAPH NAVIGATION BY DATA POINT'));
  pointNavigator.append(el('p','propulsion-point-navigator-help','Enter a value in any one field. The nearest matching plotted point will be selected and the other values will update above.'));
  const pointNavFields=el('div','propulsion-point-navigator-fields');
  const makePointSearchField=(key,label,placeholder)=>{const wrap=el('label','propulsion-point-search-field');wrap.append(el('span','',label));const input=document.createElement('input');input.type='text';input.inputMode=key==='timestamp'?'text':'decimal';input.placeholder=placeholder;input.autocomplete='off';input.dataset.pointSearch=key;wrap.append(input);pointNavFields.append(wrap);return input};
  const timestampSearch=makePointSearchField('timestamp','TIMESTAMP','Enter timestamp');
  const xSearch=makePointSearchField('x','X AXIS','Enter X value');
  const ySearch=makePointSearchField('y','PRIMARY Y AXIS','Enter primary Y');
  const y2Search=makePointSearchField('y2','SECONDARY Y AXIS','Enter secondary Y');
  const pointNavActions=el('div','propulsion-point-navigator-actions');
  const navigateToPointButton=el('button','btn propulsion-point-navigate-button','Navigate to this point');navigateToPointButton.type='button';navigateToPointButton.disabled=true;
  const clearPointSearchButton=el('button','btn alt propulsion-point-clear-button','Clear');clearPointSearchButton.type='button';
  const pointNavStatus=el('p','propulsion-point-navigator-status','Enter one value to locate a plotted point.');pointNavStatus.setAttribute('role','status');pointNavStatus.setAttribute('aria-live','polite');
  pointNavActions.append(navigateToPointButton,clearPointSearchButton);
  pointNavigator.append(pointNavFields,pointNavActions,pointNavStatus);pointExplorer.append(pointNavigator);step4.append(pointExplorer);
  const pointSearchInputs=[timestampSearch,xSearch,ySearch,y2Search];
  let lockedPointSearchKey='';
  const syncPointSearchLock=()=>{pointSearchInputs.forEach(input=>{const unavailable=input===y2Search&&y2iForReadout===null;input.disabled=unavailable||(!!lockedPointSearchKey&&input.dataset.pointSearch!==lockedPointSearchKey);});};
  const updatePointSearchLabels=()=>{xSearch.previousSibling.textContent='X · '+headerRow[xiForReadout];ySearch.previousSibling.textContent='PRIMARY Y · '+headerRow[yiForReadout];y2Search.previousSibling.textContent=y2iForReadout===null?'SECONDARY Y · NOT SELECTED':'SECONDARY Y · '+headerRow[y2iForReadout];syncPointSearchLock()};
  const clearPointSearch=()=>{pointSearchInputs.forEach(input=>input.value='');lockedPointSearchKey='';syncPointSearchLock();pointNavStatus.textContent='Enter one value to locate a plotted point.';navigateToPointButton.disabled=!plottedPoints.length};
  pointSearchInputs.forEach(input=>input.addEventListener('input',()=>{if(!lockedPointSearchKey&&input.value.trim()!=='')lockedPointSearchKey=input.dataset.pointSearch;syncPointSearchLock();const entered=pointSearchInputs.filter(field=>field.value.trim()!=='').length;navigateToPointButton.disabled=!plottedPoints.length||entered!==1;pointNavStatus.textContent=entered>1?'Please enter a value in only one field.':entered===1?'Ready to locate the nearest plotted point.':'Enter a value to locate a plotted point. Click Clear to choose another field.'}));
  clearPointSearchButton.addEventListener('click',clearPointSearch);
  navigateToPointButton.addEventListener('click',()=>{
   const selected=pointSearchInputs.filter(field=>field.value.trim()!=='');
   if(selected.length!==1){pointNavStatus.textContent='Enter a value in exactly one field.';return}
   const field=selected[0],key=field.dataset.pointSearch,query=field.value.trim();let found=-1;
   if(key==='timestamp'){
    const exact=plottedPoints.findIndex(point=>String(point.timestamp).toLowerCase()===query.toLowerCase());
    found=exact>=0?exact:plottedPoints.findIndex(point=>String(point.timestamp).toLowerCase().includes(query.toLowerCase()));
   }else{
    const target=Number(query);
    if(!Number.isFinite(target)){pointNavStatus.textContent='Enter a valid numeric value for this axis.';return}
    const property=key==='x'?'x':key==='y'?'y':'y2';
    let distance=Infinity;
    plottedPoints.forEach((point,index)=>{const value=point[property];if(!Number.isFinite(value))return;const delta=Math.abs(value-target);if(delta<distance){distance=delta;found=index}});
   }
   if(found<0){pointNavStatus.textContent=key==='timestamp'?'No plotted point matches that timestamp.':'No numeric plotted values are available for this axis.';return}
   selectGraphPoint(found);
   const actual=plottedPoints[found][key==='timestamp'?'timestamp':key];
   pointNavStatus.textContent=(key==='timestamp'?'Timestamp match selected.':'Nearest plotted value selected: '+formatPointValue(actual)+'.')+' The other three values are shown above.';
  });

  let plottedPoints=[],pointMarker=null,secondaryPointMarker=null,pointGuide=null,xiForReadout=0,yiForReadout=0,y2iForReadout=null;
  const formatPointValue=value=>Number.isFinite(value)?new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(value):'—';
  const selectGraphPoint=index=>{
   if(!plottedPoints.length||!pointMarker||!pointGuide)return;
   const safeIndex=Math.max(0,Math.min(plottedPoints.length-1,Number(index)||0)),point=plottedPoints[safeIndex];
   pointSlider.value=String(safeIndex);pointCounter.textContent='Point '+(safeIndex+1).toLocaleString()+' of '+plottedPoints.length.toLocaleString();
   timestampReadout.heading.textContent='TIMESTAMP';timestampReadout.value.textContent=point.timestamp;
   xReadout.heading.textContent='X · '+headerRow[xiForReadout];xReadout.value.textContent=formatPointValue(point.x);
   yReadout.heading.textContent='PRIMARY Y · '+headerRow[yiForReadout];yReadout.value.textContent=formatPointValue(point.y);
   y2Readout.heading.textContent=y2iForReadout===null?'SECONDARY Y · NOT SELECTED':'SECONDARY Y · '+headerRow[y2iForReadout];y2Readout.value.textContent=formatPointValue(point.y2);
   pointReadout.setAttribute('aria-label','Timestamp '+point.timestamp+', X '+formatPointValue(point.x)+', primary Y '+formatPointValue(point.y)+', secondary Y '+formatPointValue(point.y2));
   if(Number.isFinite(point.y)){pointMarker.setAttribute('cx',point.sx);pointMarker.setAttribute('cy',point.sy);pointMarker.setAttribute('visibility','visible')}else pointMarker.setAttribute('visibility','hidden');
   if(secondaryPointMarker){if(Number.isFinite(point.y2)){secondaryPointMarker.setAttribute('cx',point.sx);secondaryPointMarker.setAttribute('cy',point.sy2);secondaryPointMarker.setAttribute('visibility','visible')}else secondaryPointMarker.setAttribute('visibility','hidden')}
   pointGuide.setAttribute('x1',point.sx);pointGuide.setAttribute('x2',point.sx);
   pointSlider.setAttribute('aria-valuetext','Point '+(safeIndex+1)+' of '+plottedPoints.length+', X '+formatPointValue(point.x)+', primary Y '+formatPointValue(point.y)+', secondary Y '+formatPointValue(point.y2));
  };
  const getRecordHighXPoints=xi=>graphTools.recordHighXPoints(analysisRows,xi,value=>isAccelerationColumn(xi)?toDisplayAcceleration(value):value);
  const getFullGraphXRange=xi=>graphTools.fullXRange(getRecordHighXPoints(xi));
  // Use the live input event as the sole slider update source while dragging.
  pointSlider.addEventListener('input',()=>selectGraphPoint(pointSlider.value));
  plotButton.addEventListener('click',()=>{
   const xi=Number(xSelect.value),yi=Number(ySelect.value),y2i=y2Select.value===''?null:Number(y2Select.value);
   if(xSelect.value===''||ySelect.value===''||!Number.isInteger(xi)||!Number.isInteger(yi)){graphStatus.textContent='Select an X axis and at least one Y axis parameter.';return}
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];const timestampIndex=headerRow.map((name,index)=>({index,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
   // Empty CSV cells are missing values, not numeric zero; this prevents false zero-origin graph segments.
   const parseCsvNumber=graphTools.parseCsvNumber;
   const rawPts=analysisRows.map((row,index)=>({x:isAccelerationColumn(xi)?toDisplayAcceleration(parseCsvNumber(row[xi])):parseCsvNumber(row[xi]),y:isAccelerationColumn(yi)?toDisplayAcceleration(parseCsvNumber(row[yi])):parseCsvNumber(row[yi]),y2:y2i===null?NaN:(isAccelerationColumn(y2i)?toDisplayAcceleration(parseCsvNumber(row[y2i])):parseCsvNumber(row[y2i])),timestamp:timestampIndex===undefined?'Timestamp column not found':String(row[timestampIndex]??'').trim()||'Timestamp unavailable',index})).filter(p=>Number.isFinite(p.x));
   // Keep record-high X values only, preserving original CSV row order.
   const retainedXPoints=getRecordHighXPoints(xi),retainedXIndices=new Set(retainedXPoints.map(point=>point.index));
   const originalPts=rawPts.filter(point=>retainedXIndices.has(point.index));
   const removedReturnPoints=rawPts.length-originalPts.length;
   if(!originalPts.length){graphStatus.textContent='No numeric X values are available to plot.';return}
   const fullGraphRange=getFullGraphXRange(xi);
   if(!fullGraphRange){graphStatus.textContent='No valid full X-axis range is available for this column.';return}
   const fullXMin=fullGraphRange.min,fullXMax=fullGraphRange.max;
   const fullYValues=originalPts.map(point=>point.y).filter(Number.isFinite);
   if(!fullYValues.length){graphStatus.textContent='No numeric Primary Y values are available to plot.';return}
   const fullYDataMin=Math.min(...fullYValues),fullYDataMax=Math.max(...fullYValues);
    const fullY2Values=y2i===null?[]:originalPts.map(point=>point.y2).filter(Number.isFinite),rawY2Min=fullY2Values.length?Math.min(...fullY2Values):NaN,rawY2Max=fullY2Values.length?Math.max(...fullY2Values):NaN,fullY2Min=rawY2Min===rawY2Max?rawY2Min-1:rawY2Min,fullY2Max=rawY2Min===rawY2Max?rawY2Max+1:rawY2Max;
   const fullYMin=fullYDataMin===fullYDataMax?fullYDataMin-1:fullYDataMin,fullYMax=fullYDataMin===fullYDataMax?fullYDataMax+1:fullYDataMax;
   if(xRangeStart.value===''||xRangeEnd.value===''){xRangeStart.value=String(fullXMin);xRangeEnd.value=String(fullXMax)}
   if(yRangeStart.value===''||yRangeEnd.value===''){yRangeStart.value=String(fullYMin);yRangeEnd.value=String(fullYMax)}
   const rangeStart=Number(xRangeStart.value),rangeEnd=Number(xRangeEnd.value),rangeYStart=Number(yRangeStart.value),rangeYEnd=Number(yRangeEnd.value);
   if(!Number.isFinite(rangeStart)||!Number.isFinite(rangeEnd)||rangeStart>rangeEnd||(rangeStart===rangeEnd&&fullXMin!==fullXMax)||rangeStart<fullXMin||rangeEnd>fullXMax){
    graphRangePanel.hidden=false;
    graphStatus.textContent='Enter a valid X range within '+new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(fullXMin)+' to '+new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(fullXMax)+'. Start X Point must not exceed End X Point. The last valid graph has been retained.';return;
   }
   if(!Number.isFinite(rangeYStart)||!Number.isFinite(rangeYEnd)||rangeYStart>=rangeYEnd||rangeYStart<fullYMin||rangeYEnd>fullYMax){
    graphRangePanel.hidden=false;
    graphStatus.textContent='Enter a valid Primary Y range within '+new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(fullYMin)+' to '+new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(fullYMax)+'. Start Y Point must be lower than End Y Point. The last valid graph has been retained.';return;
   }
    const pts=originalPts.filter(p=>p.x>=rangeStart&&p.x<=rangeEnd);
   const primaryPts=pts.filter(p=>Number.isFinite(p.y)&&p.y>=rangeYStart&&p.y<=rangeYEnd),secondaryPts=pts.filter(p=>Number.isFinite(p.y2));
   if(primaryPts.length<2||(y2i!==null&&secondaryPts.length<2)){
    graphRangePanel.hidden=false;
    graphStatus.textContent='The selected X range does not contain enough valid data points for the selected Y axis. Widen the range. The last valid graph has been retained.';return;
   }
   graphRangePanel.hidden=false;
   if(primaryPts.length<2){chartHost.replaceChildren();graphStatus.textContent='Not enough numeric X and Primary Y row pairs to plot the primary axis.';return}
   if(y2i!==null&&secondaryPts.length<2){chartHost.replaceChildren();graphStatus.textContent='Not enough numeric X and Secondary Y row pairs to plot the secondary axis.';return}
   const W=1040,H=520,L=132,R=y2i===null?34:100,T=30,B=88,pw=W-L-R,ph=H-T-B;
   const range=values=>{let min=Math.min(...values),max=Math.max(...values);if(min===max){min-=1;max+=1}return {min,max}};
   const xr=range(pts.map(p=>p.x)),yr={min:rangeYStart,max:rangeYEnd},y2r=y2i===null?null:range(secondaryPts.map(p=>p.y2));
   const sx=v=>L+(v-xr.min)/(xr.max-xr.min)*pw,sy=v=>T+ph-(v-yr.min)/(yr.max-yr.min)*ph,sy2=v=>y2r?T+ph-(v-y2r.min)/(y2r.max-y2r.min)*ph:0;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',headerRow[xi]+' versus '+headerRow[yi]+(y2i===null?'':' and '+headerRow[y2i]));svg.classList.add('propulsion-chart-svg');
   const add=(tag,attrs,textValue)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));if(textValue!==undefined)n.textContent=textValue;svg.append(n);return n};
   const fmt=value=>new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(value);
   const axisTicks={x:[],y:[],y2:[]};
   for(let i=0;i<=5;i++){const x=L+pw*i/5,y=T+ph-ph*i/5;add('line',{x1:x,y1:T,x2:x,y2:T+ph,stroke:'#e3eaf1','stroke-width':1});add('line',{x1:L,y1:y,x2:L+pw,y2:y,stroke:'#e3eaf1','stroke-width':1});axisTicks.x.push(add('text',{x,y:T+ph+28,'text-anchor':'middle',fill:'#000000','font-size':16,'font-weight':800},fmt(xr.min+(xr.max-xr.min)*i/5)));axisTicks.y.push(add('text',{x:L-16,y:y+6,'text-anchor':'end',fill:'#000000','font-size':16,'font-weight':800},fmt(yr.min+(yr.max-yr.min)*i/5)));if(y2r)axisTicks.y2.push(add('text',{x:L+pw+16,y:y+6,'text-anchor':'start',fill:'#000000','font-size':16,'font-weight':800},fmt(y2r.min+(y2r.max-y2r.min)*i/5)))}
   add('line',{x1:L,y1:T+ph,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':3.5});add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#111827','stroke-width':3.5});if(y2r)add('line',{x1:L+pw,y1:T,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':3.5});
   const clipId='propulsion-plot-clip-'+Math.random().toString(36).slice(2);const defs=document.createElementNS('http://www.w3.org/2000/svg','defs'),clip=document.createElementNS('http://www.w3.org/2000/svg','clipPath');clip.setAttribute('id',clipId);const clipRect=document.createElementNS('http://www.w3.org/2000/svg','rect');clipRect.setAttribute('x',L);clipRect.setAttribute('y',T);clipRect.setAttribute('width',pw);clipRect.setAttribute('height',ph);clip.append(clipRect);defs.append(clip);svg.append(defs);
   const plotViewport=document.createElementNS('http://www.w3.org/2000/svg','g');plotViewport.setAttribute('clip-path',`url(#${clipId})`);svg.append(plotViewport);
   const plotGroup=document.createElementNS('http://www.w3.org/2000/svg','g');plotViewport.append(plotGroup);
   const plotAdd=(tag,attrs,textValue)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>node.setAttribute(k,String(v)));if(textValue!==undefined)node.textContent=textValue;plotGroup.append(node);return node};
   const drawSeries=(series,yFn,color)=>{const d=series.map((p,i)=>(i?'L':'M')+sx(p.x).toFixed(2)+','+yFn(p).toFixed(2)).join(' ');plotAdd('path',{d,fill:'none',stroke:color,'stroke-width':2.5,'stroke-linejoin':'round','stroke-linecap':'round'});series.forEach(p=>plotAdd('circle',{cx:sx(p.x),cy:yFn(p),r:3.2,fill:color,opacity:.85}))};
   drawSeries(primaryPts,p=>sy(p.y),'#287fbd');if(y2r)drawSeries(secondaryPts,p=>sy2(p.y2),'#dc8123');
   add('text',{x:L+pw/2,y:H-20,'text-anchor':'middle',fill:'#123b70','font-size':16,'font-weight':700},headerRow[xi]+(isAccelerationColumn(xi)?' (g)':''));
   const yl=add('text',{x:30,y:T+ph/2,'text-anchor':'middle',fill:'#287fbd','font-size':15,'font-weight':700},headerRow[yi]+(isAccelerationColumn(yi)?' (g)':''));yl.setAttribute('transform',`rotate(-90 30 ${T+ph/2})`);
   if(y2r){const yrLabel=add('text',{x:W-20,y:T+ph/2,'text-anchor':'middle',fill:'#dc8123','font-size':15,'font-weight':700},headerRow[y2i]+(isAccelerationColumn(y2i)?' (g)':''));yrLabel.setAttribute('transform',`rotate(90 ${W-20} ${T+ph/2})`)}
   pointGuide=plotAdd('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#e28b24','stroke-width':1.5,'stroke-dasharray':'5 4',opacity:.9});
   plottedPoints=pts.filter(p=>Number.isFinite(p.y)&&p.y>=rangeYStart&&p.y<=rangeYEnd).map(p=>({...p,sx:sx(p.x),sy:sy(p.y),sy2:Number.isFinite(p.y2)?sy2(p.y2):T+ph}));
   xiForReadout=xi;yiForReadout=yi;y2iForReadout=y2i;
   const firstNavigable=plottedPoints[0]||null;
   pointMarker=plotAdd('circle',{cx:firstNavigable?.sx??sx(primaryPts[0].x),cy:firstNavigable?.sy??sy(primaryPts[0].y),r:7,fill:'#fff',stroke:'#287fbd','stroke-width':3,visibility:firstNavigable?'visible':'hidden'});
   secondaryPointMarker=y2r?plotAdd('circle',{cx:firstNavigable?.sx??sx(secondaryPts[0].x),cy:firstNavigable?.sy2??sy2(secondaryPts[0].y2),r:7,fill:'#fff',stroke:'#dc8123','stroke-width':3,visibility:firstNavigable&&Number.isFinite(firstNavigable.y2)?'visible':'hidden'}):null;
   const pointNodes=[];plottedPoints.forEach((p,index)=>{const addHitTarget=y=>{const node=plotAdd('circle',{cx:p.sx,cy:y,r:11,fill:'transparent',stroke:'transparent'});node.style.cursor='crosshair';node.addEventListener('pointerenter',()=>selectGraphPoint(index));node.addEventListener('focus',()=>selectGraphPoint(index));node.setAttribute('tabindex','0');node.setAttribute('aria-label','X '+formatPointValue(p.x)+', primary Y '+formatPointValue(p.y)+', secondary Y '+formatPointValue(p.y2));pointNodes.push(node)};addHitTarget(p.sy);if(Number.isFinite(p.y2))addHitTarget(p.sy2)});
   chartHost.replaceChildren(svg);pointExplorer.hidden=false;pointSlider.disabled=plottedPoints.length===0;pointSlider.max=String(Math.max(0,plottedPoints.length-1));pointSlider.value='0';updatePointSearchLabels();clearPointSearch();
   if(plottedPoints.length){selectGraphPoint(0);pointNavStatus.textContent='Slider and graph point selection are mapped to '+plottedPoints.length.toLocaleString()+' records inside the applied X, Primary Y'+(y2i===null?'':' and Secondary Y')+' ranges.';}
   else{pointCounter.textContent='Point 0 of 0';pointReadout.setAttribute('aria-label','No data points fall within the applied X and Primary Y ranges');timestampReadout.heading.textContent='TIMESTAMP';timestampReadout.value.textContent='No eligible data point';xReadout.heading.textContent='X · '+headerRow[xi];xReadout.value.textContent='—';yReadout.heading.textContent='PRIMARY Y · '+headerRow[yi];yReadout.value.textContent='—';y2Readout.heading.textContent=y2i===null?'SECONDARY Y · NOT SELECTED':'SECONDARY Y · '+headerRow[y2i];y2Readout.value.textContent='—';pointNavStatus.textContent='No data points fall within all applied ranges. Widen the X, Primary Y or Secondary Y range, then click Apply.';}
   graphRangeStart=String(rangeStart);graphRangeEnd=String(rangeEnd);graphYRangeStart=String(rangeYStart);graphYRangeEnd=String(rangeYEnd);graphY2RangeStart='';graphY2RangeEnd='';graphRangeHasValidPlot=true;updateRangeActionAvailability();
   graphStatus.textContent='Plotted '+primaryPts.length.toLocaleString()+' primary Y pairs'+(y2r?' and '+secondaryPts.length.toLocaleString()+' secondary Y pairs':'')+' · '+plottedPoints.length.toLocaleString()+' navigable points inside the applied X, Primary Y'+(y2i===null?'':' and Secondary Y')+' ranges · X: '+headerRow[xi]+' · Primary Y: '+headerRow[yi]+(y2i===null?'':' · Secondary Y: '+headerRow[y2i])+'. '+removedReturnPoints.toLocaleString()+' points below the previous highest X value removed. Only record-high or equal-high X values are retained in CSV row order. Both Y series share the same X axis and use independent left/right scales.';graphXIndex=String(xi);graphYIndex=String(yi);graphY2Index=y2i===null?'':String(y2i);saveState();
  });
   applyGraphRange.addEventListener('click',()=>{
    if(y2Select.value!=='')return;
    if(xSelect.value===''||ySelect.value===''){graphStatus.textContent='Select X and Y parameters before applying a graph range.';return;}
    plotButton.click();
   });
   graphRangeHasValidPlot=false;updateRangeActionAvailability();
   resetXRange.addEventListener('click',()=>{
    if(y2Select.value!=='')return;
    const xi=Number(xSelect.value),yi=Number(ySelect.value);if(!Number.isInteger(xi)||!Number.isInteger(yi)||xSelect.value===''||ySelect.value==='')return;
    const fullX=getFullGraphXRange(xi);
    const retainedIndices=new Set(getRecordHighXPoints(xi).map(point=>point.index));
    const fullY=analysisRows.map((row,index)=>{if(!retainedIndices.has(index))return NaN;const value=String(row[yi]??'').trim();return value===''?NaN:Number(value)}).filter(Number.isFinite);
    if(!fullX||!fullY.length){graphStatus.textContent='Cannot reset: no valid full graph range was found.';return;}
    xRangeStart.value=String(fullX.min);xRangeEnd.value=String(fullX.max);
    const minY=Math.min(...fullY),maxY=Math.max(...fullY);yRangeStart.value=String(minY===maxY?minY-1:minY);yRangeEnd.value=String(minY===maxY?maxY+1:maxY);
    graphRangeHasValidPlot=false;updateRangeActionAvailability();
     plotButton.click();
   });
    const step5=el('section','propulsion-report-card propulsion-step-card propulsion-step-card--purple');step5.id='propulsionReportGenerationCard';step5.hidden=true;
  const returnToDataFiltering=()=>{reportDirectVisible=false;step3FilterVisible=true;step3Visible=false;step4Visible=false;step5Visible=false;analysisPanel.hidden=false;step3Filter.hidden=false;step3.hidden=true;step4.hidden=true;step5.hidden=true;reportProceed.disabled=false;reportProceed.textContent='Proceed to Generate Report';saveState();step3Filter.scrollIntoView({behavior:'smooth',block:'start'});};
  const addReturnButton=(parent)=>{const actions=el('div','propulsion-actions');const button=el('button','btn alt','Return to Data Filtering & Sorting');button.type='button';button.addEventListener('click',returnToDataFiltering);actions.append(button);parent.append(actions);return button;};
  step5.append(el('span','propulsion-step-label','STEP 06 · REPORT GENERATION'));
  const reportBuilder=el('div','propulsion-report-builder');
  const reportForm=el('div','propulsion-report-form');
  reportForm.append(el('h3','','Test Identification'));
  const reportFields={};
  const makeReportField=(key,label,required,type='text')=>{const wrap=el('label','propulsion-report-field');const caption=el('span','',label+(required?' *':''));const input=document.createElement('input');input.type=type;input.id='report_'+key;input.required=required;input.placeholder=label;input.addEventListener('input',updateReportPreview);wrap.append(caption,input);reportForm.append(wrap);reportFields[key]=input;};
  makeReportField('motorName','Enter Motor Name',true);
  makeReportField('escName','Enter ESC Name',true);
  makeReportField('propellerName','Enter Propeller Name',true);
  makeReportField('testDate','Test Date',true,'date');
  makeReportField('motorId','Enter Motor ID',false);
  makeReportField('escId','Enter ESC ID',false);
  makeReportField('propellerId','Enter Propeller ID',false);
  const reportTypeWrap=el('label','propulsion-report-field propulsion-report-field--wide');reportTypeWrap.append(el('span','','Test Report Type *'));const reportTypeSelect=document.createElement('select');reportTypeSelect.id='report_testReportType';reportTypeSelect.required=true;reportTypeSelect.className='propulsion-column-select';const reportTypePlaceholder=document.createElement('option');reportTypePlaceholder.value='';reportTypePlaceholder.textContent='Select Test Report Type';reportTypePlaceholder.disabled=true;reportTypePlaceholder.selected=true;reportTypeSelect.append(reportTypePlaceholder);['Thrust Log Report','Torque Log Report'].forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;reportTypeSelect.append(option)});reportTypeSelect.addEventListener('change',updateReportPreview);reportTypeWrap.append(reportTypeSelect);reportForm.append(reportTypeWrap);reportFields.testReportType=reportTypeSelect;
  const objectiveWrap=el('label','propulsion-report-field propulsion-report-field--wide');objectiveWrap.append(el('span','','Objective of the Test'));const objectiveInput=document.createElement('textarea');objectiveInput.id='report_objective';objectiveInput.rows=3;objectiveInput.placeholder='Describe the objective of this propulsion test';objectiveInput.addEventListener('input',updateReportPreview);objectiveWrap.append(objectiveInput);reportForm.append(objectiveWrap);reportFields.objective=objectiveInput;
  const reportGraphControls=el('div','propulsion-report-graph-controls');reportGraphControls.append(el('h3','','Graphical Report Selection'));
  const reportGraphSelect=(label,source)=>{const wrap=el('label','propulsion-report-field');wrap.append(el('span','',label));const select=document.createElement('select');select.className='propulsion-column-select';const blank=document.createElement('option');blank.value='';blank.textContent='Select CSV column';select.append(blank);headerRow.forEach((name,index)=>{const op=document.createElement('option');op.value=String(index);op.textContent=name;select.append(op)});wrap.append(select);reportGraphControls.append(wrap);return select;};
  const reportX=reportGraphSelect('Choose X Axis',null),reportY=reportGraphSelect('Choose Primary Y Axis',null),reportY2=reportGraphSelect('Choose Secondary Y Axis (Optional)',null);
  // Report graphs deliberately use a separate renderer and local axis selections.
  // They must never read or mutate Step 05 selectors, ranges, chart, navigation or saved state.
  const renderReportGraph=(xi,yi,y2i)=>{
   const parse=value=>{const raw=String(value??'').trim();if(raw==='')return NaN;const n=Number(raw);return Number.isFinite(n)?n:NaN};
   let highestX=-Infinity;
   const points=[];
   analysisRows.forEach((row,index)=>{const x=parse(row[xi]);if(!Number.isFinite(x)||x<highestX)return;highestX=x;const y=parse(row[yi]),y2=y2i===null?NaN:parse(row[y2i]);points.push({x,y,y2,index})});
   const primary=points.filter(p=>Number.isFinite(p.y));
   const secondary=y2i===null?[]:points.filter(p=>Number.isFinite(p.y2));
   if(primary.length<2)return {error:'At least two valid X / Primary Y data points are required.'};
   if(y2i!==null&&secondary.length<2)return {error:'At least two valid X / Secondary Y data points are required.'};
   const bounds=values=>{let min=Math.min(...values),max=Math.max(...values);if(min===max){const pad=Math.abs(min)*0.05||1;min-=pad;max+=pad;}return {min,max};};
   const xr=bounds(points.map(p=>p.x)),yr=bounds(primary.map(p=>p.y)),y2r=secondary.length?bounds(secondary.map(p=>p.y2)):null;
   const W=1040,H=520,L=132,R=y2r?100:34,T=30,B=88,pw=W-L-R,ph=H-T-B;
   const sx=v=>L+(v-xr.min)/(xr.max-xr.min)*pw,sy=v=>T+ph-(v-yr.min)/(yr.max-yr.min)*ph,sy2=v=>y2r?T+ph-(v-y2r.min)/(y2r.max-y2r.min)*ph:0;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',headerRow[xi]+' versus '+headerRow[yi]+(y2r?' and '+headerRow[y2i]:''));svg.classList.add('propulsion-chart-svg','propulsion-report-graph-svg');
   const add=(tag,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));if(text!==undefined)n.textContent=text;svg.append(n);return n;};
   const fmt=v=>new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(v);
   for(let i=0;i<=5;i++){const x=L+pw*i/5,y=T+ph-ph*i/5;add('line',{x1:x,y1:T,x2:x,y2:T+ph,stroke:'#e3eaf1','stroke-width':1});add('line',{x1:L,y1:y,x2:L+pw,y2:y,stroke:'#e3eaf1','stroke-width':1});add('text',{x,y:T+ph+28,'text-anchor':'middle',fill:'#000000','font-size':16,'font-weight':800},fmt(xr.min+(xr.max-xr.min)*i/5));add('text',{x:L-16,y:y+6,'text-anchor':'end',fill:'#000000','font-size':16,'font-weight':800},fmt(yr.min+(yr.max-yr.min)*i/5));if(y2r)add('text',{x:L+pw+16,y:y+6,'text-anchor':'start',fill:'#000000','font-size':16,'font-weight':800},fmt(y2r.min+(y2r.max-y2r.min)*i/5));}
   add('line',{x1:L,y1:T+ph,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':3.5});add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#111827','stroke-width':3.5});if(y2r)add('line',{x1:L+pw,y1:T,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':3.5});
   const draw=(series,yFn,color)=>{const d=series.map((p,i)=>(i?'L':'M')+sx(p.x).toFixed(2)+','+yFn(p).toFixed(2)).join(' ');add('path',{d,fill:'none',stroke:color,'stroke-width':2.8,'stroke-linejoin':'round','stroke-linecap':'round'});series.forEach(p=>add('circle',{cx:sx(p.x),cy:yFn(p),r:3.5,fill:color,opacity:.9}));};
   draw(primary,p=>sy(p.y),'#287fbd');if(y2r)draw(secondary,p=>sy2(p.y2),'#dc8123');
   add('text',{x:L+pw/2,y:H-20,'text-anchor':'middle',fill:'#123b70','font-size':16,'font-weight':700},headerRow[xi]);
   const yl=add('text',{x:30,y:T+ph/2,'text-anchor':'middle',fill:'#287fbd','font-size':15,'font-weight':700},headerRow[yi]);yl.setAttribute('transform',`rotate(-90 30 ${T+ph/2})`);
   if(y2r){const yrLabel=add('text',{x:W-20,y:T+ph/2,'text-anchor':'middle',fill:'#dc8123','font-size':15,'font-weight':700},headerRow[y2i]);yrLabel.setAttribute('transform',`rotate(90 ${W-20} ${T+ph/2})`);}
   return {svg,pointCount:primary.length,secondaryCount:secondary.length};
  };
  const addReportGraph=el('button','btn alt','Add Graph to Report');addReportGraph.type='button';const reportGraphCount=el('span','propulsion-report-graph-count','0 of 5 graphs added');const reportGraphList=el('div','propulsion-report-graph-list');let reportGraphs=[];
  addReportGraph.addEventListener('click',()=>{if(reportGraphs.length>=5){reportGraphCount.textContent='Maximum of 5 graphs reached';return}if(reportX.value===''||reportY.value===''){reportGraphCount.textContent='Select X and Primary Y axes first';return}const xi=Number(reportX.value),yi=Number(reportY.value),y2i=reportY2.value===''?null:Number(reportY2.value);if(!Number.isInteger(xi)||!Number.isInteger(yi)||(y2i!==null&&!Number.isInteger(y2i))){reportGraphCount.textContent='Select valid CSV columns.';return}const result=renderReportGraph(xi,yi,y2i);if(result.error){reportGraphCount.textContent=result.error;return}const card=el('div','propulsion-report-graph-item');const heading=el('strong','',headerRow[yi]+' vs '+headerRow[xi]+(y2i===null?'':' · '+headerRow[y2i]));const remove=el('button','btn alt','Remove');remove.type='button';remove.addEventListener('click',()=>{reportGraphs=reportGraphs.filter(item=>item.card!==card);card.remove();refreshReportGraphCount();updateReportPreview()});card.append(heading,remove,result.svg);reportGraphList.append(card);reportGraphs.push({card,svg:result.svg,title:heading.textContent});refreshReportGraphCount();updateReportPreview();});
  const refreshReportGraphCount=()=>{reportGraphCount.textContent=reportGraphs.length+' of 5 graphs added';addReportGraph.disabled=reportGraphs.length>=5;};
  reportGraphControls.append(addReportGraph,reportGraphCount,reportGraphList);
  const reportPreviewPanel=el('div','propulsion-report-preview-panel');reportPreviewPanel.append(el('h3','','Live A4 PDF Preview'));
  const reportPreview=el('div','propulsion-report-preview-pages');reportPreview.id='propulsionReportLivePreview';
  const exportActions=el('div','propulsion-actions');const exportPdf=el('button','btn propulsion-report-export-btn','Export Report as PDF');exportPdf.type='button';exportPdf.addEventListener('click',()=>{const missing=reportTools.missingRequiredFields(Object.fromEntries(Object.entries(reportFields).map(([key,field])=>[key,field.value])));if(missing.length){reportForm.querySelector('#report_'+missing[0]).focus();reportPreviewPanel.querySelector('.propulsion-report-validation').textContent='Complete all mandatory fields before exporting.';return}
   const printMarkup=reportPreview.cloneNode(true);printMarkup.id='propulsionReportLivePreview';
   printReportMarkup(printMarkup,'propulsionReportLivePreview','YETI Propulsion Validation Report',message=>{reportPreviewPanel.querySelector('.propulsion-report-validation').textContent=message;});
  });const validation=el('p','propulsion-report-validation','Complete the mandatory fields to enable a valid report export.');exportActions.append(exportPdf);reportPreviewPanel.append(reportPreview,validation,exportActions);
  reportBuilder.append(reportForm,reportGraphControls,reportPreviewPanel);step5.append(reportBuilder);
  function updateReportPreview(){
   reportPreview.replaceChildren();
   const cover=el('article','propulsion-report-page propulsion-report-cover');
   const brand=el('div','propulsion-report-brand-lockup');
   const mark=document.createElementNS('http://www.w3.org/2000/svg','svg');mark.setAttribute('viewBox','0 0 300 210');mark.setAttribute('role','img');mark.setAttribute('aria-label','ideaForge logo');
   const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M8 150h58c8 0 13-5 13-13V92c0-8 5-13 13-13h58c8 0 13-5 13-13V13c0-8 5-13 13-13h58c8 0 13 5 13 13v72c0 8-5 13-13 13h-58c-8 0-13 5-13 13v45c0 8-5 13-13 13H92c-8 0-13 5-13 13v21c0 8-5 13-13 13H8c-8 0-8-5-8-13v-40c0-8 0-13 8-13z');path.setAttribute('fill','#8cc63e');mark.append(path);
   const word=el('div','propulsion-report-wordmark');const idea=el('div','propulsion-report-ideaforge');idea.append(el('span','propulsion-report-idea','idea'),el('span','propulsion-report-forge','Forge'),el('sup','','™'));word.append(idea,el('div','propulsion-report-tagline','Create. Inspire.'));
   const reportTitle=el('h1','propulsion-report-inline-title','YETI Propulsion Bench Data Validation Report');
   brand.append(mark,word,reportTitle);cover.append(brand);
   const coverRule=el('div','propulsion-report-accent-rule');cover.append(coverRule);
   const coverTable=document.createElement('table');coverTable.className='propulsion-report-detail-table';
   const details=[['Motor Name','motorName'],['ESC Name','escName'],['Propeller Name','propellerName'],['Test Date','testDate'],['Motor ID','motorId'],['ESC ID','escId'],['Propeller ID','propellerId']];
   details.forEach(([label,key])=>{const tr=document.createElement('tr');tr.append(el('th','',label),el('td','',reportFields[key].value.trim()||'—'));coverTable.append(tr)});
   const reportTypeRow=document.createElement('tr');reportTypeRow.append(el('th','','Test Report Type'),el('td','',reportFields.testReportType.value||'—'));coverTable.append(reportTypeRow);
   const objectiveRow=document.createElement('tr');objectiveRow.append(el('th','','Test Objective'),el('td','propulsion-report-objective',reportFields.objective.value.trim()));coverTable.append(objectiveRow);
   cover.append(coverTable);
   const coverMeta=el('div','propulsion-report-cover-meta');coverMeta.append(el('span','','VALIDATED DATASET · '+analysisRows.length.toLocaleString()+' records'));cover.append(coverMeta);
const statsPage=el('section','propulsion-report-summary-page');
   statsPage.append(el('div','propulsion-report-page-kicker','01  /  TEST RESULTS'),el('h2','','EXECUTIVE PERFORMANCE SUMMARY'));
   const units={thrust:'N',torque:'Nm',commandRpm:'RPM',actualRpm:'RPM',voltage:'V',current:'A',motorTemperature:'°C',escTemperature:'°C',accelerationX:'g',accelerationY:'g',accelerationZ:'g'};
   const getNum=(row,key)=>{const idx=mapping[key]?.selected;if(idx===undefined||idx==='')return NaN;const raw=String(row[idx]??'').trim();if(raw==='')return NaN;const value=Number(raw);return accelerationParameterKeys.has(key)?toDisplayAcceleration(value):value};
   const fmt=(v,d=2)=>Number.isFinite(v)?new Intl.NumberFormat(undefined,{maximumFractionDigits:d}).format(v):'—';
   const peak=(key)=>{let scoreMax=-Infinity,at=-1;analysisRows.forEach((row,i)=>{const v=getNum(row,key),score=(key==='torque'||accelerationParameterKeys.has(key))?Math.abs(v):v;if(Number.isFinite(v)&&score>scoreMax){scoreMax=score;at=i}});return {value:at>=0?getNum(analysisRows[at],key):NaN,at}};
   const pThrust=peak('thrust'),pTorque=peak('torque'),pRpm=peak('actualRpm'),pVolt=peak('voltage'),pCurrent=peak('current'),pMotor=peak('motorTemperature'),pEsc=peak('escTemperature');
   let peakInputPower=0,peakThrustPerKw=0,sumAbsRpmError=0,rpmErrorCount=0,maxRpmError=0;
   analysisRows.forEach(row=>{const v=getNum(row,'voltage'),a=getNum(row,'current'),t=getNum(row,'thrust'),cmd=getNum(row,'commandRpm'),rpm=getNum(row,'actualRpm');if(Number.isFinite(v)&&Number.isFinite(a)){const kw=v*a/1000;if(kw>peakInputPower)peakInputPower=kw;if(Number.isFinite(t)&&kw>0)peakThrustPerKw=Math.max(peakThrustPerKw,t/kw)}if(Number.isFinite(cmd)&&cmd!==0&&Number.isFinite(rpm)){const e=Math.abs((rpm-cmd)/cmd)*100;sumAbsRpmError+=e;rpmErrorCount++;maxRpmError=Math.max(maxRpmError,e)}});
   const kpiGrid=el('div','propulsion-report-kpi-grid propulsion-report-all-parameters');
   activeSpecs('report').forEach(spec=>{const m=peak(spec.key);const card=el('div','propulsion-report-kpi');card.append(el('span','',('MAXIMUM '+spec.label).toUpperCase()),el('strong','',m.at>=0?fmt(m.value)+' '+units[spec.key]:'—'));kpiGrid.append(card)});
   statsPage.append(kpiGrid);
   statsPage.append(el('p','propulsion-report-small-note','Dataset: '+analysisRows.length.toLocaleString()+' rows included; records with Actual RPM = 0 excluded. Values shown are maximum recorded values for each mapped parameter.'));
   cover.append(statsPage);
   cover.append(el('p','propulsion-report-footer','YETI FLIGHT TRIAL  /  PROPULSION VALIDATION  /  ENGINEERING MANAGEMENT REVIEW'));
   reportPreview.append(cover);

   if(reportGraphs.length){for(const pageGraphs of reportTools.pairGraphPages(reportGraphs)){const graphPage=el('article','propulsion-report-page propulsion-report-graph-page');graphPage.append(el('div','propulsion-report-page-kicker','02  /  GRAPHICAL ANALYSIS'),el('h2','','PROPULSION PERFORMANCE PLOTS'));pageGraphs.forEach((item,index)=>{const wrap=el('div','propulsion-report-preview-graph');wrap.append(el('h3','',String(reportPreview.querySelectorAll('.propulsion-report-preview-graph').length+1).padStart(2,'0')+'  '+item.title),item.svg.cloneNode(true));graphPage.append(wrap)});reportPreview.append(graphPage)}}
   const valid=reportTools.isReady(Object.fromEntries(Object.entries(reportFields).map(([key,field])=>[key,field.value])));
   // Keep PDF export unavailable until every mandatory identification field is valid.
   exportPdf.disabled=!valid;
   exportPdf.setAttribute('aria-disabled',String(!valid));
   validation.textContent=valid?'Mandatory identification fields complete. PDF export is ready.':'Complete Motor Name, ESC Name, Propeller Name, Test Date and Test Report Type before exporting.';
  }
  updateReportPreview();
  const reportProceedActions=el('div','propulsion-actions');const reportProceed=el('button','btn','Proceed to Generate Report');reportProceed.type='button';reportProceed.id='proceedToGenerateReportBtn';const setReportSectionOpen=(open)=>{step5Visible=!!open;step5.hidden=!step5Visible;reportProceed.disabled=step5Visible;reportProceed.textContent=step5Visible?'Report Section Opened':'Proceed to Generate Report';};reportProceed.addEventListener('click',()=>{reportDirectVisible=false;setReportSectionOpen(true);saveState();step5.scrollIntoView({behavior:'smooth',block:'start'});});step4.append(reportProceedActions);reportProceedActions.append(reportProceed);
  addReturnButton(step4);
  addReturnButton(step5);
  workspace.insertBefore(step4,workspace.querySelector('.propulsion-local-note'));
  workspace.insertBefore(step5,workspace.querySelector('.propulsion-local-note'));
  confirm.addEventListener('click',()=>{
   if(!validateMapping())return;
   // Exclude rows with an exactly zero Actual RPM from every analysis stage after mapping.
   const actualRpmColumn=mapping.actualRpm.selected;
   const isZeroActualRpm=row=>{const raw=String(row[actualRpmColumn]??'').trim();if(raw==='')return false;const value=Number(raw);return Number.isFinite(value)&&value===0};
   const zeroActualRpmRows=dataRows.filter(isZeroActualRpm).length;
   analysisRows=dataRows.filter(row=>!isZeroActualRpm(row));
   confirmed=true;calculatedParameterDefinitions.forEach(parameter=>calculatedParameterControls[parameter.key]?.updateMappingNote());confirm.disabled=true;confirm.textContent='Mapping Confirmed';
   // The 1-log workflow does not need a duplicate green mapping-confirmation summary.
   next.hidden=true;next.replaceChildren();proceed.hidden=true;directReportProceed.hidden=true;step3Filter.append(filterActions);step3.hidden=true;step3Filter.hidden=false;step3FilterVisible=true;saveState();
   saveState();
  });
  directReportProceed.addEventListener('click',()=>{if(!confirmed||!generatedCsvText)return;reportDirectVisible=true;step3Visible=false;step4Visible=false;step5Visible=true;analysisPanel.hidden=false;step3Filter.hidden=false;step3.hidden=true;step4.hidden=true;step5.hidden=false;saveState();step5.scrollIntoView({behavior:'smooth',block:'start'});});
  proceed.addEventListener('click',()=>{if(!confirmed)return;showParameterSummary();});
  const showParameterSummary=()=>{
   if(!confirmed)return;
   step3FilterVisible=false;reportDirectVisible=false;step3Visible=true;step4Visible=false;step5Visible=false;analysisPanel.hidden=false;step3Filter.hidden=false;step3.hidden=false;step4.hidden=true;step5.hidden=true;step3.replaceChildren();
   step3.append(el('span','propulsion-step-label','STEP 04 · PARAMETER SUMMARY'));
   step3.append(el('h3','','Mapped Parameter Statistics'));
   step3.append(el('p','propulsion-statistics-description','All statistics below use only the generated Filtered & Sorted CSV dataset ('+analysisRows.length.toLocaleString()+' rows).'));
   const tableWrap=el('div','propulsion-statistics-table-wrap');
   const table=document.createElement('table');table.className='propulsion-statistics-table';
   const thead=document.createElement('thead'),headRow=document.createElement('tr');
   ['Parameter','Mapped CSV Column','Maximum','Timestamp'].forEach(label=>headRow.append(el('th','',label)));
   thead.append(headRow);table.append(thead);
   const tbody=document.createElement('tbody');
   const units={thrust:'N',torque:'Nm',commandRpm:'RPM',actualRpm:'RPM',voltage:'V',current:'A',motorTemperature:'°C',escTemperature:'°C',accelerationX:'g',accelerationY:'g',accelerationZ:'g'};
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
   const timestampIndex=headerRow.map((name,index)=>({index,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
   const fmt=value=>new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(value);
   activeSpecs('report').forEach(s=>{
    const idx=mapping[s.key].selected;
    let max=-Infinity,maxRow=-1;
    analysisRows.forEach((row,rowIndex)=>{
     const raw=String(row[idx]??'').trim();
     if(raw==='')return;
     const rawValue=Number(raw);
     const value=accelerationParameterKeys.has(s.key)?toDisplayAcceleration(rawValue):rawValue;const score=(s.key==='torque'||accelerationParameterKeys.has(s.key))?Math.abs(value):value;
     if(Number.isFinite(value)&&score>max){max=score;maxRow=rowIndex}
    });
    const tr=document.createElement('tr');
    tr.append(el('th','propulsion-stat-parameter',s.label+' ('+units[s.key]+')'));
    tr.append(el('td','propulsion-stat-column',headerRow[idx]));
    if(maxRow>=0){
     const displayedValue=accelerationParameterKeys.has(s.key)?toDisplayAcceleration(Number(analysisRows[maxRow][idx])):Number(analysisRows[maxRow][idx]);
     tr.append(el('td','',fmt(displayedValue)+' '+units[s.key]));
     const timestamp=timestampIndex===undefined?'Timestamp column not found':String(analysisRows[maxRow][timestampIndex]??'').trim()||'Timestamp unavailable';
     tr.append(el('td','propulsion-stat-timestamp',timestamp));
    }else{
     tr.append(el('td','propulsion-stat-empty','No numeric data'));
     tr.append(el('td','propulsion-stat-empty',timestampIndex===undefined?'Timestamp column not found':'Timestamp unavailable'));
    }
    tbody.append(tr);
   });
   table.append(tbody);tableWrap.append(table);step3.append(tableWrap);
   const graphActions=el('div','propulsion-actions');const graphProceed=el('button','btn','Proceed to Graphical Analysis');graphProceed.type='button';graphProceed.id='proceedToGraphicalAnalysisBtn';graphActions.append(graphProceed);step3.append(graphActions);
   graphProceed.addEventListener('click',()=>{step4Visible=true;step4.hidden=false;graphProceed.disabled=true;graphProceed.textContent='Graphical Analysis Selected';saveState();});
   if(step4Visible){step4.hidden=false;graphProceed.disabled=true;graphProceed.textContent='Graphical Analysis Selected';}
   addReturnButton(step3);
   start.disabled=true;saveState();

  };
  validateMapping();
 }
 let parseCSVText='';
 function validateMapping(){
  if(!analysisPanel)return false;
  const selections=activeSpecs('mapping').map(s=>mapping[s.key]?.selected??'');
  const complete=selections.length>0&&selections.every(v=>v!=='');const unique=new Set(selections.map(String)).size===selections.length;
  const confirm=$id('confirmPropulsionMappingBtn'),summary=$id('propulsionMappingSummary');
  const checks=activeSpecs('mapping').map(s=>{const idx=mapping[s.key]?.selected;if(idx===''||idx===undefined)return false;let checked=0,numeric=0;for(const row of dataRows.slice(0,100)){const v=String(row[idx]??'').trim();if(v){checked++;if(Number.isFinite(Number(v)))numeric++}}return checked>0&&numeric/checked>=0.8});
  const allData=checks.every(Boolean);confirm.disabled=!(complete&&unique&&allData&&!confirmed);
  summary.className='propulsion-mapping-summary'+(complete&&unique&&allData?' is-valid':' is-warning');
  summary.textContent=!complete?'Select a CSV column for every required parameter.':!unique?'Each parameter must use a different CSV column.':!allData?'One or more selected columns do not contain predominantly numeric data in the sampled rows. Review the mapping.':'Unique columns selected; Ready for confirmation.';
  return complete&&unique&&allData;
 }
 function showError(message){
  if(analysisPanel)analysisPanel.remove();
  analysisPanel=el('section','propulsion-mapping-card');analysisPanel.append(el('h3','','Unable to identify CSV parameters'));analysisPanel.append(el('p','propulsion-mapping-summary is-warning',message));workspace.insertBefore(analysisPanel,workspace.querySelector('.propulsion-local-note'));
 }
 function resetAnalysis(){
  if(analysisPanel){analysisPanel.remove();analysisPanel=null}
  // Step 03 is created after parameter identification and must not survive a log-type reset.
  workspace.querySelector('#propulsionDataFilteringCard')?.remove();
  workspace.querySelector('#propulsionParameterSummaryCard')?.remove();
  workspace.querySelector('.propulsion-graphical-card')?.remove();
  workspace.querySelector('#propulsionReportGenerationCard')?.remove();
  selectedFile=null;mapping={};calculatedParameterKeys=[];calculatedParameterControls={};headerRow=[];dataRows=[];analysisRows=[];confirmed=false;step3FilterVisible=false;step3Visible=false;step4Visible=false;step5Visible=false;reportDirectVisible=false;parseCSVText='';if(csvPreviewPanel){csvPreviewPanel.remove();csvPreviewPanel=null;}workspace.querySelector('.propulsion-csv-preview-toggle-actions')?.remove();workspace.querySelector('.propulsion-csv-preview-actions')?.remove();
  meta.hidden=true;meta.textContent='';reset.hidden=true;start.disabled=true;start.textContent='Identify Parameters';
 }
 function updateLogTypeUI(){const chosen=!!logType;if(logUploadArea){logUploadArea.hidden=!chosen;logUploadArea.style.display=chosen?'':'none';}if(input){input.disabled=!chosen;if(!chosen)input.value='';}if(start)start.disabled=!chosen||!selectedFile;const typeName=logType==='thrust'?'Thrust':'Torque';const title=$id('propulsionLogUploadTitle'),pickerTitle=$id('propulsionCsvPickerTitle'),description=$id('propulsionLogUploadDescription');if(title)title.textContent='Upload '+typeName+' Log';if(pickerTitle)pickerTitle.textContent='Upload '+typeName+' Log';if(description)description.textContent='Upload the CSV file containing '+typeName.toLowerCase()+' test data. '+(logType==='thrust'?'Torque-related':'Thrust-related')+' parameters will be disabled in subsequent steps.';logTypePicker?.querySelectorAll('.propulsion-log-type-option').forEach(option=>{const radio=option.querySelector('input');option.classList.toggle('is-selected',radio?.value===logType);});}
  logTypePicker?.querySelectorAll('input[name="propulsionLogType"]').forEach(radio=>radio.addEventListener('change',()=>{const next=radio.value;if(logType&&logType!==next){if((selectedFile||input.files?.length||confirmed)&&!confirm('Changing the log type will remove the previously uploaded CSV and reset the current analysis. Continue?')){logTypePicker.querySelector('input[value="'+logType+'"]').checked=true;return;}input.value='';resetAnalysis();if(filePicker)filePicker.hidden=false;setUploadState(false,'Select a new CSV file for the selected log type');}logType=next;updateLogTypeUI();saveState();}));
 input.addEventListener('change',()=>{
  resetAnalysis();
  const file=input.files&&input.files[0];
  if(!file){setUploadState(false,'No file selected');return}if(!logType){input.value='';setUploadState(false,'Select Thrust Log or Torque Log first');return}
  if(!/\.csv$/i.test(file.name)){input.value='';setUploadState(false,'Invalid file — please select a .csv file');return}
  if(file.size===0){input.value='';setUploadState(false,'The selected CSV file is empty');return}
  selectedFile=file;if(filePicker)filePicker.hidden=true;setUploadState(true,'CSV selected — ready for parameter identification');
  meta.hidden=false;meta.textContent=file.name+' · '+(file.size/1024).toFixed(1)+' KB';reset.hidden=false;start.disabled=false;start.textContent='Identify Parameters';file.text().then(text=>{parseCSVText=text;renderCsvPreview(text);saveState()}).catch(()=>{setUploadState(false,'Unable to read the selected CSV file')});
 });
 reset.addEventListener('click',async()=>{input.value='';resetAnalysis();if(filePicker)filePicker.hidden=false;reset.textContent='Choose another log file';setUploadState(false,'No file selected');try{const db=await openStateDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch(error){console.warn('Could not clear saved propulsion session:',error)}});
 start.addEventListener('click',async()=>{
  if(!selectedFile)return;
  start.disabled=true;start.textContent='Reading CSV…';
  try{
   const text=await selectedFile.text();parseCSVText=text;
   const delimiter=chooseDelimiter(text);const rows=parseCSV(text,delimiter);
   if(rows.length<2)throw new Error('The CSV does not contain a header and data rows.');
   detect(rows);start.textContent='Parameters Identified';start.disabled=true;saveState();
   setUploadState(true,'CSV read successfully — review the six parameter mappings below');
  }catch(error){start.textContent='Identify Parameters';start.disabled=false;showError(error.message||'CSV could not be read.')}
 });

 // Phase 2: independent multi-log upload and parameter mapping.
 const commonEngine=window.PropulsionAnalysisEngine,logCountSelect=$id('propulsionLogCount'),multiSetupCard=$id('propulsionMultiSetupCard'),multiUploadGrid=$id('propulsionMultiUploadGrid'),multiUploadStatus=$id('propulsionMultiUploadStatus'),identifyMultipleLogsBtn=$id('identifyMultipleLogsBtn'),multiMappingHost=$id('propulsionMultiMappingHost');
 // Setup selection is intentionally session-local: every page load requires a fresh choice.
 if(logCountSelect)logCountSelect.value='';
 let multiSession=null,multiFiles=[],multiLogType='',multiMappingConfirmed=false;const multiHiddenLogIds=new Set();
 function resetMultiSetup(){multiSession=null;multiFiles=[];multiHiddenLogIds.clear();multiMappingConfirmed=false;multiMappingHost?.replaceChildren();multiUploadGrid?.replaceChildren();if(identifyMultipleLogsBtn)identifyMultipleLogsBtn.disabled=true;if(multiUploadStatus)multiUploadStatus.textContent='Select the common test type and upload every requested CSV file.';renderMultiUploadSlots();}
 function renderMultiUploadSlots(){
  if(!multiUploadGrid||!logCountSelect)return;
  const count=Number(logCountSelect.value);multiFiles=Array.from({length:count},(_,index)=>multiFiles[index]||null);multiUploadGrid.replaceChildren();
  for(let index=0;index<count;index++){
   const card=el('div','propulsion-multi-upload-slot'),title=el('strong','','LOG '+(index+1)),hint=el('span','propulsion-multi-upload-hint','Choose CSV file '+(index+1)),fileInput=document.createElement('input'),statusEl=el('span','propulsion-multi-file-status','No file selected');
   fileInput.type='file';fileInput.accept='.csv,text/csv';fileInput.dataset.logIndex=String(index);
   fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];if(!file){multiFiles[index]=null;statusEl.textContent='No file selected';updateMultiUploadGate();return;}
    if(!/\.csv$/i.test(file.name)||file.size===0){fileInput.value='';multiFiles[index]=null;statusEl.textContent='Invalid or empty CSV file';updateMultiUploadGate();return;}
    statusEl.textContent='Reading '+file.name+'…';
    try{const text=await file.text(),rows=parseCSV(text,chooseDelimiter(text));if(rows.length<2)throw new Error('CSV must contain a header and data rows.');const headerIndex=findHeader(rows);if(headerIndex<0)throw new Error('Could not detect a recognizable parameter header in the first 10 rows.');const headers=rows[headerIndex].map((value,col)=>String(value??'').trim()||('Column '+(col+1))),data=rows.slice(headerIndex+1).filter(row=>row.some(value=>String(value??'').trim()!==''));if(!data.length)throw new Error('No data rows were found below the detected header.');multiFiles[index]={file,text,rows,headerIndex,headers,data};statusEl.textContent=file.name+' · '+data.length.toLocaleString()+' data rows';card.parentElement?.querySelector(':scope > .propulsion-exact-csv-preview[data-log-preview="'+index+'"]')?.remove();const rawPreview=createExactCsvPreview('RAW CSV PREVIEW · LOG '+(index+1),rows,file.name+' · Original uploaded CSV · Read-only');rawPreview.dataset.logPreview=String(index);card.append(rawPreview);}
    catch(error){multiFiles[index]=null;statusEl.textContent=error.message||'Unable to read this CSV';fileInput.value='';}updateMultiUploadGate();
   });
   card.append(title,hint,fileInput,statusEl);multiUploadGrid.append(card);
  }updateMultiUploadGate();
 }
 function updateMultiUploadGate(){if(!identifyMultipleLogsBtn||!logCountSelect)return;const count=Number(logCountSelect.value),typeSelected=multiLogType==='thrust'||multiLogType==='torque',ready=typeSelected&&multiFiles.length===count&&multiFiles.every(Boolean),uploadControls=$id('propulsionMultiUploadControls');if(uploadControls)uploadControls.hidden=!typeSelected;identifyMultipleLogsBtn.hidden=!ready;identifyMultipleLogsBtn.disabled=!ready;if(multiUploadStatus)multiUploadStatus.textContent=!typeSelected?'Select a common test type before uploading logs.':ready?'All '+count+' CSV files are ready for independent parameter identification.':multiFiles.filter(Boolean).length+' of '+count+' CSV files uploaded successfully.';}
 function setMultiMode(){
  const count=String(logCountSelect?.value||''),isMulti=['2','3','4'].includes(count);
  if(uploadCard)uploadCard.hidden=count!=='1';
  const progress=$id('propulsionProgressCard');if(progress&&isMulti)progress.hidden=true;
  const note=workspace.querySelector('.propulsion-local-note');if(note)note.hidden=isMulti;
  if(multiSetupCard)multiSetupCard.hidden=!isMulti;
  multiLogType='';multiSession=null;multiMappingConfirmed=false;multiMappingHost?.replaceChildren();
  multiSetupCard?.querySelectorAll('input[name="propulsionMultiLogType"]').forEach(r=>r.checked=false);
  resetMultiSetup();
 }
 function getMultiMappingDefaults(headers){const result={};specs.forEach(spec=>{const candidates=headers.map((name,index)=>({index,score:scoreHeader(name,spec.aliases)})).filter(item=>item.score>=30).sort((a,b)=>b.score-a.score);result[spec.key]={candidates,selected:candidates[0]?.index??''};});return result;}
 function multiActiveSpecs(){const keys=PARAMETER_DEPENDENCY_MATRIX[multiLogType]?.mapping||[];return specs.filter(spec=>keys.includes(spec.key));}
 function engineSetMapping(log,mapping){const clean={};Object.keys(mapping||{}).forEach(key=>{const value=mapping[key]?.selected;if(value!==''&&value!==undefined)clean[key]=Number(value);});commonEngine.setMapping(log,clean);}
 function validateMultiMappingCards(){
  if(!multiSession||!multiMappingHost)return {valid:false};let allValid=true;
  multiSession.logs.forEach((log,index)=>{const mapping=log._uiMapping||{},source=multiFiles[index],selected=multiActiveSpecs(),requiredKeys=[multiLogType,'commandRpm','actualRpm','voltage','current'],required=requiredKeys.map(key=>specs.find(spec=>spec.key===key)).filter(Boolean),mapped=selected.filter(spec=>mapping[spec.key]?.selected!==''&&mapping[spec.key]?.selected!==undefined),values=mapped.map(spec=>mapping[spec.key].selected),complete=required.length===requiredKeys.length&&required.every(spec=>mapping[spec.key]?.selected!==''&&mapping[spec.key]?.selected!==undefined),unique=new Set(values.map(String)).size===values.length;
   const numeric=required.every(spec=>{const col=mapping[spec.key]?.selected;if(col===''||col===undefined)return false;const sample=source.data.slice(0,100).map(row=>String(row[col]??'').trim()).filter(Boolean);return sample.length>0&&sample.filter(value=>Number.isFinite(Number(value.replace(/,/g,'')))).length/sample.length>=0.8;});
   const valid=complete&&unique&&numeric;allValid=allValid&&valid;const summary=multiMappingHost.querySelector('[data-mapping-summary="'+log.id+'"]');if(summary){summary.className='propulsion-mapping-summary '+(valid?'is-valid':'is-warning');summary.textContent=!complete?'Map all required core parameters: '+requiredKeys.join(', ')+'. Optional temperature and acceleration columns may remain unmapped.':!unique?'Each parameter must use a different CSV column.':!numeric?'One or more mapped columns are not predominantly numeric. Review this log.':'Unique numeric columns selected — this log is ready.';}engineSetMapping(log,mapping);
  });const button=$id('confirmAllMultiLogMappingsBtn');if(button)button.disabled=!allValid||multiMappingConfirmed;return {valid:allValid};
 }
 function renderMultiMappings(){
  if(!multiSession||!multiMappingHost)return;multiMappingHost.replaceChildren();multiMappingConfirmed=false;
  const intro=el('section','propulsion-multi-mapping-intro propulsion-step-card propulsion-step-card--green');
  intro.id='propulsionUnifiedMappingStep';
  intro.append(el('div','propulsion-step-label','STEP 02 · PARAMETER IDENTIFICATION'),el('h3','','Unified Parameter Identification — All Logs'),el('p','propulsion-mapping-description','Each parameter appears once. Select the matching CSV column independently for every uploaded log.'));multiMappingHost.append(intro);
  const logs=multiSession.logs,groups=[{title:'Mechanical',keys:['thrust','torque','commandRpm','actualRpm']},{title:'Electrical',keys:['voltage','current']},{title:'Thermal',keys:['escTemperature','motorTemperature']},{title:'Other',keys:['accelerationX','accelerationY','accelerationZ']}];
  const mappings=logs.map((log,index)=>{const mapping=getMultiMappingDefaults(multiFiles[index].headers);log._uiMapping=mapping;engineSetMapping(log,mapping);return mapping;});
  const tableWrap=el('div','propulsion-multi-mapping-table-wrap'),table=el('table','propulsion-multi-mapping-table propulsion-multi-mapping-unified'),thead=document.createElement('thead');
  const groupHead=document.createElement('tr'),subHead=document.createElement('tr');
  const parameterTh=el('th','','PARAMETER');parameterTh.rowSpan=2;parameterTh.scope='col';groupHead.append(parameterTh);
  logs.forEach((log,index)=>{const th=el('th','','LOG '+(index+1)+' · '+multiFiles[index].file.name);th.colSpan=1;th.scope='colgroup';groupHead.append(th);const mapping=el('th','','CSV COLUMN MAPPING');mapping.scope='col';subHead.append(mapping);});
  thead.append(groupHead,subHead);table.append(thead);
  const columnGroup=document.createElement('colgroup'),parameterColumn=document.createElement('col');parameterColumn.style.width='26%';columnGroup.append(parameterColumn);for(let i=0;i<logs.length;i++){const mappingColumn=document.createElement('col');mappingColumn.style.width=(74/logs.length)+'%';columnGroup.append(mappingColumn);}table.insertBefore(columnGroup,thead);
  const tbody=document.createElement('tbody'),activeKeys=new Set(multiActiveSpecs().map(spec=>spec.key));
  groups.forEach(group=>{
   const groupKeys=group.keys.filter(key=>activeKeys.has(key));
   if(!groupKeys.length)return;
   const sectionRow=el('tr','propulsion-mapping-section-row propulsion-mapping-section--'+group.title.toLowerCase());
   const sectionCell=el('th','propulsion-mapping-section-heading',group.title.toUpperCase()+' PARAMETERS');sectionCell.colSpan=logs.length+1;sectionCell.scope='colgroup';sectionRow.append(sectionCell);tbody.append(sectionRow);
   groupKeys.forEach(key=>{
    const spec=specs.find(item=>item.key===key),row=document.createElement('tr'),parameterCell=el('th','propulsion-multi-mapping-parameter',spec.label);
    parameterCell.scope='row';row.append(parameterCell);
    logs.forEach((log,logIndex)=>{
     const source=multiFiles[logIndex],mapping=mappings[logIndex],candidate=mapping[key],mappingCell=document.createElement('td'),select=el('select','propulsion-column-select');
     select.dataset.parameter=key;select.dataset.logIndex=String(logIndex);select.setAttribute('aria-label','Log '+(logIndex+1)+' '+spec.label+' CSV column');const empty=document.createElement('option');empty.value='';empty.textContent='Not detected — select a column';select.append(empty);
     source.headers.forEach((name,col)=>{const option=document.createElement('option');option.value=String(col);option.textContent=name;select.append(option);});select.value=candidate.selected===''?'':String(candidate.selected);
     select.addEventListener('change',()=>{candidate.selected=select.value===''?'':Number(select.value);engineSetMapping(log,mapping);validateMultiMappingCards();});
     mappingCell.append(select);row.append(mappingCell);
    });
    tbody.append(row);
   });
  });
  table.append(tbody);tableWrap.append(table);intro.append(tableWrap);
  const summaries=el('div','propulsion-multi-mapping-summary-grid');
  logs.forEach((log,index)=>{const summary=el('div','propulsion-mapping-summary is-warning','Review the suggested mappings for Log '+(index+1)+'.');summary.dataset.mappingSummary=log.id;summaries.append(summary);});
  intro.append(summaries);
  const actions=el('div','propulsion-actions propulsion-multi-confirm-actions'),confirmButton=el('button','btn','Confirm All Log Mappings'),result=el('p','propulsion-multi-confirm-status','All logs must have valid, unique numeric column mappings before confirmation.');confirmButton.type='button';confirmButton.id='confirmAllMultiLogMappingsBtn';confirmButton.disabled=true;result.id='multiMappingConfirmStatus';actions.append(confirmButton);intro.append(actions,result);
  confirmButton.addEventListener('click',()=>{if(!validateMultiMappingCards().valid)return;multiSession.logs.forEach(log=>engineSetMapping(log,log._uiMapping));multiMappingConfirmed=true;result.className='propulsion-multi-confirm-status is-valid';result.textContent='All '+multiSession.logs.length+' log mappings confirmed independently. Continue to independent filtering, derived calculations and comparative graph analysis below.';confirmButton.disabled=true;confirmButton.textContent='All Mappings Confirmed';renderMultiAnalysisWorkspace();});
  validateMultiMappingCards();
 }

 // Phase 3: independent per-log filtering/calculation and comparative graphing.
 let multiAnalysisCard=null,multiGraphCard=null,multiReportCard=null,multiGraphState={points:[],series:[],xKey:'',yKey:'',xMin:null,xMax:null};
 const multiColors=['#287fbd','#dc8123','#26966f','#8b5fc7'];
 function multiFieldOptions(){
  const raw=multiActiveSpecs().map(spec=>({key:spec.key,label:spec.label,derived:false}));
  const derived=(commonEngine.DERIVED_BY_TEST[multiLogType]||[]).map(key=>({key,label:key==='mechanicalPower'?'Mechanical Power (W)':key==='electricalPower'?'Electrical Power (W)':'Specific Thrust (N/W)',derived:true}));
  return [...raw,...derived];
 }
 function mappedValue(log,row,key,derivedRow){
  if(key==='mechanicalPower'||key==='electricalPower'||key==='specificThrust')return derivedRow?.derived?.[key];
  const index=log.mapping[key];if(!Number.isInteger(index))return NaN;
  const value=String(row?.[index]??'').trim();if(!value)return NaN;
  const number=Number(value.replace(/,/g,''));return Number.isFinite(number)?number:NaN;
 }

 function buildMultiLogReportCard(){
  const card=el('section','propulsion-phase4-report-card propulsion-step-card propulsion-step-card--green');card.id='propulsionPhase4ReportCard';
  card.append(el('div','propulsion-step-label','STEP 06 · MULTI-LOG REPORT GENERATION'),el('h3','','Generate Comparative Test Validation Report'),el('p','propulsion-mapping-description','Enter test identification details independently for each log. Test Report Type and Test Objective are entered once and apply to every log in the comparative test.'));
  const fieldsByLog=multiSession.logs.map(()=>({}));
  const form=el('div','propulsion-phase4-report-form propulsion-phase4-report-form--multi');
  const tableWrap=el('div','propulsion-phase4-report-input-table-wrap');
  const table=document.createElement('table');table.className='propulsion-phase4-report-input-table';
  const thead=document.createElement('thead'),headRow=document.createElement('tr');
  headRow.append(el('th','','TEST IDENTIFICATION PARAMETER'));
  multiSession.logs.forEach(log=>headRow.append(el('th','','LOG '+log.id)));
  thead.append(headRow);table.append(thead);
  const tbody=document.createElement('tbody');
  const definitions=[
   ['motor','Motor Name','text',true],
   ['motorId','Motor ID','text',false],
   ['esc','ESC Name','text',true],
   ['escId','ESC ID','text',false],
   ['propeller','Propeller Name','text',true],
   ['propellerId','Propeller ID','text',false],
   ['date','Test Date','date',true]
  ];
  definitions.forEach(def=>{
   const [key,label,type,required]=def,row=document.createElement('tr');
   row.append(el('th','',label+(required?' *':'')));
   multiSession.logs.forEach((log,index)=>{
    const cell=document.createElement('td'),input=type==='select'?document.createElement('select'):document.createElement('input');
    input.id='multiReport_'+key+'_log'+(index+1);input.dataset.reportKey=key;input.dataset.logIndex=String(index);input.required=required;
    if(type==='select'){
     input.className='propulsion-column-select';
     const blank=document.createElement('option');blank.value='';blank.textContent='Select report type';blank.disabled=true;blank.selected=true;input.append(blank);
     ['Thrust Log Report','Torque Log Report'].forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;input.append(option)});
    }else{input.type=type;input.placeholder='Enter '+label;}
    cell.append(input);row.append(cell);fieldsByLog[index][key]=input;
   });
   tbody.append(row);
  });
  const reportTypeRow=document.createElement('tr');
  reportTypeRow.append(el('th','','Test Report Type *'));
  const reportTypeCell=document.createElement('td');reportTypeCell.colSpan=multiSession.logs.length;
  const commonReportType=document.createElement('select');commonReportType.id='multiReport_commonReportType';commonReportType.className='propulsion-column-select';commonReportType.required=true;
  const reportTypeBlank=document.createElement('option');reportTypeBlank.value='';reportTypeBlank.textContent='Select Test Report Type';reportTypeBlank.disabled=true;reportTypeBlank.selected=true;commonReportType.append(reportTypeBlank);
  ['Thrust Log Report','Torque Log Report'].forEach(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;commonReportType.append(option)});
  reportTypeCell.append(commonReportType);reportTypeRow.append(reportTypeCell);tbody.append(reportTypeRow);
  fieldsByLog.forEach(fields=>{fields.reportType=commonReportType;});
  table.append(tbody);tableWrap.append(table);
  const objectiveRow=document.createElement('tr');
  objectiveRow.append(el('th','','Test Objective'));
  const objectiveCell=document.createElement('td');objectiveCell.colSpan=multiSession.logs.length;
  const objectiveInput=document.createElement('textarea');objectiveInput.id='multiReport_commonObjective';objectiveInput.rows=3;objectiveInput.placeholder='Enter the common objective, test conditions, observations or other manual notes for this comparative test.';
  objectiveCell.append(objectiveInput);objectiveRow.append(objectiveCell);tbody.append(objectiveRow);
  form.append(tableWrap);
  const status=el('p','propulsion-phase4-report-status','Complete the mandatory identification fields for every log, select the common Test Report Type and enter the common test objective before exporting.');
  status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  // Report graph selection is intentionally independent of Step 05 interactive graph controls.
  const reportGraphControls=el('section','propulsion-phase4-report-graph-controls');
  reportGraphControls.append(el('h4','','Graphical Report Selection'),el('p','propulsion-mapping-description','Select a common X and Y parameter to create a comparative graph with every processed log overlaid. Add up to five independent graphs to the PDF report.'));
  const reportAxisField=(label,id)=>{const wrap=el('label','propulsion-phase4-field');wrap.append(el('span','',label));const select=document.createElement('select');select.id=id;select.className='propulsion-column-select';const blank=document.createElement('option');blank.value='';blank.textContent='Select parameter';select.append(blank);multiFieldOptions().forEach(option=>{const item=document.createElement('option');item.value=option.key;item.textContent=option.label;select.append(item)});wrap.append(select);reportGraphControls.append(wrap);return select;};
  const reportGraphX=reportAxisField('Choose X Axis','multiReportGraphXAxis'),reportGraphY=reportAxisField('Choose Y Axis','multiReportGraphYAxis');
  const reportGraphActions=el('div','propulsion-actions'),addReportGraph=el('button','btn alt','Add Graph to Report');addReportGraph.type='button';addReportGraph.id='addMultiReportGraphBtn';const reportGraphCount=el('span','propulsion-report-graph-count','0 of 5 graphs added');reportGraphCount.id='multiReportGraphCount';const reportGraphList=el('div','propulsion-report-graph-list');reportGraphList.id='multiReportGraphList';reportGraphActions.append(addReportGraph,reportGraphCount);reportGraphControls.append(reportGraphActions,reportGraphList);
  let reportGraphs=[];
  const renderComparativeReportGraph=(xKey,yKey)=>{
   const options=multiFieldOptions(),xLabel=options.find(item=>item.key===xKey)?.label||xKey,yLabel=options.find(item=>item.key===yKey)?.label||yKey;
   const series=multiSession.logs.map((log,index)=>{
    const valid=(log.calculatedRows||[]).filter(item=>item&&Array.isArray(item.source)).map((item,rowIndex)=>({x:mappedValue(log,item.source,xKey,item),y:mappedValue(log,item.source,yKey,item),row:rowIndex+1})).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
    let highest=-Infinity;const points=valid.filter(point=>{if(point.x<highest)return false;highest=point.x;return true;});
    return {log,index,points};
   });
   const all=series.flatMap(item=>item.points);if(all.length<2)return {error:'At least two valid X/Y data points across the processed logs are required.'};
   const bounds=values=>{let min=Math.min(...values),max=Math.max(...values);if(min===max){const pad=Math.abs(min)*.05||1;min-=pad;max+=pad;}return {min,max};};
   const xr=bounds(all.map(point=>point.x)),yr=bounds(all.map(point=>point.y));
   const W=1040,H=520,L=105,R=35,T=30,B=82,pw=W-L-R,ph=H-T-B,sx=x=>L+(x-xr.min)/(xr.max-xr.min)*pw,sy=y=>T+ph-(y-yr.min)/(yr.max-yr.min)*ph;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Comparative report graph: '+xLabel+' versus '+yLabel);svg.classList.add('propulsion-chart-svg','propulsion-report-graph-svg','propulsion-multi-report-graph-svg');
   const add=(tag,attrs,text)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([key,value])=>node.setAttribute(key,String(value)));if(text!==undefined)node.textContent=text;svg.append(node);return node;};
   const fmt=value=>new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(value);
   for(let tick=0;tick<=5;tick++){const x=L+pw*tick/5,y=T+ph-ph*tick/5;add('line',{x1:x,y1:T,x2:x,y2:T+ph,stroke:'#e3eaf1','stroke-width':1});add('line',{x1:L,y1:y,x2:L+pw,y2:y,stroke:'#e3eaf1','stroke-width':1});add('text',{x,y:T+ph+28,'text-anchor':'middle',fill:'#000','font-size':16,'font-weight':800},fmt(xr.min+(xr.max-xr.min)*tick/5));add('text',{x:L-16,y:y+6,'text-anchor':'end',fill:'#000','font-size':16,'font-weight':800},fmt(yr.min+(yr.max-yr.min)*tick/5));}
   add('line',{x1:L,y1:T+ph,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':3.5});add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#111827','stroke-width':3.5});
   // Draw all data series first, then place each legend label in the least-occupied blank area.
   series.forEach(item=>{if(!item.points.length)return;const color=multiColors[item.index%multiColors.length],path=item.points.map((point,index)=>(index?'L':'M')+sx(point.x).toFixed(2)+','+sy(point.y).toFixed(2)).join(' ');add('path',{d:path,fill:'none',stroke:color,'stroke-width':2.8,'stroke-linejoin':'round','stroke-linecap':'round'});item.points.forEach(point=>add('circle',{cx:sx(point.x),cy:sy(point.y),r:3.5,fill:color,opacity:.9}));});
   // Convert plotted data points to SVG coordinates for adaptive legend placement.
   const segmentSamples=series.flatMap(item=>item.points.map(point=>({x:sx(point.x),y:sy(point.y)})));
   // Keep all log labels together as one compact legend group; move the group as a unit.
   const legendItems=series.filter(item=>item.points.length).map(item=>({item,color:multiColors[item.index%multiColors.length],label:'LOG '+(item.index+1)+' · '+(item.log.fileName||'Log '+(item.index+1))}));
   const legendFont=13,legendHeight=21,legendGap=3,legendGroupHeight=legendItems.length*legendHeight+Math.max(0,legendItems.length-1)*legendGap;
   const legendWidths=legendItems.map(entry=>Math.min(pw-20,Math.max(150,entry.label.length*7.1+18))),legendWidth=Math.max(...legendWidths);
   let bestLegend=null,bestLegendScore=Infinity;
   const legendXCandidates=[L+8,L+(pw-legendWidth)/2,L+pw-legendWidth-8],legendYCandidates=[T+8,T+(ph-legendGroupHeight)/2,T+ph-legendGroupHeight-8];
   legendXCandidates.forEach(x=>legendYCandidates.forEach(y=>{
    if(y<T+4||y+legendGroupHeight>T+ph-4)return;
    let score=0;
    segmentSamples.forEach(point=>{if(point.x>=x-4&&point.x<=x+legendWidth+4&&point.y>=y-4&&point.y<=y+legendGroupHeight+4)score+=1;});
    if(score<bestLegendScore){bestLegendScore=score;bestLegend={x,y};}
   }));
   if(!bestLegend)bestLegend={x:L+8,y:T+8};
   legendItems.forEach((entry,index)=>{
    const y=bestLegend.y+index*(legendHeight+legendGap),width=legendWidths[index];
    add('rect',{x:bestLegend.x,y,width,height:legendHeight,rx:4,fill:'#ffffff','fill-opacity':.96,stroke:entry.color,'stroke-opacity':.5,'stroke-width':1});
    add('text',{x:bestLegend.x+8,y:y+14,fill:entry.color,'font-size':legendFont,'font-weight':700},entry.label);
   });
   add('text',{x:L+pw/2,y:H-20,'text-anchor':'middle',fill:'#123b70','font-size':16,'font-weight':700},xLabel);
   const yAxis=add('text',{x:30,y:T+ph/2,'text-anchor':'middle',fill:'#287fbd','font-size':15,'font-weight':700},yLabel);yAxis.setAttribute('transform',`rotate(-90 30 ${T+ph/2})`);
   return {svg,title:yLabel+' vs '+xLabel,pointCount:all.length};
  };
  const refreshReportGraphCount=()=>{reportGraphCount.textContent=reportGraphs.length+' of 5 graphs added';addReportGraph.disabled=reportGraphs.length>=5;};
  const renderReportGraphList=()=>{reportGraphList.replaceChildren();reportGraphs.forEach((item,index)=>{const entry=el('div','propulsion-report-graph-item');const heading=el('strong','',String(index+1).padStart(2,'0')+' · '+item.title);const remove=el('button','btn alt','Remove');remove.type='button';remove.setAttribute('aria-label','Remove report graph '+(index+1));remove.addEventListener('click',()=>{reportGraphs.splice(index,1);renderReportGraphList();refreshReportGraphCount();refresh()});entry.append(heading,remove,item.svg.cloneNode(true));reportGraphList.append(entry)});};
  addReportGraph.addEventListener('click',()=>{
   try{
    if(reportGraphs.length>=5){refreshReportGraphCount();status.textContent='Maximum of five report graphs reached. Remove a graph before adding another.';return;}
    if(!multiSession.logs.every(log=>log._phase3Ready)){status.textContent='Process every log in Step 03 before adding a comparative report graph.';return;}
    if(!reportGraphX.value||!reportGraphY.value){status.textContent='Select both X and Y parameters before adding a report graph.';return;}
    if(reportGraphX.value===reportGraphY.value){status.textContent='Choose two different parameters for the report graph.';return;}
    const available=multiFieldOptions().map(option=>option.key);
    if(!available.includes(reportGraphX.value)||!available.includes(reportGraphY.value)){status.textContent='The selected graph parameter is not available. Please reselect both axes.';return;}
    const result=renderComparativeReportGraph(reportGraphX.value,reportGraphY.value);
    if(result.error){status.textContent=result.error;return;}
    reportGraphs.push(result);renderReportGraphList();refreshReportGraphCount();refresh();
    status.textContent='Graph added to comparative report. '+reportGraphs.length+' of 5 graphs selected.';
   }catch(error){status.textContent='Unable to add graph: '+(error?.message||'Unexpected graph generation error.');status.setAttribute('role','alert');}
  });
  reportGraphX.addEventListener('change',()=>{status.textContent='Report graph X-axis selection updated. These controls do not change Step 05 Graphical Analysis.';});
  reportGraphY.addEventListener('change',()=>{status.textContent='Report graph Y-axis selection updated. These controls do not change Step 05 Graphical Analysis.';});
  const previewPanel=el('section','propulsion-phase4-live-preview-panel');
  previewPanel.append(el('h3','','Live A4 PDF Preview'));
  const preview=el('div','propulsion-report-preview-pages');preview.id='multiPropulsionReportLivePreview';
  const exportButton=el('button','btn propulsion-report-export-btn','Export Comparative Report as PDF');exportButton.type='button';exportButton.disabled=true;
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const labelFor=key=>definitions.find(def=>def[0]===key)?.[1]||key;
  const values=()=>fieldsByLog.map(fields=>Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value.trim()])));
  const validate=()=>{
   const complete=values().every(fields=>['motor','esc','propeller','date','reportType'].every(key=>fields[key]));
   const processed=multiSession.logs.every(log=>log._phase3Ready);
   exportButton.disabled=!(complete&&processed);
   status.textContent=!processed?'Process every log before exporting the report.':complete?'All per-log identification fields are complete. The comparative PDF is ready.':'Complete Motor Name, ESC Name, Propeller Name and Test Date for every log, and select one common Test Report Type.';
   return !exportButton.disabled;
  };
  function buildPreview(){
   preview.replaceChildren();
   const entered=values();
   const page=el('article','propulsion-report-page propulsion-report-cover');
   const brand=el('div','propulsion-report-brand-lockup');
   const mark=document.createElementNS('http://www.w3.org/2000/svg','svg');mark.setAttribute('viewBox','0 0 300 210');mark.setAttribute('role','img');mark.setAttribute('aria-label','ideaForge logo');
   const logoPath=document.createElementNS('http://www.w3.org/2000/svg','path');logoPath.setAttribute('d','M8 150h58c8 0 13-5 13-13V92c0-8 5-13 13-13h58c8 0 13-5 13-13V13c0-8 5-13 13-13h58c8 0 13 5 13 13v72c0 8-5 13-13 13h-58c-8 0-13 5-13 13v45c0 8-5 13-13 13H92c-8 0-13 5-13 13v21c0 8-5 13-13 13H8c-8 0-8-5-8-13v-40c0-8 0-13 8-13z');logoPath.setAttribute('fill','#8cc63e');mark.append(logoPath);
   const word=el('div','propulsion-report-wordmark'),idea=el('div','propulsion-report-ideaforge');idea.append(el('span','propulsion-report-idea','idea'),el('span','propulsion-report-forge','Forge'),el('sup','','™'));word.append(idea,el('div','propulsion-report-tagline','Create. Inspire.'));
   const reportTitle=el('h1','propulsion-report-inline-title','YETI Propulsion Bench Data Validation Report');
   brand.append(mark,word,reportTitle);page.append(brand,el('div','propulsion-report-accent-rule'));
   page.append(el('p','propulsion-report-kicker','COMPARATIVE TEST IDENTIFICATION'));
   const details=document.createElement('table');details.className='propulsion-report-stats-table propulsion-phase4-preview-id-table';
   const header=document.createElement('thead'),headerRow=document.createElement('tr');
   headerRow.append(el('th','','PARAMETER'));multiSession.logs.forEach(log=>headerRow.append(el('th','','LOG '+log.id)));header.append(headerRow);details.append(header);
   const body=document.createElement('tbody');
   definitions.forEach(([key,label])=>{const row=document.createElement('tr');row.append(el('th','',label));entered.forEach(fields=>row.append(el('td','',fields[key]||'—')));body.append(row);});
   const commonTypeRow=document.createElement('tr');commonTypeRow.append(el('th','','Test Report Type'));const commonTypeValue=document.createElement('td');commonTypeValue.colSpan=multiSession.logs.length;commonTypeValue.textContent=entered[0]?.reportType||'—';commonTypeRow.append(commonTypeValue);body.append(commonTypeRow);
   const objectivePreviewRow=document.createElement('tr');objectivePreviewRow.append(el('th','','Test Objective'));const objectivePreviewCell=document.createElement('td');objectivePreviewCell.colSpan=multiSession.logs.length;objectivePreviewCell.textContent=objectiveInput.value.trim();objectivePreviewRow.append(objectivePreviewCell);body.append(objectivePreviewRow);
   details.append(body);page.append(details);
   const coverMeta=el('div','propulsion-report-cover-meta');coverMeta.append(el('span','','COMPARATIVE DATASET · '+multiSession.logs.length+' LOGS'),el('span','','FILTERED AND SORTED DATA'));page.append(coverMeta);
   page.append(el('p','propulsion-report-footer','YETI FLIGHT TRIAL  /  PROPULSION VALIDATION  /  ENGINEERING MANAGEMENT REVIEW'));
   preview.append(page);
   // Reproduce the Step 04 comparative summary for every log in branded KPI tiles.
   // Keep the same parameter union, maximum-value rule and maximum timestamp as the in-app summary.
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
   const reportParameters=new Map();
   multiSession.logs.forEach(log=>{
    const specs=multiActiveSpecs().map(spec=>({key:spec.key,label:spec.label,index:log.mapping[spec.key],derived:false})).filter(item=>Number.isInteger(item.index));
    (log._derivedKeys||[]).forEach(key=>specs.push({key,label:key==='mechanicalPower'?'Mechanical Power (W)':key==='electricalPower'?'Electrical Power (W)':'Specific Thrust (N/W)',derived:true}));
    specs.forEach(spec=>{if(!reportParameters.has(spec.key))reportParameters.set(spec.key,{key:spec.key,label:spec.label,derived:spec.derived});});
   });
   const resultPage=el('article','propulsion-report-page propulsion-report-summary-page propulsion-report-multi-summary-page');
   resultPage.append(el('div','propulsion-report-page-kicker','01  /  TEST RESULTS'),el('h2','','EXECUTIVE PERFORMANCE SUMMARY'));
   const summaryTable=document.createElement('table');summaryTable.className='propulsion-report-stats-table propulsion-report-comparative-summary-table';
   const summaryHead=document.createElement('thead'),summaryHeadRow=document.createElement('tr');
   summaryHeadRow.append(el('th','','PARAMETER'));
   multiSession.logs.forEach((log,index)=>summaryHeadRow.append(el('th','','LOG '+(index+1)+' · '+log.fileName)));
   summaryHead.append(summaryHeadRow);summaryTable.append(summaryHead);
   const summaryBody=document.createElement('tbody');
   reportParameters.forEach(parameter=>{
    const row=document.createElement('tr');row.append(el('th','propulsion-report-summary-parameter',parameter.label));
    multiSession.logs.forEach(log=>{
     const cell=document.createElement('td');
     const specIsDerived=parameter.key==='mechanicalPower'||parameter.key==='electricalPower'||parameter.key==='specificThrust';
     const sourceIndex=log.mapping[parameter.key];
     const available=specIsDerived?(log._derivedKeys||[]).includes(parameter.key):Number.isInteger(sourceIndex);
     const header=log.filteredRows?.[0]||log.headers||[];
     const timestampIndex=header.map((name,i)=>({index:i,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
     let maximum=-Infinity,maximumRow=null;
     if(available)(log.calculatedRows||[]).forEach(item=>{
      const raw=specIsDerived?'':String(item.source?.[sourceIndex]??'').trim();
      const value=specIsDerived?item.derived?.[parameter.key]:(raw===''?NaN:Number(raw));const score=(!specIsDerived&&(parameter.key==='torque'||accelerationParameterKeys.has(parameter.key)))?Math.abs(value):value;
      if(Number.isFinite(value)&&score>maximum){maximum=score;maximumRow=item;}
     });
     const displayedMaximum=maximumRow&&!specIsDerived&&(parameter.key==='torque'||accelerationParameterKeys.has(parameter.key))?Number(maximumRow.source?.[sourceIndex]):maximum;
     const valueText=Number.isFinite(displayedMaximum)?new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(displayedMaximum):'—';
     const timestamp=maximumRow?(timestampIndex===undefined?'Timestamp column not found':String(maximumRow.source?.[timestampIndex]??'').trim()||'Timestamp unavailable'):(timestampIndex===undefined?'Timestamp column not found':'No numeric data');
     const tile=el('div','propulsion-report-comparative-cell');
     tile.append(el('strong','propulsion-report-comparative-cell-value',valueText),el('small','propulsion-report-kpi-timestamp',timestamp));
     cell.append(tile);row.append(cell);
    });
    summaryBody.append(row);
   });
   summaryTable.append(summaryBody);resultPage.append(summaryTable);
   resultPage.append(el('p','propulsion-report-small-note','Values are maximum recorded values from each log’s filtered and sorted dataset. The timestamp identifies when each maximum occurred. Records with Actual RPM = 0 are excluded.'));
   resultPage.append(el('p','propulsion-report-footer','COMPARATIVE SUMMARY  /  ALL LOGS'));
   preview.append(resultPage);
   // Only graphs explicitly added in Step 06 appear in the PDF; Step 05 remains independent.
   if(reportGraphs.length){for(let offset=0,pageNo=1;offset<reportGraphs.length;offset+=2,pageNo++){const graphPage=el('article','propulsion-report-page propulsion-report-graph-page');graphPage.append(el('div','propulsion-report-page-kicker','0'+(pageNo+1)+'  /  GRAPHICAL ANALYSIS'),el('h2','','COMPARATIVE PROPULSION PERFORMANCE PLOTS'));reportGraphs.slice(offset,offset+2).forEach((item,index)=>{const wrap=el('div','propulsion-report-preview-graph');wrap.append(el('h3','',String(offset+index+1).padStart(2,'0')+'  '+item.title),item.svg.cloneNode(true));graphPage.append(wrap)});preview.append(graphPage)}}
  }
  const refresh=()=>{validate();buildPreview();};
  table.querySelectorAll('input,select').forEach(input=>input.addEventListener('input',refresh));
  table.querySelectorAll('select').forEach(input=>input.addEventListener('change',refresh));
  objectiveInput.addEventListener('input',refresh);
  exportButton.addEventListener('click',()=>{
   if(!validate())return;
   buildPreview();
   const markup=preview.cloneNode(true);markup.id='multiPropulsionReportLivePreview';
   printReportMarkup(markup,'multiPropulsionReportLivePreview','YETI Comparative Propulsion Report',printStatus=>{status.textContent=printStatus;});
  });
  card.append(form,reportGraphControls,status,exportButton,previewPanel);previewPanel.append(preview);multiMappingHost.append(card);multiReportCard=card;card.refreshPreview=refresh;refreshReportGraphCount();refresh();
 }

 function renderMultiAnalysisWorkspace(){
  if(!multiMappingConfirmed||!multiSession||!multiMappingHost)return;
  multiAnalysisCard?.remove();multiGraphCard?.remove();multiReportCard?.remove();
  multiAnalysisCard=el('section','propulsion-phase3-card propulsion-step-card propulsion-step-card--orange');multiAnalysisCard.id='propulsionPhase3AnalysisCard';
  multiAnalysisCard.append(el('div','propulsion-step-label','STEP 03 · DATA FILTERING & DERIVED PARAMETER CALCULATION'),el('h3','','Data Filtering & Derived Parameter Calculation'),el('p','propulsion-mapping-description','Select derived parameters once for the complete test session. Apply the Actual RPM validity filter independently to each log, then calculate and add each selected parameter to every filtered log.'));
  const sharedDerivedSection=el('section','propulsion-step-subsection propulsion-step-subsection--derived');
  sharedDerivedSection.append(el('h4','','Derived Parameter Identification & Calculation'),el('p','propulsion-subsection-description','Check a parameter and use its Calculate and Add to Log File action, just like the Single-Log Analyser. The calculation is applied to every uploaded log using that log’s confirmed Step 02 mappings.'));
  const sharedDerivedCards=el('div','propulsion-calculated-parameters');
  const sharedDerivedChecks={},sharedDerivedAdded=new Set(),sharedDerivedActions={};
  const updateMultiReadiness=()=>{
   const allFiltered=multiSession.logs.every(log=>log._phase3Filtered);
   const selected=Object.keys(sharedDerivedChecks).filter(key=>sharedDerivedChecks[key].checked);
   const allCalculated=selected.every(key=>sharedDerivedAdded.has(key));
   const ready=allFiltered&&allCalculated;
   multiSession.logs.forEach(log=>{log._phase3Ready=ready;});
   updateMultiGraphAvailability();
  };
  (['mechanicalPower','electricalPower','specificThrust']).forEach(key=>{
   const parameterName=key==='mechanicalPower'?'Mechanical Power':key==='electricalPower'?'Electrical Power':'Specific Thrust';
   const card=el('div','propulsion-calculated-parameter');card.dataset.parameterKey=key;
   const details=el('div','propulsion-calculated-parameter-details'),label=el('label','propulsion-calculated-parameter-label'),check=document.createElement('input');check.type='checkbox';check.value=key;check.setAttribute('aria-label','Calculate '+parameterName+' for all logs');
   const requiredMappings=key==='mechanicalPower'?['torque','actualRpm']:key==='electricalPower'?['voltage','current']:['thrust','voltage','current'];
   const testTypeSupports=(commonEngine.DERIVED_BY_TEST[multiLogType]||[]).includes(key);
   const missingByLog=multiSession.logs.map(log=>({id:log.id,missing:requiredMappings.filter(name=>!Number.isInteger(log.mapping?.[name]))})).filter(item=>item.missing.length);
   const unavailableReason=!testTypeSupports?(multiLogType==='thrust'&&key==='mechanicalPower'?'Mechanical Power requires Torque, which is not part of a Thrust test.':multiLogType==='torque'&&key==='specificThrust'?'Specific Thrust requires Thrust, which is not part of a Torque test.':parameterName+' is not supported for the selected test type.'):missingByLog.length?'Required mapping(s) missing: '+missingByLog.map(item=>'Log '+item.id+' — '+item.missing.join(', ')).join('; '):'';
   const parameterUnavailable=!!unavailableReason;
   label.append(check,el('strong','',parameterName));
   const formulaLabel=el('span','propulsion-calculated-formula-label','FORMULA'),formula=el('div','propulsion-calculated-formula');
   if(key==='mechanicalPower'){
    formula.append(el('span','propulsion-formula-equation','Mechanical Power (W) = Torque (N·m) × Actual Motor Speed (RPM) × '));
    const fraction=el('span','propulsion-formula-fraction propulsion-formula-conversion');fraction.setAttribute('role','math');fraction.append(el('span','propulsion-formula-numerator','2π'),el('span','propulsion-formula-denominator','60'));formula.append(fraction);
   }else if(key==='electricalPower')formula.textContent='Electrical Power (W) = DC Voltage (V) × DC Current (A)';
   else{const equation=el('span','propulsion-formula-equation','Specific Thrust (N/W) = '),fraction=el('span','propulsion-formula-fraction');fraction.setAttribute('role','math');fraction.append(el('span','propulsion-formula-numerator','Thrust (N)'),el('span','propulsion-formula-denominator','Electrical Power (W)'));formula.append(equation,fraction);}
   const note=el('div','propulsion-calculated-mapping-note',parameterUnavailable?'UNAVAILABLE: '+unavailableReason:'Inputs are taken from each log’s confirmed Step 02 parameter mapping.');
   details.append(label,formulaLabel,formula,note);
   const calculate=el('button','btn alt propulsion-calculated-action','Calculate and Add to All logs');calculate.type='button';calculate.disabled=true;
   calculate.title='Select the parameter and apply filtering to every log before calculating.';
   const addedStatus=el('span','propulsion-calculated-added-status','✓ Added to All logs');addedStatus.hidden=true;
   addedStatus.setAttribute('role','status');addedStatus.setAttribute('aria-live','polite');
   const retry=el('button','btn alt propulsion-calculated-retry','Retry');retry.type='button';retry.hidden=true;
   sharedDerivedChecks[key]=check;sharedDerivedActions[key]={calculate,addedStatus,retry};
   const updateAction=()=>{calculate.disabled=parameterUnavailable||!check.checked||sharedDerivedAdded.has(key);calculate.title=parameterUnavailable?unavailableReason:check.checked?'Calculate this parameter for every filtered log.':'Select the checkbox to enable this calculation.';};
   check.addEventListener('click',event=>{if(parameterUnavailable){event.preventDefault();event.stopPropagation();window.alert(parameterName+' cannot be selected. '+unavailableReason);}});
   check.addEventListener('change',()=>{
    if(!check.checked){sharedDerivedAdded.delete(key);addedStatus.hidden=true;retry.hidden=true;calculate.hidden=false;calculate.textContent='Calculate and Add to Log file';card.classList.remove('is-added-to-graph');}
    multiSession.logs.forEach(log=>{log._phase3Ready=false;log._derivedKeys=[...sharedDerivedAdded];if(log._phase3Filtered)commonEngine.calculateLog(log,multiLogType,log._derivedKeys);if(log._phase3Card)renderMultiLogPreview(log,log._phase3Card._phase3Controls.tableHost,log._derivedKeys);});
    if(!check.checked){derivedReadyCheckbox.checked=false;filteringReadyCheckbox.checked=false;generatedMultiCsvFiles=[];generatedCsvFilesHost.replaceChildren();csvExportButton.hidden=true;csvExportButton.disabled=false;}
    updateAction();updateMultiReadiness();updateMultiCsvGate();
   });
   calculate.addEventListener('click',()=>{
    try{
     // Match the single-log workflow: a calculation action must process its source
     // data, not silently stop because one of the multi-log filters was not clicked.
     // Apply the RPM validity filter independently to every log when needed.
     multiSession.logs.forEach(log=>{
      if(!log._phase3Filtered){
       if(!Number.isInteger(log.mapping?.actualRpm))throw new Error('Log '+log.id+' is missing its confirmed Actual RPM mapping.');
       commonEngine.filterLog(log,{actualRpmIndex:log.mapping.actualRpm});
       log._phase3Filtered=true;
      }
     });
     const required=key==='mechanicalPower'?['torque','actualRpm']:key==='electricalPower'?['voltage','current']:['thrust','voltage','current'];
     for(const log of multiSession.logs){
      // The engine already holds this log's confirmed Step 02 mapping.
      // Do not call setMapping here: it intentionally clears filteredRows.
      if(!Array.isArray(log.filteredRows)||!log.filteredRows.length)throw new Error('Log '+log.id+' has no filtered rows. Re-upload or re-identify this log.');
      const missing=required.filter(name=>!Number.isInteger(log.mapping?.[name]));
      if(missing.length)throw new Error('Log '+log.id+' is missing required mappings: '+missing.join(', '));
     }
     const nextKeys=[...sharedDerivedAdded,key];
     const results=multiSession.logs.map(log=>({log,keys:nextKeys.slice(),rows:commonEngine.calculateLog(log,multiLogType,nextKeys)}));
     results.forEach(({log,keys})=>{
      log._derivedKeys=keys;
      if(log._phase3Card){
       const controls=log._phase3Card._phase3Controls;
       renderMultiLogPreview(log,controls.tableHost,keys);
       controls.summary.textContent=Math.max(0,log.filteredRows.length-1).toLocaleString()+' data rows retained · '+Math.max(0,log.sourceRows.length-log.filteredRows.length).toLocaleString()+' data rows removed (Actual RPM ≤ 0) · '+keys.length+' derived parameter(s) calculated and added to this log file.';
      }
     });
     sharedDerivedAdded.add(key);
     calculate.hidden=true;addedStatus.hidden=false;retry.hidden=false;check.disabled=true;card.classList.add('is-added-to-graph');
     note.textContent='✓ Successfully calculated '+parameterName+' and added it to all '+multiSession.logs.length+' logs. RPM filtering and each log’s confirmed Step 02 mappings were applied.';
     note.setAttribute('role','status');note.setAttribute('aria-live','polite');
     updateMultiReadiness();updateMultiCsvGate();
    }catch(error){
     note.textContent='Calculation not completed: '+(error.message||'Unable to calculate this parameter for every log.');
     note.setAttribute('role','alert');
    }
   });
   retry.addEventListener('click',()=>{
    sharedDerivedAdded.delete(key);check.disabled=false;check.checked=false;calculate.hidden=false;calculate.disabled=true;calculate.textContent='Calculate and Add to All logs';calculate.title='Select the parameter and apply filtering to every log before calculating.';addedStatus.hidden=true;retry.hidden=true;card.classList.remove('is-added-to-graph');
    multiSession.logs.forEach(log=>{log._phase3Ready=false;log._derivedKeys=[...sharedDerivedAdded];if(log._phase3Filtered)commonEngine.calculateLog(log,multiLogType,log._derivedKeys);if(log._phase3Card){renderMultiLogPreview(log,log._phase3Card._phase3Controls.tableHost,log._derivedKeys);log._phase3Card._phase3Controls.summary.textContent='Derived parameter reset. Recalculate the selected parameters for all logs.';}});
    Object.entries(sharedDerivedActions).forEach(([otherKey,action])=>{if(otherKey!==key)action.calculate.disabled=!sharedDerivedChecks[otherKey].checked||sharedDerivedAdded.has(otherKey);});
    derivedReadyCheckbox.checked=false;filteringReadyCheckbox.checked=false;generatedMultiCsvFiles=[];generatedCsvFilesHost.replaceChildren();csvExportButton.hidden=true;csvExportButton.disabled=false;
    note.textContent='Calculation reset. Select the parameter and calculate it again for all logs.';
    updateMultiReadiness();updateMultiCsvGate();
   });
   if(parameterUnavailable){card.classList.add('is-parameter-unavailable');check.setAttribute('aria-describedby','');calculate.disabled=true;calculate.title=unavailableReason;}
   card.append(details,calculate,addedStatus,retry);sharedDerivedCards.append(card);
  });
  sharedDerivedSection.append(sharedDerivedCards);

  const csvSection=el('section','propulsion-step-subsection propulsion-step-subsection--csv');
  csvSection.append(el('h4','','CSV Generation with Filtered & Sorted Data'));
  csvSection.append(el('p','propulsion-subsection-description','Generate one consolidated CSV containing every uploaded log, with the Actual RPM validity filter, chronological timestamp sorting where available, and all calculated derived-parameter columns.'));
  const csvConfirmation=el('div','propulsion-csv-confirmations');
  const derivedReadyLabel=el('label','propulsion-csv-confirmation'),derivedReadyCheckbox=document.createElement('input');derivedReadyCheckbox.type='checkbox';derivedReadyCheckbox.id='confirmMultiDerivedParametersReady';derivedReadyLabel.append(derivedReadyCheckbox,el('span','','Required Derived Parameters identified, calculated, added to log file'));
  const filteringReadyLabel=el('label','propulsion-csv-confirmation'),filteringReadyCheckbox=document.createElement('input');filteringReadyCheckbox.type='checkbox';filteringReadyCheckbox.id='confirmMultiFilteringSortingReady';filteringReadyLabel.append(filteringReadyCheckbox,el('span','','Apply Data Filtering & Sorting Logic'));
  csvConfirmation.append(derivedReadyLabel,filteringReadyLabel);
  const csvStatus=el('p','propulsion-csv-export-status','Complete the derived-parameter calculations, then confirm both preparation steps to generate the consolidated CSV.');
  csvStatus.setAttribute('role','status');csvStatus.setAttribute('aria-live','polite');
  const csvActions=el('div','propulsion-actions propulsion-csv-actions');
  const csvExportButton=el('button','btn','Generate Filtered & Sorted CSV');csvExportButton.type='button';csvExportButton.hidden=true;
  csvActions.append(csvExportButton);
  const generatedCsvFilesHost=el('div','propulsion-multi-csv-files');
  let generatedMultiCsvFiles=[];
  const updateMultiCsvGate=()=>{
   const allDerived=(commonEngine.DERIVED_BY_TEST[multiLogType]||[]).every(key=>sharedDerivedAdded.has(key));
   const ready=allDerived&&derivedReadyCheckbox.checked&&filteringReadyCheckbox.checked;
   csvExportButton.hidden=!(ready&&!generatedMultiCsvFiles.length);
   if(derivedReadyCheckbox.checked&&!allDerived)csvStatus.textContent='Not ready: calculate every required derived parameter above and wait for the success status on each one.';
  };
  [derivedReadyCheckbox,filteringReadyCheckbox].forEach(input=>input.addEventListener('change',updateMultiCsvGate));
  csvExportButton.addEventListener('click',()=>{
   try{
    const requiredKeys=commonEngine.DERIVED_BY_TEST[multiLogType]||[];
    const incomplete=requiredKeys.filter(key=>!sharedDerivedAdded.has(key));
    if(incomplete.length)throw new Error('Calculate all required derived parameters before generating the CSV.');
    const labels={mechanicalPower:'Mechanical Power (W)',electricalPower:'Electrical Power (W)',specificThrust:'Specific Thrust (N/W)'};
    const escapeCsv=value=>{const text=String(value??'');return /[",\r\n]/.test(text)?'"'+text.replace(/"/g,'""')+'"':text;};
    const prepared=multiSession.logs.map(log=>{
     if(!log._phase3Filtered){commonEngine.filterLog(log,{actualRpmIndex:log.mapping.actualRpm});log._phase3Filtered=true;}
     const header=(log.filteredRows[0]||log.headers||[]).slice();
     const aliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
     const timestampIndex=header.map((name,index)=>({index,score:scoreHeader(name,aliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
     if(timestampIndex!==undefined){
      const body=log.filteredRows.slice(1).map((row,index)=>{const raw=String(row[timestampIndex]??'').trim(),numeric=raw!==''?Number(raw):NaN,date=numeric>0&&numeric<1e12?new Date(numeric*1000):numeric>=1e12?new Date(numeric):new Date(raw);return {row,index,stamp:Number.isFinite(date.getTime())?date.getTime():NaN};});
      body.sort((a,b)=>{if(Number.isFinite(a.stamp)&&Number.isFinite(b.stamp))return a.stamp-b.stamp||a.index-b.index;if(Number.isFinite(a.stamp))return -1;if(Number.isFinite(b.stamp))return 1;return a.index-b.index;});
      log.filteredRows=[header,...body.map(item=>item.row)];
     }
     commonEngine.calculateLog(log,multiLogType,requiredKeys);log._derivedKeys=requiredKeys.slice();log._phase3Ready=true;
     const columns=header.slice();
     const derivedColumnIndexes={};
     requiredKeys.forEach(key=>{const label=labels[key];let index=columns.indexOf(label);if(index<0){index=columns.length;columns.push(label);}derivedColumnIndexes[key]=index;});
     const rows=[columns];
     log.calculatedRows.slice(1).forEach(item=>{
      const row=item.source.slice();
      requiredKeys.forEach(key=>{row[derivedColumnIndexes[key]]=Number.isFinite(item.derived[key])?item.derived[key]:'';});
      rows.push(columns.map((_,index)=>row[index]??''));
     });
     const csv='\uFEFF'+rows.map(row=>columns.map((_,index)=>escapeCsv(row[index]??'')).join(',')).join('\r\n');
     const originalName=log.fileName||multiFiles[multiSession.logs.indexOf(log)]?.file?.name||('Log_'+log.id+'.csv');
     const base=originalName.replace(/\.csv$/i,'');
     return {log,name:base+'_filtered_sorted.csv',csv,rows,columns,originalName,timestampSorted:timestampIndex!==undefined};
    });
    generatedMultiCsvFiles=prepared;
    generatedCsvFilesHost.replaceChildren();
    prepared.forEach((file,index)=>{
     const card=el('section','propulsion-csv-preview-card propulsion-step-card propulsion-step-card--green propulsion-generated-csv-preview');
     card.append(el('div','propulsion-step-label','GENERATED CSV · LOG '+(index+1)));
     const title=el('h3','',file.name),info=el('p','propulsion-csv-preview-meta',file.rows.length.toLocaleString()+' CSV rows (including header) · '+file.columns.length.toLocaleString()+' columns · '+(file.rows.length-1).toLocaleString()+' filtered data rows · Actual RPM zero/negative values removed · '+(file.timestampSorted?'chronologically sorted by timestamp':'original row order retained; no timestamp column identified'));
     const actions=el('div','propulsion-actions propulsion-csv-actions');
     const download=el('button','btn','Download CSV');download.type='button';
     actions.append(download);
     download.addEventListener('click',()=>{const blob=new Blob([file.csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);csvStatus.textContent='Downloaded '+file.name+'.';});
     card.append(title,info,actions,createExactCsvPreview('FILTERED & SORTED CSV PREVIEW · LOG '+(index+1),file.rows,file.name+' · Exact generated CSV · Read-only'));generatedCsvFilesHost.append(card);
    });
    multiSession.logs.forEach(log=>{log._phase3Ready=true;});updateMultiReadiness();
    csvExportButton.hidden=true;
    csvStatus.textContent='Successfully generated '+prepared.length+' separate CSV files. Download each log using its Download CSV button.';
    // Keep the continuation actions inside Step 03 and explicitly expose the action container and both choices.
    multiAnalysisCard.append(multiProceedActions);
    multiProceedActions.hidden=false;multiProceedInApp.hidden=false;multiProceedReport.hidden=false;
    multiProceedActions.scrollIntoView({behavior:'smooth',block:'nearest'});
   }catch(error){csvStatus.textContent='CSV generation failed: '+(error.message||'Unable to prepare the individual CSV files.');csvStatus.setAttribute('role','alert');}
  });
  csvSection.append(csvConfirmation,csvStatus,csvActions,generatedCsvFilesHost);
  // Create the continuation controls before inserting them into Step 03.
  // Referencing these const bindings earlier triggers a temporal-dead-zone error
  // and aborts the entire workspace render after Step 02 mapping confirmation.
  const multiProceedActions=el('div','propulsion-actions propulsion-next-step-actions');
  const multiProceedInApp=el('button','btn','Proceed with In App Analysis');multiProceedInApp.type='button';multiProceedInApp.hidden=true;
  const multiProceedReport=el('button','btn alt','Proceed with Report Generation');multiProceedReport.type='button';multiProceedReport.hidden=true;
  multiProceedActions.hidden=true;multiProceedActions.append(multiProceedInApp,multiProceedReport);
  multiAnalysisCard.append(sharedDerivedSection,csvSection,multiProceedActions);
  const graph=el('section','propulsion-phase3-graph-card propulsion-step-card propulsion-step-card--blue');graph.id='propulsionPhase4GraphCard';
  graph.append(el('div','propulsion-step-label','STEP 05 · COMPARATIVE GRAPHICAL ANALYSIS'),el('h3','','Compare Multiple Logs on Common Axes'),el('p','propulsion-mapping-description','Select one common X-axis parameter and one common Y-axis parameter. All processed logs will be superimposed on the same graph using a distinct colour for each log. Use the slider to explore individual data points.'));
  const controls=el('div','propulsion-phase3-graph-controls');
  const makeGraphSelect=(label,id)=>{const wrap=el('label','propulsion-phase3-control',label),select=document.createElement('select');select.className='propulsion-column-select';select.id=id;wrap.append(select);controls.append(wrap);return select;};
  const xSelect=makeGraphSelect('X AXIS PARAMETER','multiGraphXAxis'),ySelect=makeGraphSelect('Y AXIS PARAMETER','multiGraphYAxis');
  const options=multiFieldOptions();
  options.forEach(item=>{[xSelect,ySelect].forEach(select=>{const option=document.createElement('option');option.value=item.key;option.textContent=item.label;select.append(option);});});
  xSelect.value=options.find(item=>item.key==='actualRpm')?'actualRpm':options[0]?.key||'';
  ySelect.value=options.find(item=>item.key==='thrust')?'thrust':options.find(item=>item.key==='torque')?'torque':options[1]?.key||'';
  const plotButton=el('button','btn','Plot Comparative Graph');plotButton.type='button';controls.append(plotButton);
  const status=el('p','propulsion-phase3-graph-status','Apply filtering and calculations to every log before plotting.');status.setAttribute('role','status');
  const plotHost=el('div','propulsion-phase3-plot-host');
  const explorer=el('div','propulsion-phase3-explorer');
  const rangePanel=el('section','propulsion-x-range-panel propulsion-phase3-range-panel');rangePanel.hidden=true;
  rangePanel.append(el('strong','propulsion-x-range-title','X-Y RANGE SELECTOR'));
  const rangeFields=el('div','propulsion-x-range-fields');
  const makeMultiRangeField=(label,id)=>{const wrap=el('label','propulsion-graph-field',label),field=document.createElement('input');field.type='number';field.step='any';field.id=id;field.placeholder='Full graph range';field.className='propulsion-column-select';wrap.append(field);rangeFields.append(wrap);return field;};
  const rangeXStart=makeMultiRangeField('Start X Point','multiGraphXRangeStart'),rangeXEnd=makeMultiRangeField('End X Point','multiGraphXRangeEnd');
  const rangeYStart=makeMultiRangeField('Start Y Point','multiGraphYRangeStart'),rangeYEnd=makeMultiRangeField('End Y Point','multiGraphYRangeEnd');
  const rangeActions=el('div','propulsion-x-range-actions');
  const applyRange=el('button','btn propulsion-x-range-apply','Apply');applyRange.type='button';
  const resetRange=el('button','btn alt propulsion-x-range-reset','Reset Full Range');resetRange.type='button';resetRange.disabled=true;
  rangeActions.append(applyRange,resetRange);rangePanel.append(rangeFields,rangeActions);
  const sliderLabel=el('label','propulsion-phase3-control','GRAPH NAVIGATION USING SLIDING BAR');const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='0';slider.value='0';slider.step='1';slider.disabled=true;slider.setAttribute('aria-label','Explore comparative graph data points');sliderLabel.append(slider);
  const readout=el('p','propulsion-phase3-point-readout','No point selected.');readout.setAttribute('aria-live','polite');explorer.append(sliderLabel,readout);
  let plottedAxisPair='';
  const plotSelectedAxes=()=>{
   const selectedPair=xSelect.value+'|'+ySelect.value;
   if(selectedPair!==plottedAxisPair){
    // A different axis pair has different numeric bounds; never reuse the prior graph's X-Y range.
    rangeXStart.value='';rangeXEnd.value='';rangeYStart.value='';rangeYEnd.value='';
    rangePanel.hidden=true;resetRange.disabled=true;plottedAxisPair=selectedPair;
   }
   drawMultiComparison({xSelect,ySelect,plotHost,status,slider,readout,rangePanel,rangeXStart,rangeXEnd,rangeYStart,rangeYEnd,resetRange});
  };
  xSelect.addEventListener('change',()=>{status.textContent='X-axis changed. Click Plot Comparative Graph to update the comparison.';});
  ySelect.addEventListener('change',()=>{status.textContent='Y-axis changed. Click Plot Comparative Graph to update the comparison.';});
  plotButton.addEventListener('click',plotSelectedAxes);
  applyRange.addEventListener('click',()=>drawMultiComparison({xSelect,ySelect,plotHost,status,slider,readout,rangePanel,rangeXStart,rangeXEnd,rangeYStart,rangeYEnd,resetRange}));
  resetRange.addEventListener('click',()=>{rangeXStart.value='';rangeXEnd.value='';rangeYStart.value='';rangeYEnd.value='';drawMultiComparison({xSelect,ySelect,plotHost,status,slider,readout,rangePanel,rangeXStart,rangeXEnd,rangeYStart,rangeYEnd,resetRange});});
  explorer.append(sliderLabel,readout,rangePanel);
  graph.append(controls,status,plotHost,explorer);
  multiGraphCard=graph;
    const multiSummaryCard=el('section','propulsion-statistics-card propulsion-step-card propulsion-step-card--green');multiSummaryCard.id='propulsionMultiParameterSummaryCard';multiSummaryCard.hidden=true;
  multiSummaryCard.append(el('span','propulsion-step-label','STEP 04 · PARAMETER SUMMARY'),el('h3','','Comparative Parameter Summary'),el('p','propulsion-statistics-description','Review the maximum recorded value and corresponding timestamp for each mapped parameter in every processed log. All values are calculated from each log’s filtered and sorted dataset.'));
  const summaryValueNote=el('p','propulsion-subsection-description','MAXIMUM VALUES — Every numerical value shown in the Log columns is the maximum recorded value for that parameter in the respective log. The timestamp shown is when that maximum occurred.');summaryValueNote.setAttribute('role','note');
  const summaryWrap=el('div','propulsion-statistics-table-wrap'),summaryTable=document.createElement('table');summaryTable.className='propulsion-statistics-table propulsion-multi-summary-table';
  const summaryHead=document.createElement('thead'),summaryHeadRow=document.createElement('tr');
  ['PARAMETER',...multiSession.logs.map((_,index)=>'LOG '+(index+1))].forEach(label=>summaryHeadRow.append(el('th','',label)));summaryHead.append(summaryHeadRow);summaryTable.append(summaryHead);
  const summaryBody=document.createElement('tbody');summaryTable.append(summaryBody);summaryWrap.append(summaryTable);multiSummaryCard.append(summaryValueNote,summaryWrap);
  const summaryActions=el('div','propulsion-actions'),summaryNext=el('button','btn','Proceed to Graphical Analysis');summaryNext.type='button';summaryActions.append(summaryNext);multiSummaryCard.append(summaryActions);
  multiMappingHost.append(multiAnalysisCard,multiSummaryCard,multiGraphCard);
  multiSummaryCard.hidden=true;multiGraphCard.hidden=true;
  buildMultiLogReportCard();
  multiReportCard.hidden=true;
  const reportNextActions=el('div','propulsion-actions'),reportNext=el('button','btn','Proceed to Generate Report');reportNext.type='button';reportNext.id='proceedToMultiGenerateReportBtn';
  reportNextActions.append(reportNext);multiGraphCard.append(reportNextActions);
  multiProceedInApp.addEventListener('click',()=>{
   if(!multiSession.logs.every(log=>log._phase3Ready)){return;}
   summaryBody.replaceChildren();
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
   const parameterMap=new Map();
   // Build one shared parameter list so a parameter always occupies the same row across all logs.
   multiSession.logs.forEach(log=>{
    const specsForLog=multiActiveSpecs().map(spec=>({key:spec.key,label:spec.label,index:log.mapping[spec.key]})).filter(item=>Number.isInteger(item.index));
    (log._derivedKeys||[]).forEach(key=>specsForLog.push({key,label:key==='mechanicalPower'?'Mechanical Power (W)':key==='electricalPower'?'Electrical Power (W)':'Specific Thrust (N/W)',derived:true}));
    specsForLog.forEach(spec=>{if(!parameterMap.has(spec.key))parameterMap.set(spec.key,{key:spec.key,label:spec.label,derived:!!spec.derived});});
   });
   const summaries=multiSession.logs.map(log=>{
    const rows=log.calculatedRows||[],header=log.filteredRows?.[0]||log.headers||[];
    const timestampIndex=header.map((name,i)=>({index:i,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
    const values=new Map();
    const specsForLog=multiActiveSpecs().map(spec=>({key:spec.key,label:spec.label,index:log.mapping[spec.key],derived:false})).filter(item=>Number.isInteger(item.index));
    (log._derivedKeys||[]).forEach(key=>specsForLog.push({key,label:key==='mechanicalPower'?'Mechanical Power (W)':key==='electricalPower'?'Electrical Power (W)':'Specific Thrust (N/W)',derived:true}));
    specsForLog.forEach(spec=>{
     let maximum=-Infinity,maximumRow=null;
     rows.slice(1).forEach(item=>{
      const raw=String(item.source?.[spec.index]??'').trim();const value=spec.derived?item.derived?.[spec.key]:(raw===''?NaN:Number(raw));const score=(!spec.derived&&(spec.key==='torque'||accelerationParameterKeys.has(spec.key)))?Math.abs(value):value;
      if(Number.isFinite(value)&&score>maximum){maximum=score;maximumRow=item;}
     });
     const timestamp=maximumRow?(timestampIndex===undefined?'Timestamp column not found':String(maximumRow.source?.[timestampIndex]??'').trim()||'Timestamp unavailable'):(timestampIndex===undefined?'Timestamp column not found':'No numeric data');
     const displayed=maximumRow&&!spec.derived&&(spec.key==='torque'||accelerationParameterKeys.has(spec.key))?Number(maximumRow.source?.[spec.index]):maximum;
     values.set(spec.key,{maximum:Number.isFinite(displayed)?new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(displayed):'—',timestamp});
    });
    return values;
   });
   parameterMap.forEach(parameter=>{
    const tr=document.createElement('tr');tr.append(el('th','',parameter.label));
    summaries.forEach(values=>{
     const td=document.createElement('td'),entry=values.get(parameter.key);
     if(entry){
      const maximumLabel=el('strong','propulsion-multi-summary-maximum',entry.maximum);maximumLabel.style.display='block';
      const timestampLabel=el('span','propulsion-multi-summary-timestamp',entry.timestamp);timestampLabel.style.display='block';timestampLabel.style.fontSize='0.82em';timestampLabel.style.marginTop='4px';timestampLabel.style.opacity='0.8';
      td.append(maximumLabel,timestampLabel);
     }else td.textContent='—';
     tr.append(td);
    });
    summaryBody.append(tr);
   });
   multiSummaryCard.hidden=false;multiGraphCard.hidden=true;multiSummaryCard.scrollIntoView({behavior:'smooth',block:'start'});
  });
  summaryNext.addEventListener('click',()=>{
   multiGraphCard.hidden=false;summaryNext.disabled=true;summaryNext.textContent='Graphical Analysis Selected';
   multiGraphCard.scrollIntoView({behavior:'smooth',block:'start'});
  });
  reportNext.addEventListener('click',()=>{
   multiReportCard.refreshPreview?.();multiReportCard.hidden=false;reportNext.disabled=true;reportNext.textContent='Report Generation Selected';
   multiReportCard.scrollIntoView({behavior:'smooth',block:'start'});
  });
  multiProceedReport.addEventListener('click',()=>{
   multiReportCard.refreshPreview?.();multiReportCard.hidden=false;multiSummaryCard.hidden=true;multiGraphCard.hidden=true;
   multiReportCard.scrollIntoView({behavior:'smooth',block:'start'});
  });
  updateMultiGraphAvailability();
 }
 function renderMultiLogPreview(log,host,derivedKeys){
  host.replaceChildren();const rows=log.calculatedRows;if(!rows?.length)return;
  const table=document.createElement('table');table.className='propulsion-phase3-table';
  const columns=multiActiveSpecs().map(spec=>({key:spec.key,label:spec.label,index:log.mapping[spec.key]})).filter(col=>Number.isInteger(col.index));
  derivedKeys.forEach(key=>columns.push({key,label:key==='mechanicalPower'?'Mechanical Power (W)':key==='electricalPower'?'Electrical Power (W)':'Specific Thrust (N/W)',derived:true}));
  const thead=document.createElement('thead'),headRow=document.createElement('tr');columns.forEach(col=>{const th=el('th','',col.label);headRow.append(th);});thead.append(headRow);table.append(thead);
  const tbody=document.createElement('tbody');rows.slice(1,Math.min(rows.length,9)).forEach(item=>{const tr=document.createElement('tr');columns.forEach(col=>{const value=col.derived?item.derived[col.key]:item.source[col.index];const td=el('td','',col.derived&&Number.isFinite(value)?value.toFixed(4):String(value??''));tr.append(td);});tbody.append(tr);});table.append(tbody);host.append(table);
  host.append(el('p','propulsion-phase3-preview-note','Preview: first '+Math.min(8,Math.max(0,rows.length-1))+' data rows after filtering and sorting.'));
 }
 function updateMultiGraphAvailability(){
  const ready=!!multiSession&&multiSession.logs.every(log=>log._phase3Ready);
  const button=multiAnalysisCard?.querySelector('.propulsion-phase3-graph-controls button');
  if(button)button.disabled=!ready;
  const status=multiAnalysisCard?.querySelector('.propulsion-phase3-graph-status');
  if(status)status.textContent=ready?'All logs are processed. Select axes and plot the comparison.':'Apply filtering and calculations to every log before plotting.';
 }
 function drawMultiComparison(ui){
  const {xSelect,ySelect,plotHost,status,slider,readout,rangePanel,rangeXStart,rangeXEnd,rangeYStart,rangeYEnd,resetRange}=ui;
  if(!multiSession.logs.every(log=>log._phase3Ready)){status.textContent='Process every log before plotting.';return;}
  const xKey=xSelect.value,yKey=ySelect.value;
  if(!xKey||!yKey||xKey===yKey){status.textContent='Select two different parameters: one for the X axis and one for the Y axis.';return;}
  const options=multiFieldOptions(),xLabel=options.find(item=>item.key===xKey)?.label||xKey,yLabel=options.find(item=>item.key===yKey)?.label||yKey;
  const series=multiSession.logs.map((log,index)=>{
   const valid=log.calculatedRows.slice(1).map((item,rowIndex)=>({x:mappedValue(log,item.source,xKey,item),y:mappedValue(log,item.source,yKey,item),row:rowIndex+1,logId:log.id,file:log.fileName||multiFiles[index]?.file.name||('Log '+(index+1)),seriesIndex:index})).filter(point=>Number.isFinite(point.x)&&Number.isFinite(point.y));
   let highest=-Infinity;
   const points=valid.filter(point=>{if(point.x<highest)return false;highest=Math.max(highest,point.x);return true;});
   return {log,points,index};
  });
  const all=series.flatMap(item=>item.points);
  if(!all.length){status.textContent='No valid numeric X/Y data pairs were found across the processed logs.';plotHost.replaceChildren();slider.disabled=true;slider.max='0';readout.textContent='No point selected.';return;}
  const bounds=values=>{let min=Math.min(...values),max=Math.max(...values);if(min===max){const pad=Math.abs(min)*.05||1;min-=pad;max+=pad;}return {min,max};};
  const fullX=bounds(all.map(point=>point.x)),fullY=bounds(all.map(point=>point.y));
  if(rangeXStart.value===''||rangeXEnd.value===''){rangeXStart.value=String(fullX.min);rangeXEnd.value=String(fullX.max);}
  if(rangeYStart.value===''||rangeYEnd.value===''){rangeYStart.value=String(fullY.min);rangeYEnd.value=String(fullY.max);}
  const xMin=Number(rangeXStart.value),xMax=Number(rangeXEnd.value),yMin=Number(rangeYStart.value),yMax=Number(rangeYEnd.value);
  if(![xMin,xMax,yMin,yMax].every(Number.isFinite)||xMin>=xMax||yMin>=yMax||xMin<fullX.min||xMax>fullX.max||yMin<fullY.min||yMax>fullY.max){
   status.textContent='Enter valid X and Y ranges within the full graph limits. Start values must be lower than End values. The previous valid graph is retained.';return;
  }
  const rangeSeries=series.map(item=>({...item,points:item.points.filter(point=>point.x>=xMin&&point.x<=xMax&&point.y>=yMin&&point.y<=yMax)}));
  const visibleSeries=rangeSeries.filter(item=>!multiHiddenLogIds.has(String(item.log.id)));
  const visibleAll=visibleSeries.flatMap(item=>item.points);
  if(!rangeSeries.some(item=>item.points.length)){status.textContent='No plotted points fall inside the selected X-Y range. Widen the range and apply again.';return;}
  const xr={min:xMin,max:xMax},yr={min:yMin,max:yMax};
  resetRange.disabled=false;rangePanel.hidden=false;
  const W=1040,H=520,L=105,R=35,T=30,B=82,pw=W-L-R,ph=H-T-B,sx=x=>L+(x-xr.min)/(xr.max-xr.min)*pw,sy=y=>T+ph-(y-yr.min)/(yr.max-yr.min)*ph;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.classList.add('propulsion-chart-svg');svg.setAttribute('role','img');svg.setAttribute('aria-label','Comparative plot of '+xKey+' versus '+yKey+' with all '+series.length+' logs superimposed');
  const add=(tag,attrs,textValue)=>{const node=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([key,value])=>node.setAttribute(key,String(value)));if(textValue!==undefined)node.textContent=textValue;svg.append(node);return node;};
  const fmt=value=>new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(value);
  for(let i=0;i<=5;i++){const x=L+pw*i/5,y=T+ph-ph*i/5;add('line',{x1:x,y1:T,x2:x,y2:T+ph,stroke:'#e3eaf1','stroke-width':1});add('line',{x1:L,y1:y,x2:L+pw,y2:y,stroke:'#e3eaf1','stroke-width':1});add('text',{x,y:T+ph+25,'text-anchor':'middle',fill:'#111827','font-size':13},fmt(xr.min+(xr.max-xr.min)*i/5));add('text',{x:L-12,y:y+4,'text-anchor':'end',fill:'#111827','font-size':13},fmt(yr.min+(yr.max-yr.min)*i/5));}
  add('line',{x1:L,y1:T+ph,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':2});add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#111827','stroke-width':2});
  add('text',{x:L+pw/2,y:H-18,'text-anchor':'middle',fill:'#123b70','font-size':15,'font-weight':700},xLabel);
  const yAxisLabel=add('text',{x:25,y:T+ph/2,'text-anchor':'middle',fill:'#123b70','font-size':15,'font-weight':700},yLabel);yAxisLabel.setAttribute('transform','rotate(-90 25 '+(T+ph/2)+')');
  visibleSeries.forEach(item=>{
   const color=multiColors[item.index%multiColors.length],points=item.points;
   if(!points.length)return;
   const path=points.map((point,index)=>(index?'L':'M')+sx(point.x)+','+sy(point.y)).join(' ');
   add('path',{d:path,fill:'none',stroke:color,'stroke-width':2.7,'stroke-linejoin':'round','stroke-linecap':'round'});
   points.forEach(point=>add('circle',{cx:sx(point.x),cy:sy(point.y),r:3.5,fill:color,stroke:'#fff','stroke-width':.8}));
  });
  let legendX=L;
  series.filter(item=>!multiHiddenLogIds.has(String(item.log.id))).forEach(item=>{const color=multiColors[item.index%multiColors.length],name='LOG '+(item.index+1);add('line',{x1:legendX,y1:18,x2:legendX+24,y2:18,stroke:color,'stroke-width':4,'stroke-linecap':'round'});add('text',{x:legendX+30,y:22,fill:'#334155','font-size':12,'font-weight':700},name);legendX+=95;});
  plotHost.replaceChildren(svg);
  const guide=add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#d97706','stroke-width':1.5,'stroke-dasharray':'5 4','pointer-events':'none'});
  const selectedMarkers=new Map(visibleSeries.map(item=>[item.index,add('circle',{cx:L,cy:T,r:7,fill:'#fff',stroke:multiColors[item.index%multiColors.length],'stroke-width':3,'pointer-events':'none',visibility:'hidden'})]));
  const sliderSteps=1000;
  const updateAtCommonX=position=>{
   const fraction=Math.max(0,Math.min(sliderSteps,Number(position)||0))/sliderSteps;
   const targetX=xr.min+fraction*(xr.max-xr.min),guideX=sx(targetX);
   slider.value=String(Math.round(fraction*sliderSteps));guide.setAttribute('x1',guideX);guide.setAttribute('x2',guideX);
   readout.replaceChildren();
   const heading=el('strong','propulsion-phase3-common-x-readout','COMMON X AXIS · '+xLabel+': '+fmt(targetX));
   readout.append(heading);
   const tableWrap=el('div','propulsion-phase3-readout-table-wrap');
   const table=document.createElement('table');table.className='propulsion-phase3-readout-table';
   const thead=document.createElement('thead'),headRow=document.createElement('tr');
   ['LOG','FILE NAME','X AXIS · '+xLabel,'Y AXIS · '+yLabel,'GRAPH'].forEach(label=>headRow.append(el('th','',label)));
   thead.append(headRow);table.append(thead);
   const tbody=document.createElement('tbody');
   series.forEach(item=>{
    const points=item.points,color=multiColors[item.index%multiColors.length],marker=selectedMarkers.get(item.index),hidden=multiHiddenLogIds.has(String(item.log.id));
    let nearest=null,distance=Infinity;
    points.forEach(point=>{const delta=Math.abs(point.x-targetX);if(delta<distance){distance=delta;nearest=point;}});
    const row=document.createElement('tr');
    const logCell=el('th','','LOG '+(item.index+1));logCell.scope='row';logCell.style.borderLeft='4px solid '+color;row.append(logCell);
    const fileCell=el('td','',item.log.fileName||multiFiles[item.index]?.file.name||('Log '+(item.index+1)));fileCell.className='propulsion-phase3-readout-filename';row.append(fileCell);
    if(nearest){
     if(marker){marker.setAttribute('cx',sx(nearest.x));marker.setAttribute('cy',sy(nearest.y));marker.setAttribute('visibility','visible');}
     row.append(el('td','',fmt(nearest.x)),el('td','',fmt(nearest.y)));
    }else{
     if(marker)marker.setAttribute('visibility','hidden');
     const unavailable=el('td','','No valid plotted point');unavailable.colSpan=2;row.append(unavailable);
    }
    const actionCell=document.createElement('td');const toggle=el('button','btn alt propulsion-log-visibility-toggle',hidden?'Unhide':'Hide');toggle.type='button';toggle.setAttribute('aria-pressed',String(!hidden));toggle.setAttribute('aria-label',(hidden?'Unhide':'Hide')+' LOG '+(item.index+1)+' on graph');toggle.addEventListener('click',()=>{if(hidden)multiHiddenLogIds.delete(String(item.log.id));else multiHiddenLogIds.add(String(item.log.id));const current=Number(slider.value)||0;drawMultiComparison(ui);if(!slider.disabled){slider.value=String(current);slider.oninput?.();}});actionCell.append(toggle);row.append(actionCell);
    tbody.append(row);
   });
   table.append(tbody);tableWrap.append(table);readout.append(tableWrap);
  };
  slider.min='0';slider.max=String(sliderSteps);slider.step='1';slider.value='0';slider.disabled=false;
  slider.setAttribute('aria-valuetext','Common X-axis position');
  slider.oninput=()=>updateAtCommonX(Number(slider.value));updateAtCommonX(0);
  // Slider and direct graph gestures share one common X-axis scale across every log.
  const interactionLayer=add('rect',{x:L,y:T,width:pw,height:ph,fill:'transparent',cursor:'crosshair','pointer-events':'all','aria-label':'Touch or drag over the graph to move the common X-axis position for every log'});
  interactionLayer.style.touchAction='pan-y';
  let activePointerId=null;
  const selectCommonXAtClientX=clientX=>{
   const bounds=svg.getBoundingClientRect();if(!bounds.width)return;
   const viewX=(clientX-bounds.left)*(W/bounds.width);
   const graphX=Math.max(L,Math.min(L+pw,viewX));
   const fraction=(graphX-L)/pw;
   updateAtCommonX(fraction*sliderSteps);
  };
  interactionLayer.addEventListener('pointerdown',event=>{
   if(event.pointerType==='mouse'&&event.button!==0)return;
   activePointerId=event.pointerId;
   try{interactionLayer.setPointerCapture(event.pointerId)}catch(_){}
   selectCommonXAtClientX(event.clientX);event.preventDefault();
  });
  interactionLayer.addEventListener('pointermove',event=>{
   if(activePointerId!==event.pointerId)return;
   selectCommonXAtClientX(event.clientX);event.preventDefault();
  });
  const endPointer=event=>{if(activePointerId===event.pointerId){activePointerId=null;try{interactionLayer.releasePointerCapture(event.pointerId)}catch(_){}}};
  interactionLayer.addEventListener('pointerup',endPointer);
  interactionLayer.addEventListener('pointercancel',endPointer);
  status.textContent=visibleAll.length.toLocaleString()+' plotted points within the applied X-Y range across '+visibleSeries.filter(item=>item.points.length).length+' visible logs. Hidden logs remain in the dataset and can be restored using Unhide.';
 }

 function identifyAllMultiLogs(){if(!commonEngine)throw new Error('The common analysis engine did not load.');const count=Number(logCountSelect.value);multiSession=commonEngine.createSession(count,multiLogType);multiSession.logs.forEach((log,index)=>{const source=multiFiles[index];commonEngine.setLogData(log,{fileName:source.file.name,headers:source.headers,rows:[source.headers,...source.data]});log._headerIndex=source.headerIndex;log._dataRows=source.data;});renderMultiMappings();multiMappingHost.scrollIntoView({behavior:'smooth',block:'start'});}
 const confirmCommonSetupBtn=$id('confirmCommonSetupBtn');
 let appliedLogCount='';
 const confirmSetupStatus=$id('propulsionCommonSetupStatus');
 const clearSingleLogWorkflow=()=>{
  input.value='';
  logType='';
  logTypePicker?.querySelectorAll('input[name="propulsionLogType"]').forEach(radio=>{radio.checked=false;});
  resetAnalysis();
  if(filePicker)filePicker.hidden=false;
  reset.textContent='Choose another log file';
  setUploadState(false,'Select Thrust Log or Torque Log to begin a new session');
  updateLogTypeUI();
 };
 confirmCommonSetupBtn?.addEventListener('click',async()=>{
  const selectedCount=String(logCountSelect?.value||'');
  if(!['1','2','3','4'].includes(selectedCount)){
   logCountSelect?.focus();
   if(confirmSetupStatus)confirmSetupStatus.textContent='Please select the number of test logs before proceeding.';
   return;
  }
  // First selection: proceed directly without a page reload or clearing a session.
  if(!appliedLogCount){
   setMultiMode();
   appliedLogCount=selectedCount;
   if(confirmSetupStatus)confirmSetupStatus.textContent=selectedCount==='1'?'Single-log setup selected. Upload your test log below.':'Comparative setup selected for '+selectedCount+' logs. Upload the requested logs below.';
   (selectedCount==='1'?uploadCard:multiSetupCard)?.scrollIntoView({behavior:'smooth',block:'start'});
   return;
  }
  // Re-clicking Proceed with the same applied choice should not destroy work.
  if(selectedCount===appliedLogCount){
   if(confirmSetupStatus)confirmSetupStatus.textContent='This test-log configuration is already active.';
   (selectedCount==='1'?uploadCard:multiSetupCard)?.scrollIntoView({behavior:'smooth',block:'start'});
   return;
  }
  // A genuinely changed choice invalidates every downstream section and its data.
  if(confirmSetupStatus)confirmSetupStatus.textContent='Changing the test-log configuration. Clearing previous workflow data…';
  confirmCommonSetupBtn.disabled=true;
  confirmCommonSetupBtn.textContent='Resetting…';
  try{
   await sessionTools.clear();
   clearSingleLogWorkflow();
   resetMultiSetup();
   setMultiMode();
   appliedLogCount=selectedCount;
   if(confirmSetupStatus)confirmSetupStatus.textContent=selectedCount==='1'?'Configuration changed. Previous sections were reset. Upload one test log below.':'Configuration changed. Previous sections were reset. Upload '+selectedCount+' test logs below.';
   (selectedCount==='1'?uploadCard:multiSetupCard)?.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(error){
   console.error('Could not reset the previous propulsion workflow:',error);
   if(confirmSetupStatus)confirmSetupStatus.textContent='The previous session could not be cleared. Please retry.';
  }finally{
   confirmCommonSetupBtn.disabled=false;
   confirmCommonSetupBtn.textContent='Proceed';
  }
 });
 const multiLogTypePicker=$id('propulsionMultiLogTypePicker');
 function syncMultiLogTypeSelection(){multiLogTypePicker?.querySelectorAll('.propulsion-log-type-option').forEach(option=>{const selected=!!option.querySelector('input')?.checked;option.classList.toggle('is-selected',selected);if(selected){option.style.setProperty('background-color','#1769aa','important');option.style.setProperty('border-color','#1769aa','important');}else{option.style.removeProperty('background-color');option.style.removeProperty('border-color');}});}
 multiLogTypePicker?.querySelectorAll('input[name="propulsionMultiLogType"]').forEach(radio=>radio.addEventListener('change',()=>{multiLogType=radio.value;syncMultiLogTypeSelection();resetMultiSetup();updateMultiUploadGate();}));
 syncMultiLogTypeSelection();
 identifyMultipleLogsBtn?.addEventListener('click',()=>{try{identifyAllMultiLogs();}catch(error){if(multiUploadStatus)multiUploadStatus.textContent=error.message||'Unable to identify the uploaded logs.';}});
 // Keep both Step 01 variants hidden until the user chooses a log count and clicks Proceed.
 if(uploadCard)uploadCard.hidden=true;
 if(multiSetupCard)multiSetupCard.hidden=true;
 const commonSetup=$id('propulsionCommonSetupCard');if(commonSetup)commonSetup.hidden=false;
 if(logCountSelect){logCountSelect.selectedIndex=0;logCountSelect.value='';}

 start.textContent='Identify Parameters';start.disabled=true;
 // Every page load starts a completely new propulsion session. No previous CSV,
 // log type, mapping, derived calculation, graph selection, or workflow state is restored.
 const beginFreshPropulsionSession=async()=>{
  try{
   await sessionTools.clear();
  }catch(error){console.warn('Could not clear previous propulsion session:',error)}
  // Keep navigation preferences; only analysis/session data is reset on refresh.
  input.value='';
  logType='';
  logTypePicker?.querySelectorAll('input[name="propulsionLogType"]').forEach(radio=>{radio.checked=false;});
  resetAnalysis();
  if(filePicker)filePicker.hidden=false;
  reset.textContent='Choose another log file';
  setUploadState(false,'Select Thrust Log or Torque Log to begin a new session');
  updateLogTypeUI();
 };
 beginFreshPropulsionSession();
 // Browsers may restore form-control values when refreshing or returning from the
 // back-forward cache. Force the placeholder selection whenever this page is shown.
 const resetLogCountForFreshPage=()=>{
  if(logCountSelect){logCountSelect.selectedIndex=0;logCountSelect.value='';}
  if(uploadCard)uploadCard.hidden=true;
  if(multiSetupCard)multiSetupCard.hidden=true;
  const setupCard=$id('propulsionCommonSetupCard');
  if(setupCard)setupCard.hidden=false;
  const setupStatus=$id('propulsionCommonSetupStatus');
  if(setupStatus)setupStatus.textContent='Select the number of test logs, then click Proceed.';
 };
 window.addEventListener('pageshow',resetLogCountForFreshPage);
})();