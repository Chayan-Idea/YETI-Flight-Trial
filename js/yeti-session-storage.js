/* YETI session persistence adapter — IndexedDB lifecycle only. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.YetiSessionStorage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const DB_NAME='yeti-flight-trial-state',DB_VERSION=1,DB_STORE='propulsion-analyser',DB_KEY='active-session';
 function open(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined'){reject(new Error('IndexedDB is unavailable in this browser.'));return;}const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(DB_STORE))req.result.createObjectStore(DB_STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Unable to open YETI session storage.'));});}
 async function read(){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly'),req=tx.objectStore(DB_STORE).get(DB_KEY);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}finally{db.close();}}
 async function write(value){const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Session write aborted'));});}finally{db.close();}}
 async function clear(){const db=await open();try{await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(DB_KEY);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
 return Object.freeze({open,read,write,clear,DB_NAME,DB_STORE,DB_KEY});
});