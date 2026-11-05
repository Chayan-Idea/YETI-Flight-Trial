/* Main navigation always opens on the default module after a page refresh. */
function setModuleTab(which){const flight=which==='flight';$('flightPreparationPanel').hidden=!flight;$('propulsionAnalyzerPanel').hidden=flight;[['flightPreparationTab',flight],['propulsionAnalyzerTab',!flight]].forEach(([id,active])=>{$(id).classList.toggle('active',active);$(''+id).setAttribute('aria-selected',String(active))});}
$('flightPreparationTab').addEventListener('click',()=>setModuleTab('flight'));
$('propulsionAnalyzerTab').addEventListener('click',()=>setModuleTab('propulsion'));
try{localStorage.removeItem('yetiActiveMainModuleTab')}catch(e){}
setModuleTab('flight');
$('refreshPageBtn').addEventListener('click',()=>window.location.reload());
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=22',{updateViaCache:'none'}).catch(err=>console.error('Service worker registration failed',err)));
