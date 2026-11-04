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
 let selectedFile=null,headerRow=[],dataRows=[],mapping={},confirmed=false,step3Visible=false,step4Visible=false,analysisPanel=null;
 const DB_NAME='yeti-flight-trial-state',DB_STORE='propulsion-analyser',DB_KEY='active-session';
 function openStateDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE)};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
 let graphXIndex='',graphYIndex='';
 async function saveState(){try{const db=await openStateDB();await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put({csvText:parseCSVText,fileName:selectedFile?.name||'Restored CSV log.csv',stage:step4Visible?'graphical':step3Visible?'summary':confirmed?'confirmed':analysisPanel?'identified':selectedFile?'uploaded':'empty',mapping:Object.fromEntries(specs.map(s=>[s.key,mapping[s.key]?.selected??''])),graphXIndex,graphYIndex},DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close()}catch(error){console.warn('Could not save propulsion session locally:',error)}}
 async function loadState(){try{const db=await openStateDB();const saved=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(DB_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});db.close();if(!saved?.csvText)return;parseCSVText=saved.csvText;selectedFile={name:saved.fileName||'Restored CSV log.csv',size:new Blob([parseCSVText]).size,text:async()=>parseCSVText};if(filePicker)filePicker.hidden=true;meta.hidden=false;meta.textContent=selectedFile.name+' · '+(selectedFile.size/1024).toFixed(1)+' KB · Restored locally';reset.hidden=false;setUploadState(true,'Previous CSV session restored from this browser');const rows=parseCSV(parseCSVText,chooseDelimiter(parseCSVText));detect(rows);if(saved.mapping){specs.forEach(spec=>{const value=saved.mapping[spec.key];if(value!==''&&value!==undefined)mapping[spec.key].selected=Number(value)});analysisPanel.querySelectorAll('.propulsion-column-select').forEach(select=>{select.value=mapping[select.dataset.key].selected===''?'':String(mapping[select.dataset.key].selected)});validateMapping()}if((saved.stage==='confirmed'||saved.stage==='summary')&&validateMapping())$id('confirmPropulsionMappingBtn').click();if((saved.stage==='summary'||saved.stage==='graphical')&&confirmed)$id('proceedToParameterSummaryBtn')?.click();if(saved.stage==='graphical'&&step3Visible){$id('proceedToGraphicalAnalysisBtn')?.click();if(saved.graphXIndex!==undefined){graphXIndex=String(saved.graphXIndex);graphYIndex=String(saved.graphYIndex??'');const xs=$id('propulsionXAxisSelect'),ys=$id('propulsionYAxisSelect');if(xs)xs.value=graphXIndex;if(ys)ys.value=graphYIndex;if($id('plotPropulsionGraphBtn')&&graphXIndex!==''&&graphYIndex!=='')$id('plotPropulsionGraphBtn').click();}}start.textContent='Parameters Identified';start.disabled=true}catch(error){console.warn('Could not restore propulsion session:',error)}}
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
  confirmed=false;step3Visible=false;step4Visible=false;
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
  workspace.querySelector('.propulsion-statistics-card')?.remove();workspace.querySelector('.propulsion-graphical-card')?.remove();
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
  const xLabel=el('label','propulsion-graph-field','Choose X Axis Parameter');const xSelect=el('select','propulsion-column-select');xSelect.id='propulsionXAxisSelect';xLabel.append(xSelect);
  const yLabel=el('label','propulsion-graph-field','Choose Y Axis Parameter');const ySelect=el('select','propulsion-column-select');ySelect.id='propulsionYAxisSelect';yLabel.append(ySelect);
  headerRow.forEach((name,index)=>{const ox=document.createElement('option');ox.value=String(index);ox.textContent=name;xSelect.append(ox);const oy=document.createElement('option');oy.value=String(index);oy.textContent=name;ySelect.append(oy)});
  const numericColumns=headerRow.map((_,index)=>({index,count:dataRows.filter(row=>{const v=String(row[index]??'').trim();return v!==''&&Number.isFinite(Number(v))}).length})).filter(item=>item.count>0);
  if(numericColumns.length>0){xSelect.value=String(numericColumns[0].index);graphXIndex=xSelect.value}
  if(numericColumns.length>1){ySelect.value=String(numericColumns[1].index);graphYIndex=ySelect.value}
  xSelect.addEventListener('change',()=>{graphXIndex=xSelect.value;saveState()});ySelect.addEventListener('change',()=>{graphYIndex=ySelect.value;saveState()});
  graphControls.append(xLabel,yLabel);step4.append(graphControls);
  const plotActions=el('div','propulsion-actions');const plotButton=el('button','btn','Plot Graph');plotButton.type='button';plotButton.id='plotPropulsionGraphBtn';plotButton.disabled=numericColumns.length<2;plotActions.append(plotButton);step4.append(plotActions);
  const graphStatus=el('p','propulsion-graph-status','Choose X and Y axis parameters, then select Plot Graph.');graphStatus.id='propulsionGraphStatus';step4.append(graphStatus);
  const chartHost=el('div','propulsion-chart-host');chartHost.id='propulsionChartHost';step4.append(chartHost);
  const pointExplorer=el('div','propulsion-point-explorer');pointExplorer.hidden=true;
  const pointReadout=el('div','propulsion-point-readout');
  const xValueCard=el('div','propulsion-point-value');const xValueLabel=el('span','propulsion-point-value-label','X AXIS');const xValue=el('strong','propulsion-point-value-number','—');xValueCard.append(xValueLabel,xValue);
  const yValueCard=el('div','propulsion-point-value');const yValueLabel=el('span','propulsion-point-value-label','Y AXIS');const yValue=el('strong','propulsion-point-value-number','—');yValueCard.append(yValueLabel,yValue);
  pointReadout.append(xValueCard,yValueCard);pointReadout.setAttribute('aria-live','polite');
  const pointSliderLabel=el('label','propulsion-point-slider-label','Explore data point');
  const pointSlider=document.createElement('input');pointSlider.type='range';pointSlider.min='0';pointSlider.max='0';pointSlider.value='0';pointSlider.step='1';pointSlider.id='propulsionPointSlider';pointSlider.disabled=true;pointSlider.setAttribute('aria-label','Select data point on graph');pointSliderLabel.append(pointSlider);
  const pointCounter=el('span','propulsion-point-counter','Point 0 of 0');pointCounter.id='propulsionPointCounter';
  pointExplorer.append(pointReadout,pointSliderLabel,pointCounter);step4.append(pointExplorer);
  let plottedPoints=[],pointMarker=null,pointGuide=null;
  const formatPointValue=value=>new Intl.NumberFormat(undefined,{maximumFractionDigits:6}).format(value);
  const selectGraphPoint=index=>{
   if(!plottedPoints.length||!pointMarker||!pointGuide)return;
   const safeIndex=Math.max(0,Math.min(plottedPoints.length-1,Number(index)||0)),point=plottedPoints[safeIndex];
   pointSlider.value=String(safeIndex);pointCounter.textContent='Point '+(safeIndex+1).toLocaleString()+' of '+plottedPoints.length.toLocaleString();
   xValueLabel.textContent='X · '+headerRow[xiForReadout];xValue.textContent=formatPointValue(point.x);
   yValueLabel.textContent='Y · '+headerRow[yiForReadout];yValue.textContent=formatPointValue(point.y);
   pointReadout.setAttribute('aria-label',headerRow[xiForReadout]+' '+formatPointValue(point.x)+', '+headerRow[yiForReadout]+' '+formatPointValue(point.y));
   pointMarker.setAttribute('cx',point.sx);pointMarker.setAttribute('cy',point.sy);pointGuide.setAttribute('x1',point.sx);pointGuide.setAttribute('x2',point.sx);
  };
  let xiForReadout=0,yiForReadout=0;
  const handlePointSlider=()=>selectGraphPoint(pointSlider.value);
  pointSlider.addEventListener('input',handlePointSlider);
  pointSlider.addEventListener('change',handlePointSlider);
  pointSlider.addEventListener('keyup',handlePointSlider);
  plotButton.addEventListener('click',()=>{
   const xi=Number(xSelect.value),yi=Number(ySelect.value);if(xSelect.value===''||ySelect.value===''||!Number.isInteger(xi)||!Number.isInteger(yi)){graphStatus.textContent='Select both X and Y axis parameters.';return}
   const pts=dataRows.map((row,index)=>({x:Number(String(row[xi]??'').trim()),y:Number(String(row[yi]??'').trim()),index})).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
   if(pts.length<2){chartHost.replaceChildren();graphStatus.textContent='Not enough numeric row pairs to plot this graph.';return}
   const W=960,H=500,L=92,R=28,T=28,B=86,pw=W-L-R,ph=H-T-B;
   let xmin=Math.min(...pts.map(p=>p.x)),xmax=Math.max(...pts.map(p=>p.x)),ymin=Math.min(...pts.map(p=>p.y)),ymax=Math.max(...pts.map(p=>p.y));
   if(xmin===xmax){xmin-=1;xmax+=1}if(ymin===ymax){ymin-=1;ymax+=1}
   const sx=v=>L+(v-xmin)/(xmax-xmin)*pw,sy=v=>T+ph-(v-ymin)/(ymax-ymin)*ph;
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',headerRow[xi]+' versus '+headerRow[yi]);svg.classList.add('propulsion-chart-svg');
   const add=(tag,attrs,textValue)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs||{}).forEach(([k,v])=>n.setAttribute(k,String(v)));if(textValue!==undefined)n.textContent=textValue;svg.append(n);return n};
   for(let i=0;i<=5;i++){const xv=xmin+(xmax-xmin)*i/5,yv=ymin+(ymax-ymin)*i/5,x=L+pw*i/5,y=T+ph-ph*i/5;add('line',{x1:x,y1:T,x2:x,y2:T+ph,stroke:'#e3eaf1','stroke-width':1});add('line',{x1:L,y1:y,x2:L+pw,y2:y,stroke:'#e3eaf1','stroke-width':1});add('text',{x,y:T+ph+24,'text-anchor':'middle',fill:'#64748b','font-size':12},new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(xv));add('text',{x:L-12,y:y+4,'text-anchor':'end',fill:'#64748b','font-size':12},new Intl.NumberFormat(undefined,{maximumFractionDigits:3}).format(yv))}
   add('line',{x1:L,y1:T+ph,x2:L+pw,y2:T+ph,stroke:'#52677d','stroke-width':2});add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#52677d','stroke-width':2});
   const d=pts.map((p,i)=>(i?'L':'M')+sx(p.x).toFixed(2)+','+sy(p.y).toFixed(2)).join(' ');add('path',{d,fill:'none',stroke:'#287fbd','stroke-width':2.5,'stroke-linejoin':'round','stroke-linecap':'round'});
   const pointNodes=pts.map(p=>{add('circle',{cx:sx(p.x),cy:sy(p.y),r:3.2,fill:'#1769aa',opacity:.82});return add('circle',{cx:sx(p.x),cy:sy(p.y),r:10,fill:'transparent',stroke:'transparent'})});
   add('text',{x:L+pw/2,y:H-20,'text-anchor':'middle',fill:'#123b70','font-size':16,'font-weight':700},headerRow[xi]);const yl=add('text',{x:24,y:T+ph/2,'text-anchor':'middle',fill:'#123b70','font-size':16,'font-weight':700},headerRow[yi]);yl.setAttribute('transform',`rotate(-90 24 ${T+ph/2})`);
   pointGuide=add('line',{x1:L,y1:T,x2:L,y2:T+ph,stroke:'#e28b24','stroke-width':1.5,'stroke-dasharray':'5 4',opacity:.9});
   pointMarker=add('circle',{cx:sx(pts[0].x),cy:sy(pts[0].y),r:7,fill:'#fff',stroke:'#e07818','stroke-width':3});
   plottedPoints=pts.map(p=>({...p,sx:sx(p.x),sy:sy(p.y)}));xiForReadout=xi;yiForReadout=yi;
   pointNodes.forEach((node,index)=>{node.style.cursor='crosshair';node.addEventListener('pointerenter',()=>selectGraphPoint(index));node.addEventListener('focus',()=>selectGraphPoint(index));node.setAttribute('tabindex','0');node.setAttribute('aria-label','X '+formatPointValue(pts[index].x)+', Y '+formatPointValue(pts[index].y))});
   chartHost.replaceChildren(svg);pointExplorer.hidden=false;pointSlider.disabled=false;pointSlider.max=String(pts.length-1);pointSlider.value='0';selectGraphPoint(0);
   graphStatus.textContent='Plotted '+pts.length.toLocaleString()+' numeric data pairs · X: '+headerRow[xi]+' · Y: '+headerRow[yi]+'. Hover over a point or move the slider to inspect values.';graphXIndex=String(xi);graphYIndex=String(yi);saveState();
  });
  workspace.insertBefore(step4,workspace.querySelector('.propulsion-local-note'));
  confirm.addEventListener('click',()=>{
   if(!validateMapping())return;
   confirmed=true;confirm.disabled=true;confirm.textContent='Mapping Confirmed';
   next.hidden=false;next.replaceChildren(el('strong','', 'Parameter mapping confirmed'));
   next.append(el('p','', 'All six required signals are mapped to unique CSV columns. Statistical summary is calculated from all numeric samples in the selected columns.'));
   const mappingList=el('ul','propulsion-confirmed-mapping');specs.forEach(s=>mappingList.append(el('li','',s.label+' → '+headerRow[mapping[s.key].selected])));next.append(mappingList,proceed);proceed.hidden=false;
   saveState();
  });
  proceed.addEventListener('click',()=>{
   if(!confirmed)return;
   step3Visible=true;analysisPanel.hidden=false;step3.hidden=false;step3.replaceChildren();
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
  selectedFile=null;mapping={};headerRow=[];dataRows=[];confirmed=false;step3Visible=false;step4Visible=false;parseCSVText='';
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