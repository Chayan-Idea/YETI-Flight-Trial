import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const requested=process.argv[2]||path.join(ROOT,'_site');
const OUT=path.resolve(requested);
if(OUT===ROOT||ROOT.startsWith(OUT+path.sep))throw new Error('Refusing to use the repository root or one of its parent directories as the production output.');
if(OUT.startsWith(ROOT+path.sep)&&path.basename(OUT)!=='_site')throw new Error('An in-repository production output must use the dedicated _site directory.');

const requiredFiles=['index.html','manifest.webmanifest','service-worker.js'];
const requiredDirs=['assets','css','js','data'];
fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});
for(const file of requiredFiles){
 const source=path.join(ROOT,file);
 if(!fs.existsSync(source))throw new Error('Required production file is missing: '+file);
 fs.copyFileSync(source,path.join(OUT,file));
}
for(const dir of requiredDirs){
 const source=path.join(ROOT,dir);
 if(!fs.existsSync(source)||!fs.statSync(source).isDirectory())throw new Error('Required production directory is missing: '+dir);
 fs.cpSync(source,path.join(OUT,dir),{
  recursive:true,
  filter:entry=>!entry.toLowerCase().endsWith('.md')&&!entry.endsWith('.map')
 });
}
function walk(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name);
  return entry.isDirectory()?walk(full):[full];
 });
}
function resolveLocalReference(reference,baseFile){
 const clean=decodeURIComponent(reference.split(/[?#]/,1)[0]);
 if(!clean||clean.startsWith('#')||/^(?:data:|blob:|https?:|mailto:|tel:|javascript:)/i.test(clean))return null;
 const resolved=clean.startsWith('/')?path.join(OUT,clean.replace(/^\/+/,'')):path.resolve(path.dirname(baseFile),clean);
 return resolved;
}
const htmlPath=path.join(OUT,'index.html');
const html=fs.readFileSync(htmlPath,'utf8');
for(const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)){
 const resolved=resolveLocalReference(match[1],htmlPath);
 if(!resolved)continue;
 const target=fs.existsSync(resolved)&&fs.statSync(resolved).isDirectory()?path.join(resolved,'index.html'):resolved;
 if(!fs.existsSync(target))throw new Error('Broken production HTML reference: '+match[1]);
}
const sw=fs.readFileSync(path.join(OUT,'service-worker.js'),'utf8');
const shellStart=sw.indexOf('const SHELL=[');
const shellEnd=shellStart>=0?sw.indexOf('];',shellStart):-1;
if(shellStart<0||shellEnd<0)throw new Error('Service-worker shell manifest could not be parsed.');
const shell=sw.slice(shellStart,shellEnd);
for(const match of shell.matchAll(/['"]([^'"]+)['"]/g)){
 const asset=match[1].replace(/^\.\//,'');
 const target=path.join(OUT,asset);
 if(!fs.existsSync(target))throw new Error('Missing service-worker production asset: '+asset);
}
for(const file of walk(path.join(OUT,'css'))){
 const css=fs.readFileSync(file,'utf8');
 for(const match of css.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi)){
  const reference=match[2].trim();
  const resolved=resolveLocalReference(reference,file);
  if(resolved&&!fs.existsSync(resolved))throw new Error('Broken CSS asset reference in '+path.relative(OUT,file)+': '+reference);
 }
}
const files=walk(OUT);
let totalBytes=0;
const hashes=new Map();
for(const file of files){
 const buffer=fs.readFileSync(file);
 totalBytes+=buffer.length;
 const hash=crypto.createHash('sha256').update(buffer).digest('hex');
 const previous=hashes.get(hash)||[];
 previous.push(path.relative(OUT,file));
 hashes.set(hash,previous);
}
const duplicates=[...hashes.values()].filter(group=>group.length>1);
const mb=totalBytes/1024/1024;
if(mb>1.5)throw new Error('Production package exceeds the 1.5 MiB size budget ('+mb.toFixed(2)+' MiB).');
const forbidden=['.github','docs','scripts','tests','template-inbox','schemas','README.md','sw.js'];
for(const entry of forbidden){
 if(fs.existsSync(path.join(OUT,entry)))throw new Error('Development-only content leaked into production package: '+entry);
}
console.log('YETI production package built successfully.');
console.log('Files: '+files.length+' | Size: '+(totalBytes/1024).toFixed(1)+' KiB | Budget: 1536 KiB');
console.log('Excluded development-only directories: '+forbidden.join(', '));
if(duplicates.length)console.warn('Identical production files detected: '+JSON.stringify(duplicates));
