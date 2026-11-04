const CACHE='yeti-flight-trial-shell-v34';
const SHELL=['./','./index.html','./manifest.webmanifest','./css/app.css','./css/propulsion-analyser.css','./js/flight-preparation.js','./js/main-navigation.js','./js/propulsion-analyser.js','./assets/yeti-app-icon.svg','./assets/ideaforge-logo.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 if(req.mode==='navigate'||req.destination==='document'){
  event.respondWith(fetch(new Request(req,{cache:'no-store'})).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put('./index.html',copy))}
   return response;
  }).catch(()=>caches.match('./index.html')));
  return;
 }
 if(req.destination==='script'||req.destination==='style'){
  event.respondWith(fetch(new Request(req,{cache:'no-store'})).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}
   return response;
  }).catch(()=>caches.match(req,{ignoreSearch:true})));
  return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}
  return response;
 }).catch(()=>cached)));
});
