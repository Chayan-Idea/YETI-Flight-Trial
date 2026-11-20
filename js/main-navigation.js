/* Main module navigation only. Each module keeps its own panel and feature code. */
const MODULE_TAB_STATE_KEY='yetiActiveMainModuleTab';
const MODULES={
 flight:{tab:'flightPreparationTab',panel:'flightPreparationPanel'},
 propulsion:{tab:'propulsionAnalyzerTab',panel:'propulsionAnalyzerPanel'},
 flightLog:{tab:'flightLogAnalyzerTab',panel:'flightLogAnalyzerPanel'}
};
function setModuleTab(which,save=true){
 const selected=MODULES[which]||MODULES.flight;
 Object.entries(MODULES).forEach(([key,item])=>{
  const active=key===which;
  $(item.panel).hidden=!active;
  $(item.tab).classList.toggle('active',active);
  $(item.tab).setAttribute('aria-pressed',String(active));
 });
 if(save){try{localStorage.setItem(MODULE_TAB_STATE_KEY,which)}catch(e){}}
}
Object.entries(MODULES).forEach(([key,item])=>$(item.tab).addEventListener('click',()=>setModuleTab(key)));
let savedModuleTab='flight';
try{savedModuleTab=localStorage.getItem(MODULE_TAB_STATE_KEY)||'flight'}catch(e){}
if(!Object.prototype.hasOwnProperty.call(MODULES,savedModuleTab))savedModuleTab='flight';
setModuleTab(savedModuleTab,false);
$('refreshPageBtn').addEventListener('click',()=>window.location.reload());
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=24',{updateViaCache:'none'}).catch(err=>console.error('Service worker registration failed',err)));
