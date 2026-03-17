// core/ae-bridge.js — After Effects bridge: comp/layer/marker/expression helpers

import { trim, toNum, mb2Log, parseJSON, stringifyJSON, normalizeKey, pad3 } from './utils.js';
import { PREF_SEC, KEY_DB, KEY_MEDIA_DB, getSetting, saveSetting, loadGridLayoutConfig } from './settings.js';
import { sanitizeDB, sanitizePreset, defaultDB, getPresetFamily } from './presets.js';

// ── Constants ────────────────────────────────────────────────────────────────

export var GEN_FOLDER_NAME = "_AUTO_FROM_MARKERS_2";
export var TAG_MK = "[MB2]";
export var TAG_LAYER = "[MB2_LAYER]";
export var TAG_GRID_GUIDE = "[MB2_GRID_GUIDE]";
export var MB2_STACK_ANCHOR_NAME = "MB2_STACK_ANCHOR";
export var MB2_STACK_UNIT_PX = 120;
export var MB2_STACK_GAP_PX = 24;
export var MB2_VISUAL_COLS = 3;
export var MB2_VISUAL_COL_W_PX = 190;
export var MB2_VISUAL_BASE_OFFSET_X = 320;

// ── Comp / layer helpers ─────────────────────────────────────────────────────

export function activeComp(){
  var it = app.project ? app.project.activeItem : null;
  return (it instanceof CompItem) ? it : null;
}

export function clearLayerSelection(comp){
  if(!comp) return;
  for(var i=1; i<=comp.numLayers; i++){
    try{ comp.layer(i).selected = false; }catch(_eSel){}
  }
}

export function findStackAnchorLayer(comp){
  if(!comp) return null;
  for(var i=1; i<=comp.numLayers; i++){
    var ly = comp.layer(i);
    if(!ly) continue;
    try{
      if(ly.nullLayer && trim(ly.name || "") === MB2_STACK_ANCHOR_NAME) return ly;
    }catch(_eNull){}
    var c = "";
    try{ c = trim(ly.comment || ""); }catch(_eC){}
    if(c.indexOf(TAG_LAYER) === 0 && c.indexOf(" stackAnchor=1") >= 0) return ly;
  }
  return null;
}

export function ensureStackAnchor(comp, createIfMissing, selectIt){
  if(!comp) return null;
  var anchor = findStackAnchorLayer(comp);
  if(!anchor && createIfMissing){
    anchor = comp.layers.addNull();
    anchor.name = MB2_STACK_ANCHOR_NAME;
    anchor.label = 13;
    anchor.shy = false;
    anchor.guideLayer = false;
    anchor.locked = false;
    try{ anchor.comment = TAG_LAYER + " stackAnchor=1"; }catch(_eComment){}
    try{
      anchor.property("ADBE Transform Group").property("ADBE Position").setValue([2130, 634]);
    }catch(_ePos){}
  }
  if(anchor && selectIt){
    try{
      clearLayerSelection(comp);
      anchor.selected = true;
    }catch(_eSelect){}
  }
  return anchor;
}

// ── Project item lookup ──────────────────────────────────────────────────────

export function findItemByName(name, typeCtor){
  if(!app.project) return null;
  for(var i=1; i<=app.project.numItems; i++){
    var it = app.project.item(i);
    if(it && (it instanceof typeCtor) && it.name === name) return it;
  }
  return null;
}

export function findCompByName(name){
  name = trim(name);
  if(!name || !app.project) return null;
  var wanted = name.toLowerCase();
  var fallback = null;
  for(var i=1; i<=app.project.numItems; i++){
    var it = app.project.item(i);
    if(it && (it instanceof CompItem) && it.name === name) return it;
    if(!fallback && it && (it instanceof CompItem) && trim(it.name || "").toLowerCase() === wanted) fallback = it;
  }
  return fallback;
}

// ── Model comp list cache ────────────────────────────────────────────────────

export var modelCompListCache = { project: null, numItems: -1, nameHash: "", items: null };

