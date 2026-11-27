/* Prevent browser/page zoom gestures while preserving the dedicated PDF preview zoom controls. */
(function(){
 'use strict';
 const isModifier=e=>e.ctrlKey||e.metaKey;
 // Block browser zoom shortcuts (Ctrl/Cmd +, -, 0 and numpad equivalents).
 document.addEventListener('keydown',function(e){
  if(!isModifier(e)||e.altKey)return;
  const key=String(e.key||'').toLowerCase();
  const code=String(e.code||'').toLowerCase();
  if(['+','=','-','_','0'].includes(key)||['add','subtract','numpadadd','numpadsubtract','numpad0'].includes(code))e.preventDefault();
 },{capture:true});
 // Ctrl/Cmd + mouse-wheel is the common desktop page-zoom gesture.
 document.addEventListener('wheel',function(e){if(isModifier(e))e.preventDefault();},{capture:true,passive:false});
 // Safari exposes pinch gestures separately from Pointer Events.
 ['gesturestart','gesturechange','gestureend'].forEach(type=>document.addEventListener(type,e=>{const target=e.target;if(!target||!target.closest||(!target.closest('#previewContent')&&!target.closest('#flightTrialSopPdfViewer')))e.preventDefault();},{capture:true,passive:false}));
 // Block page pinch everywhere except dedicated PDF readers, which implement their own in-document zoom.
 document.addEventListener('touchmove',function(e){
  if(e.touches&&e.touches.length>1){
   const target=e.target;
   if(!target||!target.closest||(!target.closest('#previewContent')&&!target.closest('#flightTrialSopPdfViewer')))e.preventDefault();
  }
 },{capture:true,passive:false});
})();
