/* Main application navigation and persistent selected-tab state. */
const MODULE_TAB_STATE_KEY='yetiActiveMainModuleTab';
function setModuleTab(which,save=true){const flight=which==='flight';$('flightPreparationPanel').hidden=!flight;$('propulsionAnalyzerPanel').hidden=flight;[['flightPreparationTab',flight],['propulsionAnalyzerTab',!flight]].forEach(([id,active])=>{$(id).classList.toggle('active',active);$(id).setAttribute('aria-selected',String(active))});if(save){try{localStorage.setItem(MODULE_TAB_STATE_KEY,flight?'flight':'propulsion')}catch(e){}}}
$('flightPreparationTab').addEventListener('click',()=>setModuleTab('flight'));
$('propulsionAnalyzerTab').addEventListener('click',()=>setModuleTab('propulsion'));
let savedModuleTab='flight';try{savedModuleTab=localStorage.getItem(MODULE_TAB_STATE_KEY)||'flight'}catch(e){}if(!['flight','propulsion'].includes(savedModuleTab))savedModuleTab='flight';setModuleTab(savedModuleTab,false);
$('refreshPageBtn').addEventListener('click',()=>window.location.reload());
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=18',{updateViaCache:'none'}).catch(err=>console.error('Service worker registration failed',err)));
