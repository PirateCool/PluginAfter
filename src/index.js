import { buildUI } from './ui/main-panel.js';

var STARTUP_LOCK_KEY = "__MB2_STARTUP_LOCK__";

if(!$.global[STARTUP_LOCK_KEY]){
  $.global[STARTUP_LOCK_KEY] = true;
  try{
    var panel = buildUI(thisObj);
    if(panel instanceof Window){
      panel.center();
      panel.show();
    }
  }catch(e){
    alert("Erreur Marker Builder 2 : " + e.toString() + (e.line ? (" (ligne " + e.line + ")") : ""));
  }finally{
    $.global[STARTUP_LOCK_KEY] = false;
  }
}
