const CACHE='yeti-flight-trial-shell-v183';
const SHELL=[
 './',
 './index.html',
 './manifest.webmanifest',
 './css/app.css',
 './css/propulsion-analyser.css',
 './css/yeti-design-system.css',
 './css/propulsion-workstation.css',
 './css/yeti-aerospace-visuals.css',
 './css/flight-log-analyzer.css',
 './js/daily-airworthiness-template.js',
 './js/daily-airworthiness-pdf-manifest.js',
 './js/pdf-template-manager.js',
 './js/pdf-coordinate-mapper.js',
 './js/pdf-template-package-loader.js',
 './js/pdf-overlay-renderer.js',
 './js/pdf-template-bootstrap.js',
 './js/flight-preparation.js',
 './js/main-navigation.js',
 './js/flight-log-analyzer.js',
 './js/yeti-csv-processing.js',
 './js/yeti-parameter-mapping.js',
 './js/yeti-graph-analysis.js',
 './js/yeti-report-generation.js',
 './js/yeti-session-storage.js',
 './js/propulsion-analysis-engine.js',
 './js/propulsion-analyser.js',
 './assets/illustrations/propulsion/propeller-outline.svg',
 './assets/illustrations/aerospace/airframe-outline.svg',
 './assets/illustrations/aerospace/flight-control-schematic.svg',
 './assets/yeti-app-icon.svg',
 './assets/ideaforge-logo.png'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const pathname=new URL(req.url).pathname.toLowerCase();
 // PDF templates and their manifests are versioned assets: never serve or retain stale copies in the shell cache.
 if(pathname.endsWith('.pdf')||pathname.endsWith('template-package.json')||pathname.includes('/template-candidates/')){
  event.respondWith(fetch(new Request(req,{cache:'no-store'})));
  return;
 }
 if(req.mode==='navigate'||req.destination==='document'){
  event.respondWith(fetch(new Request(req,{cache:'no-store'})).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy));}
   return response;
  }).catch(()=>caches.match('./index.html')));
  return;
 }
 if(req.destination==='script'||req.destination==='style'){
  event.respondWith(fetch(new Request(req,{cache:'no-store'})).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
   return response;
  }).catch(()=>caches.match(req,{ignoreSearch:true})));
  return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
  return response;
 }).catch(()=>cached)));
});
