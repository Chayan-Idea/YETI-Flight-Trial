/* CSV intake and staged progress UI. Actual CSV analysis will be implemented in the next step. */
(()=>{
 const input=$('propulsionCsvInput'),status=$('propulsionUploadStatus'),meta=$('propulsionFileMeta'),start=$('startPropulsionAnalysisBtn'),reset=$('resetPropulsionUploadBtn'),progressCard=$('propulsionProgressCard'),percent=$('propulsionProgressPercent'),track=$('propulsionProgressTrack'),fill=$('propulsionProgressFill'),message=$('propulsionProgressMessage');
 if(!input||!status||!start)return;
 let selectedFile=null,progressTimer=null;
 function setUploadState(ok,text){status.classList.toggle('is-complete',ok);status.querySelector('.propulsion-status-symbol').textContent=ok?'✓':'○';status.lastElementChild.textContent=text}
 function resetAnalysis(){if(progressTimer){clearInterval(progressTimer);progressTimer=null}progressCard.hidden=true;fill.style.width='0%';percent.textContent='0%';track.setAttribute('aria-valuenow','0');message.textContent='Ready to analyse the selected log.';message.classList.remove('is-complete');start.disabled=!selectedFile;start.textContent='Start Analysing'}
 input.addEventListener('change',()=>{
  resetAnalysis();selectedFile=null;meta.hidden=true;meta.textContent='';reset.hidden=true;
  const file=input.files&&input.files[0];
  if(!file){setUploadState(false,'No file selected');start.disabled=true;return}
  if(!/\.csv$/i.test(file.name)){input.value='';setUploadState(false,'Invalid file — please select a .csv file');start.disabled=true;return}
  if(file.size===0){input.value='';setUploadState(false,'The selected CSV file is empty');start.disabled=true;return}
  selectedFile=file;setUploadState(true,'Upload completed — CSV file ready');meta.hidden=false;meta.textContent=file.name+' · '+(file.size/1024).toFixed(1)+' KB';start.disabled=false;reset.hidden=false;
 });
 reset.addEventListener('click',()=>{input.value='';selectedFile=null;meta.hidden=true;meta.textContent='';reset.hidden=true;setUploadState(false,'No file selected');start.disabled=true;resetAnalysis()});
 start.addEventListener('click',()=>{
  if(!selectedFile||progressTimer)return;
  progressCard.hidden=false;start.disabled=true;reset.disabled=true;message.classList.remove('is-complete');message.textContent='Analysing log…';let value=0;
  progressTimer=setInterval(()=>{
   value=Math.min(100,value+2);fill.style.width=value+'%';percent.textContent=value+'%';track.setAttribute('aria-valuenow',String(value));
   if(value>=100){clearInterval(progressTimer);progressTimer=null;message.textContent='Log analysis completed';message.classList.add('is-complete');start.textContent='Analysis Completed';reset.disabled=false}
  },35);
 });
})();
