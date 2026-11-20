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
const REFRESH_STATUS_KEY='yetiRefreshInProgress';
const refreshButton=$('refreshPageBtn');
const refreshStatus=$('appRefreshStatus');
const refreshStatusText=$('appRefreshStatusText');
function showRefreshStatus(state){
 if(!refreshStatus)return;
 refreshStatus.hidden=false;
 refreshStatus.classList.toggle('is-complete',state==='complete');
 refreshStatus.classList.toggle('is-error',state==='error');
 if(refreshStatusText)refreshStatusText.textContent=state==='complete'?'Page refreshed successfully':state==='error'?'Refresh could not be completed. Please try again.':'Refreshing YETI Flight Trial…';
 if(refreshButton){refreshButton.disabled=state==='loading';refreshButton.setAttribute('aria-busy',String(state==='loading'));refreshButton.textContent=state==='loading'?'↻ Refreshing…':'↻ Refresh';}
}
refreshButton?.addEventListener('click',()=>{
 if(refreshButton.disabled)return;
 showRefreshStatus('loading');
 try{sessionStorage.setItem(REFRESH_STATUS_KEY,'1')}catch(_error){}
 window.location.reload();
});
function completePendingRefresh(){
 let pending=false;try{pending=sessionStorage.getItem(REFRESH_STATUS_KEY)==='1';if(pending)sessionStorage.removeItem(REFRESH_STATUS_KEY)}catch(_error){}
 if(!pending)return;
 showRefreshStatus('complete');
 if(refreshButton){refreshButton.disabled=false;refreshButton.removeAttribute('aria-busy');refreshButton.textContent='↻ Refresh';}
 window.setTimeout(()=>{if(refreshStatus)refreshStatus.hidden=true;},3200);
}
if(document.readyState==='complete')completePendingRefresh();
else window.addEventListener('load',completePendingRefresh,{once:true});
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js?v=24',{updateViaCache:'none'}).catch(err=>console.error('Service worker registration failed',err)));
