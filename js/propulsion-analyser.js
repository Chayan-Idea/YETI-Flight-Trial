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
  const filteredToggle=el('button','btn alt','Show Data Filtered CSV File');filteredToggle.type='button';filteredToggle.id='showFilteredCsvBtn';
  const previewActions=el('div','propulsion-actions propulsion-csv-preview-toggle-actions');
  previewActions.append(rawToggle,filteredToggle);
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
   filteredToggle.textContent=viewName==='filtered'?'Hide Data Filtered CSV File':'Show Data Filtered CSV File';
   rawToggle.setAttribute('aria-expanded',String(viewName==='raw'));
   filteredToggle.setAttribute('aria-expanded',String(viewName==='filtered'));
   requestAnimationFrame(setFreezeOffsets);
  };
  const hidePreview=()=>{csvPreviewPanel.hidden=true;identifyActions.hidden=true;activeView='';rawToggle.textContent='Show Uploaded Raw CSV File';filteredToggle.textContent='Show Data Filtered CSV File';rawToggle.setAttribute('aria-expanded','false');filteredToggle.setAttribute('aria-expanded','false')};
  rawToggle.addEventListener('click',()=>{if(activeView==='raw'&&!csvPreviewPanel.hidden)hidePreview();else renderRows(rows,'raw')});
  filteredToggle.addEventListener('click',()=>{if(activeView==='filtered'&&!csvPreviewPanel.hidden)hidePreview();else if(filteredRows)renderRows(filteredRows,'filtered');else{graphStatusSafeMessage();}});
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
 let selectedFile=null,headerRow=[],dataRows=[],analysisRows=[],mapping={},confirmed=false,step3Visible=false,step4Visible=false,step5Visible=false,analysisPanel=null;
 const DB_NAME='yeti-flight-trial-state',DB_STORE='propulsion-analyser',DB_KEY='active-session';
 function openStateDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 let graphXIndex='',graphYIndex='',graphY2Index='';
 async function saveState(){try{const db=await openStateDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({csvText:parseCSVText,fileName:selectedFile?.name||'Restored CSV log.csv',stage:step5Visible?'report':step4Visible?'graphical':step3Visible?'summary':confirmed?'confirmed':analysisPanel?'identified':selectedFile?'uploaded':'empty',mapping:Object.fromEntries(specs.map(s=>[s.key,mapping[s.key]?.selected??''])),graphXIndex,graphYIndex,graphY2Index},DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch(error){console.warn('Could not save propulsion session locally:',error)}}
 async function loadState(){try{const db=await openStateDB();const saved=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(DB_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();if(!saved?.csvText)return;parseCSVText=saved.csvText;selectedFile={name:saved.fileName||'Restored CSV log.csv',size:new Blob([parseCSVText]).size,text:async()=>parseCSVText};if(filePicker)filePicker.hidden=true;meta.hidden=false;meta.textContent=selectedFile.name+' · '+(selectedFile.size/1024).toFixed(1)+' KB · Restored locally';reset.hidden=false;setUploadState(true,'Previous CSV session restored from this browser');renderCsvPreview(parseCSVText);const rows=parseCSV(parseCSVText,chooseDelimiter(parseCSVText));detect(rows);if(saved.mapping){specs.forEach(spec=>{const value=saved.mapping[spec.key];if(value!==''&&value!==undefined)mapping[spec.key].selected=Number(value)});analysisPanel.querySelectorAll('.propulsion-column-select').forEach(select=>{select.value=mapping[select.dataset.key].selected===''?'':String(mapping[select.dataset.key].selected)});validateMapping()}if((saved.stage==='confirmed'||saved.stage==='summary')&&validateMapping())$id('confirmPropulsionMappingBtn').click();if((saved.stage==='summary'||saved.stage==='graphical')&&confirmed)$id('proceedToParameterSummaryBtn')?.click();if((saved.stage==='graphical'||saved.stage==='report')&&step3Visible){$id('proceedToGraphicalAnalysisBtn')?.click();if(saved.stage==='report')$id('proceedToGenerateReportBtn')?.click();if(saved.graphXIndex!==undefined){graphXIndex=String(saved.graphXIndex);graphYIndex=String(saved.graphYIndex??'');graphY2Index=String(saved.graphY2Index??'');const xs=$id('propulsionXAxisSelect'),ys=$id('propulsionYAxisSelect'),y2s=$id('propulsionSecondaryYAxisSelect');if(xs)xs.value=graphXIndex;if(ys)ys.value=graphYIndex;if(y2s)y2s.value=graphY2Index;if($id('plotPropulsionGraphBtn')&&graphXIndex!==''&&graphYIndex!=='')$id('plotPropulsionGraphBtn').click();}}start.textContent='Parameters Identified';start.disabled=true}catch(error){console.warn('Could not restore propulsion session:',error)}}
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
  mapping={};
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
  const proceed=el('button','btn','Proceed to Parameter Summary');proceed.type='button';proceed.id='proceedToParameterSummaryBtn';proceed.hidden=true;next.append(proceed);
  const step3=el('section','propulsion-statistics-card propulsion-step-card propulsion-step-card--green');step3.id='propulsionParameterSummaryCard';step3.hidden=true;
  workspace.insertBefore(analysisPanel,workspace.querySelector('.propulsion-local-note'));
  workspace.insertBefore(step3,workspace.querySelector('.propulsion-local-note'));
  const step4=el('section','propulsion-graphical-card propulsion-step-card propulsion-step-card--blue');step4.id='propulsionGraphicalAnalysisCard';step4.hidden=true;
  step4.append(el('span','propulsion-step-label','STEP 04 · GRAPHICAL ANALYSIS'));step4.append(el('h3','','Graphical Analysis'));
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
  pointExplorer.append(pointReadout,pointSliderLabel,pointCounter);step4.append(pointExplorer);
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
   for(let i=0;i<=5;i++){const xv=xr.min+(xr.max-xr.min)*i/5,yv=yr.min+(yr.max-yr.min)*i/5,x=L+pw*i/5,y=T+ph-ph*i/5;add('line',{x1:x,y1:T,x2:x,y2:T+ph,stroke:'#e3eaf1','stroke-width':1});add('line',{x1:L,y1:y,x2:L+pw,y2:y,stroke:'#e3eaf1','stroke-width':1});add('text',{x,y:T+ph+28,'text-anchor':'middle',fill:'#000000','font-size':16,'font-weight':800},fmt(xv));add('text',{x:L-16,y:y+6,'text-anchor':'end',fill:'#000000','font-size':16,'font-weight':800},fmt(yv));if(y2r){const yv2=y2r.min+(y2r.max-y2r.min)*i/5;add('text',{x:L+pw+16,y:y+6,'text-anchor':'start',fill:'#000000','font-size':16,'font-weight':800},fmt(yv2))}}
   add('line',{x1:L,y1:T+ph,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':3.5});add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#111827','stroke-width':3.5});if(y2r)add('line',{x1:L+pw,y1:T,x2:L+pw,y2:T+ph,stroke:'#111827','stroke-width':3.5});
   const drawSeries=(series,yFn,color)=>{const d=series.map((p,i)=>(i?'L':'M')+sx(p.x).toFixed(2)+','+yFn(p).toFixed(2)).join(' ');add('path',{d,fill:'none',stroke:color,'stroke-width':2.5,'stroke-linejoin':'round','stroke-linecap':'round'});series.forEach(p=>add('circle',{cx:sx(p.x),cy:yFn(p),r:3.2,fill:color,opacity:.85}))};
   drawSeries(primaryPts,p=>sy(p.y),'#287fbd');if(y2r)drawSeries(secondaryPts,p=>sy2(p.y2),'#dc8123');
   add('text',{x:L+pw/2,y:H-20,'text-anchor':'middle',fill:'#123b70','font-size':16,'font-weight':700},headerRow[xi]);
   const yl=add('text',{x:30,y:T+ph/2,'text-anchor':'middle',fill:'#287fbd','font-size':15,'font-weight':700},headerRow[yi]);yl.setAttribute('transform',`rotate(-90 30 ${T+ph/2})`);
   if(y2r){const yrLabel=add('text',{x:W-20,y:T+ph/2,'text-anchor':'middle',fill:'#dc8123','font-size':15,'font-weight':700},headerRow[y2i]);yrLabel.setAttribute('transform',`rotate(90 ${W-20} ${T+ph/2})`)}
   pointGuide=add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#e28b24','stroke-width':1.5,'stroke-dasharray':'5 4',opacity:.9});
   pointMarker=add('circle',{cx:sx(primaryPts[0].x),cy:sy(primaryPts[0].y),r:7,fill:'#fff',stroke:'#287fbd','stroke-width':3});
   secondaryPointMarker=y2r?add('circle',{cx:sx(secondaryPts[0].x),cy:sy2(secondaryPts[0].y2),r:7,fill:'#fff',stroke:'#dc8123','stroke-width':3}):null;
   plottedPoints=pts.map(p=>({...p,sx:sx(p.x),sy:Number.isFinite(p.y)?sy(p.y):T+ph,sy2:Number.isFinite(p.y2)?sy2(p.y2):T+ph}));xiForReadout=xi;yiForReadout=yi;y2iForReadout=y2i;
   const pointNodes=[];pts.forEach((p,index)=>{const addHitTarget=y=>{const node=add('circle',{cx:sx(p.x),cy:y,r:11,fill:'transparent',stroke:'transparent'});node.style.cursor='crosshair';node.addEventListener('pointerenter',()=>selectGraphPoint(index));node.addEventListener('focus',()=>selectGraphPoint(index));node.setAttribute('tabindex','0');node.setAttribute('aria-label','X '+formatPointValue(p.x)+', primary Y '+formatPointValue(p.y)+', secondary Y '+formatPointValue(p.y2));pointNodes.push(node)};if(Number.isFinite(p.y))addHitTarget(sy(p.y));if(Number.isFinite(p.y2))addHitTarget(sy2(p.y2))});
   chartHost.replaceChildren(svg);pointExplorer.hidden=false;pointSlider.disabled=false;pointSlider.max=String(pts.length-1);pointSlider.value='0';selectGraphPoint(0);
   graphStatus.textContent='Plotted '+primaryPts.length.toLocaleString()+' primary Y pairs'+(y2r?' and '+secondaryPts.length.toLocaleString()+' secondary Y pairs':'')+' · X: '+headerRow[xi]+' · Primary Y: '+headerRow[yi]+(y2i===null?'':' · Secondary Y: '+headerRow[y2i])+'. '+removedReturnPoints.toLocaleString()+' points below the previous highest X value removed. Only record-high or equal-high X values are retained in CSV row order. Both Y series share the same X axis and use independent left/right scales.';graphXIndex=String(xi);graphYIndex=String(yi);graphY2Index=y2i===null?'':String(y2i);saveState();
  });
    const step5=el('section','propulsion-report-card propulsion-step-card propulsion-step-card--purple');step5.id='propulsionReportGenerationCard';step5.hidden=true;
  step5.append(el('span','propulsion-step-label','STEP 05 · REPORT GENERATION'));
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
  const addReportGraph=el('button','btn alt','Add Graph to Report');addReportGraph.type='button';const reportGraphCount=el('span','propulsion-report-graph-count','0 of 5 graphs added');const reportGraphList=el('div','propulsion-report-graph-list');let reportGraphs=[];
  addReportGraph.addEventListener('click',()=>{if(reportGraphs.length>=5){reportGraphCount.textContent='Maximum of 5 graphs reached';return}if(reportX.value===''||reportY.value===''){reportGraphCount.textContent='Select X and Primary Y axes first';return}xSelect.value=reportX.value;ySelect.value=reportY.value;y2Select.value=reportY2.value;plotButton.click();const svg=chartHost.querySelector('svg');if(!svg||!plottedPoints.length){reportGraphCount.textContent='Unable to add graph. Check selected columns.';return}const card=el('div','propulsion-report-graph-item');const heading=el('strong','',headerRow[Number(reportY.value)]+' vs '+headerRow[Number(reportX.value)]+(reportY2.value===''?'':' · '+headerRow[Number(reportY2.value)]));const remove=el('button','btn alt','Remove');remove.type='button';remove.addEventListener('click',()=>{reportGraphs=reportGraphs.filter(item=>item.card!==card);card.remove();refreshReportGraphCount();updateReportPreview()});const cloned=svg.cloneNode(true);cloned.classList.add('propulsion-report-graph-svg');card.append(heading,remove,cloned);reportGraphList.append(card);reportGraphs.push({card,svg:cloned,title:heading.textContent});refreshReportGraphCount();updateReportPreview();});
  const refreshReportGraphCount=()=>{reportGraphCount.textContent=reportGraphs.length+' of 5 graphs added';addReportGraph.disabled=reportGraphs.length>=5;};
  reportGraphControls.append(addReportGraph,reportGraphCount,reportGraphList);
  const reportPreviewPanel=el('div','propulsion-report-preview-panel');reportPreviewPanel.append(el('h3','','Live A4 PDF Preview'));
  const reportPreview=el('div','propulsion-report-preview-pages');reportPreview.id='propulsionReportLivePreview';
  const exportActions=el('div','propulsion-actions');const exportPdf=el('button','btn','Export Report as PDF');exportPdf.type='button';exportPdf.addEventListener('click',()=>{const required=['motorName','escName','propellerName','testDate'];const missing=required.filter(key=>!reportFields[key].value.trim());if(missing.length){reportForm.querySelector('#report_'+missing[0]).focus();reportPreviewPanel.querySelector('.propulsion-report-validation').textContent='Complete all mandatory fields before exporting.';return}window.print()});const validation=el('p','propulsion-report-validation','Complete the mandatory fields to enable a valid report export.');exportActions.append(exportPdf);reportPreviewPanel.append(reportPreview,validation,exportActions);
  reportBuilder.append(reportForm,reportGraphControls,reportPreviewPanel);step5.append(reportBuilder);
  function updateReportPreview(){
   reportPreview.replaceChildren();
   const cover=el('article','propulsion-report-page propulsion-report-cover');cover.append(el('div','propulsion-report-brand','PROPULSION TEST REPORT'),el('h1','','PROPULSION VALIDATION REPORT'));
   const coverTable=document.createElement('table');coverTable.className='propulsion-report-detail-table';
   const details=[['Motor Name','motorName'],['ESC Name','escName'],['Propeller Name','propellerName'],['Test Date','testDate'],['Motor ID','motorId'],['ESC ID','escId'],['Propeller ID','propellerId']];
   details.forEach(([label,key])=>{const tr=document.createElement('tr');tr.append(el('th','',label),el('td','',reportFields[key].value.trim()||'—'));coverTable.append(tr)});
   cover.append(coverTable);if(reportFields.objective.value.trim()){cover.append(el('h2','','OBJECTIVE OF THE TEST'),el('p','propulsion-report-objective',reportFields.objective.value.trim()))}
   cover.append(el('p','propulsion-report-footer','Generated from YETI Flight Trial · Propulsion Test Bench Log Analyzer'));reportPreview.append(cover);
   const statsPage=el('article','propulsion-report-page');statsPage.append(el('h2','','PROPULSION PARAMETER STATISTICS'));
   const statsTable=document.createElement('table');statsTable.className='propulsion-report-stats-table';const header=document.createElement('tr');['Parameter','Mapped Column','Maximum','Timestamp'].forEach(v=>header.append(el('th','',v)));statsTable.append(header);
   const units={thrust:'N',torque:'Nm',commandRpm:'RPM',actualRpm:'RPM',voltage:'V',current:'A',motorTemperature:'°C',escTemperature:'°C'};
   const timeAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];const timeIndex=headerRow.map((name,index)=>({index,score:scoreHeader(name,timeAliases)})).filter(x=>x.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
   specs.forEach(spec=>{const idx=mapping[spec.key]?.selected;if(idx===undefined||idx==='')return;let max=-Infinity,maxRow=-1;analysisRows.forEach((row,i)=>{const raw=String(row[idx]??'').trim();if(raw==='')return;const v=Number(raw);if(Number.isFinite(v)&&v>max){max=v;maxRow=i}});const tr=document.createElement('tr');tr.append(el('td','',spec.label),el('td','',headerRow[idx]),el('td','',maxRow>=0?new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(max)+' '+units[spec.key]:'No numeric data'),el('td','',maxRow>=0&&timeIndex!==undefined?String(analysisRows[maxRow][timeIndex]??''):'—'));statsTable.append(tr)});
   statsPage.append(statsTable,el('p','propulsion-report-small-note','Statistics use the Section 3 analysis dataset after excluding rows where Actual RPM = 0. '+analysisRows.length.toLocaleString()+' rows included.'));reportPreview.append(statsPage);
   if(reportGraphs.length){const graphPage=el('article','propulsion-report-page');graphPage.append(el('h2','','GRAPHICAL ANALYSIS'));reportGraphs.forEach(item=>{const wrap=el('div','propulsion-report-preview-graph');wrap.append(el('h3','',item.title),item.svg.cloneNode(true));graphPage.append(wrap)});reportPreview.append(graphPage)}
   const valid=['motorName','escName','propellerName','testDate'].every(key=>reportFields[key].value.trim());validation.textContent=valid?'Mandatory identification fields complete. PDF export is ready.':'Complete Motor Name, ESC Name, Propeller Name and Test Date before exporting.';
  }
  updateReportPreview();
  const reportProceedActions=el('div','propulsion-actions');const reportProceed=el('button','btn','Proceed to Generate Report');reportProceed.type='button';reportProceed.id='proceedToGenerateReportBtn';reportProceed.addEventListener('click',()=>{step5Visible=true;step5.hidden=false;reportProceed.disabled=true;reportProceed.textContent='Report Section Opened';saveState();step5.scrollIntoView({behavior:'smooth',block:'start'});});step4.append(reportProceedActions);reportProceedActions.append(reportProceed);
  workspace.insertBefore(step4,workspace.querySelector('.propulsion-local-note'));
  workspace.insertBefore(step5,workspace.querySelector('.propulsion-local-note'));
  confirm.addEventListener('click',()=>{
   if(!validateMapping())return;
   // Exclude rows with an exactly zero Actual RPM from every analysis stage after mapping.
   const actualRpmColumn=mapping.actualRpm.selected;
   const isZeroActualRpm=row=>{const raw=String(row[actualRpmColumn]??'').trim();if(raw==='')return false;const value=Number(raw);return Number.isFinite(value)&&value===0};
   const zeroActualRpmRows=dataRows.filter(isZeroActualRpm).length;
   analysisRows=dataRows.filter(row=>!isZeroActualRpm(row));
   confirmed=true;confirm.disabled=true;confirm.textContent='Mapping Confirmed';
   next.hidden=false;next.replaceChildren(el('strong','', 'Parameter mapping confirmed'));
   next.append(el('p','', 'Analysis dataset: '+analysisRows.length.toLocaleString()+' of '+dataRows.length.toLocaleString()+' CSV data rows. '+zeroActualRpmRows.toLocaleString()+' rows with Actual RPM = 0 excluded from Section 03 onwards. Original CSV and preview remain unchanged. Graph points are additionally filtered using the selected X-axis running maximum.'));
   const mappingList=el('ul','propulsion-confirmed-mapping');specs.forEach(s=>mappingList.append(el('li','',s.label+' → '+headerRow[mapping[s.key].selected])));next.append(mappingList,proceed);proceed.hidden=false;
   saveState();
  });
  proceed.addEventListener('click',()=>{
   if(!confirmed)return;
   step3Visible=true;step5Visible=false;analysisPanel.hidden=false;step3.hidden=false;step3.replaceChildren();
   step3.append(el('span','propulsion-step-label','STEP 03 · PARAMETER SUMMARY'));
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
   start.disabled=true;saveState();
  });
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
  summary.textContent=!complete?'Select a CSV column for every required parameter.':!unique?'Each parameter must use a different CSV column.':!allData?'One or more selected columns do not contain predominantly numeric data in the sampled rows. Review the mapping.':'Six unique columns selected; sampled values are predominantly numeric. Ready for confirmation.';
  return complete&&unique&&allData;
 }
 function showError(message){
  if(analysisPanel)analysisPanel.remove();
  analysisPanel=el('section','propulsion-mapping-card');analysisPanel.append(el('h3','','Unable to identify CSV parameters'));analysisPanel.append(el('p','propulsion-mapping-summary is-warning',message));workspace.insertBefore(analysisPanel,workspace.querySelector('.propulsion-local-note'));
 }
 function resetAnalysis(){
  if(analysisPanel){analysisPanel.remove();analysisPanel=null}
  workspace.querySelector('.propulsion-statistics-card')?.remove();workspace.querySelector('.propulsion-graphical-card')?.remove();
  selectedFile=null;mapping={};headerRow=[];dataRows=[];analysisRows=[];confirmed=false;step3Visible=false;step4Visible=false;step5Visible=false;parseCSVText='';if(csvPreviewPanel){csvPreviewPanel.remove();csvPreviewPanel=null;}workspace.querySelector('.propulsion-csv-preview-toggle-actions')?.remove();workspace.querySelector('.propulsion-csv-preview-actions')?.remove();
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