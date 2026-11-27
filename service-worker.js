const CACHE='yeti-flight-trial-shell-v218';
const SHELL=[
 './',
 './index.html',
 './manifest.webmanifest',
 './css/app.css',
 './css/yeti-auth.css',
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
 './js/page-zoom-lock.js',
 './js/flight-log-analyzer.js',
 './js/yeti-csv-processing.js',
 './js/yeti-workbook-import.js',
 './js/yeti-parameter-mapping.js',
 './js/yeti-graph-analysis.js',
 './js/yeti-report-generation.js',
 './js/yeti-session-storage.js',
 './js/propulsion-analysis-engine.js',
 './js/propulsion-percent-comparison.js',
 './js/propulsion-analyser.js',
 './js/yeti-auth.js',
 './js/flight-trial-sop-editor.js',
 './data/flight-trial-sop.json',
 './data/sop-publication-status.json',
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
 if(req.method!=='GET')return;
 const requestUrl=new URL(req.url);
 // Cache the pinned SheetJS browser build after its first successful online load so Excel import can work offline later.
 if(requestUrl.origin==='https://cdn.sheetjs.com'&&requestUrl.pathname==='/xlsx-0.20.3/package/dist/xlsx.full.min.js'){
  event.respondWith(caches.open(CACHE).then(async cache=>{
   const cached=await cache.match(req);
   try{const response=await fetch(new Request(req,{cache:'no-store'}));if(response.ok||response.type==='opaque')cache.put(req,response.clone()).catch(()=>{});return response;}
   catch(error){if(cached)return cached;throw error;}
  }));
  return;
 }
 if(requestUrl.origin!==self.location.origin)return;
 const pathname=requestUrl.pathname.toLowerCase();
 // SOP data is always network-first so the Admin editor never mistakes an old
 // offline shell copy for the current central revision. Fall back to the last
 // cached copy only when the Pages origin is genuinely unreachable.
 if(pathname.endsWith('/data/flight-trial-sop.json')||pathname.endsWith('/data/sop-publication-status.json')){
  event.respondWith(fetch(new Request(req,{cache:'no-store'})).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(new URL(requestUrl.pathname,self.location.origin).href,copy));}
   return response;
  }).catch(async()=>{
   const cached=await caches.match(new URL(requestUrl.pathname,self.location.origin).href);
   if(cached)return cached;
   throw new Error('SOP data is unavailable online and no cached copy exists.');
  }));
  return;
 }
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
