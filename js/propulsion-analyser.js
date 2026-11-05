/* Propulsion Test Bench Log Analyzer — local CSV parameter identification */
(()=>{
 'use strict';
 const $id=id=>document.getElementById(id);
 const input=$id('propulsionCsvInput'),filePicker=input?.closest('.propulsion-file-picker'),status=$id('propulsionUploadStatus'),meta=$id('propulsionFileMeta'),start=$id('startPropulsionAnalysisBtn'),reset=$id('resetPropulsionUploadBtn'),workspace=document.querySelector('.propulsion-analyser-workspace');
 if(reset)reset.textContent='Choose another log file';
 if(!input||!status||!start||!workspace)return;
 const uploadCard=input.closest('.propulsion-upload-card');
 let csvPreviewPanel=null;
 function renderCsvPreview(text){
  if(csvPreviewPanel)csvPreviewPanel.remove();
  const rows=parseCSV(text,chooseDelimiter(text));
  if(!rows.length)return;
  const maxColumns=Math.max(0,...rows.map(row=>row.length));
  const headerIndex=findHeader(rows);
  const actualRpmIndex=headerIndex>=0?rows[headerIndex].map((name,index)=>({index,score:scoreHeader(name,specs.find(s=>s.key==='actualRpm').aliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index:-1;
  const filteredRows=actualRpmIndex<0?null:rows.filter((row,index)=>{
   if(index<=headerIndex)return true;
   const raw=String(row[actualRpmIndex]??'').trim();
   if(raw==='')return true;
   const rpm=Number(raw);
   return !Number.isFinite(rpm)||rpm>0;
  });
  csvPreviewPanel=el('section','propulsion-csv-preview-card propulsion-step-card propulsion-step-card--green');
  csvPreviewPanel.id='propulsionCsvPreview';
  csvPreviewPanel.setAttribute('aria-labelledby','propulsionCsvPreviewHeading');
  const heading=el('div','propulsion-step-label','CSV FILE PREVIEW');
  const title=el('h3','','Complete CSV Preview');title.id='propulsionCsvPreviewHeading';
  const info=el('p','propulsion-csv-preview-meta','');
  const searchBar=el('div','propulsion-csv-search');
  const timestampSearch=document.createElement('input');timestampSearch.type='text';timestampSearch.className='propulsion-csv-search-input';timestampSearch.placeholder='Paste timestamp to find matching row';timestampSearch.setAttribute('aria-label','Search CSV by timestamp');
  const searchButton=el('button','btn alt','Search Timestamp');searchButton.type='button';
  const searchStatus=el('span','propulsion-csv-search-status','');
  searchBar.append(timestampSearch,searchButton,searchStatus);
  const viewport=el('div','propulsion-csv-preview-viewport');viewport.setAttribute('role','region');viewport.setAttribute('aria-label','CSV data preview');viewport.tabIndex=0;
  const table=document.createElement('table');table.className='propulsion-csv-preview-table';
  const thead=document.createElement('thead'),headRow=document.createElement('tr');
  const rowHead=el('th','','ROW');rowHead.scope='col';headRow.append(rowHead);
  for(let col=0;col<maxColumns;col++){const th=el('th','','COLUMN '+(col+1));th.scope='col';headRow.append(th)}
  thead.append(headRow);table.append(thead);
  const tbody=document.createElement('tbody');table.append(tbody);viewport.append(table);
  const rawToggle=el('button','btn alt','Show Uploaded Raw CSV File');rawToggle.type='button';rawToggle.id='showUploadedRawCsvBtn';
  const previewActions=el('div','propulsion-actions propulsion-csv-preview-toggle-actions');
  previewActions.append(rawToggle);
  const identifyActions=el('div','propulsion-actions propulsion-csv-preview-actions');identifyActions.append(start);identifyActions.hidden=true;
  let activeView='',visibleRows=[];
  const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
  const timestampColumn=headerIndex>=0?(rows[headerIndex].map((name,index)=>({index,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index??0):0;
  const searchTimestamp=()=>{
   const query=timestampSearch.value.trim();
   tbody.querySelectorAll('tr.csv-timestamp-match').forEach(row=>row.classList.remove('csv-timestamp-match'));
   if(!query){searchStatus.textContent='Enter a timestamp to search.';return}
   const matches=[];
   visibleRows.forEach((row,index)=>{if(index>headerIndex&&String(row[timestampColumn]??'').trim()===query)matches.push(index)});
   if(!matches.length){searchStatus.textContent='No exact timestamp match found.';return}
   matches.forEach(index=>{const tr=tbody.rows[index];if(tr)tr.classList.add('csv-timestamp-match')});
   const first=tbody.rows[matches[0]];
   if(first){const top=first.offsetTop-viewport.offsetTop;viewport.scrollTop=Math.max(0,top-viewport.clientHeight/2+first.offsetHeight/2);}
   searchStatus.textContent=matches.length.toLocaleString()+' matching row(s) highlighted.';
  };
  searchButton.addEventListener('click',searchTimestamp);
  timestampSearch.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchTimestamp()}});
  const renderRows=(viewRows,viewName)=>{
   visibleRows=viewRows;tbody.replaceChildren();searchStatus.textContent='';timestampSearch.value='';
   viewRows.forEach((row,rowIndex)=>{const tr=document.createElement('tr');const indexCell=el('th','',String(rowIndex+1));indexCell.scope='row';tr.append(indexCell);for(let col=0;col<maxColumns;col++)tr.append(el('td','',String(row[col]??'')));tbody.append(tr)});
   title.textContent=viewName==='raw'?'Uploaded Raw CSV File':'Data Filtered CSV File';
   info.textContent=viewRows.length.toLocaleString()+' rows · '+maxColumns.toLocaleString()+' columns · '+(viewName==='raw'?'Original uploaded file, unchanged':'Rows with Actual RPM equal to zero or below removed');
   viewport.setAttribute('aria-label',viewName==='raw'?'Uploaded raw CSV data preview':'Data filtered CSV preview');
   activeView=viewName;
   csvPreviewPanel.hidden=false;identifyActions.hidden=false;
   rawToggle.textContent=viewName==='raw'?'Hide Uploaded Raw CSV File':'Show Uploaded Raw CSV File';
   rawToggle.setAttribute('aria-expanded',String(viewName==='raw'));
   requestAnimationFrame(setFreezeOffsets);
  };
  const hidePreview=()=>{csvPreviewPanel.hidden=true;identifyActions.hidden=true;activeView='';rawToggle.textContent='Show Uploaded Raw CSV File';rawToggle.setAttribute('aria-expanded','false')};
  rawToggle.addEventListener('click',()=>{if(activeView==='raw'&&!csvPreviewPanel.hidden)hidePreview();else renderRows(rows,'raw')});
  function graphStatusSafeMessage(){info.textContent='Filtered preview unavailable: Actual RPM column could not be identified in this CSV. Please verify the column header.';title.textContent='Data Filtered CSV File';csvPreviewPanel.hidden=false;identifyActions.hidden=true;activeView='filtered';}
  if(uploadCard){uploadCard.insertAdjacentElement('afterend',previewActions);previewActions.insertAdjacentElement('afterend',csvPreviewPanel);}
  else{workspace.insertBefore(previewActions,workspace.firstChild);previewActions.insertAdjacentElement('afterend',csvPreviewPanel);}
  csvPreviewPanel.append(heading,title,info,searchBar,viewport);
  csvPreviewPanel.hidden=true;
  csvPreviewPanel.insertAdjacentElement('afterend',identifyActions);
  const setFreezeOffsets=()=>{const header=headRow.getBoundingClientRect(),first=tbody.rows[0]?.getBoundingClientRect(),rowIndexWidth=headRow.cells[0]?.getBoundingClientRect().width;if(header.height)viewport.style.setProperty('--csv-header-height',header.height+'px');if(first?.height)viewport.style.setProperty('--csv-row1-height',first.height+'px');if(rowIndexWidth)viewport.style.setProperty('--csv-first-col-width',rowIndexWidth+'px');};
  requestAnimationFrame(setFreezeOffsets);
  if(typeof ResizeObserver!=='undefined'){const freezeObserver=new ResizeObserver(setFreezeOffsets);freezeObserver.observe(viewport);freezeObserver.observe(table);}
 }
 const specs=[
  {key:'thrust',label:'Thrust',aliases:['net_thrust_n','net thrust n','thrust n','thrust newton','thrust']},
  {key:'torque',label:'Torque',aliases:['esc_torque_nm','torque_nm','torque nm','torque']},
  {key:'commandRpm',label:'Command RPM',aliases:['commanded_rpm','command_rpm','command rpm','commanded rpm','setpoint rpm','target rpm']},
  {key:'actualRpm',label:'Actual RPM',aliases:['actual_rpm','measured_rpm','motor_speed_rpm','actual rpm','motor rpm']},
  {key:'voltage',label:'DC Voltage',aliases:['dc_voltage_v','dc voltage','bus_voltage_v','battery_voltage_v','voltage_v']},
  {key:'current',label:'DC Current',aliases:['current_a','dc_current_a','dc current','battery_current_a','bus_current_a']},
  {key:'motorTemperature',label:'Motor Temperature',aliases:['motor_temperature_c','motor_temp_c','motor temperature','motor temp','motor_temperature','motor_temp','temperature_motor','motor winding temperature']},
  {key:'escTemperature',label:'ESC Temperature',aliases:['esc_temperature_c','esc_temp_c','esc temperature','esc temp','esc_temperature','esc_temp','controller_temperature','electronic speed controller temperature']}
 ];
 let selectedFile=null,headerRow=[],dataRows=[],analysisRows=[],mapping={},calculatedParameterKeys=[],calculatedParameterControls={},confirmed=false,step3FilterVisible=false,step3Visible=false,step4Visible=false,step5Visible=false,reportDirectVisible=false,analysisPanel=null;
 const DB_NAME='yeti-flight-trial-state',DB_STORE='propulsion-analyser',DB_KEY='active-session';
 function openStateDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 let graphXIndex='',graphYIndex='',graphY2Index='';
 async function saveState(){try{const db=await openStateDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({csvText:parseCSVText,fileName:selectedFile?.name||'Restored CSV log.csv',stage:step5Visible?'report':step4Visible?'graphical':step3Visible?'summary':step3FilterVisible?'filter':confirmed?'confirmed':analysisPanel?'identified':selectedFile?'uploaded':'empty',reportDirectVisible,mapping:Object.fromEntries(specs.map(s=>[s.key,mapping[s.key]?.selected??''])),graphXIndex,graphYIndex,graphY2Index,calculatedParameterKeys},DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch(error){console.warn('Could not save propulsion session locally:',error)}}
 async function loadState(){try{const db=await openStateDB();const saved=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(DB_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();if(!saved?.csvText)return;parseCSVText=saved.csvText;selectedFile={name:saved.fileName||'Restored CSV log.csv',size:new Blob([parseCSVText]).size,text:async()=>parseCSVText};if(filePicker)filePicker.hidden=true;meta.hidden=false;meta.textContent=selectedFile.name+' · '+(selectedFile.size/1024).toFixed(1)+' KB · Restored locally';reset.hidden=false;setUploadState(true,'Previous CSV session restored from this browser');renderCsvPreview(parseCSVText);const rows=parseCSV(parseCSVText,chooseDelimiter(parseCSVText));detect(rows);if(saved.mapping){specs.forEach(spec=>{const value=saved.mapping[spec.key];if(value!==''&&value!==undefined)mapping[spec.key].selected=Number(value)});analysisPanel.querySelectorAll('.propulsion-column-select').forEach(select=>{select.value=mapping[select.dataset.key].selected===''?'':String(mapping[select.dataset.key].selected)});validateMapping()}if((saved.stage==='confirmed'||saved.stage==='filter'||saved.stage==='summary'||saved.stage==='graphical'||saved.stage==='report')&&validateMapping())$id('confirmPropulsionMappingBtn').click();if(Array.isArray(saved.calculatedParameterKeys)){saved.calculatedParameterKeys.forEach(key=>{const control=calculatedParameterControls[key];if(control){control.checkbox.checked=true;control.checkbox.dispatchEvent(new Event('change'));control.calculate.click();}})}if((saved.stage==='summary'||saved.stage==='graphical')&&confirmed)$id('proceedToParameterSummaryBtn')?.click();if(saved.stage==='summary'||saved.stage==='graphical')$id('proceedToParameterSummaryBtn')?.click();if(saved.stage==='report'&&saved.reportDirectVisible){$id('proceedToReportGenerationChoiceBtn')?.click()}else if((saved.stage==='graphical'||saved.stage==='report')&&step3Visible){$id('proceedToGraphicalAnalysisBtn')?.click();if(saved.stage==='report')$id('proceedToGenerateReportBtn')?.click();if(saved.graphXIndex!==undefined){graphXIndex=String(saved.graphXIndex);graphYIndex=String(saved.graphYIndex??'');graphY2Index=String(saved.graphY2Index??'');const xs=$id('propulsionXAxisSelect'),ys=$id('propulsionYAxisSelect'),y2s=$id('propulsionSecondaryYAxisSelect');if(xs)xs.value=graphXIndex;if(ys)ys.value=graphYIndex;if(y2s)y2s.value=graphY2Index;if($id('plotPropulsionGraphBtn')&&graphXIndex!==''&&graphYIndex!=='')$id('plotPropulsionGraphBtn').click();}}start.textContent='Parameters Identified';start.disabled=true}catch(error){console.warn('Could not restore propulsion session:',error)}}
 function setUploadState(ok,text){status.classList.toggle('is-complete',ok);status.querySelector('.propulsion-status-symbol').textContent=ok?'✓':'○';status.lastElementChild.textContent=text}
 function parseCSV(text,delimiter){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
   const ch=text[i];
   if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"')quoted=false;else field+=ch}
   else if(ch==='"')quoted=true;
   else if(ch===delimiter){row.push(field);field=''}
   else if(ch==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field=''}
   else field+=ch;
  }
  if(field.length||row.length){row.push(field.replace(/\r$/,''));rows.push(row)}
  return rows;
 }
 function chooseDelimiter(text){
  const first=(text.split(/\r?\n/).find(line=>line.trim())||'');
  const candidates=[',',';','\t'];return candidates.map(d=>({d,n:(first.match(new RegExp(d==='\t'?'\\t':d==='.'?'\\.':d==='|'?'\\|':d.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&'),'g'))||[]).length})).sort((a,b)=>b.n-a.n)[0].d;
 }
 function norm(s){return String(s??'').replace(/^\uFEFF/,'').trim().toLowerCase().replace(/[\s().\-\/]+/g,'_').replace(/_+/g,'_')}
 function scoreHeader(header,aliases){
  const h=norm(header);let best=0;
  for(const a of aliases){const n=norm(a);if(h===n)best=Math.max(best,100);else if(h.includes(n)||n.includes(h))best=Math.max(best, h.length>3?65:30)}
  return best;
 }
 function findHeader(rows){
  let best={index:-1,score:0};
  for(let i=0;i<Math.min(rows.length,10);i++){
   const cells=rows[i].map(v=>String(v??'').trim());
   const score=specs.reduce((sum,s)=>sum+(cells.some(c=>scoreHeader(c,s.aliases)>=65)?1:0),0);
   if(score>best.score)best={index:i,score};
  }
  return best.score>=4?best.index:-1;
 }
 function detect(rows){
  // Re-identification starts a fresh review cycle; a previous confirmation must not lock the new mapping.
  confirmed=false;step3Visible=false;step4Visible=false;step5Visible=false;
  const hi=findHeader(rows);if(hi<0)throw new Error('Could not locate a recognizable header row in the first 10 rows.');
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
  analysisPanel=el('section','propulsion-mapping-card propulsion-step-card propulsion-step-card--purple');analysisPanel.setAttribute('aria-labelledby','propulsionMappingHeading');
  const top=el('div','propulsion-mapping-top');top.append(el('span','propulsion-step-label','STEP 02 · COLUMN IDENTIFICATION'));
  const h=el('h3','', 'Review detected parameters');h.id='propulsionMappingHeading';top.append(h);
  top.append(el('p','propulsion-mapping-description', 'Header row detected at CSV row '+(headerIndex+1)+'. Review the proposed column mapping before proceeding.'));
  analysisPanel.append(top);
  const grid=el('div','propulsion-mapping-list');
  specs.forEach(s=>{
   const item=el('label','propulsion-mapping-row');item.append(el('span','propulsion-mapping-label',s.label));
   const select=el('select','propulsion-column-select');select.dataset.key=s.key;
   const empty=document.createElement('option');empty.value='';empty.textContent='Not detected — select a column';select.append(empty);
   headerRow.forEach((name,index)=>{const opt=document.createElement('option');opt.value=String(index);opt.textContent=name;select.append(opt)});
   const current=mapping[s.key].selected;select.value=current===''?'':String(current);
   if(mapping[s.key].candidates.length>1){item.append(el('span','propulsion-match-note','Multiple possible matches — verify selection'))}
   else if(current===''){item.append(el('span','propulsion-match-note warning','No automatic match — choose manually'))}
   item.append(select);select.addEventListener('change',()=>{mapping[s.key].selected=select.value===''?'':Number(select.value);validateMapping();saveState()});
   grid.append(item);
  });
  analysisPanel.append(grid);
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
  const calculatedParameters=el('div','propulsion-calculated-parameters');calculatedParameters.id='propulsionCalculatedParameters';
  const calculatedParameterDefinitions=[
   {key:'mechanicalPower',name:'Mechanical Power',formula:'Pₘ (W) = τ (N·m) × N (RPM) × (2π / 60)',sources:[['torque','Torque'],['actualRpm','Motor Speed (Actual RPM)']]},
   {key:'electricalPower',name:'Electrical Power',formula:'Pₑ (W) = VDC (V) × IDC (A)',sources:[['voltage','DC Voltage'],['current','DC Current']]},
   {key:'overallEfficiency',name:'Specific Thrust',formula:'ST (N/W) = Thrust (N) / Electrical Power (W)',sources:[['thrust','Thrust'],['voltage','DC Voltage'],['current','DC Current']]}
  ];
  calculatedParameterControls={};
  const mappedColumnName=key=>{
   const index=mapping[key]?.selected;
   return index===''||index===undefined?'Not mapped':(headerRow[index]||'Mapped column');
  };
  calculatedParameterDefinitions.forEach(parameter=>{
   const card=el('div','propulsion-calculated-parameter');card.dataset.parameterKey=parameter.key;
   const details=el('div','propulsion-calculated-parameter-details');
   const label=el('label','propulsion-calculated-parameter-label');
   const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.setAttribute('aria-label','Calculate '+parameter.name);
   const name=el('strong','',parameter.name);label.append(checkbox,name);
   const formulaLabel=el('span','propulsion-calculated-formula-label','FORMULA');
   const formula=el('div','propulsion-calculated-formula',parameter.formula);
   const mappingNote=el('div','propulsion-calculated-mapping-note');
   const updateMappingNote=()=>{
    const mapped=parameter.sources.map(([key,term])=>term+' → '+mappedColumnName(key));
    if(parameter.key==='overallEfficiency')mapped.push('Electrical Power → DC Voltage × DC Current (mapped inputs)');
    if(parameter.key==='mechanicalPower')mapped[1]='Motor Speed → '+mappedColumnName('actualRpm')+' (Actual RPM)';
    mappingNote.textContent='STEP 02 MAPPED INPUTS: '+mapped.join('  ·  ');
   };
   updateMappingNote();
   details.append(label,formulaLabel,formula,mappingNote);
   const calculate=el('button','btn alt propulsion-calculated-action','Calculate and Add to Graph');calculate.type='button';calculate.disabled=true;
   calculate.title='Select the checkbox to enable this calculation.';
   calculatedParameterControls[parameter.key]={checkbox,calculate,updateMappingNote};
   checkbox.addEventListener('change',()=>{calculate.disabled=!checkbox.checked;});
   calculate.addEventListener('click',()=>{
    updateMappingNote();
    const requiredKeys=parameter.key==='mechanicalPower'?['torque','actualRpm']:parameter.key==='electricalPower'?['voltage','current']:['thrust','voltage','current'];
    const missing=requiredKeys.filter(key=>mapping[key]?.selected===''||mapping[key]?.selected===undefined);
    if(missing.length){
     graphStatus.textContent='Cannot calculate '+parameter.name+'. Confirm these Step 02 mappings: '+missing.map(key=>specs.find(spec=>spec.key===key)?.label||key).join(', ')+'.';
     return;
    }
    const numberFrom=(row,key)=>{
     const index=mapping[key].selected,raw=String(row[index]??'').trim();
     if(raw==='')return NaN;
     const value=Number(raw);return Number.isFinite(value)?value:NaN;
    };
    const calculateRow=row=>{
     if(parameter.key==='mechanicalPower'){
      const torque=numberFrom(row,'torque'),motorSpeed=numberFrom(row,'actualRpm');
      return Number.isFinite(torque)&&Number.isFinite(motorSpeed)?torque*motorSpeed*(2*Math.PI/60):NaN;
     }
     if(parameter.key==='electricalPower'){
      const voltage=numberFrom(row,'voltage'),current=numberFrom(row,'current');
      return Number.isFinite(voltage)&&Number.isFinite(current)?voltage*current:NaN;
     }
     const thrust=numberFrom(row,'thrust'),voltage=numberFrom(row,'voltage'),current=numberFrom(row,'current');
     const electricalPower=voltage*current;
     return Number.isFinite(thrust)&&Number.isFinite(electricalPower)&&electricalPower>0?thrust/electricalPower:NaN;
    };
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
    saveState();
   });
   card.append(details,calculate);calculatedParameters.append(card);
  });
  step3Filter.append(calculatedParameters);
  const filterActions=el('div','propulsion-actions');filterActions.append(proceed,directReportProceed);
  workspace.insertBefore(step3Filter,workspace.querySelector('.propulsion-local-note'));
  workspace.insertBefore(step3,workspace.querySelector('.propulsion-local-note'));
  const step4=el('section','propulsion-graphical-card propulsion-step-card propulsion-step-card--blue');step4.id='propulsionGraphicalAnalysisCard';step4.hidden=true;
  step4.append(el('span','propulsion-step-label','STEP 05 · GRAPHICAL ANALYSIS'));step4.append(el('h3','','Graphical Analysis'));
  step4.append(el('p','propulsion-statistics-description','Select any two numeric CSV columns to plot their relationship.'));
  const graphControls=el('div','propulsion-graph-controls');
  const makeAxisField=(labelText,id)=>{const label=el('label','propulsion-graph-field',labelText);const select=el('select','propulsion-column-select');select.id=id;const empty=document.createElement('option');empty.value='';empty.textContent='Select a CSV column';select.append(empty);headerRow.forEach((name,index)=>{const option=document.createElement('option');option.value=String(index);option.textContent=name;select.append(option)});label.append(select);return {label,select}};
  const xField=makeAxisField('Choose X Axis','propulsionXAxisSelect');
  const yField=makeAxisField('Choose Primary Y Axis','propulsionYAxisSelect');
  const y2Field=makeAxisField('Choose Secondary Y Axis','propulsionSecondaryYAxisSelect');
  const numericColumns=headerRow.map((_,index)=>({index,count:analysisRows.filter(row=>{const v=String(row[index]??'').trim();return v!==''&&Number.isFinite(Number(v))}).length})).filter(item=>item.count>0);
  const [xSelect,ySelect,y2Select]=[xField.select,yField.select,y2Field.select];
  const savedGraphSelection=()=>{graphXIndex=xSelect.value;graphYIndex=ySelect.value;graphY2Index=y2Select.value;saveState()};
  const updatePlotAvailability=()=>{plotButton.disabled=xSelect.value===''||ySelect.value==='';};
  const plotActions=el('div','propulsion-actions');const plotButton=el('button','btn','Plot Graph');plotButton.type='button';plotButton.id='plotPropulsionGraphBtn';plotButton.disabled=true;plotActions.append(plotButton);
  [xSelect,ySelect,y2Select].forEach(select=>select.addEventListener('change',()=>{savedGraphSelection();updatePlotAvailability()}));
  graphControls.append(xField.label,yField.label,y2Field.label);step4.append(graphControls);
  step4.append(plotActions);
  const graphStatus=el('p','propulsion-graph-status','Choose an X axis and at least one Y axis parameter to enable Plot Graph.');graphStatus.id='propulsionGraphStatus';step4.append(graphStatus);
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
  sliderNavigationSection.append(pointReadout,pointSliderLabel,pointCounter);
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
  const updatePointSearchLabels=()=>{xSearch.previousSibling.textContent='X · '+headerRow[xiForReadout];ySearch.previousSibling.textContent='PRIMARY Y · '+headerRow[yiForReadout];y2Search.previousSibling.textContent=y2iForReadout===null?'SECONDARY Y · NOT SELECTED':'SECONDARY Y · '+headerRow[y2iForReadout];y2Search.disabled=y2iForReadout===null};
  const clearPointSearch=()=>{pointSearchInputs.forEach(input=>input.value='');pointNavStatus.textContent='Enter one value to locate a plotted point.';navigateToPointButton.disabled=!plottedPoints.length};
  pointSearchInputs.forEach(input=>input.addEventListener('input',()=>{const entered=pointSearchInputs.filter(field=>field.value.trim()!=='').length;navigateToPointButton.disabled=!plottedPoints.length||entered!==1;pointNavStatus.textContent=entered>1?'Please enter a value in only one field.':entered===1?'Ready to locate the nearest plotted point.':'Enter one value to locate a plotted point.'}));
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
  // Use the live input event as the sole slider update source while dragging.
  pointSlider.addEventListener('input',()=>selectGraphPoint(pointSlider.value));
  plotButton.addEventListener('click',()=>{
   const xi=Number(xSelect.value),yi=Number(ySelect.value),y2i=y2Select.value===''?null:Number(y2Select.value);
   if(xSelect.value===''||ySelect.value===''||!Number.isInteger(xi)||!Number.isInteger(yi)){graphStatus.textContent='Select an X axis and at least one Y axis parameter.';return}
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];const timestampIndex=headerRow.map((name,index)=>({index,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
   // Empty CSV cells are missing values, not numeric zero; this prevents false zero-origin graph segments.
   const parseCsvNumber=value=>{const text=String(value??'').trim();if(text==='')return NaN;const number=Number(text);return Number.isFinite(number)?number:NaN};
   const rawPts=analysisRows.map((row,index)=>({x:parseCsvNumber(row[xi]),y:parseCsvNumber(row[yi]),y2:y2i===null?NaN:parseCsvNumber(row[y2i]),timestamp:timestampIndex===undefined?'Timestamp column not found':String(row[timestampIndex]??'').trim()||'Timestamp unavailable',index})).filter(p=>Number.isFinite(p.x));
   // Keep record-high X values only, preserving original CSV row order.
   let highestX=-Infinity;
   const pts=rawPts.filter(p=>{if(p.x<highestX)return false;highestX=p.x;return true;});
   const removedReturnPoints=rawPts.length-pts.length;
   const primaryPts=pts.filter(p=>Number.isFinite(p.y)),secondaryPts=pts.filter(p=>Number.isFinite(p.y2));
   if(primaryPts.length<2){chartHost.replaceChildren();graphStatus.textContent='Not enough numeric X and Primary Y row pairs to plot the primary axis.';return}
   if(y2i!==null&&secondaryPts.length<2){chartHost.replaceChildren();graphStatus.textContent='Not enough numeric X and Secondary Y row pairs to plot the secondary axis.';return}
   const W=1040,H=520,L=132,R=y2i===null?34:100,T=30,B=88,pw=W-L-R,ph=H-T-B;
   const range=values=>{let min=Math.min(...values),max=Math.max(...values);if(min===max){min-=1;max+=1}return {min,max}};
   const xr=range(pts.map(p=>p.x)),yr=range(primaryPts.map(p=>p.y)),y2r=y2i===null?null:range(secondaryPts.map(p=>p.y2));
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
   add('text',{x:L+pw/2,y:H-20,'text-anchor':'middle',fill:'#123b70','font-size':16,'font-weight':700},headerRow[xi]);
   const yl=add('text',{x:30,y:T+ph/2,'text-anchor':'middle',fill:'#287fbd','font-size':15,'font-weight':700},headerRow[yi]);yl.setAttribute('transform',`rotate(-90 30 ${T+ph/2})`);
   if(y2r){const yrLabel=add('text',{x:W-20,y:T+ph/2,'text-anchor':'middle',fill:'#dc8123','font-size':15,'font-weight':700},headerRow[y2i]);yrLabel.setAttribute('transform',`rotate(90 ${W-20} ${T+ph/2})`)}
   pointGuide=plotAdd('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#e28b24','stroke-width':1.5,'stroke-dasharray':'5 4',opacity:.9});
   pointMarker=plotAdd('circle',{cx:sx(primaryPts[0].x),cy:sy(primaryPts[0].y),r:7,fill:'#fff',stroke:'#287fbd','stroke-width':3});
   secondaryPointMarker=y2r?plotAdd('circle',{cx:sx(secondaryPts[0].x),cy:sy2(secondaryPts[0].y2),r:7,fill:'#fff',stroke:'#dc8123','stroke-width':3}):null;
   plottedPoints=pts.map(p=>({...p,sx:sx(p.x),sy:Number.isFinite(p.y)?sy(p.y):T+ph,sy2:Number.isFinite(p.y2)?sy2(p.y2):T+ph}));xiForReadout=xi;yiForReadout=yi;y2iForReadout=y2i;
   const pointNodes=[];pts.forEach((p,index)=>{const addHitTarget=y=>{const node=plotAdd('circle',{cx:sx(p.x),cy:y,r:11,fill:'transparent',stroke:'transparent'});node.style.cursor='crosshair';node.addEventListener('pointerenter',()=>selectGraphPoint(index));node.addEventListener('focus',()=>selectGraphPoint(index));node.setAttribute('tabindex','0');node.setAttribute('aria-label','X '+formatPointValue(p.x)+', primary Y '+formatPointValue(p.y)+', secondary Y '+formatPointValue(p.y2));pointNodes.push(node)};if(Number.isFinite(p.y))addHitTarget(sy(p.y));if(Number.isFinite(p.y2))addHitTarget(sy2(p.y2))});
   chartHost.replaceChildren(svg);pointExplorer.hidden=false;pointSlider.disabled=false;pointSlider.max=String(pts.length-1);pointSlider.value='0';updatePointSearchLabels();clearPointSearch();selectGraphPoint(0);
   graphStatus.textContent='Plotted '+primaryPts.length.toLocaleString()+' primary Y pairs'+(y2r?' and '+secondaryPts.length.toLocaleString()+' secondary Y pairs':'')+' · X: '+headerRow[xi]+' · Primary Y: '+headerRow[yi]+(y2i===null?'':' · Secondary Y: '+headerRow[y2i])+'. '+removedReturnPoints.toLocaleString()+' points below the previous highest X value removed. Only record-high or equal-high X values are retained in CSV row order. Both Y series share the same X axis and use independent left/right scales.';graphXIndex=String(xi);graphYIndex=String(yi);graphY2Index=y2i===null?'':String(y2i);saveState();
  });
    const step5=el('section','propulsion-report-card propulsion-step-card propulsion-step-card--purple');step5.id='propulsionReportGenerationCard';step5.hidden=true;
  const returnToDataFiltering=()=>{reportDirectVisible=false;step3FilterVisible=true;step3Visible=false;step4Visible=false;step5Visible=false;analysisPanel.hidden=false;step3Filter.hidden=false;step3.hidden=true;step4.hidden=true;step5.hidden=true;saveState();step3Filter.scrollIntoView({behavior:'smooth',block:'start'});};
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
  const objectiveWrap=el('label','propulsion-report-field propulsion-report-field--wide');objectiveWrap.append(el('span','','Objective of the Test'));const objectiveInput=document.createElement('textarea');objectiveInput.id='report_objective';objectiveInput.rows=3;objectiveInput.placeholder='Describe the objective of this propulsion test';objectiveInput.addEventListener('input',updateReportPreview);objectiveWrap.append(objectiveInput);reportForm.append(objectiveWrap);reportFields.objective=objectiveInput;
  const reportGraphControls=el('div','propulsion-report-graph-controls');reportGraphControls.append(el('h3','','Graphical Report Selection'));
  const reportGraphSelect=(label,source)=>{const wrap=el('label','propulsion-report-field');wrap.append(el('span','',label));const select=document.createElement('select');select.className='propulsion-column-select';const blank=document.createElement('option');blank.value='';blank.textContent='Select CSV column';select.append(blank);headerRow.forEach((name,index)=>{const op=document.createElement('option');op.value=String(index);op.textContent=name;select.append(op)});wrap.append(select);reportGraphControls.append(wrap);return select;};
  const reportX=reportGraphSelect('Choose X Axis',xSelect),reportY=reportGraphSelect('Choose Primary Y Axis',ySelect),reportY2=reportGraphSelect('Choose Secondary Y Axis (Optional)',y2Select);
  // Keep the report selectors and the main graph controls in sync. Programmatic value
  // assignment alone does not fire change events, so explicitly refresh plot readiness.
  const syncReportGraphAxes=()=>{xSelect.value=reportX.value;ySelect.value=reportY.value;y2Select.value=reportY2.value;savedGraphSelection();updatePlotAvailability();graphStatus.textContent=reportX.value!==''&&reportY.value!==''?'Graph axes selected. Add Graph to Report to generate and capture this plot.':'Choose an X axis and at least one Y axis parameter to enable graph generation.';};
  [reportX,reportY,reportY2].forEach(select=>select.addEventListener('change',syncReportGraphAxes));
  const addReportGraph=el('button','btn alt','Add Graph to Report');addReportGraph.type='button';const reportGraphCount=el('span','propulsion-report-graph-count','0 of 5 graphs added');const reportGraphList=el('div','propulsion-report-graph-list');let reportGraphs=[];
  addReportGraph.addEventListener('click',()=>{if(reportGraphs.length>=5){reportGraphCount.textContent='Maximum of 5 graphs reached';return}if(reportX.value===''||reportY.value===''){reportGraphCount.textContent='Select X and Primary Y axes first';return}syncReportGraphAxes();if(plotButton.disabled){reportGraphCount.textContent='Select valid X and Primary Y axes first';return}plotButton.click();const svg=chartHost.querySelector('svg');if(!svg){reportGraphCount.textContent=graphStatus.textContent||'Unable to generate graph. Check the selected columns and available numeric data.';return}const card=el('div','propulsion-report-graph-item');const heading=el('strong','',headerRow[Number(reportY.value)]+' vs '+headerRow[Number(reportX.value)]+(reportY2.value===''?'':' · '+headerRow[Number(reportY2.value)]));const remove=el('button','btn alt','Remove');remove.type='button';remove.addEventListener('click',()=>{reportGraphs=reportGraphs.filter(item=>item.card!==card);card.remove();refreshReportGraphCount();updateReportPreview()});const cloned=svg.cloneNode(true);cloned.classList.add('propulsion-report-graph-svg');card.append(heading,remove,cloned);reportGraphList.append(card);reportGraphs.push({card,svg:cloned,title:heading.textContent});refreshReportGraphCount();updateReportPreview();});
  const refreshReportGraphCount=()=>{reportGraphCount.textContent=reportGraphs.length+' of 5 graphs added';addReportGraph.disabled=reportGraphs.length>=5;};
  reportGraphControls.append(addReportGraph,reportGraphCount,reportGraphList);
  const reportPreviewPanel=el('div','propulsion-report-preview-panel');reportPreviewPanel.append(el('h3','','Live A4 PDF Preview'));
  const reportPreview=el('div','propulsion-report-preview-pages');reportPreview.id='propulsionReportLivePreview';
  const exportActions=el('div','propulsion-actions');const exportPdf=el('button','btn','Export Report as PDF');exportPdf.type='button';exportPdf.addEventListener('click',()=>{const required=['motorName','escName','propellerName','testDate'];const missing=required.filter(key=>!reportFields[key].value.trim());if(missing.length){reportForm.querySelector('#report_'+missing[0]).focus();reportPreviewPanel.querySelector('.propulsion-report-validation').textContent='Complete all mandatory fields before exporting.';return}
   // Print an isolated copy of the exact live A4 preview. The main app stylesheet
   // contains unrelated landscape @page rules for other modules, which can override
   // this report's portrait layout in the browser print pipeline.
   const printWindow=window.open('','_blank');if(!printWindow){reportPreviewPanel.querySelector('.propulsion-report-validation').textContent='Allow pop-ups for this site to export the report PDF.';return}
   const printMarkup=reportPreview.cloneNode(true);printMarkup.id='propulsionReportLivePreview';
   const printDoc='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Propulsion Validation Report</title><link rel="stylesheet" href="./css/propulsion-analyser.css?v=24"><style>html,body{margin:0!important;padding:0!important;width:210mm!important;background:#fff!important}body{display:block!important}#propulsionReportLivePreview{display:block!important;width:210mm!important;max-height:none!important;overflow:visible!important;padding:0!important;margin:0!important;background:#fff!important}#propulsionReportLivePreview .propulsion-report-page{box-sizing:border-box!important;width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:12mm 13mm!important;overflow:hidden!important;box-shadow:none!important}#propulsionReportLivePreview .propulsion-report-preview-graph svg{display:block!important;width:100%!important;height:auto!important;max-height:102mm!important}@media print{@page{size:A4 portrait;margin:0}html,body{width:210mm!important;margin:0!important;padding:0!important}#propulsionReportLivePreview .propulsion-report-page{break-after:page!important;page-break-after:always!important;print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important}#propulsionReportLivePreview .propulsion-report-page:last-child{break-after:auto!important;page-break-after:auto!important}}</style></head><body>'+printMarkup.outerHTML+'</body></html>';
   printWindow.document.open();printWindow.document.write(printDoc);printWindow.document.close();
   const triggerPrint=()=>{printWindow.focus();printWindow.print()};const printStyle=printWindow.document.querySelector('link[rel="stylesheet"]');if(printStyle){if(printStyle.sheet)triggerPrint();else{printStyle.addEventListener('load',triggerPrint,{once:true});printStyle.addEventListener('error',()=>{reportPreviewPanel.querySelector('.propulsion-report-validation').textContent='Unable to load report print styling. Please retry.'},{once:true})}}else triggerPrint();
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
   cover.append(coverTable);
   if(reportFields.objective.value.trim()){cover.append(el('h2','propulsion-report-section-heading','TEST OBJECTIVE'),el('p','propulsion-report-objective',reportFields.objective.value.trim()))}
   const coverMeta=el('div','propulsion-report-cover-meta');coverMeta.append(el('span','','VALIDATED DATASET · '+analysisRows.length.toLocaleString()+' records'));cover.append(coverMeta);
const statsPage=el('section','propulsion-report-summary-page');
   statsPage.append(el('div','propulsion-report-page-kicker','01  /  TEST RESULTS'),el('h2','','EXECUTIVE PERFORMANCE SUMMARY'));
   const units={thrust:'N',torque:'Nm',commandRpm:'RPM',actualRpm:'RPM',voltage:'V',current:'A',motorTemperature:'°C',escTemperature:'°C'};
   const getNum=(row,key)=>{const idx=mapping[key]?.selected;if(idx===undefined||idx==='')return NaN;const raw=String(row[idx]??'').trim();return raw===''?NaN:Number(raw)};
   const fmt=(v,d=2)=>Number.isFinite(v)?new Intl.NumberFormat(undefined,{maximumFractionDigits:d}).format(v):'—';
   const peak=(key)=>{let value=-Infinity,at=-1;analysisRows.forEach((row,i)=>{const v=getNum(row,key);if(Number.isFinite(v)&&v>value){value=v;at=i}});return {value,at}};
   const pThrust=peak('thrust'),pTorque=peak('torque'),pRpm=peak('actualRpm'),pVolt=peak('voltage'),pCurrent=peak('current'),pMotor=peak('motorTemperature'),pEsc=peak('escTemperature');
   let peakInputPower=0,peakThrustPerKw=0,sumAbsRpmError=0,rpmErrorCount=0,maxRpmError=0;
   analysisRows.forEach(row=>{const v=getNum(row,'voltage'),a=getNum(row,'current'),t=getNum(row,'thrust'),cmd=getNum(row,'commandRpm'),rpm=getNum(row,'actualRpm');if(Number.isFinite(v)&&Number.isFinite(a)){const kw=v*a/1000;if(kw>peakInputPower)peakInputPower=kw;if(Number.isFinite(t)&&kw>0)peakThrustPerKw=Math.max(peakThrustPerKw,t/kw)}if(Number.isFinite(cmd)&&cmd!==0&&Number.isFinite(rpm)){const e=Math.abs((rpm-cmd)/cmd)*100;sumAbsRpmError+=e;rpmErrorCount++;maxRpmError=Math.max(maxRpmError,e)}});
   const kpiGrid=el('div','propulsion-report-kpi-grid propulsion-report-all-parameters');
   specs.forEach(spec=>{const m=peak(spec.key);const card=el('div','propulsion-report-kpi');card.append(el('span','',('MAXIMUM '+spec.label).toUpperCase()),el('strong','',m.at>=0?fmt(m.value)+' '+units[spec.key]:'—'));kpiGrid.append(card)});
   statsPage.append(kpiGrid);
   statsPage.append(el('p','propulsion-report-small-note','Dataset: '+analysisRows.length.toLocaleString()+' rows included; records with Actual RPM = 0 excluded. Values shown are maximum recorded values for each mapped parameter.'));
   cover.append(statsPage);
   cover.append(el('p','propulsion-report-footer','YETI FLIGHT TRIAL  /  PROPULSION VALIDATION  /  ENGINEERING MANAGEMENT REVIEW'));
   reportPreview.append(cover);

   if(reportGraphs.length){for(let offset=0,pageNo=1;offset<reportGraphs.length;offset+=2,pageNo++){const graphPage=el('article','propulsion-report-page propulsion-report-graph-page');graphPage.append(el('div','propulsion-report-page-kicker','02  /  GRAPHICAL ANALYSIS'),el('h2','','PROPULSION PERFORMANCE PLOTS'));reportGraphs.slice(offset,offset+2).forEach((item,index)=>{const wrap=el('div','propulsion-report-preview-graph');wrap.append(el('h3','',String(offset+index+1).padStart(2,'0')+'  '+item.title),item.svg.cloneNode(true));graphPage.append(wrap)});reportPreview.append(graphPage)}}
   const valid=['motorName','escName','propellerName','testDate'].every(key=>reportFields[key].value.trim());validation.textContent=valid?'Mandatory identification fields complete. PDF export is ready.':'Complete Motor Name, ESC Name, Propeller Name and Test Date before exporting.';
  }
  updateReportPreview();
  const reportProceedActions=el('div','propulsion-actions');const reportProceed=el('button','btn','Proceed to Generate Report');reportProceed.type='button';reportProceed.id='proceedToGenerateReportBtn';reportProceed.addEventListener('click',()=>{reportDirectVisible=false;step5Visible=true;step5.hidden=false;reportProceed.disabled=true;reportProceed.textContent='Report Section Opened';saveState();step5.scrollIntoView({behavior:'smooth',block:'start'});});step4.append(reportProceedActions);reportProceedActions.append(reportProceed);
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
   next.hidden=false;next.replaceChildren(el('strong','', 'Parameter mapping confirmed'));
   // Keep the confirmation panel concise; dataset filtering details remain internal.
   const mappingList=el('ul','propulsion-confirmed-mapping');specs.forEach(s=>mappingList.append(el('li','',s.label+' → '+headerRow[mapping[s.key].selected])));next.append(mappingList);proceed.hidden=false;directReportProceed.hidden=false;step3Filter.append(filterActions);step3.hidden=true;step3Filter.hidden=false;step3FilterVisible=true;saveState();
   saveState();
  });
  directReportProceed.addEventListener('click',()=>{if(!confirmed)return;reportDirectVisible=true;step3Visible=false;step4Visible=false;step5Visible=true;analysisPanel.hidden=true;step3.hidden=true;step3Filter.hidden=true;step4.hidden=true;step5.hidden=false;saveState();step5.scrollIntoView({behavior:'smooth',block:'start'});});
  proceed.addEventListener('click',()=>{if(!confirmed)return;showParameterSummary();});
  const showParameterSummary=()=>{
   if(!confirmed)return;
   step3FilterVisible=false;reportDirectVisible=false;step3Visible=true;step4Visible=false;step5Visible=false;analysisPanel.hidden=false;step3Filter.hidden=false;step3.hidden=false;step4.hidden=true;step5.hidden=true;step3.replaceChildren();
   step3.append(el('span','propulsion-step-label','STEP 04 · PARAMETER SUMMARY'));
   step3.append(el('h3','','Mapped Parameter Statistics'));
   step3.append(el('p','propulsion-statistics-description','Maximum values and timestamps use rows with non-zero Actual RPM. '+analysisRows.length.toLocaleString()+' of '+dataRows.length.toLocaleString()+' CSV data rows included after the Actual RPM = 0 exclusion.'));
   const tableWrap=el('div','propulsion-statistics-table-wrap');
   const table=document.createElement('table');table.className='propulsion-statistics-table';
   const thead=document.createElement('thead'),headRow=document.createElement('tr');
   ['Parameter','Mapped CSV Column','Maximum','Timestamp'].forEach(label=>headRow.append(el('th','',label)));
   thead.append(headRow);table.append(thead);
   const tbody=document.createElement('tbody');
   const units={thrust:'N',torque:'Nm',commandRpm:'RPM',actualRpm:'RPM',voltage:'V',current:'A',motorTemperature:'°C',escTemperature:'°C'};
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
   const timestampIndex=headerRow.map((name,index)=>({index,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
   const fmt=value=>new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(value);
   specs.forEach(s=>{
    const idx=mapping[s.key].selected;
    let max=-Infinity,maxRow=-1;
    analysisRows.forEach((row,rowIndex)=>{
     const raw=String(row[idx]??'').trim();
     if(raw==='')return;
     const value=Number(raw);
     if(Number.isFinite(value)&&value>max){max=value;maxRow=rowIndex}
    });
    const tr=document.createElement('tr');
    tr.append(el('th','propulsion-stat-parameter',s.label+' ('+units[s.key]+')'));
    tr.append(el('td','propulsion-stat-column',headerRow[idx]));
    if(maxRow>=0){
     tr.append(el('td','',fmt(max)+' '+units[s.key]));
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
  const selections=specs.map(s=>mapping[s.key]?.selected??'');
  const complete=selections.every(v=>v!=='');const unique=new Set(selections.map(String)).size===selections.length;
  const confirm=$id('confirmPropulsionMappingBtn'),summary=$id('propulsionMappingSummary');
  const checks=specs.map(s=>{const idx=mapping[s.key]?.selected;if(idx===''||idx===undefined)return false;let checked=0,numeric=0;for(const row of dataRows.slice(0,100)){const v=String(row[idx]??'').trim();if(v){checked++;if(Number.isFinite(Number(v)))numeric++}}return checked>0&&numeric/checked>=0.8});
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
  workspace.querySelector('.propulsion-statistics-card')?.remove();workspace.querySelector('.propulsion-graphical-card')?.remove();
  selectedFile=null;mapping={};calculatedParameterKeys=[];headerRow=[];dataRows=[];analysisRows=[];confirmed=false;step3Visible=false;step4Visible=false;step5Visible=false;reportDirectVisible=false;parseCSVText='';if(csvPreviewPanel){csvPreviewPanel.remove();csvPreviewPanel=null;}workspace.querySelector('.propulsion-csv-preview-toggle-actions')?.remove();workspace.querySelector('.propulsion-csv-preview-actions')?.remove();
  meta.hidden=true;meta.textContent='';reset.hidden=true;start.disabled=true;start.textContent='Identify Parameters';
 }
 input.addEventListener('change',()=>{
  resetAnalysis();
  const file=input.files&&input.files[0];
  if(!file){setUploadState(false,'No file selected');return}
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
 start.textContent='Identify Parameters';start.disabled=true;
 loadState();
})();