export function invalidateModelCompListCache(){
  modelCompListCache.project = null;
  modelCompListCache.numItems = -1;
  modelCompListCache.nameHash = "";
  modelCompListCache.items = null;
}

export function computeProjectNameHash(){
  if(!app.project) return "";
  var parts = [];
  for(var h=1; h<=app.project.numItems; h++){
    try{ parts.push(app.project.item(h).name || ""); }catch(_e){ parts.push("?"); }
  }
  return parts.join("|");
}

export function listModelCompsFiltered(force){
  var out = [];
  if(!app.project) return out;
  if(!force){
    try{
      var currentHash = computeProjectNameHash();
      if(modelCompListCache.project && modelCompListCache.project === app.project && modelCompListCache.numItems === app.project.numItems && modelCompListCache.nameHash === currentHash && modelCompListCache.items){
        return modelCompListCache.items.slice(0);
      }
    }catch(_eCacheInvalid){
      invalidateModelCompListCache();
    }
  }

  var genFolder = findItemByName(GEN_FOLDER_NAME, FolderItem);
  for(var i=1; i<=app.project.numItems; i++){
    var it = app.project.item(i);
    if(!(it instanceof CompItem)) continue;

    var nm = it.name || "";
    if(nm.indexOf("AUTO__") === 0) continue;

    if(genFolder){
      try{
        var pf = it.parentFolder;
        var guard = 0;
        while(pf && guard < 256){
          if(pf === genFolder){ nm = null; break; }
          var nextPf = null;
          try{ nextPf = pf.parentFolder; }catch(_e){ nextPf = null; }
          if(nextPf === pf) break;
          pf = nextPf;
          guard++;
        }
        if(nm === null) continue;
      }catch(e){ mb2Log("debug", "listModelCompsFiltered parentFolder check: " + e); }
    }

    out.push(it.name);
  }

  out.sort();
  modelCompListCache.project = app.project;
  modelCompListCache.numItems = app.project.numItems;
  modelCompListCache.nameHash = computeProjectNameHash();
  modelCompListCache.items = out.slice(0);
  return out;
}

// ── Folder helper ────────────────────────────────────────────────────────────

export function getOrCreateFolder(name, parent){
  var f = findItemByName(name, FolderItem);
  if(f){
    if(parent){
      try{ if(f.parentFolder !== parent) f.parentFolder = parent; }catch(_e){}
    }
    return f;
  }
  f = app.project.items.addFolder(name);
  if(parent){
    try{ f.parentFolder = parent; }catch(_e2){}
  }
  return f;
}

// ── Marker helpers ───────────────────────────────────────────────────────────

export function buildMarkerComment(preset){
  return TAG_MK + " presetId=" + preset.id + " presetName=" + preset.name;
}

export function parseMarkerComment(comment){
  comment = trim(comment || "");
  if(comment.indexOf(TAG_MK) !== 0) return null;
  var m = comment.match(/\bpresetId=([^\s]+)\b/);
  if(!m) return null;
  return { presetId: m[1] };
}

export function addMarker(comp, preset){
  var mv = new MarkerValue(buildMarkerComment(preset));
  try{ mv.label = preset.markerLabel; }catch(e){}
  comp.markerProperty.setValueAtTime(comp.time, mv);
}

// ── Expression / effect helpers ──────────────────────────────────────────────

export function ensureSlider(layer, name, value){
  var fx = layer.property("ADBE Effect Parade");
  if(!fx) return null;
  var i;
  for(i=1; i<=fx.numProperties; i++){
    if(fx.property(i).name === name) return fx.property(i);
  }
  var s = fx.addProperty("ADBE Slider Control");
  s.name = name;
  try{ s.property(1).setValue(value); }catch(e){}
  return s;
}

export function ensureBlur(layer, value){
  var fx = layer.property("ADBE Effect Parade");
  if(!fx) return null;
  var i;
  for(i=1; i<=fx.numProperties; i++){
    if(fx.property(i).matchName === "ADBE Gaussian Blur 2") return fx.property(i);
  }
  var b = fx.addProperty("ADBE Gaussian Blur 2");
  b.name = "MB2 Gaussian Blur";
  try{ b.property(1).setValue(value); }catch(e){}
  return b;
}

