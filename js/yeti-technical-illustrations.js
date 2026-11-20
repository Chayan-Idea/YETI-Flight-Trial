/* Deterministic section-to-illustration map. Decorative only; no workflow or data state changes. */
(()=>{
 'use strict';
 const ROOT='./assets/illustrations/';
 const sectionMap=[
  {selector:'#trialInfoCard',src:'aerospace/fixed-wing-uav.svg',alt:'Fixed-wing UAV configuration',target:'b'},
  {selector:'#photoEvidenceCard',src:'engineering/sensor.svg',alt:'Inspection evidence'},
  {selector:'#loadingChecklistSection',src:'aerospace/flight-path.svg',alt:'Transport route and handling path',target:'.loading-title-row h2'},
  {selector:'#flightTrialPreparationSopPanel .flight-trial-reading-header',src:'aerospace/fixed-wing-uav.svg',alt:'Fixed-wing UAV flight trial'},
  {selector:'#propulsionParameterSummaryCard',src:'mathematics/graph.svg',alt:'Measured propulsion parameters',target:'h3'},
  {selector:'#propulsionDerivedParameterCalculationCard',src:'mathematics/coordinate-axes.svg',alt:'Derived engineering quantities',target:'h3'},
  {selector:'#propulsionDataFilteringCard',src:'data/filtering.svg',alt:'Filtered propulsion data',target:'h3'},
  {selector:'#propulsionGraphicalAnalysisCard',src:'data/graph.svg',alt:'Propulsion performance graph',target:'h3'},
  {selector:'#propulsionMappingHeading',src:'data/data-mapping.svg',alt:'CSV parameter mapping',target:null},
  {selector:'#propulsionReportGenerationCard',src:'data/report.svg',alt:'Engineering validation report',target:'h3'}
 ];
 const dynamicMap=[
  {match:/uav specification|uav weight/i,src:'aerospace/fixed-wing-uav.svg',alt:'UAV specification'},
  {match:/uav cg point|centre of gravity|center of gravity/i,src:'mathematics/coordinate-axes.svg',alt:'Aircraft reference axes and centre of gravity'},
  {match:/port-side wing|star-board side wing|wing assembly/i,src:'aerospace/aircraft-wing.svg',alt:'Aircraft wing inspection'},
  {match:/vtol propulsion/i,src:'propulsion/propeller.svg',alt:'VTOL propulsion assembly'},
  {match:/fw propulsion|fixed.?wing propulsion/i,src:'propulsion/bldc-motor.svg',alt:'Fixed-wing propulsion motor'},
  {match:/hv battery|battery area|battery status/i,src:'propulsion/battery-pack.svg',alt:'High-voltage battery system'},
  {match:/pdu status|electrical setup/i,src:'engineering/circuit.svg',alt:'Electrical power distribution'},
  {match:/fti sensors|sensor/i,src:'engineering/sensor.svg',alt:'Flight test instrumentation sensor'},
  {match:/gcs status|ground control/i,src:'engineering/sensor.svg',alt:'Ground control and telemetry'},
  {match:/data sorting|filtering/i,src:'data/filtering.svg',alt:'Data filtering'},
  {match:/graphical analysis|graph/i,src:'mathematics/graph.svg',alt:'Engineering graph'},
  {match:/report generation|validation report/i,src:'data/report.svg',alt:'Engineering report'}
 ];
 function image(src,alt){const wrap=document.createElement('span');wrap.className='yeti-tech-illustration';wrap.setAttribute('aria-hidden','true');const img=document.createElement('img');img.src=ROOT+src;img.alt='';img.loading='lazy';img.decoding='async';img.onerror=()=>wrap.remove();wrap.append(img);return wrap}
 function decorate(target,src,alt,asCard=false){
  if(!target||target.querySelector(':scope > .yeti-tech-illustration'))return;
  if(asCard){target.classList.add('yeti-illustrated-card');target.append(image(src,alt));return}
  const img=image(src,alt);target.classList.add('yeti-illustrated-heading');target.prepend(img);
 }
 function applyStatic(){
  for(const item of sectionMap){const card=document.querySelector(item.selector);if(!card)continue;
   const target=item.target===null?card:card.querySelector(item.target||':scope > b');
   if(target)decorate(target,item.src,item.alt,item.target===undefined);
  }
 }
 function applyDynamic(){
  for(const container of [document.querySelector('#list'),document.querySelector('#loadingList')]){
   if(!container)continue;
   const nodes=container.querySelectorAll('details.section>summary,details.loading-accordion>summary');
   nodes.forEach(node=>{
    const text=(node.textContent||'').trim();
    const match=dynamicMap.find(item=>item.match.test(text));
    if(match)decorate(node,match.src,match.alt);
   });
  }
 }
 function apply(){applyStatic();applyDynamic()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
 const observer=new MutationObserver(()=>apply());
 observer.observe(document.documentElement,{childList:true,subtree:true});
 window.addEventListener('beforeprint',()=>document.querySelectorAll('.yeti-tech-illustration').forEach(n=>n.style.display='none'));
 window.addEventListener('afterprint',()=>document.querySelectorAll('.yeti-tech-illustration').forEach(n=>n.style.display=''));
})();