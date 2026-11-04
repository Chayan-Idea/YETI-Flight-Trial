const LOADING_BASE=[
{title:"1. Pre-Loading Inspection",items:[
{id:"1.1",title:"Inspect ground handling equipment (GHE) for structural integrity and wheel functionality",expected:"GHE structure intact; wheels and locking mechanisms functional"},
{id:"1.2",title:"Ensure aircraft is properly secured on ground handling jack",expected:"Aircraft seated securely on jack; no movement observed"},
{id:"1.3",title:"Ensure batteries are secured and covered with foam",expected:"Batteries properly seated and restrained; no loose movement"},
{id:"1.4",title:"Verify tool trolley ID",expected:"Trolley ID matches transport manifest"},
{id:"1.5",title:"Inspect tool trolley external condition",expected:"No structural damage or loose components"},
{id:"1.6",title:"Ensure tool trolley drawers are closed and wheel brakes engaged",expected:"Drawers locked; wheel brakes engaged"}
]},
{title:"2. Loading Into Truck",items:[
{id:"2.1",title:"Assemble GHE with aircraft and lift aircraft approximately 10 mm off the ground",expected:"Aircraft lifted evenly and stable on GHE"},
{id:"2.2",title:"Ensure aircraft is loaded smoothly from empennage side without causing damage",expected:"Aircraft moved into truck smoothly with no structural contact or damage"},
{id:"2.3",title:"Ensure propellers are covered and LH/RH wings are secured and placed in truck",expected:"Propellers covered; wings properly strapped and secured"},
{id:"2.4",title:"Ensure batteries placed inside the truck and movement is locked",expected:"Battery trolley positioned correctly; wheel brakes engaged"},
{id:"2.5",title:"Ensure battery connectors are protected with caps or felt covers",expected:"All exposed battery connectors covered and protected"},
{id:"2.6",title:"Ensure tool trolleys are loaded safely and drawers remain locked",expected:"Tool trolleys stable; drawers secured and wheel brakes engaged"}
]},
{title:"3. In-Transit Security Confirmation",items:[
{id:"3.1",title:"Ensure load distribution inside vehicle is balanced",expected:"Aircraft, battery trolley, and tool trolleys evenly distributed"},
{id:"3.2",title:"Verify electrical isolation for aircraft and batteries",expected:"Aircraft power OFF; battery connectors isolated"},
{id:"3.3",title:"Confirm Transport door is locked",expected:"Truck door securely closed and locked"},
{id:"3.4",title:"Ensure driver is briefed regarding sensitive cargo",expected:"Driver acknowledges cargo handling instructions"}
]},
{title:"4. Unloading at Test Ground",items:[
{id:"4.1",title:"Ensure safe crane-assisted aircraft unloading and clear surrounding area.",expected:"Ramp stable; no obstruction around unloading path"},
{id:"4.2",title:"Connect tow bar to GHE and pull aircraft out using required personnel",expected:"Aircraft moved out smoothly with controlled handling"},
{id:"4.3",title:"Position aircraft at designated area and lock GHE wheels",expected:"Aircraft stable; GHE wheel locks engaged"},
{id:"4.4",title:"Remove battery from vehicle and engage wheel brakes",expected:"Battery trolley unloaded safely and brakes engaged"},
{id:"4.5",title:"Remove tool trolleys, verify trolley IDs, and ensure wheel brakes are engaged",expected:"Tool trolleys unloaded safely; IDs verified; brakes engaged"}
]}
];
const BASE=[
{title:"1. UAV Specification",items:[
{id:"1.1",title:"UAV Weight",criteria:[],valueFields:[{key:"totalWeight",label:"UAV Total weight",placeholder:"Enter UAV total weight"}]},
{id:"1.2",title:"UAV CG Point",criteria:[],valueFields:[{key:"cgX",label:"Along X / Longitudinal Axis",placeholder:"Enter X-axis CG"},{key:"cgY",label:"Along Y / Lateral Axis",placeholder:"Enter Y-axis CG"},{key:"cgZ",label:"Along Z / Vertical Axis",placeholder:"Enter Z-axis CG"}]}
]},
{title:"2. Safety & Crew",items:[
{id:"2.1",title:"Safety, V&V, Integration, Autopilot, FTI, and Propulsion teams are present.",criteria:[]},
{id:"2.2",title:"Team is briefed on flight trial emergency procedures.",criteria:[]}
]},
{title:"3. General Setup",items:[
{id:"3.1",title:"Setup Description",criteria:[],valueFields:[{key:"setupDescription",label:"Setup Description",placeholder:"Enter setup description"}]},
{id:"3.2",title:"UAV positioned at the center of the test area & test area is clear.",criteria:[]},
{id:"3.3",title:"Fire extinguisher, first-aid kit, and emergency tools available and accessible.",criteria:[]},
{id:"3.4",title:"DG placed at safe & appropriate distance considering noise and safety hazards; dedicated junction boxes installed at required locations.",criteria:[]}
]},
{title:"4. Airframe & Structure",items:[
{id:"4.1.1",title:"Cracks, dents and aesthetics",criteria:[]},
{id:"4.1.2",title:"Screws fitment and loose parts",criteria:[]},
{id:"4.1.3",title:"Antenna mounting, routing and",criteria:[]},
{id:"4.1.4",title:"FOD in the wing",criteria:[]},
{id:"4.2.1",title:"Cracks, dents and aesthetics",criteria:[]},
{id:"4.2.2",title:"Screws fitment and loose parts",criteria:[]},
{id:"4.2.3",title:"Antenna mounting, routing and",criteria:[]},
{id:"4.2.4",title:"FOD in the wing",criteria:[]},
{id:"4.3.1",title:"VTOL Motor fitment and tightness",criteria:[]},
{id:"4.3.2",title:"Propeller direction (CW ; CCW), fitment and tightness",criteria:[]},
{id:"4.3.3",title:"Cable ties on the VTOL arms are in place , no loose cable holders.",criteria:[]},
{id:"4.3.4",title:"The cooling line is not loose at the motor inlet, motor mount and not fouling with the motor.",criteria:[]},
{id:"4.3.5",title:"HV terminals and LV terminals are intact and properly insulated.",criteria:[]},
{id:"4.3.6",title:"Ensure no nicks, cuts or delamination to VTOL propellers",criteria:[]},
{id:"4.3.7",title:"No FOD in VTOL motors",criteria:[]},
{id:"4.4.1",title:"Cable ties on the FW arms are in place , no loose cable holders.",criteria:[]},
{id:"4.4.2",title:"HV terminals and LV terminals are intact and properly insulated.",criteria:[]},
{id:"4.4.3",title:"FW Motor fitment and tightness",criteria:[]},
{id:"4.4.4",title:"Propeller direction (CW ; CCW), fitment and tightness",criteria:[]},
{id:"4.4.6",title:"No FOD in FW motors",criteria:[]},
{id:"4.5.1",title:"No damages, dents, chipped edges and aesthetics on the tail surface and control surface hinge points",criteria:[]},
{id:"4.5.2",title:"Control surface horn fitment and movement is ok",criteria:[]},
{id:"4.5.3",title:"Screws fitment is proper and no loose parts",criteria:[]},
{id:"4.5.4",title:"No FOD in Tail Assembly",criteria:[]},
{id:"4.6.1",title:"No Cracks, dents, chipped edges, asthetics is ok. No loose cables and cable tie bases are not loose.",criteria:[]},
{id:"4.6.2",title:"LV battery fitment",criteria:[]},
{id:"4.6.3",title:"PDU fasteners are tightened.",criteria:[]},
{id:"4.6.4",title:"ESC fasteners are tightened.",criteria:[]},
{id:"4.6.5",title:"No FOD in the HV floor",criteria:[]},
{id:"4.7.1",title:"Battery locking Velcro is intact.",criteria:[]},
{id:"4.7.2",title:"No leakages from battery cooling system.",criteria:[]},
{id:"4.7.3",title:"No loose cables.",criteria:[]},
{id:"4.7.4",title:"Electrical connector is intact.",criteria:[]},
{id:"4.7.5",title:"No FOD in the battery structure.",criteria:[]},
{id:"4.8.1",title:"No loose cables.",criteria:[]},
{id:"4.8.2",title:"GNSS antena are intact and in the correct direction.",criteria:[]},
{id:"4.9.1",title:"No loose cooling pipes or its mounts & No leakage",criteria:[]},
{id:"4.9.2",title:"Ensure PWM duty cycle is not between 11 to 55%.",criteria:[]},
{id:"4.9.3",title:"Ensure reservoir is adequately filled with no leaks",criteria:[]},
{id:"4.9.4",title:"Ensure radiator is securely mounted and free from any visible damage",criteria:[]}
]},
{title:"5. Battery & PDU Check (Before Power On)",items:[
{id:"5.1",title:"LV Battery Voltage",criteria:["The Voltage should be between 12 V to 13.9 V."],valueFields:[{key:"lvVoltage",label:"LV Battery Voltage (V)",placeholder:"Enter measured voltage in V"}]},
{id:"5.2",title:"HV Battery Voltage",criteria:["Before installing on the aircraft, check all the batteries voltage should read zero voltage."],valueFields:[{key:"hvPreInstallVoltage",label:"HV Battery Voltage (V)",placeholder:"Enter measured voltage in V"}]}
]},
{title:"6. Battery & PDU Check (After Power On)",items:[
{id:"6.1",title:"HV Battery Status",criteria:["HV battery voltage > 560 ; The min cell voltage > 3.3"],valueFields:[{key:"hvVoltage",label:"HV Battery Voltage",placeholder:"Enter voltage"},{key:"minCellVoltage",label:"Minimum Cell Voltage",placeholder:"Enter minimum cell voltage"}]},
{id:"6.2",title:"PDU Status",criteria:["PDU SOC% > 85"],valueFields:[{key:"pduSoc",label:"PDU SOC",placeholder:"Enter SOC (%)"}]},
{id:"6.3",title:"PDU State = 9 (Pass)",criteria:[]},
{id:"6.4",title:"Beacon Functionality",criteria:["Ensure safety beacon is ON (Red Light)"]}
]},
{title:"7. Avionics & Software",items:[
{id:"7.1",title:"Flight controller powered ON; firmware version verified.",criteria:[]},
{id:"7.2",title:"FTI sensors are calibrated and reporting correctly",criteria:[]},
{id:"7.3",title:"GCS Status Check (Green Light)",criteria:[]},
{id:"7.4",title:"Communication link established with GCS.",criteria:[]}
]},
{title:"8. Data recording and transmission",items:[
{id:"8.1",title:"Camera Functionality",criteria:["Video recording is ok."]},
{id:"8.2",title:"Sound Meter Functionality",criteria:["Sound recording is ok"]},
{id:"8.3",title:"Communication Check",criteria:["Communication check completed with pilot and responsible team members."]}
]},
{title:"9. Other details",items:[{id:"9.0",title:"Checker + Reviewer",criteria:[]}]}
];
let sections=structuredClone(BASE),sourceKey='default-pdf-template',answers={},trialInfo={};
const $=x=>document.getElementById(x),answerKey=()=> 'yeti-answers:'+sourceKey;
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function stats(){let a=sections.flatMap(s=>s.items),d=a.filter(i=>answers[i.id]?.status),p=a.filter(i=>answers[i.id]?.status==='Pass'),f=a.filter(i=>answers[i.id]?.status==='Fail');$('total').textContent=a.length;$('done').textContent=d.length;$('pass').textContent=p.length;$('fail').textContent=f.length;$('bar').style.width=(a.length?100*d.length/a.length:0)+'%'}
function subsectionFor(section,item){const id=item.id;const map={"1.1":"UAV Weight","1.2":"UAV CG Point","2.1":"Team Availability","2.2":"Safety Briefing","3.1":"Setup Description","3.2":"Test Area Readiness","3.3":"Emergency & Safety Equipment","3.4":"DG & Electrical Setup","5.1":"LV Battery Voltage","5.2":"HV Battery Voltage","6.1":"HV Battery Status","6.2":"PDU Status","6.3":"PDU Status","6.4":"Beacon Functionality","7.1":"Flight Controller","7.2":"FTI Sensors","7.3":"GCS Status","7.4":"Communication Link","8.1":"Camera Functionality","8.2":"Sound Meter Functionality","8.3":"Communication Check","9.0":"Checker + Reviewer"};if(map[id])return map[id];if(id.startsWith("4.1."))return "1. Port-Side Wing Check";if(id.startsWith("4.2."))return "2. Star-Board Side Wing Check";if(id.startsWith("4.3."))return "3. VTOL Propulsion";if(id.startsWith("4.4."))return "4. FW Propulsion";if(id.startsWith("4.5."))return "5. Tail Assembly";if(id.startsWith("4.6."))return "6. HV Floor (No-Battery Area)";if(id.startsWith("4.7."))return "7. HV Floor (Battery Area)";if(id.startsWith("4.8."))return "8. LV Floor";if(id.startsWith("4.9."))return "9. Propulsion Cooling System";return "General Checks"} function groupedItems(section,items){let groups=[];for(let item of items){let name=subsectionFor(section,item),g=groups.find(x=>x.name===name);if(!g){g={name,items:[]};groups.push(g)}g.items.push(item)}return groups}
let expandedDailySections=new Set();$('list').addEventListener('toggle',e=>{let d=e.target;if(!d.matches?.('details.section'))return;if(d.open)expandedDailySections.add(d.dataset.section);else expandedDailySections.delete(d.dataset.section)},true);function render(){let q=$('search').value.toLowerCase();$('list').innerHTML=sections.map(s=>{let items=s.items.filter(i=>(i.id+' '+i.title+' '+i.criteria.join(' ')).toLowerCase().includes(q));if(!items.length)return '';let n=s.items.filter(i=>answers[i.id]?.status).length;let content=groupedItems(s,items).map(g=>'<div class="subsection"><div class="subsection-heading">'+esc(g.name)+'</div>'+g.items.map(i=>{let a=answers[i.id]||{},valueFields=(i.valueFields||[]).map(v=>'<label>'+esc(v.label)+'<input data-id="'+esc(i.id)+'" data-k="value" data-field="'+esc(v.key)+'" value="'+esc(a.values?.[v.key]||'')+'" placeholder="'+esc(v.placeholder||'Enter value')+'"></label>').join('');let controls=i.id==='9.0'?'<div class="other-details-fields"><label class="muted">Overall Remarks<textarea data-id="9.0" data-k="remarks" placeholder="Enter overall trial remarks" rows="3">'+esc(a.remarks||'')+'</textarea></label></div>':(i.valueFields?'<div class="fields value-fields">'+valueFields+'</div>':'')+(s.title.startsWith('1. UAV Specification')||i.id==='3.1'?'':'<div class="fields"><select data-id="'+esc(i.id)+'" data-k="status"><option value="">Select result…</option>'+['Pass','Fail','Not Available'].map(v=>'<option '+(a.status===v?'selected':'')+'>'+v+'</option>').join('')+'</select><input data-id="'+esc(i.id)+'" data-k="remarks" value="'+esc(a.remarks||'')+'" placeholder="Inspection remarks / observations"></div>');return '<article class="item"><div class="head"><span class="serial">'+esc(i.id)+'</span><div class="title">'+esc(i.title)+'</div></div>'+(i.criteria.length?'<div class="criteria">'+i.criteria.map(esc).join('<br>')+'</div>':'')+controls+'</article>'}).join('')+'</div>').join('');return '<details class="section" data-section="'+esc(s.title)+'" '+(expandedDailySections.has(s.title)||q?'open':'')+'><summary>'+esc(s.title)+' <span class="count">'+n+'/'+s.items.length+' recorded</span></summary>'+content+'</details>'}).join('')||'<p class="muted">No checklist items match.</p>';stats();initSignaturePad()}
function refreshDailyChecklistCounters(){stats();for(const sec of sections){const detail=[...document.querySelectorAll('#list details.section')].find(d=>d.dataset.section===sec.title);if(!detail)continue;const count=detail.querySelector('summary .count');if(count){const recorded=sec.items.filter(item=>answers[item.id]?.status).length;count.textContent=recorded+'/'+sec.items.length+' recorded'}}}$('list').addEventListener('change',e=>{let t=e.target;if(!t.dataset.id)return;answers[t.dataset.id]??={};if(t.dataset.k==='value'){answers[t.dataset.id].values??={};answers[t.dataset.id].values[t.dataset.field]=t.value}else answers[t.dataset.id][t.dataset.k]=t.value;saveChecklistState();if(t.dataset.k==='status')refreshDailyChecklistCounters();buildPreview(true)});$('list').addEventListener('input',e=>{let t=e.target;if(!t.dataset.id||!['remarks','value'].includes(t.dataset.k))return;answers[t.dataset.id]??={};if(t.dataset.k==='value'){answers[t.dataset.id].values??={};answers[t.dataset.id].values[t.dataset.field]=t.value}else answers[t.dataset.id].remarks=t.value;saveChecklistState();buildPreview(true)});$('search').oninput=render;$('expand').onclick=()=>{document.querySelectorAll('#list details.section').forEach(x=>{expandedDailySections.add(x.dataset.section);x.open=true})};$('collapse').onclick=()=>{expandedDailySections.clear();document.querySelectorAll('#list details.section').forEach(x=>x.open=false)};
function initSignaturePad(){let canvas=$('signaturePad');if(!canvas||canvas.dataset.ready==='1')return;canvas.dataset.ready='1';let ctx=canvas.getContext('2d'),drawing=false;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#10243b';let saved=answers['9.0']?.signature;if(saved){let img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=saved}function point(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);e.preventDefault()};canvas.onpointermove=e=>{if(!drawing)return;let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();e.preventDefault()};function finish(){if(!drawing)return;drawing=false;answers['9.0']??={};answers['9.0'].signature=canvas.toDataURL('image/png');saveChecklistState();buildPreview(true)}canvas.onpointerup=finish;canvas.onpointercancel=finish;let clear=$('clearSignature');if(clear)clear.onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);answers['9.0']??={};delete answers['9.0'].signature;saveChecklistState();buildPreview(true)}}
function normalizeRows(rows){let out=[],cur=null,last=null;rows.forEach((r,i)=>{let b=String(r[1]??'').trim(),c=String(r[2]??'').trim(),d=String(r[3]??'').trim();if(/^\d+\.\s+\S/.test(b)&&!c&&!d){cur={title:b,items:[]};out.push(cur);last=null;return}if(!cur)return;if(!b&&!c&&d&&last){last.criteria.push(d);return}if(!b&&!c&&!d)return;if(/^\d+(?:\.\d+)+$/.test(b)||(b&&(c||d))){last={id:b||'row-'+(i+1),title:c||d||'Checklist item',criteria:c&&d?[d]:[]};cur.items.push(last)}});return out.filter(s=>s.items.length)}
function fromGviz(payload){if(payload.status==='error')throw Error(payload.errors?.[0]?.detailed_message||'Google Sheets returned an error.');let rows=(payload.table?.rows||[]).map(r=>(r.c||[]).map(c=>c?.f??c?.v??''));return normalizeRows(rows)}
let evidencePhotos=[];const PHOTO_DB='yeti-photo-evidence',PHOTO_STORE='photos';function openPhotoDB(){return new Promise((resolve,reject)=>{let req=indexedDB.open(PHOTO_DB,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(PHOTO_STORE))req.result.createObjectStore(PHOTO_STORE,{keyPath:'id',autoIncrement:true})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}async function photoDB(action,value){let db=await openPhotoDB();return new Promise((resolve,reject)=>{let tx=db.transaction(PHOTO_STORE,action==='getAll'?'readonly':'readwrite'),store=tx.objectStore(PHOTO_STORE),req=action==='getAll'?store.getAll():action==='add'?store.add(value):store.delete(value);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);tx.oncomplete=()=>db.close()})}function photoData(file){return new Promise((resolve,reject)=>{let fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file)})}async function renderPhotoThumbs(){try{evidencePhotos=await photoDB('getAll')}catch(e){$('photoStatus').textContent='Photo storage is unavailable in this browser.';return}let dailyPhotos=evidencePhotos.filter(p=>(p.category||'daily')==='daily');$('photoStatus').textContent=dailyPhotos.length+' photo(s) added. Photos will appear after the checklist in the PDF.';$('photoThumbs').innerHTML=dailyPhotos.map(p=>'<div class="photo-thumb"><img src="'+p.data+'" alt="'+esc(p.name)+'"><div class="muted">'+esc(p.name)+'</div><button class="btn alt" data-remove-photo="'+p.id+'">Remove</button></div>').join('');if($('loadingPhotoThumbs')){let loadingPhotos=evidencePhotos.filter(p=>p.category==='loading');$('loadingPhotoStatus').textContent=loadingPhotos.length+' photo(s) added.';$('loadingPhotoThumbs').innerHTML=loadingPhotos.map(p=>'<div class="photo-thumb"><img src="'+p.data+'" alt="'+esc(p.name)+'"><div class="muted">'+esc(p.name)+'</div><button class="btn alt" data-remove-photo="'+p.id+'">Remove</button></div>').join('')}}async function addPhotoFiles(files,category='daily'){for(let file of Array.from(files||[])){if(!file.type.startsWith('image/'))continue;let data=await photoData(file);try{let img=await createImageBitmap(file),scale=Math.min(1,1600/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/jpeg',.82);img.close?.()}catch(e){}await photoDB('add',{name:file.name,data,category,addedAt:new Date().toISOString()})}await renderPhotoThumbs();$('cameraPhotos').value='';$('galleryPhotos').value='';if($('loadingCameraPhotos'))$('loadingCameraPhotos').value='';if($('loadingGalleryPhotos'))$('loadingGalleryPhotos').value=''}$('cameraPhotos').addEventListener('change',e=>addPhotoFiles(e.target.files).catch(()=>{$('photoStatus').textContent='Unable to save photos. Check available browser storage.'}));$('galleryPhotos').addEventListener('change',e=>addPhotoFiles(e.target.files).catch(()=>{$('photoStatus').textContent='Unable to save photos. Check available browser storage.'}));$('photoThumbs').addEventListener('click',async e=>{let id=e.target.dataset.removePhoto;if(!id)return;await photoDB('delete',Number(id));await renderPhotoThumbs()});
$('loadingCameraPhotos').addEventListener('change',e=>addPhotoFiles(e.target.files,'loading').catch(()=>{$('loadingPhotoStatus').textContent='Unable to save photos.'}));$('loadingGalleryPhotos').addEventListener('change',e=>addPhotoFiles(e.target.files,'loading').catch(()=>{$('loadingPhotoStatus').textContent='Unable to save photos.'}));$('loadingPhotoThumbs').addEventListener('click',async e=>{let id=e.target.dataset.removePhoto;if(!id)return;await photoDB('delete',Number(id));await renderPhotoThumbs()});async function buildPreview(skipPhotoRefresh=false){
 if(!skipPhotoRefresh)await renderPhotoThumbs();
 const now=new Date();
 const all=sections.flatMap(sec=>sec.items);
 const statusItems=all.filter(item=>item.id!=='9.0'&&item.id!=='3.1'&&!sections.find(sec=>sec.items.includes(item))?.title.startsWith('1. UAV Specification'));
 const statusRecorded=statusItems.filter(item=>['Pass','Fail','Not Available'].includes(answers[item.id]?.status)).length;
 const cell=v=>esc(v||'');
 const meta=(label,value)=>'<div><b>'+label+':</b> '+cell(value)+'</div>';
 let html='<div class="print-document"><div class="print-doc-head"><div class="print-logo-panel"><img src="assets/ideaforge-logo.png" alt="ideaForge logo"></div><h2>Daily Airworthiness Checklist</h2><div class="print-doc-meta"><b>Doc Number: IF_YETI_TD0_FTR_CKT_005</b>'+meta('UAV Name / ID',trialInfo.uavNameId)+meta('Trial Phase',trialInfo.phase)+meta('Trial Stage',trialInfo.stage)+meta('Flight Place',trialInfo.place)+meta('Flight Date',trialInfo.date)+'</div></div>';
 html+='<table class="print-checklist"><colgroup><col style="width:6%"><col style="width:24%"><col style="width:39%"><col style="width:13%"><col style="width:18%"></colgroup><thead><tr><th>Sl. No</th><th colspan="2">Checklist</th><th>Result</th><th>Remarks</th></tr></thead><tbody>';
 for(const sec of sections){
  html+='<tr class="print-section-row"><td colspan="5">'+cell(sec.title)+'</td></tr>';
  for(const group of groupedItems(sec,sec.items)){
   html+='<tr class="print-subsection-row"><td colspan="5">'+cell(group.name)+'</td></tr>';
   for(const item of group.items){
    const ans=answers[item.id]||{};
    if(item.id==='9.0'){
     html+='<tr class="print-item-row"><td class="print-serial">9</td><td colspan="4"><b>Overall Remarks</b><div class="print-remarks">'+cell(ans.remarks)+'</div>'+(ans.signature?'<div class="print-other-label">Checker / Reviewer Signature</div><img class="print-signature" src="'+ans.signature+'" alt="Checker / Reviewer signature">':'<div class="print-empty-note">Signature not entered</div>')+'</td></tr>';
     continue;
    }
    const isSpec=sec.title.startsWith('1. UAV Specification');
    const isSetup=item.id==='3.1';
    const values=(item.valueFields||[]).map(field=>field.label+': '+(ans.values?.[field.key]||'')).filter(value=>!value.endsWith(': ')).join(' | ');
    const criteria=(item.criteria||[]).join('; ');
    const check=value=>ans.status===value?'✓':'';
    const checkpoint=isSetup?cell(ans.values?.setupDescription||''):cell(item.title);
    const criterionText=[cell(criteria),cell(values)].filter(Boolean).join('<br>');const descriptionCells=(!checkpoint||!criterionText)?'<td colspan="2">'+[checkpoint,criterionText].filter(Boolean).join('<br>')+'</td>':'<td>'+checkpoint+'</td><td>'+criterionText+'</td>';
    const resultStyle=ans.status==='Pass'?'background-color:#d9f0df!important;color:#146c36!important;border:2px solid #8bc99c!important;box-shadow:inset 0 0 0 100px #d9f0df!important;':ans.status==='Fail'?'background-color:#fde2e2!important;color:#a51f2b!important;border:2px solid #e5a0a5!important;box-shadow:inset 0 0 0 100px #fde2e2!important;':ans.status==='Not Available'?'background-color:#343a40!important;color:#ffffff!important;border:2px solid #20252a!important;box-shadow:inset 0 0 0 100px #343a40!important;':'';const resultBadge=ans.status?'<span class="print-result-badge" style="display:inline-block;min-width:76px;padding:5px 7px;border-radius:5px;text-align:center;font-size:9px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;forced-color-adjust:none!important;'+resultStyle+'">'+cell(ans.status)+'</span>':'';html+='<tr class="print-item-row '+(item.id==='4.9.1'?'print-page-break-before':'')+'"><td class="print-serial">'+cell(item.id)+'</td>'+descriptionCells+'<td class="print-result">'+(isSpec||isSetup?'':resultBadge)+'</td><td class="print-remarks">'+cell(ans.remarks)+'</td></tr>';
   }
  }
 }
 html+='</tbody></table><div class="print-footer"><span>Checklist status recorded: '+statusRecorded+' / '+statusItems.length+'</span></div>';
 const photos=evidencePhotos.filter(photo=>(photo.category||'daily')==='daily');
 if(photos.length)html+='<section class="print-photo-section"><h3>PHOTO EVIDENCE ('+photos.length+')</h3><div class="print-photo-grid">'+photos.map((photo,index)=>'<div class="print-photo"><img src="'+photo.data+'" alt="Photo evidence '+(index+1)+'"><small>'+(index+1)+'. '+cell(photo.name)+'</small></div>').join('')+'</div></section>';
 html+='</div>';
 $('previewContent').innerHTML=html;
}
$('previewBtn').onclick=async()=>{$('previewPanel').classList.add('show');await buildPreview();$('previewPanel').scrollIntoView({behavior:'smooth',block:'start'})};
$('closePreview').onclick=()=>{$('previewPanel').classList.remove('show')};

async function exportChecklistPdf(previewId,title){
 const printWindow=window.open('','_blank');
 if(!printWindow){alert('Please allow pop-ups for this site, then select Export as PDF again.');return}
 try{
  const source=$(previewId);
  if(!source)throw new Error('Checklist preview is not available.');
  const content=source.cloneNode(true);
  content.querySelectorAll('button').forEach(el=>el.remove());
  const base=document.createElement('base');base.href=location.href;
  const styles=`
   @page{size:A4 landscape;margin:9mm}
   *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
   html,body{margin:0;padding:0;width:100%;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif}
   body{padding:0;orphans:3;widows:3}
   .print-document,.loading-print-document{display:block;width:100%;max-width:100%;min-width:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;overflow:visible}
   .print-doc-head,.loading-print-head{break-inside:avoid;page-break-inside:avoid}
   .print-checklist,.loading-print-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8.5px;break-inside:auto;page-break-inside:auto}
   .print-checklist th,.print-checklist td,.loading-print-table th,.loading-print-table td{border:1px solid #555;padding:4px;vertical-align:top;overflow-wrap:anywhere;word-break:normal}
   .print-checklist thead,.loading-print-table thead{display:table-header-group}
   .print-checklist tfoot,.loading-print-table tfoot{display:table-footer-group}
   .print-checklist tr,.loading-print-table tr{break-inside:avoid;page-break-inside:avoid}
   .print-section-row,.print-subsection-row,.loading-print-section{break-after:avoid;page-break-after:avoid}
   .print-section-row td,.loading-print-section td{background:#e8e8e8!important;font-weight:700;text-align:center}
   .print-subsection-row td{background:#eaf3fb!important;color:#174f7d!important;font-weight:700}
   .print-photo-section{break-inside:auto;page-break-inside:auto;margin-top:14px}
   .print-photo-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;align-items:start}
   .print-photo{display:block;min-width:0;width:100%;margin:0;border:1px solid #777;padding:6px;break-inside:avoid;page-break-inside:avoid}
   .print-photo img{width:100%;height:130px;object-fit:contain;display:block}
   .print-photo small{display:block;font-size:9px;margin-top:4px;overflow-wrap:anywhere}
   .print-signature{max-width:280px;max-height:90px;object-fit:contain;break-inside:avoid;page-break-inside:avoid}
   .print-result-badge,.loading-print-status{font-weight:900}
   .print-result-pass{background:#d9f0df!important;color:#146c36!important}
   .print-result-fail{background:#fde2e2!important;color:#a51f2b!important}
   .print-result-na{background:#343a40!important;color:#fff!important}
   .loading-print-head{display:grid;grid-template-columns:110px 1fr 220px;gap:12px;align-items:center;border:1px solid #9ca9b6;padding:10px}
   .loading-print-head img{width:100px;max-height:60px;object-fit:contain}
   .loading-print-head h2{text-align:center;font-size:20px;margin:0}
   .loading-print-meta{font-size:10px;line-height:1.5}
   .loading-print-footer,.print-footer{font-size:9px;text-align:right;margin-top:8px}
   .preview-panel>div:first-child,.loading-preview-actions{display:none!important}
   img{max-width:100%}
  `;
  printWindow.document.open();
  printWindow.document.write('<!doctype html><html><head><meta charset="utf-8"><title>'+String(title).replace(/[&<>"]/g,'')+'</title>');
  printWindow.document.write(base.outerHTML+'<style>'+styles+'</style></head><body></body></html>');
  printWindow.document.close();
  printWindow.document.body.appendChild(content);
  const images=[...printWindow.document.images];
  await Promise.all(images.map(img=>img.complete?Promise.resolve():new Promise(resolve=>{img.onload=resolve;img.onerror=resolve;setTimeout(resolve,5000)})));
  if(printWindow.document.fonts?.ready)await printWindow.document.fonts.ready;
  printWindow.focus();
  setTimeout(()=>{try{printWindow.print()}catch(err){alert('Unable to open the PDF print dialog. Please use your browser Print option.')}},350);
 }catch(err){printWindow.close();console.error('PDF export failed:',err);alert('PDF export could not be prepared. Please refresh the page and try again.')}
}

function promptPdfFileName(documentCode='DAC'){
 const now=new Date(),pad=n=>String(n).padStart(2,'0');
 const suggestedName=now.getFullYear()+'_'+pad(now.getMonth()+1)+'_'+pad(now.getDate())+'_'+documentCode;
 const enteredName=window.prompt('Enter the PDF document name:',suggestedName);
 if(enteredName===null)return null;
 let fileName=enteredName.trim().replace(/[\\\\/:*?"<>|]/g,'_');
 if(!fileName)fileName=suggestedName;
 fileName=fileName.replace(/\.pdf$/i,'');
 return fileName+'.pdf';
}
$('pdfBtn').onclick=async()=>{
 const fileName=promptPdfFileName('DAC');
 if(!fileName)return;
 await buildPreview();
 exportChecklistPdf('previewContent',fileName);
};

const checklistSidebarLayout=document.querySelector('.submodule-layout'),checklistSidebarToggle=$('checklistSidebarToggle');if(checklistSidebarLayout&&checklistSidebarToggle){checklistSidebarToggle.addEventListener('click',()=>{const expanded=checklistSidebarLayout.classList.toggle('sidebar-expanded');checklistSidebarToggle.setAttribute('aria-expanded',String(expanded));checklistSidebarToggle.setAttribute('aria-label',expanded?'Collapse checklist navigation':'Expand checklist navigation');checklistSidebarToggle.title=expanded?'Collapse checklist navigation':'Expand checklist navigation';checklistSidebarToggle.querySelector('span:last-child').textContent=expanded?'Collapse':'Expand'})};function setChecklistTab(which){const daily=which==='daily',loading=which==='loading',sop=which==='sop';$('dailyChecklistTabPanel').hidden=!daily;$('loadingChecklistSection').hidden=!loading;$('flightTrialPreparationSopPanel').hidden=!sop;[['flightTrialPreparationSopTab',sop],['dailyTabBtn',daily],['loadingTabBtn',loading]].forEach(([id,active])=>{$(id).classList.toggle('active',active);$(id).setAttribute('aria-selected',String(active))});try{localStorage.setItem('yetiActiveChecklistTabOrder2',which)}catch(e){}} $('flightTrialPreparationSopTab').addEventListener('click',()=>setChecklistTab('sop'));$('dailyTabBtn').addEventListener('click',()=>setChecklistTab('daily'));$('loadingTabBtn').addEventListener('click',()=>setChecklistTab('loading'));let savedChecklistTab='sop';try{savedChecklistTab=localStorage.getItem('yetiActiveChecklistTabOrder2')||'sop'}catch(e){}if(!['daily','loading','sop'].includes(savedChecklistTab))savedChecklistTab='sop';setChecklistTab(savedChecklistTab);
let loadingAnswers={};const CHECKLIST_STATE_KEY='yeti-flight-trial-active-session-v2';function saveChecklistState(){try{localStorage.setItem(CHECKLIST_STATE_KEY,JSON.stringify({answers,trialInfo,loadingAnswers,loadingMeta:Object.fromEntries(['loadingUavNameId','loadingFrom','unloadingAt','loadingDate','loadingTime'].map(id=>[id,$(id)?.value||'']))}))}catch(e){}}function restoreChecklistState(){try{const x=JSON.parse(localStorage.getItem(CHECKLIST_STATE_KEY)||'null');if(!x)return;answers=x.answers||{};trialInfo=x.trialInfo||{};loadingAnswers=x.loadingAnswers||{};Object.entries(x.loadingMeta||{}).forEach(([id,v])=>{if($(id))$(id).value=v})}catch(e){}}
const loadingDateEl=$('loadingDate'),loadingTimeEl=$('loadingTime');
let expandedLoadingSections=new Set();$('loadingList').addEventListener('toggle',e=>{let d=e.target;if(!d.matches?.('details.loading-accordion'))return;if(d.open)expandedLoadingSections.add(d.dataset.section);else expandedLoadingSections.delete(d.dataset.section)},true);function renderLoadingChecklist(){let q=$('loadingSearch').value.toLowerCase(),done=0,pass=0,fail=0;let html=LOADING_BASE.map(sec=>{let rows=sec.items.filter(i=>(i.id+' '+i.title+' '+i.expected).toLowerCase().includes(q));if(!rows.length)return '';let sectionDone=rows.filter(i=>loadingAnswers[i.id]?.status).length;return '<details class="loading-accordion" data-section="'+esc(sec.title)+'" '+(expandedLoadingSections.has(sec.title)?'open':'')+'><summary><span>'+esc(sec.title)+'</span><span class="count">'+sectionDone+'/'+rows.length+' answered</span></summary>'+rows.map(i=>{let a=loadingAnswers[i.id]||{};if(a.status)done++;if(a.status==='Pass')pass++;if(a.status==='Fail')fail++;return '<article class="loading-item"><div class="loading-item-head"><span class="loading-serial">'+esc(i.id)+'</span><div class="loading-task">'+esc(i.title)+'</div></div><div class="loading-expected"><b>Expected condition:</b> '+esc(i.expected)+'</div><div class="loading-controls"><select data-load-id="'+esc(i.id)+'" data-load-k="status"><option value="">Select result…</option>'+['Pass','Fail'].map(v=>'<option '+(a.status===v?'selected':'')+'>'+v+'</option>').join('')+'</select><input data-load-id="'+esc(i.id)+'" data-load-k="remark" value="'+esc(a.remark||'')+'" placeholder="Remarks / observations"></div></article>'}).join('')+'</details>'}).join('');$('loadingList').innerHTML=html||'<p class="muted">No loading / unloading checks match.</p>';let total=LOADING_BASE.reduce((n,s)=>n+s.items.length,0);$('loadingTotal').textContent=total;$('loadingDone').textContent=done;$('loadingPass').textContent=pass;$('loadingFail').textContent=fail;$('loadingStateCount').textContent=done+' / '+total+' recorded';$('loadingBar').style.width=(100*done/total)+'%'}
function refreshLoadingCounters(){let q=$('loadingSearch').value.toLowerCase(),done=0,pass=0,fail=0;for(const sec of LOADING_BASE){const rows=sec.items.filter(i=>(i.id+' '+i.title+' '+i.expected).toLowerCase().includes(q));const sectionDone=rows.filter(i=>loadingAnswers[i.id]?.status).length;const detail=[...document.querySelectorAll('#loadingList details.loading-accordion')].find(d=>d.dataset.section===sec.title);if(detail){const count=detail.querySelector('summary .count');if(count)count.textContent=sectionDone+'/'+rows.length+' answered'}for(const item of rows){const status=loadingAnswers[item.id]?.status;if(status)done++;if(status==='Pass')pass++;if(status==='Fail')fail++}}let total=LOADING_BASE.reduce((n,sec)=>n+sec.items.length,0);$('loadingTotal').textContent=total;$('loadingDone').textContent=done;$('loadingPass').textContent=pass;$('loadingFail').textContent=fail;$('loadingStateCount').textContent=done+' / '+total+' recorded';$('loadingBar').style.width=(100*done/total)+'%'}$('loadingList').addEventListener('change',e=>{let t=e.target;if(!t.dataset.loadId)return;loadingAnswers[t.dataset.loadId]??={};loadingAnswers[t.dataset.loadId][t.dataset.loadK]=t.value;saveChecklistState();if(t.dataset.loadK==='status')refreshLoadingCounters();buildLoadingPreview(true)});
$('loadingList').addEventListener('input',e=>{let t=e.target;if(!t.dataset.loadId||t.dataset.loadK!=='remark')return;loadingAnswers[t.dataset.loadId]??={};loadingAnswers[t.dataset.loadId].remark=t.value;saveChecklistState();buildLoadingPreview(true)});
['loadingUavNameId','loadingFrom','unloadingAt','loadingDate','loadingTime'] .forEach(id=>$(id).addEventListener('input',()=>{saveChecklistState();buildLoadingPreview(true)}));
$('loadingSearch').oninput=renderLoadingChecklist;$('loadingExpand').onclick=()=>{document.querySelectorAll('#loadingList details.loading-accordion').forEach(x=>{expandedLoadingSections.add(x.dataset.section);x.open=true})};$('loadingCollapse').onclick=()=>{expandedLoadingSections.clear();document.querySelectorAll('#loadingList details.loading-accordion').forEach(x=>x.open=false)};
async function buildLoadingPreview(skipPhotoRefresh=false){if(!skipPhotoRefresh)await renderPhotoThumbs();let loadingPhotos=evidencePhotos.filter(p=>p.category==='loading'),total=LOADING_BASE.reduce((n,s)=>n+s.items.length,0),done=Object.values(loadingAnswers).filter(a=>a.status).length,html='<div class="loading-print-document"><div class="loading-print-head"><img src="assets/ideaforge-logo.png" alt="ideaForge logo"><h2>Loading &amp; Unloading Checklist</h2><div class="loading-print-meta"><b>Doc No: IF_YETI_TD0_FTR_CKT_003</b><br><b>UAV Name / ID:</b> '+esc($('loadingUavNameId').value||'')+'<br><b>Loading / Unloading Location</b><br>Loading from: '+esc($('loadingFrom').value||'')+'<br>Unloading at: '+esc($('unloadingAt').value||'')+'<br>Date: '+esc(loadingDateEl.value||'')+'<br>Time: '+esc(loadingTimeEl.value||'')+'</div></div><table class="loading-print-table"><colgroup><col style="width:7%"><col style="width:37%"><col style="width:31%"><col style="width:10%"><col style="width:15%"></colgroup><thead><tr><th>Step No</th><th>Task Description</th><th>Expected Condition</th><th>Result</th><th>Remark</th></tr></thead><tbody>';for(let sec of LOADING_BASE){html+='<tr class="loading-print-section"><td colspan="5">'+esc(sec.title)+'</td></tr>';for(let i of sec.items){let a=loadingAnswers[i.id]||{},resultStyle=a.status==='Pass'?'background-color:#d9f0df!important;color:#146c36!important;border:2px solid #8bc99c!important;box-shadow:inset 0 0 0 100px #d9f0df!important;':a.status==='Fail'?'background-color:#fde2e2!important;color:#a51f2b!important;border:2px solid #e5a0a5!important;box-shadow:inset 0 0 0 100px #fde2e2!important;':'',res=a.status?'<span class="loading-print-status" style="display:inline-block;min-width:76px;padding:5px 7px;border-radius:5px;text-align:center;font-size:9px;font-weight:900;letter-spacing:.03em;text-transform:uppercase;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;forced-color-adjust:none!important;'+resultStyle+'">'+esc(a.status)+'</span>':'';html+='<tr><td>'+esc(i.id)+'</td><td>'+esc(i.title)+'</td><td>'+esc(i.expected)+'</td><td style="text-align:center">'+res+'</td><td>'+esc(a.remark||'')+'</td></tr>'}}html+='</tbody></table><div class="loading-print-footer">Checklist status recorded: '+done+' / '+total+'</div>'+(loadingAnswers._signature?'<div style="margin-top:18px"><b>Checker / Reviewer Signature</b><br><img src="'+loadingAnswers._signature+'" style="max-width:280px;max-height:90px;object-fit:contain"></div>':'');if(loadingPhotos.length){html+='<section class="print-photo-section"><h3>PHOTO EVIDENCE ('+loadingPhotos.length+')</h3><div class="print-photo-grid">'+loadingPhotos.map((p,i)=>'<div class="print-photo"><img src="'+p.data+'" alt="Loading photo '+(i+1)+'"><small>'+(i+1)+'. '+esc(p.name)+'</small></div>').join('')+'</div></section>'}html+='</div>';$('loadingPreviewContent').innerHTML=html}
$('loadingPreviewBtn').onclick=async()=>{await buildLoadingPreview();$('loadingPreviewPanel').classList.add('show');$('loadingPreviewPanel').scrollIntoView({behavior:'smooth',block:'start'})};$('loadingClosePreview').onclick=()=>{$('loadingPreviewPanel').classList.remove('show')};$('loadingPdfBtn').onclick=async()=>{
 const fileName=promptPdfFileName('LUC');
 if(!fileName)return;
 await buildLoadingPreview();
 exportChecklistPdf('loadingPreviewContent',fileName);
};
window.addEventListener('afterprint',()=>document.body.classList.remove('print-loading-checklist'));
function initLoadingSignature(){let canvas=$('loadingSignaturePad');if(!canvas)return;let ctx=canvas.getContext('2d'),drawing=false;ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#10243b';if(loadingAnswers._signature){let img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=loadingAnswers._signature}function point(e){let r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);let p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);e.preventDefault()};canvas.onpointermove=e=>{if(!drawing)return;let p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();e.preventDefault()};function finish(){if(!drawing)return;drawing=false;loadingAnswers._signature=canvas.toDataURL('image/png');saveChecklistState();buildLoadingPreview(true)}canvas.onpointerup=finish;canvas.onpointercancel=finish;$('clearLoadingSignature').onclick=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);delete loadingAnswers._signature;saveChecklistState();buildLoadingPreview(true)}}renderLoadingChecklist();initLoadingSignature();renderPhotoThumbs();
restoreChecklistState();renderLoadingChecklist();initLoadingSignature();[['uavNameId','uavNameId'],['trialPhase','phase'],['trialStage','stage'],['flightPlace','place'],['flightDate','date']].forEach(([id,key])=>{let el=$(id);el.value=trialInfo[key]||'';el.addEventListener('input',()=>{trialInfo[key]=el.value;saveChecklistState();buildPreview(true)})});render();initSignaturePad();renderPhotoThumbs();buildPreview(true);buildLoadingPreview(true);
async function resetTrialSession(){if(!confirm('Refresh the checklist? This clears all saved answers, remarks, signatures, trial details and uploaded photo evidence on this browser.'))return;answers={};trialInfo={};loadingAnswers={};try{localStorage.removeItem(CHECKLIST_STATE_KEY)}catch(e){}['uavNameId','trialPhase','trialStage','flightPlace','flightDate','loadingUavNameId','loadingFrom','unloadingAt','loadingDate','loadingTime'].forEach(id=>{if($(id))$(id).value=''});for(const p of evidencePhotos){try{await photoDB('delete',p.id)}catch(e){}}evidencePhotos=[];for(const id of ['signaturePad','loadingSignaturePad']){const c=$(id);if(c)c.getContext('2d').clearRect(0,0,c.width,c.height)}render();renderLoadingChecklist();renderPhotoThumbs();buildPreview(true);buildLoadingPreview(true)}$('refreshChecklistBtn').addEventListener('click',resetTrialSession);window.addEventListener('pageshow',e=>{if(e.persisted){restoreChecklistState();render();renderLoadingChecklist();buildPreview(true);buildLoadingPreview(true)}});


// Home-screen shortcut is added from the device browser menu; no in-page button is needed.