export function setExpr(prop, expr){
  try{
    prop.expression = expr;
    prop.expressionEnabled = true;
  }catch(e){ mb2Log("warn", "setExpr failed: " + e); }
}

// ── Outro expressions ────────────────────────────────────────────────────────

export function applyOutroExpressions(layer, preset){
  var fadeVal = Math.max(0, toNum(preset ? preset.fade : 0.35, 0.35));
  var moveXVal = toNum(preset ? preset.moveX : 0, 0);
  var moveYVal = toNum(preset ? preset.moveY : -100, -100);
  var blurVal = Math.max(0, toNum(preset ? preset.blur : 50, 50));
  var needsFade = fadeVal > 0;
  var needsMove = needsFade && (Math.abs(moveXVal) > 0.001 || Math.abs(moveYVal) > 0.001);
  var needsBlur = needsFade && blurVal > 0.001;
  if(!needsFade && !needsMove && !needsBlur) return;

  ensureSlider(layer, "MB2 Fade (s)", fadeVal);
  if(needsMove){
    ensureSlider(layer, "MB2 Move X", moveXVal);
    ensureSlider(layer, "MB2 Move Y", moveYVal);
  }
  if(needsBlur) ensureSlider(layer, "MB2 Blur", blurVal);

  var op = layer.property("ADBE Transform Group").property("ADBE Opacity");
  var pos = layer.property("ADBE Transform Group").property("ADBE Position");
  if(needsFade && op){
    setExpr(op, "var f=Math.max(0.001,effect('MB2 Fade (s)')(1));var t0=outPoint-f;(time<=t0)?100:ease(time,t0,outPoint,100,0);");
  }
  if(needsMove && pos){
    setExpr(pos, "var f=Math.max(0.001,effect('MB2 Fade (s)')(1));var dx=effect('MB2 Move X')(1);var dy=effect('MB2 Move Y')(1);var t0=outPoint-f;var p=clamp((time-t0)/f,0,1);value+[dx*p,dy*p];");
  }
  if(needsBlur){
    var blur = ensureBlur(layer, 0);
    if(blur){
      // Language-independent: no localized property names like Blurriness/Flou.
      setExpr(blur.property(1), "var f=Math.max(0.001,effect('MB2 Fade (s)')(1));var b=effect('MB2 Blur')(1);var t0=outPoint-f;(time<=t0)?0:ease(time,t0,outPoint,0,b);");
      try{ blur.property("Repeat Edge Pixels").setValue(true); }catch(_e){}
    }
  }
}

export function setLayerOutroDefaults(layer, preset){
  var fx = layer.property("ADBE Effect Parade");
  if(!fx) return;
  var i;
  for(i=1; i<=fx.numProperties; i++){
    var e = fx.property(i);
    if(e.name === "MB2 Fade (s)") try{ e.property(1).setValue(preset.fade); }catch(_e1){}
    if(e.name === "MB2 Move X") try{ e.property(1).setValue(preset.moveX); }catch(_e2){}
    if(e.name === "MB2 Move Y") try{ e.property(1).setValue(preset.moveY); }catch(_e3){}
    if(e.name === "MB2 Blur") try{ e.property(1).setValue(preset.blur); }catch(_e4){}
    if(e.name === "MB2 Gaussian Blur") try{ e.property(1).setValue(0); }catch(_e5){}
  }
}

// ── Template audit ───────────────────────────────────────────────────────────

