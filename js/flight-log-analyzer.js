/* Flight Log Analyzer module namespace.
   All future Flight Log Analyzer behavior belongs in this file.
   Do not add listeners to, or mutate state owned by, sibling modules. */
(function(){
 'use strict';
 const panel=document.getElementById('flightLogAnalyzerPanel');
 if(!panel)return;
 window.YETIFlightLogAnalyzer=Object.freeze({panelId:'flightLogAnalyzerPanel'});
})();
