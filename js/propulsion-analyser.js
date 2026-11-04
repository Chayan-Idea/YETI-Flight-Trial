/* Propulsion Test Bench Log Analyzer — local CSV parameter identification */
(()=>{
 'use strict';
 const $id=id=>document.getElementById(id);
 const input=$id('propulsionCsvInput'),filePicker=input?.closest('.propulsion-file-picker'),status=$id('propulsionUploadStatus'),meta=$id('propulsionFileMeta'),start=$id('startPropulsionAnalysisBtn'),reset=$id('resetPropulsionUploadBtn'),workspace=document.querySelector('.propulsion-analyser-workspace');
 if(reset)reset.textContent='Choose another log file';
 if(!input||!status||!start||!workspace)return;
 const specs=[
  {key:'thrust',label:'Thrust',aliases:['net_thrust_n','net thrust n','thrust n','thrust newton','thrust']},
  {key:'torque',label:'Torque',aliases:['esc_torque_nm','torque_nm','torque nm','torque']},
  {key:'commandRpm',label:'Command RPM',aliases:['commanded_rpm','command_rpm','command rpm','commanded rpm','setpoint rpm','target rpm']},
  {key:'actualRpm',label:'Actual RPM',aliases:['actual_rpm','measured_rpm','motor_speed_rpm','actual rpm','motor rpm']},
  {key:'voltage',label:'DC Voltage',aliases:['dc_voltage_v','dc voltage','bus_voltage_v','battery_voltage_v','voltage_v']},
  {key:'current',label:'DC Current',aliases:['current_a','dc_current_a','dc current','battery_current_a','bus_current_a']}
 ];
 let selectedFile=null,headerRow=[],dataRows=[],mapping={},confirmed=false,analysisPanel=null;
 const DB_NAME='yeti-flight-trial-state',DB_STORE='propulsion-analyser',DB_KEY='active-session';
 function openStateDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 async function saveState(){try{const db=await openStateDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({csvText:parseCSVText,fileName:selectedFile?.name||'Restored CSV log.csv',stage:confirmed?'confirmed':analysisPanel?'identified':selectedFile?'uploaded':'empty',mapping:Object.fromEntries(specs.map(s=>[s.key,mapping[s.key]?.selected??'']))},DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch(error){console.warn('Could not save propulsion session locally:',error)}}
 async function loadState(){try{const db=await openStateDB();const saved=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(DB_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();if(!saved?.csvText)return;parseCSVText=saved.csvText;selectedFile={name:saved.fileName||'Restored CSV log.csv',size:new Blob([parseCSVText]).size,text:async()=>parseCSVText};if(filePicker)filePicker.hidden=true;meta.hidden=false;meta.textContent=selectedFile.name+' · '+(selectedFile.size/1024).toFixed(1)+' KB · Restored locally';reset.hidden=false;setUploadState(true,'Previous CSV session restored from this browser');const rows=parseCSV(parseCSVText,chooseDelimiter(parseCSVText));detect(rows);if(saved.mapping){specs.forEach(spec=>{const value=saved.mapping[spec.key];if(value!==''&&value!==undefined)mapping[spec.key].selected=Number(value)});analysisPanel.querySelectorAll('.propulsion-column-select').forEach(select=>{select.value=mapping[select.dataset.key].selected===''?'':String(mapping[select.dataset.key].selected)});validateMapping()}if(saved.stage==='confirmed'&&validateMapping())$id('confirmPropulsionMappingBtn').click();start.textContent='Parameters Identified';start.disabled=true}catch(error){console.warn('Could not restore propulsion session:',error)}}
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
  confirmed=false;
  const hi=findHeader(rows);if(hi<0)throw new Error('Could not locate a recognizable header row in the first 10 rows.');
  headerRow=rows[hi].map((v,i)=>String(v??'').trim()||('Column '+(i+1)));
  dataRows=rows.slice(hi+1).filter(r=>r.some(v=>String(v??'').trim()!==''));
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
  workspace.querySelector('.propulsion-statistics-card')?.remove();
  analysisPanel=el('section','propulsion-mapping-card');analysisPanel.setAttribute('aria-labelledby','propulsionMappingHeading');
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
  const actions=el('div','propulsion-actions');const confirm=el('button','btn','Confirm and Proceed');confirm.type='button';confirm.id='confirmPropulsionMappingBtn';confirm.disabled=true;actions.append(confirm);
  const rescan=el('button','btn alt','Re-identify columns');rescan.type='button';rescan.addEventListener('click',()=>{try{detect(parseCSV(parseCSVText,chooseDelimiter(parseCSVText)))}catch(e){showError(e.message)}});actions.append(rescan);analysisPanel.append(actions);
  const next=el('div','propulsion-next-step');next.id='propulsionNextStep';next.hidden=true;analysisPanel.append(next);
  workspace.insertBefore(analysisPanel,workspace.querySelector('.propulsion-local-note'));
  confirm.addEventListener('click',()=>{
   if(!validateMapping())return;
   confirmed=true;confirm.disabled=true;confirm.textContent='Mapping Confirmed';
   next.hidden=false;next.replaceChildren(el('strong','', 'Parameter mapping confirmed'));
   next.append(el('p','', 'All six required signals are mapped to unique CSV columns. Statistical summary is calculated from all numeric samples in the selected columns.'));
   const mappingList=el('ul','propulsion-confirmed-mapping');specs.forEach(s=>mappingList.append(el('li','',s.label+' → '+headerRow[mapping[s.key].selected])));next.append(mappingList);
   const step3=el('section','propulsion-statistics-card');step3.hidden=true;
   step3.append(el('span','propulsion-step-label','STEP 03 · PARAMETER SUMMARY'));
   step3.append(el('h3','','Mapped Parameter Statistics'));
   step3.append(el('p','propulsion-statistics-description','Maximum value and the corresponding timestamp across the complete CSV data set.'));
   const tableWrap=el('div','propulsion-statistics-table-wrap');
   const table=document.createElement('table');table.className='propulsion-statistics-table';
   const thead=document.createElement('thead'),headRow=document.createElement('tr');
   ['Parameter','Mapped CSV Column','Maximum','Timestamp'].forEach(label=>headRow.append(el('th','',label)));
   thead.append(headRow);table.append(thead);
   const tbody=document.createElement('tbody');
   const units={thrust:'N',torque:'Nm',commandRpm:'RPM',actualRpm:'RPM',voltage:'V',current:'A'};
   const timestampAliases=['timestamp','time_stamp','datetime','date_time','date time','time','utc_time','local_time','sample_time','logged_at','date'];
   const timestampIndex=headerRow.map((name,index)=>({index,score:scoreHeader(name,timestampAliases)})).filter(item=>item.score>=65).sort((a,b)=>b.score-a.score)[0]?.index;
   const fmt=value=>new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(value);
   specs.forEach(s=>{
    const idx=mapping[s.key].selected;
    let max=-Infinity,maxRow=-1;
    dataRows.forEach((row,rowIndex)=>{
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
     const timestamp=timestampIndex===undefined?'Timestamp column not found':String(dataRows[maxRow][timestampIndex]??'').trim()||'Timestamp unavailable';
     tr.append(el('td','propulsion-stat-timestamp',timestamp));
    }else{
     tr.append(el('td','propulsion-stat-empty','No numeric data'));
     tr.append(el('td','propulsion-stat-empty',timestampIndex===undefined?'Timestamp column not found':'Timestamp unavailable'));
    }
    tbody.append(tr);
   });
   table.append(tbody);tableWrap.append(table);step3.append(tableWrap);step3.hidden=false;workspace.insertBefore(step3,workspace.querySelector('.propulsion-local-note'));
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
  workspace.querySelector('.propulsion-statistics-card')?.remove();
  selectedFile=null;mapping={};headerRow=[];dataRows=[];confirmed=false;parseCSVText='';
  meta.hidden=true;meta.textContent='';reset.hidden=true;start.disabled=true;start.textContent='Identify Parameters';
 }
 input.addEventListener('change',()=>{
  resetAnalysis();
  const file=input.files&&input.files[0];
  if(!file){setUploadState(false,'No file selected');return}
  if(!/\.csv$/i.test(file.name)){input.value='';setUploadState(false,'Invalid file — please select a .csv file');return}
  if(file.size===0){input.value='';setUploadState(false,'The selected CSV file is empty');return}
  selectedFile=file;if(filePicker)filePicker.hidden=true;setUploadState(true,'CSV selected — ready for parameter identification');
  meta.hidden=false;meta.textContent=file.name+' · '+(file.size/1024).toFixed(1)+' KB';reset.hidden=false;start.disabled=false;file.text().then(text=>{parseCSVText=text;saveState()}).catch(()=>{});
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