export function detectTemplateFieldSchema(templateName){
  var out = { text: 0, image: 0 };
  var tpl = findCompByName(templateName);
  if(!tpl) return out;
  var tagged = { text: 0, image: 0 };
  var hasTagged = false;
  function scanCompSchema(compItem, depth){
    var local = { text: 0, image: 0, taggedText: 0, taggedImage: 0, hasTagged: false };
    if(!compItem || depth > 2) return local;
    for(var i=1; i<=compItem.numLayers; i++){
      var ly = compItem.layer(i);
      var nm = trim(ly.name || "").toLowerCase();
      if(nm.indexOf("[mb2_text]") >= 0){ local.taggedText++; local.hasTagged = true; continue; }
      if(nm.indexOf("[mb2_image]") >= 0){ local.taggedImage++; local.hasTagged = true; continue; }
      var srcText = null;
      try{ srcText = ly.property("Source Text"); }catch(_e0){ srcText = null; }
      if(srcText){ local.text++; continue; }
      if(nm.indexOf("image") >= 0 || nm.indexOf("img") >= 0 || nm.indexOf("photo") >= 0 || nm.indexOf("visuel") >= 0 || nm.indexOf("logo") >= 0 || nm.indexOf("icon") >= 0 || nm.indexOf("media") >= 0 || nm.indexOf("placeholder") >= 0){
        local.image++;
        continue;
      }
      var src = null;
      try{ src = ly.source; }catch(_e1){ src = null; }
      if(src && (src instanceof FootageItem)){
        var isSolid = false;
        try{ isSolid = (src.mainSource instanceof SolidSource); }catch(_e2){ isSolid = false; }
        if(!isSolid){ local.image++; continue; }
      }
      if(src && (src instanceof CompItem)){
        var nested = scanCompSchema(src, depth + 1);
        local.text += nested.text;
        local.image += nested.image;
        local.taggedText += nested.taggedText;
        local.taggedImage += nested.taggedImage;
        local.hasTagged = local.hasTagged || nested.hasTagged;
      }
    }
    return local;
  }
  var scan = scanCompSchema(tpl, 0);
  out.text = scan.text;
  out.image = scan.image;
  tagged.text = scan.taggedText;
  tagged.image = scan.taggedImage;
  hasTagged = scan.hasTagged;
  if(hasTagged) return tagged;
  return out;
}

export function auditTemplateContract(templateName){
  var tpl = findCompByName(templateName);
  var report = {
    template: templateName || "",
    exists: !!tpl,
    textCount: 0,
    imageCount: 0,
    taggedText: 0,
    taggedImage: 0,
    nestedCompCount: 0,
    maxDepth: 0,
    warnings: [],
    recommendations: [],
    score: 0,
    verdict: "mauvais"
  };
  if(!tpl){
    report.warnings.push("Template introuvable.");
    report.recommendations.push("Associe une composition modèle valide au preset.");
    return report;
  }
  function scan(compItem, depth){
    var local = { text: 0, image: 0, taggedText: 0, taggedImage: 0, nested: 0, maxDepth: depth };
    if(!compItem || depth > 4) return local;
    for(var i=1; i<=compItem.numLayers; i++){
      var ly = compItem.layer(i);
      var nm = trim(ly.name || "").toLowerCase();
      if(nm.indexOf("[mb2_text]") >= 0) local.taggedText++;
      if(nm.indexOf("[mb2_image]") >= 0) local.taggedImage++;
      var srcText = null;
      try{ srcText = ly.property("Source Text"); }catch(_e0){ srcText = null; }
      if(srcText) local.text++;
      if(nm.indexOf("image") >= 0 || nm.indexOf("img") >= 0 || nm.indexOf("photo") >= 0 || nm.indexOf("visuel") >= 0 || nm.indexOf("logo") >= 0 || nm.indexOf("icon") >= 0 || nm.indexOf("media") >= 0 || nm.indexOf("placeholder") >= 0) local.image++;
      var src = null;
      try{ src = ly.source; }catch(_e1){ src = null; }
      if(src && (src instanceof FootageItem)){
        var isSolid = false;
        try{ isSolid = (src.mainSource instanceof SolidSource); }catch(_e2){ isSolid = false; }
        if(!isSolid) local.image++;
      }
      if(src && (src instanceof CompItem)){
        local.nested++;
        var nested = scan(src, depth + 1);
        local.text += nested.text;
        local.image += nested.image;
        local.taggedText += nested.taggedText;
        local.taggedImage += nested.taggedImage;
        local.nested += nested.nested;
        if(nested.maxDepth > local.maxDepth) local.maxDepth = nested.maxDepth;
      }
    }
    return local;
  }
  var s = scan(tpl, 0);
  report.textCount = s.text;
  report.imageCount = s.image;
  report.taggedText = s.taggedText;
  report.taggedImage = s.taggedImage;
  report.nestedCompCount = s.nested;
  report.maxDepth = s.maxDepth;
  var score = 100;
  if(report.textCount <= 0 && report.imageCount <= 0){ report.warnings.push("Aucune cible texte/image détectée."); score -= 50; }
  if(report.maxDepth > 1){ report.warnings.push("Template imbriqué au-delà d'un niveau."); score -= 15; }
  if(report.taggedText <= 0 && report.textCount > 0){ report.warnings.push("Aucun tag [mb2_text] détecté."); score -= 10; }
  if(report.taggedImage <= 0 && report.imageCount > 0){ report.warnings.push("Aucun tag [mb2_image] détecté."); score -= 10; }
  if(report.maxDepth > 2){ report.warnings.push("Imbrication profonde: injection plus fragile."); score -= 20; }
  if(report.taggedText <= 0 && report.textCount > 0) report.recommendations.push("Tagge explicitement les couches texte avec [mb2_text].");
  if(report.taggedImage <= 0 && report.imageCount > 0) report.recommendations.push("Tagge explicitement les couches image avec [mb2_image].");
  if(report.maxDepth > 1) report.recommendations.push("Réduis l'imbrication ou garde les cibles MB2 dans la première précomp utile.");
  if(report.textCount <= 0 && report.imageCount <= 0) report.recommendations.push("Ajoute de vraies cibles texte ou image dans le template.");
  score = Math.max(0, Math.min(100, score));
  report.score = score;
  report.verdict = score >= 80 ? "OK" : (score >= 55 ? "FRAGILE" : "MAUVAIS");
  return report;
}

export function buildTemplateAuditText(report){
  report = report || {};
  var lines = [];
  lines.push("Audit template MB2");
  lines.push("");
  lines.push("Template: " + (report.template || ""));
  lines.push("Existe: " + (report.exists ? "oui" : "non"));
  lines.push("Score: " + toNum(report.score, 0) + "/100");
  lines.push("Verdict: " + (report.verdict || "MAUVAIS"));
  lines.push("");
  lines.push("Détection");
  lines.push("- Textes: " + toNum(report.textCount, 0));
  lines.push("- Images: " + toNum(report.imageCount, 0));
  lines.push("- Tags [mb2_text]: " + toNum(report.taggedText, 0));
  lines.push("- Tags [mb2_image]: " + toNum(report.taggedImage, 0));
  lines.push("- Précomps imbriquées: " + toNum(report.nestedCompCount, 0));
  lines.push("- Profondeur max: " + toNum(report.maxDepth, 0));
  lines.push("");
  lines.push("Warnings");
  if(report.warnings && report.warnings.length){
    for(var i=0; i<report.warnings.length; i++) lines.push("- " + report.warnings[i]);
  }else lines.push("- Aucun");
  lines.push("");
  lines.push("Recommandations");
  if(report.recommendations && report.recommendations.length){
    for(var j=0; j<report.recommendations.length; j++) lines.push("- " + report.recommendations[j]);
  }else lines.push("- Aucune");
  return lines.join("\n");
}

// ── Media DB persistence ─────────────────────────────────────────────────────

export function sanitizeMediaDB(raw){
  var out = {};
  if(!raw || typeof raw !== "object") return out;
  for(var k in raw){
    if(!raw.hasOwnProperty(k)) continue;
    var key = trim(k);
    var val = trim(raw[k] || "");
    if(!key || !val) continue;
    out[key] = val;
  }
  return out;
}

export function loadMediaDB(){
  var raw = getSetting(PREF_SEC, KEY_MEDIA_DB, "");
  if(!raw) return {};
  try{ return sanitizeMediaDB(parseJSON(raw)); }catch(_e){ return {}; }
}

export function saveMediaDB(db){
  saveSetting(PREF_SEC, KEY_MEDIA_DB, stringifyJSON(sanitizeMediaDB(db)));
}

// ── Preset DB persistence ────────────────────────────────────────────────────

export function loadDB(){
  var raw = getSetting(PREF_SEC, KEY_DB, "");
  if(!raw){
    var fresh = defaultDB();
    saveDB(fresh);
    return fresh;
  }
  try{
    return sanitizeDB(parseJSON(raw));
  }catch(e){
    var fallback = defaultDB();
    saveDB(fallback);
    return fallback;
  }
}

export function saveDB(db){
  saveSetting(PREF_SEC, KEY_DB, stringifyJSON(db));
}

// ── Marker / layer enumeration & cleanup ─────────────────────────────────────

export function getAllMarkers(comp){
  var mp = comp.markerProperty;
  var out = [];
  for(var k=1; k<=mp.numKeys; k++){
    var mv = mp.keyValue(k);
    out.push({ keyIndex: k, time: mp.keyTime(k), comment: mv ? (mv.comment || "") : "" });
  }
  out.sort(function(a,b){ return a.time - b.time; });
  return out;
}

export function cleanPluginMarkers(setStatus, secureMode){
  var comp = activeComp();
  if(!comp){ alert("Ouvre une composition active."); return; }

  var mp = comp.markerProperty;
  var count = 0;
  for(var ci=1; ci<=mp.numKeys; ci++){
    var cc = trim((mp.keyValue(ci).comment || ""));
    if(cc.indexOf(TAG_MK) === 0) count++;
  }
  if(count === 0){ setStatus("\u2139\uFE0F Aucun marqueur plugin \u00E0 supprimer."); return; }
  if(secureMode && !confirm("\uD83E\uDDF9 " + count + " marqueur(s) plugin vont \u00EAtre supprim\u00E9s. Continuer ?")) return;

  app.beginUndoGroup("MB2 Clean Markers");
  try{
    var removed = 0;
    for(var i=mp.numKeys; i>=1; i--){
      var c = trim((mp.keyValue(i).comment || ""));
      if(c.indexOf(TAG_MK) === 0){
        mp.removeKey(i);
        removed++;
      }
    }
    setStatus("\uD83E\uDDF9 Marqueurs plugin supprim\u00E9s : " + removed);
  }finally{
    app.endUndoGroup();
  }
}

export function cleanupAutoLayers(setStatus, secureMode){
  var comp = activeComp();
  if(!comp){ alert("Ouvre une composition active."); return; }

  var autoCount = 0;
  for(var ai=1; ai<=comp.numLayers; ai++){
    var aLy = comp.layer(ai);
    var aC = "";
    try{ aC = trim(aLy.comment || ""); }catch(_ea){}
    if(aC.indexOf(TAG_LAYER) === 0) autoCount++;
  }
  if(autoCount === 0){ setStatus("\u2139\uFE0F Aucun calque AUTO \u00E0 supprimer."); return; }
  if(secureMode && !confirm("\uD83E\uDDFD " + autoCount + " calque(s) AUTO vont \u00EAtre supprim\u00E9s. Continuer ?")) return;

  app.beginUndoGroup("MB2 Clean AUTO");
  try{
    var removed = 0;
    for(var i=comp.numLayers; i>=1; i--){
      var ly = comp.layer(i);
      var c = "";
      try{ c = trim(ly.comment || ""); }catch(_e){}
      if(c.indexOf(TAG_LAYER) === 0){
        try{ ly.remove(); removed++; }catch(e){}
      }
    }
    setStatus("\uD83E\uDDFD Calques AUTO supprim\u00E9s : " + removed);
  }finally{
    app.endUndoGroup();
  }
}
